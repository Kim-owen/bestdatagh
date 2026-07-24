import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useServerFn } from "@tanstack/react-start";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/otp.functions";
import { initiateMoMoPromptCharge, submitPaystackOtpCharge } from "@/lib/orders.functions";
import { ShieldCheck, Lock, ArrowRight, RefreshCw, CheckCircle2, AlertCircle, Phone } from "lucide-react";

export const Route = createFileRoute("/verify-otp")({
  validateSearch: (search: Record<string, unknown>) => ({
    phone: (search.phone as string) || "",
    ref: (search.ref as string) || "",
  }),
  head: () => ({
    meta: [
      { title: "Paystack OTP Verification — Bestdata" },
      { name: "description", content: "Verify your Paystack Mobile Money OTP code to authorize payment." },
    ],
  }),
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const { phone, ref } = useSearch({ from: "/verify-otp" });
  const navigate = useNavigate();

  const sendOtpFn = useServerFn(sendPhoneOtp);
  const verifyOtpFn = useServerFn(verifyPhoneOtp);
  const submitPaystackOtpFn = useServerFn(submitPaystackOtpCharge);

  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");

  useEffect(() => {
    if (phone) {
      const clean = phone.replace(/\s+/g, "");
      if (clean.length >= 9) {
        setMaskedPhone(`+233 ${clean.slice(-9, -7)} *** ${clean.slice(-4)}`);
      }
    }
  }, [phone]);

  const handleSendOtp = async () => {
    if (!phone) return;
    setIsSending(true);
    setErrorMsg("");
    try {
      const res = await sendOtpFn({ data: { phone } });
      setSuccessMsg(`OTP code re-requested for ${res.maskedPhone}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend OTP code.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      setErrorMsg("Please enter a valid OTP verification code");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      if (ref) {
        // Submit OTP code to Paystack charge session
        await submitPaystackOtpFn({ data: { reference: ref, otp: otpCode } });
        navigate({
          to: "/payment/$reference",
          params: { reference: ref },
        });
      } else {
        await verifyOtpFn({ data: { phone, otpCode } });
        navigate({ to: "/buy-data", search: { network: "MTN" } });
      }
    } catch (err: any) {
      console.warn("OTP verification fallback check:", err.message);
      // Fallback: proceed to live payment status page
      if (ref) {
        navigate({
          to: "/payment/$reference",
          params: { reference: ref },
        });
      } else {
        setErrorMsg(err.message || "Invalid or expired OTP code.");
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#060612] text-foreground flex flex-col justify-between">
      <Header />

      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-12 md:py-20 w-full">
        <div className="mx-auto max-w-md">
          
          <div className="rounded-[32px] border border-white/15 bg-slate-950/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-6">
            
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gold-gradient text-slate-950 shadow-xl">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-black text-white font-display">New Phone Verification</h1>
              <p className="text-xs text-slate-400">
                To protect against fraud, first-time buyers on Bestdata verify their number via 6-digit SMS OTP.
              </p>
            </div>

            {/* Target Phone Badge */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Phone className="h-4 w-4" />
                <span>SMS Sent To:</span>
              </div>
              <span className="font-mono font-black text-white">{maskedPhone || phone}</span>
            </div>

            {/* Form */}
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-300 mb-1.5">
                  Enter 6-Digit OTP Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono font-black rounded-2xl border border-white/20 bg-slate-900 px-4 py-3.5 text-white placeholder:text-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-destructive/15 border border-destructive/30 p-3 text-xs font-medium text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-2xl gold-gradient py-4 text-xs font-black text-primary-foreground shadow-xl hover:scale-[1.01] active:scale-[.98] disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>Verifying OTP Code…</>
                ) : (
                  <>
                    <span>Verify & Continue to MoMo Payment</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Resend Action */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Didn't receive code?</span>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSending}
                className="font-bold text-amber-400 hover:text-amber-300 disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSending ? "animate-spin" : ""}`} />
                <span>Resend Code</span>
              </button>
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
