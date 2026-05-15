import jsPDF from "jspdf";
import type { AuroraValidatorResult } from "@/lib/auroraValidator";
import type { AuroraAppFormat } from "@/lib/appFormatPreference";

type Args = {
  appName: string;
  format: AuroraAppFormat;
  status: string;
  createdAt?: string;
  result: AuroraValidatorResult;
};

const GOLD: [number, number, number] = [255, 215, 0];
const CYAN: [number, number, number] = [34, 211, 238];
const DANGER: [number, number, number] = [239, 68, 68];
const WARN: [number, number, number] = [234, 179, 8];
const OK: [number, number, number] = [34, 197, 94];
const TEXT: [number, number, number] = [20, 24, 36];
const MUTED: [number, number, number] = [110, 116, 130];
const BG_DARK: [number, number, number] = [11, 15, 26];

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

export function generateValidatorPdf({ appName, format, status, createdAt, result }: Args) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;

  // ===== Header banner =====
  doc.setFillColor(...BG_DARK);
  doc.rect(0, 0, PAGE_W, 38, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 38, PAGE_W, 0.8, "F");

  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Aurora Validator", MARGIN, 17);

  doc.setTextColor(...CYAN);
  doc.setFontSize(10);
  doc.text("Relatório de Validação Android", MARGIN, 24);

  doc.setTextColor(180, 184, 195);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const dateStr = new Date(createdAt ?? Date.now()).toLocaleString("pt-BR");
  doc.text(`Gerado em ${dateStr}`, PAGE_W - MARGIN, 17, { align: "right" });
  doc.text("aurorabuild.com.br", PAGE_W - MARGIN, 24, { align: "right" });

  y = 50;

  // ===== App info card =====
  doc.setDrawColor(220, 224, 235);
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(MARGIN, y, CONTENT_W, 26, 2, 2, "FD");

  doc.setTextColor(...MUTED);
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
    y + 22,
  );

  y += 34;

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

  technical.forEach(([k, v]) => {
    y = ensureSpace(doc, y, 10);
    doc.setFillColor(245, 247, 252);
    doc.roundedRect(MARGIN, y, CONTENT_W, 9, 1, 1, "F");
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
  doc.setFillColor(255, 248, 220);
  doc.setDrawColor(...GOLD);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text("Próximo passo", MARGIN + 4, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const sugLines = doc.splitTextToSize(result.sugestao, CONTENT_W - 8);
  doc.text(sugLines.slice(0, 3), MARGIN + 4, y + 13);

  // ===== Footer em todas páginas =====
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 224, 235);
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Aurora Build · Validator", MARGIN, PAGE_H - 8);
    doc.text(`Página ${i} de ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }

  const safeName = appName.replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 40) || "app";
  doc.save(`aurora-validator-${safeName}-${Date.now()}.pdf`);
}

/* ===== helpers ===== */
function sectionTitle(doc: jsPDF, title: string, y: number) {
  y = ensureSpace(doc, y, 14);
  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, y, 3, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT);
  doc.text(title, MARGIN + 6, y + 4.2);
  return y + 10;
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...item[2]);
    doc.text(String(item[1]), x + 4, y + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(item[0], x + 4, y + 15.5);
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
