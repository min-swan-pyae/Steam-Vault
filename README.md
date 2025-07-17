# SteamVault

A comprehensive analytics platform for Dota 2 and CS2 players with marketplace monitoring and community features.

## Features

- **Dota 2 Analytics Dashboard**
  - Match history analysis
  - Hero performance statistics
  - Playtime trends
  - Player behavior metrics

- **CS2 Analytics Dashboard**
  - Map performance analysis
  - Weapon statistics
  - Playstyle evaluation
  - Match history tracking

- **Marketplace Monitoring**
  - Real-time price tracking
  - Price alerts
  - Market trend analysis
  - Item watchlist

- **Community Forum**
  - Game discussions
  - Market insights sharing
  - User profiles
  - Moderation tools

## Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: Firebase
- **Authentication**: Steam OpenID + Firebase Auth
- **API**: Steam Web API, OpenDota API

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account
- Steam Web API key

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/min-swan-pyae/Steam-Vault.git
cd Steam-Vault
```

2. Install dependencies:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Configure environment variables:
- Create `.env` files in both frontend and backend directories
- Add necessary API keys and configuration values

4. Start development servers:
```bash
# Start frontend (from frontend directory)
npm run dev

# Start backend (from backend directory)
npm run dev
```

## Project Structure

```
steamvault/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service calls
│   │   └── utils/       # Utility functions
│   └── public/          # Static assets
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── controllers/ # Route controllers
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utility functions
│   └── config/          # Configuration files
└── docs/                # Documentation 
