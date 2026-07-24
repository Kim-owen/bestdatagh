<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

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
   - Avoid throwing raw exceptions for expected user flows; return `{ success: false, error: "..." }` to avoid HTTP 500 console errors.

4. **Inbuilt Automated Self-Healing System**:
   - Managed via `src/lib/self-healing.ts`.
   - Auto-checks database health, package availability, and API provider connectivity. Re-populates packages automatically if `bundles` table is empty.
