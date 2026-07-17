// Lightweight logger for Workers (console-based; structured).
type Fields = Record<string, unknown>;

function log(level: string, a?: Fields | string, b?: string) {
  const obj = typeof a === "object" ? a : undefined;
  const msg = typeof a === "string" ? a : b;
  const line = { level, msg, ...(obj || {}), time: new Date().toISOString() };
  if (level === "error") console.error(JSON.stringify(line));
  else if (level === "warn") console.warn(JSON.stringify(line));
  else console.log(JSON.stringify(line));
}

export const logger = {
  debug: (a?: Fields | string, b?: string) => log("debug", a, b),
  info: (a?: Fields | string, b?: string) => log("info", a, b),
  warn: (a?: Fields | string, b?: string) => log("warn", a, b),
  error: (a?: Fields | string, b?: string) => log("error", a, b),
};
