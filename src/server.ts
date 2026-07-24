import { eventHandler, getRequestURL, getRequestHeaders } from "h3";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function handleRequest(request: Request, env: unknown = {}, ctx: unknown = {}): Promise<Response> {
  try {
    const handler = await getServerEntry();
    const response = await handler.fetch(request, env, ctx);
    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}

export default eventHandler(async (event) => {
  const urlObj = getRequestURL(event);
  let pathname = urlObj.pathname;

  if (pathname.includes("/__server")) {
    pathname = pathname.replace("/__server", "") || "/";
  }

  urlObj.pathname = pathname;
  const fullUrl = urlObj.toString();
  const headers = getRequestHeaders(event) as any;
  const method = event.method || event.node?.req?.method || "GET";

  const req = new Request(fullUrl, {
    method,
    headers,
    body: method !== "GET" && method !== "HEAD" ? (event.node?.req as any) : undefined,
    // @ts-ignore
    duplex: method !== "GET" && method !== "HEAD" ? "half" : undefined,
  });

  return handleRequest(req, {}, event);
});
