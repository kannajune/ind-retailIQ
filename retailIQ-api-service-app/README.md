# RetailIQ Backend API Service

AI-powered demand forecasting and inventory optimization system for retail businesses.

## Overview

RetailIQ Backend is a FastAPI-based service that provides intelligent demand forecasting, inventory optimization, and purchase order recommendations using machine learning and AI.

## Features

- **Demand Forecasting**: ML-based prediction of future demand using XGBoost
- **Inventory Optimization**: Smart reorder recommendations based on lead time and demand
- **Risk Assessment**: Automatic risk level calculation (high/medium/low) based on days of coverage
- **Batch Processing**: Efficient processing of multiple SKUs simultaneously
- **Continuous Learning**: Accumulates historical data for improved predictions over time
- **LLM Integration**: Natural language insights using AWS Bedrock (Claude)
- **Human-in-the-Loop**: Decision workflow for approving, modifying, or holding recommendations

## Tech Stack

- **Framework**: FastAPI (Python 3.12)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **ML/AI**: 
  - XGBoost for demand forecasting
  - AWS Bedrock (Claude) for natural language insights
  - AWS SageMaker (optional)
- **Cloud Services**: AWS S3 for data storage
- **Containerization**: Docker

## Architecture

```
┌─────────────────┐
│   FastAPI App   │
├─────────────────┤
│  Routes Layer   │
├─────────────────┤
│ Services Layer  │
│ - Ingestion     │
│ - Engine        │
│ - Dashboard     │
│ - Decision      │
│ - LLM           │
├─────────────────┤
│  Database Layer │
│  (PostgreSQL)   │
└─────────────────┘
```

## Database Schema

### Core Tables
- `sku_master`: Product master data
- `inventory_state`: Current inventory levels
- `pos_transactions`: Historical sales data (accumulated)
- `inventory_history`: Inventory snapshots over time

### Processing Tables
- `datasets`: Uploaded dataset metadata
- `engine_runs`: ML processing runs
- `forecast_results`: Demand predictions
- `optimization_results`: Reorder recommendations
- `inventory_data`: Calculated inventory metrics

### Decision Tables
- `decisions`: Human decisions on recommendations
- `purchase_orders`: Generated purchase orders
- `recommendation_logs`: Tracking for accuracy measurement
- `upload_history`: Upload audit trail

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User authentication

### Data Ingestion
- `POST /api/v1/ingestion/upload` - Upload POS and inventory CSV files
- `GET /api/v1/ingestion/skus/{dataset_id}` - Get SKU list

### Engine Processing
- `POST /api/v1/engine/run` - Process single SKU
- `POST /api/v1/engine/run-batch` - Process all SKUs in dataset

### Dashboard & Insights
- `GET /api/v1/dashboard/{run_id}` - Get comprehensive dashboard data
- `POST /api/v1/llm/query` - Ask questions about recommendations

### Decision Management
- `GET /api/v1/decision/recommendations/{dataset_id}` - Get all recommendations
- `POST /api/v1/decision/action` - Submit decision (approve/modify/hold)

### Analytics
- `GET /api/v1/summary/{run_id}` - Get KPI summary
- `POST /api/v1/learning/retrain` - Trigger model retraining

## Installation

### Prerequisites
- Python 3.12+
- PostgreSQL 15+
- Docker (optional)

### Local Setup

1. Clone the repository
```bash
git clone <repository-url>
cd retailIQ-api-service-app
```

2. Create virtual environment
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Run database migrations
```bash
alembic upgrade head
```

6. Start the server
```bash
python app.py
```

The API will be available at `http://localhost:8000`

### Docker Setup

```bash
docker build -t retailiq-backend .
docker run -p 8000:8000 --env-file .env retailiq-backend
```

## Configuration

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/retailiq_db
POSTGRE_SCHEMA_NAME=public

# Application
SECRET_KEY=your-secret-key
ENVIRONMENT=development

# AWS (Optional - for S3, Bedrock, SageMaker)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# S3 Configuration
S3_BUCKET_NAME=your-bucket-name
S3_CSV_PREFIX=uploads/csv/

