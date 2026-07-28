import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const demoRateLimits = sqliteTable(
  "demo_rate_limits",
  {
    scope: text("scope").notNull(),
    clientHash: text("client_hash").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.scope, table.clientHash] })],
);
