<div align="center">

# 🏥 QueueCure

### *Eliminating Paper Tokens, One Queue at a Time*

**A real-time, live-synced digital queue management system for neighbourhood clinics — built to replace the chaos of paper token slips with intelligent, data-driven patient flow.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socketdotio&logoColor=white)](https://socket.io)

</div>

---

## 📌 The Problem

> **76% of India's 1.5 million clinics** run on paper token slips and shouting. Patients wait 2–3 hours with zero visibility. Doctors have no dashboard. Receptionists manage everything from memory.

### QueueCure answers three questions:

1. ✅ Can a receptionist add a patient and assign a token **in under 10 seconds**?
2. ✅ Does the patient-facing screen update **live — without refreshing** the page?
3. ✅ Is the estimated wait time **computed from real data** — not a hardcoded guess?

---

## 🎬 The "I Want This" Moment

> A patient walks in. The receptionist types their name, selects a doctor, clicks **Generate Token**. Instantly — the TV in the waiting room updates. The patient's phone buzzes with an email: *"You are #7, estimated wait: 23 minutes with Dr. Smith"* — computed live from the actual consult times of every patient ahead of them. When the doctor clicks **Call Next**, both screens flip simultaneously. No paper. No shouting. No chaos.

---

## 🏗️ Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | React 19 + Vite 8 | Blazing fast HMR, latest concurrent features |
| **Styling** | Vanilla CSS | Full control over design system, no framework bloat |
| **Routing** | React Router v7 | File-based mental model, nested layouts |
| **Real-time** | Socket.IO 4.7 | Bidirectional WebSocket with automatic fallback to polling |
| **Backend** | Express.js 4 | Battle-tested, minimal overhead API layer |
| **Database** | MongoDB Atlas (Mongoose 8) | Flexible schema, cloud-hosted, compound indexes |
| **Auth** | JWT + bcrypt | Stateless authentication with role-based access control |
| **Email** | Nodemailer (Gmail SMTP) | Registration confirmations + "your turn is approaching" alerts |

---

## 📐 Architecture

### System Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Reception   │     │   Doctor     │     │   Display    │
│   Screen     │     │  Dashboard   │     │   (TV/Phone) │
│  (Add pts)   │     │  (Call/Skip) │     │  (Public)    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │         ┌──────────┴──────────┐         │
       └─────────┤  Socket.IO Server   ├─────────┘
                 │  (Bidirectional)     │
                 └──────────┬──────────┘
                            │
                 ┌──────────┴──────────┐
                 │  Express.js API     │
                 │  (REST + JWT Auth)  │
                 └──────────┬──────────┘
                            │
                 ┌──────────┴──────────┐
                 │  MongoDB Atlas      │
                 │  (Tokens, Doctors,  │
                 │   Users)            │
                 └─────────────────────┘
```

### Application Screens

| Screen | Route | Access | Purpose |
|--------|-------|--------|---------|
| **Login** | `/login` | Public | JWT authentication for staff |
| **Public Join** | `/join` | Public | Self-registration portal for patients |
| **Reception** | `/` | Admin, Receptionist | Add patients, view all doctor queues |
| **Doctor Dashboard** | `/doctor` | Doctor only | Manage own queue: call, complete, skip |
| **Public Display** | `/display` | Public (no auth) | Waiting room TV — live token display |
| **Admin Panel** | `/admin/*` | Admin only | Manage staff, doctors, view reports |

---

## 🔄 Socket.IO Event Flow

Every user action that changes queue state triggers a real-time broadcast. Here's the complete event map:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOCKET.IO EVENT FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RECEPTION (Add Patient)                                        │
│  ──────────────────────                                         │
│  POST /api/patients ──► Server ──► emit('patient:added')        │
│                                ──► emit('queue:update')         │
│                                                                 │
│  DOCTOR (Call Next / Call Specific)                              │
│  ─────────────────────────────────                              │
│  POST /api/queue/:id/next  ──► Server ──► emit('queue:update')  │
│  POST /api/queue/:id/call/:tokenId ──► emit('queue:update')     │
│                                                                 │
│  DOCTOR (Complete Patient)                                      │
│  ─────────────────────────                                      │
│  POST /api/queue/:id/complete ──► Server ──► emit('queue:update')│
│                                                                 │
│  DOCTOR (Skip Patient)                                          │
│  ─────────────────────                                          │
│  POST /api/queue/:id/skip ──► Server ──► emit('queue:update')   │
│                                                                 │
│  NURSE (Adjust Consult Time)                                    │
│  ───────────────────────────                                    │
│  PATCH /api/queue/estimate/:tokenId ──► emit('estimate:update') │
│                                                                 │
│  RECEPTION (Cancel Patient)                                     │
│  ──────────────────────────                                     │
│  POST /api/queue/:id/cancel/:tokenId ──► emit('queue:update')   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  LISTENERS (All Screens)                                        │
│  ───────────────────────                                        │
│  Reception ──► queue:update, estimate:update                    │
│  Doctor    ──► queue:update, estimate:update                    │
│  Display   ──► queue:update, estimate:update, patient:added,    │
│                doctor:update                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Patient Lifecycle Flowchart

```
                    ┌──────────────┐
                    │   Patient    │
                    │  Walks In    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Receptionist │
                    │  Adds to     │──── Email sent with
                    │  Queue       │     token # + wait time
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   WAITING    │◄──── Priority patients
                    │   (Queue)    │      bubble to top
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐    │     ┌──────▼──────┐
       │   Doctor     │    │     │  2nd in     │
       │  Clicks      │    │     │  queue?     │
       │  "Call Next" │    │     │  Email sent │
       └──────┬───────┘    │     └─────────────┘
              │            │
       ┌──────▼───────┐    │
       │   SERVING    │    │
       │  (In Room)   │    │
       └──────┬───────┘    │
              │            │
     ┌────────┼────────┐   │
     │                 │   │
┌────▼─────┐    ┌──────▼───▼──┐
│ COMPLETE │    │    SKIP     │
│ (Done)   │    │ (Re-queue   │
└──────────┘    │  at top,    │
                │  call next) │
                └─────────────┘
```

---

## ⏱️ Wait Time — Computed, Not Guessed

This is the core differentiator. The estimated wait time is **never hardcoded**. It is dynamically computed from real queue data using a cumulative summation algorithm:

```javascript
// backend/routes/queue.js — getDoctorQueueStatus()
let cumulativeWait = serving ? serving.estimatedTimeMins : 0;

const waitingWithTimes = waiting.map((token) => {
  const obj = token.toObject();
  obj.estimatedWaitMins = cumulativeWait;        // YOUR wait = sum of everyone before you
  cumulativeWait += token.estimatedTimeMins;      // Add YOUR consult time for the next person
  return obj;
});
```

**How it works:**
- Each patient has an `estimatedTimeMins` (default 10 min, adjustable by nurse in real-time via ±5m buttons)
- Patient #1's wait = currently serving patient's remaining consult time
- Patient #2's wait = Patient #1's wait + Patient #1's consult time
- Patient #N's wait = sum of all consult times of patients #1 through #N-1, plus the currently serving patient

**This means:**
- When the nurse clicks `+5m` on Patient #3, every patient behind them (#4, #5, ...) instantly sees their wait time increase by 5 minutes
- When a patient is completed, everyone's wait time drops automatically
- The Display page token calculator gives patients their real wait time at any moment

---

## 🚨 Edge Cases & Architectural Decisions

Building a queue system that works in a real clinic means handling every scenario that paper tokens never had to worry about. Here's every edge case we identified and how we solved it:

### 1. Doctor Breaks — Decoupled Actions
**Problem:** If completing one patient auto-calls the next, doctors get no break between patients.  
**Solution:** Complete/Skip only closes the current session. The doctor must explicitly press **"Call Next"** when physically ready.

### 2. Doctor Goes Inactive Mid-Queue
**Problem:** A doctor needs to leave but still has 5 patients waiting.  
**Solution:** `isActive` toggle prevents new patients from being assigned, but the doctor must drain their existing queue. The Display page shows inactive doctors only if they still have patients.

### 3. Token Number Collisions
**Problem:** Two receptionists adding patients simultaneously could generate the same token number.  
**Solution:** Global daily token numbering (not per-doctor) with a compound unique index `{ doctorId, date, tokenNumber }`. If a collision occurs, the database rejects it.

### 4. Role Segregation
**Problem:** A receptionist could accidentally advance a doctor's queue from the Reception screen.  
**Solution:** Strict role-based middleware. Only `doctor` role can call `next`, `complete`, `skip`. Receptionists handle intake only. The UI hides action buttons based on the screen context.

### 5. Priority Triage
**Problem:** Emergency patients need to jump the queue, but doctors need flexibility to choose who to see first among emergencies.  
**Solution:** `isPriority` flag sorts emergencies to the top of the waiting list. Among priority patients, the doctor can click any card to call them in — not forced into a rigid order.

### 6. Skip ≠ Remove
**Problem:** "Skip" could mean "this patient left" or "come back later."  
**Solution:** Our skip logic re-queues the patient at the top of the waiting list (behind any priority patients) and simultaneously calls the next waiting patient. The skipped patient isn't lost — they're just deferred.

### 7. Email Timing Strategy
**Problem:** Emailing all 20 patients immediately would crowd the waiting room hours early.  
**Solution:** Registration email goes out immediately with position + wait time. A **"your turn is approaching"** email fires only when a patient reaches the **2nd position** in the queue, giving them just enough time to return.

### 8. Browser Validation Bypass
**Problem:** Native HTML5 validation differs across browsers and can be bypassed.  
**Solution:** Disabled native validation (`noValidate`), built a custom React validation engine with animated error feedback, 10-digit phone regex, email format checking, and mandatory field enforcement.

### 9. Default Doctor State
**Problem:** Should a newly created doctor immediately be available?  
**Solution:** No. All doctors start as `isActive: false`. They must log in and manually toggle active when they arrive. Prevents phantom queues.

### 10. Concurrent Estimate Changes
**Problem:** A nurse on the Doctor Dashboard and someone on Reception both adjusting the same patient's estimate.  
**Solution:** Delta-based updates (`adjustment: +5` or `-5`) rather than absolute values, so concurrent changes accumulate correctly instead of overwriting each other.

### 11. Self-Registration Abuse (Rate Limiting)
**Problem:** A public `/join` page could be spammed by bots to flood the clinic queue.  
**Solution:** `express-rate-limit` middleware strictly caps public endpoints (like form submission and phone-lookup) to 30 requests per minute per IP address.

### 12. Active Patient Deduplication
**Problem:** A patient getting impatient and registering themselves again, generating multiple active tokens in the queue.  
**Solution:** Hardcoded database guards reject token creation if a patient already has a `waiting` or `serving` token for the same doctor on the current date, while silently updating their profile data.

### 13. Legacy BSON Sort Handling
**Problem:** New tokens with `isPriority: false` were magically jumping ahead of older tokens that had `isPriority` missing (undefined) due to MongoDB's sorting rules (`false > undefined`).  
**Solution:** Backfilled the database to strictly enforce `isPriority: false` on all documents, ensuring consistent multi-key sorting (`{ isPriority: -1, tokenNumber: 1 }`).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))
- **MongoDB Atlas** account ([free tier](https://www.mongodb.com/atlas)) or local MongoDB
- **Gmail account** with App Password for email notifications

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Queue_cure.git
cd Queue_cure
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/queuecure` |
| `JWT_SECRET` | Secret key for JWT token signing (use a long random string) | `my_super_secret_key_2026` |
| `ADMIN_EMAIL` | Email for the default admin account | `admin@queuecure.com` |
| `ADMIN_PASSWORD` | Password for the default admin account | `admin123` |
| `PORT` | Backend server port | `5000` |
| `FRONTEND_URL` | Frontend URL for CORS configuration | `http://localhost:5173` |
| `MAIL_USER` | Gmail address for sending notifications | `clinic@gmail.com` |
| `MAIL_PASS` | Gmail App Password (not your login password!) | `abcd efgh ijkl mnop` |

> **💡 Gmail App Password:** Go to [Google Account](https://myaccount.google.com) → Security → 2-Step Verification → App Passwords → Generate one for "Mail".

### 3. Install Dependencies & Seed Database

```bash
# Backend
cd backend
npm install
npm run seed        # Creates the default admin user

# Frontend (new terminal)
cd ../frontend
npm install
```

### 4. Start the Application

```bash
# Terminal 1 — Backend (from /backend)
npm start           # or: npm run dev (with hot reload)

# Terminal 2 — Frontend (from /frontend)
npm run dev
```

### 5. Open the Application

| Screen | URL | Credentials |
|--------|-----|-------------|
| **Reception / Login** | [http://localhost:5173](http://localhost:5173) | Admin: `admin@queuecure.com` / `admin123` |
| **Public Display** | [http://localhost:5173/display](http://localhost:5173/display) | No login required |
| **Admin Panel** | [http://localhost:5173/admin](http://localhost:5173/admin) | Admin only |
| **Doctor Dashboard** | [http://localhost:5173/doctor](http://localhost:5173/doctor) | Doctor account (create via Admin) |

### First-Time Setup Flow

1. Log in with the admin credentials
2. Go to **Admin Panel → Staff & Doctors**
3. Add a Doctor (select role "Doctor", choose specialization, assign room)
4. The doctor logs in separately and clicks **"Go Active"**
5. Back on the Reception screen — the doctor appears in the "Assign to Doctor" dropdown
6. Add a patient → Token generated → Display page updates live!

---

## 📁 Project Structure

```
Queue_cure/
├── .env.example              # Environment template
├── .gitignore
│
├── backend/
│   ├── server.js             # Express + Socket.IO entry point
│   ├── seed.js               # Database seeder (admin user)
│   ├── config/
│   │   └── db.js             # MongoDB connection
│   ├── middleware/
│   │   └── auth.js           # JWT verification + role authorization
│   ├── models/
│   │   ├── User.js           # Admin/Receptionist/Doctor accounts
│   │   ├── Doctor.js         # Doctor profile (specialization, room, status)
│   │   └── Token.js          # Patient token (queue state machine)
│   ├── routes/
│   │   ├── auth.js           # Login endpoint
│   │   ├── users.js          # User CRUD (admin only)
│   │   ├── doctors.js        # Doctor CRUD + status toggle
│   │   ├── patients.js       # Patient registration + token generation
│   │   └── queue.js          # Queue operations (next, complete, skip, estimate)
│   └── services/
│       └── emailService.js   # Nodemailer: registration + approaching emails
│
├── frontend/
│   ├── vite.config.js        # Dev proxy for API + WebSocket
│   └── src/
│       ├── App.jsx           # Route definitions + role-based guards
│       ├── context/
│       │   ├── AuthContext.jsx    # JWT auth state management
│       │   └── SocketContext.jsx  # Global Socket.IO connection
│       ├── components/
│       │   ├── AddPatientForm.jsx     # Patient intake form with validation
│       │   ├── PatientCard.jsx        # Shared card (used everywhere)
│       │   ├── DoctorQueueColumn.jsx  # Per-doctor queue column (reception)
│       │   ├── NowServing.jsx         # Currently serving card
│       │   ├── WaitingList.jsx        # Waiting queue list
│       │   ├── PatientDetailsModal.jsx # Patient info popup
│       │   ├── Toast.jsx              # Notification toasts
│       │   └── QueueStats.jsx         # Queue statistics
│       ├── pages/
│       │   ├── Login.jsx              # Authentication screen
│       │   ├── Reception.jsx          # Receptionist workspace
│       │   ├── DoctorDashboard.jsx    # Doctor's queue management
│       │   ├── Display.jsx            # Public waiting room display
│       │   └── admin/
│       │       ├── AdminLayout.jsx    # Admin shell with sidebar
│       │       ├── Staff.jsx          # Staff & doctor management
│       │       └── Reports.jsx        # Daily reports & statistics
│       └── css/
│           ├── index.css              # Global design system
│           ├── reception.css          # Reception layout styles
│           └── display.css            # Public display styles
```

---

## 🔌 API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | None | Login → returns JWT |

### Patients
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/patients` | JWT | Add patient + generate token |
| `GET` | `/api/patients` | JWT | List patients (filter by doctor/date/status) |
| `GET` | `/api/patients/history` | JWT | Historical data for reports |

### Queue Operations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/queue/status` | JWT | All doctors' queue status |
| `GET` | `/api/queue/display` | None | Public display data |
| `GET` | `/api/queue/:doctorId` | JWT | Single doctor queue |
| `POST` | `/api/queue/:doctorId/next` | Doctor | Call next waiting patient |
| `POST` | `/api/queue/:doctorId/call/:tokenId` | Doctor | Call specific patient |
| `POST` | `/api/queue/:doctorId/complete` | Doctor | Complete current patient |
| `POST` | `/api/queue/:doctorId/skip` | Doctor | Skip current → re-queue + auto-call next |
| `POST` | `/api/queue/:doctorId/cancel/:tokenId` | JWT | Remove patient from queue |
| `PATCH` | `/api/queue/estimate/:tokenId` | JWT | Adjust consult time (±delta) |

### Doctors
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/doctors` | JWT | List all doctors |
| `POST` | `/api/doctors` | Admin | Create doctor + user account |
| `PUT` | `/api/doctors/:id` | Admin | Update doctor profile |
| `PUT` | `/api/doctors/:id/status` | Doctor | Toggle active/inactive |
| `DELETE` | `/api/doctors/:id` | Admin | Deactivate doctor |

---

## 📊 Data Model

### Token (Patient Queue Entry)

```javascript
{
  tokenNumber: Number,        // Global daily sequence (1, 2, 3...)
  patientName: String,        // Required
  email: String,              // Optional — for notifications
  phone: String,              // Required — 10-digit validated
  age: Number,                // Required
  sex: "Male" | "Female" | "Other",
  maritalStatus: "Single" | "Married" | "Divorced" | "Widowed",
  visitPurpose: String,       // Dropdown or custom
  reason: String,             // Optional doctor notes
  doctorId: ObjectId,         // Assigned doctor
  estimatedTimeMins: Number,  // Consult time (default 10, adjustable)
  date: "YYYY-MM-DD",        // Partition key
  status: "waiting" | "serving" | "completed" | "skipped" | "cancelled",
  isPriority: Boolean,        // Emergency flag
  calledAt: Date,             // When doctor called this patient
  completedAt: Date,          // When consultation ended
  createdAt: Date,            // Auto-generated
}

// Compound index prevents duplicate tokens
Index: { doctorId: 1, date: 1, tokenNumber: 1 } — UNIQUE
```

---

## 🎨 Design Philosophy

- **No CSS frameworks** — every pixel is intentional. We chose vanilla CSS to have complete control over the design system: custom properties for theming, hand-crafted animations, and responsive layouts without any framework overhead.
- **Glassmorphism Aesthetics** — modern frosted-glass backdrops (`backdrop-filter: blur`), subtle semi-transparent cards, and fluid gradient backgrounds elevate the visual feel beyond a typical "medical software" UI.
- **Component reuse** — `PatientCard` is a single component used across Reception, Doctor Dashboard, and potentially the Display page, ensuring visual consistency.
- **Progressive disclosure** — the UI shows only what each role needs. Receptionists see intake forms + queue overview. Doctors see their own queue with action buttons. The public display shows only token numbers and wait times.
- **Time formatting** — wait times automatically convert from minutes to `1 hr 20 mins` format when they exceed 60 minutes, keeping the display human-readable at a glance.

---

## 🤝 Team

Built with ❤️ for the hackathon.

---

<div align="center">

*"The best queue management system is the one where patients never have to ask 'How much longer?'"*

</div>
