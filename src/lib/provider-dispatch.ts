import { getDataMartApiKey, mapToDataMartNetwork, buyDataMartBundle, getDataMartOrderStatus } from "@/lib/datamart";
import { getSwiftDataApiKey, mapToSwiftDataNetwork, buySwiftDataBundle, getSwiftDataOrder, parseSizeGb } from "@/lib/swiftdata";

export interface DispatchParams {
  phone: string;
  network: string;
  sizeLabel: string;
  reference: string;
}

export interface DispatchResult {
  success: boolean;
  provider: "datamart" | "swiftdata" | "none";
  status: "completed" | "processing" | "failed";
  orderRef: string;
  message?: string;
  rawResponse?: any;
}

/**
 * Reads admin preferred active data provider setting from site_settings ("datamart" | "swiftdata")
 */
export async function getActiveProviderPreference(): Promise<"datamart" | "swiftdata"> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("site_settings")
      .select("value")
      .eq("key", "active_data_provider")
      .maybeSingle();

    if (data && data.value) {
      const val = String(data.value).toLowerCase();
      if (val === "swiftdata" || val === "datamart") return val as "datamart" | "swiftdata";
    }
  } catch {
    // Fallback to default
  }
  return "datamart";
}

/**
 * Unified Automated Bundle Dispatcher
 * Priority: Based on Admin active_data_provider setting, with automatic failover to secondary provider.
 */
export async function dispatchDataBundle(params: DispatchParams): Promise<DispatchResult> {
  const cleanPhone = params.phone.replace(/\s+/g, "");
  const sizeGb = parseSizeGb(params.sizeLabel);
  const dmKey = getDataMartApiKey();
  const swiftKey = getSwiftDataApiKey();

  const preferredProvider = await getActiveProviderPreference();
  let lastError = "";

  // Helper A: Execute DataMart
  const tryDataMart = async (): Promise<DispatchResult | null> => {
    if (!dmKey) return null;
    try {
      const dmNet = mapToDataMartNetwork(params.network, params.sizeLabel);
      const dmRes = await buyDataMartBundle({
        phone: cleanPhone,
        network: dmNet,
        capacityGb: sizeGb,
        reference: params.reference,
      });

      if (dmRes && dmRes.status === "success") {
        const orderStatus = (dmRes.data?.orderStatus || "completed").toLowerCase();
        const isCompleted = orderStatus === "completed" || orderStatus === "delivered";
        return {
          success: true,
          provider: "datamart",
          status: isCompleted ? "completed" : "processing",
          orderRef: dmRes.data?.orderReference || params.reference,
          rawResponse: dmRes,
        };
      }
    } catch (err: any) {
      lastError = err.message || "DataMart purchase failed";
      console.warn(`[ProviderDispatch] DataMart dispatch failed for ref ${params.reference}: ${lastError}.`);
    }
    return null;
  };

  // Helper B: Execute SwiftData
  const trySwiftData = async (): Promise<DispatchResult | null> => {
    if (!swiftKey) return null;
    try {
      const swiftNet = mapToSwiftDataNetwork(params.network, params.sizeLabel);
      const swiftRes = await buySwiftDataBundle({
        phone: cleanPhone,
        network: swiftNet,
        sizeGb,
        reference: params.reference,
      });

      if (swiftRes && (swiftRes.success || swiftRes.status === "completed" || swiftRes.status === "processing")) {
        const orderStatus = (swiftRes.order?.status || swiftRes.status || "completed").toLowerCase();
        const isCompleted = orderStatus === "completed" || orderStatus === "delivered";
        return {
          success: true,
          provider: "swiftdata",
          status: isCompleted ? "completed" : "processing",
          orderRef: swiftRes.order?.reference || params.reference,
          rawResponse: swiftRes,
        };
      }
    } catch (err: any) {
      lastError = err.message || "SwiftData purchase failed";
      console.warn(`[ProviderDispatch] SwiftData dispatch failed for ref ${params.reference}: ${lastError}`);
    }
    return null;
  };

  // Route based on preferred provider setting
  if (preferredProvider === "swiftdata") {
    const swiftResult = await trySwiftData();
    if (swiftResult) return swiftResult;
    const dmResult = await tryDataMart();
    if (dmResult) return dmResult;
  } else {
    const dmResult = await tryDataMart();
    if (dmResult) return dmResult;
    const swiftResult = await trySwiftData();
    if (swiftResult) return swiftResult;
  }

  return {
    success: false,
    provider: "none",
    status: "failed",
    orderRef: params.reference,
    message: lastError || "No active provider API key configured or all providers failed",
  };
}

/**
 * Helper to normalize raw provider order status strings
 */
export function normalizeProviderStatus(stStr: string): "completed" | "processing" | "failed" | "pending" {
  const st = (stStr || "").toLowerCase().trim();
  if (st === "completed" || st === "delivered" || st === "successful" || st === "success" || st === "fulfilled") {
    return "completed";
  }
  if (st === "failed" || st === "cancelled" || st === "rejected" || st === "declined" || st === "refunded" || st === "error") {
    return "failed";
  }
  if (st === "pending" || st === "waiting" || st === "queued") {
    return "pending";
  }
  return "processing";
}

/**
 * Unified Provider Order Status Checker
 */
export async function queryProviderOrderStatus(reference: string): Promise<{
  found: boolean;
  provider: "datamart" | "swiftdata" | "none";
  status: "completed" | "processing" | "failed" | "pending";
  raw?: any;
}> {
  const dmKey = getDataMartApiKey();
  const swiftKey = getSwiftDataApiKey();

  // Try DataMart first
  if (dmKey) {
    try {
      const dmRes = await getDataMartOrderStatus(reference);
      if (dmRes && (dmRes.status === "success" || dmRes.data)) {
        const rawObj = dmRes.data || dmRes;
        const stStr = String(rawObj.orderStatus || rawObj.status || rawObj.delivery_status || "");
        const status = normalizeProviderStatus(stStr);
        return { found: true, provider: "datamart", status, raw: rawObj };
      }
    } catch {
      // Not on DataMart
    }
  }

  // Try SwiftData
  if (swiftKey) {
    try {
      const swiftRes = await getSwiftDataOrder(reference);
      if (swiftRes && (swiftRes.order || swiftRes.success)) {
        const rawObj = swiftRes.order || swiftRes;
        const stStr = String(rawObj.status || rawObj.delivery_status || rawObj.orderStatus || "");
        const status = normalizeProviderStatus(stStr);
        return { found: true, provider: "swiftdata", status, raw: rawObj };
      }
    } catch {
      // Not on SwiftData
    }
  }

  return { found: false, provider: "none", status: "pending" };
}
