# Database Configuration Documentation

## Overview

OnTrac uses **MongoDB Atlas** (cloud-hosted MongoDB) with separate databases for each environment. This document covers database setup, configuration, and maintenance procedures.

---

## Database Architecture

### Environments

We maintain three separate databases on a single MongoDB Atlas cluster:

| Environment | Database Name | Purpose |
|------------|---------------|---------|
| Development | `appdb` (or `appdb-dev`) | Local development and testing |
| Staging | `appdb-staging` | Pre-production testing and QA |
| Production | `appdb-prod` | Live production data |

### Connection Details

**Cluster Information:**
- Provider: MongoDB Atlas (Free Tier M0)
- Region: [Your cluster region]
- Cluster Name: [Your cluster name, e.g., Cluster0]

**Connection String Format:**
```
mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?appName=<app-name>
```

---

## Environment Variables

### Required Variables

Each environment requires these MongoDB-related environment variables:

```bash
# Database Connection
ATLAS_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER_URL/DATABASE_NAME?appName=APP_NAME
DB_NAME=<database-name>

# Alternative variable names (for compatibility)
MONGODB_URI=<same as ATLAS_URI>
MONGO_URI=<same as ATLAS_URI>
```

### Environment-Specific Values

**Development (.env.development):**
```bash
ATLAS_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER_URL/appdb?appName=Cluster0
DB_NAME=appdb
```

**Staging (.env.staging):**
```bash
ATLAS_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER_URL/appdb-staging?appName=Cluster0
DB_NAME=appdb-staging
```

**Production (.env.production):**
```bash
ATLAS_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER_URL/appdb-prod?appName=Cluster0
DB_NAME=appdb-prod
```

**Note:** Never commit actual credentials to git. Use `.env.example` files with placeholder values.

---

## Database Schema

### Collections

The application uses the following main collections:

- `users` - User accounts and authentication
- `profiles` - User profile information
- `jobs` - Job postings and applications
- `resumes` - Resume documents and versions
- `coverletters` - Cover letter documents and versions
- `interviews` - Interview schedules and notes
- `skills` - User skills and competencies
- `education` - Education history
- `certifications` - Professional certifications
- `projects` - Portfolio projects
- `contacts` - Networking contacts
- `goals` - Career goals and tracking
- `notifications` - User notifications
- `templates` - System and user templates
- `automations` - Automation workflows

*(Collections are created automatically when first document is inserted)*

### Indexes

Key indexes for performance (automatically created by Mongoose schemas):

**users collection:**
- `_id` (default)
- `email` (unique)
- `createdAt`

**jobs collection:**
- `_id` (default)
- `userId`
- `status`
- `deadline`

**resumes collection:**
- `_id` (default)
- `userId`
- `createdAt`

*(Additional indexes may exist - check MongoDB Compass for complete list)*

---

## Connection Pooling

### Configuration

MongoDB connection pooling is configured in `server/db/connection.js`:

```javascript
mongoose.connect(URI, {
  maxPoolSize: 10,  // Maximum number of connections
  minPoolSize: 2,   // Minimum number of connections to maintain
  serverSelectionTimeoutMS: 5000,  // Server selection timeout
  socketTimeoutMS: 45000,  // Socket timeout
});
```

### Connection Pool Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| maxPoolSize | 10 | Prevents too many concurrent connections |
| minPoolSize | 2 | Maintains minimum connections for quick response |
| serverSelectionTimeoutMS | 5000ms | Timeout for finding available server |
| socketTimeoutMS | 45000ms | Socket inactivity timeout |

---

## Backup Strategy

### Current Status

**MongoDB Atlas Free Tier (M0):**
- ❌ Automated backups NOT available on free tier
- ⚠️ Manual backup recommended for production data

### Backup Recommendations

1. **Upgrade to Paid Tier** (Recommended)
   - MongoDB Atlas M2 or higher includes automated backups
   - Point-in-time recovery available
   - Cost: Starting at ~$9/month

2. **Manual Backup Process** (Current)
   - Export production data periodically using `mongodump`
   - Store exports in secure location (encrypted cloud storage)
   - Test restore process regularly

3. **Development Data**
   - Not critical - can be regenerated
   - Staging data should mirror production structure

