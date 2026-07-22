import { createFileRoute, Link } from "@tanstack/react-router";
import { FlaskConical, Atom, Eye, BookOpen, Zap, GraduationCap, Brain, Target, BarChart3, Camera, Layers } from "lucide-react";
import { FloatingNav } from "../components/FloatingNav";

export const Route = createFileRoute("/learn")({
  component: LearnPage,
});

function LearnPage() {
  return (
    <div className="bg-arcane min-h-screen overflow-x-hidden text-spectral">
      <div className="bg-arcane-stars pointer-events-none fixed inset-0 z-0 opacity-60" />

      <FloatingNav />

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-28 pb-24">

        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-wraith/30 bg-wraith/10 px-4 py-1.5 text-xs tracking-[0.3em] text-wraith uppercase mb-6">
            <Brain className="h-3 w-3" /> Learning Methodology
          </div>
          <h1 className="font-display text-5xl md:text-6xl mb-6">
            The Science of<br />
            <span className="aurora-gradient animate-aurora">Learning Chemistry.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-parchment leading-relaxed">
            AlcheMix AR is built on evidence-based pedagogy — combining spatial learning, active recall,
            and real-world application to make chemistry stick.
          </p>
        </div>

        {/* The problem */}
        <section className="mb-20 parchment-border rounded-2xl p-10">
          <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3">The Problem</p>
          <h2 className="font-display text-3xl mb-6">Why students struggle with chemistry.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Layers className="h-5 w-5" />, title: "Abstract concepts", body: "Atoms, bonds, and reactions are invisible to the naked eye. Students must imagine what they cannot observe, making it hard to build genuine understanding." },
              { icon: <Target className="h-5 w-5" />, title: "Passive learning", body: "Reading textbooks and watching demonstrations gives students no opportunity to experiment and make mistakes — the most effective way to learn." },
              { icon: <BarChart3 className="h-5 w-5" />, title: "No feedback loop", body: "Traditional assessments happen days or weeks after learning, not in the moment when it matters most for reinforcing understanding." },
            ].map(({ icon, title, body }) => (
              <div key={title}>
                <span className="text-wraith mb-3 block">{icon}</span>
                <h3 className="font-display text-base mb-2 text-gold">{title}</h3>
                <p className="text-parchment text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Our approach */}
        <section className="mb-20">
          <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3 text-center">Our Approach</p>
          <h2 className="font-display text-3xl text-center mb-12">Three pedagogical pillars.</h2>

          {/* Pillar 1 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-wraith/40"
                  style={{ background: "color-mix(in oklab, var(--color-wraith) 15%, transparent)" }}>
                  <Atom className="h-5 w-5 text-wraith" />
                </div>
                <span className="text-xs tracking-[0.3em] text-gold uppercase">Pillar 1 — Spatial Learning</span>
              </div>
              <h3 className="font-display text-2xl mb-4">See it in 3D.</h3>
              <p className="text-parchment leading-relaxed mb-4">
                Research in cognitive science consistently shows that spatial understanding accelerates
                learning for abstract subjects. When students can rotate a water molecule in their hands
                and see the bond angles physically, the concept moves from memorisation to genuine comprehension.
              </p>
              <p className="text-parchment leading-relaxed">
                AlcheMix AR renders every molecular structure in true 3D augmented reality — anchored
                in the student's physical space, not on a flat screen.
              </p>
            </div>
            <div className="parchment-border rounded-xl p-8 text-center">
              <Atom className="h-16 w-16 text-wraith mx-auto animate-breathing mb-4" />
              <div className="font-display text-lg mb-2">Spatial Cognition</div>
              <p className="text-parchment text-sm">3D mental models form faster and last longer than 2D diagrams</p>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div className="md:order-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40"
                  style={{ background: "color-mix(in oklab, var(--color-gold) 15%, transparent)" }}>
                  <FlaskConical className="h-5 w-5 text-gold" />
                </div>
                <span className="text-xs tracking-[0.3em] text-gold uppercase">Pillar 2 — Active Experimentation</span>
              </div>
              <h3 className="font-display text-2xl mb-4">Do it, don't just read it.</h3>
              <p className="text-parchment leading-relaxed mb-4">
                The Reaction Sandbox puts students in control of the experiment. They select elements,
                combine them, and observe the result — including what happens when a reaction fails or
                produces an unexpected compound.
              </p>
              <p className="text-parchment leading-relaxed">
                Failure in a safe simulation is one of the most effective learning tools available.
                AlcheMix makes trial and error cost-free and immediate.
              </p>
            </div>
            <div className="md:order-1 parchment-border rounded-xl p-8 text-center">
              <FlaskConical className="h-16 w-16 text-gold mx-auto animate-float-slow mb-4" />
              <div className="font-display text-lg mb-2">Active Recall</div>
              <p className="text-parchment text-sm">Students who experiment retain up to 75% more than those who only observe</p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-elixir/40"
                  style={{ background: "color-mix(in oklab, var(--color-emerald-elixir) 15%, transparent)" }}>
                  <Camera className="h-5 w-5 text-emerald-elixir" style={{ color: "var(--color-emerald-elixir)" }} />
                </div>
                <span className="text-xs tracking-[0.3em] text-gold uppercase">Pillar 3 — Real-World Connection</span>
              </div>
              <h3 className="font-display text-2xl mb-4">Find chemistry everywhere.</h3>
              <p className="text-parchment leading-relaxed mb-4">
                The Evidence Journal bridges classroom chemistry and the real world. Students photograph
                everyday materials — rust, salt crystals, cleaning products, food — and submit them for
                AI analysis.
              </p>
              <p className="text-parchment leading-relaxed">
                When students discover chemistry in their own environment, the subject transforms
                from abstract curriculum content into something personally relevant and meaningful.
              </p>
            </div>
            <div className="parchment-border rounded-xl p-8 text-center">
              <BookOpen className="h-16 w-16 mx-auto animate-breathing mb-4" style={{ color: "var(--color-emerald-elixir)" }} />
              <div className="font-display text-lg mb-2">Contextual Learning</div>
              <p className="text-parchment text-sm">Real-world application doubles long-term retention of scientific concepts</p>
            </div>
          </div>
        </section>

        {/* Educator role */}
        <section className="mb-20 parchment-border rounded-2xl p-10">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="h-6 w-6 text-wraith" />
            <h2 className="font-display text-2xl">The Educator's Role</h2>
          </div>
          <p className="text-parchment leading-relaxed mb-6">
            AlcheMix AR is designed to support — not replace — the classroom teacher. The Educator Dashboard
            gives instructors a live view of every student's activity, so they can identify who needs
            intervention before a student falls behind.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: <BarChart3 className="h-5 w-5" />, label: "Real-time analytics", desc: "See exactly which concepts students are struggling with, broken down by individual and class." },
              { icon: <GraduationCap className="h-5 w-5" />, label: "Assessment alignment", desc: "Activities and journals map directly to curriculum outcomes — exportable for formal assessment." },
              { icon: <Target className="h-5 w-5" />, label: "Early intervention", desc: "Accuracy scores and attempt logs let educators spot struggling students in the first session." },
              { icon: <Layers className="h-5 w-5" />, label: "Differentiated learning", desc: "Students can progress at their own pace — the platform supports multiple difficulty levels." },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="text-wraith flex-shrink-0 mt-0.5">{icon}</span>
                <div>
                  <div className="font-display text-sm text-spectral mb-1">{label}</div>
                  <p className="text-parchment text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Learning outcomes */}
        <section className="mb-20">
          <p className="text-xs tracking-[0.4em] text-gold uppercase mb-3 text-center">Learning Outcomes</p>
          <h2 className="font-display text-3xl text-center mb-10">What students gain.</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Understand atomic structure and the periodic table through interactive exploration",
              "Visualise molecular geometry and bond types in augmented 3D space",
              "Predict the products of common chemical reactions through simulation",
              "Connect classroom chemistry to observable phenomena in the real world",
              "Build a personal evidence journal of scientific observations over time",
              "Develop scientific thinking and hypothesis-testing habits",
            ].map(outcome => (
              <div key={outcome} className="flex items-start gap-3 parchment-border rounded-lg p-4">
                <Zap className="h-4 w-4 text-wraith flex-shrink-0 mt-0.5" />
                <span className="text-parchment text-sm leading-relaxed">{outcome}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center parchment-border rounded-2xl p-12">
          <Brain className="mx-auto h-10 w-10 text-wraith animate-float-slow mb-6" />
          <h2 className="font-display text-3xl mb-4">Start the experiment.</h2>
          <p className="text-parchment mb-8 max-w-md mx-auto">
            See the methodology in action — explore elements, scan the Grimoire, or open the full platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/elements" className="btn-arcane btn-arcane-hover">
              <Atom className="h-4 w-4" /> Explore Elements
            </Link>
            <Link to="/app" className="btn-ghost-arcane">
              <Zap className="h-4 w-4" /> Open Platform
            </Link>
          </div>
        </section>
      </div>

      <footer className="border-t border-parchment/20 py-8 text-center text-xs tracking-[0.25em] text-parchment/60 uppercase relative z-10">
        ✦ AlcheMix AR — Augmented Chemistry Education ✦
      </footer>
    </div>
  );
}
