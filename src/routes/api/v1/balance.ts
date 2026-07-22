import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "content-type": "application/json",
  };
}

export async function authenticateApiKey(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { error: "Missing or invalid API key", status: 401 };
  }

  const key_hash = createHash("sha256").update(token).digest("hex");
  const { data: keyRow, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, active")
    .eq("key_hash", key_hash)
    .maybeSingle();

  if (error || !keyRow || !keyRow.active) {
    return { error: "Invalid or revoked API key", status: 401 };
  }

  return { keyRow, token };
}

export const Route = createFileRoute("/api/v1/balance")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ request }) => {
        const authResult = await authenticateApiKey(request);
        if ("error" in authResult) {
          return new Response(JSON.stringify({ success: false, error: authResult.error }), {
            status: authResult.status,
            headers: corsHeaders(),
          });
        }

        // Calculate API balance (e.g. 150.00 GHS default or from profile)
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name, created_at")
          .eq("user_id", authResult.keyRow.user_id)
          .maybeSingle();

        // Query total orders value to compute balance
        const { data: orders } = await supabaseAdmin
          .from("orders")
          .select("total_ghs, status")
          .eq("user_id", authResult.keyRow.user_id)
          .eq("status", "paid");

        const spent = (orders || []).reduce((sum, o) => sum + Number(o.total_ghs || 0), 0);
        const initialCredit = 200.0;
        const currentBalance = Math.max(0, Number((initialCredit - spent).toFixed(2)));

        return new Response(
          JSON.stringify({
            success: true,
            balance: currentBalance,
            currency: "GHS",
          }),
          { status: 200, headers: corsHeaders() }
        );
      },
    },
  },
});
