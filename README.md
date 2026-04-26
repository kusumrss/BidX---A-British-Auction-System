# British Auction RFQ System

## 📝 Project Overview

The **British Auction RFQ System** is a full-stack web platform that enables buyers to create competitive RFQs (Requests for Quotation) with British Auction–style bidding logic. Suppliers compete by submitting progressively lower bids in real time. The system automatically extends auction windows based on configurable triggers and maintains a complete activity log of every bid and extension event.

---

## 🚀 Key Features

### Admin / Buyer
- Create RFQs with bid start, bid close, and forced close times
- Configure trigger window (X minutes) and extension duration (Y minutes)
- Choose extension type: **ANY_BID**, **RANK_CHANGE**, or **L1_CHANGE**

### Supplier
- View all active and closed RFQs with live status on the dashboard
- Submit bids with a full quote breakdown (freight, origin, destination charges, transit time, quote validity)
- New bids must be lower than the current L1 (lowest bid)

### Auction Engine
- Automatic auction extension triggered when:
  - **(a) ANY_BID** — any bid is placed in the last X minutes
  - **(b) RANK_CHANGE** — any supplier ranking change in the last X minutes
  - **(c) L1_CHANGE** — the lowest bidder (L1) changes in the last X minutes
- Extensions are capped at the forced close time — never exceeded
- Dynamic auction statuses: `ACTIVE`, `CLOSED`, `FORCE_CLOSED`, `NOT_STARTED`
- Real-time countdown timer per auction
- Complete activity log with bid events, extension triggers, and reasons

---

## 📂 Folder Structure

```
British-Auction-RFQ/
├── backend/
│   └── app.py                  # Flask application (all routes + auction logic)
└── frontend/
    └── src/
        └── App.jsx             # React frontend (all pages + components)
```

---

## 🔧 Backend

**Tech Stack:** Python, Flask, Flask-SQLAlchemy, Flask-CORS, MySQL (PyMySQL)

### Run Backend

```bash
cd backend
pip install flask flask-sqlalchemy flask-cors pymysql
python app.py
```

API Base URL: `http://127.0.0.1:5000`

### Key API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/rfq` | POST | Create a new RFQ |
| `/rfqs` | GET | Get all RFQs (with live status update) |
| `/rfq/<id>` | GET | Get single RFQ details |
| `/bid` | POST | Place a bid (with extension logic) |
| `/ranking/<rfq_id>` | GET | Get ranked bids for an RFQ |
| `/logs/<rfq_id>` | GET | Get activity log for an RFQ |

---

## 🌐 Frontend

**Tech Stack:** React.js, Tailwind CSS

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`

### Pages

| Page | Description |
|---|---|
| Dashboard | Lists all RFQs with status, lowest bid, close time, and Bid / Detail actions |
| Create RFQ | Form to create a new RFQ with all auction configuration |
| Place Bid | Submit a bid with full quote breakdown |
| Auction Detail | Per-RFQ view: ranked supplier list (L1/L2/L3...), config, live countdown, activity log |
| Logs | Full event log for any RFQ |

---

## 🗄️ Database Schema

**Database:** MySQL | **ORM:** SQLAlchemy

### `rfq` table

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK, AI) | Unique RFQ ID |
| `name` | VARCHAR(100) | RFQ name |
| `bid_start_time` | DATETIME | When bidding opens |
| `bid_close_time` | DATETIME | Scheduled auction close (can extend) |
| `forced_close_time` | DATETIME | Hard stop — auction never extends past this |
| `trigger_window` | INT | Minutes before close to monitor for triggers |
| `extension_duration` | INT | Minutes to extend when trigger fires |
| `extension_type` | VARCHAR(50) | `ANY_BID`, `RANK_CHANGE`, or `L1_CHANGE` |
| `status` | VARCHAR(20) | `ACTIVE`, `CLOSED`, `FORCE_CLOSED`, `NOT_STARTED` |
| `created_at` | DATETIME | Record creation time |

### `bids` table

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK, AI) | Unique bid ID |
| `rfq_id` | INT (FK) | Linked RFQ |
| `bidder_name` | VARCHAR(100) | Supplier / carrier name |
| `bid_amount` | FLOAT | Total bid (must be lower than current L1) |
| `freight_charges` | FLOAT | Freight cost component (optional) |
| `origin_charges` | FLOAT | Origin cost component (optional) |
| `destination_charges` | FLOAT | Destination cost component (optional) |
| `transit_time` | VARCHAR(50) | e.g. "3 days" (optional) |
| `quote_validity` | VARCHAR(50) | e.g. "30 days" (optional) |
| `bid_time` | DATETIME | When bid was placed |

### `logs` table

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK, AI) | Unique log ID |
| `rfq_id` | INT (FK) | Linked RFQ |
| `event_type` | VARCHAR(50) | `BID` or `EXTENSION` |
| `description` | TEXT | Human-readable event description |
| `created_at` | DATETIME | When the event occurred |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React)                       │
│  Dashboard | Create RFQ | Place Bid | Detail | Logs     │
│                  (Polls every 5 seconds)                 │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API (JSON)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                Flask Backend (Python)                    │
│                                                         │
│  POST /rfq    → Validate + create RFQ                   │
│  POST /bid    → Validate → check trigger window →       │
│                 apply extension → log event → commit    │
│  GET  /rfqs   → Update status + return all RFQs         │
│  GET  /ranking/:id → Bids sorted ascending by amount    │
│  GET  /logs/:id    → Full activity log                  │
└──────────────────────┬──────────────────────────────────┘
                       │ SQLAlchemy ORM
                       ▼
┌─────────────────────────────────────────────────────────┐
│              MySQL Database (local)                      │
│   rfq table    │   bids table   │   logs table          │
└─────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- All auction extension logic lives in the backend — the frontend is a display and input layer only
- Status is computed dynamically on every read and written back on dashboard loads
- Bids are validated against the current L1 before saving — enforcing the reverse-auction constraint
- Extensions are capped at `forced_close_time` using a single `min()` comparison

---

## ⚡ How to Use

1. Start MySQL and ensure the database exists with all tables
2. Start backend: `python app.py`
3. Start frontend: `npm run dev`
5. Open `http://localhost:5173`

**Workflow:**
1. **Create RFQ** — set name, times, trigger window, extension duration, extension type
2. **Dashboard** — live-updating list of all RFQs (refreshes every 5s)
3. **Place Bid** — submit amount (must beat L1) + optional quote breakdown
4. **Auction Detail** — ranked suppliers (L1/L2/L3), auction config, countdown, activity log
5. **Logs** — full event trail showing every bid and extension with timestamps

---

## ✅ Validation Rules

- `forced_close_time` must be **after** `bid_close_time`
- `bid_start_time` must be **before** `bid_close_time`
- All bids must be **strictly lower** than the current L1 (lowest bid)
- Bids rejected after `bid_close_time` unless extended; always rejected after `forced_close_time`
- Extensions never push `bid_close_time` past `forced_close_time`
