const SWIFTDATA_BASE_URL = process.env.SWIFTDATA_BASE_URL || "https://ihrvvniomtoofrjkmalb.supabase.co/functions/v1/api";
const SWIFTDATA_API_KEY = process.env.SWIFTDATA_API_KEY || "";

export async function buySwiftDataBundle(params: {
  phone: string;
  network: "yello" | "at_ishare" | "at_bigtime" | "telecel";
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
