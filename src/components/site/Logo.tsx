import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`}>
      <div className="relative overflow-hidden grid h-10 w-10 place-items-center rounded-2xl bg-white p-0.5 border border-emerald-500/30 shadow-md group-hover:scale-105 transition-all">
        <img
          src="/logo.png"
          alt="BestData GH Logo"
          className="h-full w-full object-contain"
        />
      </div>

      <div className="flex flex-col">
        <span className="text-base font-black tracking-tight font-display text-foreground group-hover:text-emerald-500 transition-colors">
          BestData<span className="bg-amber-400 text-slate-950 px-1 py-0.5 rounded-md text-xs font-black ml-1">GH</span>
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground -mt-0.5">
          Connecting Ghana's Digital Future
        </span>
      </div>
    </Link>
  );
}
