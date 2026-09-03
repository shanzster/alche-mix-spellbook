import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ScanLine,
  Camera,
  Box,
  Sparkles,
  Award,
  Monitor,
  Smartphone,
  Grid3x3,
  Atom,
  ChevronRight,
  BookMarked,
  Copy,
  Check,
} from "lucide-react";
import { ModuleShell } from "../components/ModuleShell";
import { RequireAuth } from "../components/RequireAuth";
import { CrystalAR, AR_ELEMENTS } from "../components/CrystalAR";
import { useUserProfile, scanCard, logPractice, registerForged, recordCompound } from "../lib/profile";
import { usePlatform, siteUrl } from "../lib/platform";

export const Route = createFileRoute("/scanner")({
  component: () => (
    <RequireAuth>
      <Scanner />
    </RequireAuth>
  ),
});

function Step({ icon: Icon, title, body }: { icon: typeof Camera; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-parchment/10 bg-slate-sunken/40 p-4">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-elixir/15">
        <Icon className="h-4.5 w-4.5 text-emerald-elixir" />
      </div>
      <div>
        <p className="font-medium text-parchment">{title}</p>
        <p className="mt-0.5 text-sm text-parchment/60">{body}</p>
      </div>
    </div>
  );
}

/** Copies the site link so a mobile user can continue on a computer. */
function CopySiteLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const url = siteUrl(path);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the URL is shown as text anyway */
    }
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-parchment transition hover:text-spectral"
      style={{
        background: "color-mix(in oklab, var(--color-mist) 60%, transparent)",
        border: "1px solid var(--color-border)",
      }}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-elixir" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span className="max-w-[52vw] truncate">{copied ? "Link copied!" : url}</span>
    </button>
  );
}

/**
 * WEBSITE side — AR is deliberately not available here. The website is the
 * in-depth learning system; the camera/AR ceremony belongs to the phone.
 * This panel hands the student off to their phone with a QR code.
 */
function WebsiteHandoff() {
  const [qrFailed, setQrFailed] = useState(false);
  const url = siteUrl("/scanner");
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
            <h3 className="font-display text-xl text-spectral mb-2">
              AR summoning happens on your phone
            </h3>
            <p className="text-sm text-parchment/70 mb-4 max-w-md">
              You're on the website — the in-depth side of AlcheMix. The AR Scanner unlocks on a
              phone or the installed app: open this page there, point the camera at an element card,
              and the 3D crystal rises out of it. Every card you claim appears back here, in your
              Grimoire.
            </p>
            <ol className="space-y-1.5 text-sm text-parchment/70 list-decimal list-inside">
              <li>Scan the QR code with your phone (or open the same address).</li>
              <li>Sign in with the same account.</li>
              <li>Aim at an AlcheMix trigger card and claim the discovery.</li>
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

/**
 * MOBILE side — post-scan reward: a GLIMPSE of the element, then a hand-off to
 * the website where the full in-depth page (all facts + quick check) lives.
 */
function GlimpsePanel({ elementKey }: { elementKey: string }) {
  const el = AR_ELEMENTS.find((e) => e.key === elementKey);
  if (!el) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--color-gold) 10%, transparent), color-mix(in oklab, var(--color-slate-sunken) 70%, transparent))",
        border: "1px solid color-mix(in oklab, var(--color-gold) 35%, transparent)",
        boxShadow: "0 0 50px -18px color-mix(in oklab, var(--color-gold) 45%, transparent)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl"
        style={{ background: "color-mix(in oklab, var(--color-gold) 16%, transparent)" }}
      />

      {/* The glimpse: identity + a single teaser fact */}
      <div className="relative mb-4 flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{
            background: "color-mix(in oklab, var(--color-gold) 18%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-gold) 40%, transparent)",
          }}
        >
          <Award className="h-5 w-5 text-gold" />
        </span>
        <div>
          <p className="font-ui font-medium text-lg text-spectral">
            Card claimed — {el.name} ({el.symbol})
          </p>
          <p className="text-sm text-parchment/60">
            No. {el.number} · {el.mass} · {el.category}
          </p>
        </div>
      </div>
      <p className="relative mb-5 text-sm text-parchment/85">
        <span className="text-gold">✦</span> {el.facts[0]}{" "}
        <span className="text-parchment/50">…and that's just a glimpse.</span>
      </p>

      {/* Transfer to the website for the depth */}
      <div
        className="relative rounded-xl p-4"
        style={{
          background: "color-mix(in oklab, var(--color-mist) 45%, transparent)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p className="mb-1 inline-flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase text-emerald-elixir">
          <Monitor className="h-3.5 w-3.5" /> Continue on the website
        </p>
        <p className="mb-3 text-sm text-parchment/75">
          The full {el.name} page — every fact, its 3D study view and the quick check that earns the
          <span className="text-gold"> AR Alchemist</span> badge — is waiting in your Grimoire on a
          computer.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <CopySiteLink path="/cards" />
          <Link
            to="/cards"
            className="inline-flex items-center gap-1.5 text-xs text-parchment/70 hover:text-spectral transition"
          >
            <BookMarked className="h-3.5 w-3.5" /> Peek at the Grimoire here{" "}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="relative mt-3">
        <Link
          to="/atomic-builder"
          className="group flex items-center gap-3 rounded-xl border border-parchment/15 bg-slate-sunken/50 px-4 py-3 transition hover:border-emerald-elixir/40"
        >
          <Atom className="h-4.5 w-4.5 text-gold flex-shrink-0" />
          <span className="flex-1 text-sm text-parchment">
            Or forge an atom yourself in the{" "}
            <span className="font-ui font-medium text-spectral">Atomic Builder</span>
          </span>
          <ChevronRight className="h-4 w-4 text-parchment/40 transition group-hover:translate-x-0.5 group-hover:text-emerald-elixir" />
        </Link>
      </div>
    </div>
  );
}

