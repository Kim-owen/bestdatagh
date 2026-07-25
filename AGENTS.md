## Project Architecture & Self-Healing Rules

1. **Supabase Database Project**:
   - **Project URL**: `https://vtdccqchhsbujknbpqku.supabase.co`
   - **Service Role JWT**: Always use the valid JWT starting with `eyJhbGci...` for server-side admin functions. Never fallback to `sb_publishable_...` for admin operations.
   - Do NOT let `process.env.SUPABASE_URL` override the Bestdata project URL if it points to `ihrvvniomtoofrjkmalb.supabase.co`.

2. **SwiftData API Gateway**:
   - **Base URL**: `https://ihrvvniomtoofrjkmalb.supabase.co/functions/v1/api`
   - **API Key**: `SWIFTDATA_API_KEY` (`sk_live_...`)
   - **Supported Networks**: `yello` (MTN), `telecel` (Telecel), `at_ishare` (AirtelTigo iShare), `at_bigtime` (AirtelTigo Bigtime).

3. **TanStack Start & Server Functions**:
   - Always import `createClient` explicitly from `@supabase/supabase-js` in server functions.
   - **CRITICAL RPC BINDING RULE**: ALL server functions imported from `*.functions.ts` inside `.tsx` route/UI components MUST be bound using `const fnName = useServerFn(serverFunction)` before invocation. NEVER invoke imported server functions directly as `serverFunction({ data: ... })` inside `useEffect` or event handlers.
   - Avoid throwing raw exceptions for expected user flows; return `{ success: false, error: "..." }` to avoid HTTP 500 console errors.

4. **Supabase Admin Client Isolation**:
   - Never cache `supabaseAdmin` as a static module-level singleton instance (`let _supabaseAdmin`). Always instantiate a clean client instance directly targeting `https://vtdccqchhsbujknbpqku.supabase.co` with the hardcoded Service Role JWT (`eyJhbGci...`) on every property access to eliminate cold-start environment variable pollution.

5. **Vercel Browser Cache Revalidation**:
   - `vercel.json` includes `Cache-Control: public, max-age=0, must-revalidate` for `/(.*)` routes to force browsers to fetch the newest JS bundle hashes on every page load.

6. **Inbuilt Automated Self-Healing System**:
   - Managed via `src/lib/self-healing.ts`.
   - Auto-checks database health, package availability, and API provider connectivity. Re-populates packages automatically if `bundles` table is empty.
