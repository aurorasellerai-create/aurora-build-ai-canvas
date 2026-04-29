export type AuroraAppFormat = "apk" | "aab" | "pwa";

const STORAGE_KEY = "aurora-selected-app-format";
export const APP_FORMAT_EVENT = "aurora-app-format-updated";

const isAuroraAppFormat = (value: unknown): value is AuroraAppFormat => {
  return value === "apk" || value === "aab" || value === "pwa";
};

export const getSelectedAppFormatPreference = (): AuroraAppFormat => {
  if (typeof window === "undefined") return "apk";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isAuroraAppFormat(stored) ? stored : "apk";
};

export const setSelectedAppFormatPreference = (format: AuroraAppFormat) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, format);
  window.dispatchEvent(new CustomEvent<AuroraAppFormat>(APP_FORMAT_EVENT, { detail: format }));
};