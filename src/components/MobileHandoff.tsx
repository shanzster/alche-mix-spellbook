import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookMarked, ChevronRight, Grid3x3, Smartphone } from "lucide-react";
import { siteUrl } from "../lib/platform";

/**
 * Shown on the website (desktop) side when a camera experience is opened
 * there: a warm "this lives on your phone" pitch with a QR code to the same
 * page, plus pointers back into the website's deep-study side. Used by the
 * AR Scanner and the Element Identifier.
 */
export function MobileHandoff({
  path,
  title,
  body,
  steps,
}: {
  /** App path the QR should open on the phone, e.g. "/identifier". */
  path: string;
  title: string;
  body: string;
  steps: string[];
}) {
  const [qrFailed, setQrFailed] = useState(false);
  const url = siteUrl(path);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(url)}`;

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--color-emerald-elixir) 10%, transparent), color-mix(in oklab, var(--color-slate-sunken) 70%, transparent))",
          border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl"
          style={{
            background: "color-mix(in oklab, var(--color-emerald-elixir) 16%, transparent)",
          }}
        />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="flex-1">
            <p
              className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] tracking-[0.15em] uppercase"
              style={{
                color: "var(--color-emerald-elixir)",
                background: "color-mix(in oklab, var(--color-emerald-elixir) 12%, transparent)",
                border:
                  "1px solid color-mix(in oklab, var(--color-emerald-elixir) 35%, transparent)",
              }}
            >
              <Smartphone className="h-3 w-3" /> A mobile experience
            </p>
            <h3 className="font-display text-xl text-spectral mb-2">{title}</h3>
            <p className="text-sm text-parchment/70 mb-4 max-w-md">{body}</p>
            <ol className="space-y-1.5 text-sm text-parchment/70 list-decimal list-inside">
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col items-center gap-2">
            {!qrFailed ? (
              <img
                src={qrSrc}
                alt={`QR code for ${url}`}
                width={220}
                height={220}
                onError={() => setQrFailed(true)}
                className="rounded-xl bg-white p-2"
              />
            ) : (
              <div
                className="flex h-[220px] w-[220px] items-center justify-center rounded-xl p-4 text-center text-sm text-parchment/70"
                style={{
                  background: "color-mix(in oklab, var(--color-mist) 55%, transparent)",
                  border: "1px dashed var(--color-border)",
                }}
              >
                Open <span className="mx-1 text-spectral break-all">{url}</span> on your phone
              </div>
            )}
            <span className="text-[10px] tracking-[0.12em] uppercase text-parchment/50">
              Scan with your phone
            </span>
          </div>
        </div>
      </div>

      {/* Meanwhile, the website's deep side */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          to="/cards"
          className="group flex items-center gap-3 rounded-xl border border-parchment/15 bg-slate-sunken/50 px-4 py-3 transition hover:border-emerald-elixir/40"
        >
          <BookMarked className="h-4.5 w-4.5 text-gold flex-shrink-0" />
          <span className="flex-1 text-sm text-parchment">
            Follow the <span className="font-ui font-medium text-spectral">Grimoire Guide</span> — your
            learning path
          </span>
          <ChevronRight className="h-4 w-4 text-parchment/40 transition group-hover:translate-x-0.5 group-hover:text-emerald-elixir" />
        </Link>
        <Link
          to="/periodic-table"
          className="group flex items-center gap-3 rounded-xl border border-parchment/15 bg-slate-sunken/50 px-4 py-3 transition hover:border-emerald-elixir/40"
        >
          <Grid3x3 className="h-4.5 w-4.5 text-emerald-elixir flex-shrink-0" />
          <span className="flex-1 text-sm text-parchment">
            Study elements in depth in the{" "}
            <span className="font-ui font-medium text-spectral">Periodic Table</span>
          </span>
          <ChevronRight className="h-4 w-4 text-parchment/40 transition group-hover:translate-x-0.5 group-hover:text-emerald-elixir" />
        </Link>
      </div>
    </div>
  );
}
