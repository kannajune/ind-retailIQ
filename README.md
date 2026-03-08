# RetailIQ - AI-Powered Demand Planning System

Intelligent demand forecasting and inventory optimization system powered by AWS Bedrock (Claude AI).

## Features

- 📊 **Demand Forecasting**: Predict future demand based on historical sales
- 📦 **Inventory Optimization**: Optimize stock levels and reduce waste
- 🤖 **AI Insights**: LLM-powered analysis and recommendations
- 📈 **Interactive Dashboard**: Visualize forecasts and trends
- ✅ **Decision Management**: Approve, modify, or hold recommendations
- 📁 **CSV Upload**: Easy data import (Inventory + POS)

## Quick Start

### Local Development (No AWS Required)

```bash
# 1. Clone repository
git clone https://github.com/kannajune/ind-retailIQ.git
cd ind-retailIQ

# 2. Start with Docker Compose
docker-compose up --build

# Access:
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Manual Setup

**Backend:**
```bash
cd retailIQ-api-service-app
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python app.py
```

**Frontend:**
```bash
cd retailIQ-app
npm install
npm run dev
```

## Project Structure

```
retailiq/
├── retailIQ-api-service-app/  # Backend (FastAPI + Python)
├── retailIQ-app/              # Frontend (React + TypeScript)
├── aws-deployment/            # AWS ECS deployment (optional)
├── test-data/                 # CSV templates and test scripts
└── docker-compose.yml         # Local development setup
```

## Tech Stack

**Backend:**
- Python 3.12 + FastAPI
- PostgreSQL + SQLAlchemy
- AWS S3, Bedrock (Claude), RDS

**Frontend:**
- React 18 + TypeScript
- Vite + Tailwind CSS
- Recharts for visualizations

**Infrastructure:**
- Docker + Docker Compose
- AWS ECS Fargate (optional)
- Nginx

## Usage

1. **Login**: Use default credentials (admin / RetailIQ@2024)
2. **Upload**: Upload Inventory and POS CSV files
3. **Process**: Wait for AI processing
4. **Review**: View forecasts and insights
5. **Decide**: Approve, modify, or hold recommendations

## CSV Templates

See `test-data/templates/` for:
- `inventory_template.csv` - Stock levels
- `pos_template.csv` - Sales transactions

## AWS Deployment (Optional)

The application can run locally without AWS. AWS deployment is only needed for:
- Production hosting on AWS ECS
- Using AWS Bedrock for LLM
- Using AWS RDS for database

See `aws-deployment/README.md` for deployment instructions.

## Documentation

All documentation is in the [`docs/`](docs/) folder:

- [Project Structure](docs/PROJECT_STRUCTURE.md) - Complete project overview
- [Backend API](retailIQ-api-service-app/README.md) - Backend service docs
- [Frontend App](retailIQ-app/README.md) - Frontend application docs
- [AWS Deployment](docs/AWS_DEPLOYMENT.md) - Deployment guide
- [Deployment Lessons](docs/DEPLOYMENT_LESSONS_LEARNED.md) - Troubleshooting
- [Sharing Guide](docs/SHARING_GUIDE.md) - How to share safely

See [docs/README.md](docs/README.md) for complete documentation index.

## Environment Variables

**Backend (.env):**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=retailiq_db
DB_USER=retailiq_user
DB_PASSWORD=your_password
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
BEDROCK_MODEL_ID=us.anthropic.claude-opus-4-6-v1
```

**Frontend (.env.development):**
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Default Credentials

- **Username**: admin
- **Password**: RetailIQ@2024

⚠️ Change these in production!

## Requirements

- Docker & Docker Compose (for local development)
- Python 3.12+ (for manual backend setup)
- Node.js 20+ (for manual frontend setup)
- PostgreSQL 14+ (or use Docker)

## License

Proprietary - All Rights Reserved

## Support

For issues and questions:
1. Check component-specific README files
2. Review documentation in `docs/` folders
3. See `aws-deployment/DEPLOYMENT_LESSONS_LEARNED.md` for common issues

## Security Note

This repository does not contain any sensitive data:
- No AWS credentials
- No database passwords
- No API keys
- All sensitive data must be configured via environment variables

See `SHARING_GUIDE.md` for information on sharing this project.
