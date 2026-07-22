import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function cleanPhone(raw: string): string {
  const digits = String(raw || "").replace(/\s+/g, "");
  if (digits.startsWith("+233")) return "0" + digits.slice(4);
  if (digits.startsWith("233")) return "0" + digits.slice(3);
  return digits;
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
    const { data: record, error } = await supabaseAdmin
      .from("phone_verifications")
      .select("phone, verified_at")
      .eq("phone", data.phone)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.warn("Check phone verification warning:", error.message);
    }

    const isVerified = Boolean(record && record.verified_at);
    return { isVerified, phone: data.phone };
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
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from("phone_verifications")
      .upsert({
        phone: data.phone,
        otp_code: otpCode,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "phone" });

    if (error) {
      throw new Error(`Failed to generate OTP code: ${error.message}`);
    }

    console.log(`[OTP Sent] Phone: +233 ${data.phone.slice(1)} | Code: ${otpCode}`);

    const maskedPhone = `+233 ${data.phone.slice(1, 3)} *** ${data.phone.slice(-4)}`;
    return {
      success: true,
      maskedPhone,
      otpCode, // Returned for instant demo testing & notification toast
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
    const { data: record, error } = await supabaseAdmin
      .from("phone_verifications")
      .select("phone, otp_code, expires_at, verified_at")
      .eq("phone", data.phone)
      .maybeSingle();

    if (error || !record) {
      throw new Error("No pending OTP found for this phone number.");
    }

    if (record.verified_at) {
      return { success: true, message: "Phone number already verified." };
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      throw new Error("OTP verification code has expired. Please request a new code.");
    }

    if (record.otp_code !== data.otpCode) {
      throw new Error("Incorrect 6-digit verification code. Please check and try again.");
    }

    // Mark as verified
    const { error: updateErr } = await supabaseAdmin
      .from("phone_verifications")
      .update({
        verified_at: new Date().toISOString(),
        otp_code: null,
      })
      .eq("phone", data.phone);

    if (updateErr) {
      throw new Error(`Failed to mark phone as verified: ${updateErr.message}`);
    }

    return { success: true, message: "Phone number successfully verified!" };
  });
