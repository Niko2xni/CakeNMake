### 1. High-Level Architecture
*   **Architecture Pattern:** Decoupled client-server (SPA + REST API) with asynchronous background processing.
*   **Primary Objective:** A comprehensive bakery and 3D cake design platform. It facilitates interactive 3D cake customization for clients, bakery operations management (reservations, billing, chat), and platform-wide administration.

### 2. Technology Stack

| Category | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Three.js (3D rendering), React Query, Radix UI, Stripe React |
| **Backend** | Node.js, Express 5, BullMQ (Task Queue), Puppeteer, Paymongo, Cloudinary, JWT, bcryptjs |
| **Database** | MongoDB (Mongoose ORM), Redis (ioredis) |
| **Infrastructure/Tooling** | Vitest (Testing), ESLint, Nodemon, Vite Plugin (@base44) |

### 3. System Entry Points
*   **Frontend Execution:** `client/index.html` serves as the document root, loading `client/src/main.jsx`, which initializes the React tree and mounts `client/src/App.jsx`.
*   **Frontend Routing:** Client-side routing (`react-router-dom`) handles navigation across distinct domains: Platform Admin, Bakery Admin, and Client interfaces.
*   **Backend Execution:** `server/src/server.js` acts as the entry point to bind the port and start the server, importing the core Express application logic from `server/src/app.js`.
*   **Background Processing:** `server/src/workers/blueprintWorker.js` manages asynchronous task execution, consuming jobs from the BullMQ/Redis queue.

### 4. Data Flow & Models
*   **Data Flow:** The React frontend executes REST API requests (`client/src/services/api.js`) against the Node/Express backend. The backend applies business logic, interfaces with MongoDB via Mongoose, and delegates resource-intensive tasks (e.g., Puppeteer PDF generation or image processing) to the Redis-backed BullMQ worker.
*   **State Management:** Asynchronous server state and caching are handled by React Query (`client/src/lib/query-client.js`). Global application state, specifically authentication, is managed via React Context (`client/src/lib/AuthContext.jsx`).
*   **Database ORMs/Schemas:** Mongoose dictates the MongoDB schema. Primary entities (`server/src/models/`) include:
    *   `Design.js` (Cake configurations)
    *   `Reservation.js` (Orders/Bookings)
    *   `PricingPreset.js` & `PricingChangeLog.js` (Cost calculation models)
    *   `Platform.js` (System metadata)

### 5. Local Environment Setup
Executing the environment requires running a local MongoDB server and a Redis instance.

```bash
# 1. Backend Setup & Execution
cd server
npm install
# Populate server/.env with MONGO_URI, JWT_SECRET, and CLOUDINARY keys
# Note: Redis connection variables and Payment Gateway keys must be added to .env
npm run dev

# 2. Frontend Setup & Execution
cd client
npm install
npm run dev

# 3. Test Execution (Frontend)
cd client
npm run test
```

### 6. Feasibility & Risk Critique
*   **Hardware/Software Bottlenecks:**
    *   **Client-Side Rendering:** The heavy reliance on `three.js` (`SpongeCake3D.jsx`) poses a significant performance and battery drain risk for low-tier mobile devices.
    *   **Server-Side Processing:** The inclusion of `puppeteer` introduces a high risk of CPU and memory bottlenecking. If worker concurrency (`blueprintWorker.js`) is improperly tuned, parallel headless browser instances will exhaust server resources.
*   **Missing Critical Configurations:**
    *   **Infrastructure as Code (IaC):** The absence of a `docker-compose.yml` makes the local orchestration of MongoDB and Redis manual, increasing onboarding friction and environmental discrepancies.
    *   **CI/CD Pipeline:** No `.github/workflows` or equivalent CI/CD configuration files are present to enforce automated testing, linting, or deployment.
    *   **Incomplete Environment Variables:** The provided `server/.env` template lacks required configuration keys for Redis (`ioredis`), Stripe, and Paymongo integrations.
*   **Single Points of Failure:** The architecture relies on Redis for background job queuing (`BullMQ`). Without a highly available Redis setup or fallback mechanism, failure of the Redis instance will halt all asynchronous processing (e.g., blueprint generation).