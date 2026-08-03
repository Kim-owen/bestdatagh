import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { initializeWalletDeposit } from "@/lib/wallet.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { useAuth } from "@/lib/auth";
import { Wallet, X, Plus, Zap, CheckCircle2, ShieldCheck, Loader2, Phone, CreditCard, Sparkles } from "lucide-react";
import { NetworkLogo } from "@/components/site/NetworkLogos";

const NETWORKS = [
  { key: "MTN", label: "MTN MoMo", color: "border-amber-500/50 bg-amber-500/10 text-amber-400" },
  { key: "Telecel", label: "Telecel Cash", color: "border-rose-500/50 bg-rose-500/10 text-rose-400" },
  { key: "AirtelTigo", label: "AT Money", color: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
] as const;

export function WalletTopUpModal({
  isOpen,
  onClose,
  userEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const initDeposit = useServerFn(initializeWalletDeposit);
  const getProfileFn = useServerFn(getMyProfile);

  const { data: profileData } = useQuery({
    queryKey: ["myProfile"],
    queryFn: () => getProfileFn(),
    enabled: !!user && isOpen,
  });

  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [network, setNetwork] = useState<string>("MTN");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (profileData?.profile?.phone && !phone) {
      setPhone(profileData.profile.phone);
    }
  }, [profileData?.profile?.phone, phone]);

  const amountToUse = customAmount ? Number(customAmount) : selectedAmount;
  const cleanPhone = phone.replace(/\s+/g, "");
  const isValidPhone = /^\d{9,10}$/.test(cleanPhone);

  const mut = useMutation({
    mutationFn: () =>
      initDeposit({
        data: {
          amountGhs: amountToUse,
          phone: cleanPhone,
          network,
        },
      }),
    onSuccess: async (res) => {
      setIsProcessing(false);
      onClose();
      // Navigate to dedicated In-App Payment Hub for live polling & OTP submission
      navigate({
        to: "/payment/$reference",
        params: { reference: res.reference },
      });
    },
    onError: (err: any) => {
      setIsProcessing(false);
      alert(err?.message || "Failed to initialize deposit.");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="h-10 w-10 rounded-2xl gold-gradient grid place-items-center text-primary-foreground shadow-md">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black font-display tracking-tight text-foreground">
              Top Up Wallet Balance
            </h2>
            <p className="text-xs text-muted-foreground">Instant Mobile Money & Card Deposit</p>
          </div>
        </div>

        {/* Preset Amount Chips */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-primary">
            1. Select Deposit Amount
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[10, 20, 50, 100, 200, 500].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  setSelectedAmount(amt);
                  setCustomAmount("");
                }}
                className={`py-3 rounded-2xl border text-xs font-black transition-all ${
                  selectedAmount === amt && !customAmount
                    ? "border-primary bg-primary/15 text-primary ring-2 ring-primary/30 scale-105"
                    : "border-border/80 bg-background hover:bg-muted"
                }`}
              >
                GH₵ {amt}.00
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">Or Enter Custom Amount (GH₵)</label>
          <input
            type="number"
            min={1}
            max={10000}
            placeholder="e.g. 150"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* MoMo Network Selector */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-black uppercase tracking-wider text-primary">
            2. Mobile Money Network & Phone
          </label>

          <div className="grid grid-cols-3 gap-2">
            {NETWORKS.map((net) => (
              <button
                key={net.key}
                type="button"
                onClick={() => setNetwork(net.key)}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl border text-xs font-extrabold transition-all ${
                  network === net.key
                    ? "border-primary bg-primary/15 text-primary ring-2 ring-primary/30 scale-105"
                    : "border-border/80 bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                <NetworkLogo network={net.key} className="h-4 w-4 rounded-full" />
                <span>{net.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="tel"
              placeholder="e.g. 0244000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background pl-10 pr-4 py-3 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Fee breakdown */}
        {amountToUse >= 1 && (
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3.5 space-y-1.5 text-xs font-bold">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Net Wallet Credit:</span>
              <span className="text-foreground font-mono">GH₵ {amountToUse.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Payment Fee (3%):</span>
              <span className="text-amber-400 font-mono">GH₵ {(amountToUse * 0.03).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/50 text-foreground font-black text-sm">
              <span>Total MoMo Payable:</span>
              <span className="text-primary font-mono">GH₵ {(amountToUse * 1.03).toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2 text-xs text-emerald-500 font-bold">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>Automated Paystack Direct Charge. Instant MoMo PIN prompt on phone.</span>
        </div>

        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || isProcessing || amountToUse < 1 || !isValidPhone}
          className="w-full flex items-center justify-center gap-2 rounded-2xl gold-gradient py-4 text-xs font-black text-primary-foreground shadow-lg hover:scale-[1.01] active:scale-95 disabled:opacity-50 transition-all"
        >
          {mut.isPending || isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Pushing Paystack Prompt…
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" /> Pay GH₵ {(amountToUse * 1.03).toFixed(2)} & Deposit
            </>
          )}
        </button>
      </div>
    </div>
  );
}