# Bedrock Configuration (for LLM insights)
BEDROCK_MODEL_ID=anthropic.claude-v2
BEDROCK_REGION=us-east-1
```

## CSV File Format

### POS Data (Sales History)
```csv
Date,Channel,Store_Id,Customer_Id,Order_Id,Department,Category,SKU_Id,SKU_Description,Quantity,Unit_of_Measure,Unit_Cost,Unit_Price,Promo_Flag,Delivery_Charges
03/02/24,Online,2,C0577,O0000010,Apparel,Tops,A10003,Men T-Shirt - White - M,2,Each,500,1000,N,10
```

### Inventory Data
```csv
Date,Department,Category,Warehouse,SKU_Id,SKU_Description,On_Order,On_Hand_Quantity,Unit_of_Measure,Average_Landed_Cost
10/01/26,Apparel,Tops,1A2B,A10001,Men T-Shirt - Black - M,0,78,Each,400
```

## Risk Level Calculation

The system calculates risk levels based on days of coverage:

| Risk Level | Condition | Meaning |
|------------|-----------|---------|
| **HIGH** | < Lead Time (default 7 days) | Stock will run out before reorder arrives |
| **MEDIUM** | 1x to 2x Lead Time (7-13 days) | Adequate but needs monitoring |
| **LOW** | > 2x Lead Time (14+ days) | Sufficient buffer stock |

Formula:
```python
days_of_coverage = current_stock / daily_demand
daily_demand = forecast_14_days / 14
```

## Data Accumulation Strategy

The system implements a continuous learning approach:

- **POS Data**: Same SKU + Same Date → REPLACE quantity (not add)
- **Inventory**: New SKU → INSERT, Existing SKU → UPDATE
- **History**: All changes logged for trend analysis
- **ML Training**: Uses accumulated historical data (grows over time)

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Development

### Project Structure
```
retailIQ-api-service-app/
├── app.py                 # Application entry point
├── requirements.txt       # Python dependencies
├── Dockerfile            # Container configuration
├── alembic/              # Database migrations
└── src/
    ├── config/           # Configuration management
    ├── database/         # Database models and connection
    ├── dependencies/     # FastAPI dependencies
    ├── model/           # Pydantic schemas
    ├── route/           # API route handlers
    ├── service/         # Business logic
    └── util/            # Utility functions
```

### Running Tests
```bash
pytest tests/
```

### Code Style
```bash
# Format code
black src/

# Lint code
flake8 src/
```

## Deployment

### Docker Compose
```bash
docker-compose up -d
```

### Cloud Deployment
The application is designed to run on:
- AWS ECS/Fargate
- AWS Lambda (with API Gateway)
- Any container orchestration platform (Kubernetes, etc.)

## Performance Considerations

- **Batch Processing**: Use `/engine/run-batch` for processing multiple SKUs
- **Database Indexing**: Indexes on `sku_id`, `run_id`, `dataset_id`
- **Connection Pooling**: SQLAlchemy async engine with connection pool
- **Caching**: Consider Redis for frequently accessed data

## Security

- JWT-based authentication
- Environment variable configuration
- SQL injection prevention via ORM
- CORS middleware for API access control
- Input validation using Pydantic
- Rate limiting to prevent abuse:
  - Login: 5 requests per minute per IP
  - Upload: 10 requests per hour per IP
  - Other endpoints: 100 requests per minute per IP

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check DATABASE_URL in .env
   - Ensure PostgreSQL is running
   - Verify network connectivity

2. **AWS Service Errors**
   - Verify AWS credentials
   - Check IAM permissions for S3, Bedrock, SageMaker
   - Ensure correct region configuration

3. **CSV Upload Failures**
   - Check file format matches expected schema
   - Verify column names are correct
   - Ensure numeric values don't have formatting issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions:
- Create an issue in the repository
- Contact: [Your Contact Information]

## Acknowledgments

- FastAPI framework
- SQLAlchemy ORM
- XGBoost ML library
- AWS Bedrock for LLM capabilities
