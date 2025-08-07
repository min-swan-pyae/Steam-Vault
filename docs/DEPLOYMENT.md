# Deployment Guide

Complete guide for deploying Steam Vault to production environments.

## 🚀 Deployment Options

### Recommended Platforms

#### Frontend Deployment
- **Vercel** ⭐ (Recommended)
- **Netlify**
- **AWS S3 + CloudFront**
- **Firebase Hosting**

#### Backend Deployment
- **Heroku** ⭐ (Recommended)
- **DigitalOcean App Platform**
- **AWS Elastic Beanstalk**
- **Google Cloud Run**

#### Database
- **Firebase Firestore** ✅ (Already configured)

## 📋 Pre-deployment Checklist

### Environment Variables
- [ ] Steam API key configured
- [ ] Firebase credentials set up
- [ ] Session secret generated
- [ ] CORS origins configured
- [ ] Production URLs updated

### Security
- [ ] API keys secured (not in source code)
- [ ] HTTPS configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error handling configured

### Performance
- [ ] Caching configured
- [ ] Database indexes created
- [ ] Static assets optimized
- [ ] Bundle size optimized

### Monitoring
- [ ] Error tracking configured
- [ ] Performance monitoring set up
- [ ] Logging configured
- [ ] Health checks implemented

## 🌐 Frontend Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Build and deploy:**
```bash
cd frontend
npm run build
vercel --prod
```

3. **Environment variables in Vercel:**
- Go to Vercel dashboard
- Select your project
- Go to Settings > Environment Variables
- Add all required variables:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_BASE_URL=https://your-backend-domain.com
```

### Netlify Deployment

1. **Build the project:**
```bash
cd frontend
npm run build
```

2. **Deploy to Netlify:**
- Connect GitHub repository
- Set build command: `npm run build`
- Set publish directory: `dist`
- Configure environment variables

### AWS S3 + CloudFront

1. **Build the project:**
```bash
cd frontend
npm run build
```

2. **Create S3 bucket:**
```bash
aws s3 mb s3://steamvault-frontend
```

3. **Configure bucket for static hosting:**
```bash
aws s3 website s3://steamvault-frontend \
  --index-document index.html \
  --error-document index.html
```

4. **Upload files:**
```bash
aws s3 sync dist/ s3://steamvault-frontend --delete
```

5. **Create CloudFront distribution:**
- Origin: S3 bucket
- Default root object: index.html
- Custom error pages: 404 → /index.html

## 🖥️ Backend Deployment

### Heroku Deployment (Recommended)

1. **Install Heroku CLI:**
```bash
npm install -g heroku
```

2. **Login and create app:**
```bash
heroku login
heroku create steamvault-backend
```

3. **Configure environment variables:**
```bash
heroku config:set STEAM_API_KEY=your_key
heroku config:set FIREBASE_PROJECT_ID=your_project
heroku config:set SESSION_SECRET=your_secret
# ... add all other environment variables
```

4. **Deploy:**
```bash
cd backend
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

5. **Configure add-ons:**
```bash
# Optional: Redis for caching
heroku addons:create heroku-redis:hobby-dev

# Optional: Logging
heroku addons:create papertrail:choklad
```

### DigitalOcean App Platform

1. **Create app.yaml:**
```yaml
name: steamvault-backend
services:
- name: api
  source_dir: backend
  github:
    repo: your-username/Steam-Vault
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "8080"
  - key: STEAM_API_KEY
    value: your_key
    type: SECRET
  # ... add other environment variables
```

2. **Deploy:**
```bash
doctl apps create --spec app.yaml
```

### AWS Elastic Beanstalk

1. **Install EB CLI:**
```bash
pip install awsebcli
```

2. **Initialize application:**
```bash
cd backend
eb init steamvault-backend
```

3. **Create environment:**
```bash
eb create production
```

4. **Configure environment variables:**
```bash
eb setenv STEAM_API_KEY=your_key NODE_ENV=production
```

5. **Deploy:**
```bash
eb deploy
```

## 🔧 Production Configuration

### Environment Variables

#### Backend (.env)
```env
# Server Configuration
NODE_ENV=production
PORT=3000
BASE_URL=https://api.steamvault.com
FRONTEND_URL=https://steamvault.com

# Steam API
STEAM_API_KEY=your_production_steam_api_key
STEAM_APP_ID=730

# Firebase (Production)
FIREBASE_PROJECT_ID=steamvault-prod
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xyz@steamvault-prod.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Security
SESSION_SECRET=your_super_secure_session_secret_here
CORS_ORIGIN=https://steamvault.com

# Optional: Redis for caching
REDIS_URL=redis://your-redis-url:port

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn
```

