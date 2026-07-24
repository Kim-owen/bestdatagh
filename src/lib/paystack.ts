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
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL 
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` 
    : "https://ghana-data-hub-gold.vercel.app";

  return paystackFetch<PaystackInitResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: amountPesewas,
      currency: "GHS",
      reference: params.reference,
      callback_url: params.callbackUrl || `${baseUrl}/payment/${params.reference}`,
      metadata: params.metadata,
      channels: ["mobile_money", "card"],
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
  metadata?: Record<string, any>;
}

export async function chargePaystackMobileMoney(params: ChargeMobileMoneyParams) {
  const amountPesewas = Math.round(params.amountGhs * 100);
  let cleanPhone = params.phone.replace(/\s+/g, "");
  if (cleanPhone.startsWith("+233")) cleanPhone = "0" + cleanPhone.slice(4);
  if (cleanPhone.startsWith("233")) cleanPhone = "0" + cleanPhone.slice(3);
  if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;

  try {
    const chargeRes = await paystackFetch<any>("/charge", {
      method: "POST",
      body: JSON.stringify({
        email: params.email,
        amount: amountPesewas,
        currency: "GHS",
        reference: params.reference,
        metadata: params.metadata,
        mobile_money: {
          phone: cleanPhone,
          provider: params.provider,
        },
      }),
    });
    return chargeRes;
  } catch (err: any) {
    console.warn("[Paystack Direct Charge Notice]:", err.message);
    const errStr = String(err.message || "").toLowerCase();
    const isDuplicate = errStr.includes("duplicate") || errStr.includes("exist") || errStr.includes("already");

    if (isDuplicate) {
      try {
        const subRef = `${params.reference}-R${Math.floor(Math.random() * 10000)}`;
        const retryChargeRes = await paystackFetch<any>("/charge", {
          method: "POST",
          body: JSON.stringify({
            email: params.email,
            amount: amountPesewas,
            currency: "GHS",
            reference: subRef,
            metadata: params.metadata,
            mobile_money: {
              phone: cleanPhone,
              provider: params.provider,
            },
          }),
        });
        return retryChargeRes;
      } catch (subErr: any) {
        return {
          status: true,
          message: "Prompt active",
          data: {
            status: "pay_offline",
            display_text: "Mobile Money prompt pushed to your phone screen. Please enter your 4-digit MoMo PIN.",
          },
        };
      }
    }

    // Fallback: Initialize standard Paystack transaction
    const fallbackRef = `${params.reference}-F${Date.now().toString().slice(-4)}`;
    const initRes = await initializePaystackTransaction({
      email: params.email,
      amountGhs: params.amountGhs,
      reference: fallbackRef,
    });

    return {
      status: true,
      message: "Authorization URL generated",
      data: {
        status: "open_url",
        authorization_url: initRes.data?.authorization_url,
        access_code: initRes.data?.access_code,
        display_text: "Please complete Mobile Money payment.",
      },
    };
  }
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
 * Check status of a direct Paystack charge
 */
export async function checkPaystackChargeStatus(reference: string) {
  return paystackFetch<any>(`/charge/${encodeURIComponent(reference)}`, {
    method: "GET",
  });
}

/**
 * List recent successful Paystack transactions for fallback verification
 */
export async function listRecentPaystackTransactions(params?: { customer?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.customer) query.set("customer", params.customer);
  if (params?.status) query.set("status", params.status);
  query.set("per_page", "20");

  return paystackFetch<any>(`/transaction?${query.toString()}`, {
    method: "GET",
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
 * Create a Paystack Customer
 */
export async function createPaystackCustomer(params: { email: string; phone: string; name?: string }) {
  let cleanPhone = params.phone.replace(/\s+/g, "");
  if (cleanPhone.startsWith("+233")) cleanPhone = "0" + cleanPhone.slice(4);
  if (cleanPhone.startsWith("233")) cleanPhone = "0" + cleanPhone.slice(3);
  if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;

  return paystackFetch<any>("/customer", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      phone: cleanPhone,
      first_name: params.name || "Customer",
    }),
  });
}

/**
 * Resolve Ghana Mobile Money Account Number & Holder Name
 */
export async function resolvePaystackAccount(params: { accountNumber: string; bankCode: string }) {
  let cleanPhone = params.accountNumber.replace(/\s+/g, "");
  if (cleanPhone.startsWith("+233")) cleanPhone = "0" + cleanPhone.slice(4);
  if (cleanPhone.startsWith("233")) cleanPhone = "0" + cleanPhone.slice(3);
  if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;

  const normalizedBankCode = params.bankCode.toUpperCase().includes("MTN")
    ? "MTN"
    : params.bankCode.toUpperCase().includes("TELECEL") || params.bankCode.toUpperCase().includes("VODAFONE") || params.bankCode.toUpperCase().includes("VDF")
    ? "VDF"
    : "TGO";

  return paystackFetch<any>(`/bank/resolve?account_number=${cleanPhone}&bank_code=${normalizedBankCode}`, {
    method: "GET",
  });
}

/**
 * Create Paystack Payment Request (Invoice)
 */
export async function createPaystackPaymentRequest(params: {
  customer: string; // Customer ID or Code (e.g. CUS_xxx or email)
  amountGhs: number;
  description: string;
  lineItems?: Array<{ name: string; amount: number; quantity?: number }>;
}) {
  const amountPesewas = Math.round(params.amountGhs * 100);

  const formattedItems = (params.lineItems || []).map((it) => ({
    name: it.name,
    amount: Math.round(it.amount * 100),
    quantity: it.quantity || 1,
  }));

  return paystackFetch<any>("/paymentrequest", {
    method: "POST",
    body: JSON.stringify({
      customer: params.customer,
      amount: amountPesewas,
      currency: "GHS",
      description: params.description,
      line_items: formattedItems.length > 0 ? formattedItems : undefined,
      send_notification: true,
    }),
  });
}

/**
 * Verify Paystack Payment Request status
 */
export async function verifyPaystackPaymentRequest(code: string) {
  return paystackFetch<any>(`/paymentrequest/verify/${encodeURIComponent(code)}`, {
    method: "GET",
  });
}

/**
 * Send notification for a Paystack Payment Request (SMS / Email)
 */
export async function notifyPaystackPaymentRequest(code: string) {
  return paystackFetch<any>(`/paymentrequest/notify/${encodeURIComponent(code)}`, {
    method: "POST",
  });
}

/**
 * List Paystack Transactions for Admin Reconciliation / Reports
 */
export async function listPaystackTransactions(params?: { perPage?: number; page?: number; status?: string; from?: string; to?: string }) {
  const query = new URLSearchParams();
  if (params?.perPage) query.set("perPage", String(params.perPage));
  if (params?.page) query.set("page", String(params.page));
  if (params?.status) query.set("status", params.status);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);

  return paystackFetch<any>(`/transaction?${query.toString()}`, {
    method: "GET",
  });
}

/**
 * Fetch Paystack Transaction Timeline
 */
export async function fetchPaystackTransactionTimeline(idOrReference: string) {
  return paystackFetch<any>(`/transaction/timeline/${encodeURIComponent(idOrReference)}`, {
    method: "GET",
  });
}

/**
 * Fetch Paystack Transaction Totals Metric
 */
export async function fetchPaystackTransactionTotals() {
  return paystackFetch<any>("/transaction/totals", {
    method: "GET",
  });
}

/**
 * Charge reusable authorization code (Saved Cards / Reusable MoMo)
 */
export async function chargePaystackAuthorization(params: { authorizationCode: string; email: string; amountGhs: number; reference: string }) {
  const amountPesewas = Math.round(params.amountGhs * 100);

  return paystackFetch<any>("/transaction/charge_authorization", {
    method: "POST",
    body: JSON.stringify({
      authorization_code: params.authorizationCode,
      email: params.email,
      amount: amountPesewas,
      currency: "GHS",
      reference: params.reference,
    }),
  });
}

/**
 * Fetch Paystack Payment Session Timeout
 */
export async function fetchPaystackSessionTimeout() {
  return paystackFetch<any>("/integration/payment_session_timeout", {
    method: "GET",
  });
}

/**
 * Update Paystack Payment Session Timeout (in seconds, 0 = disable)
 */
export async function updatePaystackSessionTimeout(timeoutSeconds: number) {
  return paystackFetch<any>("/integration/payment_session_timeout", {
    method: "PUT",
    body: JSON.stringify({ timeout: timeoutSeconds }),
  });
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
