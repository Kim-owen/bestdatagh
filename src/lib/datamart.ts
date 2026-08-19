/**
 * DataMart API Integration Client
 * Base URL: https://api.datamartgh.shop
 */

const DATAMART_BASE_URL = process.env.DATAMART_BASE_URL || "https://api.datamartgh.shop/api";

export function getDataMartApiKey(): string {
  return process.env.DATAMART_API_KEY || "";
}

export function getDataMartSecret(): string | undefined {
  return process.env.DATAMART_API_SECRET;
}

export function getDataMartRefPrefix(): string {
  return process.env.DATAMART_REF_PREFIX || "";
}

export type DataMartNetwork = "YELLO" | "TELECEL" | "AT_PREMIUM";

/**
 * Maps internal network & size strings to DataMart network format
 */
export function mapToDataMartNetwork(networkStr: string, sizeLabel?: string): DataMartNetwork {
  const net = (networkStr || "").toLowerCase();
  const label = (sizeLabel || "").toLowerCase();

  if (net.includes("mtn") || net.includes("yello")) return "YELLO";
  if (net.includes("telecel") || net.includes("voda")) return "TELECEL";
  if (net.includes("at") || net.includes("airtel") || net.includes("tigo") || net.includes("ishare") || net.includes("bigtime") || label.includes("bigtime")) {
    return "AT_PREMIUM";
  }
  return "YELLO";
}

/**
 * Standard headers generator for DataMart requests
 */
function getHeaders(idempotencyKey?: string): Record<string, string> {
  const apiKey = getDataMartApiKey();
  const secret = getDataMartSecret();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };

  if (secret) {
    headers["X-API-Secret"] = secret;
  }

  if (idempotencyKey) {
    headers["X-Idempotency-Key"] = idempotencyKey;
  }

  return headers;
}

/**
 * Formats a reference according to DATAMART_REF_PREFIX if configured
 */
export function formatDataMartRef(ref: string): string {
  const prefix = getDataMartRefPrefix();
  if (!prefix || ref.startsWith(prefix)) return ref;
  return `${prefix}${ref}`;
}

/**
 * Pre-check an MTN phone number before placing a bundle order to prevent new-SIM delivery freezes
 */
export async function verifyDataMartNumber(phoneNumber: string) {
  const apiKey = getDataMartApiKey();
  if (!apiKey) return { servable: true, recommendation: "sell_any", message: "API key not configured" };

  const cleanPhone = phoneNumber.replace(/\s+/g, "");
  try {
    const res = await fetch(`${DATAMART_BASE_URL}/developer/verify-number`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ phoneNumber: cleanPhone }),
    });

    const data = await res.json();
    if (!res.ok || data.status !== "success") {
      console.warn("[DataMart Number Verify Warning]:", data.message || res.statusText);
      return { servable: true, recommendation: "sell_any", message: data.message || "Verification endpoint warning" };
    }

    return {
      servable: Boolean(data.data?.servable),
      recommendation: data.data?.recommendation || "sell_any",
      message: data.data?.message || "",
      network: data.data?.network,
    };
  } catch (err: any) {
    console.warn("[DataMart Number Verify Error]:", err?.message);
    return { servable: true, recommendation: "sell_any", message: err?.message || "Verification check skipped" };
  }
}

/**
 * Buy a DataMart Data Bundle for a recipient phone number
 */
export async function buyDataMartBundle(params: {
  phone: string;
  network: DataMartNetwork;
  capacityGb: number | string;
  reference?: string;
  idempotencyKey?: string;
}) {
  const apiKey = getDataMartApiKey();
  if (!apiKey) {
    throw new Error("DataMart API Key is not configured (DATAMART_API_KEY).");
  }

  const cleanPhone = params.phone.replace(/\s+/g, "");
  const capacityStr = String(params.capacityGb);
  const formattedRef = params.reference ? formatDataMartRef(params.reference) : undefined;

  const bodyPayload: any = {
    phoneNumber: cleanPhone,
    network: params.network,
    capacity: capacityStr,
    gateway: "wallet",
  };

  if (formattedRef) {
    bodyPayload.ref = formattedRef;
  }

  const res = await fetch(`${DATAMART_BASE_URL}/developer/purchase`, {
    method: "POST",
    headers: getHeaders(params.idempotencyKey),
    body: JSON.stringify(bodyPayload),
  });

  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || `DataMart purchase failed with HTTP status ${res.status}`);
  }

  return data;
}

