import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

// NOTE: This project originally targeted PostgreSQL (pg-core). The sandbox only
// ships SQLite, so the schema is expressed with drizzle's sqlite-core driver.
// Query call-sites across /src/app/api and /src/lib are unchanged.
//
// Type mapping:
//   serial  -> integer primaryKey autoincrement
//   varchar -> text (length is advisory, ignored by sqlite)
//   numeric -> text (preserves string semantics; reads via Number(...))
//   timestamp -> integer mode:timestamp (epoch ms, returns Date)
//   boolean -> integer mode:boolean
//   defaultNow() -> default(() => new Date()) (reliable across sqlite)

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    country: text("country").default("Kenya"),
    accountMode: text("account_mode").notNull().default("demo"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const wallets = sqliteTable(
  "wallets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currency: text("currency").notNull(),
    kind: text("kind").notNull(), // demo | real
    label: text("label").notNull(),
    address: text("address"),
    balance: text("balance").notNull().default("0"),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("wallet_user_currency_idx").on(t.userId, t.currency, t.kind)],
);

export const instruments = sqliteTable("instruments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  klass: text("klass").notNull(), // crypto | forex | index | stock | metal
  basePrice: text("base_price").notNull(),
  decimals: integer("decimals").notNull().default(2),
  volatility: text("volatility").notNull().default("0.0015"),
  payoutBp: integer("payout_bp").notNull().default(8700),
  exchange: text("exchange").notNull().default("MERIDIAN"),
  spread: text("spread").notNull().default("0.0002"),
  binary: integer("binary", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const trades = sqliteTable(
  "trades",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    klass: text("klass").notNull(),
    mode: text("mode").notNull().default("demo"),
    product: text("product").notNull(), // spot | forex | binary
    side: text("side").notNull(), // buy | sell | up | down
    amount: text("amount").notNull(),
    quantity: text("quantity").notNull().default("0"),
    leverage: integer("leverage").notNull().default(1),
    entryPrice: text("entry_price").notNull(),
    exitPrice: text("exit_price"),
    stopLoss: text("stop_loss"),
    takeProfit: text("take_profit"),
    expiry: integer("expiry", { mode: "timestamp" }),
    payoutBp: integer("payout_bp").default(8700),
    status: text("status").notNull().default("open"), // open | closed | won | lost
    pnl: text("pnl").default("0"),
    openedAt: integer("opened_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    closedAt: integer("closed_at", { mode: "timestamp" }),
  },
  (t) => [index("trades_user_idx").on(t.userId), index("trades_status_idx").on(t.status)],
);

export const signals = sqliteTable(
  "signals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol").notNull(),
    klass: text("klass").notNull(),
    direction: text("direction").notNull(), // long | short
    timeframe: text("timeframe").notNull().default("H1"),
    entry: text("entry").notNull(),
    stop: text("stop").notNull(),
    target: text("target").notNull(),
    confidence: integer("confidence").notNull().default(70),
    source: text("source").notNull().default("Meridian Quant"),
    headline: text("headline").notNull(),
    note: text("note"),
    status: text("status").notNull().default("active"), // active | hit | invalid
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("signals_status_idx").on(t.status)],
);

export const deposits = sqliteTable(
  "deposits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: text("method").notNull(), // mpesa | usdt | mastercard | visa | eth | btc
    amount: text("amount").notNull(),
    currency: text("currency").notNull().default("KES"),
    reference: text("reference").notNull(),
    channelNote: text("channel_note"),
    status: text("status").notNull().default("pending"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    settledAt: integer("settled_at", { mode: "timestamp" }),
  },
  (t) => [index("deposits_user_idx").on(t.userId)],
);

export const watchlist = sqliteTable(
  "watchlist",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("watch_user_symbol_idx").on(t.userId, t.symbol)],
);

export type User = typeof users.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Instrument = typeof instruments.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Signal = typeof signals.$inferSelect;
export type Deposit = typeof deposits.$inferSelect;
