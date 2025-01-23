Google Calendar Events Web Application
Prerequisites

Node.js (v20+)
npm (v8+)

Setup

Backend

Get into backend directory

```bash
cd backend
```
Install dependecies

```bash
npm install
```
Start Server

```bash
node index.js
```
Frontend

Get into frontend directory

```bash
cd frontend
```

Install dependecies

```bash
npm install
```

Start Server

```bash
npm run dev
```
Create .env file in backend:
```bash
CopyGOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=http://localhost:3000
```
Setup

Frontend

Get into frontend directory

```bash
cd frontend
```

Install dependecies

```bash
npm install
```

Start Server

```bash
npm run dev
```

Google SSO Authentication
Fetch Google Calendar events
Event filtering by date