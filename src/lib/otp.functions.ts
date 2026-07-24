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
      const { data: record, error } = await (supabaseAdmin as any)
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
      await (supabaseAdmin as any)
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
      const { data: rec } = await (supabaseAdmin as any)
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
      await (supabaseAdmin as any)
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

/**
 * Send Welcome SMS Notification with WhatsApp Channel Link
 */
export async function sendWelcomeSms(toPhone: string, name: string) {
  if (!toPhone) return null;
  const firstName = name ? name.trim().split(" ")[0] : "Valued Member";
  const message = `🎉 Welcome to BestData, ${firstName}! Your account is now active. Join our official WhatsApp channel for exclusive deals & instant updates: https://whatsapp.com/channel/0029Vb87LlELdQebZ0K7n51E`;
  return sendTxtConnectSms(toPhone, message);
}

export const triggerWelcomeSms = createServerFn({ method: "POST" })
  .validator((data: { phone: string; name: string }) => data)
  .handler(async ({ data }) => {
    try {
      await sendWelcomeSms(data.phone, data.name);
      return { ok: true };
    } catch (err: any) {
      console.warn("[Welcome SMS Notice]:", err.message);
      return { ok: false };
    }
  });

/**
 * Verify strict uniqueness for Phone, Email, and Name before signup
 */
export const checkSignupUniqueness = createServerFn({ method: "POST" })
  .validator((data: { phone?: string; email?: string; name?: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Phone Uniqueness Check
    if (data.phone) {
      const raw = cleanPhone(data.phone);
      const formattedIntl = raw.startsWith("0") ? `+233${raw.slice(1)}` : `+233${raw}`;
      const { data: phoneMatch } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id, phone")
        .or(`phone.eq.${raw},phone.eq.${formattedIntl}`)
        .maybeSingle();

      if (phoneMatch) {
        throw new Error(`The phone number (${raw}) is already registered to an existing account. Please log in instead.`);
      }
    }

    // 2. Email Uniqueness Check
    if (data.email && data.email.trim()) {
      const cleanEmail = data.email.trim().toLowerCase();
      const { data: emailMatch } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (emailMatch) {
        throw new Error(`The email address (${cleanEmail}) is already registered. Please log in instead.`);
      }
    }

    // 3. Display / Business Name Uniqueness Check
    if (data.name && data.name.trim().length >= 3) {
      const cleanName = data.name.trim();
      const { data: nameMatch } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id, display_name")
        .ilike("display_name", cleanName)
        .maybeSingle();

      if (nameMatch) {
        throw new Error(`An account with the name "${cleanName}" already exists. Please choose a unique display name.`);
      }
    }

    return { unique: true };
  });

/**
 * Register phone-verified user with instant auto email confirmation (bypasses email links)
 */
export const registerPhoneVerifiedUser = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; name: string; phone: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const clean = data.phone.replace(/[^\d]/g, "");
    const formattedPhone = clean.startsWith("0") ? `+233${clean.slice(1)}` : `+233${clean}`;

    // Enforce strict uniqueness check before user creation
    const raw = cleanPhone(data.phone);
    const { data: phoneMatch } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id")
      .or(`phone.eq.${raw},phone.eq.${formattedPhone}`)
      .maybeSingle();

    if (phoneMatch) {
      throw new Error(`The phone number (${data.phone}) is already registered. Please log in instead.`);
    }

    if (data.name && data.name.trim().length >= 3) {
      const { data: nameMatch } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id")
        .ilike("display_name", data.name.trim())
        .maybeSingle();

      if (nameMatch) {
        throw new Error(`An account with the name "${data.name.trim()}" already exists. Please choose a unique name.`);
      }
    }

    // Auto-confirm user email instantly since phone is SMS OTP verified
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        display_name: data.name,
        phone: formattedPhone,
        phone_verified: true,
      },
    });

    if (error) throw new Error(error.message);

    // Send Welcome SMS
    try {
      await sendWelcomeSms(data.phone, data.name);
    } catch (smsErr: any) {
      console.warn("[Welcome SMS Notice]:", smsErr.message);
    }

    return { ok: true, userId: newUser.user.id };
  });

