import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FlaskConical, IdCard, Camera, Check, Upload, Clock, XCircle, LogOut, ShieldCheck, RefreshCw, ScanFace } from "lucide-react";
import {
  getVerification, submitVerification, fileToDataUrl, downscale, type Verification,
} from "../lib/admin";
import { matchFaces, type FaceMatchResult } from "../lib/facematch";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-arcane min-h-screen flex items-center justify-center px-6 py-10">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-50" />
      <div className="relative z-10 max-w-lg w-full rounded-2xl p-8"
        style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 80%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 28%, transparent)", boxShadow: "0 0 50px -24px color-mix(in oklab, var(--color-gold) 55%, transparent)" }}>
        {children}
      </div>
    </div>
  );
}

// ── Live selfie capture ─────────────────────────────────────────────────────
function SelfieCapture({ value, onCapture }: { value: string | null; onCapture: (dataUrl: string | null) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camError, setCamError] = useState(false);

  useEffect(() => {
    if (value) return; // showing the captured still, no camera needed
    let stream: MediaStream | null = null;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) { setCamError(true); return; }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; }
      } catch { setCamError(true); }
    })();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [value]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const small = await downscale(canvas.toDataURL("image/jpeg", 0.8), 480, 0.6);
    onCapture(small);
  };

  return (
    <div>
      <div className="relative rounded-xl overflow-hidden h-48" style={{ background: "#05070d", border: "1px solid var(--color-border)" }}>
        {value ? (
          <img src={value} alt="Selfie" className="h-full w-full object-cover" />
        ) : camError ? (
          <div className="flex h-full items-center justify-center text-center px-4"><p className="text-xs text-parchment/60">Camera unavailable — allow camera access to take a selfie.</p></div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        )}
      </div>
      {value ? (
        <button type="button" onClick={() => onCapture(null)} className="mt-2 inline-flex items-center gap-1.5 text-xs text-parchment/60 hover:text-teal transition">
          <RefreshCw className="h-3.5 w-3.5" /> Retake
        </button>
      ) : (
        <button type="button" onClick={capture} disabled={camError} className="btn-ghost-arcane text-xs mt-2 disabled:opacity-50">
          <Camera className="h-3.5 w-3.5" /> Capture selfie
        </button>
      )}
    </div>
  );
}

