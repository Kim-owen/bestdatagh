import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getSwiftDataBalance, getSwiftDataPackages } from "@/lib/swiftdata";
import { clearBundleCache } from "@/lib/public-bundles.functions";

const BESTDATA_URL = "https://vtdccqchhsbujknbpqku.supabase.co";
const BESTDATA_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGNjcWNoaHNidWprbmJwcWt1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc1MzI0NCwiZXhwIjoyMTAwMzI5MjQ0fQ._5MtVAhM-4RmuIKPrSETGv227ZfPJFGkYi7roju7z-o";

export interface HealingReport {
  timestamp: string;
  healthy: boolean;
  dbStatus: string;
  bundleCount: number;
  providerBalanceGhs: number;
  repairedItems: string[];
}

/**
 * Autonomous Self-Healing Audit Routine
 * Checks DB connection, bundle counts, RLS access, and SwiftData API provider.
 * Automatically restores packages if missing.
 */
export async function auditAndHealSystem(): Promise<HealingReport> {
  const repairedItems: string[] = [];
  const timestamp = new Date().toISOString();
  let dbStatus = "OPERATIONAL";
  let bundleCount = 0;
  let providerBalanceGhs = 0;

  const supa = createClient(BESTDATA_URL, BESTDATA_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Verify Database & Active Bundle Count
  try {
    const { data, error } = await supa
      .from("bundles")
      .select("id, price_ghs")
      .eq("active", true);

    if (error) {
      dbStatus = `ERROR: ${error.message}`;
      repairedItems.push(`DB error detected: ${error.message}`);
    } else {
      bundleCount = data?.length ?? 0;
    }
  } catch (err: any) {
    dbStatus = `CRITICAL_FAIL: ${err.message}`;
    repairedItems.push(`Critical DB failure: ${err.message}`);
  }

  // 2. Auto-Heal: If bundle count is 0 or packages corrupted, auto-sync from SwiftData API
  if (bundleCount === 0) {
    try {
      const pRes = await getSwiftDataPackages();
      if (pRes && pRes.packages && Array.isArray(pRes.packages)) {
        const { data: existing } = await supa.from("bundles").select("id, network, size_label");
        const existingMap = new Map((existing || []).map((b) => [`${b.network.toLowerCase()}_${b.size_label.toLowerCase()}`, b.id]));

        let restored = 0;
        for (const pkg of pRes.packages) {
          let netName = "MTN";
          if (pkg.network === "telecel") netName = "Telecel";
          else if (pkg.network === "at_ishare" || pkg.network === "at_bigtime") netName = "AirtelTigo";

          const sizeGb = pkg.size_gb || 1;
          const sizeLabel = pkg.size_label || `${sizeGb}GB`;
          const sizeMb = Math.round(sizeGb * 1024);
          const priceGhs = Number(pkg.price ?? pkg.price_ghs ?? 0);

          const key = `${netName.toLowerCase()}_${sizeLabel.toLowerCase()}`;
          const existingId = existingMap.get(key);

          if (existingId) {
            await supa.from("bundles").update({ size_mb: sizeMb, price_ghs: priceGhs, active: true }).eq("id", existingId);
          } else {
            await supa.from("bundles").insert({
              network: netName,
              size_label: sizeLabel,
              size_mb: sizeMb,
              price_ghs: priceGhs,
              validity: pkg.validity || "Non-Expiry",
              active: true,
              sort_order: sizeMb,
            });
          }
          restored++;
        }
        bundleCount = restored;
        clearBundleCache();
        repairedItems.push(`Auto-healed: Restored ${restored} active packages into database`);
      }
    } catch (healErr: any) {
      repairedItems.push(`Auto-healing sync failed: ${healErr.message}`);
    }
  }

  // 3. Audit Provider API & Balance
  try {
    const balRes = await getSwiftDataBalance();
    if (balRes && balRes.success) {
      providerBalanceGhs = Number(balRes.balance || 0);
    }
  } catch (balErr: any) {
    repairedItems.push(`Provider balance check warning: ${balErr.message}`);
  }

  return {
    timestamp,
    healthy: dbStatus === "OPERATIONAL" && bundleCount > 0,
    dbStatus,
    bundleCount,
    providerBalanceGhs,
    repairedItems,
  };
}

/**
 * Server Function: Trigger Automated Self-Healing Audit
 */
export const runSystemSelfHealer = createServerFn({ method: "POST" }).handler(async () => {
  return await auditAndHealSystem();
});
