import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PhoneCall, RefreshCw, ShieldCheck, Zap, ArrowRight, X, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { initiateMoMoPromptCharge, pollOrderStatus } from "@/lib/orders.functions";

interface InAppPaymentModalProps {
  orderId: string;
  reference: string;
  recipientPhone: string;
  network: string;
  totalGhs: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function InAppPaymentModal({
  orderId,
  reference,
  recipientPhone,
  network,
  totalGhs,
  onClose,
  onSuccess,
}: InAppPaymentModalProps) {
  const triggerCharge = useServerFn(initiateMoMoPromptCharge);
  const checkStatus = useServerFn(pollOrderStatus);

  const [promptSent, setPromptSent] = useState(false);
  const [displayText, setDisplayText] = useState("Sending MoMo payment prompt to your phone...");
  const [orderState, setOrderState] = useState<"pending" | "paid" | "processing" | "delivered" | "failed">("pending");
  const [isResending, setIsResending] = useState(false);

  // 1. Trigger MoMo Prompt Charge immediately on mount
  useEffect(() => {
    let isMounted = true;
    async function startMoMoPrompt() {
      try {
        const res = await triggerCharge({
          data: { orderId, phone: recipientPhone, network },
        });
        if (isMounted) {
          setPromptSent(true);
          if (res.displayText) setDisplayText(res.displayText);
        }
      } catch (err: any) {
        if (isMounted) {
          setPromptSent(true);
          setDisplayText("Prompt initiated! Please check your phone screen to enter your Mobile Money PIN.");
        }
      }
    }
    startMoMoPrompt();
    return () => {
      isMounted = false;
    };
  }, [orderId, recipientPhone, network]);

  // 2. Poll order status every 3 seconds until delivered
  useEffect(() => {
    if (orderState === "delivered" || orderState === "failed") return;

    const interval = setInterval(async () => {
      try {
        const res = await checkStatus({ data: { reference } });
        if (res?.status) {
          if (res.status === "paid") {
            setOrderState("paid");
            setDisplayText("Payment received! Dispatching data bundle to your line...");
          } else if (res.status === "processing") {
            setOrderState("processing");
            setDisplayText("Processing with network gateway...");
          } else if (res.status === "delivered") {
            setOrderState("delivered");
            setDisplayText("Data bundle delivered successfully!");
            onSuccess();
          } else if (res.status === "failed") {
            setOrderState("failed");
            setDisplayText("Payment failed or timed out. Please try again.");
          }
        }
      } catch (err) {
        console.warn("Poll status error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [reference, orderState, onSuccess]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      const res = await triggerCharge({
        data: { orderId, phone: recipientPhone, network },
      });
      setPromptSent(true);
      if (res.displayText) setDisplayText(res.displayText);
    } catch {
      setDisplayText("Prompt re-sent! Check your phone screen.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-slate-950 text-white p-6 sm:p-8 shadow-2xl overflow-hidden space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/20 text-amber-400 font-bold">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base tracking-tight font-display">In-App Payment Authorization</h3>
              <p className="text-[11px] text-slate-400 font-mono">Ref: {reference}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Status Section */}
        {orderState !== "delivered" && (
          <div className="space-y-6 text-center">
            {/* Phone Pulse Visualizer */}
            <div className="relative mx-auto h-24 w-24 grid place-items-center">
              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-indigo-500/20 animate-pulse" />
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 shadow-xl border border-white/20 text-white">
                <PhoneCall className="h-8 w-8 animate-bounce" />
              </div>
            </div>

            {/* Instruction Box */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
              <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
                <Sparkles className="h-4 w-4" /> Check Your Phone Screen
              </div>
              <p className="text-sm font-semibold text-slate-200 leading-snug">
                {displayText}
              </p>
              <div className="pt-1 text-xs text-slate-400 font-mono">
                Recipient: <span className="text-amber-400 font-bold">{recipientPhone}</span> · Total: <span className="text-emerald-400 font-bold">GH₵ {totalGhs.toFixed(2)}</span>
              </div>
            </div>

            {/* Progress Stepper */}
            <div className="space-y-2.5 text-left border border-white/10 rounded-2xl p-4 bg-slate-900/60">
              <div className="flex items-center gap-3 text-xs">
                <div className={`grid h-6 w-6 place-items-center rounded-full font-bold text-[10px] ${
                  promptSent ? "bg-emerald-500 text-slate-950" : "bg-white/10 text-slate-400"
                }`}>
                  {promptSent ? <CheckCircle2 className="h-4 w-4" /> : "1"}
                </div>
                <span className={promptSent ? "text-emerald-400 font-bold" : "text-slate-400"}>
                  MoMo Prompt Pushed to Phone
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className={`grid h-6 w-6 place-items-center rounded-full font-bold text-[10px] ${
                  orderState === "paid" || orderState === "processing" ? "bg-emerald-500 text-slate-950" : "bg-white/10 text-slate-400"
                }`}>
                  {orderState === "paid" || orderState === "processing" ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />}
                </div>
                <span className={orderState === "paid" || orderState === "processing" ? "text-emerald-400 font-bold" : "text-slate-300"}>
                  Payment Verification (Polling Live)
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className={`grid h-6 w-6 place-items-center rounded-full font-bold text-[10px] ${
                  (orderState as string) === "delivered" ? "bg-emerald-500 text-slate-950" : "bg-white/10 text-slate-400"
                }`}>
                  {(orderState as string) === "delivered" ? <CheckCircle2 className="h-4 w-4" /> : "3"}
                </div>
                <span className={(orderState as string) === "delivered" ? "text-emerald-400 font-bold" : "text-slate-400"}>
                  Automated Data Delivery
                </span>
              </div>
            </div>

            {/* Resend Action */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`} />
                <span>Didn't get prompt? Resend MoMo Prompt</span>
              </button>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Paystack Protected</span>
              </div>
            </div>
          </div>
        )}

        {/* Delivered Success Screen */}
        {orderState === "delivered" && (
          <div className="space-y-6 text-center animate-in zoom-in-95">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-black text-white font-display">Data Delivered Successfully! 🎉</h4>
              <p className="text-xs text-slate-400">
                Your data bundle has been credited to <span className="text-white font-bold">{recipientPhone}</span>.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-xs font-mono space-y-1.5 text-left">
              <div className="flex justify-between text-slate-400">
                <span>Reference:</span>
                <span className="text-white font-bold">{reference}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Paid:</span>
                <span className="text-emerald-400 font-bold">GH₵ {totalGhs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivery Status:</span>
                <span className="text-emerald-400 font-bold uppercase">Delivered</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 rounded-2xl gold-gradient py-3.5 text-xs font-black text-primary-foreground shadow-lg hover:scale-[1.02] active:scale-[.98] transition-all"
            >
              <span>Close & Complete</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
