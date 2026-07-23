const SWIFTDATA_BASE_URL = process.env.SWIFTDATA_BASE_URL || "https://ihrvvniomtoofrjkmalb.supabase.co/functions/v1/api";
const SWIFTDATA_API_KEY = process.env.SWIFTDATA_API_KEY || "";

export type SwiftDataNetwork = "yello" | "at_ishare" | "at_bigtime" | "telecel";

/**
 * Map internal bundle network names & labels to SwiftData network IDs
 */
export function mapToSwiftDataNetwork(networkStr: string, sizeLabel?: string): SwiftDataNetwork {
  const net = (networkStr || "").toLowerCase();
  const label = (sizeLabel || "").toLowerCase();

  if (net.includes("mtn") || net.includes("yello")) return "yello";
  if (net.includes("telecel") || net.includes("voda")) return "telecel";
  if (net.includes("bigtime") || label.includes("bigtime")) return "at_bigtime";
  if (net.includes("at") || net.includes("airtel") || net.includes("tigo") || net.includes("ishare")) {
    if (label.includes("bigtime")) return "at_bigtime";
    return "at_ishare";
  }
  return "yello";
}

/**
 * Parse size label string to gigabytes number
 */
export function parseSizeGb(sizeLabel: string): number {
  const clean = (sizeLabel || "").toUpperCase().trim();
  if (clean.includes("MB")) {
    const mb = parseFloat(clean.replace(/[^\d.]/g, ""));
    return isNaN(mb) ? 1 : mb / 1000;
  }
  const gb = parseFloat(clean.replace(/[^\d.]/g, ""));
  return isNaN(gb) ? 1 : gb;
}

export async function buySwiftDataBundle(params: {
  phone: string;
  network: SwiftDataNetwork;
  sizeGb: number;
  reference?: string;
}) {
  const cleanPhone = params.phone.replace(/\s+/g, "");

  const res = await fetch(`${SWIFTDATA_BASE_URL}/v1/buy-data`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SWIFTDATA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: cleanPhone,
      network: params.network,
      size_gb: params.sizeGb,
      reference: params.reference,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `SwiftData purchase failed with status ${res.status}`);
  }

  return data;
}

export async function getSwiftDataOrder(reference: string) {
  const res = await fetch(`${SWIFTDATA_BASE_URL}/v1/orders/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${SWIFTDATA_API_KEY}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to fetch SwiftData order for reference ${reference}`);
  }

  return data;
}

export async function listSwiftDataOrders(limit = 50, offset = 0) {
  const res = await fetch(`${SWIFTDATA_BASE_URL}/v1/orders?limit=${limit}&offset=${offset}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${SWIFTDATA_API_KEY}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to list SwiftData orders");
  }

  return data;
}

export async function getSwiftDataBalance() {
  const res = await fetch(`${SWIFTDATA_BASE_URL}/v1/balance`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${SWIFTDATA_API_KEY}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to fetch SwiftData balance");
  }

  return data;
}

export async function verifySwiftDataNumber(phone: string) {
  const cleanPhone = phone.replace(/\s+/g, "");
  const res = await fetch(`${SWIFTDATA_BASE_URL}/v1/verify-number`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SWIFTDATA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone: cleanPhone }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to verify phone number");
  }

  return data;
}

export async function getSwiftDataHealth() {
  const res = await fetch(`${SWIFTDATA_BASE_URL}/v1/health`, {
    method: "GET",
  });
  return await res.json();
}

export async function getSwiftDataPackages() {
  const res = await fetch(`${SWIFTDATA_BASE_URL}/v1/packages`, {
    method: "GET",
  });
  return await res.json();
}
