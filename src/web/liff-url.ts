import { normalizeAdditionalUrlParameters } from "../liff/domain.ts";

const LIFF_URL_BASE = "https://liff.line.me/";

/** Builds a public LIFF launch URL from a LIFF ID and optional query parameters. */
export const buildLiffUrl = (liffId: string, additionalParameters = ""): string => {
  const baseUrl = `${LIFF_URL_BASE}${liffId}`;
  const parameters = normalizeAdditionalUrlParameters(additionalParameters);
  return parameters === "" ? baseUrl : `${baseUrl}?${parameters}`;
};
