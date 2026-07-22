import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  ArrowRight, Mail, Lock, User, ShieldCheck, Wallet, History, Rocket,
  Smartphone, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, Sparkles
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (s.tab === "signup" ? "signup" : s.tab === "forgot" ? "forgot" : "login") as "login" | "signup" | "forgot",
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign In or Create Account — Bestdata" },
      { name: "description", content: "Log in or create a free Bestdata account for wallet, history and priority support." },
      { property: "og:title", content: "Sign In — Bestdata" },
      { property: "og:description", content: "Log in or create a free Bestdata account." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { tab, next } = Route.useSearch();
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-indigo-500/15 blur-[120px]" />
      </div>

      <Header />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-12 md:py-20 relative z-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          
          {/* Animated Auth Card Container */}
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-border/80 bg-card/80 p-6 md:p-8 shadow-2xl backdrop-blur-2xl transition-all duration-300">
              
              {/* Tab Selector */}
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted/80 p-1.5 backdrop-blur-md">
                <Link
                  to="/auth"
                  search={{ tab: "login", next }}
                  className={`rounded-xl py-2 text-center text-xs font-black transition-all ${
                    tab === "login"
                      ? "bg-card text-foreground shadow-md scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Log In
                </Link>
                <Link
                  to="/auth"
                  search={{ tab: "signup", next }}
                  className={`rounded-xl py-2 text-center text-xs font-black transition-all ${
                    tab === "signup"
                      ? "bg-card text-foreground shadow-md scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign Up
                </Link>
                <Link
                  to="/auth"
                  search={{ tab: "forgot", next }}
                  className={`rounded-xl py-2 text-center text-xs font-black transition-all ${
                    tab === "forgot"
                      ? "bg-card text-foreground shadow-md scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Reset
                </Link>
              </div>

              {/* Animated Form Display */}
              <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                {tab === "login" && <LoginForm next={next} />}
                {tab === "signup" && <SignupForm next={next} />}
                {tab === "forgot" && <ForgotPasswordForm />}
              </div>

              <p className="mt-6 text-center text-[11px] font-semibold text-muted-foreground">
                Protected by 256-bit SSL Encryption · Bestdata Ghana
              </p>
            </div>
          </div>

          {/* Right Feature Panel */}
          <div className="lg:pl-6 space-y-6">
            <div>
              <div className="eyebrow mb-3">Member Benefits</div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight font-display">
                Unlock Wholesale Rates & Instant Tracking
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Guest purchases are always fast — but creating a free account gives you complete control over your mobile data orders and receipts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Wallet, title: "Order History", desc: "Access detailed transaction logs and instant invoice receipts." },
                { icon: History, title: "Bulk Purchases", desc: "Send data bundles to multiple numbers in a single order." },
                { icon: Rocket, title: "Developer API", desc: "Generate secure API keys to automate data delivery in your app." },
                { icon: ShieldCheck, title: "Priority Queue", desc: "Verified member orders get high-priority automated dispatch." },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="flex flex-col gap-2.5 rounded-3xl border border-border/70 bg-card/60 p-5 backdrop-blur-md hover:-translate-y-1 transition-all">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold">{b.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{b.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

/* ============ Form Field Component ============ */
function Field({
  icon: Icon,
  rightElement,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: any; rightElement?: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        {...props}
        className="w-full rounded-2xl border border-border/80 bg-background/80 pl-10 pr-10 py-3 text-xs font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-all"
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
  );
}

/* ============ Login Form ============ */
function LoginForm({ next }: { next?: string }) {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr(error.message);
    nav({ to: (next as any) || "/" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-black font-display">Welcome Back</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Sign in to manage your bundles and wallet.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold">Email Address</label>
        <Field
          icon={Mail}
          type="email"
          placeholder="yourname@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold">Password</label>
          <Link
            to="/auth"
            search={{ tab: "forgot", next }}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Field
          icon={Lock}
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-bold text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <button
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-3.5 text-xs font-extrabold text-primary-foreground shadow-[0_4px_16px_-2px_hsl(243_85%_62%_/_0.5)] hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
      >
        {busy ? "Signing In…" : "Sign In to Account"} <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

/* ============ Signup Form with Mobile & Confirm Password ============ */
function SignupForm({ next }: { next?: string }) {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const cleanPhone = phone.replace(/[^\d]/g, "");
  const validPhone = cleanPhone.length === 9 || cleanPhone.length === 10;
  const passwordsMatch = password.length >= 8 && password === confirmPassword;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!passwordsMatch) {
      return setErr("Passwords do not match. Please verify your entries.");
    }
    if (!validPhone) {
      return setErr("Please enter a valid Ghanaian phone number (e.g. 24 123 4567).");
    }

    setBusy(true);
    const formattedPhone = cleanPhone.startsWith("0") ? `+233${cleanPhone.slice(1)}` : `+233${cleanPhone}`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          display_name: name,
          phone: formattedPhone,
        },
      },
    });

    setBusy(false);
    if (error) return setErr(error.message);

    setOk(true);
    setTimeout(() => nav({ to: (next as any) || "/" }), 1200);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-black font-display">Create Account</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Register for free to track orders & save recipient numbers.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold">Full Name</label>
        <Field
          icon={User}
          placeholder="Kofi Mensah"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold">Mobile Phone (Ghana)</label>
        <div className="relative flex items-center rounded-2xl border border-border/80 bg-background/80 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40 transition-all">
          <span className="pl-3.5 pr-2 text-xs font-bold text-muted-foreground flex items-center gap-1">
            <Smartphone className="h-4 w-4 text-muted-foreground" /> 🇬🇭 +233
          </span>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="24 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
            required
            className="w-full bg-transparent py-3 pr-4 text-xs font-bold outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold">Email Address</label>
        <Field
          icon={Mail}
          type="email"
          placeholder="yourname@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold">Password (min. 8 chars)</label>
        <Field
          icon={Lock}
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold">Confirm Password</label>
        <Field
          icon={ShieldCheck}
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          rightElement={
            confirmPassword.length > 0 ? (
              passwordsMatch ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )
            ) : null
          }
        />
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="text-[10px] font-bold text-destructive mt-1">Passwords do not match</p>
        )}
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-bold text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {ok && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-bold text-emerald-500">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Account created successfully! Redirecting…</span>
        </div>
      )}

      <button
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-3.5 text-xs font-extrabold text-primary-foreground shadow-[0_4px_16px_-2px_hsl(243_85%_62%_/_0.5)] hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
      >
        {busy ? "Creating Account…" : "Create Free Account"} <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

/* ============ Forgot Password Form ============ */
function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?tab=login`,
    });

    setBusy(false);
    if (error) return setErr(error.message);
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-black font-display">Reset Password</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Enter your account email to receive a password reset link.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold">Email Address</label>
        <Field
          icon={Mail}
          type="email"
          placeholder="yourname@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-bold text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {sent ? (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
          <div className="text-xs font-extrabold text-emerald-500">Reset Email Sent!</div>
          <p className="text-[11px] text-muted-foreground">
            We sent a password reset link to <span className="font-bold text-foreground">{email}</span>. Please check your inbox.
          </p>
        </div>
      ) : (
        <button
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-3.5 text-xs font-extrabold text-primary-foreground shadow-[0_4px_16px_-2px_hsl(243_85%_62%_/_0.5)] hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
        >
          {busy ? "Sending Link…" : "Send Reset Link"} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}

