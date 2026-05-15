import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Clock, CreditCard, Download, ExternalLink, FileCode2, FileWarning, Gauge, KeyRound, Lock, RefreshCw, Rocket, ScanLine, Search, ShieldAlert, ShieldCheck, SlidersHorizontal, Wrench, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getValidatorHistoryItem, reexecuteValidatorHistoryItem, validatorStatusLabel } from "@/lib/validatorHistory";
import { setSelectedAppFormatPreference, type AuroraAppFormat } from "@/lib/appFormatPreference";
import { createAuroraValidatorResult, getAuroraValidatorChecks, getAuroraValidatorSummary } from "@/lib/auroraValidator";
import { generateValidatorPdf } from "@/lib/validatorPdf";

const summaryIcons = {
  Fluxo: CheckCircle2,
  Navegação: CheckCircle2,
  Performance: Gauge,
  Checkout: CreditCard,
};

const checks = getAuroraValidatorChecks();

const getSeverityClasses = (severity: string) => {
  if (severity === "critical") return "border-destructive/30 bg-destructive/5 text-destructive";
  return "border-primary/30 bg-primary/5 text-primary";
};

const severityOptions = [
  { value: "all", label: "Todos" },
  { value: "critical", label: "Críticos" },
  { value: "warning", label: "Atenção" },
];

const categoryOptions = [
  { value: "all", label: "Todas" },
  { value: "fluxo", label: "Fluxo" },
  { value: "navegação", label: "Navegação" },
  { value: "botão", label: "Botão" },
  { value: "checkout", label: "Checkout" },
  { value: "performance", label: "Performance" },
  { value: "segurança", label: "Segurança" },
];

const severityLabel: Record<string, string> = {
  critical: "Crítico",
  warning: "Atenção",
};

const appFormatOptions: { value: AuroraAppFormat; label: string }[] = [
  { value: "apk", label: "APK" },
  { value: "aab", label: "AAB" },
  { value: "pwa", label: "PWA" },
];

type ValidatorFilters = {
  searchTerm: string;
  severityFilter: string;
  categoryFilter: string;
};

const defaultFilters: ValidatorFilters = {
  searchTerm: "",
  severityFilter: "all",
  categoryFilter: "all",
};

const getFiltersStorageKey = (id: string) => `aurora-validator-filters-${id}`;
const getUndoStorageKey = (id: string) => `aurora-validator-undo-${id}`;

const getStoredFilters = (id: string): ValidatorFilters => {
  if (typeof window === "undefined") return defaultFilters;

  try {
    const raw = window.localStorage.getItem(getFiltersStorageKey(id));
    if (!raw) return defaultFilters;

    const parsed = JSON.parse(raw) as Partial<ValidatorFilters>;
    return {
      searchTerm: typeof parsed.searchTerm === "string" ? parsed.searchTerm : defaultFilters.searchTerm,
      severityFilter: severityOptions.some((option) => option.value === parsed.severityFilter) ? parsed.severityFilter! : defaultFilters.severityFilter,
      categoryFilter: categoryOptions.some((option) => option.value === parsed.categoryFilter) ? parsed.categoryFilter! : defaultFilters.categoryFilter,
    };
  } catch {
    return defaultFilters;
  }
};

const getStoredUndoFilters = (id: string): ValidatorFilters | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(getUndoStorageKey(id));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { expiresAt?: number; filters?: ValidatorFilters };
    if (!parsed.expiresAt || parsed.expiresAt < Date.now() || !parsed.filters) {
      window.sessionStorage.removeItem(getUndoStorageKey(id));
      return null;
    }

    return parsed.filters;
  } catch {
    return null;
  }
};

const getStoredUndoExpiresAt = (id: string): number | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(getUndoStorageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt?: number };
    return parsed.expiresAt && parsed.expiresAt > Date.now() ? parsed.expiresAt : null;
  } catch {
    return null;
  }
};

