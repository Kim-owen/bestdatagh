import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGetSiteSettings, adminSaveSiteSettings, adminVerifyProviderGateway } from "@/lib/admin.functions";
import { useState, useEffect } from "react";
import { Settings, ShieldCheck, Key, Phone, Mail, CreditCard, ToggleLeft, ToggleRight, Save, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const getSettings = useServerFn(adminGetSiteSettings);
  const saveSettings = useServerFn(adminSaveSiteSettings);
  const verifyGatewayFn = useServerFn(adminVerifyProviderGateway);

  const { data, isLoading } = useQuery({
    queryKey: ["adminSettings"],
    queryFn: () => getSettings(),
  });

  const [form, setForm] = useState<Record<string, string>>({
    site_name: "BestData Ghana",
    support_phone: "0551234567",
    support_email: "support@bestdata.gh",
    momo_agent_number: "0240000000",
    momo_agent_name: "BestData Financials",
    maintenance_mode: "false",
    paystack_secret_key: "",
    txtconnect_api_key: "",
    txtconnect_sender_id: "BestData",
    checker_price_waec: "18.00",
    checker_price_bece: "18.00",
    daily_sms_whatsapp_link: "https://whatsapp.com/channel/0029Vb87LlELdQebZ0K7n51E",
    daily_sms_site_url: "https://bestdatagh.shop",
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  const handleVerifyGateway = async () => {
    setIsVerifying(true);
    setVerifyNotice(null);
    try {
      const res = await verifyGatewayFn();
      if (res.ok) {
        setVerifyNotice(
          `✓ Provider Gateway Check (${res.totalTimeMs}ms): DataMart Balance: GH₵ ${(res.dataMart?.balance ?? 0).toFixed(2)} (${res.dataMart?.message}) | SwiftData Balance: GH₵ ${(res.swiftData?.balance ?? 0).toFixed(2)} (${res.swiftData?.message})`
        );
      } else {
        setVerifyNotice(`Gateway verification failed: ${(res as any).message || "Unknown error"}`);
      }
    } catch (err: any) {
      setVerifyNotice(`Verification error: ${err.message || err}`);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setForm((prev) => ({ ...prev, ...data }));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, string>) => saveSettings({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" /> Site & Gateway Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure system parameters, gateway credentials, support lines, and maintenance controls.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4" /> Settings Saved!
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: General Site Info */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> General Site Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-foreground block mb-1">Site Title</label>
              <input
                type="text"
                value={form.site_name || ""}
                onChange={(e) => setForm({ ...form, site_name: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-foreground block mb-1">Support Email</label>
              <input
                type="email"
                value={form.support_email || ""}
                onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-foreground block mb-1">Support Phone / WhatsApp</label>
              <input
                type="text"
                value={form.support_phone || ""}
                onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-foreground block mb-1">WhatsApp Channel Link</label>
              <input
                type="text"
                value={form.daily_sms_whatsapp_link || ""}
                onChange={(e) => setForm({ ...form, daily_sms_whatsapp_link: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-primary outline-none"
                placeholder="https://chat.whatsapp.com/..."
              />
            </div>
            <div>
              <label className="font-bold text-foreground block mb-1">Public Site URL</label>
              <input
                type="text"
                value={form.daily_sms_site_url || ""}
                onChange={(e) => setForm({ ...form, daily_sms_site_url: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-primary outline-none"
                placeholder="https://bestdatagh.shop"
              />
            </div>
            <div>
              <label className="font-bold text-foreground block mb-1">Maintenance Mode</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, maintenance_mode: form.maintenance_mode === "true" ? "false" : "true" })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  form.maintenance_mode === "true"
                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                }`}
              >
                {form.maintenance_mode === "true" ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                {form.maintenance_mode === "true" ? "ENABLED (Site Offline)" : "DISABLED (Site Active)"}
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: MoMo Agent Deposit Account */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Agent Wallet Deposit Info
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-foreground block mb-1">Deposit MoMo Number</label>
              <input
                type="text"
                value={form.momo_agent_number || ""}
                onChange={(e) => setForm({ ...form, momo_agent_number: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-foreground block mb-1">MoMo Account Name</label>
              <input
                type="text"
                value={form.momo_agent_name || ""}
                onChange={(e) => setForm({ ...form, momo_agent_name: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Payment & SMS Gateway Credentials */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
              <Key className="h-4 w-4" /> Gateway Credentials (API Keys)
            </h2>
            <button
              type="button"
              onClick={handleVerifyGateway}
              disabled={isVerifying}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 text-xs font-bold transition-all disabled:opacity-50"
            >
              <ShieldCheck className={`h-3.5 w-3.5 ${isVerifying ? "animate-spin" : ""}`} />
              <span>{isVerifying ? "Verifying..." : "Verify Gateways"}</span>
            </button>
          </div>

          {verifyNotice && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{verifyNotice}</span>
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-foreground block mb-1">Paystack Secret Key</label>
              <input
                type="password"
                value={form.paystack_secret_key || ""}
                onChange={(e) => setForm({ ...form, paystack_secret_key: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-primary outline-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Used for payment verification and automated agent withdrawals.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-foreground block mb-1">TxtConnect SMS API Key</label>
                <input
                  type="password"
                  value={form.txtconnect_api_key || ""}
                  onChange={(e) => setForm({ ...form, txtconnect_api_key: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-foreground block mb-1">TxtConnect Sender ID</label>
                <input
                  type="text"
                  value={form.txtconnect_sender_id || ""}
                  onChange={(e) => setForm({ ...form, txtconnect_sender_id: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Result Checker Prices Configuration */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Result Checker Card Prices (WAEC & BECE)
          </h2>
          <p className="text-xs text-muted-foreground">
            Set customer sale prices for WAEC/WASSCE and BECE Result Checker Cards sold on the <span className="font-bold text-foreground">/checkers</span> page.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-foreground block mb-1">WAEC / WASSCE Card Price (GH₵)</label>
              <input
                type="number"
                step="0.10"
                min="1"
                value={form.checker_price_waec || "18.00"}
                onChange={(e) => setForm({ ...form, checker_price_waec: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-foreground block mb-1">BECE Card Price (GH₵)</label>
              <input
                type="number"
                step="0.10"
                min="1"
                value={form.checker_price_bece || "18.00"}
                onChange={(e) => setForm({ ...form, checker_price_bece: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 rounded-2xl gold-gradient px-6 py-3 text-xs font-black text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving Settings…" : "Save Site Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
