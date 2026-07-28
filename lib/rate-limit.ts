import { env } from "cloudflare:workers";

type D1Like = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
      first<T>(): Promise<T | null>;
    };
    run(): Promise<unknown>;
  };
  batch(statements: unknown[]): Promise<unknown>;
};

type RuntimeEnv = {
  DB?: D1Like;
  DEMO_RATE_SALT?: string;
  DEMO_PER_IP_PER_HOUR?: string;
  DEMO_GLOBAL_PER_DAY?: string;
};

const CREATE_LIMIT_TABLE = `CREATE TABLE IF NOT EXISTS demo_rate_limits (
  scope TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope, client_hash)
)`;

async function hashClient(value: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

function numberSetting(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function checkRateLimit(request: Request) {
  const runtime = env as unknown as RuntimeEnv;
  if (!runtime.DB) return { allowed: true, remaining: null };

  const now = new Date();
  const hour = now.toISOString().slice(0, 13);
  const day = now.toISOString().slice(0, 10);
  const timestamp = Date.now();
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local-preview";
  const clientHash = await hashClient(
    ip,
    runtime.DEMO_RATE_SALT || "trade-agent-demo",
  );
  const perIpLimit = numberSetting(runtime.DEMO_PER_IP_PER_HOUR, 20);
  const globalLimit = numberSetting(runtime.DEMO_GLOBAL_PER_DAY, 500);

  await runtime.DB.prepare(CREATE_LIMIT_TABLE).run();

  const increment = `INSERT INTO demo_rate_limits (scope, client_hash, request_count, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(scope, client_hash)
    DO UPDATE SET request_count = request_count + 1, updated_at = excluded.updated_at`;

  const perIpStatement = runtime.DB
    .prepare(increment)
    .bind(`hour:${hour}`, clientHash, timestamp);
  const globalStatement = runtime.DB
    .prepare(increment)
    .bind(`day:${day}`, "*", timestamp);
  await runtime.DB.batch([perIpStatement, globalStatement]);

  const countQuery =
    "SELECT request_count AS count FROM demo_rate_limits WHERE scope = ? AND client_hash = ?";
  const [perIp, global] = await Promise.all([
    runtime.DB
      .prepare(countQuery)
      .bind(`hour:${hour}`, clientHash)
      .first<{ count: number }>(),
    runtime.DB
      .prepare(countQuery)
      .bind(`day:${day}`, "*")
      .first<{ count: number }>(),
  ]);

  const perIpCount = perIp?.count ?? 0;
  const globalCount = global?.count ?? 0;
  return {
    allowed: perIpCount <= perIpLimit && globalCount <= globalLimit,
    remaining: Math.max(0, Math.min(perIpLimit - perIpCount, globalLimit - globalCount)),
    retryAfterSeconds: 3600,
  };
}
