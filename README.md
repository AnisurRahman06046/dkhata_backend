# Digital Khata Bot (DKB) - Backend

A Telegram chatbot-based sales & expense tracking system for small retail shop owners in Bangladesh. Replace paper-based sales recording with an ultra-simple, chat-based digital solution with automatic daily ledger management.

## Features

- **Quick Sale Entry** — Type `Shirt 500` to record a sale instantly
- **Quick Expense Entry** — Type `-50` or `-100 Tea` to record an expense
- **Bangla Numeral Support** — Works with `Shirt ৫০০`
- **Guided Flows** — Step-by-step entry via `/addsale` and `/expense`
- **Daily Ledger** — Automatic opening/closing balance with carry-forward
- **Live Balance** — `/balance` shows real-time opening, sales, expenses, balance
- **End of Day** — `/endday` to close and lock the day
- **Auto Carry-Forward** — Next day's opening = previous day's closing
- **Auto Day Close** — Reminder at 11 PM BD, auto-close at midnight
- **Delete Entries** — `/delete` removes the last entry
- **Reports** — `/today`, `/week`, `/month` with full breakdown
- **Google Sheets Backup** — Auto-sync to a spreadsheet (optional)
- **REST API** — Full API alongside the Telegram bot
- **Bangladesh Timezone** — All calculations use UTC+6

## How It Works

```
Day 1:
  Opening Balance = 0 (or set via /setbalance)
  User types: Shirt 500     → Sale +500, Balance = 500
  User types: Rice 800      → Sale +800, Balance = 1300
  User types: -50            → Expense -50, Balance = 1250
  /balance                   → Shows live breakdown
  /endday                    → Closes day, Closing = 1250

Day 2 (automatic):
  Opening Balance = 1250 (carried forward)
  User types: 300            → Sale +300, Balance = 1550
  User types: -100 Tea       → Expense -100, Balance = 1450
```

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL + Prisma ORM
- **Bot:** Telegraf (Telegram Bot API)
- **Validation:** Zod
- **Logging:** Winston
- **Containerization:** Docker

## Project Structure

```
backend/
├── src/
│   ├── app/
│   │   ├── config/              # Zod-validated environment config
│   │   ├── errors/              # Custom error hierarchy
│   │   ├── interfaces/          # Shared TypeScript interfaces
│   │   ├── middlewares/         # Global error handler, validation, 404
│   │   ├── modules/
│   │   │   ├── user/            # User registration & management
│   │   │   ├── sale/            # Sale CRUD operations
│   │   │   ├── expense/         # Expense CRUD operations
│   │   │   ├── daily-ledger/    # Daily balance & carry-forward logic
│   │   │   ├── summary/         # Daily/weekly/monthly aggregations
│   │   │   ├── telegram/        # Bot, handlers, parser, scenes, templates
│   │   │   └── google-sheets/   # Google Sheets sync service
│   │   ├── routes/              # Route aggregation + health checks
│   │   └── utils/               # catchAsync, sendApiResponse, logger
│   ├── lib/
│   │   └── prisma.ts            # Prisma client singleton
│   ├── app.ts                   # Express application setup
│   └── server.ts                # Server + bot + auto-close job
├── prisma/
│   └── schema.prisma            # Database schema (User, Sale, Expense, DailyLedger)
├── tests/
│   └── unit/
│       └── parser.test.ts       # Sale/expense input parser tests
├── docker-compose.yml
├── Dockerfile
└── package.json
```

Each module follows: `interface.ts` (Zod schemas) → `service.ts` (business logic) → `controller.ts` (HTTP handlers) → `routes.ts` (Express router).

## Prerequisites

- Node.js >= 20
- PostgreSQL 16+ (or Docker)
- A Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

## Getting Started

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name and username for your bot
4. Copy the bot token

### 3. Configure Environment

```bash
cp .env.examples .env
```

Edit `.env`:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dkb_db?schema=public"
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 4. Start Database

**Option A: Docker (recommended)**

```bash
docker compose up db -d
```

**Option B: Local PostgreSQL**

Create a database named `dkb_db` and update `DATABASE_URL` in `.env`.

### 5. Run Migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 6. Start the Server

```bash
npm run dev
```

## Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Register and get started |
| `/addsale` | Add a sale step by step |
| `/expense` | Add an expense step by step |
| `/balance` | View live balance |
| `/today` | Today's full report |
| `/week` | Last 7 days report |
| `/month` | This month's report |
| `/history` | Recent transactions |
| `/endday` | Close and lock today |
| `/delete` | Remove last entry |
| `/setbalance` | Set opening cash balance |
| `/help` | Show all commands |

### Quick Entry

**Sales (money in):**
```
Shirt 500
Rice 5kg 350
500 Shirt
Lungi ৫০০
```

