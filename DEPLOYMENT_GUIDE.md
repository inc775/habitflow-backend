# HabitFlow Backend — Railway Deployment Guide

Complete step-by-step guide to deploy the HabitFlow backend to Railway with PostgreSQL.

## Prerequisites

- GitHub account with the backend repository
- Railway account (https://railway.app)
- Node.js 18+ (for local testing)
- PostgreSQL (for local development)

## Quick Start (5 minutes)

### Step 1: Connect GitHub Repository

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub"**
4. Authorize Railway to access your GitHub account
5. Select the `habitflow-backend` repository
6. Click **"Deploy Now"**

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"Add"**
2. Select **"PostgreSQL"**
3. Railway will automatically provision a database
4. The `DATABASE_URL` environment variable is set automatically

### Step 3: Configure Environment Variables

1. Go to project settings
2. Click **"Variables"**
3. Add the following variables:

```env
NODE_ENV=production
JWT_SECRET=<generate-a-strong-random-string>
JWT_REFRESH_SECRET=<generate-another-strong-random-string>
CORS_ORIGIN=https://your-frontend-url.com,http://localhost:3000
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
```

### Step 4: Deploy

1. Railway automatically deploys when you push to main branch
2. Check deployment status in the "Deployments" tab
3. Once deployed, your API is live!

### Step 5: Get Your API URL

1. Go to "Settings" → "Domains"
2. Your API URL will be: `https://<project-name>.up.railway.app`
3. Use this URL in your React Native app

## Detailed Setup

### Generate Strong Secrets

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET
openssl rand -base64 32
```

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3001` (auto-set by Railway) |
| `DATABASE_URL` | PostgreSQL connection | Auto-set by Railway |
| `JWT_SECRET` | JWT signing key | `<random-base64-string>` |
| `JWT_EXPIRY` | Access token expiry | `7d` |
| `JWT_REFRESH_SECRET` | Refresh token key | `<random-base64-string>` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `30d` |
| `CORS_ORIGIN` | Allowed origins | `https://app.example.com` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `your-project-id` |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | `-----BEGIN PRIVATE KEY-----...` |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email | `firebase-adminsdk@...` |

### Firebase Setup (Optional but Recommended)

To enable push notifications:

1. **Create Firebase Project**
   - Go to https://firebase.google.com
   - Click "Go to console"
   - Click "Create a new project"
   - Enter project name (e.g., "habitflow")
   - Click "Create project"

2. **Generate Service Account Key**
   - Go to Project Settings (gear icon)
   - Click "Service Accounts" tab
   - Click "Generate New Private Key"
   - Save the JSON file

3. **Add to Railway**
   - Open the JSON file
   - Copy `project_id` → `FIREBASE_PROJECT_ID`
   - Copy `private_key` → `FIREBASE_PRIVATE_KEY`
   - Copy `client_email` → `FIREBASE_CLIENT_EMAIL`

## Monitoring & Logs

### View Logs

1. Go to your Railway project
2. Click the **"Logs"** tab
3. View real-time server logs

### Common Issues

**Database Connection Error**
```
Error: connect ECONNREFUSED
```
- Check `DATABASE_URL` is set correctly
- Ensure PostgreSQL plugin is added to project

**Build Failure**
```
Error: npm install failed
```
- Check `package.json` is valid
- Ensure all dependencies are listed
- Check Node.js version compatibility

**Port Already in Use**
```
Error: listen EADDRINUSE
```
- Railway automatically assigns a port
- Don't hardcode port in code
- Use `process.env.PORT || 3001`

## Database Management

### Access PostgreSQL Console

1. In Railway project, click PostgreSQL plugin
2. Click "Connect" tab
3. Copy connection string
4. Use with `psql` or database client

### Run Migrations

Migrations run automatically on deployment via `npm run build` script.

To manually run:

```bash
# Local development
npm run migrate

# On Railway (via SSH)
railway run npm run migrate
```

### Backup Database

1. In Railway PostgreSQL settings
2. Click "Backups" tab
3. Click "Create Backup"
4. Download backup file

## Custom Domain

### Add Custom Domain

1. Go to project "Settings" → "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `api.habitflow.app`)
4. Follow DNS setup instructions
5. Wait for DNS propagation (5-30 minutes)

### Update CORS

After adding custom domain, update `CORS_ORIGIN`:

```env
CORS_ORIGIN=https://api.habitflow.app,https://app.habitflow.app,http://localhost:3000
```

## Scaling & Performance

### Increase Resources

1. Go to project "Settings" → "Resources"
2. Adjust CPU and RAM as needed
3. Changes take effect on next deployment

### Database Optimization

1. Enable connection pooling (auto-enabled)
2. Add database indexes (see schema.sql)
3. Monitor slow queries in logs

## CI/CD Pipeline

### Automatic Deployments

Railway automatically deploys when you push to main branch:

```bash
git push origin main
# → Railway detects changes
# → Runs npm install && npm run build
# → Deploys new version
# → API is live in ~2 minutes
```

### Rollback

1. Go to "Deployments" tab
2. Find previous deployment
3. Click "Redeploy"
4. Previous version is live

## Security Checklist

- ✅ Strong JWT secrets (32+ characters, random)
- ✅ CORS configured for specific origins only
- ✅ HTTPS enforced (automatic with Railway)
- ✅ Rate limiting enabled
- ✅ Database credentials in environment variables
- ✅ No secrets in code or git history
- ✅ Firebase credentials secured
- ✅ Password hashing with bcryptjs

## Troubleshooting

### API Returns 500 Error

1. Check logs for error message
2. Verify environment variables are set
3. Check database connection
4. Restart deployment

### Slow Response Times

1. Check database query performance
2. Monitor CPU/RAM usage
3. Scale up resources if needed
4. Enable query caching

### CORS Errors from Frontend

1. Verify frontend URL in `CORS_ORIGIN`
2. Include protocol (https://)
3. Restart deployment after changes
4. Check browser console for exact error

### Database Connection Timeout

1. Check `DATABASE_URL` format
2. Verify PostgreSQL is running
3. Check connection pool settings
4. Increase timeout in connection string

## Cost Estimation

Railway pricing (as of 2024):

- **Compute**: $0.000417/hour per vCPU (~$5/month for 1 vCPU)
- **Memory**: $0.000050/hour per GB (~$3.60/month for 1GB)
- **PostgreSQL**: $0.000417/hour per vCPU (~$5/month base)
- **Storage**: $0.25/GB/month

**Estimated monthly cost**: $15-30 for small-medium app

## Advanced Configuration

### Custom Build Script

Edit `railway.json`:

```json
{
  "build": {
    "builder": "nixpacks",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "on_failure",
    "restartPolicyMaxRetries": 5
  }
}
```

### Environment-Specific Configs

Create `.env.production`:

```env
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=200
```

### Health Check Endpoint

Railway automatically monitors `/health` endpoint:

```
GET /health
Response: { "status": "ok", "timestamp": "...", "environment": "production" }
```

## Monitoring & Analytics

### Enable Application Monitoring

1. Go to project settings
2. Enable "Observability"
3. View metrics in dashboard

### Key Metrics to Monitor

- Request count
- Response time
- Error rate
- Database connections
- CPU/Memory usage

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **GitHub Issues**: https://github.com/habitflow/backend/issues
- **Email Support**: support@habitflow.app
- **Discord Community**: https://discord.gg/habitflow

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Test API endpoints with Postman
3. ✅ Configure Firebase for push notifications
4. ✅ Update React Native app with API URL
5. ✅ Test end-to-end sync flow
6. ✅ Monitor logs and performance
7. ✅ Set up custom domain
8. ✅ Add monitoring and alerts

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Status**: Production Ready
