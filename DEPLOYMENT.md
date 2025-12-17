# Deployment Process Documentation

## Overview

This document outlines the complete deployment process for OnTrac, covering both initial setup and ongoing updates. Follow these procedures to ensure consistent, reliable deployments across all environments.

---

## Architecture Overview

### Deployment Stack

| Component | Platform | Tier | URL |
|-----------|----------|------|-----|
| Frontend | Vercel | Free | https://ontrac-ats.vercel.app |
| Backend API | Render | Free | https://ontrac.onrender.com |
| Database | MongoDB Atlas | Free (M0) | [Cluster URL] |

### Repository Structure

```
CS_490_ats_app/
├── application/
│   ├── client/          # React frontend (Vite)
│   │   ├── src/
│   │   ├── .env.development
│   │   ├── .env.staging
│   │   ├── .env.production
│   │   └── vercel.json
│   └── server/          # Node.js/Express backend
│       ├── routes/
│       ├── models/
│       ├── config/
│       ├── .env.development
│       ├── .env.staging
│       └── .env.production
```

---

## Initial Deployment Setup

### Prerequisites

- GitHub account with repository access
- Vercel account (sign up with GitHub)
- Render account (sign up with GitHub)
- MongoDB Atlas account
- Node.js 18+ installed locally

---

## Frontend Deployment (Vercel)

### Initial Setup

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up with GitHub
   - Grant Vercel access to your repositories

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - **Important:** Do NOT create a new Git repository - import existing one

3. **Configure Build Settings**
   ```
   Framework Preset: Vite
   Root Directory: application/client
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Add Environment Variables**
   
   Go to Settings → Environment Variables, add:
   
   **Production:**
   ```
   VITE_API_BASE_URL=https://ontrac.onrender.com
   VITE_API_URL=https://ontrac.onrender.com
   VITE_FRONTEND_ORIGIN=https://ontrac-ats.vercel.app
   ```
   
   **Preview (optional):**
   ```
   VITE_API_BASE_URL=https://ontrac-staging.onrender.com
   VITE_API_URL=https://ontrac-staging.onrender.com  
   VITE_FRONTEND_ORIGIN=https://ontrac-ats-preview.vercel.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Verify at your Vercel URL

### Vercel Configuration File

**`application/client/vercel.json`:**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Purpose:** Handles client-side routing - all routes serve index.html for React Router to handle.

---

## Backend Deployment (Render)

### Initial Setup

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub
   - Grant Render access to your repositories

2. **Create Web Service**
   - Click "New+" → "Web Service"
   - Select your GitHub repository
   - **Important:** Choose correct repository (not a fork)

3. **Configure Service Settings**
   ```
   Name: ontrac (or your preferred name)
   Region: Oregon (US West) or closest to you
   Branch: main
   Root Directory: application/server
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Free
   ```

4. **Add Environment Variables**
   
   Go to Environment tab, add all required variables:
   
   **Core Settings:**
   ```
   NODE_ENV=production
   PORT=10000
   BASE=https://ontrac.onrender.com
   ```
   
   **Database:**
   ```
   ATLAS_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER_URL/appdb-prod?appName=Cluster0
   DB_NAME=appdb-prod
   ```
   
   **CORS & Frontend:**
   ```
   CORS_ORIGIN=https://ontrac-ats.vercel.app
   FRONTEND_ORIGIN=https://ontrac-ats.vercel.app
   CLIENT_APP_URL=https://ontrac-ats.vercel.app
   ```
   
   **Authentication:**
   ```
   JWT_SECRET=<your-secret-key>
   ```
   
   **OAuth (Google, Microsoft, LinkedIn, GitHub):**
   ```
   GOOGLE_CLIENT_ID=<your-client-id>
   GOOGLE_CLIENT_SECRET=<your-client-secret>
   GOOGLE_REDIRECT_URI=https://ontrac.onrender.com/api/auth/google/callback
   
   MICROSOFT_CLIENT_ID=<your-client-id>
   MICROSOFT_CLIENT_SECRET=<your-client-secret>
   MICROSOFT_REDIRECT_URI=https://ontrac.onrender.com/api/auth/microsoft/callback
   
   LINKEDIN_CLIENT_ID=<your-client-id>
   LINKEDIN_CLIENT_SECRET=<your-client-secret>
   LINKEDIN_REDIRECT_URI=https://ontrac.onrender.com/api/auth/linkedin/callback
   
   GITHUB_CLIENT_ID=<your-client-id>
   GITHUB_CLIENT_SECRET=<your-client-secret>
   GITHUB_REDIRECT_URI=https://ontrac-ats.vercel.app/api/github/oauth/callback
   ```
   
   **Email (SMTP):**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=<your-email>
   SMTP_PASS=<app-password>
   EMAIL_FROM=OnTrac <noreply@ontrac.com>
   ```
   
   **AI API Keys:**
   ```
   OPENAI_API_KEY=<your-key>
   GOOGLE_API_KEY=<your-key>
   GEMINI_API_KEY=<your-key>
   ```
   
   **External Services:**
   ```
   NEWS_API_KEY=<your-key>
   ADZUNA_APP_ID=<your-id>
   ADZUNA_API_KEY=<your-key>
   ```
   
   **Logging:**
   ```
   LOG_LEVEL=error
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Monitor build logs
   - Verify deployment at your Render URL

