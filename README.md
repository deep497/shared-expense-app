# Shared Expense App

A full-stack expense sharing application built for managing shared expenses between flatmates. The application supports group management, expense tracking, balance calculation, settlement planning, authentication, and CSV import with anomaly detection.
An application designed to prevent money-related conflicts by tracking shared expenses, calculating balances, and ensuring transparent settlements.
## Problem Statement

Four flatmates — Aisha, Rohan, Priya, and Meera — tracked expenses in a spreadsheet. Over time the data became inconsistent due to:

* Duplicate expenses
* Invalid dates
* Currency mismatches (USD and INR)
* Member join/leave changes
* Settlement entries mixed with expenses

This application provides a structured solution for managing expenses and generating clear settlement plans.

---

## Features

### Authentication

* User Registration
* User Login
* JWT-based Authentication
* Password Hashing using bcrypt

### Group Management

* Create Groups
* View Groups
* Add Members
* Remove Members
* Membership History Tracking (`joined_at`, `left_at`)

### Expense Management

* Create Expenses
* Edit Expenses
* Delete Expenses
* View Expense History
* Expense Participant Tracking

### Balance Calculation

* Total Paid
* Total Owed
* Net Balance

### Settlement Engine

* Simplified Debt Calculation
* Minimum Transaction Settlement Plan
* "Who pays whom" summary

### CSV Import

* Upload CSV files
* Detect anomalies
* Generate import reports
* Store anomaly logs

### Supported Anomalies

* Duplicate Expenses
* Invalid Dates
* Missing Currency
* Missing Payer
* Invalid Participants
* Invalid Groups
* Alias Detection
* Negative Amounts
* Zero Amounts

---

## Tech Stack

### Frontend

* React
* Vite
* Axios
* React Router

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL

### Authentication

* JWT
* bcrypt

---

## Database Schema

### Tables

* users
* groups
* group_members
* expenses
* expense_participants
* settlements
* import_anomalies

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd shared-expense-app
```

### Backend Setup

```bash
cd backend
npm install
```

Create `.env`

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=shared_expense_db

JWT_SECRET=your_secret_key
```

Start Backend:

```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

Backend runs on:

```text
http://localhost:5000
```

---

## API Modules

### Authentication

* POST /api/auth/register
* POST /api/auth/login

### Groups

* POST /api/groups
* GET /api/groups
* GET /api/groups/:id
* POST /api/groups/:groupId/members
* PATCH /api/groups/:groupId/members/:userId

### Expenses

* POST /api/expenses
* GET /api/expenses/:id
* PUT /api/expenses/:id
* DELETE /api/expenses/:id

### Balances

* GET /api/groups/:groupId/balances
* GET /api/users/:userId/balance

### Settlements

* POST /api/settlements
* GET /api/settlements
* GET /api/groups/:groupId/settlements

### CSV Import

* POST /api/import/csv

---

## AI Usage

AI tools were used as development assistants for:

* API scaffolding
* Frontend component generation
* Validation logic
* Documentation drafting

All generated code was reviewed, tested, and modified before submission.

---

## Future Improvements

* Email Verification
* OTP Authentication
* Real-time Notifications
* Advanced Currency Exchange APIs
* Fuzzy Alias Matching
* Approval Workflow for Duplicate Resolution

