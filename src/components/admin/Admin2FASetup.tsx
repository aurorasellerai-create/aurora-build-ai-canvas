import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, Smartphone, Copy, CheckCircle2, AlertTriangle, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const Admin2FASetup = ({ onSuccess, onCancel }: Props) => {
  const [step, setStep] = useState<"loading" | "scan" | "verify" | "backup">("loading");
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("admin-2fa-setup");
        if (error || data?.error) throw new Error(data?.error || error?.message);
        setSecret(data.secret);
        const url = await QRCode.toDataURL(data.otpauth, { width: 220, margin: 1, color: { dark: "#0B0F1A", light: "#FFFFFF" } });
        setQrDataUrl(url);
        setStep("scan");
      } catch (e) {
        setError((e as Error).message || "Erro ao gerar 2FA");
        setStep("scan");
      }
    };
    init();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.functions.invoke("admin-2fa-verify", { body: { code } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setBackupCodes(data.backup_codes || []);
      setStep("backup");
    } catch (e) {
      setError((e as Error).message || "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, label = "Copiado") => {
    await navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="card-aurora p-6 max-w-md mx-auto"
    >
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-foreground">Configurar 2FA</h3>
      </div>

      {step === "loading" && (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      )}

      {step === "scan" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Smartphone className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
            <p>Escaneie o QR no Google Authenticator, Authy ou 1Password.</p>
          </div>
          {qrDataUrl && (
            <div className="flex justify-center bg-white rounded-lg p-3">
              <img src={qrDataUrl} alt="QR Code 2FA" className="w-52 h-52" />
            </div>
          )}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Ou digite manualmente</p>
            <button
              onClick={() => copyText(secret, "Segredo copiado")}
              className="w-full text-left p-2 rounded bg-muted/40 border border-border font-mono text-xs text-foreground hover:border-primary/40 flex items-center justify-between"
            >
              <span className="truncate">{secret}</span>
              <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
            </button>
          </div>
          <button
            onClick={() => setStep("verify")}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm glow-gold hover:scale-[1.02] transition-all"
          >
            Próximo: verificar código
          </button>
        </div>
      )}

      {step === "verify" && (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm text-muted-foreground">Digite o código de 6 dígitos do app autenticador.</p>
          <input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full text-center font-mono text-2xl tracking-[0.5em] py-3 rounded-lg bg-muted border border-border focus:ring-2 focus:ring-primary outline-none"
            placeholder="000000"
          />
          {error && (
            <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep("scan")} className="flex-1 py-2.5 border border-border rounded-lg text-sm hover:border-secondary">
              Voltar
            </button>
            <button type="submit" disabled={loading || code.length !== 6} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Ativar
            </button>
          </div>
        </form>
      )}

      {step === "backup" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-secondary">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-bold text-sm">2FA ativado com sucesso!</p>
          </div>
          <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/30 p-3 text-xs text-yellow-200/90 flex gap-2">
            <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
            <p><strong>Salve estes códigos de backup.</strong> Cada um pode ser usado uma vez para entrar caso perca o aparelho. Não serão exibidos novamente.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((c) => (
              <button key={c} onClick={() => copyText(c, "Código copiado")}
                className="font-mono text-sm py-2 rounded bg-muted/40 border border-border hover:border-primary/40 flex items-center justify-center gap-1">
                {c} <Copy className="w-3 h-3 text-muted-foreground" />
              </button>
            ))}
          </div>
          <button
            onClick={() => copyText(backupCodes.join("\n"), "Todos copiados")}
            className="w-full text-xs text-primary hover:underline"
          >
            Copiar todos
          </button>
          <button onClick={onSuccess} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm glow-gold">
            Concluir
          </button>
        </div>
      )}

      {step !== "backup" && (
        <button onClick={onCancel} className="w-full text-xs text-muted-foreground hover:text-foreground mt-4">
          Cancelar
        </button>
      )}
    </motion.div>
  );
};

export default Admin2FASetup;