function Scanner() {
  const { uid } = useUserProfile();
  const platform = usePlatform();
  const [discovered, setDiscovered] = useState<string[]>([]);

  // onFound fires from inside the AR session (possibly long after render), so
  // read the uid through a ref to avoid capturing a stale null.
  const uidRef = useRef<string | null>(uid);
  uidRef.current = uid;

  const handleFound = (elementKey: string) => {
    setDiscovered((prev) => (prev.includes(elementKey) ? prev : [...prev, elementKey]));
    const el = AR_ELEMENTS.find((e) => e.key === elementKey);
    if (el) void scanCard(uidRef.current, el.symbol); // element joins the student's collection
    void logPractice(uidRef.current, "scanner"); // engagement shows on the teacher dashboard
  };

  // A mix revealed a new forged card → register it to the Grimoire. Real
  // compound mixes (`mix:<formula>`) also record the compound itself.
  const handleMix = (forgedId: string, formula?: string) => {
    void registerForged(uidRef.current, forgedId);
    if (formula) void recordCompound(uidRef.current, formula);
    void logPractice(uidRef.current, "scanner-mix");
  };

  return (
    <ModuleShell
      title="AR Scanner"
      eyebrow="Augmented Reality"
      subtitle={
        platform.arCapable
          ? "Scan an AlcheMix element card to summon its 3D model — then claim the discovery."
          : "The summoning ceremony lives on your phone — the deep study lives here on the website."
      }
      icon={ScanLine}
      accent="var(--color-emerald-elixir)"
    >
      {/* Wait for platform detection so SSR/first paint never flashes the wrong side. */}
      {!platform.ready ? null : !platform.arCapable ? (
        <WebsiteHandoff />
      ) : (
        <div className="space-y-6">
          {/* The camera / AR viewport — full width. */}
          <div className="mx-auto w-full max-w-4xl">
            <CrystalAR onFound={handleFound} onMix={handleMix} />
          </div>

          {/* The outcome: one glimpse per element scanned. */}
          {discovered.length > 0 ? (
            discovered.map((key) => <GlimpsePanel key={key} elementKey={key} />)
          ) : (
            <>
              {/* How-to steps, below the viewport. */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Step
                  icon={Camera}
                  title="1 · Allow the camera"
                  body="Click Start scanning and grant camera access. Needs HTTPS (or localhost)."
                />
                <Step
                  icon={ScanLine}
                  title="2 · Aim at a card"
                  body="Fill the frame with an AlcheMix element trigger card, well lit and roughly flat."
                />
                <Step
                  icon={Box}
                  title="3 · Claim the discovery"
                  body="The model rises out of the card. Tap it to inspect the element — then close the camera to claim your discovery."
                />
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/5 p-3 text-sm text-parchment/70">
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
                <span>
                  Tracking works best on a printed or on-screen copy of a trigger card with plenty
                  of detail and even lighting. Glare and motion blur are its enemies.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </ModuleShell>
  );
}
