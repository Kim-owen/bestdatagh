import { createFileRoute } from "@tanstack/react-router";

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "content-type": "application/json",
  };
}

export const Route = createFileRoute("/api/v1/health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async () => {
        return new Response(
          JSON.stringify({
            success: true,
            status: "operational",
            timestamp: new Date().toISOString(),
            networks: ["yello", "at_ishare", "at_bigtime", "telecel"],
          }),
          { status: 200, headers: corsHeaders() }
        );
      },
    },
  },
});