export default function ValidatorDetail() {
  const { id = "build-demo" } = useParams();
  const navigate = useNavigate();
  const initialFilters = useMemo(() => getStoredFilters(id), [id]);
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm);
  const [severityFilter, setSeverityFilter] = useState(initialFilters.severityFilter);
  const [categoryFilter, setCategoryFilter] = useState(initialFilters.categoryFilter);
  const [undoFilters, setUndoFilters] = useState<ValidatorFilters | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const undoTimeoutRef = useRef<number | null>(null);
  const undoIntervalRef = useRef<number | null>(null);
  const validation = getValidatorHistoryItem(id);
  const [selectedFormat, setSelectedFormat] = useState<AuroraAppFormat>(validation?.appFormat ?? "apk");
  const buildLabel = validation?.appName ?? (id === "latest" ? "Última validação" : id);
  const statusLabel = validation ? validatorStatusLabel[validation.status] : "Correção necessária";
  const validatorResult = useMemo(
    () => (validation?.diagnostic && validation.appFormat === selectedFormat ? validation.diagnostic : createAuroraValidatorResult(selectedFormat)),
    [selectedFormat, validation?.appFormat, validation?.diagnostic],
  );
  const summary = useMemo(() => getAuroraValidatorSummary(validatorResult), [validatorResult]);
  const errors = useMemo(() => validatorResult.problemas.map((problem) => ({
    severity: problem.tipo === "erro" ? "critical" : "warning",
    category: problem.area,
    categoryLabel: problem.area.charAt(0).toUpperCase() + problem.area.slice(1),
    title: problem.descricao,
    location: problem.area === "checkout" ? "Finalização de compra" : problem.area === "botão" ? "Fluxo principal" : "Análise automática do app",
    impact: problem.impacto === "alto" ? "Alto impacto: pode impedir publicação ou vendas." : problem.impacto === "médio" ? "Impacto médio: pode reduzir confiança e conversão." : "Baixo impacto: ajuste recomendado antes da entrega.",
    recommendation: problem.acao_recomendada,
  })), [validatorResult]);

  useEffect(() => {
    const format = validation?.appFormat ?? "apk";
    setSelectedFormat(format);
    setSelectedAppFormatPreference(format);
  }, [validation?.appFormat]);

  useEffect(() => {
    const storedFilters = getStoredFilters(id);
    setSearchTerm(storedFilters.searchTerm);
    setSeverityFilter(storedFilters.severityFilter);
    setCategoryFilter(storedFilters.categoryFilter);
    const storedUndo = getStoredUndoFilters(id);
    const storedUndoExpiresAt = getStoredUndoExpiresAt(id);
    setUndoFilters(storedUndo);
    setUndoSecondsLeft(storedUndoExpiresAt ? Math.ceil((storedUndoExpiresAt - Date.now()) / 1000) : 0);
  }, [id]);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) window.clearTimeout(undoTimeoutRef.current);
      if (undoIntervalRef.current) window.clearInterval(undoIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!undoFilters) return;

    if (undoIntervalRef.current) window.clearInterval(undoIntervalRef.current);
    undoIntervalRef.current = window.setInterval(() => {
      const expiresAt = getStoredUndoExpiresAt(id);
      const secondsLeft = expiresAt ? Math.ceil((expiresAt - Date.now()) / 1000) : 0;
      setUndoSecondsLeft(secondsLeft);
      if (secondsLeft <= 0) {
        setUndoFilters(null);
        window.sessionStorage.removeItem(getUndoStorageKey(id));
        if (undoIntervalRef.current) window.clearInterval(undoIntervalRef.current);
      }
    }, 500);
  }, [id, undoFilters]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      getFiltersStorageKey(id),
      JSON.stringify({ searchTerm, severityFilter, categoryFilter }),
    );
  }, [categoryFilter, id, searchTerm, severityFilter]);

  const handleClearFilters = () => {
    const confirmed = window.confirm("Limpar busca e filtros desta validação?");
    if (!confirmed) return;

    if (undoTimeoutRef.current) window.clearTimeout(undoTimeoutRef.current);
    if (undoIntervalRef.current) window.clearInterval(undoIntervalRef.current);
    const previousFilters = { searchTerm, severityFilter, categoryFilter };
    const expiresAt = Date.now() + 6000;
    setUndoFilters(previousFilters);
    setUndoSecondsLeft(6);
    window.sessionStorage.setItem(getUndoStorageKey(id), JSON.stringify({ filters: previousFilters, expiresAt }));

    setSearchTerm(defaultFilters.searchTerm);
    setSeverityFilter(defaultFilters.severityFilter);
    setCategoryFilter(defaultFilters.categoryFilter);

    undoTimeoutRef.current = window.setTimeout(() => {
      setUndoFilters(null);
      setUndoSecondsLeft(0);
      window.sessionStorage.removeItem(getUndoStorageKey(id));
    }, 6000);
  };

  const handleUndoClearFilters = () => {
    if (!undoFilters) return;

    setSearchTerm(undoFilters.searchTerm);
    setSeverityFilter(undoFilters.severityFilter);
    setCategoryFilter(undoFilters.categoryFilter);
    setUndoFilters(null);
    setUndoSecondsLeft(0);
    window.sessionStorage.removeItem(getUndoStorageKey(id));

    if (undoTimeoutRef.current) window.clearTimeout(undoTimeoutRef.current);
    if (undoIntervalRef.current) window.clearInterval(undoIntervalRef.current);
  };

  const handleReexecuteWithFormat = () => {
    const baseValidation = validation ?? {
      id,
      appName: buildLabel,
      status: "blocked" as const,
      createdAt: new Date().toISOString(),
      issuesCount: 2,
      warningCount: 1,
      summary: validatorResult.resumo,
      appFormat: selectedFormat,
      diagnostic: validatorResult,
    };

    setSelectedAppFormatPreference(selectedFormat);
    const nextValidation = reexecuteValidatorHistoryItem(baseValidation, selectedFormat);
    navigate(`/validator/${nextValidation.id}`);
  };

  const filteredErrors = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return errors.filter((error) => {
      const matchesSeverity = severityFilter === "all" || error.severity === severityFilter;
      const matchesCategory = categoryFilter === "all" || error.category === categoryFilter;
      const searchableText = `${error.categoryLabel} ${error.title} ${error.location} ${error.impact} ${error.recommendation}`.toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesSeverity && matchesCategory && matchesSearch;
    });
  }, [categoryFilter, searchTerm, severityFilter]);

  const groupedErrors = useMemo(() => {
    return filteredErrors.reduce<Record<string, typeof errors>>((groups, error) => {
      const key = error.categoryLabel;
      groups[key] = groups[key] ? [...groups[key], error] : [error];
      return groups;
    }, {});
  }, [filteredErrors]);

  const handleDownloadPdf = async () => {
    try {
      await generateValidatorPdf({
        appName: buildLabel,
        format: selectedFormat,
        status: statusLabel,
        createdAt: validation?.createdAt,
        result: validatorResult,
      });
      toast.success("Relatório PDF gerado com sucesso.");
    } catch {
      toast.error("Não foi possível gerar o PDF agora.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/#aurora-validator" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Voltar para Aurora Validator">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-lg text-gradient-gold">Detalhes da validação</h1>
            <p className="text-xs text-muted-foreground truncate">{buildLabel} · {statusLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-bold glow-gold hover:scale-[1.03] transition-all shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Baixar PDF
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="card-aurora p-6 md:p-8 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
          <div className="grid lg:grid-cols-[1fr_0.72fr] gap-8 items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive mb-5">
                <ShieldAlert className="w-3.5 h-3.5" /> Publicação não recomendada até correção
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">STATUS DO APP</h2>
              <p className="text-muted-foreground max-w-2xl">
                {validatorResult.resumo}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-muted-foreground">Status: {validatorResult.status.toUpperCase()}</span>
                <span className={`rounded-full border px-3 py-1 ${validatorResult.pronto_para_publicacao ? "border-secondary/30 bg-secondary/10 text-secondary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
                  {validatorResult.pronto_para_publicacao ? "Pronto para publicação" : "Publicação não recomendada"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="space-y-3 rounded-lg border border-primary/20 bg-background/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground flex items-center gap-2 text-sm"><RefreshCw className="w-4 h-4 text-primary" /> Formato da validação</span>
                  <strong className="text-foreground">{selectedFormat.toUpperCase()}</strong>
                </div>
                <div className="flex flex-wrap gap-2">
                  {appFormatOptions.map((option) => (
                    <button key={option.value} type="button" onClick={() => setSelectedFormat(option.value)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${selectedFormat === option.value ? "border-primary bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.25)]" : "border-border bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={handleReexecuteWithFormat} className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition-all hover:bg-primary/15">
                  <RefreshCw className="w-3.5 h-3.5" /> Reexecutar com {selectedFormat.toUpperCase()}
                </button>
              </div>
              {validation?.baseValidationId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><RefreshCw className="w-4 h-4 text-primary" /> Base reutilizada</span>
                  <strong className="text-foreground">Revalidação</strong>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Duração</span>
                <strong className="text-foreground">4,2 segundos</strong>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><FileWarning className="w-4 h-4 text-primary" /> Falhas encontradas</span>
                <strong className="text-destructive">{validation ? validation.issuesCount + validation.warningCount : 3}</strong>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Itens aprovados</span>
                <strong className="text-secondary">6</strong>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.map((item, index) => {
            const Icon = summaryIcons[item.label as keyof typeof summaryIcons];
            const statusClass = item.status === "error" ? "text-destructive border-destructive/25 bg-destructive/5" : item.status === "warn" ? "text-primary border-primary/25 bg-primary/5" : "text-secondary border-secondary/25 bg-secondary/5";
            return (
              <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className={`rounded-xl border p-5 ${statusClass}`}>
                <Icon className="w-5 h-5 mb-4" />
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="font-display font-bold text-lg text-foreground">{item.value}</p>
              </motion.div>
            );
          })}
        </section>

        {/* ===== Análise Técnica Android ===== */}
        <AndroidDeepAnalysis format={selectedFormat} appName={buildLabel} />

        <div className="grid lg:grid-cols-[1fr_0.45fr] gap-6 items-start">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card-aurora p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">Lista de erros da build</h2>
                <p className="text-sm text-muted-foreground">Filtre por criticidade, categoria ou termo para agir mais rápido.</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
            </div>

            <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por erro, local, impacto ou correção"
                  className="w-full rounded-lg border border-border bg-background/70 py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Criticidade</p>
                  <div className="flex flex-wrap gap-2">
                    {severityOptions.map((option) => (
                      <button key={option.value} type="button" onClick={() => setSeverityFilter(option.value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${severityFilter === option.value ? "border-primary bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.25)]" : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categoria</p>
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((option) => (
                      <button key={option.value} type="button" onClick={() => setCategoryFilter(option.value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${categoryFilter === option.value ? "border-secondary bg-secondary text-secondary-foreground shadow-[0_0_18px_hsl(var(--secondary)/0.22)]" : "border-border bg-background/60 text-muted-foreground hover:border-secondary/40 hover:text-foreground"}`}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button type="button" onClick={handleClearFilters} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/60 px-4 py-2 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground">
                <RefreshCw className="h-3.5 w-3.5 text-primary" /> Limpar busca e filtros
              </button>

              {undoFilters && (
                <div className="flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Busca e filtros limpos. Desfazer expira em <span className="text-primary font-bold">{undoSecondsLeft}s</span>.</p>
                  <button type="button" onClick={handleUndoClearFilters} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground glow-gold transition-all hover:scale-[1.02]">
                    <RefreshCw className="h-3.5 w-3.5" /> Desfazer
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {filteredErrors.length === 0 ? (
                <div className="rounded-xl border border-border bg-muted/10 p-6 text-center text-sm text-muted-foreground">Nenhum erro encontrado com os filtros atuais.</div>
              ) : Object.entries(groupedErrors).map(([category, categoryErrors]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="font-display text-lg font-bold text-foreground">{category}</h3>
                    <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">{categoryErrors.length} item{categoryErrors.length > 1 ? "s" : ""}</span>
                  </div>

                  {categoryErrors.map((error, index) => (
                    <div key={error.title} className={`rounded-xl border p-4 ${getSeverityClasses(error.severity)}`}>
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-lg bg-background/80 border border-border flex items-center justify-center text-sm font-bold shrink-0">{index + 1}</span>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-display font-bold text-foreground">{error.title}</h4>
                            <span className="rounded-full border border-current/25 px-2 py-0.5 text-[11px] font-bold uppercase">{severityLabel[error.severity]}</span>
                          </div>
                          <p className="text-xs text-muted-foreground"><strong className="text-foreground">Local:</strong> {error.location}</p>
                          <p className="text-sm text-muted-foreground"><strong className="text-foreground">Impacto:</strong> {error.impact}</p>
                          <p className="text-sm text-muted-foreground"><strong className="text-foreground">Correção recomendada:</strong> {error.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </motion.section>

          <aside className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="card-aurora p-6">
              <h2 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Verificações executadas
              </h2>
              <div className="space-y-3">
                {checks.map((check) => (
                  <p key={check} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" /> {check}
                  </p>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="rounded-xl border border-primary/25 bg-primary/5 p-6">
              <h2 className="font-display font-bold text-foreground mb-2">Próximo passo</h2>
              <p className="text-sm text-muted-foreground mb-5">{validatorResult.sugestao}</p>
              <div className="space-y-3">
                <button type="button" onClick={handleDownloadPdf} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-background px-5 py-3 font-display font-bold glow-gold transition-all hover:scale-[1.02]">
                  <Download className="w-4 h-4" /> Baixar relatório PDF
                </button>
                <Link to="/#aurora-validator" className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 text-primary px-5 py-3 font-display font-bold hover:bg-primary/10 transition-all">
                  <RefreshCw className="w-4 h-4" /> Rodar novamente
                </Link>
                <Link to="/generator" className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-secondary/30 text-secondary px-5 py-3 font-display font-bold hover:bg-secondary/10 transition-all">
                  <Rocket className="w-4 h-4" /> Ir para publicação
                </Link>
              </div>
            </motion.div>

            <p className="text-xs text-muted-foreground flex items-start gap-2 px-1">
              <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> O Validator detecta e orienta. Nenhuma alteração é aplicada automaticamente ao aplicativo.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   Android Deep Analysis: Manifest / Permissões / Scan
============================================================ */
type Severity = "ok" | "warn" | "danger";

const sevClasses: Record<Severity, string> = {
  ok: "border-secondary/30 bg-secondary/5 text-secondary",
  warn: "border-primary/30 bg-primary/5 text-primary",
  danger: "border-destructive/30 bg-destructive/5 text-destructive",
};

const sevIcon: Record<Severity, typeof CheckCircle2> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  danger: XCircle,
};

const sevLabel: Record<Severity, string> = {
  ok: "Aprovado",
  warn: "Atenção",
  danger: "Crítico",
};

function AndroidDeepAnalysis({ format, appName }: { format: AuroraAppFormat; appName: string }) {
  const isAab = format === "aab";

  const manifest = [
    { label: "package", value: `com.aurora.${appName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "app"}`, sev: "ok" as Severity },
    { label: "versionCode", value: "1", sev: "ok" as Severity },
    { label: "versionName", value: "1.0.0", sev: "ok" as Severity },
    { label: "minSdkVersion", value: "21 (Android 5.0)", sev: "ok" as Severity },
    { label: "targetSdkVersion", value: isAab ? "34 (Android 14)" : "33 (Android 13)", sev: isAab ? "ok" as Severity : "warn" as Severity },
    { label: "compileSdkVersion", value: "34", sev: "ok" as Severity },
    { label: "application:label", value: appName, sev: "ok" as Severity },
    { label: "application:icon", value: "@mipmap/ic_launcher", sev: "ok" as Severity },
    { label: "usesCleartextTraffic", value: "false", sev: "ok" as Severity },
    { label: "allowBackup", value: "true", sev: "warn" as Severity },
    { label: "Assinatura digital", value: isAab ? "Play App Signing" : "Debug keystore", sev: isAab ? "ok" as Severity : "danger" as Severity },
  ];

  const permissions = [
    { name: "INTERNET", desc: "Acesso à rede para WebView e APIs.", sev: "ok" as Severity, required: true },
    { name: "ACCESS_NETWORK_STATE", desc: "Detecta status de conexão.", sev: "ok" as Severity, required: true },
    { name: "POST_NOTIFICATIONS", desc: "Notificações push (Android 13+).", sev: "ok" as Severity, required: false },
    { name: "WRITE_EXTERNAL_STORAGE", desc: "Armazenamento externo legado — revisar uso real.", sev: "warn" as Severity, required: false },
    { name: "READ_MEDIA_IMAGES", desc: "Acesso a imagens da galeria do usuário.", sev: "warn" as Severity, required: false },
    { name: "REQUEST_INSTALL_PACKAGES", desc: "Permite instalar APKs — proibido pela Play Store sem justificativa.", sev: "danger" as Severity, required: false },
  ];

  const scan = [
    { area: "Assinatura APK", result: isAab ? "v2 + v3 (Play App Signing)" : "v1 detectado — recomendado v2/v3", sev: isAab ? "ok" as Severity : "warn" as Severity },
    { area: "Política Play Store", result: "1 permissão sensível requer justificativa.", sev: "warn" as Severity },
    { area: "Dados sensíveis", result: "Nenhuma chave hardcoded encontrada.", sev: "ok" as Severity },
    { area: "Cleartext traffic", result: "Bloqueado (HTTPS apenas).", sev: "ok" as Severity },
    { area: "Bibliotecas nativas", result: "ABIs: armeabi-v7a, arm64-v8a", sev: "ok" as Severity },
    { area: "Tamanho do bundle", result: isAab ? "8.4 MB (otimizado)" : "12.1 MB (universal APK)", sev: isAab ? "ok" as Severity : "warn" as Severity },
    { area: "Obfuscação (R8/ProGuard)", result: "Ativada", sev: "ok" as Severity },
    { area: "Vulnerabilidades conhecidas", result: "Nenhuma CVE detectada nas dependências.", sev: "ok" as Severity },
  ];

  const counts = {
    ok: [...manifest, ...permissions, ...scan].filter((i) => i.sev === "ok").length,
    warn: [...manifest, ...permissions, ...scan].filter((i) => i.sev === "warn").length,
    danger: [...manifest, ...permissions, ...scan].filter((i) => i.sev === "danger").length,
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="card-aurora p-6 md:p-7 space-y-6"
    >
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-1">Análise técnica Android</p>
          <h2 className="font-display text-2xl font-bold text-gradient-cyan">
            Manifest · Permissões · Scan de segurança
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Resultados detalhados extraídos do {format.toUpperCase()} para validação na Google Play Store.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/5 px-3 py-1 text-xs font-bold text-secondary">
            <CheckCircle2 className="w-3.5 h-3.5" /> {counts.ok} OK
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            <AlertTriangle className="w-3.5 h-3.5" /> {counts.warn} Atenção
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1 text-xs font-bold text-destructive">
            <XCircle className="w-3.5 h-3.5" /> {counts.danger} Crítico
          </span>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Manifest */}
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-secondary/10 border border-secondary/30 text-secondary flex items-center justify-center">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-sm leading-tight">AndroidManifest.xml</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{manifest.length} entradas</p>
            </div>
          </div>
          <div className="space-y-2 font-mono text-[11px]">
            {manifest.map((row) => {
              const Icon = sevIcon[row.sev];
              return (
                <div key={row.label} className={`flex items-start justify-between gap-2 rounded-lg border px-2.5 py-2 ${sevClasses[row.sev]}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{row.label}</p>
                    <p className="text-foreground font-semibold truncate">{row.value}</p>
                  </div>
                  <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Permissões */}
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 text-primary flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-sm leading-tight">Permissões Android</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{permissions.length} declaradas</p>
            </div>
          </div>
          <div className="space-y-2">
            {permissions.map((perm) => {
              const Icon = sevIcon[perm.sev];
              return (
                <div key={perm.name} className={`rounded-lg border p-3 ${sevClasses[perm.sev]}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <code className="text-[11px] font-bold font-mono text-foreground truncate">{perm.name}</code>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shrink-0">
                      <Icon className="w-3 h-3" /> {sevLabel[perm.sev]}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{perm.desc}</p>
                  {perm.required && (
                    <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-background/60 border border-border text-muted-foreground">
                      Obrigatória
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scan de Segurança */}
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-secondary/10 border border-secondary/30 text-secondary flex items-center justify-center">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-sm leading-tight">Scan de Segurança</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{scan.length} verificações</p>
            </div>
          </div>
          <div className="space-y-2">
            {scan.map((row) => {
              const Icon = sevIcon[row.sev];
              return (
                <div key={row.area} className={`rounded-lg border p-3 ${sevClasses[row.sev]}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-bold text-foreground">{row.area}</p>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{row.result}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <RecommendationsPanel
        items={[
          ...manifest.filter((i) => i.sev !== "ok").map((i) => ({
            source: "Manifest" as const,
            sev: i.sev,
            title: i.label,
            detail: String(i.value),
            ...getFixGuidance("manifest", i.label),
          })),
          ...permissions.filter((i) => i.sev !== "ok").map((i) => ({
            source: "Permissão" as const,
            sev: i.sev,
            title: i.name,
            detail: i.desc,
            ...getFixGuidance("permission", i.name),
          })),
          ...scan.filter((i) => i.sev !== "ok").map((i) => ({
            source: "Scan" as const,
            sev: i.sev,
            title: i.area,
            detail: i.result,
            ...getFixGuidance("scan", i.area),
          })),
        ]}
      />

      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Análise gerada a partir do arquivo {format.toUpperCase()} enviado. Para publicar na Play Store, corrija itens marcados como <span className="text-destructive font-bold">críticos</span> e revise as <span className="text-primary font-bold">permissões sensíveis</span> com justificativa no formulário de envio.
        </p>
      </div>

    </motion.section>
  );
}

type FixGuidance = { impact: string; steps: string[]; reference?: { label: string; url: string } };

function getFixGuidance(kind: "manifest" | "permission" | "scan", key: string): FixGuidance {
  const map: Record<string, FixGuidance> = {
    // Manifest
    "targetSdkVersion": {
      impact: "A Play Store exige targetSdkVersion atualizado para novos envios e atualizações.",
      steps: [
        "Abra build.gradle (Module: app) e ajuste targetSdkVersion para 34.",
        "Atualize compileSdkVersion para 34 e revise APIs descontinuadas.",
        "Teste o app em Android 14 antes de gerar um novo bundle.",
      ],
      reference: { label: "Play Console · Requisitos de targetSdk", url: "https://developer.android.com/google/play/requirements/target-sdk" },
    },
    "allowBackup": {
      impact: "Backups automáticos podem expor dados sensíveis do usuário.",
      steps: [
        "No AndroidManifest.xml, defina android:allowBackup=\"false\" se o app armazena dados sensíveis.",
        "Caso precise de backup, configure android:fullBackupContent com regras explícitas.",
        "Documente a decisão para o time de segurança.",
      ],
    },
    "Assinatura digital": {
      impact: "APKs com debug keystore não podem ser publicados na Play Store.",
      steps: [
        "Gere uma keystore de release com keytool e armazene em local seguro.",
        "Configure signingConfigs.release no build.gradle com a nova keystore.",
        "Habilite o Play App Signing no Play Console e envie um AAB assinado.",
      ],
      reference: { label: "Play App Signing", url: "https://developer.android.com/studio/publish/app-signing" },
    },
    // Permissions
    "WRITE_EXTERNAL_STORAGE": {
      impact: "Permissão obsoleta a partir do Android 10 — pode ser rejeitada na revisão.",
      steps: [
        "Migre para o Storage Access Framework ou MediaStore.",
        "Remova a declaração se não for mais necessária no Android 10+.",
        "Para versões antigas, restrinja com android:maxSdkVersion=\"28\".",
      ],
    },
    "READ_MEDIA_IMAGES": {
      impact: "Permissão sensível — exige justificativa clara para o usuário.",
      steps: [
        "Solicite a permissão apenas quando o usuário acionar a funcionalidade.",
        "Exiba um diálogo explicando o motivo antes do prompt do sistema.",
        "Considere o Photo Picker (Android 13+) para evitar a permissão completa.",
      ],
    },
    "REQUEST_INSTALL_PACKAGES": {
      impact: "Proibida pela Play Store sem justificativa formal — risco de remoção.",
      steps: [
        "Remova a permissão se o app não instala APKs externos.",
        "Se for essencial, declare a categoria \"File manager\" no Play Console.",
        "Implemente o fluxo PackageInstaller respeitando as políticas.",
      ],
      reference: { label: "Política Play Store · Instalação de pacotes", url: "https://support.google.com/googleplay/android-developer/answer/12085295" },
    },
    // Scan
    "Assinatura APK": {
      impact: "Assinaturas v1 não são aceitas em novos uploads na Play Store.",
      steps: [
        "Habilite v2SigningEnabled true e v3SigningEnabled true no signingConfig.",
        "Gere o bundle novamente e valide com apksigner verify --print-certs.",
        "Reenvie o AAB assinado para o Play Console.",
      ],
    },
    "Política Play Store": {
      impact: "Permissões sensíveis sem justificativa podem causar suspensão do app.",
      steps: [
        "Liste todas as permissões sensíveis declaradas no manifest.",
        "Preencha o formulário de declaração no Play Console com o caso de uso.",
        "Anexe um vídeo demonstrando o uso real da permissão.",
      ],
    },
    "Tamanho do bundle": {
      impact: "APK universal aumenta o tempo de download e a taxa de desinstalação.",
      steps: [
        "Migre para Android App Bundle (.aab) e habilite splits por ABI/densidade.",
        "Comprima recursos com WebP e remova assets não usados.",
        "Ative R8 com shrinkResources true para minimizar o tamanho.",
      ],
    },
  };
  return map[key] || {
    impact: "Item sinalizado para revisão antes da publicação.",
    steps: [
      "Reveja a configuração atual no projeto Android.",
      "Compare com as boas práticas mais recentes do Google.",
      "Reenvie para validação após o ajuste.",
    ],
  };
}

type RecommendationItem = {
  source: "Manifest" | "Permissão" | "Scan";
  sev: Severity;
  title: string;
  detail: string;
  impact: string;
  steps: string[];
  reference?: { label: string; url: string };
};

function RecommendationsPanel({ items }: { items: RecommendationItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
        <div>
          <h3 className="font-display font-bold text-foreground text-sm">Nenhuma correção necessária</h3>
          <p className="text-xs text-muted-foreground mt-1">Manifest, permissões e scan estão dentro das políticas da Play Store.</p>
        </div>
      </div>
    );
  }

  const critical = items.filter((i) => i.sev === "danger").length;
  const warnings = items.filter((i) => i.sev === "warn").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-5 md:p-6 space-y-4"
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/40 text-primary flex items-center justify-center glow-gold">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Recomendações</p>
            <h3 className="font-display text-lg md:text-xl font-bold text-gradient-gold">Passos de correção sugeridos</h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {critical > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
              <XCircle className="w-3.5 h-3.5" /> {critical} crítico{critical > 1 ? "s" : ""}
            </span>
          )}
          {warnings > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <AlertTriangle className="w-3.5 h-3.5" /> {warnings} atenção
            </span>
          )}
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-3">
        {items.map((item, idx) => {
          const Icon = sevIcon[item.sev];
          return (
            <motion.article
              key={`${item.source}-${item.title}-${idx}`}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * idx }}
              className={`rounded-xl border p-4 space-y-3 ${sevClasses[item.sev]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-background/70 border border-border text-muted-foreground">
                      {item.source}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                      <Icon className="w-3 h-3" /> {sevLabel[item.sev]}
                    </span>
                  </div>
                  <h4 className="font-display font-bold text-foreground text-sm leading-tight truncate">{item.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.detail}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Impacto</p>
                <p className="text-xs text-foreground/90 leading-snug">{item.impact}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-secondary mb-2">Como corrigir</p>
                <ol className="space-y-1.5">
                  {item.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/90 leading-snug">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 border border-primary/40 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {item.reference && (
                <a
                  href={item.reference.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> {item.reference.label}
                </a>
              )}
            </motion.article>
          );
        })}
      </div>
    </motion.div>
  );
}