---

## Database Setup (MongoDB Atlas)

### Initial Cluster Setup

1. **Create MongoDB Atlas Account**
   - Go to https://cloud.mongodb.com
   - Sign up (free tier available)

2. **Create Cluster**
   - Choose Free Tier (M0)
   - Select region closest to Render deployment
   - Name your cluster (e.g., "Cluster0")

3. **Configure Network Access**
   - Go to Network Access
   - Add IP: `0.0.0.0/0` (allow all - needed for Render)
   - **Note:** More restrictive settings available on paid tiers

4. **Create Database User**
   - Go to Database Access
   - Create user with password
   - Grant "Read and write to any database" permissions

5. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy connection string
   - Format: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/`

6. **Create Databases**
   - Databases are created automatically when first document is inserted
   - Three databases will exist: `appdb`, `appdb-staging`, `appdb-prod`

See [DATABASE.md](./DATABASE.md) for detailed database documentation.

---

## Deployment Workflow

### For Regular Updates

#### 1. Development → GitHub

```bash
# Make your changes in development
cd ~/CS_490_ats_app/application

# Test locally
cd client && npm run dev  # Test frontend
cd ../server && npm run dev  # Test backend

# Commit and push
git add .
git commit -m "Description of changes"
git push origin main
```

#### 2. Automatic Deployments

**What happens automatically:**

1. **Vercel** detects push to `main` branch
   - Triggers build automatically
   - Runs `npm run build` in `application/client`
   - Deploys to production
   - Takes ~2-3 minutes

2. **Render** detects push to `main` branch
   - Triggers build automatically
   - Runs `npm install` in `application/server`
   - Runs `npm start`
   - Takes ~5-10 minutes (free tier spins down when idle)

#### 3. Verify Deployment

```bash
# Check frontend
curl https://ontrac-ats.vercel.app

# Check backend health
curl https://ontrac.onrender.com/healthz

# Check backend root
curl https://ontrac.onrender.com/
# Should return: {"message": "OnTrac API is running", ...}
```

---

## Syncing Forked Repository

If you're working with a forked repository (for Vercel deployment):

### One-Time Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/ontrac.git
cd ontrac

# Add original repo as upstream
git remote add upstream https://github.com/jjm28/CS_490_ats_app.git

# Verify remotes
git remote -v
# origin    -> your fork (triggers Vercel)
# upstream  -> original repo
```

### Regular Sync Workflow

```bash
# Fetch latest changes from original repo
git fetch upstream

# Merge into your main branch
git checkout main
git merge upstream/main

# Push to your fork (triggers deployment)
git push origin main
```

---

## Environment-Specific Deployments

### Development Environment

**Local only** - not deployed to cloud

```bash
cd application/server
npm run dev  # Uses .env.development

cd application/client  
npm run dev  # Uses .env.development
```

### Staging Environment

**Optional** - for testing before production

1. Create staging branch: `git checkout -b staging`
2. Create separate Render service pointing to `staging` branch
3. Use staging environment variables
4. Deploy via: `git push origin staging`

### Production Environment

**Main deployment** - from `main` branch

- Automatic deployment on push to `main`
- Uses production environment variables
- Monitored via Vercel/Render dashboards

---

## Rollback Procedures

### Frontend Rollback (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." menu → "Promote to Production"
4. Deployment is instant

### Backend Rollback (Render)

**Option 1: Redeploy Previous Commit**
1. Go to Render Dashboard → Deployments
2. Find previous successful deployment
3. Click "Redeploy"

**Option 2: Git Revert**
```bash
# Identify problem commit
git log --oneline

# Revert to previous commit
git revert <commit-hash>
git push origin main
```

**Option 3: Manual Deploy from Branch**
1. Create rollback branch: `git checkout -b rollback-fix`
2. Cherry-pick working commits
3. Push and deploy from rollback branch temporarily

---

## Monitoring and Logs

### Vercel Logs

**Access:**
- Dashboard → Your Project → Deployments → [Deployment] → Logs

**What to monitor:**
- Build errors
- Runtime errors (limited on free tier)
- Performance metrics

### Render Logs

**Access:**
- Dashboard → Your Service → Logs tab

**What to monitor:**
- Application startup
- Database connections
- API errors
- Performance warnings

**Real-time logs:**
```bash
# View logs in real-time
# (Available in Render dashboard, not CLI on free tier)
```

### MongoDB Atlas Monitoring

**Access:**
- Atlas Dashboard → Your Cluster → Metrics

**What to monitor:**
- Connection count
- Query performance
- Storage usage
- Network I/O

---

## Troubleshooting

### Common Deployment Issues

#### Frontend Build Fails

**Symptoms:**
```
Error: Command "npm run build" exited with 1
```

**Solutions:**
1. Check TypeScript errors in build logs
2. Verify all dependencies in `package.json`
3. Test build locally: `npm run build`
4. Check environment variables are set in Vercel

