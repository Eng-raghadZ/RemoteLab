# Remote Lab Project - Full Project Structure

## 📋 Project Overview

This is a full-stack **MERN** application (MongoDB, Express, React, Node.js) designed for managing and controlling a remote laboratory environment. The system enables users to upload assembly files, submit jobs, and monitor their execution in real-time through WebSocket connections.

---

## 🏗️ Root Level Structure

```
project/
├── backend/              # Node.js/Express server
├── frontend/             # React application with Vite
├── .gitignore
└── [other git files]
```

---

## 🔙 BACKEND ARCHITECTURE

### Directory: `backend/`

```
backend/
├── package.json          # Backend dependencies
├── README.md             # Project documentation
├── READMEPhase1,2,3.md   # Phase-specific documentation
│
├── src/                  # Main application code
│   ├── server.js         # Express server entry point
│   │
│   ├── config/           # Configuration files
│   │   ├── constants.js       # Global constants and environment variables
│   │   └── firebaseAdmin.js   # Firebase Admin SDK initialization
│   │
│   ├── controllers/      # Business logic layer
│   │   └── jobs.controller.js
│   │       ├── getJobStatus()      # Fetch job details
│   │       ├── submitJob()         # Create new job
│   │       ├── updateJobStatus()   # Update job state
│   │       └── deleteJob()         # Remove job
│   │
│   ├── middleware/       # Express middleware
│   │   ├── authMiddleware.js   # JWT/Firebase authentication verification
│   │   └── errorHandler.js     # Global error handling
│   │
│   ├── models/          # Database schemas
│   │   └── jobModel.js  # Job schema (Job ID, status, results, etc.)
│   │
│   ├── routes/          # API endpoints
│   │   └── jobs.routes.js
│   │       ├── POST /api/jobs           # Submit job
│   │       ├── GET /api/jobs/:id        # Get job status
│   │       ├── PUT /api/jobs/:id        # Update job
│   │       └── DELETE /api/jobs/:id     # Delete job
│   │
│   ├── utils/           # Utility functions
│   │   ├── serializeJob.js     # Convert job data for responses
│   │   ├── storage.js          # File storage management (S3, Firebase Storage, etc.)
│   │   └── validateAsmFile.js  # Validate assembly file format
│   │
│   └── websocket/       # Real-time communication
│       ├── wsServer.js      # WebSocket server initialization
│       ├── clientHub.js     # Client connection manager
│       ├── agentHub.js      # Lab agent connection manager
│       └── protocol.js      # WebSocket message protocol definition
│
└── lab-agent/           # Lab Agent Module (Camera/Hardware Control)
    ├── package.json
    ├── README.md
    │
    └── src/
        ├── index.js           # Lab agent entry point
        ├── wsClient.js        # WebSocket client connection
        ├── cameraCapture.js   # Camera image capture logic
        ├── pngEncoder.js      # PNG encoding/compression
        ├── trainerKit.js      # Trainer/Hardware kit interface
        └── protocol.js        # Communication protocol handling
```

### Backend Key Responsibilities:

| Component      | Purpose                                                |
| -------------- | ------------------------------------------------------ |
| `server.js`    | Initialize Express app, set up routes, start WebSocket |
| `controllers/` | Business logic (create, read, update, delete jobs)     |
| `middleware/`  | Authentication, error handling                         |
| `websocket/`   | Real-time communication with agents and clients        |
| `lab-agent/`   | Capture images, execute hardware commands              |

---

## 🖥️ FRONTEND ARCHITECTURE

### Directory: `frontend/`

