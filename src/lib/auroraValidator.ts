import type { AuroraAppFormat } from "@/lib/appFormatPreference";

export type AuroraValidatorStatus = "ok" | "alerta" | "erro";
export type AuroraValidatorProblemType = "erro" | "alerta";
export type AuroraValidatorArea = "fluxo" | "navegação" | "botão" | "checkout" | "performance" | "segurança";
export type AuroraValidatorImpact = "baixo" | "médio" | "alto";

export type AuroraValidatorProblem = {
  tipo: AuroraValidatorProblemType;
  area: AuroraValidatorArea;
  descricao: string;
  impacto: AuroraValidatorImpact;
  acao_recomendada: string;
};

export type AuroraValidatorResult = {
  status: AuroraValidatorStatus;
  resumo: string;
  problemas: AuroraValidatorProblem[];
  sugestao: string;
  pronto_para_publicacao: boolean;
};

const formatLabel: Record<AuroraAppFormat, string> = {
  apk: "APK",
  aab: "AAB",
  pwa: "PWA",
};

const formatSpecificChecks: Record<AuroraAppFormat, AuroraValidatorProblem[]> = {
  apk: [
    {
      tipo: "alerta",
      area: "performance",
      descricao: "Instalação local concluída, mas o primeiro carregamento pode ficar lento em alguns aparelhos.",
      impacto: "médio",
      acao_recomendada: "Testar em um celular real e reduzir recursos pesados antes de distribuir o arquivo APK.",
    },
  ],
  aab: [
    {
      tipo: "alerta",
      area: "performance",
      descricao: "Build pronta para publicação, porém o carregamento inicial merece revisão antes do envio à loja.",
      impacto: "médio",
      acao_recomendada: "Otimizar imagens e conferir o comportamento inicial exigido para publicação.",
    },
  ],
  pwa: [
    {
      tipo: "alerta",
      area: "navegação",
      descricao: "Instalação pelo navegador validada, mas o atalho inicial precisa manter navegação estável.",
      impacto: "médio",
      acao_recomendada: "Reabrir o app pelo ícone instalado e validar a primeira tela antes de divulgar.",
    },
  ],
};

export const createAuroraValidatorResult = (format: AuroraAppFormat = "apk"): AuroraValidatorResult => ({
  status: "erro",
  resumo: `O Aurora Validator analisou o app em formato ${formatLabel[format]} simulando cliques, navegação, campos, checkout, carregamento e pontos críticos antes da publicação. Foram encontrados bloqueios que precisam ser corrigidos antes de publicar.`,
  problemas: [
    {
      tipo: "erro",
      area: "botão",
      descricao: "Botão “Começar agora” não executa ação durante a simulação do fluxo principal.",
      impacto: "alto",
      acao_recomendada: "Verificar o evento de clique, link associado ou rota de destino antes de publicar.",
    },
    {
      tipo: "erro",
      area: "checkout",
      descricao: "Checkout não abriu durante o teste de finalização de compra.",
      impacto: "alto",
      acao_recomendada: "Validar o link de pagamento e testar novamente o redirecionamento completo.",
    },
    ...formatSpecificChecks[format],
  ],
  sugestao: "Corrija os erros críticos, rode o Validator novamente e publique apenas quando fluxo, navegação e checkout estiverem aprovados.",
  pronto_para_publicacao: false,
});

export const getAuroraValidatorChecks = () => [
  "Funcionamento de botões",
  "Navegação entre páginas",
  "Resposta de campos e inputs",
  "Carregamento de páginas",
  "Fluxo completo do usuário",
  "Abertura e funcionamento do checkout",
  "Possíveis travamentos e erros de interação",
  "Performance básica",
  "Pontos críticos de segurança inicial",
];

export const getAuroraValidatorSummary = (result: AuroraValidatorResult) => [
  { label: "Fluxo", value: result.problemas.some((item) => item.area === "fluxo" || item.area === "botão") ? "Ação necessária" : "OK", status: result.problemas.some((item) => item.area === "fluxo" || item.area === "botão") ? "error" : "ok" },
  { label: "Navegação", value: result.problemas.some((item) => item.area === "navegação") ? "Atenção" : "OK", status: result.problemas.some((item) => item.area === "navegação") ? "warn" : "ok" },
  { label: "Performance", value: result.problemas.some((item) => item.area === "performance") ? "Média" : "OK", status: result.problemas.some((item) => item.area === "performance") ? "warn" : "ok" },
  { label: "Checkout", value: result.problemas.some((item) => item.area === "checkout") ? "Erro detectado" : "OK", status: result.problemas.some((item) => item.area === "checkout") ? "error" : "ok" },
];