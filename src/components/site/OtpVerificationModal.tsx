import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, RefreshCw, AlertCircle, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/otp.functions";

export interface OtpVerificationModalProps {
  open: boolean;
  phone: string;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

export function OtpVerificationModal({ open, phone, onOpenChange, onVerified }: OtpVerificationModalProps) {
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [countdown, setCountdown] = useState(60);

  // Initialize and send initial OTP when modal opens
  useEffect(() => {
    if (open && phone) {
      setOtpCode("");
      setErrorMsg("");
      setLoading(false);
      handleSendOtp();
    }
  }, [open, phone]);

  // Resend countdown timer
  useEffect(() => {
    let timer: any;
    if (open && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [open, countdown]);

  const handleSendOtp = async () => {
    try {
      setResending(true);
      setErrorMsg("");
      const res = await sendPhoneOtp({ data: { phone } });
      setMaskedPhone(res.maskedPhone);
      if (res.otpCode) {
        setDemoCode(res.otpCode);
      }
      setCountdown(60);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send verification code.");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6 || loading) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await verifyPhoneOtp({ data: { phone, otpCode: codeToVerify } });
      if (res.success) {
        onVerified();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid verification code");
      setOtpCode("");
    } finally {
      setLoading(false);
    }
  };

  const onOtpChange = (val: string) => {
    setOtpCode(val);
    setErrorMsg("");
    if (val.length === 6) {
      handleVerify(val);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-2xl backdrop-blur-2xl">
        <DialogHeader className="text-center sm:text-center space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gold-gradient text-primary-foreground shadow-lg ring-4 ring-primary/10">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <DialogTitle className="text-xl md:text-2xl font-black font-display tracking-tight">
            First-Time Buyer Verification
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Welcome to Bestdata! Security is our priority. Please enter the 6-digit verification code sent to your phone.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5 text-center">
          {/* Phone Badge */}
          <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-muted/60 border border-border/60 px-4 py-2 text-xs font-bold text-foreground">
            <Phone className="h-3.5 w-3.5 text-primary" />
            <span>{maskedPhone || `+233 ${phone}`}</span>
          </div>

          {/* OTP Code Display Box for Easy Testing */}
          {demoCode && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-xs text-primary font-bold">
              Verification Code: <span className="font-mono text-base font-black tracking-wider ml-1">{demoCode}</span>
            </div>
          )}

          {/* OTP Input Slots */}
          <div className="flex justify-center py-2">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={onOtpChange}
              disabled={loading}
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="h-12 w-11 rounded-xl border border-border bg-background text-lg font-black shadow-sm" />
                <InputOTPSlot index={1} className="h-12 w-11 rounded-xl border border-border bg-background text-lg font-black shadow-sm" />
                <InputOTPSlot index={2} className="h-12 w-11 rounded-xl border border-border bg-background text-lg font-black shadow-sm" />
                <InputOTPSlot index={3} className="h-12 w-11 rounded-xl border border-border bg-background text-lg font-black shadow-sm" />
                <InputOTPSlot index={4} className="h-12 w-11 rounded-xl border border-border bg-background text-lg font-black shadow-sm" />
                <InputOTPSlot index={5} className="h-12 w-11 rounded-xl border border-border bg-background text-lg font-black shadow-sm" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/15 border border-destructive/30 p-3 text-xs font-bold text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Loading Status */}
          {loading && (
            <div className="flex items-center justify-center gap-2 text-xs font-extrabold text-primary py-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying code…</span>
            </div>
          )}

          {/* Resend OTP Trigger */}
          <div className="pt-2 flex items-center justify-between text-xs border-t border-border/50">
            <span className="text-muted-foreground">Didn't receive code?</span>
            {countdown > 0 ? (
              <span className="font-bold text-muted-foreground">Resend in {countdown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={resending}
                className="font-bold text-primary hover:underline inline-flex items-center gap-1.5"
              >
                {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Resend Code
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