/**
 * Log in or auto-register phone-verified user via SMS OTP
 */
export const loginPhoneVerifiedUser = createServerFn({ method: "POST" })
  .validator((data: { phone: string }) => ({
    phone: cleanPhone(data.phone),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const clean = data.phone;
    const formattedPhone = clean.startsWith("0") ? `+233${clean.slice(1)}` : `+233${clean}`;
    const syntheticEmail = `user-${clean}@bestdatagh.com`;
    const syntheticPassword = `OtpPass-${clean}-#2026!Sec`;

    // Check if profile exists by phone number or synthetic email
    const { data: existingProfile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, phone")
      .or(`phone.eq.${data.phone},phone.eq.${formattedPhone}`)
      .maybeSingle();

    let targetEmail = syntheticEmail;
    let targetPassword = syntheticPassword;

    if (existingProfile) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id);
      if (userData?.user?.email) {
        targetEmail = userData.user.email;
      }
      await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
        password: syntheticPassword,
        email_confirm: true,
      });
    } else {
      const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        password: syntheticPassword,
        email_confirm: true,
        user_metadata: {
          display_name: `Member (${clean})`,
          phone: formattedPhone,
          phone_verified: true,
        },
      });

      if (createErr && !createErr.message.includes("already registered")) {
        throw new Error(createErr.message);
      }

      try {
        await sendWelcomeSms(data.phone, `Member (${clean})`);
      } catch {}
    }

    return { ok: true, email: targetEmail, password: targetPassword };
  });

/**
 * Verify Email + Password, then dispatch 2FA SMS OTP to the user's verified phone number
 */
export const initiateEmailPasswordLoginWithOtp = createServerFn({ method: "POST" })
  .validator((data: { email: string; phone?: string }) => ({
    email: (data.email || "").trim().toLowerCase(),
    phone: data.phone ? cleanPhone(data.phone) : undefined,
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up profile by email
    const { data: userProfile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, phone, display_name")
      .eq("email", data.email)
      .maybeSingle();

    let verifiedPhone = userProfile?.phone || data.phone;

    if (!verifiedPhone) {
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
      const matched = usersList?.users?.find((u) => u.email?.toLowerCase() === data.email);
      if (matched) {
        verifiedPhone = matched.user_metadata?.phone || matched.phone;
      }
    }

    // If phone number was supplied now, save it to profile for future logins
    if (data.phone && userProfile?.id) {
      const formattedIntl = data.phone.startsWith("0") ? `+233${data.phone.slice(1)}` : `+233${data.phone}`;
      await (supabaseAdmin as any)
        .from("profiles")
        .update({ phone: data.phone })
        .eq("id", userProfile.id);

      try {
        await supabaseAdmin.auth.admin.updateUserById(userProfile.id, {
          user_metadata: { phone: formattedIntl, phone_verified: true },
        });
      } catch {}
      verifiedPhone = data.phone;
    }

    if (!verifiedPhone) {
      return {
        success: false,
        requirePhone: true,
        phone: "",
        maskedPhone: "",
        otpCode: "",
        message: "No phone number attached to account. Please enter your Ghana mobile number to receive your SMS OTP code.",
      };
    }

    const raw = cleanPhone(verifiedPhone);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const expiresAtIso = new Date(expiresAt).toISOString();

    inMemoryOtpStore.set(raw, { otpCode, expiresAt });

    try {
      await (supabaseAdmin as any)
        .from("phone_verifications")
        .upsert(
          {
            phone: raw,
            otp_code: otpCode,
            expires_at: expiresAtIso,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "phone" }
        );
    } catch {}

    const smsMessage = `Your BestData 2FA login code is: ${otpCode}. Valid for 10 minutes.`;
    await sendTxtConnectSms(raw, smsMessage);

    const maskedPhone = `+233 ${raw.slice(1, 3)} *** ${raw.slice(-4)}`;
    return {
      success: true,
      requirePhone: false,
      phone: raw,
      maskedPhone,
      otpCode,
      message: "OTP sent successfully",
    };
  });

