# Digital Khata Bot (DKB) - Backend

A Telegram chatbot-based sales tracking system for small retail shop owners in Bangladesh. Replace paper-based sales recording with an ultra-simple, chat-based digital solution.

## Features

- **Quick Sale Entry** — Type `Shirt 500` to record a sale instantly
- **Bangla Numeral Support** — Works with `Shirt ৫০০`
- **Guided Sale Flow** — Step-by-step entry via `/addsale`
- **Daily/Weekly/Monthly Summaries** — `/today`, `/week`, `/month`
- **Sales History** — `/history` to view recent transactions
- **Google Sheets Backup** — Auto-sync sales to a spreadsheet (optional)
- **REST API** — Full API alongside the Telegram bot
- **Bangladesh Timezone** — All date calculations use UTC+6

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
│   │   │   ├── summary/         # Daily/weekly/monthly aggregations
│   │   │   ├── telegram/        # Bot, handlers, parser, wizard scenes
│   │   │   └── google-sheets/   # Google Sheets sync service
│   │   ├── routes/              # Route aggregation + health checks
│   │   └── utils/               # catchAsync, sendApiResponse, logger
│   ├── lib/
│   │   └── prisma.ts            # Prisma client singleton
│   ├── app.ts                   # Express application setup
│   └── server.ts                # Server entrypoint + graceful shutdown
├── prisma/
│   └── schema.prisma            # Database schema (User, Sale)
├── tests/
│   └── unit/
│       └── parser.test.ts       # Sale input parser tests
├── docker-compose.yml
├── Dockerfile
└── package.json
```

Each module follows the pattern: `interface.ts` (Zod schemas) → `service.ts` (business logic) → `controller.ts` (HTTP handlers) → `routes.ts` (Express router).

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

The server starts on `http://localhost:5000` and the Telegram bot begins polling for messages.

## Usage

### Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Register and get started |
| `/addsale` | Add a sale step by step |
| `/today` | Today's sales summary |
| `/week` | Last 7 days summary |
| `/month` | Current month summary |
| `/history` | View recent sales |
| `/help` | Show all commands |

### Quick Sale Entry

Just type a product name followed by a price:

```
Shirt 500
Rice 5kg 350
Blue Jeans 1200
500 Shirt
Lungi ৫০০
```

The bot parses the message and records the sale automatically.

### REST API Endpoints

**Health Checks**

```
GET /health          # Basic health check
GET /ready           # Database readiness check
GET /live            # Liveness with uptime and memory
```

**Users**

```
POST   /api/v1/users                 # Create user
GET    /api/v1/users/:telegramId     # Get user by Telegram ID
PATCH  /api/v1/users/:telegramId     # Update user
```

**Sales**

```
POST   /api/v1/sales                 # Create sale
GET    /api/v1/sales?telegramId=...  # Get sales (with optional filters)
DELETE /api/v1/sales/:id             # Delete sale
```

Query parameters for `GET /api/v1/sales`:

| Param | Type | Description |
|-------|------|-------------|
| `telegramId` | string | Required. User's Telegram ID |
| `startDate` | ISO string | Filter sales from this date |
| `endDate` | ISO string | Filter sales until this date |
| `limit` | number | Max results (default: 20, max: 100) |
| `offset` | number | Skip results for pagination |

**Summary**

```
GET /api/v1/summary/today?telegramId=...               # Today's summary
GET /api/v1/summary?telegramId=...&period=today|week|month  # Summary by period
```

### API Response Format

**Success:**

```json
{
  "success": true,
  "message": "Sale recorded successfully",
  "data": { ... }
}
```

**Error:**

```json
{
  "success": false,
  "message": "Validation Error",
  "errorSources": [
    { "path": "body.price", "message": "Price must be a positive number" }
  ]
}
```

## Google Sheets Integration (Optional)

To enable automatic backup of sales to Google Sheets:

1. Create a Google Cloud project and enable the Sheets API
2. Create a service account and download the JSON key
3. Create a Google Sheet and share it with the service account email
4. Add to `.env`:

```env
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"..."}'
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
```

Sales are synced automatically. Failed syncs are retried every 5 minutes.

## Database Schema

**User**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| telegramId | String | Unique Telegram user ID |
| name | String | User's display name |
| phone | String? | Optional phone number |
| language | String | `en` or `bn` (default: `en`) |
| createdAt | DateTime | Registration timestamp |
| updatedAt | DateTime | Last update timestamp |

**Sale**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Foreign key to User |
| productName | String | Name of the product sold |
| price | Decimal(12,2) | Sale price in BDT |
| quantity | Int | Quantity sold (default: 1) |
| syncedToSheets | Boolean | Google Sheets sync status |
| createdAt | DateTime | Sale timestamp |

## Docker Deployment

### Full Stack (API + Database)

```bash
# Set required env vars
export TELEGRAM_BOT_TOKEN=your_token_here

# Build and start
docker compose up -d

# Run migrations
docker compose exec api npx prisma migrate deploy
```

### Production with Webhook

For production, set a webhook URL instead of long-polling:

```env
TELEGRAM_WEBHOOK_URL=https://your-domain.com
```

The bot will register a webhook at `https://your-domain.com/telegram-webhook`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm test` | Run tests |
| `npm run lint` | Lint source code |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio GUI |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |

## Browse Database

```bash
npx prisma studio
```

Opens a web UI at `http://localhost:5555` to view and edit Users and Sales.

## License

ISC
