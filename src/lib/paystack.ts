import crypto from "node:crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || process.env.VITE_PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface InitializePaystackParams {
  email: string;
  amountGhs: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: "success" | "failed" | "abandoned";
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    customer: {
      email: string;
      customer_code: string;
    };
    metadata?: any;
    paid_at?: string;
  };
}

export interface CreateRecipientParams {
  name: string;
  phone: string;
  bankCode: string; // e.g. "MTN", "VDF" (Telecel), "TGO" (AirtelTigo)
}

export interface InitiateTransferParams {
  amountGhs: number;
  recipientCode: string;
  reference: string;
  reason?: string;
}

/**
 * Perform an authenticated request to the Paystack API
 */
async function paystackFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const secretKey = PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured in environment variables.");
  }

  const url = `${PAYSTACK_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await response.json();
  if (!response.ok || body.status === false) {
    throw new Error(body.message || `Paystack API error (${response.status})`);
  }

  return body as T;
}

/**
 * Initialize a transaction to generate a checkout payment URL
 */
export async function initializePaystackTransaction(params: InitializePaystackParams): Promise<PaystackInitResponse> {
  const amountPesewas = Math.round(params.amountGhs * 100);

  return paystackFetch<PaystackInitResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: amountPesewas,
      currency: "GHS",
      reference: params.reference,
      callback_url: params.callbackUrl,
      channels: ["mobile_money", "card"],
      metadata: params.metadata,
    }),
  });
}

/**
 * Verify a transaction using its unique reference
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  return paystackFetch<PaystackVerifyResponse>(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  });
}

export interface ChargeMobileMoneyParams {
  email: string;
  amountGhs: number;
  reference: string;
  phone: string;
  provider: "mtn" | "vod" | "tgo";
}

/**
 * Direct Paystack MoMo Push Prompt Charge (No External Redirects)
 */
export async function chargePaystackMobileMoney(params: ChargeMobileMoneyParams) {
  const amountPesewas = Math.round(params.amountGhs * 100);
  const cleanPhone = params.phone.replace(/\s+/g, "");

  return paystackFetch<any>("/charge", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: amountPesewas,
      currency: "GHS",
      reference: params.reference,
      mobile_money: {
        phone: cleanPhone,
        provider: params.provider,
      },
    }),
  });
}

/**
 * Submit Paystack OTP for charges requiring authorization
 */
export async function submitPaystackOtp(params: { otp: string; reference: string }) {
  return paystackFetch<any>("/charge/submit_otp", {
    method: "POST",
    body: JSON.stringify({
      otp: params.otp,
      reference: params.reference,
    }),
  });
}

/**
 * Create a Mobile Money Transfer Recipient for agent payouts
 */
export async function createPaystackTransferRecipient(params: CreateRecipientParams) {
  // Paystack bank codes for Ghana MoMo:
  // MTN: "MTN", Telecel: "VDF", AirtelTigo: "TGO"
  const normalizedBankCode = params.bankCode.toUpperCase().includes("MTN")
    ? "MTN"
    : params.bankCode.toUpperCase().includes("TELECEL") || params.bankCode.toUpperCase().includes("VODAFONE") || params.bankCode.toUpperCase().includes("VDF")
    ? "VDF"
    : "TGO";

  const body = await paystackFetch<any>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "mobile_money",
      name: params.name,
      account_number: params.phone,
      bank_code: normalizedBankCode,
      currency: "GHS",
    }),
  });

  return body.data as { recipient_code: string; name: string; details: any };
}

/**
 * Initiate an automated mobile money transfer payout
 */
export async function initiatePaystackTransfer(params: InitiateTransferParams) {
  const amountPesewas = Math.round(params.amountGhs * 100);

  const body = await paystackFetch<any>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: amountPesewas,
      recipient: params.recipientCode,
      reason: params.reason || "Wallet Withdrawal",
      reference: params.reference,
      currency: "GHS",
    }),
  });

  return body.data as { transfer_code: string; status: string; reference: string };
}

/**
 * Verify HMAC SHA512 signature for incoming Paystack webhooks
 */
export function verifyPaystackWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !PAYSTACK_SECRET_KEY) return false;

  const expectedSignature = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signatureHeader));
}
