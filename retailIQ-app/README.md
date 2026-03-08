# RetailIQ Frontend

React + TypeScript frontend application for RetailIQ demand planning system.

## Features

- Multi-step workflow for demand planning
- CSV file upload (Inventory + POS)
- Real-time processing status
- Interactive dashboard with charts
- Decision management (Approve/Modify/Hold)
- LLM-powered insights chat
- Responsive design with Tailwind CSS

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker

```bash
# Build
docker build -t retailiq-frontend .

# Run
docker run -p 80:80 retailiq-frontend
```

## Project Structure

```
retailIQ-app/
├── src/
│   ├── components/
│   │   ├── layout/          # Layout components (Header, Sidebar)
│   │   └── steps/           # Workflow step components
│   ├── services/            # API service layer
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── public/                  # Static assets
├── docs/                    # Documentation
├── .env.development         # Development environment variables
├── .env.production          # Production environment variables
└── nginx.conf              # Nginx configuration for Docker
```

## Workflow Steps

1. **Upload**: Upload Inventory and POS CSV files
2. **Processing**: Real-time processing status with progress tracking
3. **Dashboard**: View forecast results and insights
4. **Insights**: LLM-powered analysis and recommendations
5. **Decision**: Review and take action (Approve/Modify/Hold)

## Environment Variables

### Development (.env.development)
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Production (.env.production)
```bash
VITE_API_BASE_URL=https://your-cloudfront-url.cloudfront.net/api/v1
```

Note: Replace `your-cloudfront-url` with your actual CloudFront distribution URL.

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Web Server**: Nginx (production)

## Development

### Available Scripts

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check
npm run type-check
```

### Code Style

- ESLint for code linting
- TypeScript for type safety
- Tailwind CSS for styling
- Component-based architecture

## API Integration

The frontend communicates with the backend API through the `services/api.ts` module:

```typescript
import api from './services/api';

// Example: Upload files
const formData = new FormData();
formData.append('inventory_file', inventoryFile);
formData.append('pos_file', posFile);
await api.post('/ingestion/upload', formData);
```

## Docker Deployment

The production Docker image uses Nginx to serve the built static files:

```dockerfile
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

## Documentation

See the `docs/` folder for detailed documentation:
- [Frontend Implementation](docs/FRONTEND_IMPLEMENTATION.md)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Proprietary
