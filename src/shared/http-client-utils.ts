/**
 * Shared HTTP client utilities used by messaging, login, and LIFF clients.
 *
 * These utilities extract common patterns from the three LINE API clients
 * to reduce duplication while keeping error types domain-specific.
 */

/**
 * Extracts a safe Error from an unknown failure cause, stripping Effect internals.
 *
 * - Effect HTTP errors (HttpClientError, SchemaError, …) collapse to their `_tag`
 *   string so internal spans, traces, and request bodies never leak.
 * - Any other `Error` instance (Sequelize, network driver, native JS throw, …)
 *   keeps its `message` so callers can actually diagnose the failure instead of
 *   staring at an opaque "UnknownHttpError".
 */
export const sanitizedCause = (cause: unknown): Error => {
  if (typeof cause !== "object" || cause === null) {
    return new Error("UnknownHttpError");
  }

  if ("reason" in cause) {
    const reason = cause.reason;
    if (typeof reason === "object" && reason !== null && "_tag" in reason) {
      return new Error(String(reason._tag));
    }
  }

  if ("_tag" in cause) {
    return new Error(String(cause._tag));
  }

  if (cause instanceof Error) {
    return new Error(safeErrorMessage(cause));
  }

  return new Error("UnknownHttpError");
};

const safeErrorMessage = (error: Error): string => {
  try {
    if (error.message) {
      return error.message;
    }
  } catch {
    // Some Effect-backed errors compute `message` lazily and can throw if they
    // touch wiped redacted values while we are trying to sanitize them.
  }

  return error.constructor.name || "UnknownError";
};

/** Removes trailing slashes from a URL string. */
export const withoutTrailingSlash = (value: string) => value.replace(/\/+$/, "");
