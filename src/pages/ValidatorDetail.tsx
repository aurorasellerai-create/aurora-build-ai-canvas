import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, CreditCard, ExternalLink, FileWarning, Gauge, Lock, RefreshCw, Rocket, Search, ShieldAlert, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { getValidatorHistoryItem, reexecuteValidatorHistoryItem, validatorStatusLabel } from "@/lib/validatorHistory";
import { setSelectedAppFormatPreference, type AuroraAppFormat } from "@/lib/appFormatPreference";
import { createAuroraValidatorResult, getAuroraValidatorChecks, getAuroraValidatorSummary } from "@/lib/auroraValidator";

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
      summary: "Publicação não recomendada até correção",
      appFormat: selectedFormat,
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/#aurora-validator" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Voltar para Aurora Validator">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-lg text-gradient-gold">Detalhes da validação</h1>
            <p className="text-xs text-muted-foreground">{buildLabel} · {statusLabel}</p>
          </div>
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
                {validation?.summary ?? "O Aurora Validator analisou a build simulando navegação, cliques, campos, checkout e pontos críticos antes da publicação."}
              </p>
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
            const Icon = item.icon;
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
              <p className="text-sm text-muted-foreground mb-5">Corrija os erros críticos, valide novamente e publique apenas quando o status estiver aprovado.</p>
              <div className="space-y-3">
                <Link to="/#aurora-validator" className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3 font-display font-bold glow-gold glow-gold-hover transition-all hover:scale-[1.02]">
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
