# Technical Requirements Document (TRD)
## Material Consumption Intelligence System

---

## 1. System Architecture Overview

The system is architected as an offline-capable, single-tenant web application using Next.js 15 (App Router), TypeScript, Prisma ORM, and SQLite.

```mermaid
graph TD
    subgraph ClientLayer["Client Layer (Browser / Tablet)"]
        UI["React 19 / Tailwind / ShadCN Components"]
        RQ["TanStack React Query (Cache & Optimistic UI)"]
        EXP["Client-side Exporters (SheetJS, jsPDF)"]
    end

    subgraph ServerLayer["Server Layer (Next.js 15 App Router)"]
        MW["Middleware (Session Guard)"]
        API["Route Handlers (/api/*)"]
        ZOD["Zod Request Validation"]
        STOCK["Ledger Engine (src/lib/stock.ts)"]
        INTEL["Intelligence Heuristics (src/lib/analytics.ts)"]
        AUTH["HMAC-SHA256 Session Service"]
    end

    subgraph DataLayer["Persistence Layer"]
        PRISMA["Prisma ORM Client (v5.22.0)"]
        SQLITE[("SQLite Database (dev.db / production.db)")]
        WAL["Write-Ahead Logging (WAL) Mode"]
    end

    UI --> RQ
    RQ --> API
    EXP --> UI
    MW --> API
    API --> ZOD
    ZOD --> STOCK
    ZOD --> INTEL
    STOCK --> PRISMA
    INTEL --> PRISMA
    AUTH --> MW
    PRISMA --> SQLITE
    SQLITE --> WAL
```

### 1.1 Technology Stack

| Layer | Component | Specification |
| :--- | :--- | :--- |
| **Runtime** | Node.js | `>= 20.0.0` LTS (Alpine Linux in Docker) |
| **Framework** | Next.js | `15.1.6` (App Router, Server Components + Client Hooks) |
| **Frontend** | React | `19.0.0` with `@tanstack/react-query 5.62.11` |
| **Styling** | Tailwind CSS | `3.4.17` with `tailwindcss-animate` & CSS Variables |
| **Components** | Radix UI / ShadCN | Accessible unstyled primitives + Lucide Icons |
| **Database ORM** | Prisma | `5.22.0` (Client + CLI) |
| **Database Engine**| SQLite | Single file (`dev.db` / `production.db`), WAL enabled |
| **Authentication** | Custom HMAC Session | SHA-256 signed cookie token, zero external dependency |
| **Data Visualization**| Recharts | `2.15.0` (Responsive charts for consumption trends) |
| **Document Export**| SheetJS & jsPDF | `xlsx 0.18.5`, `jspdf 2.5.2`, `jspdf-autotable 3.8.4` |

---

## 2. Data Architecture & Database Schema

