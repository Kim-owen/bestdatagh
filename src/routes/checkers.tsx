import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { getResultCheckerProducts, purchaseResultChecker, CheckerProduct } from "@/lib/checkers.functions";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  GraduationCap,
  CheckCircle2,
  Copy,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Loader2,
  Zap,
  Check,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkers")({
  head: () => ({
    meta: [
      { title: "WAEC & BECE Result Checker Cards — Bestdata Ghana" },
      { name: "description", content: "Buy official WAEC WASSCE and BECE Result Checker cards instantly on Bestdata Ghana. Instant Serial Number and PIN delivery with SMS alert." },
    ],
  }),
  component: ResultCheckersPage,
});

function ResultCheckersPage() {
  const getProducts = useServerFn(getResultCheckerProducts);
  const buyChecker = useServerFn(purchaseResultChecker);

  const [selectedType, setSelectedType] = useState<"WAEC" | "BECE">("WAEC");
  const [phone, setPhone] = useState("");
  const [resultCard, setResultCard] = useState<any>(null);
  const [copiedSerial, setCopiedSerial] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["resultCheckerProducts"],
    queryFn: () => getProducts(),
  });

  const purchaseMutation = useMutation({
    mutationFn: () => buyChecker({ data: { checkerType: selectedType, phoneNumber: phone } }),
    onSuccess: (res: any) => {
      setResultCard(res);
      toast.success(`${selectedType} Result Checker card issued!`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to purchase result checker");
    },
  });

  const activeProduct = (products || []).find((p) => p.name === selectedType) || {
    name: selectedType,
    description: `${selectedType} Result Checker card`,
    price: 15.7,
    inStock: true,
    stockCount: 100,
  };

  const copyToClipboard = (text: string, isPin: boolean) => {
    navigator.clipboard.writeText(text);
    if (isPin) {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    } else {
      setCopiedSerial(true);
      setTimeout(() => setCopiedSerial(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-10">
        {/* Page Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-400 uppercase tracking-widest backdrop-blur-md">
            <GraduationCap className="h-4 w-4" /> Official WAEC & BECE Portal
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white font-display tracking-tight">
            WAEC & BECE Result Checkers
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Purchase official WASSCE & BECE result checker cards with instant Serial Number & PIN display and SMS delivery.
          </p>
        </div>

        {/* Purchase Card Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 space-y-6 backdrop-blur-xl shadow-2xl">
              {/* Type Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  1. Select Result Checker Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedType("WAEC")}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                      selectedType === "WAEC"
                        ? "border-amber-400 bg-amber-400/10 text-white ring-2 ring-amber-400/20"
                        : "border-white/10 bg-slate-950/50 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-lg text-white">WASSCE / WAEC</span>
                      {selectedType === "WAEC" && <CheckCircle2 className="h-5 w-5 text-amber-400" />}
                    </div>
                    <span className="text-xs text-amber-400 font-mono font-bold">GH₵ 15.70</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedType("BECE")}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                      selectedType === "BECE"
                        ? "border-amber-400 bg-amber-400/10 text-white ring-2 ring-amber-400/20"
                        : "border-white/10 bg-slate-950/50 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-lg text-white font-display">BECE</span>
                      {selectedType === "BECE" && <CheckCircle2 className="h-5 w-5 text-amber-400" />}
                    </div>
                    <span className="text-xs text-amber-400 font-mono font-bold">GH₵ 15.70</span>
                  </button>
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  2. Recipient Ghana Phone Number (For SMS Delivery)
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="e.g. 0241234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-slate-950/80 py-3 pl-11 pr-4 text-sm font-bold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Card serial & PIN will be displayed on screen and sent via SMS.
                </p>
              </div>

              {/* Summary Box */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Product:</span>
                  <span className="font-bold text-white">{selectedType} Result Checker</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Availability:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> In Stock ({activeProduct.stockCount || 100} available)
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-black">
                  <span className="text-white">Total Amount:</span>
                  <span className="text-amber-400 font-mono">GH₵ {activeProduct.price.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => purchaseMutation.mutate()}
                disabled={purchaseMutation.isPending || !phone}
                className="w-full rounded-2xl gold-gradient py-4 text-sm font-black text-slate-950 shadow-xl hover:scale-[1.01] active:scale-[.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {purchaseMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                    Issuing {selectedType} Card…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-slate-950" />
                    Buy {selectedType} Result Checker — GH₵ {activeProduct.price.toFixed(2)}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Card Display Panel */}
          <div className="lg:col-span-5 space-y-6">
            {resultCard ? (
              <div className="rounded-3xl border border-amber-500/40 bg-slate-900/90 p-6 space-y-6 backdrop-blur-xl shadow-2xl animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Sparkles className="h-4 w-4" /> Result Card Issued!
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-amber-400/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-400/20">
                    {resultCard.checkerType}
                  </span>
                </div>

                {/* Card PIN & Serial Box */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Serial Number
                    </label>
                    <div className="flex items-center justify-between bg-slate-950 p-3.5 rounded-2xl border border-white/10 font-mono text-sm font-bold text-amber-300">
                      <span>{resultCard.serialNumber}</span>
                      <button
                        onClick={() => copyToClipboard(resultCard.serialNumber, false)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        {copiedSerial ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Card PIN Code
                    </label>
                    <div className="flex items-center justify-between bg-slate-950 p-3.5 rounded-2xl border border-white/10 font-mono text-base font-black text-emerald-400">
                      <span>{resultCard.pin}</span>
                      <button
                        onClick={() => copyToClipboard(resultCard.pin, true)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        {copiedPin ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1 font-mono">
                  <div>Ref: {resultCard.reference}</div>
                  <div>SMS Sent To: {resultCard.phoneNumber}</div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-8 text-center space-y-4 backdrop-blur-xl">
                <div className="h-16 w-16 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400 border border-white/10">
                  <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="font-bold text-white text-base">Instant Card Display</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Your purchased WAEC or BECE card Serial Number and PIN will appear here immediately after payment.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
