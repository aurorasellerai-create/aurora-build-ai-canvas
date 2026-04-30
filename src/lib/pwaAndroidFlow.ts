export const pwaAndroidFlowSteps = [
  "Receber URL ou ideia do aplicativo",
  "Gerar base PWA limpa e instalável",
  "Validar responsividade, navegação e carregamento",
  "Gerar Android com TWA quando compatível",
  "Usar WebView como fallback seguro para MVP",
  "Exportar APK para testes, AAB para Play Store e PWA para compartilhamento",
];

export const pwaAndroidImplementations = [
  {
    title: "TWA oficial Google",
    description: "Usa a base PWA para entregar experiência Android mais próxima de app nativo.",
    badge: "Padrão ideal",
  },
  {
    title: "WebView fallback",
    description: "Abre a base web dentro do app quando TWA ainda não é compatível com o projeto.",
    badge: "Rápido para MVP",
  },
  {
    title: "PWA instalável",
    description: "Mantém uma versão por link, instalável no Android e iPhone pelo navegador.",
    badge: "Sem loja",
  },
];

export const pwaAndroidOutputs = [
  { label: "APK", description: "Instalação manual para testes locais" },
  { label: "AAB", description: "Formato ideal para publicar na Google Play" },
  { label: "PWA", description: "App instalável por link no navegador" },
];