export function TeacherVerification({ uid, name, email, onSignOut }: { uid: string; name: string | null; email: string | null; onSignOut: () => void }) {
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<Verification | null>(null);
  const [idImage, setIdImage] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [matching, setMatching] = useState(false);
  const [match, setMatch] = useState<FaceMatchResult | null>(null);

  useEffect(() => { getVerification(uid).then((v) => { setExisting(v); setLoading(false); }); }, [uid]);
  // Any image change invalidates a previous face-match result.
  useEffect(() => { setMatch(null); }, [idImage, selfie]);

  const onIdFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdImage(await downscale(await fileToDataUrl(file), 900, 0.6));
  };

  const runMatch = async () => {
    if (!idImage || !selfie) return;
    setMatching(true);
    setMatch(await matchFaces(idImage, selfie));
    setMatching(false);
  };

  const allowManual = !!match && !match.ok && !!match.error?.includes("manual review");
  const canSubmit = !!idImage && !!selfie && (!!match?.ok || allowManual) && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await submitVerification({ uid, name, email, idImage: idImage!, selfie: selfie!, faceMatch: match?.score, faceMatched: match?.ok });
    setExisting({ uid, name, email, idImage: idImage!, selfie: selfie!, status: "submitted", faceMatch: match?.score, faceMatched: match?.ok });
    setSubmitting(false);
  };

  if (loading) {
    return <Shell><div className="flex flex-col items-center gap-4 py-6 text-parchment"><FlaskConical className="h-8 w-8 text-teal animate-spin" /><p className="text-xs tracking-[0.3em] uppercase">Loading…</p></div></Shell>;
  }

  // Submitted & awaiting review
  if (existing && existing.status === "submitted") {
    return (
      <Shell>
        <div className="text-center">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--color-gold) 14%, transparent)", border: "1px solid color-mix(in oklab, var(--color-gold) 40%, transparent)" }}><Clock className="h-6 w-6 text-gold" /></span>
          <h1 className="font-display text-2xl mb-2">Verification submitted</h1>
          <p className="text-parchment text-sm leading-relaxed mb-6">Your ID and selfie are <span className="text-gold">awaiting admin review</span>. You'll get access to the teaching tools once an administrator approves you.</p>
          <button onClick={onSignOut} className="btn-ghost-arcane text-sm mx-auto"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </Shell>
    );
  }

  const rejected = existing?.status === "rejected";

  // Submission form (first time, or after rejection)
  return (
    <Shell>
      <div className="text-center mb-6">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 14%, transparent)", border: "1px solid color-mix(in oklab, var(--color-emerald-elixir) 40%, transparent)" }}><ShieldCheck className="h-6 w-6 text-teal" /></span>
        <h1 className="font-display text-2xl mb-1">Verify you're an educator</h1>
        <p className="text-parchment text-sm max-w-sm mx-auto">Upload a teaching ID and take a live selfie. An admin reviews both to confirm the faces match before approving your account.</p>
        {rejected && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-crimson"><XCircle className="h-3.5 w-3.5" /> Your last submission was rejected — please try again.</p>
        )}
      </div>

      <div className="space-y-5">
        {/* ID upload */}
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-parchment/60 mb-2 flex items-center gap-1.5"><IdCard className="h-3.5 w-3.5" /> Teaching / Government ID</p>
          {idImage ? (
            <div className="relative rounded-xl overflow-hidden h-40" style={{ border: "1px solid var(--color-border)" }}>
              <img src={idImage} alt="ID" className="h-full w-full object-contain bg-black/40" />
              <button type="button" onClick={() => setIdImage(null)} className="absolute top-2 right-2 rounded-full px-2 py-1 text-[10px]" style={{ background: "color-mix(in oklab, var(--color-mist) 80%, transparent)", border: "1px solid var(--color-border)" }}>Replace</button>
            </div>
          ) : (
            <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-xl gap-1.5 text-parchment/60 hover:text-teal transition" style={{ border: "1px dashed color-mix(in oklab, var(--color-parchment) 35%, transparent)" }}>
              <Upload className="h-5 w-5" /><span className="text-xs">Tap to upload a photo of your ID</span>
              <input type="file" accept="image/*" className="hidden" onChange={onIdFile} />
            </label>
          )}
        </div>

        {/* Selfie */}
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-parchment/60 mb-2 flex items-center gap-1.5"><Camera className="h-3.5 w-3.5" /> Live selfie</p>
          <SelfieCapture value={selfie} onCapture={setSelfie} />
        </div>

        {/* Automated face match */}
        {idImage && selfie && (
          <div>
            {matching ? (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-parchment" style={{ background: "color-mix(in oklab, var(--color-slate-sunken) 60%, transparent)", border: "1px solid var(--color-border)" }}>
                <FlaskConical className="h-4 w-4 text-teal animate-spin" /> Comparing the face on your ID with your selfie…
              </div>
            ) : !match ? (
              <button type="button" onClick={runMatch} className="btn-ghost-arcane text-xs w-full justify-center">
                <ScanFace className="h-4 w-4" /> Check face match
              </button>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
                style={{ background: `color-mix(in oklab, ${match.ok ? "var(--color-emerald-elixir)" : "var(--color-crimson)"} 10%, transparent)`, border: `1px solid color-mix(in oklab, ${match.ok ? "var(--color-emerald-elixir)" : "var(--color-crimson)"} 35%, transparent)` }}>
                {match.ok ? <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-teal" /> : <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-crimson" />}
                <div>
                  <span className="font-display" style={{ color: match.ok ? "var(--color-emerald-elixir)" : "var(--color-crimson)" }}>
                    {match.ok ? `Faces match — ${match.score}% similar` : match.error ? "Couldn't verify" : `Faces don't appear to match (${match.score}%)`}
                  </span>
                  {match.error && <p className="text-parchment/70 text-xs mt-0.5">{match.error}</p>}
                  {!match.ok && !match.error && <p className="text-parchment/70 text-xs mt-0.5">Make sure the ID photo and your selfie are clear and well-lit, then check again.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={submit} disabled={!canSubmit} className="btn-arcane btn-arcane-hover w-full justify-center disabled:opacity-50">
          {submitting ? <>Submitting…</> : <><Check className="h-4 w-4" /> Submit for review</>}
        </button>
        {idImage && selfie && !match && !matching && (
          <p className="text-[11px] text-parchment/50 text-center -mt-2">Run the face check to continue.</p>
        )}

        <p className="text-[11px] text-parchment/40 text-center leading-relaxed">
          Faces are matched on your device — your photos never leave your browser until you submit.
          An admin gives the final approval.
        </p>
        <div className="text-center">
          <button onClick={onSignOut} className="text-[11px] text-parchment/50 hover:text-parchment/80 transition inline-flex items-center gap-1.5"><LogOut className="h-3 w-3" /> Sign out</button>
          <span className="text-parchment/30 mx-2">·</span>
          <Link to="/" className="text-[11px] text-parchment/50 hover:text-parchment/80 transition">Home</Link>
        </div>
      </div>
    </Shell>
  );
}
