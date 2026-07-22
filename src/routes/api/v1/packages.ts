import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "content-type": "application/json",
  };
}

export const Route = createFileRoute("/api/v1/packages")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async () => {
        const { data: dbBundles, error } = await supabaseAdmin
          .from("bundles")
          .select("id, network, size_label, size_mb, price_ghs, validity, active")
          .eq("active", true)
          .order("network")
          .order("sort_order");

        const networks = [
          { id: "yello", label: "Yello" },
          { id: "at_ishare", label: "AirtelTigo iShare" },
          { id: "at_bigtime", label: "AirtelTigo Bigtime" },
          { id: "telecel", label: "Telecel" },
        ];

        let packages: any[] = [];

        if (dbBundles && dbBundles.length > 0) {
          packages = dbBundles.map((b) => {
            let netId = "yello";
            let netLabel = "Yello";

            const netLower = (b.network || "").toLowerCase();
            if (netLower.includes("telecel") || netLower.includes("vodafone")) {
              netId = "telecel";
              netLabel = "Telecel";
            } else if (netLower.includes("ishare") || netLower.includes("airteltigo")) {
              netId = "at_ishare";
              netLabel = "AirtelTigo iShare";
            } else if (netLower.includes("bigtime")) {
              netId = "at_bigtime";
              netLabel = "AirtelTigo Bigtime";
            }

            const sizeGb = b.size_mb >= 1024 ? Number((b.size_mb / 1024).toFixed(1)) : Number(b.size_label.replace(/[^\d.]/g, "")) || 1;

            return {
              id: b.id,
              network: netId,
              network_label: netLabel,
              size_gb: sizeGb,
              price: Number(b.price_ghs),
              validity: b.validity || "Non expiry",
            };
          });
        } else {
          // Fallback static package catalog
          packages = [
            { network: "yello", network_label: "Yello", size_gb: 1, price: 4.50, validity: "Non expiry" },
            { network: "yello", network_label: "Yello", size_gb: 2, price: 9.00, validity: "Non expiry" },
            { network: "yello", network_label: "Yello", size_gb: 5, price: 22.50, validity: "Non expiry" },
            { network: "at_ishare", network_label: "AirtelTigo iShare", size_gb: 1, price: 4.00, validity: "Non expiry" },
            { network: "at_ishare", network_label: "AirtelTigo iShare", size_gb: 2, price: 7.50, validity: "Non expiry" },
            { network: "at_bigtime", network_label: "AirtelTigo Bigtime", size_gb: 1.5, price: 5.00, validity: "Non expiry" },
            { network: "telecel", network_label: "Telecel", size_gb: 1, price: 4.20, validity: "Non expiry" },
            { network: "telecel", network_label: "Telecel", size_gb: 3, price: 12.00, validity: "Non expiry" },
          ];
        }

        return new Response(
          JSON.stringify({
            success: true,
            networks,
            packages,
          }),
          { status: 200, headers: corsHeaders() }
        );
      },
    },
  },
});
