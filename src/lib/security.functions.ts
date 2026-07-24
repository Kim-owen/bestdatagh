import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendTxtConnectSms } from "@/lib/otp.functions";

const FAILED_LOGIN_ATTEMPTS = new Map<string, { count: number; expiresAt: number }>();

/**
 * Extract client IP address safely from headers
 */
export function getClientIpAddress(req?: Request): string {
  if (!req) return "127.0.0.1";
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

/**
 * Check & enforce IP brute force protection rate limits
 */
export async function checkIpBruteForceRateLimit(ip: string): Promise<boolean> {
  const record = FAILED_LOGIN_ATTEMPTS.get(ip);
  if (record) {
    if (Date.now() > record.expiresAt) {
      FAILED_LOGIN_ATTEMPTS.delete(ip);
      return true;
    }
    if (record.count >= 5) {
      return false; // Rate limit exceeded (5 attempts / 15 mins)
    }
  }
  return true;
}

/**
 * Record failed login attempt for an IP
 */
export async function recordFailedLoginIp(ip: string) {
  const record = FAILED_LOGIN_ATTEMPTS.get(ip);
  if (record) {
    FAILED_LOGIN_ATTEMPTS.set(ip, {
      count: record.count + 1,
      expiresAt: record.expiresAt,
    });
  } else {
    FAILED_LOGIN_ATTEMPTS.set(ip, {
      count: 1,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes window
    });
  }
}

/**
 * Record user login IP and send SMS Security Alert if new IP address
 */
export const recordLoginIpSecurity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { customIp?: string }) => d || {})
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const req = getRequest();
    const clientIp = getClientIpAddress(req);
    const userAgent = req?.headers.get("user-agent") || "Unknown Device";

    // 1. Fetch user's phone & profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, phone")
      .eq("id", context.userId)
      .maybeSingle();

    // 2. Check if user has logged in from this IP before
    const { data: existingLog } = await (supabaseAdmin as any)
      .from("user_login_logs")
      .select("id")
      .eq("user_id", context.userId)
      .eq("ip_address", clientIp)
      .limit(1)
      .maybeSingle();

    const isNewIp = !existingLog;

    // 3. Save login log to DB
    await (supabaseAdmin as any).from("user_login_logs").insert({
      user_id: context.userId,
      ip_address: clientIp,
      user_agent: userAgent,
      is_new_ip: isNewIp,
    });

    // 4. Send SMS Security Alert if NEW IP Address detected
    if (isNewIp && profile?.phone) {
      const formattedTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const alertMsg = `🛡️ BestData Security Alert: New login detected on your account from IP ${clientIp} at ${formattedTime}. If this wasn't you, reset password immediately.`;
      
      try {
        await sendTxtConnectSms(profile.phone, alertMsg);
      } catch (smsErr: any) {
        console.warn("[IP Security SMS Notice]:", smsErr.message);
      }
    }

    return { ok: true, clientIp, isNewIp };
  });

/**
 * Get recent user login logs for account audit
 */
export const getUserLoginLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: logs } = await (supabaseAdmin as any)
      .from("user_login_logs")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);

    return { logs: logs || [] };
  });