/**
 * Submit bulk data bundle purchases (Up to 50 orders per call)
 */
export async function buyDataMartBulk(orders: Array<{
  phoneNumber: string;
  network: DataMartNetwork;
  capacity: string;
  ref?: string;
}>, idempotencyKey?: string) {
  const apiKey = getDataMartApiKey();
  if (!apiKey) {
    throw new Error("DataMart API Key is not configured (DATAMART_API_KEY).");
  }

  const formattedOrders = orders.map((o) => ({
    ...o,
    phoneNumber: o.phoneNumber.replace(/\s+/g, ""),
    ref: o.ref ? formatDataMartRef(o.ref) : undefined,
  }));

  const res = await fetch(`${DATAMART_BASE_URL}/developer/bulk-purchase`, {
    method: "POST",
    headers: getHeaders(idempotencyKey),
    body: JSON.stringify({ orders: formattedOrders }),
  });

  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || `DataMart bulk purchase failed with HTTP status ${res.status}`);
  }

  return data;
}

/**
 * Fetch DataMart order status using order reference
 */
export async function getDataMartOrderStatus(reference: string) {
  const apiKey = getDataMartApiKey();
  if (!apiKey) {
    throw new Error("DataMart API Key is not configured.");
  }

  const formattedRef = formatDataMartRef(reference);
  const res = await fetch(`${DATAMART_BASE_URL}/developer/order-status/${encodeURIComponent(formattedRef)}`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || `Failed to fetch DataMart order status for reference ${reference}`);
  }

  return data;
}

/**
 * Fetch available data packages from DataMart API
 */
export async function getDataMartPackages(network?: DataMartNetwork) {
  const apiKey = getDataMartApiKey();
  if (!apiKey) {
    return { status: "error", message: "DATAMART_API_KEY missing", data: null };
  }

  const query = network ? `?network=${network}` : "";
  const res = await fetch(`${DATAMART_BASE_URL}/developer/data-packages${query}`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || "Failed to fetch DataMart data packages");
  }

  return data;
}

/**
 * Fetch current DataMart wallet balance
 */
export async function getDataMartBalance() {
  const apiKey = getDataMartApiKey();
  if (!apiKey) {
    return { balance: 0, currency: "GHS", status: "unconfigured" };
  }

  const res = await fetch(`${DATAMART_BASE_URL}/developer/balance`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || "Failed to fetch DataMart wallet balance");
  }

  return {
    balance: Number(data.data?.balance || 0),
    currency: data.data?.currency || "GHS",
    user: data.data?.user || null,
    status: "success",
  };
}

/**
 * Fetch live WAEC / BECE Result Checker Products
 */
export async function getDataMartCheckerProducts() {
  const apiKey = getDataMartApiKey();
  if (!apiKey) return { status: "error", message: "DATAMART_API_KEY missing", data: [] };

  const res = await fetch(`${DATAMART_BASE_URL}/checkers/products`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || "Failed to fetch DataMart checker products");
  }

  return data;
}

/**
 * Purchase WAEC or BECE Result Checker Card
 */
export async function buyDataMartChecker(params: {
  checkerType: "WAEC" | "BECE";
  phoneNumber: string;
  ref?: string;
  skipSms?: boolean;
}) {
  const apiKey = getDataMartApiKey();
  if (!apiKey) {
    throw new Error("DataMart API Key is not configured.");
  }

  const formattedRef = params.ref ? formatDataMartRef(params.ref) : undefined;
  const res = await fetch(`${DATAMART_BASE_URL}/checkers/purchase`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      checkerType: params.checkerType,
      phoneNumber: params.phoneNumber.replace(/\s+/g, ""),
      ref: formattedRef,
      skipSms: params.skipSms ?? false,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || `Result checker purchase failed: ${res.statusText}`);
  }

  return data;
}
