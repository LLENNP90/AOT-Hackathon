# 🗓️ Manpower Resources Management (MRM)
### *Smarter Resource Management — Manpower Optimization*

> An automated, data-driven workforce scheduling and employee management dashboard built to optimize labor allocation, eliminate scheduling inefficiencies, and track real-time operational metrics for businesses.

---

## 📋 Project Overview

**MRM** is a digital solution built under **Track 3: Smarter Resource Management** for **IMAGINEHACK 2026**.

Many businesses struggle with inefficient manpower allocation — leading to overstaffing during slow hours, understaffing during peak rushes, and overall resource waste. **MRM** provides a clean, minimalist, high-end dark-themed monitoring system that allows administrators to dynamically assign, edit, and audit employee shifts, adjust individual hourly wages, and track real-time resource utilization variables dynamically.

---

## ✨ Key Features

- **Interactive Timeline Grid** — A drag-and-click style visual representation of active daily schedules from 07:00 to 21:00.
- **Granular Shift Control** — Dynamically allocate workers to specific operational slots.
- **Financial Oversight & Cost Analytics** — Integrated hourly wage handling (`hourlywages`) per profile card to monitor shifting overhead expenses.
- **Dynamic Roster Controls** — Real-time state management for adding, modifying, or deleting team members with instant updates across rendering trees.
- **Hours Leaderboard** — All-time hours worked ranking per employee, computed live from shift data.
- **AI-Powered Optimisation** — Automated shift optimisation engine to minimize cost and maximize coverage.

---

## 👥 Team Information

| | |
|---|---|
| **Team Name** | QWER |
| **Track** | Track 3 — Smarter Resource Management (Manpower Optimization) |
| **Institution** | Taylor's University / Asia Pacific University |

### Team Members

| Member | Role |
|--------|------|
| Tan Jian Shen | Backend Developer · Data Analyst · Frontend Integration |
| Wong Wei Ming | Backend Developer · Data Analyst · Slides |
| Tan Jun Han | Frontend Developer · UI Designer · Slides |
| Cheong Kit Qi | Frontend Developer · UI Designer |

---

## 🛠️ Technologies Used

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | Next.js (App Router, Client Components, SSR Support) |
| **Language** | TypeScript — strictly typed schemas for Member and Shift models |
| **Styling Engine** | Tailwind CSS — custom dark-mode palette, glassmorphism components |
| **Animation Engine** | Framer Motion — fluid modal transitions and layout animations |
| **Database ORM** | Prisma — configured for persistent data fetching handlers |
| **Backend Runtime** | Node.js / Express |

---

## 🚀 Usage & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/LLENNP90/AOT-Hackathon.git
cd AOT-Hackathon
```

### 2. Install Dependencies

Install both frontend and backend dependencies:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Environment Setup

The frontend expects a backend URL. The default is already configured:

```
# frontend/.env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

> ⚠️ **Important:** Both the backend and frontend must be running **on the same machine** for this to work. The frontend talks to `localhost:5000` — this means the backend **must be running locally** on whichever machine is running the frontend.

### 4. Run the Development Servers

Open **two separate terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the Application

```
http://localhost:3000
```

> **First-time users:** Go to `/signup` to create an account before accessing the dashboard.

---

## 🗂️ Application Routes

| Route | Description |
|-------|-------------|
| `/` | Landing / root page |
| `/login` | Sign in to your account |
| `/signup` | Create a new account |
| `/home` | Main dashboard (requires login) |
| `/member` | Team roster & hours leaderboard |
| `/schedule` | Schedule overview |
| `/employeeshift` | Individual employee shift timeline |
| `/profile` | Account profile settings |

---

## 🔐 Authentication Notes

- Authentication uses **JWT tokens stored in `localStorage`**.
- Protected pages (e.g. `/home`, `/member`, `/schedule`) will redirect to `/` if no token is found.
- Each user's data is **scoped to their own account** — employees and shifts belong to the logged-in user.
- To access the dashboard on a new machine, **sign up or log in first** at `/signup` or `/login`.

---

## ⚙️ Challenge & Approach

### The Challenge
Static spreadsheets, legacy scheduling charts, and manual tracking fail to adapt to live business constraints. This results in bad resource management, inaccurate wage projections, and a lack of quick visibility over who is operating which workstation at any given moment.

### Our Dynamic Approach

We designed a unified dual-view command system:

1. **The Team Hub (`/member`)** — A centralized command board that tracks total members, active daily shifts, all-time hours leaderboard, and individual base profile traits.
2. **The Shift Control Matrix (`/employeeshift`)** — A dynamic timeline interface mapping distinct employee indices directly onto overlapping time windows. It uses calculated fractional heights to handle multi-column layouts gracefully when multiple shifts overlap.
