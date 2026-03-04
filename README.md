# HabitFlow Backend API

Production-ready Node.js + Express backend for HabitFlow habit tracking app with PostgreSQL, JWT authentication, cloud sync, and analytics.

## Features

- **JWT Authentication** — Secure sign up, sign in, and token refresh
- **Habit CRUD** — Create, read, update, delete habits with validation
- **Cloud Sync** — Sync habits across devices with conflict resolution
- **Analytics** — Comprehensive habit statistics and insights
- **Data Export/Import** — Backup and restore user data
- **Push Notifications** — Integration ready for Firebase Cloud Messaging
- **Rate Limiting** — Protect API from abuse
- **Error Handling** — Comprehensive error responses
- **Security** — Helmet, CORS, input validation, password hashing

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Password Hashing**: bcryptjs
- **Language**: TypeScript
- **Deployment**: Railway

## Project Structure

```
src/
├── db/
│   ├── config.ts          # Database connection pool
│   ├── schema.sql         # PostgreSQL schema
│   └── migrate.ts         # Migration script
├── middleware/
│   ├── auth.ts            # JWT authentication
│   └── errorHandler.ts    # Error handling
├── routes/
│   ├── auth.ts            # Authentication endpoints
│   ├── habits.ts          # Habit CRUD endpoints
│   ├── sync.ts            # Cloud sync endpoints
│   └── analytics.ts       # Analytics endpoints
├── types/
│   └── index.ts           # TypeScript interfaces
├── utils/
│   └── auth.ts            # Auth utilities
└── index.ts               # Main server entry point
```

## Setup & Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Local Development

```bash
# 1. Clone and install
git clone <repo>
cd habitflow-backend
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Create database
createdb habitflow

# 4. Run migrations
npm run migrate

# 5. Start development server
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new account |
| POST | `/api/auth/signin` | Login to account |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |

### Habits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/habits` | Get all habits |
| GET | `/api/habits/:id` | Get specific habit |
| POST | `/api/habits` | Create new habit |
| PUT | `/api/habits/:id` | Update habit |
| DELETE | `/api/habits/:id` | Delete habit |
| POST | `/api/habits/:id/completions` | Mark habit complete |
| DELETE | `/api/habits/:id/completions/:date` | Remove completion |

### Cloud Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync` | Sync habits with conflict resolution |
| GET | `/api/sync/status` | Get sync status |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Get analytics data |
| GET | `/api/analytics/daily` | Get daily completion data |
| POST | `/api/analytics/export` | Export all user data |
| POST | `/api/analytics/import` | Import user data |

## API Documentation

### Authentication

#### Sign Up

```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "deviceId": "device-123"
}

Response 201:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-15T10:00:00Z",
    "is_active": true
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### Sign In

```bash
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "deviceId": "device-123"
}

Response 200:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "is_active": true
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### Refresh Token

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response 200:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Habits

#### Create Habit

```bash
POST /api/habits
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Morning Run",
  "description": "30 minute run",
  "icon": "🏃",
  "color": "#FF6B6B",
  "category": "fitness",
  "frequency": "daily"
}

Response 201:
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Morning Run",
  "description": "30 minute run",
  "icon": "🏃",
  "color": "#FF6B6B",
  "category": "fitness",
  "frequency": "daily",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z",
  "sync_version": 1,
  "is_deleted": false
}
```

#### Mark Habit Complete

```bash
POST /api/habits/:id/completions
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "completion_date": "2024-01-15"
}

Response 201:
{
  "id": "uuid",
  "habit_id": "uuid",
  "user_id": "uuid",
  "completion_date": "2024-01-15",
  "completed_at": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "sync_version": 1
}
```

### Cloud Sync

#### Sync Habits

```bash
POST /api/sync
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "device_id": "device-123",
  "habits": [
    {
      "id": "uuid",
      "name": "Morning Run",
      "sync_version": 1,
      ...
    }
  ],
  "completions": [
    {
      "id": "uuid",
      "habit_id": "uuid",
      "completion_date": "2024-01-15",
      "sync_version": 1
    }
  ],
  "last_sync_version": 0
}

Response 200:
{
  "habits": [...],
  "completions": [...],
  "sync_version": 2,
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### Analytics

#### Get Analytics

```bash
GET /api/analytics
Authorization: Bearer <accessToken>

Response 200:
{
  "total_habits": 5,
  "active_habits": 4,
  "total_completions": 45,
  "completion_rate": 75,
  "average_daily_completions": 1.5,
  "best_streak": 12,
  "habits": [
    {
      "id": "uuid",
      "name": "Morning Run",
      "streak": 5,
      "longest_streak": 12,
      "completion_rate_7d": 86,
      "completion_rate_30d": 75
    }
  ]
}
```

#### Export Data

```bash
POST /api/analytics/export
Authorization: Bearer <accessToken>

Response 200:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-15T10:00:00Z"
  },
  "habits": [...],
  "completions": [...],
  "exported_at": "2024-01-15T10:00:00Z"
}
```

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/habitflow
DB_HOST=localhost
DB_PORT=5432
DB_NAME=habitflow
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRY=7d
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRY=30d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:19000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Firebase (optional)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-email@firebase.com
```

## Deployment to Railway

### Prerequisites

- Railway account (https://railway.app)
- GitHub repository

### Steps

1. **Connect GitHub Repository**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Choose your repository

2. **Add PostgreSQL Plugin**
   - In Railway project, click "Add"
   - Select "PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

3. **Set Environment Variables**
   - Go to project settings
   - Add variables from `.env.example`
   - Make sure to set strong secrets for JWT

4. **Deploy**
   - Push to main branch
   - Railway automatically builds and deploys
   - Your API is live!

### Example Railway URL

```
https://habitflow-backend-prod.up.railway.app
```

## Error Handling

All errors return consistent JSON format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 400 | Invalid request data |
| AUTH_FAILED | 401 | Authentication failed |
| UNAUTHORIZED | 401 | Missing or invalid token |
| ACCOUNT_INACTIVE | 403 | Account is inactive |
| NOT_FOUND | 404 | Resource not found |
| EMAIL_EXISTS | 409 | Email already registered |
| SERVER_ERROR | 500 | Internal server error |

## Security Best Practices

- ✅ Passwords hashed with bcryptjs (10 rounds)
- ✅ JWT tokens with expiration
- ✅ CORS configured for specific origins
- ✅ Helmet for security headers
- ✅ Rate limiting to prevent abuse
- ✅ Input validation with Joi
- ✅ SQL injection protection via parameterized queries
- ✅ HTTPS recommended in production

## Performance

- Connection pooling (max 20 connections)
- Indexed database queries
- Soft deletes to preserve data
- Sync versioning to avoid conflicts
- Efficient pagination support

## Monitoring & Logging

All requests logged with:
- Method and path
- Response status code
- Response time (ms)
- Timestamp

Example log:
```
[2024-01-15T10:00:00.123Z] POST /api/habits - 201 (45ms)
```

## Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm start            # Start production server
npm run migrate      # Run database migrations
npm run type-check   # TypeScript validation
npm run lint         # ESLint
npm run format       # Prettier
```

## Troubleshooting

### Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Ensure PostgreSQL is running and credentials are correct in `.env`

### JWT Token Expired

```
Error: Invalid or expired token
```

**Solution**: Use the refresh token endpoint to get a new access token

### CORS Error

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution**: Add your frontend URL to `CORS_ORIGIN` in `.env`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/habitflow/backend/issues
- Email: support@habitflow.app

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintained by**: HabitFlow Team
