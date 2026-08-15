import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`group flex items-center gap-3 ${className}`}>
      <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-primary/40 bg-navy p-0.5 shadow-[0_4px_20px_-4px_hsl(243_75%_59%/0.5)] transition-transform duration-300 group-hover:scale-105">
        <img src="/logo.png" alt="GigMart Logo" className="h-full w-full rounded-xl object-cover" />
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-background animate-pulse" />
      </div>
      <div className="flex flex-col">
        <span className="font-display text-xl font-black leading-none tracking-tight text-foreground transition-colors group-hover:text-primary">
          GigMart
          <span className="gold-gradient ml-1 rounded-md px-1 py-0.5 text-[10px] font-black text-primary-foreground">
            GH
          </span>
        </span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-widest leading-none text-primary">
          Connecting Ghana&apos;s Digital Future
        </span>
      </div>
    </Link>
  );
}