```
frontend/
├── package.json          # Frontend dependencies
├── vite.config.js        # Vite build configuration
├── vitest.config.js      # Vitest test runner config
├── vitest.setup.js       # Test environment setup
├── firebase.json         # Firebase hosting config
├── firestore.rules       # Firestore security rules
├── index.html            # HTML entry point
├── README-FIREBASE.md    # Firebase setup guide
├── README-UPLOAD-PAGE.md # Upload page documentation
│
├── public/               # Static assets
│   └── README.txt
│
├── scripts/              # Utility scripts
│   ├── package.json
│   ├── seedUsers.js              # Populate test users in Firestore
│   └── serviceAccountKey.json    # Firebase service account key
│
└── src/                  # React application source
    ├── main.jsx          # Application entry point
    ├── App.jsx           # Root component
    │
    ├── components/       # Reusable React components
    │   ├── ProtectedRoute.jsx    # Route guards for authenticated users
    │   │
    │   ├── layout/
    │   │   └── PageShell.jsx     # Common page layout wrapper
    │   │
    │   └── upload/
    │       ├── UploadZone.jsx        # Drag-and-drop file upload area
    │       ├── UploadCard.jsx        # File selection UI card
    │       ├── UploadCard.error.test.jsx
    │       ├── UploadCard.smoke.test.jsx
    │       ├── UploadProgress.jsx    # Upload progress bar
    │       └── UploadSuccess.jsx     # Success confirmation screen
    │
    ├── context/          # React Context API
    │   ├── AuthContext.jsx       # Authentication state management
    │   └── ThemeContext.jsx      # Dark/Light mode state
    │
    ├── firebase/         # Firebase integration
    │   ├── firebase.js        # Firebase app initialization
    │   ├── auth.js            # Auth functions (login, logout, signup)
    │   └── firestore.js       # Firestore database queries
    │
    ├── hooks/            # Custom React hooks
    │   └── useAssemblyUpload.js  # Handle file upload logic
    │
    ├── pages/            # Full page components
    │   ├── RemoteLabLanding.jsx      # Home/landing page
    │   ├── UploadPage.jsx            # File upload page
    │   ├── UploadPage.smoke.test.jsx # Upload page tests
    │   ├── Dashboard.jsx             # User dashboard
    │   ├── JobStatusPage.jsx         # Job details and status tracking
    │   └── JobStatusPage.test.jsx    # Job status page tests
    │
    └── services/         # API service layer
        ├── uploadService.js        # Handle file upload to server
        ├── uploadService.test.js   # Upload service tests
        ├── jobService.js           # Job CRUD operations
        └── jobService.test.js      # Job service tests
```

### Frontend Key Components:

| Component     | Purpose                                          |
| ------------- | ------------------------------------------------ |
| `pages/`      | Full-page views (Login, Upload, Dashboard, etc.) |
| `components/` | Reusable UI components (buttons, forms, cards)   |
| `services/`   | API calls and data fetching                      |
| `context/`    | Global state (auth, theme)                       |
| `hooks/`      | Custom logic for file uploads, auth checks       |
| `firebase/`   | Firebase SDK integration                         |

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER BROWSER                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           React Frontend (Vite)                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  UploadPage → UploadCard → UploadZone       │    │   │
│  │  │  ↓                                           │    │   │
│  │  │  useAssemblyUpload hook                     │    │   │
│  │  │  ↓                                           │    │   │
│  │  │  uploadService.js (API call)                │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │           ↓ HTTP/REST + WebSocket                    │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │     Firebase Auth + Firestore               │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓ (REST API + WebSocket)
┌──────────────────────────────────────────────────────────────┐
│           Express Backend (Node.js)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  routes/jobs.routes.js                              │   │
│  │  ↓                                                   │   │
│  │  middleware/ (auth checks)                          │   │
│  │  ↓                                                   │   │
│  │  controllers/jobs.controller.js                     │   │
│  │  ↓                                                   │   │
│  │  models/jobModel.js (DB operations)                 │   │
│  │  ↓                                                   │   │
│  │  websocket/wsServer.js (Real-time updates)          │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                              ↓                   │
│  ┌────────────────────────┐  ┌──────────────────────────┐   │
│  │   Firebase Database    │  │  Lab Agent Connection    │   │
│  │   (Job Storage)        │  │  (WebSocket)             │   │
│  └────────────────────────┘  └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│           Lab Agent (Node.js Process)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  lab-agent/index.js                                 │   │
│  │  ↓                                                   │   │
│  │  wsClient.js (Connect to backend)                   │   │
│  │  ↓                                                   │   │
│  │  Receive command → cameraCapture.js                 │   │
│  │  ↓                                                   │   │
│  │  pngEncoder.js (Encode image)                       │   │
│  │  ↓                                                   │   │
│  │  trainerKit.js (Hardware execution)                 │   │
│  │  ↓                                                   │   │
│  │  Send results back via WebSocket                    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 Key Features & Flow

