import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Zap, Sparkles } from "lucide-react";

/** TopProgressBar renders a glowing progress bar at the very top of the window during router transitions */
export function TopProgressBar() {
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1.5 overflow-hidden pointer-events-none">
      <div className="h-full w-full gold-gradient shadow-[0_0_15px_hsl(243_85%_65%)] animate-[top-bar-progress_1.5s_infinite_linear]" />
    </div>
  );
}

import { GoldCoinSpinner } from "@/components/site/GoldCoinSpinner";

/** BrandLoadingSpinner renders the 3D Spinning Gold Coin Loader */
export function BrandLoadingSpinner({
  size = "md",
  label = "Loading BestData…",
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <GoldCoinSpinner size={size} label={label} />
    </div>
  );
}

/** Full-Page Glassmorphic Loading Screen */
export function PageLoader({ label = "Connecting to BestData…" }: { label?: string }) {
  return (
    <div className="min-h-screen bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-2xl p-8 shadow-2xl flex flex-col items-center text-center space-y-4 max-w-xs w-full">
        <BrandLoadingSpinner size="lg" label="" />
        <div>
          <h3 className="text-base font-black font-display tracking-tight text-foreground">{label}</h3>
          <p className="text-[11px] font-bold text-muted-foreground mt-1">Instant Ghana Data Bundles</p>
        </div>
      </div>
    </div>
  );
}

/** Skeleton Card Loading Component */
export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3 shimmer-loading">
      <div className="h-4 w-1/3 bg-muted rounded-md" />
      <div className="h-8 w-2/3 bg-muted rounded-lg" />
      <div className="h-10 w-full bg-muted rounded-xl" />
    </div>
  );
}
