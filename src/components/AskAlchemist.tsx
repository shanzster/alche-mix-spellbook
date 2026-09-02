import { Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAI } from "../lib/useAI";

interface ChatTurn {
  who: "you" | "alchemist";
  text: string;
}

/**
 * Ask the Alchemist — the floating mentor available on every student page.
 * A thin chat panel over `aiAskAlchemist` (Gemini when configured, the
 * deterministic curriculum fallback otherwise). `context` tells the tutor
 * which module the student is currently in.
 */
export function AskAlchemist({ context }: { context?: string }) {
  const { askAlchemist, busy } = useAI();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, open]);

  const send = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setTurns((t) => [...t, { who: "you", text: question }]);
    try {
      const res = await askAlchemist({ question, context });
      setTurns((t) => [...t, { who: "alchemist", text: res.reply }]);
    } catch {
      setTurns((t) => [
        ...t,
        {
          who: "alchemist",
          text: "The scrying glass clouded over — ask me again in a moment.",
        },
      ]);
    }
  };

  return (
    <>
      {/* Floating rune button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close the Alchemist" : "Ask the Alchemist"}
        className="fixed z-50 bottom-20 right-4 md:bottom-6 md:right-6 flex h-12 w-12 items-center justify-center rounded-full transition-opacity hover:opacity-90"
        style={{
          background: "var(--color-gold)",
          color: "#1a1408",
        }}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-50 bottom-[8.5rem] right-4 md:bottom-24 md:right-6 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl backdrop-blur-xl"
          style={{
            background: "color-mix(in oklab, var(--color-slate-sunken) 96%, transparent)",
            border: "1px solid var(--color-border)",
            boxShadow:
              "0 18px 50px -12px color-mix(in oklab, var(--color-wraith) 55%, transparent)",
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <Sparkles className="h-4 w-4 text-gold" />
            <p className="font-display text-sm tracking-[0.08em]">The Alchemist</p>
            <p className="ml-auto text-[10px] uppercase tracking-[0.2em] text-parchment/50">
              mentor
            </p>
          </div>

          <div ref={scrollRef} className="max-h-72 min-h-32 space-y-3 overflow-y-auto px-4 py-3">
            {turns.length === 0 && (
              <p className="text-xs leading-relaxed text-parchment/70">
                Greetings, apprentice. Ask me anything about the craft —
                {context ? ` we are studying ${context}.` : " atoms, bonds, reactions…"}
              </p>
            )}
            {turns.map((t, i) => (
              <div key={i} className={t.who === "you" ? "text-right" : ""}>
                <span
                  className="inline-block max-w-[85%] rounded-xl px-3 py-2 text-left text-xs leading-relaxed"
                  style={
                    t.who === "you"
                      ? {
                          background:
                            "color-mix(in oklab, var(--color-emerald-elixir) 18%, transparent)",
                        }
                      : {
                          background:
                            "color-mix(in oklab, var(--color-gold) 12%, transparent)",
                          border: "1px solid color-mix(in oklab, var(--color-gold) 25%, transparent)",
                        }
                  }
                >
                  {t.text}
                </span>
              </div>
            ))}
            {busy && (
              <p className="text-xs italic text-parchment/50">The Alchemist ponders…</p>
            )}
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask a question…"
              className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2 text-xs outline-none"
              style={{ border: "1px solid var(--color-border)" }}
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-emerald-elixir transition disabled:opacity-40"
              style={{
                background: "color-mix(in oklab, var(--color-emerald-elixir) 14%, transparent)",
              }}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
