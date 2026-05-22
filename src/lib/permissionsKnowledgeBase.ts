/**
 * Aurora Validator AI — Knowledge Base
 * Base curada de permissões Android, vulnerabilidades e políticas Play Store
 * usada pelo engine de explicação inteligente (generateAiExplanation).
 */

export type AiSeverity = "critical" | "warning" | "safe";

export type PermissionKnowledgeEntry = {
  /** Identificador (nome da permissão, chave do manifest ou chave de scan) */
  key: string;
  /** Aliases reconhecidos pelo engine (ex.: variações com prefixo android.permission.) */
  aliases?: string[];
  severity: AiSeverity;
  title: string;
  /** Explicação humana, em português, sem jargão técnico desnecessário */
  explanation: string;
  /** Impacto técnico real no app */
  impact: string;
  /** Risco específico de rejeição/penalização na Play Store */
  playStoreRisk: string;
  /** Risco de segurança / privacidade */
  securityRisk: string;
  /** Recomendação acionável e objetiva */
  recommendation: string;
  /** Link da documentação oficial */
  docs: string;
  /** Link da política Play Store quando aplicável */
  playStorePolicy?: string;
};

const ANDROID_DOCS = "https://developer.android.com/reference/android/Manifest.permission";
const PLAY_POLICY = "https://support.google.com/googleplay/android-developer/answer/9888170";

