import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reviews } from "@/components/site/Reviews";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Customer Reviews — Bestdata" },
      { name: "description", content: "Read real customer reviews about Bestdata — Ghana's cheapest MTN, Telecel and AirtelTigo data bundles. Share your own experience." },
      { property: "og:title", content: "Customer Reviews — Bestdata" },
      { property: "og:description", content: "Read what customers say about Bestdata and share your own experience." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/reviews" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Customer Reviews — Bestdata" },
      { name: "twitter:description", content: "Read what customers say about Bestdata and share your own experience." },
    ],
    links: [{ rel: "canonical", href: "/reviews" }],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-[1152px] px-4 sm:px-6 py-12 md:py-16">
            <div className="max-w-2xl">
              <div className="eyebrow mb-3">What customers say</div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Bestdata customer reviews</h1>
              <p className="mt-3 text-muted-foreground">
                Thousands of Ghanaians top up MTN, Telecel and AirtelTigo bundles on Bestdata every week. Read their experiences below — and leave your own review, it takes 20 seconds and no login.
              </p>
            </div>
          </div>
        </section>
        <Reviews targetType="site" targetId="site" heading="Site-wide reviews" subheading="Real, unmoderated feedback from Bestdata customers." />
      </main>
      <Footer />
    </div>
  );
}