**Expenses (money out):**
```
-50
-100 Tea
Transport -200
```

## Daily Ledger System

The bot automatically manages a daily ledger for each user:

1. **Auto Day Start** — New day starts automatically, opening = yesterday's closing
2. **First Day** — Opening = 0, or set with `/setbalance`
3. **Sales** — Add to balance (`total_sales += amount`)
4. **Expenses** — Subtract from balance (`total_expenses += amount`)
5. **Live Balance** — `/balance` shows real-time state
6. **End Day** — `/endday` or auto-close at midnight BD time
7. **Auto Carry-Forward** — Next day inherits previous closing balance

### Balance View (`/balance`)
```
💰 Live Balance
📅 28 Mar 2026  │  🟢 Active
─────────────────────────
🏦 Opening:       5,000 BDT
🟢 Sales:           +3,000 BDT
🔴 Expenses:      -500 BDT
📊 Net:                +2,500 BDT
─────────────────────────
💳 Current Balance:  7,500 BDT
```

### End Day View (`/endday`)
```
🏙️ Day Closed
📅 28 Mar 2026
─────────────────────────
🏦 Opening:       5,000 BDT
🟢 Total Sales:   +8,000 BDT
🔴 Total Exp:     -2,000 BDT
📈 Net P/L:          +6,000 BDT
─────────────────────────
🔐 Closing Balance:  11,000 BDT

Tomorrow's opening will be 11,000 BDT
```

## REST API Endpoints

**Health Checks**

```
GET /health          # Basic health check
GET /ready           # Database readiness check
GET /live            # Liveness with uptime and memory
```

**Users**

```
POST   /api/v1/users                 # Create user
GET    /api/v1/users/:telegramId     # Get user
PATCH  /api/v1/users/:telegramId     # Update user
```

**Sales**

```
POST   /api/v1/sales                 # Create sale
GET    /api/v1/sales?telegramId=...  # Get sales
DELETE /api/v1/sales/:id             # Delete sale
```

**Expenses**

```
POST   /api/v1/expenses                 # Create expense
GET    /api/v1/expenses?telegramId=...  # Get expenses
DELETE /api/v1/expenses/:id             # Delete expense
```

**Summary**

```
GET /api/v1/summary/today?telegramId=...
GET /api/v1/summary?telegramId=...&period=today|week|month
```

### Response Format

```json
{
  "success": true,
  "message": "Summary retrieved successfully",
  "data": {
    "openingBalance": 5000,
    "totalSales": 3000,
    "totalExpenses": 500,
    "closingBalance": 7500,
    "transactionCount": 5,
    "expenseCount": 2,
    "period": "today",
    "sales": [...],
    "expenses": [...]
  }
}
```

## Database Schema

**User** — Registered bot users

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| telegramId | String | Unique Telegram ID |
| name | String | Display name |
| initialBalance | Decimal | First-day opening (default: 0) |

**Sale** — Money in

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | FK to User |
| productName | String | Product sold |
| price | Decimal(12,2) | Sale amount (BDT) |
| quantity | Int | Default: 1 |

**Expense** — Money out

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | FK to User |
| description | String | Expense description |
| amount | Decimal(12,2) | Expense amount (BDT) |

**DailyLedger** — Daily balance tracking

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | FK to User |
| date | String | YYYY-MM-DD (BD time) |
| openingBalance | Decimal | Start of day |
| totalSales | Decimal | Sum of sales |
| totalExpenses | Decimal | Sum of expenses |
| closingBalance | Decimal | End of day |
| isClosed | Boolean | Locked status |

## Google Sheets Integration (Optional)

1. Create a Google Cloud project and enable the Sheets API
2. Create a service account and download the JSON key
3. Create a Google Sheet and share it with the service account email
4. Add to `.env`:

```env
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account",...}'
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
```

## Docker Deployment

```bash
export TELEGRAM_BOT_TOKEN=your_token
docker compose up -d
docker compose exec api npx prisma migrate deploy
```

