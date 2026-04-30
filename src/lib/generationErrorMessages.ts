type GenerationFailureReason =
  | "format_unavailable"
  | "credits"
  | "daily_limit"
  | "database"
  | "network"
  | "session"
  | "unknown";

const cleanDetails = (details?: string) => details?.replace(/\s+/g, " ").trim().slice(0, 180);

export const getGenerationFailureMessage = (reason: GenerationFailureReason, details?: string) => {
  const safeDetails = cleanDetails(details);

  const messages: Record<GenerationFailureReason, string> = {
    format_unavailable: "Este formato não está disponível no seu plano atual. Escolha um formato liberado ou faça upgrade e tente gerar novamente.",
    credits: "Não foi possível iniciar a geração porque seus créditos são insuficientes. Compre mais créditos ou escolha uma ação disponível e tente novamente.",
    daily_limit: "Você atingiu o limite de gerações de hoje. Aguarde a liberação do próximo dia ou faça upgrade para gerar mais apps.",
    database: `Não conseguimos salvar seu app para processamento. Confira se a URL e o nome do app estão corretos e tente novamente.${safeDetails ? ` Detalhe técnico: ${safeDetails}` : ""}`,
    network: "A geração não foi enviada por instabilidade de conexão. Verifique sua internet, recarregue a página e tente novamente.",
    session: "Sua sessão pode ter expirado. Saia, entre novamente na sua conta e tente gerar o app outra vez.",
    unknown: `Não foi possível gerar o app agora. Revise a URL, confirme o nome do app e tente novamente em alguns segundos.${safeDetails ? ` Detalhe técnico: ${safeDetails}` : ""}`,
  };

  return messages[reason];
};

export const getGenerationExceptionMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  if (normalized.includes("failed to fetch") || normalized.includes("network") || normalized.includes("timeout")) {
    return getGenerationFailureMessage("network");
  }

  if (normalized.includes("jwt") || normalized.includes("auth") || normalized.includes("session")) {
    return getGenerationFailureMessage("session");
  }

  return getGenerationFailureMessage("unknown", message);
};