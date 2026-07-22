import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function Placeholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-24 text-center">
        <div className="eyebrow mb-3">Preview</div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-4 text-muted-foreground">
          {description ?? "This feature isn't connected in the frontend demo. Come back soon."}
        </p>
        <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 h-10 text-sm font-bold text-primary-foreground">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
