import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { NetworksSection, WhySection, ResultCheckersBanner, FreeAccountSection, InfoSection, BlogSection, SupportCTA } from "@/components/site/Sections";
import { FaqSection } from "@/components/site/Faq";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <NetworksSection />
        <ResultCheckersBanner />
        <WhySection />
        <FreeAccountSection />
        <InfoSection />
        <BlogSection />
        <FaqSection />
        <SupportCTA />
      </main>
      <Footer />
    </div>
  );
}