### Manual Backup Commands

```bash
# Export entire database
mongodump --uri="mongodb+srv://USERNAME:PASSWORD@CLUSTER/appdb-prod" --out=./backup-$(date +%Y%m%d)

# Export specific collection
mongodump --uri="mongodb+srv://USERNAME:PASSWORD@CLUSTER/appdb-prod" --collection=users --out=./backup-users

# Restore from backup
mongorestore --uri="mongodb+srv://USERNAME:PASSWORD@CLUSTER/appdb-prod" ./backup-folder
```

---

## Security Best Practices

### Credentials Management

1. **Never commit credentials to git**
   - Use `.env` files (gitignored)
   - Use platform-specific secret management (Render, Vercel)

2. **Rotate passwords periodically**
   - Change MongoDB Atlas password quarterly
   - Update all environment configurations

3. **Use IP Whitelisting** (if needed)
   - Configure in MongoDB Atlas Network Access
   - Add Render's IP ranges for production

### Database User Permissions

- Development: Read/write access to dev database
- Staging: Read/write access to staging database  
- Production: Read/write access to production database only

---

## Monitoring and Health Checks

### Health Check Endpoint

The API includes a database health check:

```bash
# Check if database is responding
GET /healthz

# Response: 204 No Content (success)
```

### Monitoring Metrics

Monitor these in MongoDB Atlas dashboard:

- Connection count
- Query performance
- Storage usage
- Network I/O
- Database operations/second

### Alerts

Set up alerts in MongoDB Atlas for:

- Storage approaching capacity (80% threshold)
- Unusual spike in connections
- Slow queries (> 100ms)

---

## Troubleshooting

### Common Issues

**Connection Timeout:**
```
Error: Server selection timed out after 5000 ms
```
- Check network connectivity
- Verify IP whitelist in MongoDB Atlas
- Confirm credentials are correct

**Authentication Failed:**
```
Error: Authentication failed
```
- Verify username/password in connection string
- Check MongoDB Atlas user permissions
- Ensure special characters in password are URL-encoded

**Database Not Found:**
```
Error: Database not initialized
```
- Database is created automatically on first write
- Verify `DB_NAME` environment variable is set correctly

### Debug Mode

Enable MongoDB query logging:

```javascript
// In development
mongoose.set('debug', true);
```

---

## Migration Guide

### Adding New Collections

1. Create Mongoose schema in `server/models/`
2. Collections are created automatically on first document insert
3. No manual migration needed for MongoDB

### Adding Indexes

1. Define indexes in Mongoose schema:
   ```javascript
   schema.index({ email: 1 }, { unique: true });
   ```

2. Indexes are created automatically when model is loaded

3. For existing collections, indexes apply on app restart

### Environment Promotion

**Promoting Staging to Production:**

1. Verify staging database is stable
2. Export data if needed:
   ```bash
   mongodump --uri="..." --db=appdb-staging --out=./staging-data
   ```
3. Production database should start empty for new users
4. System templates seeded automatically on first startup

---

## Maintenance Tasks

### Regular Maintenance

- **Weekly:** Monitor connection pool usage
- **Monthly:** Review slow query logs
- **Quarterly:** Evaluate storage usage and cleanup old data

### Data Retention

Consider implementing data retention policies:

- Archive old job applications (> 1 year)
- Remove deleted user data after 30 days
- Purge notification history after 90 days

---

## Contact and Support

**MongoDB Atlas Support:**
- Free tier: Community forums only
- Paid tier: Email/chat support available

**Internal Team:**
- Database issues: Check logs in Render dashboard
- Performance issues: Review MongoDB Atlas metrics
- Schema changes: Test in development first

---

## Appendix: Useful Commands

```bash
# Connect to database via mongosh
mongosh "mongodb+srv://CLUSTER_URL" --username USERNAME

# List all databases
show dbs

# Switch to specific database
use appdb-prod

# List all collections
show collections

# Count documents in collection
db.users.countDocuments()

# Find documents
db.users.find({ email: "user@example.com" })

# Check collection indexes
db.users.getIndexes()

# Database stats
db.stats()
```

---

**Last Updated:** December 2024  
**Version:** 1.0  
**Next Review:** March 2025