#### Backend Won't Start

**Symptoms:**
```
Error: Cannot find module 'X'
Application crashed
```

**Solutions:**
1. Check `package.json` has all dependencies
2. Verify `NODE_ENV=production` is set
3. Check Render build logs for errors
4. Ensure `npm start` script exists

#### Database Connection Fails

**Symptoms:**
```
Error: Server selection timed out
MongoNetworkError
```

**Solutions:**
1. Verify `ATLAS_URI` is correct in Render environment variables
2. Check MongoDB Atlas network access allows `0.0.0.0/0`
3. Verify database user credentials
4. Check database name matches environment

#### CORS Errors

**Symptoms:**
```
Access to fetch blocked by CORS policy
```

**Solutions:**
1. Verify `CORS_ORIGIN` in backend matches frontend URL exactly
2. Check frontend is using correct `VITE_API_BASE_URL`
3. Ensure no trailing slashes in URLs
4. Verify HTTPS (not HTTP) in production

#### OAuth Not Working

**Symptoms:**
```
Redirect URI mismatch
Invalid client
```

**Solutions:**
1. Add production URLs to OAuth provider consoles:
   - Google Cloud Console
   - Microsoft Azure Portal  
   - LinkedIn Developer Portal
   - GitHub OAuth Apps

2. Verify redirect URIs match exactly:
   ```
   https://ontrac.onrender.com/api/auth/[provider]/callback
   ```

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets in environment variables (not in code)
- [ ] `.env.*` files in `.gitignore`
- [ ] HTTPS enabled (automatic on Vercel/Render)
- [ ] CORS configured for production URLs only
- [ ] OAuth redirect URIs use HTTPS
- [ ] Database user has minimal required permissions
- [ ] API rate limiting configured (if applicable)

### Post-Deployment

- [ ] Test authentication flows
- [ ] Verify environment variables are set correctly
- [ ] Check database connections work
- [ ] Test OAuth providers
- [ ] Verify CORS configuration
- [ ] Review security headers
- [ ] Test API endpoints

---

## Performance Optimization

### Frontend (Vercel)

- Code splitting enabled (Vite default)
- Tree shaking enabled (Vite default)
- Asset optimization automatic
- CDN distribution automatic
- Gzip compression automatic

### Backend (Render)

- Connection pooling configured
- Environment-based logging (error only in production)
- Static asset caching
- Database query optimization

**Note:** Free tier has cold start delays (~30-60 seconds after inactivity)

---

## Cost Management

### Current Costs (Free Tier)

| Service | Cost | Limits |
|---------|------|--------|
| Vercel | $0 | 100GB bandwidth/month |
| Render | $0 | Sleeps after 15min inactivity |
| MongoDB Atlas | $0 | 512MB storage |

### Scaling Considerations

**When to upgrade:**

- **Vercel:** Bandwidth exceeds 100GB/month
- **Render:** Need 24/7 uptime (no sleep)
- **MongoDB:** Storage exceeds 512MB or need backups

**Upgrade costs:**
- Vercel Pro: $20/month
- Render Starter: $7/month
- MongoDB M2: $9/month

---

## Maintenance Schedule

### Daily
- Monitor error logs in Render
- Check deployment status

### Weekly
- Review Vercel deployment history
- Check MongoDB storage usage
- Review application metrics

### Monthly
- Update dependencies (`npm outdated`)
- Review and rotate API keys if needed
- Check for security updates

### Quarterly
- Review and optimize database indexes
- Evaluate upgrade needs
- Update documentation

---

## Useful Commands

```bash
# Check deployment status
git log --oneline -5  # Recent commits
git status            # Working directory status

# Build locally (verify before deploying)
cd application/client && npm run build
cd application/server && npm start

# Test API locally
curl http://localhost:5050/healthz
curl http://localhost:5050/api/auth/status

# Check environment
echo $NODE_ENV

# View dependencies
npm list --depth=0
```

---

## Emergency Contacts

**Platform Support:**
- Vercel: https://vercel.com/support
- Render: https://render.com/docs
- MongoDB Atlas: https://support.mongodb.com

**Internal Team:**
- Lead Developer: [Your contact]
- DevOps: [Your contact]
- Database Admin: [Your contact]

---

## Appendix: Quick Reference

### Deployment URLs

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Development | http://localhost:5173 | http://localhost:5050 | appdb (local or Atlas) |
| Production | https://ontrac-ats.vercel.app | https://ontrac.onrender.com | appdb-prod (Atlas) |

### Key Files

- `application/client/vercel.json` - Vercel routing config
- `application/server/server.js` - Express app entry point
- `application/server/config/env.js` - Environment loader
- `application/server/db/connection.js` - Database connection
- `.gitignore` - Excluded files

### Repository Links

- Main Repository: https://github.com/jjm28/CS_490_ats_app
- Fork (if applicable): https://github.com/YOUR_USERNAME/ontrac

---

**Last Updated:** December 2024  
**Version:** 1.0  
**Maintained By:** OnTrac Development Team  
**Next Review:** March 2025
