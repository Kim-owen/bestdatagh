import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`}>
      <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-amber-400/10 border border-amber-400/30 p-1 shadow-md group-hover:scale-105 transition-all">
        <img
          src="/logo.png"
          alt="BestData GH Logo"
          className="h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(234,179,8,0.5)]"
        />
      </div>

      <div className="flex flex-col">
        <span className="text-base font-black tracking-tight font-display text-foreground group-hover:text-amber-400 transition-colors">
          BESTDATA<span className="text-amber-400 font-extrabold ml-1">GH</span>
        </span>
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground -mt-1">
          Wholesale Data Hub
        </span>
      </div>
    </Link>
  );
}
