import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { pollOrderStatus, initiateMoMoPromptCharge } from "@/lib/orders.functions";
import { checkPhoneVerification, sendPhoneOtp } from "@/lib/otp.functions";
import { Zap, Lock, Phone, ShieldCheck, ArrowRight, Loader2, AlertCircle, CheckCircle2, Sparkles, CreditCard } from "lucide-react";
import { NetworkLogo } from "@/components/site/NetworkLogos";

export const Route = createFileRoute("/payment-momo/$reference")({
  head: ({ params }) => ({
    meta: [
      { title: `Enter Payment Number — #${params.reference}` },
      { name: "description", content: "Enter your Mobile Money payment number to receive prompt." },
    ],
  }),
  component: PaymentMomoPage,
});

const NETWORKS = [
  { key: "MTN", label: "MTN MoMo", color: "border-amber-500/50 bg-amber-500/10 text-amber-400" },
  { key: "Telecel", label: "Telecel Cash", color: "border-rose-500/50 bg-rose-500/10 text-rose-400" },
  { key: "AirtelTigo", label: "AT Money", color: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
] as const;

function PaymentMomoPage() {
  const { reference } = useParams({ from: "/payment-momo/$reference" });
  const navigate = useNavigate();

  const checkStatusFn = useServerFn(pollOrderStatus);
  const checkPhoneFn = useServerFn(checkPhoneVerification);
  const sendOtpFn = useServerFn(sendPhoneOtp);
  const triggerChargeFn = useServerFn(initiateMoMoPromptCharge);

  const [paymentPhone, setPaymentPhone] = useState("");
  const [sameAsRecipient, setSameAsRecipient] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("MTN");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: pollData } = useQuery({
    queryKey: ["orderForPayment", reference],
    queryFn: () => checkStatusFn({ data: { reference } }),
  });

  const order = pollData?.order;
  const firstItem = order?.order_items?.[0];
  const recipientPhone = firstItem?.recipient_phone || "";
  const bundleSize = firstItem?.size_label || "Data Bundle";
  const bundleNetwork = firstItem?.network || "MTN";
  const totalGhs = order?.total_ghs || 0;

  useEffect(() => {
    if (sameAsRecipient && recipientPhone) {
      setPaymentPhone(recipientPhone);
    }
  }, [sameAsRecipient, recipientPhone]);

  useEffect(() => {
    if (bundleNetwork) {
      setSelectedNetwork(bundleNetwork);
    }
  }, [bundleNetwork]);

  const activePhone = sameAsRecipient ? recipientPhone : paymentPhone;
  const validPhone = /^\d{9,10}$/.test(activePhone.replace(/\s+/g, ""));

  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPhone || !order) return;

    setLoading(true);
    setErrorMsg("");

    const phoneToProcess = activePhone.replace(/\s+/g, "");

    try {
      // 1. Check if phone is a first-time number on Bestdata
      const checkRes = await checkPhoneFn({ data: { phone: phoneToProcess } });

      if (!checkRes.isVerified) {
        // First-time buyer -> Send OTP & Navigate to /verify-otp
        await sendOtpFn({ data: { phone: phoneToProcess } });
        navigate({
          to: "/verify-otp",
          search: {
            phone: phoneToProcess,
            ref: reference,
          },
        });
      } else {
        // Verified returning buyer -> Trigger MoMo Push Prompt & Navigate to /payment/$reference
        await triggerChargeFn({
          data: {
            orderId: order.id,
            phone: phoneToProcess,
            network: selectedNetwork,
          },
        });

        navigate({
          to: "/payment/$reference",
          params: { reference },
        });
      }
    } catch (err: any) {
      console.error("Payment number submit error:", err);
      setErrorMsg(err.message || "Failed to process payment number.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060612] text-foreground flex flex-col justify-between">
      <Header />

      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 md:py-16 w-full">
        <div className="mx-auto max-w-xl space-y-8">
          
          {/* Header Badge */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/30 px-4 py-1.5 text-xs font-black text-amber-400 uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5" /> Step 2: Mobile Money Payment Number
            </div>
            <h1 className="text-3xl font-black text-white font-display">Enter MoMo Account Number</h1>
            <p className="text-xs text-slate-300">
              Provide the Mobile Money number you want to deduct funds from.
            </p>
          </div>

          {/* Main Card */}
          <div className="relative rounded-[32px] border border-white/15 bg-slate-950/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-6">
            
            {/* Order Summary Box */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Order Reference:</span>
                <span className="font-mono font-bold text-amber-400">#{reference}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Bundle Selected:</span>
                <span className="font-bold text-white">{bundleNetwork} · {bundleSize}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Data Recipient Number:</span>
                <span className="font-bold text-white">{recipientPhone}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-sm">
                <span className="font-bold text-slate-200">Total Payable:</span>
                <span className="font-mono font-black text-emerald-400">GH₵ {totalGhs.toFixed(2)}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleProceed} className="space-y-6">
              
              {/* Checkbox: Same Number */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sameAsRecipient}
                    onChange={(e) => setSameAsRecipient(e.target.checked)}
                    className="h-5 w-5 rounded border-white/20 bg-slate-950 text-amber-400 focus:ring-amber-400"
                  />
                  <div>
                    <div className="text-xs font-extrabold text-white">Use Recipient Phone Number for Payment</div>
                    <div className="text-[11px] text-slate-400">Deduct funds from <span className="text-amber-400 font-bold">{recipientPhone}</span></div>
                  </div>
                </label>
              </div>

              {/* Payment Number Input (if different) */}
              {!sameAsRecipient && (
                <div className="space-y-2 animate-in fade-in">
                  <label htmlFor="payer-phone" className="block text-xs font-extrabold uppercase tracking-widest text-slate-300">
                    Payer Mobile Money Number
                  </label>
                  <div className="relative flex items-center bg-slate-900 border border-white/15 rounded-2xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <div className="flex items-center gap-1.5 pl-4 pr-3 py-3.5 text-slate-300 text-xs font-bold border-r border-white/10 bg-white/5">
                      <span>🇬🇭</span>
                      <span>+233</span>
                    </div>
                    <input
                      id="payer-phone"
                      type="tel"
                      inputMode="tel"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                      placeholder="055 123 4567"
                      className="flex-1 bg-transparent px-4 py-3.5 text-white placeholder:text-slate-600 text-sm font-semibold focus:outline-none"
                    />
                    <Phone className="h-4 w-4 text-slate-500 mr-4 shrink-0" />
                  </div>
                </div>
              )}

              {/* Network Provider Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-300">
                  Select Payer MoMo Network
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {NETWORKS.map((net) => {
                    const isSelected = selectedNetwork.toUpperCase() === net.key.toUpperCase();
                    return (
                      <button
                        key={net.key}
                        type="button"
                        onClick={() => setSelectedNetwork(net.key)}
                        className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                          isSelected
                            ? net.color + " ring-2 ring-amber-400/50 scale-[1.03]"
                            : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20"
                        }`}
                      >
                        <NetworkLogo network={net.key as any} className="h-6 w-6" />
                        <span className="text-[10px] font-black uppercase tracking-wider">{net.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-destructive/15 border border-destructive/30 p-3 text-xs font-medium text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !validPhone}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl gold-gradient py-4 text-sm font-black text-primary-foreground shadow-xl hover:scale-[1.02] active:scale-[.98] disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying & Initializing Prompt…
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Trigger MoMo Push Prompt on Phone</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Paystack 256-Bit Bank Grade Encryption</span>
              </div>
            </form>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