### 2.1 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    CATEGORY ||--o{ MATERIAL : contains
    MATERIAL ||--o{ TRANSACTION : tracks
    SHIFT ||--o{ TRANSACTION : logs
    REASON_CODE ||--o{ TRANSACTION : explains
    USER ||--o{ TRANSACTION : creates
    USER ||--o{ AUDIT_LOG : initiates

    CATEGORY {
        string id PK
        string name UK
        string description
        datetime createdAt
        datetime updatedAt
    }

    MATERIAL {
        string id PK
        string name
        string colourName
        float colourQuantity
        string colourUnit
        string categoryId FK
        string unit
        float minimumStock
        float unitCost
        string notes
        string status
        datetime createdAt
        datetime updatedAt
    }

    SHIFT {
        string id PK
        string name UK
        boolean isDefault
        datetime createdAt
    }

    REASON_CODE {
        string id PK
        string name UK
        string notes
        datetime createdAt
    }

    TRANSACTION {
        string id PK
        datetime date
        string type
        string materialId FK
        float quantity
        string shiftId FK
        string reasonId FK
        string vendor
        string invoiceNumber
        string batchNumber
        string destination
        string notes
        string createdById FK
        datetime createdAt
        datetime updatedAt
    }

    USER {
        string id PK
        string name
        string username UK
        string passwordHash
        string role
        boolean active
        datetime createdAt
        datetime updatedAt
    }

    AUDIT_LOG {
        string id PK
        string entityType
        string entityId
        string action
        string oldValue
        string newValue
        string userId FK
        datetime createdAt
    }
```

### 2.2 SQLite-Compliant Schema Specifications
Because SQLite does not support native SQL ENUM types, enum constraints are implemented via string columns and enforced strictly at the application layer through TypeScript union types and Zod schemas:
- **`Role`**: `"ADMIN"` | `"SUPERVISOR"` | `"OPERATOR"`
- **`MaterialStatus`**: `"ACTIVE"` | `"INACTIVE"` | `"ARCHIVED"`
- **`TransactionType`**: `"OPENING"` | `"PURCHASE"` | `"USAGE"` | `"RETURN"` | `"WASTAGE"` | `"ADJUSTMENT"` | `"TRANSFER"`

---

## 3. Mathematical Invariants & Ledger Engine

The ledger engine in [`src/lib/stock.ts`](file:///c:/Users/adity/OneDrive/Desktop/material-intelligence-system/src/lib/stock.ts) guarantees that stock numbers are deterministic, auditable, and mathematically provable.

### 3.1 Signed Quantity Function
Given transaction type $T$ and stored magnitude $Q$:
$$f(T, Q) = \begin{cases}
+|Q|, & T \in \{\text{OPENING}, \text{PURCHASE}, \text{RETURN}\} \\
-|Q|, & T \in \{\text{USAGE}, \text{WASTAGE}, \text{TRANSFER}\} \\
Q, & T = \text{ADJUSTMENT} \quad (Q \in \mathbb{R}\text{ is pre-signed})
\end{cases}$$

### 3.2 Current Stock Invariant
For any material $M$, the current stock at time $t$ across all historical transactions $\mathcal{T}_M$ is:
$$\text{Stock}_M(t) = \sum_{\tau \in \mathcal{T}_M, \text{date}(\tau) \le t} f(\tau.\text{type}, \tau.\text{quantity})$$

### 3.3 Reconciled Period Balance Invariant
For any time window $[t_{\text{from}}, t_{\text{to}}]$:
$$\text{Opening Stock} = \sum_{\tau \in \mathcal{T}_M, \text{date}(\tau) < t_{\text{from}}} f(\tau.\text{type}, \tau.\text{quantity})$$
$$\text{Period Movement} = \sum_{\tau \in \mathcal{T}_M, t_{\text{from}} \le \text{date}(\tau) \le t_{\text{to}}} f(\tau.\text{type}, \tau.\text{quantity})$$
$$\text{Closing Stock} = \text{Opening Stock} + \text{Period Movement}$$

---

## 4. Deterministic Intelligence & Analytics Algorithms

The intelligence engine in [`src/lib/analytics.ts`](file:///c:/Users/adity/OneDrive/Desktop/material-intelligence-system/src/lib/analytics.ts) computes actionable heuristics without external neural network APIs.

### 4.1 Stock-Out Runout Forecasting
- **Window**: Trailing $W = 30\text{ days}$.
- **Average Daily Consumption**:
  $$ADC_{30}(M) = \frac{\sum_{\tau \in \text{USAGE}(M), \text{date}(\tau) \ge (t - 30\text{d})} \tau.\text{quantity}}{30}$$
- **Days Remaining**:
  $$\text{DaysRemaining}(M) = \begin{cases}
  \frac{\text{CurrentStock}(M)}{ADC_{30}(M)}, & ADC_{30}(M) > 0 \\
  \infty, & ADC_{30}(M) = 0
  \end{cases}$$
- **Estimated Stock-Out Date**: $t + \lfloor \text{DaysRemaining} \rfloor\text{ days}$.

### 4.2 Abnormal Consumption Detection
Detects sudden process shifts, leaks, or batch errors:
- **Recent Window**: Recent 7 days ($R = 7\text{d}$).
- **Baseline Window**: Prior 30 days excluding recent 7 days ($B = [t-37\text{d}, t-7\text{d}]$).
- **Deviation Percentage**:
  $$\Delta\% = \left(\frac{Avg_R - Avg_B}{Avg_B}\right) \times 100$$
- **Trigger**: $|\Delta\%| \ge 25\%$. Direction: $\Delta\% > 0 \implies \text{Spike}$, $\Delta\% < 0 \implies \text{Drop}$.

### 4.3 Dead Stock Detection
A material is classified as *Dead Stock* if:
$$\text{CurrentStock}(M) > 0 \quad \land \quad \max(\text{date}(\tau \in \mathcal{T}_M)) < (t - 30\text{d})$$

---

## 5. API Design & Endpoint Specifications

All endpoints are hosted under Next.js Route Handlers (`src/app/api/**`) and return JSON.

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Validates credentials, issues HMAC-signed session cookie. |
| `POST` | `/api/auth/logout` | All | Clears session cookie. |
| `GET` | `/api/auth/me` | All | Returns session profile of authenticated user. |
| `GET` | `/api/dashboard` | All | Returns aggregated inventory stats, alerts, top consumed. |
| `GET` | `/api/materials` | All | Lists materials with real-time stock balances. |
| `POST` | `/api/materials` | Admin, Supervisor | Creates new material in catalog with audit log entry. |
| `GET` | `/api/materials/:id` | All | Fetches single material details and historical ledger. |
| `PATCH` | `/api/materials/:id` | Admin, Supervisor | Updates material specs (cost, min stock, status). |
| `GET` | `/api/transactions` | All | Queries transaction history with multi-field filtering. |
| `POST` | `/api/transactions` | Role-dependent | Records signed movement (Operators: Usage/Wastage/Return). |
| `GET` | `/api/analytics` | All | Returns forecasts, MoM trends, abnormal spikes, dead stock. |
| `GET` | `/api/reports` | All | Generates reconciled period/batch balances. |
| `GET` | `/api/audit-log` | Admin | Retrieves paginated audit trail. |
| `GET/POST`| `/api/settings/:res`| Admin, Supervisor | CRUD for Categories, Shifts, ReasonCodes, Users. |

---

## 6. Authentication & Security Architecture

1. **HMAC-SHA256 Tokenization**: Session tokens are structured as `<base64url(payload)>.<signature>` signed with a 256-bit server secret (`SESSION_SECRET`).
2. **Cookie Security**:
   - `httpOnly: true` (prevents XSS exfiltration).
   - `sameSite: "lax"` (mitigates CSRF).
   - `secure: true` in production environments.
   - `maxAge: 30 days`.
3. **Password Security**: Passwords hashed using `bcryptjs` with salt work factor of 10.
4. **RBAC Guard**: Enforced at the middleware boundary ([`src/middleware.ts`](file:///c:/Users/adity/OneDrive/Desktop/material-intelligence-system/src/middleware.ts)) and re-verified inside API route handlers via `requireRole()`.

---

## 7. Storage, Concurrency & Deployment

### 7.1 SQLite Concurrency & WAL Optimization
To eliminate `SQLITE_BUSY` database lock errors under concurrent multi-user shift handovers:
- **Write-Ahead Logging (WAL)**: Enabled on connection. WAL allows concurrent readers while a write is occurring.
- **Busy Timeout**: Configured connection timeout of 5,000 ms to queue write transactions safely during simultaneous submissions.

### 7.2 Docker Deployment Architecture
The multi-stage `Dockerfile` packages the production application into an Alpine Linux container:
- **Stage 1 (deps)**: Installs npm dependencies.
- **Stage 2 (build)**: Runs `prisma generate` and `next build`.
- **Stage 3 (runner)**: Minimal runtime image exposing port 3000.
- **Volume Mount**: Maps host `./data` directory to container `/app/data` to ensure `production.db` persistence across container rebuilds.

### 7.3 PostgreSQL Migration Path
The codebase strictly adheres to standard relational modeling. Migrating to enterprise PostgreSQL requires:
1. Changing `datasource db.provider` from `"sqlite"` to `"postgresql"` in `prisma/schema.prisma`.
2. Setting `DATABASE_URL="postgresql://user:pass@host:5432/db"`.
3. Executing `npx prisma migrate dev`.
Zero modifications to application or ledger logic are required.