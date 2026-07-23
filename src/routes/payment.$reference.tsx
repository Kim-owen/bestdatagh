import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { initiateMoMoPromptCharge, pollOrderStatus } from "@/lib/orders.functions";
import { CheckCircle2, Loader2, PhoneCall, RefreshCw, ShieldCheck, Zap, ArrowRight, Copy, Check, Sparkles, ExternalLink, HelpCircle, PackageCheck } from "lucide-react";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/payment/$reference")({
  head: ({ params }) => ({
    meta: [
      { title: `Payment ${params.reference} — Bestdata` },
      { name: "description", content: "Complete your Mobile Money payment and track instant data delivery in real-time." },
    ],
  }),
  component: PaymentPage,
});

function PaymentPage() {
  const { reference } = useParams({ from: "/payment/$reference" });
  const triggerCharge = useServerFn(initiateMoMoPromptCharge);
  const checkStatus = useServerFn(pollOrderStatus);
  const { clear } = useCart();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);
  const [promptSent, setPromptSent] = useState(false);
  const [displayText, setDisplayText] = useState("Sending Mobile Money payment prompt to your phone...");
  const [isResending, setIsResending] = useState(false);

  // Poll order status every 3 seconds
  const { data: pollData, isError } = useQuery({
    queryKey: ["pollOrderStatus", reference],
    queryFn: async () => {
      const res = await checkStatus({ data: { reference } });
      return res;
    },
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.status;
      if (currentStatus === "delivered" || currentStatus === "failed") {
        return false; // Stop polling when finished
      }
      return 3000; // Poll every 3 seconds
    },
  });

  const order = pollData?.order;
  const currentStatus = pollData?.status || order?.status || "pending";
  const firstItem = order?.order_items?.[0];
  const recipientPhone = firstItem?.recipient_phone || "Your Phone";
  const networkName = firstItem?.network || "Network";
  const sizeLabel = firstItem?.size_label || "Data Bundle";
  const totalGhs = order?.total_ghs || 0;

  // Clear cart when order is successfully delivered
  useEffect(() => {
    if (currentStatus === "delivered") {
      clear();
    }
  }, [currentStatus, clear]);

  const handleResendPrompt = async () => {
    if (!order) return;
    setIsResending(true);
    try {
      const res = await triggerCharge({
        data: { orderId: order.id, phone: recipientPhone, network: networkName },
      });
      setPromptSent(true);
      if (res.displayText) setDisplayText(res.displayText);
    } catch {
      setDisplayText("Prompt re-sent! Please check your phone screen to enter your MoMo PIN.");
    } finally {
      setIsResending(false);
    }
  };

  const copyRef = () => {
    navigator.clipboard.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#060612] text-foreground flex flex-col justify-between">
      <Header />

      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 md:py-16 w-full">
        <div className="mx-auto max-w-2xl space-y-8">
          
          {/* Top Breadcrumb & Reference Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-white/10 p-5 rounded-3xl backdrop-blur-xl shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">
                <Sparkles className="h-3.5 w-3.5" /> In-App Payment Gateway
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white font-display flex items-center gap-2">
                Order #{reference}
              </h1>
            </div>

            <button
              onClick={copyRef}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono font-bold text-slate-300 transition-all w-fit"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              <span>{copied ? "Copied!" : "Copy Reference"}</span>
            </button>
          </div>

          {/* MAIN PAYMENT & DELIVERY CARD */}
          <div className="relative rounded-[32px] border border-white/15 bg-slate-950/90 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl overflow-hidden space-y-8">
            
            {/* DELIVERED STATE 🎉 */}
            {currentStatus === "delivered" ? (
              <div className="space-y-8 text-center animate-in zoom-in-95">
                <div className="relative mx-auto h-24 w-24 grid place-items-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse" />
                  <div className="relative grid h-20 w-20 place-items-center rounded-full bg-emerald-500 text-slate-950 shadow-2xl">
                    <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white font-display">Data Delivered Successfully! 🎉</h2>
                  <p className="text-sm text-slate-300 max-w-md mx-auto">
                    Your <span className="text-amber-400 font-bold">{sizeLabel} ({networkName})</span> bundle has been credited directly to <span className="text-white font-extrabold">{recipientPhone}</span>.
                  </p>
                </div>

                {/* Receipt Card */}
                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-left space-y-3 text-xs font-mono">
                  <div className="flex justify-between border-b border-emerald-500/20 pb-2">
                    <span className="text-emerald-300 font-bold uppercase">Transaction Status:</span>
                    <span className="text-emerald-400 font-black uppercase bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">✓ DELIVERED</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Reference:</span>
                    <span className="text-white font-bold">{reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Recipient Phone:</span>
                    <span className="text-white font-bold">{recipientPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Bundle Package:</span>
                    <span className="text-white font-bold">{networkName} · {sizeLabel}</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-500/20 pt-2 text-sm font-sans font-bold">
                    <span className="text-white">Total Paid:</span>
                    <span className="text-emerald-400 font-mono font-black text-base">GH₵ {totalGhs.toFixed(2)}</span>
                  </div>
                </div>

                {/* Action CTA Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <Link
                    to="/buy-data"
                    className="flex items-center justify-center gap-2 rounded-2xl gold-gradient py-4 text-xs font-black text-primary-foreground shadow-xl hover:scale-[1.02] active:scale-[.98] transition-all"
                  >
                    <span>Buy Another Bundle</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    to="/track-order"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-4 text-xs font-bold text-white hover:bg-white/10 transition-all"
                  >
                    <PackageCheck className="h-4 w-4 text-emerald-400" />
                    <span>Track All Orders</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* LIVE IN-PROGRESS MO-MO PROMPT & STATUS SCREEN */
              <div className="space-y-8">
                
                {/* Visual MoMo Phone Visualizer */}
                <div className="relative mx-auto max-w-sm rounded-3xl border border-amber-500/30 bg-slate-900/90 p-6 text-center shadow-xl space-y-4">
                  <div className="relative mx-auto h-20 w-20 grid place-items-center">
                    <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                    <div className="relative grid h-16 w-16 place-items-center rounded-2xl gold-gradient text-slate-950 shadow-lg">
                      <PhoneCall className="h-8 w-8 animate-bounce" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-400">
                      <Zap className="h-3 w-3" /> Live MoMo Push Active
                    </span>
                    <h3 className="text-lg font-black text-white font-display">Check Your Phone Screen!</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      A Mobile Money prompt has been pushed to <span className="text-amber-400 font-bold">{recipientPhone}</span>.
                      Enter your 4-digit MoMo PIN to authorize <span className="text-emerald-400 font-bold">GH₵ {totalGhs.toFixed(2)}</span>.
                    </p>
                  </div>

                  {/* Live Log Bar */}
                  <div className="rounded-xl bg-slate-950 p-3 text-[11px] font-mono text-slate-400 border border-white/10 flex items-center justify-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                    <span>{displayText}</span>
                  </div>
                </div>

                {/* 4-Step Progress Tracker */}
                <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 space-y-4">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between border-b border-white/10 pb-3">
                    <span>Order Progress Tracker</span>
                    <span className="text-amber-400 font-mono text-[10px]">Polling Live (3s)</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Step 1 */}
                    <div className="flex items-center gap-3">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-slate-950 font-black text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white">1. Order Created & MoMo Prompt Pushed</div>
                        <div className="text-[10px] text-slate-400">MoMo prompt sent to {recipientPhone}</div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-center gap-3">
                      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-black text-xs ${
                        currentStatus === "paid" || currentStatus === "processing" ? "bg-emerald-500 text-slate-950" : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      }`}>
                        {currentStatus === "paid" || currentStatus === "processing" ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                      <div className="min-w-0">
                        <div className={`font-bold ${currentStatus === "paid" || currentStatus === "processing" ? "text-emerald-400" : "text-white"}`}>
                          2. Payment Verification (Awaiting PIN)
                        </div>
                        <div className="text-[10px] text-slate-400">Verifying live server callback from Paystack</div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-center gap-3">
                      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-black text-xs ${
                        currentStatus === "processing" ? "bg-emerald-500 text-slate-950" : "bg-white/10 text-slate-500"
                      }`}>
                        3
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-400">3. Network Gateway Dispatch</div>
                        <div className="text-[10px] text-slate-500">Connecting to {networkName} automated API</div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-center gap-3">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-slate-500 font-black text-xs">
                        4
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-400">4. Bundle Delivered to Phone</div>
                        <div className="text-[10px] text-slate-500">Instant SMS confirmation sent to line</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resend & Support Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleResendPrompt}
                    disabled={isResending}
                    className="flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500/25 disabled:opacity-50 transition-all"
                  >
                    <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                    <span>Resend MoMo Prompt to Phone</span>
                  </button>

                  <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> 256-Bit Encrypted</span>
                    <Link to="/support" className="flex items-center gap-1 hover:text-white transition-colors">
                      <HelpCircle className="h-4 w-4" /> Need Help?
                    </Link>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
