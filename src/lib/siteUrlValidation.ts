import { z } from "zod";

const siteUrlSchema = z
  .string()
  .trim()
  .min(1, "Informe a URL do site para continuar.")
  .max(2048, "A URL está muito longa. Use um link mais curto.")
  .refine((value) => /^https?:\/\//i.test(value), "A URL precisa começar com https:// ou http://")
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
    value: result.data,
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