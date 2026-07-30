import { createServerFn } from "@tanstack/react-start";

export interface AIRecommendationRequest {
  budgetGhs?: number;
  network?: string;
  usageType?: "light" | "social" | "streaming" | "heavy";
}

export interface RecommendedDeal {
  id: string;
  network: string;
  sizeLabel: string;
  priceGhs: number;
  costPerGb: number;
  validity: string;
  badge: string;
  recommendationReason: string;
  savingsPct?: number;
}

export const getAIRecommendedDeals = createServerFn({ method: "POST" })
  .validator((data: AIRecommendationRequest) => ({
    budgetGhs: Math.max(1, Number(data.budgetGhs) || 20),
    network: (data.network || "ALL").toUpperCase().trim(),
    usageType: data.usageType || "social",
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin.from("bundles").select("*").eq("active", true);
    if (data.network !== "ALL") {
      query = query.ilike("network", `%${data.network}%`);
    }

    const { data: dbBundles } = await query.order("price_ghs");

    const bundles = dbBundles || [];
    if (bundles.length === 0) {
      return { recommendations: [], bestOverall: null };
    }

    const processed = bundles.map((b) => {
      const price = Number(b.price_ghs);
      const sizeGb = (Number(b.size_mb) || 1024) / 1024;
      const costPerGb = Number((price / Math.max(0.1, sizeGb)).toFixed(2));
      return {
        ...b,
        sizeGb,
        costPerGb,
      };
    });

    // Sort by price-per-GB ascending to find best efficiency
    const sortedByEfficiency = [...processed].sort((a, b) => a.costPerGb - b.costPerGb);
    const minCostPerGb = sortedByEfficiency[0]?.costPerGb || 1;

    // Filter bundles within user budget or slightly above budget (up to 1.25x budget)
    const withinBudget = processed.filter((b) => Number(b.price_ghs) <= data.budgetGhs * 1.25);
    const pool = withinBudget.length > 0 ? withinBudget : processed;

    // 1. Best Value Deal (Lowest cost per GB within budget)
    const bestValue = [...pool].sort((a, b) => a.costPerGb - b.costPerGb)[0] || pool[0];

    // 2. Exact Budget Fit (Closest price to budget)
    const budgetFit = [...pool].sort((a, b) => Math.abs(Number(a.price_ghs) - data.budgetGhs) - Math.abs(Number(b.price_ghs) - data.budgetGhs))[0] || pool[0];

    // 3. Max GB Deal (Highest size within budget)
    const maxGb = [...pool].sort((a, b) => b.sizeGb - a.sizeGb)[0] || pool[0];

    const recommendations: RecommendedDeal[] = [];

    if (bestValue) {
      const savings = Math.max(0, Math.round(((minCostPerGb * 2 - bestValue.costPerGb) / (minCostPerGb * 2)) * 100));
      recommendations.push({
        id: bestValue.id,
        network: bestValue.network,
        sizeLabel: bestValue.size_label,
        priceGhs: Number(bestValue.price_ghs),
        costPerGb: bestValue.costPerGb,
        validity: bestValue.validity || "Non-Expiry",
        badge: "AI Top Pick 🏆",
        recommendationReason: `Cheapest cost per GB (GH₵ ${bestValue.costPerGb}/GB). Maximum efficiency for your money.`,
        savingsPct: savings > 5 ? savings : 15,
      });
    }

    if (budgetFit && budgetFit.id !== bestValue?.id) {
      recommendations.push({
        id: budgetFit.id,
        network: budgetFit.network,
        sizeLabel: budgetFit.size_label,
        priceGhs: Number(budgetFit.price_ghs),
        costPerGb: budgetFit.costPerGb,
        validity: budgetFit.validity || "Non-Expiry",
        badge: "Perfect Match 🎯",
        recommendationReason: `Matches your budget of GH₵ ${data.budgetGhs} almost exactly with ${budgetFit.size_label} data.`,
      });
    }

    if (maxGb && !recommendations.some((r) => r.id === maxGb.id)) {
      recommendations.push({
        id: maxGb.id,
        network: maxGb.network,
        sizeLabel: maxGb.size_label,
        priceGhs: Number(maxGb.price_ghs),
        costPerGb: maxGb.costPerGb,
        validity: maxGb.validity || "Non-Expiry",
        badge: "Maximum Data 💥",
        recommendationReason: `Gives you the highest data volume (${maxGb.size_label}) for your targeted spend.`,
      });
    }

    return {
      recommendations,
      bestOverall: recommendations[0] || null,
      targetBudgetGhs: data.budgetGhs,
    };
  });
