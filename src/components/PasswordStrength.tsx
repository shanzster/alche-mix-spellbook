/**
 * A small password-hygiene meter for the signup forms: a four-segment bar, a
 * label (Weak → Strong), and one actionable tip for the next improvement.
 * Purely advisory — the forms still enforce their own min-length rule.
 */

function scorePassword(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

function nextTip(pw: string): string | null {
  if (pw.length < 8) return "use 8+ characters";
  if (!(/[a-z]/.test(pw) && /[A-Z]/.test(pw))) return "mix upper & lower case";
  if (!/\d/.test(pw)) return "add a number";
  if (!/[^A-Za-z0-9]/.test(pw)) return "add a symbol";
  return null;
}

const LEVELS = [
  { label: "Too weak", color: "var(--color-crimson)" },
  { label: "Weak",     color: "var(--color-crimson)" },
  { label: "Fair",     color: "var(--color-amber-scry)" },
  { label: "Good",     color: "var(--color-gold)" },
  { label: "Strong",   color: "var(--color-emerald-elixir)" },
] as const;

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = scorePassword(password);
  const level = LEVELS[score];
  const tip = nextTip(password);

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < score ? level.color : "color-mix(in oklab, var(--color-parchment) 20%, transparent)" }} />
        ))}
      </div>
      <p className="mt-1 text-[10px]">
        <span className="font-semibold" style={{ color: level.color }}>{level.label}</span>
        {tip && <span className="text-parchment/55"> · {tip}</span>}
      </p>
    </div>
  );
}
