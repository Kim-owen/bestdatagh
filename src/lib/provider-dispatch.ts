import { getSwiftDataApiKey, mapToSwiftDataNetwork, buySwiftDataBundle, getSwiftDataOrder, parseSizeGb } from "@/lib/swiftdata";

export interface DispatchParams {
  phone: string;
  network: string;
  sizeLabel: string;
  reference: string;
}

export interface DispatchResult {
  success: boolean;
  provider: "swiftdata" | "none";
  status: "completed" | "processing" | "failed";
  orderRef: string;
  message?: string;
  rawResponse?: any;
}

/**
 * Active data provider setting (SwiftData API Gateway)
 */
export async function getActiveProviderPreference(): Promise<"swiftdata"> {
  return "swiftdata";
}

/**
 * Unified Automated Bundle Dispatcher (SwiftData API)
 */
export async function dispatchDataBundle(params: DispatchParams): Promise<DispatchResult> {
  const cleanPhone = params.phone.replace(/\s+/g, "");
  const sizeGb = parseSizeGb(params.sizeLabel);
  const swiftKey = getSwiftDataApiKey();

  if (!swiftKey) {
    return {
      success: false,
      provider: "none",
      status: "failed",
      orderRef: params.reference,
      message: "SwiftData API key is not configured.",
    };
  }

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

    return {
      success: false,
      provider: "swiftdata",
      status: "failed",
      orderRef: params.reference,
      message: swiftRes?.error || "SwiftData returned unexpected response",
      rawResponse: swiftRes,
    };
  } catch (err: any) {
    const errorMsg = err.message || "SwiftData dispatch failed";
    console.error(`[ProviderDispatch] SwiftData dispatch failed for ref ${params.reference}:`, errorMsg);
    return {
      success: false,
      provider: "swiftdata",
      status: "failed",
      orderRef: params.reference,
      message: errorMsg,
    };
  }
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
 * Provider Order Status Checker via SwiftData API
 */
export async function queryProviderOrderStatus(reference: string): Promise<{
  found: boolean;
  provider: "swiftdata" | "none";
  status: "completed" | "processing" | "failed" | "pending";
  raw?: any;
}> {
  const swiftKey = getSwiftDataApiKey();

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
      // Order not yet found on SwiftData
    }
  }

  return { found: false, provider: "none", status: "pending" };
}
