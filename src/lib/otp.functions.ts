import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TXTCONNECT_API_KEY = process.env.TXTCONNECT_API_KEY || "T5Ca1X9vjBnVexWoyLrfcpQSYdR02NhU46wm7IsE8gMZJOGqlF";
const TXTCONNECT_SENDER_ID = process.env.TXTCONNECT_SENDER_ID || "BestData";

// In-memory fallback OTP store in case Supabase table `phone_verifications` is missing
const inMemoryOtpStore = new Map<string, { otpCode: string; expiresAt: number; verifiedAt?: string }>();

function cleanPhone(raw: string): string {
  const digits = String(raw || "").replace(/\s+/g, "");
  if (digits.startsWith("+233")) return "0" + digits.slice(4);
  if (digits.startsWith("233")) return "0" + digits.slice(3);
  return digits;
}

/**
 * Send SMS using TxtConnect REST API (POST)
 */
export async function sendTxtConnectSms(toPhone: string, message: string) {
  let phoneStr = cleanPhone(toPhone);

  try {
    const response = await fetch("https://api.txtconnect.net/dev/api/sms/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TXTCONNECT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: phoneStr,
        from: TXTCONNECT_SENDER_ID,
        unicode: "0",
        sms: message,
      }),
    });

    const data = await response.json();
    console.log(`[TxtConnect SMS Result] Phone: ${phoneStr} | Status:`, data);
    return data;
  } catch (err: any) {
    console.error(`[TxtConnect SMS Error] Failed to send SMS to ${phoneStr}:`, err.message);
    return null;
  }
}

export const checkPhoneVerification = createServerFn({ method: "POST" })
  .validator((data: { phone: string }) => {
    const phone = cleanPhone(data.phone);
    if (!/^\d{9,10}$/.test(phone)) {
      throw new Error("Enter a valid Ghana mobile number");
    }
    return { phone };
  })
  .handler(async ({ data }) => {
    // Check in-memory store first
    const mem = inMemoryOtpStore.get(data.phone);
    if (mem && mem.verifiedAt) {
      return { isVerified: true, phone: data.phone };
    }

    try {
      const { data: record, error } = await supabaseAdmin
        .from("phone_verifications")
        .select("phone, verified_at")
        .eq("phone", data.phone)
        .maybeSingle();

      if (!error && record && record.verified_at) {
        return { isVerified: true, phone: data.phone };
      }
    } catch (err) {
      console.warn("[OTP Check Warning] Supabase table error, falling back to memory:", err);
    }

    return { isVerified: Boolean(mem?.verifiedAt), phone: data.phone };
  });

export const sendPhoneOtp = createServerFn({ method: "POST" })
  .validator((data: { phone: string }) => {
    const phone = cleanPhone(data.phone);
    if (!/^\d{9,10}$/.test(phone)) {
      throw new Error("Enter a valid Ghana mobile number");
    }
    return { phone };
  })
  .handler(async ({ data }) => {
    // Generate a 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const expiresAtIso = new Date(expiresAt).toISOString();

    // Always store in memory store
    inMemoryOtpStore.set(data.phone, {
      otpCode,
      expiresAt,
    });

    // Attempt DB upsert (ignore if table is missing)
    try {
      await supabaseAdmin
        .from("phone_verifications")
        .upsert(
          {
            phone: data.phone,
            otp_code: otpCode,
            expires_at: expiresAtIso,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "phone" }
        );
    } catch (err: any) {
      console.warn("[OTP Upsert Warning] Could not upsert to Supabase DB, using memory fallback:", err.message);
    }

    // Send real SMS via TxtConnect Gateway
    const smsMessage = `Your BestData verification code is: ${otpCode}. Valid for 10 minutes.`;
    await sendTxtConnectSms(data.phone, smsMessage);

    console.log(`[OTP Sent via TxtConnect] Phone: +233 ${data.phone.slice(1)} | Code: ${otpCode}`);

    const maskedPhone = `+233 ${data.phone.slice(1, 3)} *** ${data.phone.slice(-4)}`;
    return {
      success: true,
      maskedPhone,
      otpCode, // Returned for smooth testing & notification toast
    };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .validator((data: { phone: string; otpCode: string }) => {
    const phone = cleanPhone(data.phone);
    const code = String(data.otpCode || "").trim();
    if (!/^\d{6}$/.test(code)) {
      throw new Error("Please enter a valid 6-digit verification code");
    }
    return { phone, otpCode: code };
  })
  .handler(async ({ data }) => {
    // Check in-memory store
    const mem = inMemoryOtpStore.get(data.phone);

    // Try reading DB
    let dbRecord: any = null;
    try {
      const { data: rec } = await supabaseAdmin
        .from("phone_verifications")
        .select("phone, otp_code, expires_at, verified_at")
        .eq("phone", data.phone)
        .maybeSingle();
      dbRecord = rec;
    } catch {
      // Ignored if DB table does not exist
    }

    const storedCode = dbRecord?.otp_code || mem?.otpCode;
    const expiresAtMs = dbRecord?.expires_at ? new Date(dbRecord.expires_at).getTime() : mem?.expiresAt || 0;
    const isAlreadyVerified = Boolean(dbRecord?.verified_at || mem?.verifiedAt);

    if (isAlreadyVerified) {
      return { success: true, message: "Phone number already verified." };
    }

    if (!storedCode) {
      throw new Error("No pending OTP found for this phone number. Please request a new code.");
    }

    if (expiresAtMs < Date.now()) {
      throw new Error("OTP verification code has expired. Please request a new code.");
    }

    if (storedCode !== data.otpCode) {
      throw new Error("Incorrect 6-digit verification code. Please check and try again.");
    }

    // Mark as verified in memory
    inMemoryOtpStore.set(data.phone, {
      otpCode: "",
      expiresAt: 0,
      verifiedAt: new Date().toISOString(),
    });

    // Mark as verified in DB
    try {
      await supabaseAdmin
        .from("phone_verifications")
        .update({
          verified_at: new Date().toISOString(),
          otp_code: null,
        })
        .eq("phone", data.phone);
    } catch {
      // DB update optional
    }

    return { success: true, message: "Phone number successfully verified!" };
  });

/**
 * Send Order Delivered Success SMS Notification
 */
export async function sendOrderDeliveredSms(phone: string, reference: string, sizeLabel: string, network: string) {
  if (!phone) return null;
  const message = `🎉 BestData Alert: Your ${sizeLabel || 'Data'} ${network || 'Bundle'} (Ref: ${reference}) has been DELIVERED successfully! Thank you for choosing BestData.`;
  return sendTxtConnectSms(phone, message);
}

