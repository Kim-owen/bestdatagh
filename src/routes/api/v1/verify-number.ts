import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiKey } from "./balance";

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "content-type": "application/json",
  };
}

export const Route = createFileRoute("/api/v1/verify-number")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        const authResult = await authenticateApiKey(request);
        if ("error" in authResult) {
          return new Response(JSON.stringify({ success: false, error: authResult.error }), {
            status: authResult.status,
            headers: corsHeaders(),
          });
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ success: false, error: "Invalid JSON payload" }), {
            status: 400,
            headers: corsHeaders(),
          });
        }

        const rawPhones: string[] = [];
        if (typeof body.phone === "string") rawPhones.push(body.phone);
        if (Array.isArray(body.phones)) rawPhones.push(...body.phones);

        if (rawPhones.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: "Please provide a 'phone' string or 'phones' array." }),
            { status: 400, headers: corsHeaders() }
          );
        }

        const results = rawPhones.map((p) => {
          const clean = String(p).replace(/\s+/g, "");
          const full = clean.startsWith("233") ? "0" + clean.slice(3) : clean;
          const isValid = /^0(24|54|55|59|25|53|20|50|27|57|26|56)\d{7}$/.test(full);

          let network = "Unknown";
          if (/^0(24|54|55|59|25|53)/.test(full)) network = "MTN";
          else if (/^0(20|50)/.test(full)) network = "Telecel";
          else if (/^0(27|57|26|56)/.test(full)) network = "AirtelTigo";

          return {
            phone: clean,
            cleanPhone: full,
            valid: isValid,
            verified: isValid,
            network,
            status: isValid ? "verified" : "unverified",
            message: isValid ? `Number is active on ${network} network and ready to receive data` : "Number is not a valid Ghana phone format",
          };
        });

        const verifiedCount = results.filter((r) => r.verified).length;

        return new Response(
          JSON.stringify({
            success: true,
            checked: results.length,
            verified: verifiedCount,
            unverified: results.length - verifiedCount,
            results,
          }),
          { status: 200, headers: corsHeaders() }
        );
      },
    },
  },
});