For production webhook mode:
```env
TELEGRAM_WEBHOOK_URL=https://your-domain.com
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run migrations |
| `npm run prisma:studio` | Browse database GUI |
| `npm run docker:up` | Start containers |
| `npm run docker:down` | Stop containers |

---

## User Manual: Onboarding & Operations Guide

### Step 1: Set Up the System (You, the Admin)

Before onboarding any user, complete the setup:

1. **Create a Telegram bot** via [@BotFather](https://t.me/BotFather) and get the token
2. **Deploy the backend** (Docker or bare metal — see Getting Started above)
3. **Set `ADMIN_TELEGRAM_IDS`** in `.env` with your Telegram user ID (comma-separated for multiple admins):
   ```env
   ADMIN_TELEGRAM_IDS=123456789,987654321
   ```
   To find your Telegram ID, message [@userinfobot](https://t.me/userinfobot)
4. **Set up Google Sheets** (optional, for Pro users) — see Google Sheets Integration above
5. **Set up bKash/Nagad payment numbers** — update the payment numbers in `src/app/modules/telegram/telegram.templates.ts` in the `subscribeMessage()` function (search for `01XXXXXXXXX`)

### Step 2: Onboard a New User (Shop Owner)

Onboarding is fully self-service via Telegram. Share these instructions with the shop owner:

1. **Open Telegram** and search for your bot by its username (e.g., `@DigitalKhataBot`)
2. **Tap Start** or send `/start` — this registers them automatically
3. **Set opening cash** (optional): Send `/setbalance` and enter their current cash in hand (e.g., `5000`)
4. **Start recording**:
   - To record a sale: just type `Shirt 500` or `500 Shirt`
   - To record an expense: type `-50` or `-100 Tea`
   - Bangla numerals work: `Lungi ৫০০`
5. **Check balance anytime**: Send `/balance`
6. **End the day**: Send `/endday` at night (or it auto-closes at midnight)

That's it. No passwords, no forms, no downloads. The user is active from the moment they tap `/start`.

### Step 3: User's Daily Workflow

Share this simple routine with each shop owner:

```
Morning:
  - Open Telegram → your bot
  - Balance shows yesterday's closing automatically

During the day:
  - Each sale: type "Product Price" (e.g., Shirt 500)
  - Each expense: type "-Amount" or "-Amount Description" (e.g., -100 Tea)
  - Check balance anytime: /balance

End of day:
  - Send /endday to close the day
  - See your profit/loss summary
  - Tomorrow starts with today's closing balance
```

### Step 4: Subscription & Payment Management

#### Plans

| Plan | Price | Features |
|------|-------|----------|
| **Basic Khata** (Free) | 0 BDT | Sales, expenses, balance, today report, history, delete, endday |
| **Pro Monthly** | 199 BDT/month | Everything in Basic + weekly reports, monthly reports, Google Sheets sync, referral rewards |
| **Pro Yearly** | 1,499 BDT/year | Same as Pro Monthly (save 30%) |

#### User Upgrade Flow

1. User sends `/subscribe` — sees pricing and payment instructions
2. User sends payment via bKash or Nagad to your number
3. User sends `/pay bkash TXN123ABC monthly` (or `nagad`, `yearly`)
4. Payment enters **PENDING** status
5. **Admin verifies** (see below)
6. User gets notified and Pro features activate immediately

#### Admin Payment Commands

| Command | Description |
|---------|-------------|
| `/admin_payments` | List all pending payments with details |
| `/admin_verify <id>` | Verify a payment — activates Pro for the user |
| `/admin_reject <id> [reason]` | Reject a payment with optional reason |

The `<id>` is the short 8-character ID shown in the payment list. Example:

```
/admin_payments
  → Shows:
    1. Rahim (123456789)
       BKASH • TXN: ABC123XYZ
       PRO_MONTHLY • 199 BDT
       ID: a1b2c3d4
       5 Apr 2026 2:30 PM

/admin_verify a1b2c3d4
  → Payment verified, user notified, Pro activated

/admin_reject a1b2c3d4 Wrong TXN ID
  → Payment rejected, user notified with reason
```

**Plan stacking**: If a user pays again while still Pro, the new duration is added on top of the existing expiry (not replaced).

**Auto-expiry**: At midnight BD time, expired plans are automatically downgraded to Free.

### Step 5: Referral System

Users can invite others to earn free Pro:

1. User sends `/referral` — sees their unique referral code and stats
2. User shares the code with friends
3. Friend registers with `/start`, then sends `/refer <code>`
4. After **3 successful referrals**, the referrer gets **1 month free Pro**
5. Rewards stack — every 3 more referrals = another free month

### Step 6: Monitoring & Operations

#### Auto-Close Job (runs every 30 minutes)
- **11 PM BD**: Sends `/endday` reminder to users with open ledgers
- **Midnight BD**: Auto-closes yesterday's open ledgers + expires expired plans

#### Google Sheets Sync (Pro users only)
- Runs every 5 minutes
- Sales go to the `Sales` sheet tab (columns: Date, User, TelegramID, Product, Price)
- Expenses go to the `Expenses` sheet tab (columns: Date, User, TelegramID, Description, Amount)
- Only Pro users' data is synced

#### Health Checks
```
GET /health   → Basic ping
GET /ready    → Database connectivity
GET /live     → Uptime and memory usage
```

#### REST API for External Integrations

If you want to build a web dashboard or connect other tools, use the REST API:

```
# Get a user's info
GET /api/v1/users/123456789

