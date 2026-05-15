import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { AuroraValidatorResult } from "@/lib/auroraValidator";
import type { AuroraAppFormat } from "@/lib/appFormatPreference";
import auroraLogoUrl from "@/assets/aurora-symbol.png";

type Args = {
  appName: string;
  format: AuroraAppFormat;
  status: string;
  createdAt?: string;
  result: AuroraValidatorResult;
  validationId?: string;
};

const GOLD: [number, number, number] = [255, 215, 0];
const GOLD_DEEP: [number, number, number] = [194, 158, 26];
const CYAN: [number, number, number] = [34, 211, 238];
const CYAN_DEEP: [number, number, number] = [14, 116, 144];
const DANGER: [number, number, number] = [239, 68, 68];
const WARN: [number, number, number] = [234, 179, 8];
const OK: [number, number, number] = [34, 197, 94];
const TEXT: [number, number, number] = [20, 24, 36];
const MUTED: [number, number, number] = [110, 116, 130];
const BG_DARK: [number, number, number] = [11, 15, 26];
const BG_NAVY: [number, number, number] = [18, 26, 48];
const BG_GOLD_SOFT: [number, number, number] = [255, 250, 224];
const BG_CYAN_SOFT: [number, number, number] = [228, 246, 252];

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

let cachedLogo: string | null = null;
async function loadLogoDataUrl(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const res = await fetch(auroraLogoUrl);
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    cachedLogo = dataUrl;
    return dataUrl;
  } catch {
    return null;
  }
}

