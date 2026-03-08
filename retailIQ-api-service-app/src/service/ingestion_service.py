import uuid
import pandas as pd
from datetime import datetime
from typing import Dict, Any
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert, select

from src.database.models import Dataset
from src.util.aws_clients import AWSClients

class IngestionService:
    def __init__(self, aws_clients: AWSClients, settings: Dict[str, Any]):
        self.aws_clients = aws_clients
        self.settings = settings
    
    async def upload_pos_data(
        self,
        pos_file: UploadFile,
        inventory_file: UploadFile,
        festival_mode: bool,
        promotion_active: bool,
        cash_constraint: bool,
        db_session: AsyncSession
    ):
        """
        Upload POS and Inventory CSV to S3 and store in PostgreSQL
        NEW: UPSERT mode - no data deletion, incremental updates
        """
        print("=== UPLOAD STARTED (INCREMENTAL MODE) ===")
        
        # Generate IDs
        dataset_id = f"ds_{uuid.uuid4().hex[:8]}"
        upload_id = f"upload_{uuid.uuid4().hex[:8]}"
        
        # Read POS CSV to get stats
        pos_contents = await pos_file.read()
        pos_df = pd.read_csv(pd.io.common.BytesIO(pos_contents))
        
        # Read Inventory CSV
        inv_contents = await inventory_file.read()
        inv_df = pd.read_csv(pd.io.common.BytesIO(inv_contents))
        
        total_skus = pos_df['SKU_Id'].nunique() if 'SKU_Id' in pos_df.columns else len(pos_df)
        total_transactions = len(pos_df)
        
        # Get date range from POS data
        if 'Date' in pos_df.columns:
            pos_df['Date'] = pd.to_datetime(pos_df['Date'])
            min_date = pos_df['Date'].min().strftime('%Y-%m-%d')
            max_date = pos_df['Date'].max().strftime('%Y-%m-%d')
            date_range = f"{min_date} to {max_date}"
        else:
            date_range = "Unknown"
        
        # Upload POS file to S3
        pos_s3_key = f"{self.settings.get('S3_CSV_PREFIX')}pos/{dataset_id}_pos.csv"
        pos_s3_path = f"s3://{self.settings.get('S3_BUCKET_NAME')}/{pos_s3_key}"
        
        # Upload Inventory file to S3
        inv_s3_key = f"{self.settings.get('S3_CSV_PREFIX')}inventory/{dataset_id}_inventory.csv"
        inv_s3_path = f"s3://{self.settings.get('S3_BUCKET_NAME')}/{inv_s3_key}"
        
        # Upload files to S3
        try:
            # Reset file pointers to beginning
            await pos_file.seek(0)
            pos_contents_for_s3 = await pos_file.read()
            
            await inventory_file.seek(0)
            inv_contents_for_s3 = await inventory_file.read()
            
            # Upload to S3
            print(f"Uploading POS file to S3: {pos_s3_key}")
            self.aws_clients.s3_client.put_object(
                Bucket=self.settings.get('S3_BUCKET_NAME'),
                Key=pos_s3_key,
                Body=pos_contents_for_s3
            )
            
            print(f"Uploading Inventory file to S3: {inv_s3_key}")
            self.aws_clients.s3_client.put_object(
                Bucket=self.settings.get('S3_BUCKET_NAME'),
                Key=inv_s3_key,
                Body=inv_contents_for_s3
            )
            
            print(f"✅ Uploaded to S3 - POS: {pos_s3_path}")
            print(f"✅ Uploaded to S3 - Inventory: {inv_s3_path}")
        except Exception as e:
            import traceback
            print(f"❌ S3 upload failed: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            raise ValueError(f"Failed to upload files to S3: {str(e)}")
        
        # NEW: UPSERT inventory FIRST (creates SKU master), then APPEND POS (no deletion)
        # Order matters: SKU master must exist before POS transactions due to foreign key
        inv_added, inv_updated = await self._upsert_inventory_from_csv(inv_df, pos_df, db_session)
        pos_added, pos_updated = await self._append_pos_from_csv(pos_df, db_session)
        
        # Store metadata in PostgreSQL
        dataset = Dataset(
            dataset_id=dataset_id,
            s3_path=pos_s3_path,
            total_skus=total_skus,
            total_transactions=total_transactions,
            date_range=date_range,
            festival_mode=festival_mode,
            promotion_active=promotion_active,
            cash_constraint=cash_constraint,
            uploaded_at=datetime.utcnow(),
            status="uploaded"
        )
        
        db_session.add(dataset)
        await db_session.commit()
        
        # Store upload history
        from src.database.models import UploadHistory
        upload_history = UploadHistory(
            upload_id=upload_id,
            upload_type="both",
            dataset_id=dataset_id,
            pos_filename=pos_file.filename,
            inventory_filename=inventory_file.filename,
            pos_s3_path=pos_s3_path,
            inventory_s3_path=inv_s3_path,
            pos_records_added=pos_added,
            pos_records_updated=pos_updated,
            inventory_skus_added=inv_added,
            inventory_skus_updated=inv_updated,
            uploaded_by="user"
        )
        db_session.add(upload_history)
        await db_session.commit()
        
        print(f"✅ Upload complete: {pos_added} POS added, {pos_updated} POS updated, {inv_added} SKUs added, {inv_updated} SKUs updated")
        
        return {
            "dataset_id": dataset_id,
            "upload_id": upload_id,
            "total_skus": total_skus,
            "total_transactions": total_transactions,
            "date_range": date_range,
            "pos_records_added": pos_added,
            "pos_records_updated": pos_updated,
            "inventory_skus_added": inv_added,
            "inventory_skus_updated": inv_updated,
            "status": "uploaded"
        }
    
    async def _append_pos_from_csv(self, pos_df: pd.DataFrame, db_session: AsyncSession):
        """
        APPEND POS transactions to database
        - Same SKU + Same Date → REPLACE (update quantity)
        - Different date or SKU → INSERT new record
        """
        from src.database.models import POSTransaction
        from sqlalchemy import select
        from datetime import date as date_type
        
        # Helper function to parse numbers with commas and empty values
        def parse_number(value):
            if pd.isna(value) or value == '' or value is None:
                return None
            if isinstance(value, (int, float)):
                return float(value)
            # Remove commas and convert
            return float(str(value).replace(',', ''))
        
        records_added = 0
        records_updated = 0
        
        for _, row in pos_df.iterrows():
            sku_id = str(row['SKU_Id'])
            trans_date = pd.to_datetime(row['Date']).date()
            
            # Parse quantity with comma handling
            qty_raw = row.get('Quantity_Sold', row.get('Quantity', 0))
            qty_sold = int(parse_number(qty_raw)) if parse_number(qty_raw) is not None else 0
            
            unit_price = parse_number(row.get('Unit_Price')) if 'Unit_Price' in row else None
            unit_cost = parse_number(row.get('Unit_Cost')) if 'Unit_Cost' in row else None
            
            # Check if record exists (same SKU + same date)
            result = await db_session.execute(
                select(POSTransaction).where(
                    POSTransaction.sku_id == sku_id,
                    POSTransaction.transaction_date == trans_date
                )
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                # UPDATE: Replace quantity (not add)
                existing.quantity_sold = qty_sold
                existing.unit_price = unit_price if unit_price else existing.unit_price
                existing.unit_cost = unit_cost if unit_cost else existing.unit_cost
                existing.updated_at = datetime.utcnow()
                records_updated += 1
            else:
                # INSERT: New record
                transaction = POSTransaction(
                    sku_id=sku_id,
                    transaction_date=trans_date,
                    quantity_sold=qty_sold,
                    unit_price=unit_price,
                    unit_cost=unit_cost
                )
                db_session.add(transaction)
                records_added += 1
        
        await db_session.commit()
        print(f"📊 POS: {records_added} added, {records_updated} updated")
        return records_added, records_updated
    
    async def _upsert_inventory_from_csv(self, inv_df: pd.DataFrame, pos_df: pd.DataFrame, db_session: AsyncSession):
        """
        UPSERT inventory from CSV
        - New SKU → INSERT
        - Existing SKU → UPDATE current stock
        - Log all changes to inventory history
        """
        from src.database.models import SKUMaster, InventoryState, InventoryHistory
        from sqlalchemy import select
        from datetime import date as date_type
        
        skus_added = 0
        skus_updated = 0
        
        # Get unique SKUs from POS (only process SKUs with sales data)
        pos_skus = set(pos_df['SKU_Id'].unique()) if 'SKU_Id' in pos_df.columns else set()
        
        for sku_id in pos_skus:
            # Find this SKU in inventory data
            inv_row = inv_df[inv_df['SKU_Id'] == sku_id]
            pos_row = pos_df[pos_df['SKU_Id'] == sku_id].iloc[0] if len(pos_df[pos_df['SKU_Id'] == sku_id]) > 0 else None
            
            if len(inv_row) > 0:
                # SKU exists in Inventory - use actual data
                inv_row = inv_row.iloc[0]
                sku_name = inv_row.get('SKU_Description', pos_row.get('SKU_Description', f'Product {sku_id}') if pos_row is not None else f'Product {sku_id}')
                category = inv_row.get('Category', pos_row.get('Category', 'General') if pos_row is not None else 'General')
                
                # Handle empty/NaN values and commas in numbers
                def parse_number(value, default=0):
                    if pd.isna(value) or value == '' or value is None:
                        return default
                    if isinstance(value, (int, float)):
                        return float(value)
                    return float(str(value).replace(',', ''))
                
                cost_price = parse_number(inv_row.get('Average_Landed_Cost'), 100)
                current_stock = int(parse_number(inv_row.get('On_Hand_Quantity'), 0))
                inbound_stock = int(parse_number(inv_row.get('On_Order'), 0))
            else:
                # SKU exists in POS but NOT in Inventory - use defaults
                sku_name = pos_row.get('SKU_Description', f'Product {sku_id}') if pos_row is not None else f'Product {sku_id}'
                category = pos_row.get('Category', 'General') if pos_row is not None else 'General'
                cost_price = float(pos_row.get('Unit_Cost', 100)) if pos_row is not None and 'Unit_Cost' in pos_row else 100
                current_stock = 100  # Default
                inbound_stock = 0  # Default
            
            # Check if SKU Master exists
            result = await db_session.execute(
                select(SKUMaster).where(SKUMaster.sku_id == sku_id)
            )
            sku_master = result.scalar_one_or_none()
            
            if not sku_master:
                # INSERT new SKU
                sku_master = SKUMaster(
                    sku_id=sku_id,
                    sku_name=sku_name,
                    category=category,
                    cost_price=cost_price,
                    selling_price=cost_price * 1.3,
                    lead_time_days=7,
                    moq=100,
                    safety_stock=50
                )
                db_session.add(sku_master)
                await db_session.flush()  # Flush SKU master immediately so it's available for foreign keys
                skus_added += 1
            else:
                # UPDATE existing SKU (in case name/category changed)
                sku_master.sku_name = sku_name
                sku_master.category = category
                sku_master.cost_price = cost_price
                sku_master.selling_price = cost_price * 1.3
                skus_updated += 1
            
            # Check if Inventory State exists
            result = await db_session.execute(
                select(InventoryState).where(InventoryState.sku_id == sku_id)
            )
            inv_state = result.scalar_one_or_none()
            
            if not inv_state:
                # INSERT new inventory state
                inv_state = InventoryState(
                    sku_id=sku_id,
                    current_stock=current_stock,
                    reserved_stock=0,
                    inbound_stock=inbound_stock,
                    last_updated=datetime.utcnow()
                )
                db_session.add(inv_state)
            else:
                # UPDATE existing inventory state
                inv_state.current_stock = current_stock
                inv_state.inbound_stock = inbound_stock
                inv_state.last_updated = datetime.utcnow()
            
            # Log inventory change to history
            history = InventoryHistory(
                sku_id=sku_id,
                snapshot_date=date_type.today(),
                current_stock=current_stock,
                inbound_stock=inbound_stock,
                reserved_stock=0,
                change_reason="upload"
            )
            db_session.add(history)
        
        await db_session.commit()
        print(f"📦 Inventory: {skus_added} SKUs added, {skus_updated} SKUs updated")
        return skus_added, skus_updated

    async def get_dataset_skus(self, dataset_id: str, db_session: AsyncSession):
        """
        Get list of SKUs from SKU Master table
        Since all SKUs are loaded into SKU Master during upload, we can query from there
        """
        from src.database.models import SKUMaster
        
        # Get all SKUs from SKU Master
        stmt = select(SKUMaster.sku_id).order_by(SKUMaster.sku_id)
        result = await db_session.execute(stmt)
        skus = [row[0] for row in result.fetchall()]
        
        return skus
