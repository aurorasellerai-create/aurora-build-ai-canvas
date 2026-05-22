import { useState } from "react";
import { Bot, Send, Sparkles, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askSecurityCopilot, type CopilotAnswer, type CopilotContext } from "@/lib/securityCopilotEngine";

const SUGGESTIONS = [
  "Por que READ_SMS é perigosa?",
  "Como corrigir cleartext traffic?",
  "Isso reprova na Play Store?",
  "Qual o impacto do meu score?",
];

export function SecurityCopilot({ context = {} }: { context?: CopilotContext }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CopilotAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState<string>("");

  async function ask(question: string) {
    if (!question.trim()) return;
    setLoading(true);
    setInput("");
    const result = await askSecurityCopilot(question, context);
    // typing effect
    setTyping("");
    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      setTyping(result.answer.slice(0, i));
      if (i >= result.answer.length) {
        clearInterval(interval);
        setMessages((m) => [...m, result]);
        setTyping("");
        setLoading(false);
      }
    }, 18);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl">
      <header className="flex items-center gap-3 border-b border-white/10 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/15 text-cyan-300 shadow-[0_0_20px_hsl(190_100%_60%/0.4)]">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold tracking-tight">Security Copilot IA</h3>
          <p className="text-xs text-muted-foreground">Explicações contextuais, riscos e correções</p>
        </div>
        <span className="ml-auto rounded-full border border-cyan-400/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan-300">
          Explicado por IA
        </span>
      </header>

      <div className="flex-1 space-y-3 overflow-auto p-4">
        {messages.length === 0 && !typing && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
            <Sparkles className="mb-2 h-4 w-4 text-cyan-300" />
            Pergunte sobre permissões, manifesto, score ou políticas Play Store.
          </div>
        )}

        {messages.map((m, idx) => (
          <div key={idx} className="space-y-2">
            <div className="rounded-xl bg-cyan-400/10 p-3 text-sm text-cyan-100">
              <span className="text-[10px] uppercase text-cyan-300/80">Você</span>
              <p>{m.question}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-background/70 p-3 text-sm">
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{m.answer}</ReactMarkdown>
              </div>
              {m.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.citations.map((c, i) => (
                    <a key={i} href={c.url} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 px-2 py-0.5 text-xs text-cyan-300 hover:bg-cyan-400/10">
                      {c.label} <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {typing && (
          <div className="rounded-xl border border-cyan-400/30 bg-background/70 p-3 text-sm">
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{typing}</ReactMarkdown>
            </div>
            <span className="inline-block animate-pulse text-cyan-300">▍</span>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} disabled={loading} onClick={() => ask(s)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-cyan-400/40 hover:text-cyan-200 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)}
                 placeholder="Pergunte ao Copilot..." disabled={loading}
                 className="border-white/10 bg-background/60" />
          <Button type="submit" disabled={loading || !input.trim()} size="icon"
                  className="bg-cyan-500 text-background hover:bg-cyan-400">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
