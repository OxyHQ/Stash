// The backend's one logging abstraction, the shape create-oxy-app scaffolds:
// `debug` and `info` are what @oxy.so/db's migrator expects of a logger, so
// this object is handed to `runMigrations` directly.
export const logger = {
  debug: (message: string, ...args: unknown[]): void =>
    console.debug(`[debug] ${message}`, ...args),
  info: (message: string, ...args: unknown[]): void => console.log(`[info] ${message}`, ...args),
  warn: (message: string, ...args: unknown[]): void => console.warn(`[warn] ${message}`, ...args),
  error: (message: string, ...args: unknown[]): void =>
    console.error(`[error] ${message}`, ...args),
};
