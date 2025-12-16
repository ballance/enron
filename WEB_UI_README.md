# Enron Email Visualization - Web UI

This web UI provides interactive visualizations for exploring the Enron email dataset.

## Architecture

**Backend:** Node.js + Express API
- Port: 3001
- Database: PostgreSQL (existing, port 5434)
- Cache: Redis (port 6379)

**Frontend:** React + Vite
- Port: 3002 (mapped from container port 3000)
- State: Zustand + TanStack Query
- Styling: Tailwind CSS
- Visualizations: react-force-graph-2d, Recharts, react-d3-tree, D3.js

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start all services (includes PostgreSQL, Redis, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

### Access URLs

- **Frontend:** http://localhost:3002
- **Backend API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/health
- **PostgreSQL:** localhost:5434
- **Redis:** localhost:6379

## Development

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run dev

# Run in production mode
npm start
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
enron/
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── server.js          # Main Express app
│   │   ├── config/            # Database & Redis config
│   │   ├── routes/            # API endpoints (to be added in Phase 2)
│   │   ├── services/          # Business logic (to be added in Phase 2)
│   │   └── middleware/        # Cache, errors, validation
│   └── Dockerfile
│
├── frontend/                   # React/Vite app
│   ├── src/
│   │   ├── App.jsx            # Root component with routing
│   │   ├── main.jsx           # Entry point
│   │   ├── api/client.js      # Axios API client
│   │   ├── components/        # UI components
│   │   ├── views/             # Page components
│   │   ├── hooks/             # Custom React hooks (Phase 2+)
│   │   ├── store/             # Zustand state (Phase 3+)
│   │   └── styles/            # Tailwind CSS
│   └── Dockerfile
│
└── docker-compose.yml          # Orchestrates all services
```

## Implementation Status

### ✅ Phase 1: Setup & Infrastructure (COMPLETED)

- Backend Express server with PostgreSQL and Redis connections
- Frontend React app with routing and Tailwind CSS
- Docker Compose integration
- Health check endpoints
- API client setup

### 🔄 Phase 2: Core API & Dashboard (Next)

- Analytics service (stats, top senders/receivers)
- People service (list, details, pagination)
- Dashboard view with stats cards and charts

### 📋 Upcoming Phases

- Phase 3: Network Graph Visualization
- Phase 4: Timeline & Activity Analysis
- Phase 5: Thread Explorer
- Phase 6: Person Detail View
- Phase 7: Search & Polish

## API Endpoints (Planned)

### Analytics
- `GET /api/analytics/stats` - Overall statistics
- `GET /api/analytics/top-senders` - Top email senders
- `GET /api/analytics/top-receivers` - Top email receivers

### People
- `GET /api/people` - List people (paginated)
- `GET /api/people/:id` - Person details
- `GET /api/people/:id/network` - Person's network graph

### Network
- `GET /api/network/graph` - Full network graph data

### Threads
- `GET /api/threads` - List threads (paginated)
- `GET /api/threads/:id` - Thread details
- `GET /api/threads/:id/tree` - Thread tree structure

### Timeline
- `GET /api/timeline/volume` - Email volume over time
- `GET /api/timeline/heatmap` - Activity heatmap

### Search
- `GET /api/search` - Search people/threads/messages
- `GET /api/search/autocomplete` - Autocomplete suggestions

## Current Views

All views are placeholder templates ready for Phase 2+ implementation:

- `/` - Dashboard
- `/network` - Network Graph
- `/timeline` - Timeline & Heatmaps
- `/threads` - Thread Explorer
- `/people/:id` - Person Detail
- `/search` - Search Results

## Testing

### Backend Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-14T...",
  "services": {
    "database": { "healthy": true, "timestamp": "..." },
    "redis": { "healthy": true }
  }
}
```

### Frontend

Visit http://localhost:3002 and you should see the navigation working between all views.

## Troubleshooting

### Port Already in Use

If port 3002 is in use:
1. Edit `docker-compose.yml`, change `3002:3000` to another port like `3003:3000`
2. Restart: `docker-compose restart frontend`

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
# Should return: PONG
```

### Frontend Build Issues

```bash
# Rebuild frontend container
docker-compose build frontend
docker-compose up -d frontend
```

## Environment Variables

See `.env` file for configuration. Key variables:

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5434
POSTGRES_DB=enron_emails
POSTGRES_USER=enron
POSTGRES_PASSWORD=enron_dev_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend
PORT=3001
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3001/api
```

## Next Steps

Ready to implement Phase 2! This will add:
1. Analytics API endpoints (stats, top senders/receivers)
2. People API endpoints (list, pagination, details)
3. Dashboard view with real data
4. Charts using Recharts

See the full implementation plan at: `~/.claude/plans/iridescent-wibbling-candy.md`