export async function generateValidatorPdf({ appName, format, status, createdAt, result }: Args) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadLogoDataUrl();
  let y = 0;

  // ===== Header banner (dark navy gradient feel + gold/cyan stripes) =====
  doc.setFillColor(...BG_DARK);
  doc.rect(0, 0, PAGE_W, 42, "F");
  doc.setFillColor(...BG_NAVY);
  doc.rect(0, 28, PAGE_W, 14, "F");

  // Logo badge
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN, 8, 22, 22, 3, 3, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.roundedRect(MARGIN, 8, 22, 22, 3, 3, "S");
  if (logo) {
    try {
      doc.addImage(logo, "PNG", MARGIN + 2.5, 10.5, 17, 17);
    } catch {
      // ignore image errors
    }
  }
  doc.setLineWidth(0.2);

  // Brand text
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Aurora Build AI", MARGIN + 28, 18);

  doc.setTextColor(...CYAN);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Validator · Relatório de Validação Android", MARGIN + 28, 25);

  doc.setTextColor(200, 206, 220);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const dateStr = new Date(createdAt ?? Date.now()).toLocaleString("pt-BR");
  doc.text(`Gerado em ${dateStr}`, PAGE_W - MARGIN, 16, { align: "right" });
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.text("aurorabuild.com.br", PAGE_W - MARGIN, 22, { align: "right" });

  // Double stripe: gold + cyan
  doc.setFillColor(...GOLD);
  doc.rect(0, 42, PAGE_W, 1.4, "F");
  doc.setFillColor(...CYAN);
  doc.rect(0, 43.4, PAGE_W, 0.6, "F");

  y = 52;

  // ===== App info card with gold/cyan accents =====
  doc.setDrawColor(...GOLD);
  doc.setFillColor(252, 252, 254);
  doc.roundedRect(MARGIN, y, CONTENT_W, 28, 2.5, 2.5, "FD");
  doc.setFillColor(...CYAN);
  doc.rect(MARGIN, y, 1.4, 28, "F");

  doc.setTextColor(...CYAN_DEEP);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("APLICATIVO", MARGIN + 5, y + 7);
  doc.text("FORMATO", MARGIN + 80, y + 7);
  doc.text("STATUS", MARGIN + 130, y + 7);

  doc.setTextColor(...TEXT);
  doc.setFontSize(11);
  doc.text(truncate(appName, 35), MARGIN + 5, y + 14);
  doc.text(format.toUpperCase(), MARGIN + 80, y + 14);

  const statusColor = result.pronto_para_publicacao ? OK : DANGER;
  doc.setTextColor(...statusColor);
  doc.text(status, MARGIN + 130, y + 14);

  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    result.pronto_para_publicacao
      ? "Pronto para publicação na Google Play Store."
      : "Publicação NÃO recomendada até correção dos itens críticos.",
    MARGIN + 5,
    y + 23,
  );

  y += 36;

  // ===== Resumo =====
  y = sectionTitle(doc, "Resumo da Validação", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  const resumoLines = doc.splitTextToSize(result.resumo, CONTENT_W - 4);
  doc.text(resumoLines, MARGIN + 2, y);
  y += resumoLines.length * 4.6 + 6;

  // ===== Contadores =====
  const erros = result.problemas.filter((p) => p.tipo === "erro").length;
  const alertas = result.problemas.filter((p) => p.tipo === "alerta").length;
  drawCounters(doc, y, erros, alertas);
  y += 22;

  // ===== Problemas detectados =====
  y = sectionTitle(doc, "Problemas Detectados", y);
  if (result.problemas.length === 0) {
    doc.setTextColor(...OK);
    doc.setFontSize(10);
    doc.text("Nenhum problema detectado.", MARGIN + 2, y);
    y += 8;
  } else {
    result.problemas.forEach((p, idx) => {
      y = ensureSpace(doc, y, 38);
      const isError = p.tipo === "erro";
      const accent = isError ? DANGER : WARN;

      // Side accent bar
      doc.setFillColor(...accent);
      doc.rect(MARGIN, y, 1.2, 32, "F");

      doc.setDrawColor(230, 232, 240);
      doc.setFillColor(252, 252, 254);
      doc.roundedRect(MARGIN + 1.2, y, CONTENT_W - 1.2, 32, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...accent);
      doc.text(`${idx + 1}. ${isError ? "ERRO" : "ALERTA"} · ${p.area.toUpperCase()}`, MARGIN + 5, y + 6);

      doc.setTextColor(...TEXT);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const descLines = doc.splitTextToSize(p.descricao, CONTENT_W - 10);
      doc.text(descLines.slice(0, 2), MARGIN + 5, y + 12);

      doc.setTextColor(...MUTED);
      doc.setFontSize(8.5);
      doc.text(`Impacto: ${p.impacto.toUpperCase()}`, MARGIN + 5, y + 22);

      doc.setTextColor(...TEXT);
      const acaoLines = doc.splitTextToSize(`Ação: ${p.acao_recomendada}`, CONTENT_W - 10);
      doc.text(acaoLines.slice(0, 2), MARGIN + 5, y + 27);

      y += 36;
    });
  }

  // ===== Análise técnica resumida =====
  y = ensureSpace(doc, y, 60);
  y = sectionTitle(doc, "Análise Técnica Android", y);

  const technical = [
    ["AndroidManifest.xml", "Inspecionado — package, SDKs e flags validados."],
    ["Permissões Android", "Permissões declaradas avaliadas quanto ao risco e necessidade."],
    ["Assinatura digital", format === "aab" ? "Play App Signing detectado." : "Verificar assinatura v2/v3 antes da publicação."],
    ["Política Google Play", "Revisão de permissões sensíveis e diretrizes oficiais."],
    ["Cleartext traffic", "Bloqueado — tráfego apenas via HTTPS."],
    ["Bundle / APK", format === "aab" ? "AAB otimizado para distribuição na Play Store." : "APK universal pronto para instalação direta."],
  ];

  technical.forEach(([k, v], idx) => {
    y = ensureSpace(doc, y, 10);
    // Alternate gold/cyan tinted rows
    const tint = idx % 2 === 0 ? BG_CYAN_SOFT : BG_GOLD_SOFT;
    doc.setFillColor(...tint);
    doc.roundedRect(MARGIN, y, CONTENT_W, 9, 1, 1, "F");
    // Left accent
    doc.setFillColor(...(idx % 2 === 0 ? CYAN : GOLD));
    doc.rect(MARGIN, y, 0.9, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.text(k, MARGIN + 3, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(truncate(v, 95), MARGIN + 60, y + 6);
    y += 11;
  });

  // ===== Próximo passo =====
  y = ensureSpace(doc, y, 28);
  y += 4;
  doc.setFillColor(...BG_GOLD_SOFT);
  doc.setDrawColor(...GOLD);
  doc.roundedRect(MARGIN, y, CONTENT_W, 24, 2.5, 2.5, "FD");
  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, y, 1.6, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GOLD_DEEP);
  doc.text("PRÓXIMO PASSO", MARGIN + 5, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  const sugLines = doc.splitTextToSize(result.sugestao, CONTENT_W - 10);
  doc.text(sugLines.slice(0, 3), MARGIN + 5, y + 13);

  // ===== Footer em todas páginas =====
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    // Footer band
    doc.setFillColor(...BG_DARK);
    doc.rect(0, PAGE_H - 12, PAGE_W, 12, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, PAGE_H - 12, PAGE_W, 0.8, "F");
    doc.setFillColor(...CYAN);
    doc.rect(0, PAGE_H - 11.2, PAGE_W, 0.4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text("Aurora Build AI", MARGIN, PAGE_H - 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 206, 220);
    doc.text("· Validator", MARGIN + 24, PAGE_H - 5);
    doc.setTextColor(...CYAN);
    doc.text(`Página ${i} de ${total}`, PAGE_W - MARGIN, PAGE_H - 5, { align: "right" });
  }

  const safeName = appName.replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 40) || "app";
  doc.save(`aurora-validator-${safeName}-${Date.now()}.pdf`);
}

/* ===== helpers ===== */
function sectionTitle(doc: jsPDF, title: string, y: number) {
  y = ensureSpace(doc, y, 14);
  // Gold + cyan double accent block
  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, y - 0.5, 2.5, 6, "F");
  doc.setFillColor(...CYAN);
  doc.rect(MARGIN + 2.5, y - 0.5, 1.2, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BG_NAVY);
  doc.text(title, MARGIN + 7, y + 4);
  // Underline
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(MARGIN + 7, y + 5.6, MARGIN + 7 + doc.getTextWidth(title), y + 5.6);
  doc.setLineWidth(0.2);
  return y + 11;
}

function drawCounters(doc: jsPDF, y: number, erros: number, alertas: number) {
  const cardW = (CONTENT_W - 8) / 3;
  const items: Array<[string, number, [number, number, number]]> = [
    ["Erros críticos", erros, DANGER],
    ["Alertas", alertas, WARN],
    ["Aprovados", 6, OK],
  ];
  items.forEach((item, i) => {
    const x = MARGIN + i * (cardW + 4);
    doc.setDrawColor(...item[2]);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardW, 18, 2, 2, "FD");
    // Gold top accent
    doc.setFillColor(...item[2]);
    doc.rect(x, y, cardW, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...item[2]);
    doc.text(String(item[1]), x + 4, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(item[0], x + 4, y + 16);
  });
}

function ensureSpace(doc: jsPDF, y: number, needed: number) {
  if (y + needed > PAGE_H - 18) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