export const PERMISSIONS_KNOWLEDGE_BASE: PermissionKnowledgeEntry[] = [
  {
    key: "REQUEST_INSTALL_PACKAGES",
    severity: "critical",
    title: "Instalação de APKs externos",
    explanation:
      "Essa permissão deixa o aplicativo instalar outros APKs diretamente no celular do usuário, sem passar pela Google Play. É um recurso muito poderoso e raramente necessário.",
    impact:
      "Permite que o app baixe e instale qualquer outro aplicativo Android, podendo modificar o comportamento do dispositivo de forma silenciosa.",
    playStoreRisk:
      "A Google Play Store rejeita publicações que usam essa permissão sem justificativa clara, exceto para gerenciadores de arquivos, lojas de apps ou ferramentas corporativas autorizadas.",
    securityRisk:
      "Se explorada, abre porta para distribuição de malware, instalação de apps falsificados e ataques de engenharia social.",
    recommendation:
      "Remova a permissão do AndroidManifest.xml se o app não for um instalador autorizado. Se for essencial, prepare justificativa detalhada para o formulário de envio à Play Store.",
    docs: `${ANDROID_DOCS}#REQUEST_INSTALL_PACKAGES`,
    playStorePolicy: PLAY_POLICY,
  },
  {
    key: "WRITE_EXTERNAL_STORAGE",
    severity: "warning",
    title: "Gravação em armazenamento externo (legado)",
    explanation:
      "Permite escrever arquivos em pastas públicas do celular. Desde o Android 10, o sistema usa Scoped Storage e essa permissão é considerada legada.",
    impact:
      "No Android 13+, a permissão é simplesmente ignorada e pode poluir o manifesto, gerando avisos do Play Console.",
    playStoreRisk:
      "Apps que continuam pedindo essa permissão sem necessidade real recebem alertas no Play Console e podem ter publicação retida por uso inadequado de armazenamento.",
    securityRisk:
      "Em versões antigas do Android, dá acesso amplo a arquivos do usuário, expondo fotos, downloads e documentos pessoais.",
    recommendation:
      "Migre para Scoped Storage usando MediaStore ou Storage Access Framework. Caso ainda precise da permissão para Android ≤ 9, adicione android:maxSdkVersion=\"28\".",
    docs: "https://developer.android.com/training/data-storage",
  },
  {
    key: "READ_MEDIA_IMAGES",
    severity: "warning",
    title: "Acesso à galeria de imagens",
    explanation:
      "Permite que o app leia todas as imagens do celular do usuário, inclusive prints, fotos pessoais e capturas de tela.",
    impact:
      "Concede acesso amplo a mídia, mesmo que o app só precise de uma foto pontual.",
    playStoreRisk:
      "A Google Play exige justificativa clara para essa permissão. O ideal é usar o Photo Picker, que não requer permissão e atende a política Photo and Video Permissions.",
    securityRisk:
      "Acesso indevido pode expor dados pessoais sensíveis (documentos fotografados, conversas, comprovantes).",
    recommendation:
      "Sempre que possível, use o Photo Picker do Android 13+ no lugar dessa permissão. Solicite READ_MEDIA_IMAGES apenas se o app precisar listar toda a galeria.",
    docs: "https://developer.android.com/training/data-storage/shared/photopicker",
    playStorePolicy:
      "https://support.google.com/googleplay/android-developer/answer/14115180",
  },
  {
    key: "SYSTEM_ALERT_WINDOW",
    severity: "critical",
    title: "Sobreposição de tela",
    explanation:
      "Permite desenhar janelas por cima de outros aplicativos. É a base de overlays, balões flutuantes — e também de muitos golpes.",
    impact:
      "Pode interceptar cliques do usuário, capturar credenciais e simular telas de outros apps.",
    playStoreRisk:
      "A Play Store restringe fortemente essa permissão e remove apps que a usam para mascarar interfaces ou exibir anúncios fora de contexto.",
    securityRisk:
      "É a permissão favorita de malwares bancários, que sobrepõem telas falsas para roubar dados.",
    recommendation:
      "Remova se possível. Se for essencial (acessibilidade, chat flutuante), justifique no envio e siga as orientações da política de Permissões Sensíveis.",
    docs: `${ANDROID_DOCS}#SYSTEM_ALERT_WINDOW`,
    playStorePolicy: PLAY_POLICY,
  },
  {
    key: "QUERY_ALL_PACKAGES",
    severity: "critical",
    title: "Consulta de todos os apps instalados",
    explanation:
      "Permite ao aplicativo ver a lista completa de apps instalados no celular do usuário. O Google considera isso informação sensível.",
    impact:
      "Expõe perfil completo do usuário (quais bancos usa, redes sociais, jogos, ferramentas profissionais).",
    playStoreRisk:
      "A Play exige justificativa específica e só aprova em casos como antivírus, gerenciadores de dispositivo e ferramentas de acessibilidade.",
    securityRisk:
      "Pode ser usado para fingerprinting, perfilamento do usuário e ataques direcionados.",
    recommendation:
      "Use a tag <queries> no manifesto para declarar apenas os apps que você realmente precisa consultar.",
    docs: "https://developer.android.com/training/package-visibility",
    playStorePolicy:
      "https://support.google.com/googleplay/android-developer/answer/10158779",
  },
  {
    key: "ACCESS_FINE_LOCATION",
    severity: "warning",
    title: "Localização precisa por GPS",
    explanation:
      "Permite obter a localização exata do usuário (até poucos metros). É considerada permissão sensível.",
    impact:
      "Tem custo de bateria, exige diálogo de runtime e justificativa explícita.",
    playStoreRisk:
      "O Play Console exige preenchimento do formulário de Localização e justificativa clara para uso em background.",
    securityRisk:
      "Vazamento da localização precisa pode revelar endereço residencial, rotinas e padrões de deslocamento.",
    recommendation:
      "Use ACCESS_COARSE_LOCATION quando precisão exata não for necessária. Solicite a permissão apenas quando o usuário acionar o recurso correspondente.",
    docs: `${ANDROID_DOCS}#ACCESS_FINE_LOCATION`,
  },
  {
    key: "CAMERA",
    severity: "warning",
    title: "Acesso à câmera",
    explanation:
      "Permite tirar fotos e gravar vídeos. Sensível por permitir captura visual do ambiente do usuário.",
    impact:
      "Requer permissão runtime e tratamento adequado de ciclo de vida para não manter a câmera aberta sem necessidade.",
    playStoreRisk:
      "Apps que pedem CAMERA sem motivo evidente recebem rejeições por uso desproporcional de permissão sensível.",
    securityRisk:
      "Mal utilizada, pode capturar imagem do usuário sem aviso visível.",
    recommendation:
      "Justifique o uso na descrição da Play Store e solicite apenas quando o usuário interagir com um botão de câmera.",
    docs: `${ANDROID_DOCS}#CAMERA`,
  },
  {
    key: "RECORD_AUDIO",
    severity: "warning",
    title: "Gravação de áudio",
    explanation:
      "Permite acessar o microfone para gravar áudio. Considerada permissão crítica pela política do Google.",
    impact:
      "Pode ser usada para reconhecimento de fala, gravação de vídeo e chamadas — e também para escuta indevida.",
    playStoreRisk:
      "Solicitar sem necessidade clara gera rejeição. Uso em background exige justificativa adicional.",
    securityRisk:
      "Captura ambiente do usuário, podendo expor conversas privadas se mal implementada.",
    recommendation:
      "Justifique o uso e implemente indicadores visuais de gravação. Não acesse o microfone em background sem motivo essencial.",
    docs: `${ANDROID_DOCS}#RECORD_AUDIO`,
  },
  {
    key: "POST_NOTIFICATIONS",
    severity: "safe",
    title: "Envio de notificações (Android 13+)",
    explanation:
      "Necessária para enviar notificações no Android 13 ou superior. Padrão para a maioria dos apps modernos.",
    impact:
      "Sem essa permissão, o usuário não recebe notificações push.",
    playStoreRisk:
      "Sem risco se usada para notificações legítimas. Apps abusivos podem ser sinalizados por usuários.",
    securityRisk:
      "Baixo risco. Cuidado apenas com conteúdo sensível exibido em notificações.",
    recommendation:
      "Solicite a permissão no momento certo (após o usuário entender o valor) e evite spam.",
    docs: `${ANDROID_DOCS}#POST_NOTIFICATIONS`,
  },
  {
    key: "INTERNET",
    severity: "safe",
    title: "Acesso à internet",
    explanation:
      "Permissão padrão usada por quase todos os aplicativos modernos para se comunicar com APIs e servidores.",
    impact:
      "Necessária para qualquer tráfego de rede, incluindo WebView, Firebase e analytics.",
    playStoreRisk:
      "Sem risco. Sua ausência é mais suspeita do que sua presença.",
    securityRisk:
      "Combinada com cleartextTraffic=true ou domínios HTTP, pode expor dados sensíveis.",
    recommendation:
      "Mantenha a permissão e garanta que todo tráfego use HTTPS com certificate pinning quando possível.",
    docs: `${ANDROID_DOCS}#INTERNET`,
  },
  {
    key: "manifest:usesCleartextTraffic",
    aliases: ["cleartext", "usesCleartextTraffic"],
    severity: "critical",
    title: "Cleartext Traffic habilitado",
    explanation:
      "O app está permitindo tráfego HTTP sem criptografia, expondo dados que trafegam pela rede.",
    impact:
      "Qualquer um na mesma rede Wi-Fi pode interceptar requisições, senhas e tokens.",
    playStoreRisk:
      "A Play Store recomenda fortemente HTTPS-only. Apps detectados com cleartext recebem alertas e podem ser sinalizados por políticas de segurança.",
    securityRisk:
      "Crítico: ataques man-in-the-middle, vazamento de credenciais e sequestro de sessão.",
    recommendation:
      "Defina android:usesCleartextTraffic=\"false\" no manifest e use HTTPS em todas as APIs. Para exceções pontuais, use Network Security Config.",
    docs: "https://developer.android.com/training/articles/security-config",
  },
  {
    key: "manifest:signing:debug",
    aliases: ["debug keystore", "Debug keystore"],
    severity: "critical",
    title: "Assinado com Debug Keystore",
    explanation:
      "O aplicativo está assinado com a chave de debug, que não é segura e nunca pode ser usada em produção.",
    impact:
      "A Play Store rejeita automaticamente qualquer envio assinado com chave de debug.",
    playStoreRisk:
      "Bloqueio imediato no upload. O app não passa nem da validação inicial.",
    securityRisk:
      "Qualquer desenvolvedor pode gerar um APK com a mesma chave, comprometendo a integridade.",
    recommendation:
      "Gere um keystore de release seguro, ative o Play App Signing e nunca commit o keystore no repositório.",
    docs: "https://developer.android.com/studio/publish/app-signing",
  },
  {
    key: "manifest:targetSdkVersion",
    aliases: ["targetSdkVersion", "targetSdk"],
    severity: "warning",
    title: "targetSdkVersion desatualizado",
    explanation:
      "O app está apontando para uma versão antiga do Android. Isso reduz proteções automáticas e pode bloquear novas publicações.",
    impact:
      "Sem acesso a melhorias de privacidade, performance e novas APIs.",
    playStoreRisk:
      "A Google Play exige targetSdk recente (atualmente 34 ou superior). Apps abaixo do mínimo não podem ser publicados nem atualizados.",
    securityRisk:
      "Permissões antigas se comportam de modo mais permissivo, ampliando superfície de ataque.",
    recommendation:
      "Atualize targetSdkVersion para 34 (Android 14) ou superior e revise mudanças de comportamento documentadas.",
    docs: "https://developer.android.com/distribute/best-practices/develop/target-sdk",
  },
  {
    key: "manifest:allowBackup",
    aliases: ["allowBackup"],
    severity: "warning",
    title: "Backup automático habilitado",
    explanation:
      "Permite que o Android faça backup automático dos dados do app, incluindo arquivos potencialmente sensíveis.",
    impact:
      "Dados locais podem ser copiados via ADB ou Google Drive sem controle do app.",
    playStoreRisk:
      "Sem rejeição direta, mas pode aparecer em auditorias de segurança e LGPD.",
    securityRisk:
      "Vaza dados sensíveis (tokens, cache, preferências) se o app armazenar informações críticas.",
    recommendation:
      "Defina android:allowBackup=\"false\" ou configure regras finas em fullBackupContent.",
    docs: "https://developer.android.com/guide/topics/data/autobackup",
  },
  {
    key: "scan:apk-debug",
    aliases: ["APK debug", "debuggable"],
    severity: "critical",
    title: "Build de debug detectada",
    explanation:
      "O aplicativo está marcado como debuggable, expondo logs, ferramentas de depuração e estado interno.",
    impact:
      "Qualquer pessoa com acesso ao dispositivo pode inspecionar e modificar o app em tempo de execução.",
    playStoreRisk:
      "A Play Store bloqueia uploads com android:debuggable=\"true\" em produção.",
    securityRisk:
      "Permite injeção de código, leitura de variáveis, bypass de validações.",
    recommendation:
      "Use sempre uma build de release. Remova android:debuggable do manifest e garanta minify/R8 ativos.",
    docs: "https://developer.android.com/studio/publish/preparing",
  },
  {
    key: "scan:sdk-vulnerable",
    aliases: ["SDK vulnerável", "CVE"],
    severity: "critical",
    title: "SDK vulnerável detectado",
    explanation:
      "Uma das bibliotecas usadas pelo app possui CVE conhecida ou versão fora de suporte.",
    impact:
      "Pode permitir execução remota de código, leitura de memória ou bypass de autenticação.",
    playStoreRisk:
      "A Play Store notifica desenvolvedores e pode remover apps com vulnerabilidades críticas não corrigidas.",
    securityRisk:
      "Alto: exposição direta de usuários a exploits públicos.",
    recommendation:
      "Atualize a dependência para a versão patchada o quanto antes e revise o relatório de CVEs.",
    docs: "https://support.google.com/faqs/answer/7668646",
  },
];

/** Catálogo indexado para lookup rápido (case-insensitive). */
const INDEX = new Map<string, PermissionKnowledgeEntry>();
PERMISSIONS_KNOWLEDGE_BASE.forEach((entry) => {
  INDEX.set(entry.key.toLowerCase(), entry);
  entry.aliases?.forEach((alias) => INDEX.set(alias.toLowerCase(), entry));
});

export function findPermissionKnowledge(key: string): PermissionKnowledgeEntry | undefined {
  if (!key) return undefined;
  const k = key.toLowerCase().replace(/^android\.permission\./, "").trim();
  return INDEX.get(k) ?? INDEX.get(key.toLowerCase());
}
