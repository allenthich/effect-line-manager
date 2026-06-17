/**
 * Shared HTTP client utilities used by messaging, login, and LIFF clients.
 *
 * These utilities extract common patterns from the three LINE API clients
 * to reduce duplication while keeping error types domain-specific.
 */

/** Extracts a safe Error from an unknown HTTP failure cause, stripping Effect internals. */
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

  return new Error("UnknownHttpError");
};

/** Removes trailing slashes from a URL string. */
export const withoutTrailingSlash = (value: string) => value.replace(/\/+$/, "");
