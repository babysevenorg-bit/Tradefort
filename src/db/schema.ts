import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 180 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    country: varchar("country", { length: 64 }).default("Kenya"),
    accountMode: varchar("account_mode", { length: 12 }).notNull().default("demo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const wallets = pgTable(
  "wallets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 12 }).notNull(),
    kind: varchar("kind", { length: 12 }).notNull(), // demo | real
    label: varchar("label", { length: 60 }).notNull(),
    address: varchar("address", { length: 90 }),
    balance: numeric("balance", { precision: 18, scale: 2 }).notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("wallet_user_currency_idx").on(t.userId, t.currency, t.kind)],
);

export const instruments = pgTable("instruments", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 24 }).notNull().unique(),
  name: varchar("name", { length: 90 }).notNull(),
  klass: varchar("klass", { length: 16 }).notNull(), // crypto | forex | index | stock | metal
  basePrice: numeric("base_price", { precision: 18, scale: 6 }).notNull(),
  decimals: integer("decimals").notNull().default(2),
  volatility: numeric("volatility", { precision: 10, scale: 6 }).notNull().default("0.0015"),
  payoutBp: integer("payout_bp").notNull().default(8700),
  exchange: varchar("exchange", { length: 40 }).notNull().default("MERIDIAN"),
  spread: numeric("spread", { precision: 10, scale: 6 }).notNull().default("0.0002"),
  binary: boolean("binary").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trades = pgTable(
  "trades",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 24 }).notNull(),
    klass: varchar("klass", { length: 16 }).notNull(),
    mode: varchar("mode", { length: 12 }).notNull().default("demo"),
    product: varchar("product", { length: 12 }).notNull(), // spot | forex | binary
    side: varchar("side", { length: 8 }).notNull(), // buy | sell | up | down
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 8 }).notNull().default("0"),
    leverage: integer("leverage").notNull().default(1),
    entryPrice: numeric("entry_price", { precision: 18, scale: 6 }).notNull(),
    exitPrice: numeric("exit_price", { precision: 18, scale: 6 }),
    stopLoss: numeric("stop_loss", { precision: 18, scale: 6 }),
    takeProfit: numeric("take_profit", { precision: 18, scale: 6 }),
    expiry: timestamp("expiry", { withTimezone: true }),
    payoutBp: integer("payout_bp").default(8700),
    status: varchar("status", { length: 12 }).notNull().default("open"), // open | closed | won | lost
    pnl: numeric("pnl", { precision: 18, scale: 2 }).default("0"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [index("trades_user_idx").on(t.userId), index("trades_status_idx").on(t.status)],
);

export const signals = pgTable(
  "signals",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 24 }).notNull(),
    klass: varchar("klass", { length: 16 }).notNull(),
    direction: varchar("direction", { length: 6 }).notNull(), // long | short
    timeframe: varchar("timeframe", { length: 8 }).notNull().default("H1"),
    entry: numeric("entry", { precision: 18, scale: 6 }).notNull(),
    stop: numeric("stop", { precision: 18, scale: 6 }).notNull(),
    target: numeric("target", { precision: 18, scale: 6 }).notNull(),
    confidence: integer("confidence").notNull().default(70),
    source: varchar("source", { length: 40 }).notNull().default("Meridian Quant"),
    headline: varchar("headline", { length: 160 }).notNull(),
    note: text("note"),
    status: varchar("status", { length: 12 }).notNull().default("active"), // active | hit | invalid
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("signals_status_idx").on(t.status)],
);

export const deposits = pgTable(
  "deposits",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 20 }).notNull(), // mpesa | usdt | mastercard | visa | eth | btc
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 12 }).notNull().default("KES"),
    reference: varchar("reference", { length: 40 }).notNull(),
    channelNote: varchar("channel_note", { length: 90 }),
    status: varchar("status", { length: 12 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (t) => [index("deposits_user_idx").on(t.userId)],
);

export const watchlist = pgTable(
  "watchlist",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 24 }).notNull(),
    note: varchar("note", { length: 90 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("watch_user_symbol_idx").on(t.userId, t.symbol)],
);

export type User = typeof users.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Instrument = typeof instruments.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Signal = typeof signals.$inferSelect;
export type Deposit = typeof deposits.$inferSelect;
