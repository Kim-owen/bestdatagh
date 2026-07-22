import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { POSTS, type Post } from "./blog";
import { Reviews } from "@/components/site/Reviews";
import { ArrowLeft, ArrowRight, Calendar, Clock } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = POSTS.find((p) => p.slug === params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData, params }) => {
    const title = loaderData?.post.title ?? "Article";
    const desc = loaderData?.post.excerpt ?? "Read on the Bestdata blog.";
    const category = loaderData?.post.category;
    const date = loaderData?.post.date;
    return {
      meta: [
        { title: `${title} — Bestdata` },
        { name: "description", content: desc },
        ...(category ? [{ name: "keywords", content: `${category}, Ghana data bundles, Bestdata, Mobile Money` }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:site_name", content: "Bestdata" },
        { property: "og:url", content: `/blog/${params.slug}` },
        ...(date ? [{ property: "article:published_time", content: date }] : []),
        ...(category ? [{ property: "article:section", content: category }] : []),
        { property: "article:author", content: "Bestdata" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: `/blog/${params.slug}` }],
      scripts: loaderData ? [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: title,
          description: desc,
          datePublished: date,
          articleSection: category,
          author: { "@type": "Organization", name: "Bestdata" },
          publisher: { "@type": "Organization", name: "Bestdata" },
          mainEntityOfPage: { "@type": "WebPage", "@id": `/blog/${params.slug}` },
        }),
      }] : [],
    };
  },
  component: BlogPost,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-extrabold">Article not found</h1>
        <p className="mt-3 text-muted-foreground">The article you're looking for doesn't exist.</p>
        <Link to="/blog" className="mt-6 inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 h-10 text-sm font-bold text-primary-foreground"><ArrowLeft className="h-4 w-4" /> Back to blog</Link>
      </main>
      <Footer />
    </div>
  ),
});

function BlogPost() {
  const { post } = Route.useLoaderData() as { post: Post };
  const others = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12 md:py-20">
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> All articles</Link>

          <span className="mt-6 inline-block rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{post.category}</span>
          <h1 className="mt-4 text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {post.date}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {post.readMinutes} min read</span>
          </div>

          <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-foreground/90">
            <p className="text-lg text-foreground">{post.excerpt}</p>
            {post.body.map((block, i) => (
              <div key={i} className="space-y-3">
                {block.heading && <h2 className="mt-6 text-xl font-bold text-foreground">{block.heading}</h2>}
                {block.paragraphs?.map((p, j) => <p key={j}>{p}</p>)}
                {block.list && (
                  <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                    {block.list.map((li, j) => <li key={j}>{li}</li>)}
                  </ul>
                )}
                {block.ordered && (
                  <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
                    {block.ordered.map((li, j) => <li key={j}>{li}</li>)}
                  </ol>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
            <div className="text-sm font-bold">Ready to top up?</div>
            <p className="mt-1 text-sm text-muted-foreground">Buy cheap MTN, Telecel and AirtelTigo data bundles now.</p>
            <Link to="/buy-data" search={{ network: "MTN" }} className="mt-4 inline-flex items-center gap-2 rounded-2xl gold-gradient px-5 h-10 text-sm font-bold text-primary-foreground shadow-[var(--shadow-gold)]">
              Buy data now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>

        <section className="border-t border-border bg-card">
          <Reviews
            targetType="blog"
            targetId={post.slug}
            heading="Reader reviews"
            subheading="Was this article helpful? Leave a review or share your own experience."
          />
        </section>

        <section className="border-t border-border py-12">
          <div className="mx-auto max-w-[1152px] px-4 sm:px-6">
            <h2 className="text-xl font-bold">Keep reading</h2>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              {others.map((p) => (
                <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="group rounded-2xl border border-border bg-background p-5 hover:-translate-y-1 hover:shadow-[var(--shadow-hover)] transition-all">
                  <span className="inline-block rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{p.category}</span>
                  <h3 className="mt-3 text-base font-bold leading-snug line-clamp-2 group-hover:text-primary">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
