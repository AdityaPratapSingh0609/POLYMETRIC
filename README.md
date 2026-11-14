# POLYMETRIC 🏭
### Autonomous Offline Material Consumption Intelligence & Signed Ledger System

[![Next.js](https://img.shields.io/badge/Next.js-15.1.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?style=flat&logo=sqlite)](https://www.sqlite.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An offline-first, on-premise manufacturing inventory and intelligence platform designed to replace error-prone paper stock registers in polymer and chemical compounding facilities.

---

## 🌟 Key Highlights

- **Pure Immutable Stock Ledger**: Stock is **never stored directly**. Every movement is recorded as a discrete signed transaction (`OPENING`, `PURCHASE`, `RETURN`, `USAGE`, `WASTAGE`, `ADJUSTMENT`, `TRANSFER`). Stock is always mathematically derived at query time.
- **100% Offline & Deterministic Intelligence**: Zero cloud dependencies or external LLM API costs. Computes runout forecasting ($ADC_{30}$), Month-over-Month consumption trends, 25% abnormal usage spikes/drops, and dead stock on local plant hardware.
- **High-Velocity Floor Entry**: Mobile/tablet-optimized touch UI (`/entry`) with TanStack React Query optimistic cache updates, auto-shift detection, and real-time over-stock warnings.
- **Auditable Bank-Statement Ledger**: Complete chronological transaction history per material (`/materials/[id]`) with continuous running balances.
- **Multi-Format Industrial Reports**: Reconciled period summaries (Daily, Weekly, Monthly, Quarterly, Yearly, Batch) with client-side **CSV**, **Excel (.xlsx)**, and **PDF** export.
- **SQLite WAL Concurrency**: Configured with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and a 5,000 ms busy timeout to safely handle simultaneous multi-operator shift handovers.
- **Role-Based Access Control**: Strict three-tier permission enforcement (**Admin**, **Supervisor**, **Operator**) backed by tamper-proof HMAC-SHA256 Web Crypto session tokens and an immutable audit log.

---

## 📐 Architecture & Mathematical Invariant

```mermaid
flowchart TD
    subgraph FloorOperations["Shop Floor Operations"]
        OE[Opening Balance (+)]
        PO[Purchase / Receipt (+)]
        RT[Floor Return (+)]
        US[Batch Usage (-)]
        WA[Wastage / Scrap (-)]
        TR[Dept Transfer (-)]
        AD[Stock Adjustment (+/-)]
    end

    subgraph LedgerCore["Signed Ledger Core"]
        TXN[("Signed Transaction Log\n(SQLite WAL Mode)")]
        CALC["Live Summation Engine\nStock = ∑ signed(quantity)"]
    end

    subgraph IntelligenceEngine["Offline Intelligence Engine"]
        FC["Runout Forecasting\nDays = Stock / ADC30"]
        AN["Abnormal Spike/Drop\nΔ% ≥ 25% vs Baseline"]
        DS["Dead Stock Monitor\nInactive > 30 Days"]
        MOM["MoM Trajectory\nSurging / Steady / Cooling"]
    end

    subgraph Presentation["User Interfaces"]
        DASH["Live Dashboard (/)"]
        ENTRY["Fast Floor Entry (/entry)"]
        MAT["Material Master (/materials)"]
        LEDGER["Ledger Statement (/materials/:id)"]
        REP["Reconciled Reports (/reports)"]
        EXEC["Executive Valuation (/executive)"]
    end

    FloorOperations --> TXN
    TXN --> CALC
    CALC --> IntelligenceEngine
    CALC --> Presentation
    IntelligenceEngine --> Presentation
```

### The Invariant Equation
For any material $M$ across any reporting window $[t_{\text{from}}, t_{\text{to}}]$:
$$\text{Opening} + \text{Purchased} + \text{Returned} - \text{Consumed} - \text{Wastage} - \text{Transferred} \pm \text{Adjustments} = \text{Closing}$$

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `>= 20.0.0` LTS
- **npm**: `>= 10.0.0`

### 2. Local Setup
```bash
# Clone the repository
git clone https://github.com/AdityaPratapSingh0609/POLYMETRIC.git
cd POLYMETRIC

# Install dependencies
npm install

# Initialize environment variables
cp .env.example .env

# Generate Prisma Client & push SQLite schema
npx prisma db push

# Seed starter materials, shifts, categories, and users
npm run db:seed

# Start the development server
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 🔐 Default Credentials

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full system control (Settings, User management, Audit log, Opening balances) |
| **Supervisor** | `supervisor` | `supervisor123` | Shift oversight (Floor entries, Receipts, Adjustments, Transfers, Reports, Executive) |
| **Operator** | `operator` | `operator123` | Floor logging (Usage, Wastage, Returns, View ledger, View reports) |

*(Passwards can be changed directly from **Settings → Users**).*

---

## 🧪 Automated Testing

POLYMETRIC includes automated test suites validating mathematical invariants, schema constraints, database operations, and session cryptographic security:

```bash
npm test
```

```
▶ Database & Seed Integrity Verification
  ✔ verifies seeded users and password hashes
  ✔ verifies categories, shifts, and reason codes are loaded
  ✔ verifies materials and initial opening stock ledger
▶ Live Transaction Cycle & Invariant Enforcement
  ✔ creates a test material, performs full transaction lifecycle, and verifies ledger reconciliation
▶ Deterministic Intelligence Heuristics
  ✔ forecasts and anomaly detection execute without runtime errors
▶ Ledger Mathematical Invariants
  ✔ signedQuantity strictly computes correct signs per transaction type
  ✔ sumSigned reconciles multi-transaction historical movements
  ✔ satisfies the fundamental inventory reconciliation equation
▶ Validation Schemas
  ✔ rejects transaction with zero quantity
  ✔ accepts valid transaction
  ✔ validates material schema with positive minimum stock
▶ Authentication & Session Security
  ✔ generates and verifies HMAC-SHA256 Web Crypto session token
  ✔ rejects tampered session token

ℹ tests 13 | suites 6 | pass 13 | fail 0
```

---

## 🐳 Docker Deployment

To run in a containerized environment with persistent volume storage for the SQLite database:

```bash
docker compose up --build
```
The database persists locally on the host machine at `./data/production.db`.

---

## 📄 Project Documentation

- **[Product Requirements Document (PRD)](PRD.md)**: Product goals, user personas, functional features, and KPIs.
- **[Technical Requirements Document (TRD)](TRD.md)**: Data schemas, ERD diagrams, algorithms, and security design.
- **[Implementation Plan](IMPLEMENTATION_PLAN.md)**: 10-stage execution plan and milestones.
- **[Changelog](CHANGELOG.md)**: Full chronological record of enhancements and releases.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