#### Frontend (.env)
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_production_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=steamvault-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=steamvault-prod
VITE_FIREBASE_STORAGE_BUCKET=steamvault-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# API Configuration
VITE_API_BASE_URL=https://api.steamvault.com

# Analytics (Optional)
VITE_GA_TRACKING_ID=your_google_analytics_id
```

### Database Setup

#### Firebase Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Player statistics (public read)
    match /playerStats/{steamId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Match data (public read)
    match /matches/{matchId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // GSI data (authenticated write only)
    match /gsiData/{steamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

#### Create Database Indexes
```bash
cd backend
node scripts/createFirebaseIndexes.js
```

### SSL/HTTPS Configuration

#### Automatic SSL (Recommended)
Most deployment platforms provide automatic SSL:
- Vercel: Automatic SSL
- Netlify: Automatic SSL
- Heroku: Automatic SSL with custom domains

#### Manual SSL Configuration
For custom deployments, use Let's Encrypt:
```bash
# Install Certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d api.steamvault.com

# Configure nginx
sudo nano /etc/nginx/sites-available/steamvault
```

Nginx configuration:
```nginx
server {
    listen 443 ssl;
    server_name api.steamvault.com;
    
    ssl_certificate /etc/letsencrypt/live/api.steamvault.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.steamvault.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔍 Monitoring & Logging

### Error Tracking with Sentry

1. **Install Sentry:**
```bash
npm install @sentry/node @sentry/express
```

2. **Configure Sentry (backend):**
```javascript
// backend/index.js
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Error handling middleware
app.use(Sentry.Handlers.errorHandler());
```

3. **Configure Sentry (frontend):**
```javascript
// frontend/src/main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
```

### Performance Monitoring

#### Application Performance
```javascript
// Simple performance monitoring
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${duration}ms`);
  });
  next();
});
```

#### Database Performance
Monitor Firebase performance in Firebase Console:
- Query performance
- Read/write operations
- Storage usage
- Network requests

### Health Checks

#### Backend Health Check
```javascript
// backend/routes/health.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

#### Frontend Health Check
```javascript
// Check API connectivity
const healthCheck = async () => {
  try {
    const response = await fetch('/api/health');
    return response.ok;
  } catch (error) {
    return false;
  }
};
```

## 🚦 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd backend && npm install
        cd ../frontend && npm install
    
    - name: Run tests
      run: |
        cd backend && npm test
        cd ../frontend && npm test

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        working-directory: ./frontend

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
        heroku_app_name: "steamvault-backend"
        heroku_email: "your-email@example.com"
        appdir: "backend"
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] **HTTPS only**: Force HTTPS redirects
- [ ] **Secure headers**: Use Helmet.js
- [ ] **CORS configuration**: Restrict origins
- [ ] **Rate limiting**: Implement aggressive rate limiting
- [ ] **Input validation**: Validate all inputs
- [ ] **SQL injection prevention**: Use parameterized queries
- [ ] **XSS prevention**: Sanitize user inputs
- [ ] **CSRF protection**: Implement CSRF tokens
- [ ] **Dependency scanning**: Regular security audits

### Security Headers
```javascript
// backend/index.js
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## 📊 Performance Optimization

### Backend Optimization
- Enable gzip compression
- Implement Redis caching
- Optimize database queries
- Use connection pooling
- Enable CDN for static assets

### Frontend Optimization
- Code splitting
- Lazy loading
- Image optimization
- Bundle analysis
- Service worker caching

### Database Optimization
- Create proper indexes
- Optimize query patterns
- Implement data pagination
- Use efficient data structures
- Monitor query performance

## 🔄 Maintenance

### Regular Tasks
- [ ] Update dependencies monthly
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Review security logs
- [ ] Backup database regularly
- [ ] Update SSL certificates
- [ ] Monitor disk space
- [ ] Check API rate limits

### Backup Strategy
```bash
# Automated Firebase backup
gcloud firestore export gs://steamvault-backups/$(date +%Y%m%d)
```

### Scaling Considerations
- **Horizontal scaling**: Multiple backend instances
- **Load balancing**: Distribute traffic
- **CDN**: Global content delivery
- **Database sharding**: Distribute data
- **Caching layers**: Redis/Memcached

---

**Deployment guide for Steam Vault production environments**
