import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { initializeWalletDeposit } from "@/lib/wallet.functions";
import { openPaystackInlineCheckout } from "@/lib/paystack-inline";
import { Wallet, X, Plus, Zap, CheckCircle2, ShieldCheck } from "lucide-react";

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
  const initDeposit = useServerFn(initializeWalletDeposit);
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const amountToUse = customAmount ? Number(customAmount) : selectedAmount;

  const mut = useMutation({
    mutationFn: () => initDeposit({ data: { amountGhs: amountToUse } }),
    onSuccess: async (res) => {
      setIsProcessing(true);
      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_live_74ed2ba7f110bcec6ca98f9d270ff1bd025b24c3";

      try {
        // Launch Paystack Inline Popup
        await openPaystackInlineCheckout({
          key: publicKey,
          email: userEmail || `user-${Date.now()}@bestdatagh.com`,
          amountGhs: amountToUse,
          reference: res.reference,
          onSuccess: (ref) => {
            setIsProcessing(false);
            queryClient.invalidateQueries({ queryKey: ["myWallet"] });
            queryClient.invalidateQueries({ queryKey: ["me"] });
            onClose();
          },
          onClose: () => {
            setIsProcessing(false);
          },
        });
      } catch (e) {
        // Fallback to Paystack Hosted Payment Page
        if (res.authorizationUrl) {
          window.location.href = res.authorizationUrl;
        } else {
          setIsProcessing(false);
        }
      }
    },
    onError: () => {
      setIsProcessing(false);
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-2xl space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="h-10 w-10 rounded-2xl gold-gradient grid place-items-center text-primary-foreground shadow-md">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black font-display tracking-tight text-foreground">Top Up Wallet Balance</h2>
            <p className="text-xs text-muted-foreground">Instant Mobile Money & Card Deposit</p>
          </div>
        </div>

        {/* Preset Amount Chips */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-primary">Select Deposit Amount</label>
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

        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-3.5 flex items-center gap-2.5 text-xs text-primary font-bold">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>Instant credit to your BestData Wallet via Paystack.</span>
        </div>

        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || isProcessing || amountToUse < 1}
          className="w-full flex items-center justify-center gap-2 rounded-2xl gold-gradient py-4 text-xs font-black text-primary-foreground shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
        >
          <Plus className="h-4 w-4" />
          {mut.isPending || isProcessing ? "Initializing Paystack Deposit…" : `Proceed to Deposit GH₵ ${amountToUse.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
