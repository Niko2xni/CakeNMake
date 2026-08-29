# CakeNMake — 3D Custom Cake Design & Bakery Operations Platform

> An end-to-end web platform featuring interactive 3D cake design, multi-tenant bakery management, real-time pricing calculation, reservation tracking, and asynchronous blueprint PDF generation.

---

## 📌 Project Overview

**CakeNMake** is a capstone web application designed to bridge the gap between clients wanting custom cakes and bakeries managing custom cake orders. 

The platform allows clients to visually customize 3D cake models in real time—adjusting tiers, sponge flavors, exterior finishes (including procedural Lambeth piping), toppings, colors, and dimensions—while automatically computing pricing based on bakery-defined preset rules. 

Bakeries use dedicated administration dashboards to manage incoming custom reservations, adjust pricing structures, track order progress, and generate printable cake assembly blueprints.

---

## ✨ Key Features

### 🎨 1. Interactive 3D Cake Designer (`Three.js`)
* **Parametric Cake Geometry**: Real-time rendering of multi-tiered cakes with configurable radius, height, tier count, and shape.
* **Sponge & Exterior Finishes**: Supports naked/unfrosted, smooth fondant/buttercream, and procedural Victorian Lambeth piping (swag drapes, pearl rosettes, teardrops, and Fleur-de-lis motifs).
* **Drag-and-Drop / Layer Customization**: Color picker for icing, sponge layers, decorations, and custom toppers.
* **Real-time Price Estimation**: Instant price recalculation as tiers, decorations, or dimensions change.

### 👥 2. Multi-Role User Portals
* **Client Portal**: Browse bakery catalogs, save/load custom 3D cake designs, request reservations, view order status, and complete payments via Stripe or PayMongo.
* **Bakery Admin Portal**: Manage incoming custom cake requests, approve or modify orders, maintain pricing presets (`PricingPreset`), log pricing adjustments, and communicate with clients.
* **Platform Admin Portal**: Manage multi-bakery listings, platform-wide metadata, system settings, and global analytics.

### ⚙️ 3. Asynchronous Blueprint & Receipt Engine
* **BullMQ + Redis Task Queue**: Offloads resource-intensive PDF and image rendering tasks to a background worker process.
* **Puppeteer PDF Generation**: Generates high-resolution cake blueprint cards and order receipts asynchronously without blocking the main Express API server.

---

## 🛠️ Technology Stack

| Domain | Tech Stack |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite |
| **3D Graphics & Styling** | Three.js (r128+), OrbitControls, Tailwind CSS, Lucide React, Framer Motion, Radix UI |
| **State & API Management** | React Query (`@tanstack/react-query`), React Router DOM (v6), Axios / Fetch API |
| **Backend Framework** | Node.js, Express.js (v5) |
| **Database & Caching** | MongoDB (via Mongoose ORM), Redis (via `ioredis`) |
| **Async Task Queue** | BullMQ |
| **Media & PDF Processing** | Cloudinary API, Puppeteer (Headless Browser), jsPDF, html2canvas |
| **Authentication & Security** | JSON Web Tokens (JWT), bcryptjs, CORS |
| **Payments** | Stripe (`@stripe/stripe-js`), PayMongo (`paymongo-node`) |
| **Testing & Tooling** | Vitest, ESLint, Nodemon, TypeScript (Typechecking via `jsconfig.json`) |

---

## 🗄️ Database Models (`server/src/models/`)

1. **`Design.js`**: Stores 3D cake configuration JSON (tier counts, dimensions, colors, sponge finish, decorations, total calculated cost).
2. **`Reservation.js`**: Tracks client bookings, custom design reference, fulfillment date, status (`pending`, `approved`, `in_progress`, `completed`, `cancelled`), and payment state.
3. **`PricingPreset.js`**: Base costs for tiers, cake sizes, sponge types, frosting finishes, and decoration add-ons configured by bakery admins.
4. **`PricingChangeLog.js`**: Historical audit log of modifications made to pricing presets.
5. **`Platform.js`**: System settings and global metadata.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: `v18.x` or higher
* **MongoDB**: Local instance running on `mongodb://localhost:27017` or MongoDB Atlas URI
* **Redis**: Running instance on `localhost:6379` (required for BullMQ queue)

---

### 1. Frontend Setup

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The client application runs at `http://localhost:5173`.

---

### 2. Available Scripts

#### Client (`/client`)
* `npm run dev`: Launch Vite dev server.
* `npm run build`: Build production web bundle.
* `npm run typecheck`: Run TypeScript type-checking against `jsconfig.json`.
* `npm run lint`: Run ESLint checks.
* `npm run test`: Run unit tests with Vitest.

#### Server (`/server`)
* `npm run dev`: Launch backend server using Nodemon.
* `npm start`: Start server in production mode.

---

## 📄 License

This repository is developed as a capstone project for **CakeNMake**. All rights reserved.
