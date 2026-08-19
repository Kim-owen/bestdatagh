const BASE_URL_RAW = process.env.SWIFTDATA_BASE_URL || "https://ihrvvniomtoofrjkmalb.supabase.co/functions/v1/api";

function getEndpoint(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  let base = (process.env.SWIFTDATA_BASE_URL || "https://ihrvvniomtoofrjkmalb.supabase.co/functions/v1/api/v1").trim().replace(/\/+$/, "");
  if (!base.endsWith("/v1")) {
    base = `${base}/v1`;
  }
  return `${base}${cleanPath}`;
}

export function getSwiftDataApiKey(): string {
  const key = process.env.SWIFTDATA_API_KEY;
  if (!key) {
    throw new Error("SWIFTDATA_API_KEY is not configured in environment variables.");
  }
  return key;
}

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

  const res = await fetch(getEndpoint("/buy-data"), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getSwiftDataApiKey()}`,
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
  const res = await fetch(getEndpoint(`/orders/${encodeURIComponent(reference)}`), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${getSwiftDataApiKey()}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Failed to fetch SwiftData order for reference ${reference}`);
  }

  return data;
}

export async function listSwiftDataOrders(limit = 50, offset = 0) {
  const res = await fetch(getEndpoint(`/orders?limit=${limit}&offset=${offset}`), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${getSwiftDataApiKey()}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to list SwiftData orders");
  }

  return data;
}

export async function getSwiftDataBalance() {
  const res = await fetch(getEndpoint("/balance"), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${getSwiftDataApiKey()}`,
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
  const res = await fetch(getEndpoint("/verify-number"), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getSwiftDataApiKey()}`,
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

export async function verifySwiftDataNumbersBulk(phones: string[]) {
  const cleanPhones = phones.map((p) => p.replace(/\s+/g, ""));
  const res = await fetch(getEndpoint("/verify-number/bulk"), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getSwiftDataApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phones: cleanPhones }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to verify phone numbers in bulk");
  }

  return data;
}

export async function listSwiftDataUtilityProducts(type?: "airtime" | "ecg" | "tv") {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  const res = await fetch(getEndpoint(`/utility-products${query}`), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${getSwiftDataApiKey()}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to fetch utility products");
  }

  return data;
}

export async function buySwiftDataAirtime(params: {
  phone: string;
  provider_code: "MTN" | "TELECEL" | "AIRTELTIGO" | string;
  amount: number;
  reference?: string;
}) {
  const cleanPhone = params.phone.replace(/\s+/g, "");
  const res = await fetch(getEndpoint("/buy-airtime"), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getSwiftDataApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: cleanPhone,
      provider_code: params.provider_code,
      amount: params.amount,
      reference: params.reference,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Airtime purchase failed");
  }

  return data;
}

export async function buySwiftDataECG(params: {
  meter: string;
  provider_code?: string;
  amount: number;
  account_name?: string;
}) {
  const res = await fetch(getEndpoint("/buy-ecg"), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getSwiftDataApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      meter: params.meter.trim(),
      provider_code: params.provider_code || "ecg2",
      amount: params.amount,
      account_name: params.account_name || "Customer",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "ECG bill payment failed");
  }

  return data;
}

export async function buySwiftDataTV(params: {
  smartcard: string;
  provider_code: "DSTV" | "GOTV" | "STARTIMES" | string;
  amount: number;
  account_name?: string;
}) {
  const res = await fetch(getEndpoint("/buy-tv"), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getSwiftDataApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      smartcard: params.smartcard.trim(),
      provider_code: params.provider_code,
      amount: params.amount,
      account_name: params.account_name || "Customer",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "TV subscription payment failed");
  }

  return data;
}

export async function getSwiftDataHealth() {
  const res = await fetch(getEndpoint("/health"), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${getSwiftDataApiKey()}`,
    },
  });
  return await res.json();
}

export async function getSwiftDataPackages() {
  const res = await fetch(getEndpoint("/packages"), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${getSwiftDataApiKey()}`,
    },
  });
  return await res.json();
}
