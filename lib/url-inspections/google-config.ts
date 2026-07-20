import "server-only";

export const GOOGLE_URL_INSPECTION_API_VERSION = "v1";
export const GOOGLE_URL_INSPECTION_ENDPOINT =
  `https://searchconsole.googleapis.com/${GOOGLE_URL_INSPECTION_API_VERSION}/urlInspection/index:inspect`;
export const DEFAULT_URL_INSPECTION_LANGUAGE_CODE = "en-US";
export const URL_INSPECTION_REQUEST_TIMEOUT_MS = 15_000;
