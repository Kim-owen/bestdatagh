import * as React from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PhoneVerificationStatus = "idle" | "checking" | "valid" | "invalid";

export interface PhoneInputProps extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  status?: PhoneVerificationStatus;
  statusMessage?: string;
  detectedNetwork?: string;
}

/**
 * Shared phone-number input with a live verification indicator. Presentational only — callers
 * own the actual verify-number lookup (e.g. via verifyPhoneNumber) and pass the resulting status in.
 * Extracted from the 4+ independent reimplementations in Hero, InstantBuyModal, checkout, and WalletModal.
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, status = "idle", statusMessage, detectedNetwork, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        <div className="relative">
          <Input
            ref={ref}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn("h-12 rounded-2xl pr-10 text-base font-semibold tracking-wide", className)}
            {...props}
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {status === "valid" && <CheckCircle2 className="h-4 w-4 text-success" />}
            {status === "invalid" && <XCircle className="h-4 w-4 text-destructive" />}
          </div>
        </div>
        {(statusMessage || detectedNetwork) && (
          <p
            className={cn(
              "px-1 text-xs font-medium",
              status === "invalid"
                ? "text-destructive"
                : status === "valid"
                  ? "text-success"
                  : "text-muted-foreground",
            )}
          >
            {statusMessage ?? (detectedNetwork ? `Detected network: ${detectedNetwork}` : null)}
          </p>
        )}
      </div>
    );
  },
);
PhoneInput.displayName = "PhoneInput";