# Get today's summary
GET /api/v1/summary/today?telegramId=123456789

# Get this month's summary
GET /api/v1/summary?telegramId=123456789&period=month

# List all sales
GET /api/v1/sales?telegramId=123456789&limit=50
```

### Troubleshooting

| Problem | Solution |
|---------|----------|
| Bot not responding | Check `TELEGRAM_BOT_TOKEN` in `.env`, restart server |
| "Not registered" error | User needs to send `/start` first |
| Balance seems wrong | User can send `/today` for full breakdown; use `/delete` to remove wrong entries |
| Google Sheets not syncing | Check credentials in `.env`; only works for Pro users |
| Payment stuck on PENDING | Admin must verify with `/admin_verify` |
| Day didn't auto-close | Auto-close runs at midnight BD (UTC+6); check server logs |

---

## MongoDB vs PostgreSQL: Tradeoff Analysis

### Current Stack: PostgreSQL + Prisma

This is the right choice for DKB. Here's why, and what you'd gain/lose by switching.

### What You'd Gain with MongoDB

| Advantage | Details |
|-----------|---------|
| **Flexible schema** | No migrations needed when adding fields. Can store arbitrary product metadata per user without schema changes. |
| **Easier horizontal scaling** | MongoDB sharding is built-in. If you ever hit millions of users across regions, it scales more naturally. |
| **Embedded documents** | Could embed sales/expenses directly inside a User document, reducing joins for simple queries. |
| **JSON-native** | Data is already BSON/JSON — no ORM type mapping needed. Good fit for unstructured/semi-structured data. |

### What You'd Lose with MongoDB

| Disadvantage | Impact on DKB |
|--------------|---------------|
| **No ACID transactions across collections** | Payment verification updates Payment + User atomically. MongoDB multi-document transactions exist but are slower, less reliable, and have more caveats. A failed transaction could leave a payment verified but user plan not activated. **This is critical for money-related operations.** |
| **No referential integrity** | PostgreSQL enforces foreign keys (User→Sale, User→Expense, cascade deletes). MongoDB doesn't — a deleted user could leave orphaned sales forever. You'd need application-level cleanup. |
| **Weaker aggregation for reports** | `/today`, `/week`, `/month` summaries use SQL `aggregate` (SUM, COUNT) with date range filters and index-backed queries. MongoDB aggregation pipeline can do this but is more verbose, harder to optimize, and doesn't integrate as cleanly with Prisma. |
| **Prisma support is limited** | Prisma's MongoDB adapter lacks features vs PostgreSQL: no `$transaction` array syntax, no `createMany`, limited relation filtering. You'd need to rewrite service code significantly or drop Prisma for Mongoose. |
| **Decimal precision** | PostgreSQL `Decimal(12,2)` guarantees exact financial arithmetic. MongoDB stores as `Double` (IEEE 754 floating point) by default — `0.1 + 0.2 !== 0.3`. You'd need `Decimal128` type with manual handling. |
| **Daily ledger unique constraint** | `@@unique([userId, date])` is enforced at DB level in PostgreSQL. MongoDB unique indexes exist but are less battle-tested with compound keys + upserts. |
| **Migration story** | Prisma migrations give you version-controlled, reviewable schema changes. MongoDB has no built-in migration tooling — schema changes are "just push and hope." |

### DKB-Specific Verdict

| Factor | PostgreSQL | MongoDB |
|--------|-----------|---------|
| Financial data integrity | Strong (ACID, Decimal) | Weak (eventual, Double) |
| Payment transactions | Native multi-row TX | Fragile multi-doc TX |
| Referential integrity | FK constraints | Application-level only |
| Daily ledger carry-forward | Unique constraint + decimal math | Manual enforcement |
| Aggregation reports | SQL SUM/COUNT, fast | Aggregation pipeline, verbose |
| Prisma compatibility | Full support | Partial, many gaps |
| Schema flexibility | Needs migrations | Schemaless |
| Horizontal scaling | Vertical first, then read replicas | Built-in sharding |
| Hosting cost | Slightly more (Supabase free tier helps) | Atlas free tier available |

**Bottom line**: DKB is a **financial ledger system**. Every sale, expense, and balance must be exactly correct. PostgreSQL's ACID transactions, decimal precision, foreign keys, and Prisma support make it the clear choice. MongoDB's strengths (flexible schema, horizontal scaling) don't matter at DKB's scale and would actively hurt data integrity.

Switch to MongoDB only if:
- You pivot to storing unstructured data (e.g., product catalogs with varying attributes)
- You reach 10M+ users and need horizontal sharding (unlikely for a Bangladesh-focused SaaS)
- You drop Prisma entirely and adopt Mongoose with manual schema validation

For DKB's current and foreseeable needs, **stay with PostgreSQL**.

## License

ISC