### 1. **Authentication Flow**

- User logs in via Firebase Auth
- Frontend stores JWT token
- Backend verifies token in `authMiddleware.js`
- Requests are authenticated using `AuthContext.jsx`

### 2. **File Upload Flow**

- User drags/drops file on `UploadZone.jsx`
- `useAssemblyUpload.js` validates file
- `uploadService.js` sends to backend
- Backend stores in Firebase Storage via `storage.js`
- Returns job ID to user

### 3. **Job Tracking Flow**

- `JobStatusPage.jsx` displays job details
- `jobService.js` fetches status from API
- Backend queries database via `jobModel.js`
- WebSocket sends real-time updates to frontend

### 4. **Lab Agent Execution Flow**

- Backend sends command via WebSocket to Lab Agent
- Lab Agent captures image via `cameraCapture.js`
- Encodes as PNG via `pngEncoder.js`
- Executes on hardware via `trainerKit.js`
- Sends results back to backend

---

## 🗂️ File Organization Principles

### Backend:

- **routes/** → URL endpoints
- **controllers/** → Business logic
- **models/** → Database schemas
- **middleware/** → Interceptors
- **utils/** → Helper functions
- **websocket/** → Real-time communication

### Frontend:

- **pages/** → Full page views
- **components/** → Reusable UI pieces
- **services/** → API calls
- **hooks/** → Custom logic
- **context/** → Global state
- **firebase/** → External service integration

---

## 📦 Testing Structure

### Backend:

- Tests typically in same directory with `.test.js` suffix
- Uses Jest or similar framework

### Frontend:

- Unit tests: `uploadService.test.js`, `jobService.test.js`
- Component tests: `UploadCard.error.test.jsx`, `UploadCard.smoke.test.jsx`
- Page tests: `JobStatusPage.test.jsx`, `UploadPage.smoke.test.jsx`
- Test runner: Vitest with configuration in `vitest.config.js`

---

## 🚀 Startup Sequence

### Backend:

```bash
cd backend
npm install
node src/server.js
```

- Starts Express server on configured port
- Initializes WebSocket connections
- Sets up routes and middleware

### Lab Agent:

```bash
cd backend/lab-agent
npm install
node src/index.js
```

- Connects to backend via WebSocket
- Waits for commands

### Frontend:

```bash
cd frontend
npm install
npm run dev
```

- Vite dev server starts
- Hot module replacement enabled

---

## 📝 Important Configuration Files

| File                              | Purpose                                        |
| --------------------------------- | ---------------------------------------------- |
| `backend/src/config/constants.js` | Environment variables, API URLs                |
| `frontend/vite.config.js`         | Build configuration (dev server, optimization) |
| `frontend/vitest.config.js`       | Test framework setup                           |
| `frontend/firebase.json`          | Firebase hosting rules                         |
| `backend/lab-agent/package.json`  | Lab agent dependencies                         |

---

## 🔐 Security Features

- ✅ JWT authentication via Firebase Auth
- ✅ Protected routes using `ProtectedRoute.jsx`
- ✅ Middleware-based authorization checks
- ✅ Firestore security rules in `firestore.rules`
- ✅ File validation in `validateAsmFile.js`
- ✅ Error handling middleware for security

---

## 📊 Summary Table

| Layer                 | Technology       | Key Files                        |
| --------------------- | ---------------- | -------------------------------- |
| **Frontend UI**       | React + Vite     | `src/pages/`, `src/components/`  |
| **Frontend State**    | Context API      | `src/context/`                   |
| **Frontend Services** | API layer        | `src/services/`, `src/firebase/` |
| **Backend Server**    | Express.js       | `src/server.js`, `src/routes/`   |
| **Backend Logic**     | Controllers      | `src/controllers/`               |
| **Database**          | Firebase/MongoDB | `src/models/`                    |
| **Real-time**         | WebSocket        | `src/websocket/`                 |
| **Lab Agent**         | Node.js          | `lab-agent/src/`                 |

---

This structure enables separation of concerns, scalability, and maintainability across the full application stack.

**Last Updated:** 2026-07-12
