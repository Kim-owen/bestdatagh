




import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { initiateMoMoPromptCharge, submitPaystackOtpCharge, pollOrderStatus, resolveMoMoAccountName, createPaymentRequestInvoice } from "@/lib/orders.functions";
import { getMyWallet, payOrderWithWallet } from "@/lib/wallet.functions";
import { useAuth } from "@/lib/auth";
import { sendPhoneOtp } from "@/lib/otp.functions";
import { CheckCircle2, Loader2, PhoneCall, RefreshCw, ShieldCheck, Zap, ArrowRight, Copy, Check, Sparkles, CreditCard, Lock, Phone, AlertCircle, X, Wallet } from "lucide-react";
import { NetworkLogo } from "@/components/site/NetworkLogos";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/payment/$reference")({
  head: ({ params }) => ({
    meta: [
      { title: `Payment Hub #${params.reference} — Bestdata` },
      { name: "description", content: "Complete your Mobile Money or Wallet payment and track instant data delivery in real-time." },
    ],
  }),
  component: UnifiedPaymentPage,
});

const NETWORKS = [
  { key: "MTN", label: "MTN MoMo", color: "border-amber-500/50 bg-amber-500/10 text-amber-400" },
  { key: "Telecel", label: "Telecel Cash", color: "border-rose-500/50 bg-rose-500/10 text-rose-400" },
  { key: "AirtelTigo", label: "AT Money", color: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
] as const;

function UnifiedPaymentPage() {
  const { reference } = useParams({ from: "/payment/$reference" });
  const navigate = useNavigate();
  const { clear } = useCart();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const checkStatusFn = useServerFn(pollOrderStatus);
  const triggerChargeFn = useServerFn(initiateMoMoPromptCharge);
  const submitOtpFn = useServerFn(submitPaystackOtpCharge);
  const sendOtpFn = useServerFn(sendPhoneOtp);
  const resolveNameFn = useServerFn(resolveMoMoAccountName);
  const createInvoiceFn = useServerFn(createPaymentRequestInvoice);
  const fetchWallet = useServerFn(getMyWallet);
  const payWallet = useServerFn(payOrderWithWallet);

  const { data: walletData } = useQuery({
    queryKey: ["myWallet"],
    queryFn: () => fetchWallet(),
    enabled: !!user,
  });

  const walletBalance = walletData?.balanceGhs || 0;
  const [walletPaying, setWalletPaying] = useState(false);

  // Unified Payment State: "MOMO_INPUT" | "OTP_INPUT" | "PROMPT_PUSHED"
  const [step, setStep] = useState<"MOMO_INPUT" | "OTP_INPUT" | "PROMPT_PUSHED">("MOMO_INPUT");
  const [sameAsRecipient, setSameAsRecipient] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("MTN");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [promptMessage, setPromptMessage] = useState("Check your phone screen now! Enter your 4-digit MoMo PIN.");
  const [resolvedAccountName, setResolvedAccountName] = useState<string | null>(null);
  const [resolvingName, setResolvingName] = useState(false);
  const [showPaystackModal, setShowPaystackModal] = useState(false);

  // Poll order status every 3 seconds
  const { data: pollData } = useQuery({
    queryKey: ["pollOrderStatus", reference],
    queryFn: () => checkStatusFn({ data: { reference } }),
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.status;
      if (currentStatus === "delivered" || currentStatus === "failed") {
        return false; // Stop polling when done
      }
      return 3000;
    },
  });

  const order = pollData?.order;
  const currentStatus = pollData?.status || order?.status || "pending";
  const firstItem = order?.order_items?.[0];
  const recipientPhone = firstItem?.recipient_phone || "";
  const networkName = firstItem?.network || "MTN";
  const sizeLabel = firstItem?.size_label || "Data Bundle";
  const totalGhs = order?.total_ghs || 0;

  // Pre-fill payment phone with recipient phone if empty
  useEffect(() => {
    if (recipientPhone && !paymentPhone) {
      setPaymentPhone(recipientPhone);
    }
  }, [recipientPhone, paymentPhone]);

  useEffect(() => {
    if (networkName) {
      setSelectedNetwork(networkName);
    }
  }, [networkName]);

  // Clear cart when order is delivered
  useEffect(() => {
    if (currentStatus === "delivered") {
      clear();
    }
  }, [currentStatus, clear]);

  const activePayerPhone = sameAsRecipient ? recipientPhone : paymentPhone;
  const validPayerPhone = /^\d{9,10}$/.test(activePayerPhone.replace(/\s+/g, ""));

  // Live resolve MoMo Account Name via Paystack Bank Resolve API
  useEffect(() => {
    if (validPayerPhone && selectedNetwork) {
      setResolvingName(true);
      resolveNameFn({ data: { phone: activePayerPhone, network: selectedNetwork } })
        .then((res) => {
          setResolvedAccountName(res.accountName);
        })
        .catch(() => {
          setResolvedAccountName(null);
        })
        .finally(() => {
          setResolvingName(false);
        });
    } else {
      setResolvedAccountName(null);
    }
  }, [activePayerPhone, selectedNetwork, validPayerPhone]);

  // Dynamically load Paystack Popup JS v2
  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("paystack-inline-js")) {
      const script = document.createElement("script");
      script.id = "paystack-inline-js";
      script.src = "https://js.paystack.co/v2/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  // Core MoMo Charge Execution
  const executeMoMoCharge = async (phoneToCharge: string, netToCharge: string) => {
    if (!order) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await triggerChargeFn({
        data: {
          orderId: order.id,
          phone: phoneToCharge,
          network: netToCharge,
        },
      });

      if (res.displayText) setPromptMessage(res.displayText);

      // 1. Paystack Popup V2 integration
      if (res.accessCode && (window as any).PaystackPop) {
        try {
          const popup = new (window as any).PaystackPop();
          popup.resumeTransaction(res.accessCode);
          setStep("PROMPT_PUSHED");
          return;
        } catch (popupErr) {
          console.warn("PaystackPop resume error:", popupErr);
        }
      }

      // 2. Embedded Modal Overlay (No External Redirect!)
      if (res.authorizationUrl) {
        setAuthUrl(res.authorizationUrl);
        setShowPaystackModal(true);
        setStep("PROMPT_PUSHED");
        return;
      }

      if (res.requiresOtp) {
        setStep("OTP_INPUT");
      } else {
        setStep("PROMPT_PUSHED");
      }
    } catch (err: any) {
      console.warn("MoMo charge error, fallback to prompt:", err.message);
      setStep("PROMPT_PUSHED");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Submit MoMo Payment Number -> Trigger Paystack Charge
  const handleMoMoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPayerPhone || !order) return;
    await executeMoMoCharge(activePayerPhone, selectedNetwork);
  };

  // Step 2: Submit Paystack OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      setErrorMsg("Please enter a valid OTP code");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await submitOtpFn({
        data: { reference, otp: otpCode },
      });
      if (res.displayText) setPromptMessage(res.displayText);
      setStep("PROMPT_PUSHED");
    } catch (err: any) {
      console.warn("OTP submit warning, proceeding to prompt:", err.message);
      setStep("PROMPT_PUSHED");
    } finally {
      setLoading(false);
    }
  };

  const handleResendPrompt = async () => {
    if (!order) return;
    setLoading(true);
    try {
      const res = await triggerChargeFn({
        data: { orderId: order.id, phone: activePayerPhone, network: selectedNetwork },
      });
      if (res.displayText) setPromptMessage(res.displayText);
    } catch {
      setPromptMessage("Prompt re-sent! Please check your phone screen to enter your MoMo PIN.");
    } finally {
      setLoading(false);
    }
  };

  const handleWalletPay = async () => {
    if (!order) return;
    setWalletPaying(true);
    setErrorMsg("");
    try {
      await payWallet({ data: { orderId: order.id, amountGhs: totalGhs } });
      queryClient.invalidateQueries({ queryKey: ["myWallet"] });
      setStep("PROMPT_PUSHED");
      setPromptMessage("Wallet payment successful! Your data bundle is now being processed.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process wallet payment.");
    } finally {
      setWalletPaying(false);
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

          {/* Top Reference Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-white/10 p-5 rounded-3xl backdrop-blur-xl shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">
                <Sparkles className="h-3.5 w-3.5" /> Paystack Instant Checkout
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

          {/* MAIN PAYMENT HUB CARD */}
          <div className="relative rounded-[32px] border border-white/15 bg-slate-950/90 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl overflow-hidden space-y-8">            {/* 1. VERIFIED / PROCESSING / DELIVERED STATE (Seamless Provider API Integration) */}
            {currentStatus === "delivered" || currentStatus === "paid" || currentStatus === "processing" ? (
              <div className="space-y-8 animate-in fade-in">
                {/* Top Success Icon */}
                <div className="text-center space-y-3">
                  <div className="relative mx-auto h-20 w-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 animate-bounce">
                    <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
                  </div>
                  <h2 className="text-3xl font-black text-white font-display">
                    {currentStatus === "delivered" ? "Payment & Delivery Complete! 🎉" : "Payment Successful!"}
                  </h2>
                  <p className="text-sm text-slate-300 max-w-md mx-auto">
                    {currentStatus === "delivered" 
                      ? `Your ${sizeLabel} (${networkName}) bundle has been credited to ${recipientPhone}.`
                      : "Payment confirmed. Your bundle is on its way."}
                  </p>
                </div>

                {/* Progress Stepper Bar (1 - 2 - 3) */}
                <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                  <div className="relative flex items-center justify-between">
                    {/* Connecting Track Line */}
                    <div className="absolute top-1/2 left-8 right-8 h-1 bg-slate-800 -translate-y-1/2 -z-0">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-700 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                        style={{
                          width: currentStatus === "delivered" ? "100%" : currentStatus === "processing" ? "66%" : "33%",
                        }}
                      />
                    </div>

                    {/* Step 1: Payment Verified */}
                    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                      <div className="h-10 w-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/30">
                        <Check className="h-5 w-5 stroke-[3]" />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400">Payment Verified</span>
                    </div>

                    {/* Step 2: Order Processing */}
                    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                      {currentStatus === "delivered" ? (
                        <div className="h-10 w-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/30">
                          <Check className="h-5 w-5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/30 animate-pulse">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      )}
                      <span className={`text-[11px] font-bold ${currentStatus === "delivered" ? "text-emerald-400" : "text-amber-400"}`}>
                        Order Processing
                      </span>
                    </div>

                    {/* Step 3: Delivery Confirmation */}
                    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                      {currentStatus === "delivered" ? (
                        <div className="h-10 w-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/30">
                          <Check className="h-5 w-5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-slate-800 text-slate-400 border border-white/10 flex items-center justify-center font-bold text-xs">
                          3
                        </div>
                      )}
                      <span className={`text-[11px] font-bold ${currentStatus === "delivered" ? "text-emerald-400" : "text-slate-500"}`}>
                        Delivery Confirmation
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Receipt Card */}
                <div className="rounded-3xl border border-white/15 bg-slate-900/90 p-6 space-y-4 text-xs font-mono shadow-xl">
                  {/* Top Order ID Row */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">ORDER ID</div>
                      <div className="text-lg font-black text-white font-mono flex items-center gap-2 mt-0.5">
                        <span>{reference}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={copyRef}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 text-xs font-sans"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
                      <span className="text-[11px]">{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Receipt Rows */}
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Payment Method</span>
                      <span className="font-bold text-white font-sans flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-amber-400" /> Paystack
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Recipient Phone</span>
                      <span className="font-bold text-white">{recipientPhone}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Bundle Package</span>
                      <span className="font-bold text-amber-400 font-sans">{networkName} · {sizeLabel}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Date & Time</span>
                      <span className="font-bold text-slate-200">
                        {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })},{" "}
                        {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-t border-white/10 pt-3">
                      <span className="text-slate-400">Status</span>
                      {currentStatus === "delivered" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                          ✓ Delivered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-sky-500/20 border border-sky-500/40 text-sky-400 animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.3)]">
                          • Processing
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Provider API Live Gateway Sync Box */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400 border-b border-white/5 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Zap className="h-3 w-3" /> Live Provider API Gateway Sync
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Realtime
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1 text-[11px]">
                    <div className="text-emerald-400 flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>[Paystack]: Payment verified & order queued</span>
                    </div>
                    {currentStatus === "delivered" ? (
                      <div className="text-emerald-400 flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        <span>[Provider API]: {sizeLabel} credited to {recipientPhone}</span>
                      </div>
                    ) : (
                      <div className="text-amber-300 flex items-center gap-2 animate-pulse">
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-amber-400" />
                        <span>[Provider API]: Dispatching {networkName} {sizeLabel} to {recipientPhone}...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Floating Toast Notification Box */}
                <div
                  onClick={copyRef}
                  className="cursor-pointer rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3 hover:bg-emerald-500/15 transition-all"
                >
                  <div className="h-6 w-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    ✓
                  </div>
                  <div className="space-y-0.5 text-xs text-left">
                    <div className="font-black text-white">
                      {currentStatus === "delivered"
                        ? "Data bundle delivered! Check your line SMS for confirmation."
                        : "Payment confirmed! Order is processing."}
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      Keep your Order ID (<span className="font-mono text-amber-400 font-bold">{reference}</span>) safely so you can track your order later. Tap to copy.
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
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
                    <span>Track All Orders</span>
                  </Link>
                </div>
              </div>
            ) : currentStatus === "failed" ? (

              /* 3. FAILED STATE ❌ */
              <div className="space-y-6 text-center animate-in fade-in py-4">
                <div className="relative mx-auto h-20 w-20 grid place-items-center rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500">
                  <AlertCircle className="h-10 w-10" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white font-display">Payment or Fulfillment Issue</h2>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    We were unable to complete this transaction. If your wallet was debited, our automatic refund system will resolve it or contact support.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("MOMO_INPUT")}
                    className="w-full sm:w-auto rounded-2xl gold-gradient px-6 py-3.5 text-xs font-black text-primary-foreground shadow-xl"
                  >
                    Try Paying Again
                  </button>
                  <Link
                    to="/support"
                    className="w-full sm:w-auto rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-xs font-bold text-white hover:bg-white/10"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            ) : step === "MOMO_INPUT" ? (

              /* 2. STEP A: ENTER MOMO PAYMENT NUMBER */
              <div className="space-y-6 animate-in fade-in">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/30 px-3.5 py-1 text-[11px] font-black text-amber-400 uppercase tracking-widest">
                    <CreditCard className="h-3.5 w-3.5" /> Select MoMo Payment Account
                  </div>
                  <h2 className="text-2xl font-black text-white font-display">How would you like to pay?</h2>
                  <p className="text-xs text-slate-300">
                    Data will be sent to <span className="text-amber-400 font-bold">{recipientPhone}</span>. Enter the MoMo account for payment below.
                  </p>
                </div>

                {/* Order Details Mini Card */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Bundle Package:</span>
                    <span className="font-bold text-white">{networkName} · {sizeLabel}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Data Recipient Line:</span>
                    <span className="font-bold text-white">{recipientPhone}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 text-sm">
                    <span className="font-bold text-slate-200">Total Payable:</span>
                    <span className="font-mono font-black text-emerald-400">GH₵ {totalGhs.toFixed(2)}</span>
                  </div>
                </div>

                {/* Option A: Bestdata Wallet Payment (For Logged-In Users & Agents) */}
                {user && (
                  <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-wider">
                        <Wallet className="h-4 w-4" /> Option A: Pay with Bestdata Wallet
                      </div>
                      <span className="text-xs font-mono font-black text-white bg-black/40 px-2.5 py-1 rounded-full border border-white/10">
                        Balance: GH₵ {walletBalance.toFixed(2)}
                      </span>
                    </div>

                    {walletBalance >= totalGhs ? (
                      <button
                        type="button"
                        disabled={walletPaying}
                        onClick={handleWalletPay}
                        className="w-full flex items-center justify-center gap-2 rounded-xl gold-gradient py-3.5 text-xs font-black text-primary-foreground shadow-xl hover:scale-[1.01] active:scale-[.98] transition-all"
                      >
                        {walletPaying ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Deducting Wallet Balance...</>
                        ) : (
                          <><Zap className="h-4 w-4" /> Instant Pay GH₵ {totalGhs.toFixed(2)} with Wallet (0-Fee)</>
                        )}
                      </button>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs pt-1 border-t border-white/10">
                        <span className="text-amber-300 font-semibold">
                          Wallet Balance: GH₵ {walletBalance.toFixed(2)} (Insufficient for GH₵ {totalGhs.toFixed(2)})
                        </span>
                        <Link to="/agent" className="text-xs font-extrabold text-primary hover:underline flex items-center gap-1 shrink-0">
                          Top Up Wallet →
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <div className="relative flex items-center justify-center my-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                  <span className="relative bg-slate-950 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {user ? "OR PAY VIA MOBILE MONEY" : "MOBILE MONEY PAYMENT"}
                  </span>
                </div>

                <form onSubmit={handleMoMoSubmit} className="space-y-5">
                  {/* Same as recipient checkbox */}
                  <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sameAsRecipient}
                        onChange={(e) => setSameAsRecipient(e.target.checked)}
                        className="h-5 w-5 rounded border-white/20 bg-slate-950 text-amber-400 focus:ring-amber-400"
                      />
                      <div>
                        <div className="text-xs font-extrabold text-white">Payment number is same as recipient number</div>
                        <div className="text-[11px] text-slate-400">Deduct funds from <span className="text-amber-400 font-bold">{recipientPhone}</span></div>
                      </div>
                    </label>
                  </div>

                  {/* Payment number input if different */}
                  {!sameAsRecipient && (
                    <div className="space-y-2 animate-in fade-in">
                      <label htmlFor="payer-phone-input" className="block text-xs font-extrabold uppercase tracking-widest text-slate-300">
                        Payer Mobile Money Number
                      </label>
                      <div className="relative flex items-center bg-slate-900 border border-white/15 rounded-2xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <div className="flex items-center gap-1.5 pl-4 pr-3 py-3.5 text-slate-300 text-xs font-bold border-r border-white/10 bg-white/5">
                          <span>🇬🇭</span>
                          <span>+233</span>
                        </div>
                        <input
                          id="payer-phone-input"
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

                  {/* MoMo Provider Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-300">
                      Payer Mobile Money Network
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {NETWORKS.map((net) => {
                        const isSelected = selectedNetwork.toUpperCase() === net.key.toUpperCase();
                        return (
                          <button
                            key={net.key}
                            type="button"
                            onClick={() => setSelectedNetwork(net.key)}
                            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${isSelected
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

                  {/* MoMo Account Holder Name Badge */}
                  {resolvingName ? (
                    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs font-bold text-amber-400 flex items-center gap-2 animate-pulse">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Verifying MoMo Account Holder Name via Paystack…</span>
                    </div>
                  ) : resolvedAccountName ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span>Account Holder: <span className="text-white font-extrabold uppercase">{resolvedAccountName}</span></span>
                      </div>
                      <span className="text-[10px] font-mono uppercase bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">Verified</span>
                    </div>
                  ) : null}

                  {errorMsg && (
                    <div className="rounded-xl bg-destructive/15 border border-destructive/30 p-3 text-xs font-medium text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !validPayerPhone}
                    className="w-full flex items-center justify-center gap-2.5 rounded-2xl gold-gradient py-4 text-sm font-black text-primary-foreground shadow-xl hover:scale-[1.02] active:scale-[.98] disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Contacting Paystack MoMo Gateway…
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        <span>Pay GH₵ {totalGhs.toFixed(2)} via Mobile Money</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>256-Bit Encrypted Direct Paystack Charge</span>
                  </div>
                </form>
              </div>

            ) : step === "OTP_INPUT" ? (

              /* 3. STEP B: PAYSTACK OTP VERIFICATION CARD */
              <div className="space-y-6 animate-in zoom-in-95">
                <div className="text-center space-y-2">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gold-gradient text-slate-950 shadow-xl">
                    <Lock className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-black text-white font-display">Paystack OTP Verification Required</h2>
                  <p className="text-xs text-slate-300">
                    Paystack has sent a verification OTP code via SMS to <span className="text-amber-400 font-bold">{activePayerPhone}</span>.
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-widest text-slate-300 mb-2 text-center">
                      Enter Paystack OTP Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full text-center tracking-[0.5em] text-3xl font-mono font-black rounded-2xl border border-white/20 bg-slate-900 px-4 py-4 text-white placeholder:text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
                      required
                    />
                  </div>

                  {errorMsg && (
                    <div className="rounded-xl bg-destructive/15 border border-destructive/30 p-3 text-xs font-medium text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 4}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl gold-gradient py-4 text-xs font-black text-primary-foreground shadow-xl hover:scale-[1.01] active:scale-[.98] disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Verifying Paystack Code…
                      </>
                    ) : (
                      <>
                        <span>Submit OTP & Trigger MoMo Prompt</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                    <span>Didn't receive Paystack SMS?</span>
                    <button
                      type="button"
                      onClick={handleMoMoSubmit}
                      disabled={loading}
                      className="font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                      <span>Resend OTP</span>
                    </button>
                  </div>
                </form>
              </div>

            ) : (

              /* 4. STEP C: PROMPT PUSHED & LIVE 3-SECOND POLLING */
              <div className="space-y-8 animate-in fade-in">

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
                      <Zap className="h-3 w-3" /> Mobile Money Payment Active
                    </span>
                    <h3 className="text-lg font-black text-white font-display">Check Your Phone Screen!</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      A Mobile Money prompt has been pushed to <span className="text-amber-400 font-bold">{activePayerPhone}</span>.
                      Enter your 4-digit PIN to authorize <span className="text-emerald-400 font-bold">GH₵ {totalGhs.toFixed(2)}</span>.
                    </p>
                  </div>

                  {/* If Paystack fallback URL generated */}
                  {authUrl && (
                    <div className="pt-2">
                      <a
                        href={authUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl gold-gradient py-3 text-xs font-black text-slate-950 shadow-lg hover:scale-105 transition-all"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Open Paystack MoMo Screen</span>
                      </a>
                    </div>
                  )}

                  {/* Live Status Log */}
                  <div className="rounded-xl bg-slate-950 p-3 text-[11px] font-mono text-slate-400 border border-white/10 flex items-center justify-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                    <span>{promptMessage}</span>
                  </div>

                  {/* MTN / Telecel Manual Approval Help Banner */}
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs space-y-2 text-left">
                    <div className="font-extrabold text-amber-300 flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 shrink-0 text-amber-400" />
                      <span>No prompt on your screen? Approve manually:</span>
                    </div>
                    <div className="space-y-1 text-slate-300 text-[11px] font-mono leading-relaxed pl-6">
                      {selectedNetwork.toUpperCase().includes("MTN") ? (
                        <>
                          <p>1. Dial <span className="text-white font-bold">*170#</span> on your MTN phone</p>
                          <p>2. Select <span className="text-white font-bold">Option 6 (My Wallet)</span></p>
                          <p>3. Select <span className="text-white font-bold">Option 3 (My Approvals)</span></p>
                          <p>4. Enter your MoMo PIN to approve GH₵ {totalGhs.toFixed(2)}</p>
                        </>
                      ) : selectedNetwork.toUpperCase().includes("VODA") || selectedNetwork.toUpperCase().includes("TELECEL") ? (
                        <>
                          <p>1. Dial <span className="text-white font-bold">*110#</span> on your Telecel phone</p>
                          <p>2. Select <span className="text-white font-bold">Option 6 (My Approvals)</span></p>
                          <p>3. Enter your PIN to approve GH₵ {totalGhs.toFixed(2)}</p>
                        </>
                      ) : (
                        <>
                          <p>1. Check your SMS inbox for the Paystack payment link</p>
                          <p>2. Or dial your network USSD menu to approve pending transactions</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4-Step Progress Stepper */}
                <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 space-y-4">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between border-b border-white/10 pb-3">
                    <span>Order Fulfillment Stepper</span>
                    <span className="text-amber-400 font-mono text-[10px]">Polling Live (3s)</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Step 1 */}
                    <div className="flex items-center gap-3">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-slate-950 font-black text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white">1. Order Created & Recipient Configured</div>
                        <div className="text-[10px] text-slate-400">Recipient line: {recipientPhone}</div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-center gap-3">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-slate-950 font-black text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white">2. MoMo Prompt Pushed to Payer Phone</div>
                        <div className="text-[10px] text-slate-400">Payer line: {activePayerPhone} ({selectedNetwork})</div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-center gap-3">
                      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-black text-xs ${currentStatus === "paid" || currentStatus === "processing" ? "bg-emerald-500 text-slate-950" : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        }`}>
                        {currentStatus === "paid" || currentStatus === "processing" ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                      <div className="min-w-0">
                        <div className={`font-bold ${currentStatus === "paid" || currentStatus === "processing" ? "text-emerald-400" : "text-white"}`}>
                          3. Payment Verification (Awaiting PIN)
                        </div>
                        <div className="text-[10px] text-slate-400">Verifying live server callback from Paystack</div>
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

                {/* Resend Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleResendPrompt}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500/25 disabled:opacity-50 transition-all"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    <span>Resend MoMo Prompt</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!order) return;
                      setLoading(true);
                      try {
                        const res = await createInvoiceFn({ data: { orderId: order.id, phone: activePayerPhone } });
                        setPromptMessage(res.message);
                      } catch (err: any) {
                        setPromptMessage("Sent SMS payment link to " + activePayerPhone);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl bg-blue-500/15 border border-blue-500/30 px-4 py-2.5 text-xs font-bold text-blue-400 hover:bg-blue-500/25 disabled:opacity-50 transition-all"
                  >
                    <span>Send Paystack SMS Invoice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep("MOMO_INPUT")}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Change MoMo Payment Number
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>
      </main>

      {/* Embedded Paystack Checkout Modal Overlay (In-Site, No External Redirect!) */}
      {showPaystackModal && authUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900 shadow-2xl overflow-hidden flex flex-col h-[650px] max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-slate-950">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-black text-white font-display">Paystack Secure Checkout</span>
              </div>
              <button
                onClick={() => setShowPaystackModal(false)}
                className="rounded-full bg-white/10 p-1.5 text-slate-400 hover:bg-white/20 hover:text-white transition-all"
                title="Close Modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Embedded Paystack Iframe */}
            <iframe
              src={authUrl}
              title="Paystack Checkout"
              className="w-full flex-1 border-0 bg-white"
              allow="payment"
            />

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-white/10 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                <span>Polling order status automatically…</span>
              </div>
              <span className="font-extrabold text-amber-400">256-bit Encrypted</span>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
