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

## License

ISC
