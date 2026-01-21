# Steam Vault

Steam Vault is a full-stack analytics platform for Counter-Strike 2 (CS2) and Dota 2 players. It blends real-time Game State Integration (GSI), historical statistics, marketplace tracking, and community tooling into a single experience powered by a React 19 frontend and an Express/Firebase backend.

## Highlights
- CS2 dashboards with live GSI feeds, weapon insights, and map analytics
- Dota 2 hero trends, match history
- Steam marketplace search, watchlists, and price alert notifications
- Community forums with moderation workflows, bulk actions, and audit history
- Multi-channel notification system (in-app + Gmail) with SSE updates

## Tech Stack
**Frontend**: React 19, Vite, Tailwind CSS, Redux Toolkit, TanStack Query, Recharts, Framer Motion

**Backend**: Node.js, Express 5, Firebase Admin SDK, Passport (Steam OAuth), Nodemailer/Gmail API, NodeCache

**Data & Integrations**: Firebase Firestore, Steam Web API, OpenDota API, Gmail, Server-Sent Events, multi-layer caching and retry utilities


## Prerequisites
- Node.js 18+ and npm
- Steam Web API key
- Firebase project with Firestore enabled
- Gmail account (optional, for outbound notifications)

## Installation

1. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
2. **Configure Firebase**
   - Create a Firebase project + Firestore DB
   - Generate a service account key for the backend
   - Review `firebase.json`, `firestore.rules`, and `firestore.indexes.json`
4. **Request external credentials**
   - Steam Web API key: https://steamcommunity.com/dev/apikey
   - Gmail OAuth/app password (if email alerts are required)

## Environment Variables

Create `.env` files in `backend/` and `frontend/`. 

### backend/.env
```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=replace_me

STEAM_API_KEY=your_steam_api_key

FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=service-account@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

GMAIL_USER=yourgmail@gmail.com
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_APP_PASSWORD=...

# Optional public URLs for production deployments
# FRONTEND_URL=https://your-frontend.app
# BACKEND_PUBLIC_URL=https://your-backend.app
```

### frontend/.env
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

VITE_API_BASE_URL=http://localhost:3000
# Override with your production API URL when deploying
```


## Running the Project

### Manual workflow
Use two terminals from the repository root:
```bash
# Terminal 1 - API
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```
Backend listens on `http://localhost:3000`, frontend on `http://localhost:5173` by default.

### VS Code tasks
Instead of manual commands you can trigger the bundled tasks (Terminal → Run Task):
- `Start Backend Dev Server`
- `Start Frontend Dev Server`
- `Start Both Servers`

### First-time checklist
1. Sign in with Steam (OAuth flow handled by backend)
2. Visit the CS2 and Dota dashboards to ensure API keys are correct
3. Create a marketplace watchlist item to validate Firestore writes
4. (Optional) Enable Gmail + SSE notifications to test live alerts

### Optional: CS2 Game State Integration
Copy a `gamestate_integration_steamvault.cfg` file into your CS2 config directory pointing to `http://localhost:3000/api/cs2/gsi/<steamId>`. Sample payloads live in `backend/mock/` to assist with testing without a running game.

## Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd ../frontend
npm test
```

## Deployment (summary)
1. Build the frontend: `cd frontend && npm run build` (outputs to `dist/`)
2. Configure production env vars for both services
3. Deploy the backend (Heroku, Render, Cloud Run, etc.) and serve the `dist/` assets via your preferred static host (Vercel, Netlify, Firebase Hosting, ...)
4. Update Steam OAuth return URLs and Gmail credentials to match the deployed domains


## License
Released under the MIT License. See `LICENSE` for details.

## Contact
Built by Min Swan Pyae. For questions, open an issue or reference the documentation above.


