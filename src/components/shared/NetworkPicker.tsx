import { NetworkLogo } from "@/components/site/NetworkLogos";
import { cn } from "@/lib/utils";

export interface NetworkOption {
  value: string;
  label: string;
}

export const DEFAULT_NETWORKS: NetworkOption[] = [
  { value: "MTN", label: "MTN" },
  { value: "Telecel", label: "Telecel" },
  { value: "AirtelTigo", label: "AirtelTigo" },
];

export interface NetworkPickerProps {
  value: string;
  onChange: (value: string) => void;
  networks?: NetworkOption[];
  className?: string;
}

/** Shared network selector grid, extracted from the 4+ places (Hero, InstantBuyModal, checkout, WalletModal, account/agent quick-buy) that reimplemented this. */
export function NetworkPicker({ value, onChange, networks = DEFAULT_NETWORKS, className }: NetworkPickerProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {networks.map((net) => {
        const active = value === net.value;
        return (
          <button
            key={net.value}
            type="button"
            onClick={() => onChange(net.value)}
            aria-pressed={active}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all",
              active ? "border-primary bg-primary/10 shadow-hover" : "border-border bg-card hover:border-primary/40",
            )}
          >
            <NetworkLogo network={net.value} className="h-6 w-6" />
            <span className={cn("text-[11px] font-bold", active ? "text-primary" : "text-muted-foreground")}>
              {net.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
