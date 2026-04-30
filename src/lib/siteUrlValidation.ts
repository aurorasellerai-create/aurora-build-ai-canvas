import { z } from "zod";

const NORMALIZED_SITE_URL_HISTORY_KEY = "aurora-normalized-site-url-history";
const NORMALIZED_SITE_URL_HISTORY_LIMIT = 5;

const normalizeSiteUrl = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(trimmed)) return `https://${trimmed}`;

  return trimmed;
};

const siteUrlSchema = z
  .string()
  .trim()
  .min(1, "Informe a URL do site para continuar.")
  .max(2048, "A URL está muito longa. Use um link mais curto.")
  .transform(normalizeSiteUrl)
  .refine((value) => /^https?:\/\//i.test(value), "Digite uma URL válida, como https://meusite.com")
  .refine((value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname.includes("."));
    } catch {
      return false;
    }
  }, "Digite uma URL válida, como https://meusite.com");

export const validateSiteUrl = (value: string) => {
  const result = siteUrlSchema.safeParse(value);

  if (!result.success) {
    return {
      isValid: false,
      message: result.error.issues[0]?.message ?? "Digite uma URL válida.",
      value: value.trim(),
    };
  }

  return {
    isValid: true,
    message: "",
    value: new URL(result.data).href,
  };
};

export const getSiteUrlPreview = (value: string) => {
  try {
    const url = new URL(value.trim());

    return {
      protocol: url.protocol.replace(":", "").toUpperCase(),
      domain: url.hostname,
    };
  } catch {
    return null;
  }
};

export const getNormalizedSiteUrlHistory = (): string[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(NORMALIZED_SITE_URL_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

export const saveNormalizedSiteUrlToHistory = (value: string) => {
  if (typeof window === "undefined") return [];

  const validation = validateSiteUrl(value);
  if (!validation.isValid) return getNormalizedSiteUrlHistory();

  const next = [validation.value, ...getNormalizedSiteUrlHistory().filter((item) => item !== validation.value)].slice(0, NORMALIZED_SITE_URL_HISTORY_LIMIT);
  window.localStorage.setItem(NORMALIZED_SITE_URL_HISTORY_KEY, JSON.stringify(next));
  return next;
};