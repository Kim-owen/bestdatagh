import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  ArrowRight, Mail, Lock, User, ShieldCheck, Wallet, History, Rocket,
  Smartphone, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, Sparkles, RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendPhoneOtp, verifyPhoneOtp, triggerWelcomeSms, registerPhoneVerifiedUser, loginPhoneVerifiedUser, checkSignupUniqueness } from "@/lib/otp.functions";
import { recordLoginIpSecurity } from "@/lib/security.functions";

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

/* ============ Login Form with SMS OTP Verification ============ */
function LoginForm({ next }: { next?: string }) {
  const nav = useNavigate();
  const sendOtpFn = useServerFn(sendPhoneOtp);
  const verifyOtpFn = useServerFn(verifyPhoneOtp);
  const loginUserFn = useServerFn(loginPhoneVerifiedUser);
  const recordLoginIpFn = useServerFn(recordLoginIpSecurity);

  const [loginMode, setLoginMode] = useState<"OTP" | "PASSWORD">("OTP");

  // Phone OTP State
  const [phone, setPhone] = useState("");
  const [otpStep, setOtpStep] = useState<"PHONE" | "VERIFY">("PHONE");
  const [otpCode, setOtpCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Email/Password State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cleanPhone = phone.replace(/[^\d]/g, "");
  const validPhone = cleanPhone.length === 9 || cleanPhone.length === 10;

  useEffect(() => {
    let timer: any = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Send SMS OTP
  async function handleSendLoginOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!validPhone) {
      return setErr("Please enter a valid Ghana phone number (e.g. 0244 000 000).");
    }

    setBusy(true);
    try {
      const res = await sendOtpFn({ data: { phone: cleanPhone } });
      setMaskedPhone(res.maskedPhone);
      setOtpStep("VERIFY");
      setResendCooldown(30);
    } catch (error: any) {
      setErr(error.message || "Failed to send SMS verification code.");
    } finally {
      setBusy(false);
    }
  }

  // Step 2: Verify SMS OTP & Sign In Instantly
  async function handleVerifyAndLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const code = otpCode.trim();
    if (code.length !== 6) {
      return setErr("Please enter the complete 6-digit SMS verification code.");
    }

    setBusy(true);
    try {
      // 1. Verify OTP code
      await verifyOtpFn({ data: { phone: cleanPhone, otpCode: code } });

      // 2. Resolve credentials for phone-verified user
      const userRes = await loginUserFn({ data: { phone: cleanPhone } });

      // 3. Sign in to Supabase Session
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: userRes.email,
        password: userRes.password,
      });

      if (authErr) throw new Error(authErr.message);

      // Record IP Security
      try {
        await recordLoginIpFn({});
      } catch {}

      nav({ to: (next as any) || "/account" });
    } catch (error: any) {
      setErr(error.message || "Invalid SMS verification code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Password Login Fallback
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr(error.message);

    try {
      await recordLoginIpFn({});
    } catch {}

    nav({ to: (next as any) || "/account" });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black font-display">Welcome Back</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {loginMode === "OTP"
            ? "Log in securely using your Phone Number & SMS OTP."
            : "Sign in with your Email and Password."}
        </p>
      </div>

      {loginMode === "OTP" ? (
        otpStep === "PHONE" ? (
          <form onSubmit={handleSendLoginOtp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold">Phone Number (MoMo)</label>
              <Field
                icon={Smartphone}
                type="tel"
                placeholder="0244 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                We'll send a 6-digit SMS verification code to this phone number.
              </p>
            </div>

            {err && (
              <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-bold text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{err}</span>
              </div>
            )}

            <button
              disabled={busy || !validPhone}
              className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-3.5 text-xs font-extrabold text-primary-foreground shadow-[0_4px_16px_-2px_hsl(243_85%_62%_/_0.5)] hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
            >
              {busy ? "Sending SMS OTP..." : "Send SMS Verification Code"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndLogin} className="space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-primary">SMS Code Sent</span>
                <button
                  type="button"
                  onClick={() => setOtpStep("PHONE")}
                  className="text-[11px] text-muted-foreground underline hover:text-foreground"
                >
                  Change Number
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit OTP code sent to <strong>{maskedPhone}</strong>
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold">6-Digit Verification Code</label>
              <Field
                icon={KeyRound}
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
            </div>

            {err && (
              <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-bold text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{err}</span>
              </div>
            )}

            <button
              disabled={busy || otpCode.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-3.5 text-xs font-extrabold text-primary-foreground shadow-[0_4px_16px_-2px_hsl(243_85%_62%_/_0.5)] hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
            >
              {busy ? "Verifying & Signing In..." : "Verify & Log In Instantly"} <ArrowRight className="h-4 w-4" />
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                disabled={resendCooldown > 0 || busy}
                onClick={async () => {
                  if (resendCooldown > 0 || busy) return;
                  setErr(null);
                  setBusy(true);
                  try {
                    const res = await sendOtpFn({ data: { phone: cleanPhone } });
                    setMaskedPhone(res.maskedPhone);
                    setResendCooldown(30);
                  } catch (e: any) {
                    setErr(e.message || "Failed to resend SMS code.");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="text-xs font-bold text-primary hover:underline disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : "Resend Verification Code"}
              </button>
            </div>
          </form>
        )
      ) : (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
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
      )}

      {/* Mode Switcher */}
      <div className="pt-2 text-center border-t border-border">
        <button
          type="button"
          onClick={() => {
            setErr(null);
            setLoginMode(loginMode === "OTP" ? "PASSWORD" : "OTP");
          }}
          className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          {loginMode === "OTP"
            ? "Log in with Password instead →"
            : "← Log in with Phone SMS OTP instead"}
        </button>
      </div>
    </div>
  );
}

/* ============ Signup Form with Mobile OTP Verification ============ */
function SignupForm({ next }: { next?: string }) {
  const nav = useNavigate();
  const sendOtpFn = useServerFn(sendPhoneOtp);
  const verifyOtpFn = useServerFn(verifyPhoneOtp);
  const registerUserFn = useServerFn(registerPhoneVerifiedUser);
  const checkUniquenessFn = useServerFn(checkSignupUniqueness);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP state
  const [step, setStep] = useState<"DETAILS" | "OTP">("DETAILS");
  const [otpCode, setOtpCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const cleanPhone = phone.replace(/[^\d]/g, "");
  const validPhone = cleanPhone.length === 9 || cleanPhone.length === 10;
  const passwordsMatch = password.length >= 8 && password === confirmPassword;

  useEffect(() => {
    let timer: any = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Send SMS OTP via TxtConnect Gateway
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!passwordsMatch) {
      return setErr("Passwords do not match. Please verify your entries.");
    }
    if (!validPhone) {
      return setErr("Please enter a valid Ghanaian phone number (e.g. 0244 000 000).");
    }

    setBusy(true);
    try {
      // Enforce strict uniqueness check (Phone, Email, Name)
      await checkUniquenessFn({ data: { phone: cleanPhone, email, name } });

      const res = await sendOtpFn({ data: { phone: cleanPhone } });
      setMaskedPhone(res.maskedPhone);
      setStep("OTP");
      setResendCooldown(30);
    } catch (error: any) {
      setErr(error.message || "Failed to send SMS verification code via TxtConnect.");
    } finally {
      setBusy(false);
    }
  }

  // Resend OTP
  async function handleResendCode() {
    if (resendCooldown > 0 || busy) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await sendOtpFn({ data: { phone: cleanPhone } });
      setMaskedPhone(res.maskedPhone);
      setResendCooldown(30);
    } catch (error: any) {
      setErr(error.message || "Failed to resend SMS code.");
    } finally {
      setBusy(false);
    }
  }

  // Step 2: Verify OTP & Create Supabase User
  async function handleVerifyAndSignup(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const code = otpCode.trim();
    if (code.length !== 6) {
      return setErr("Please enter the full 6-digit SMS verification code.");
    }

    setBusy(true);
    try {
      // 1. Verify OTP against Supabase phone_verifications table
      await verifyOtpFn({ data: { phone: cleanPhone, otpCode: code } });

      // 2. Register user with instant auto email confirmation (bypasses email links)
      await registerUserFn({ data: { email, password, name, phone: cleanPhone } });

      // 3. Auto sign-in immediately
      await supabase.auth.signInWithPassword({ email, password });

      setOk(true);
      setTimeout(() => nav({ to: (next as any) || "/" }), 1200);
    } catch (error: any) {
      setErr(error.message || "OTP verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "OTP") {
    return (
      <form onSubmit={handleVerifyAndSignup} className="space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-400 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" /> SMS Verification Sent
          </div>
          <h2 className="text-xl font-black font-display text-white">Enter SMS Code</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            We sent a 6-digit code via TxtConnect SMS to <strong className="text-amber-400 font-bold">{maskedPhone}</strong>
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-300">6-Digit Verification Code</label>
          <div className="relative flex items-center rounded-2xl border border-white/10 bg-black/40 focus-within:border-emerald-400 transition-all">
            <span className="pl-3.5 pr-2 text-xs font-bold text-slate-400">
              <KeyRound className="h-4 w-4 text-emerald-400" />
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, ""))}
              required
              autoFocus
              className="w-full bg-transparent py-3 pr-4 text-sm font-extrabold tracking-widest text-emerald-300 outline-none placeholder:tracking-normal"
            />
          </div>
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
            <span>Phone verified & account created! Redirecting…</span>
          </div>
        )}

        <button
          disabled={busy || otpCode.trim().length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-3.5 text-xs font-extrabold text-slate-950 shadow-lg hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
        >
          {busy ? "Verifying Code…" : "Confirm Code & Create Account"} <ArrowRight className="h-4 w-4 stroke-[3]" />
        </button>

        <div className="flex items-center justify-between text-xs font-semibold pt-1">
          <button
            type="button"
            onClick={() => setStep("DETAILS")}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ← Edit Details
          </button>
          <button
            type="button"
            disabled={resendCooldown > 0 || busy}
            onClick={handleResendCode}
            className="text-amber-400 hover:underline disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
            <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend SMS Code"}</span>
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendOtp} className="space-y-4">
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

      <button
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-3.5 text-xs font-extrabold text-primary-foreground shadow-[0_4px_16px_-2px_hsl(243_85%_62%_/_0.5)] hover:scale-[1.01] active:scale-[.98] disabled:opacity-60 transition-all"
      >
        {busy ? "Sending SMS Verification…" : "Send SMS Code & Continue"} <ArrowRight className="h-4 w-4" />
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

