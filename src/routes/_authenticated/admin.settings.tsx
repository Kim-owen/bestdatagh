import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGetSiteSettings, adminSaveSiteSettings } from "@/lib/admin.functions";
import { useState, useEffect } from "react";
import { Settings, ShieldCheck, Key, Phone, Mail, CreditCard, ToggleLeft, ToggleRight, Save, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const getSettings = useServerFn(adminGetSiteSettings);
  const saveSettings = useServerFn(adminSaveSiteSettings);

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
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

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
          <h2 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <Key className="h-4 w-4" /> Gateway Credentials (API Keys)
          </h2>

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
