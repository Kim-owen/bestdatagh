import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, ExternalLink, Sparkles, Send } from "lucide-react";

export function FloatingWhatsApp() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  // Default initial position at bottom-right
  useEffect(() => {
    const saved = sessionStorage.getItem("wa_float_pos");
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
        return;
      } catch {}
    }
    // Initial position 24px from bottom right
    const initialX = window.innerWidth - 80;
    const initialY = window.innerHeight - 90;
    setPosition({ x: Math.max(16, initialX), y: Math.max(16, initialY) });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isOpen) return;
    setIsDragging(false);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position?.x || window.innerWidth - 80,
      initialY: position?.y || window.innerHeight - 90,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setIsDragging(true);
      }
      const newX = Math.min(window.innerWidth - 70, Math.max(16, dragRef.current.initialX + dx));
      const newY = Math.min(window.innerHeight - 70, Math.max(16, dragRef.current.initialY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (position) {
        sessionStorage.setItem("wa_float_pos", JSON.stringify(position));
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isOpen) return;
    setIsDragging(false);
    const touch = e.touches[0];
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: position?.x || window.innerWidth - 80,
      initialY: position?.y || window.innerHeight - 90,
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const touch = moveEvent.touches[0];
      const dx = touch.clientX - dragRef.current.startX;
      const dy = touch.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setIsDragging(true);
      }
      const newX = Math.min(window.innerWidth - 70, Math.max(16, dragRef.current.initialX + dx));
      const newY = Math.min(window.innerHeight - 70, Math.max(16, dragRef.current.initialY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      if (position) {
        sessionStorage.setItem("wa_float_pos", JSON.stringify(position));
      }
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsOpen(!isOpen);
  };

  if (!position) return null;

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-50 select-none touch-none transition-shadow"
    >
      {/* WhatsApp Quick Popup Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-72 sm:w-80 rounded-3xl border border-emerald-500/30 bg-slate-950/95 p-5 backdrop-blur-2xl shadow-2xl text-white animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black font-display text-white">BestData WhatsApp Support</h4>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Online 24/7
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-300 leading-relaxed">
            Need help with your data order or package inquiries? Chat directly with our automated support team!
          </p>

          <div className="mt-4 space-y-2">
            <a
              href="https://wa.me/233598762747?text=Hello%20BestData%20Support!%20I%20need%20assistance%20with%20data%20bundles."
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-xs font-extrabold text-white shadow-lg transition-all"
            >
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" /> Chat Directly on WhatsApp
              </span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>

            <a
              href="https://whatsapp.com/channel/0029Vb87LlELdQebZ0K7n51E"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 transition-all"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Join Official Updates Channel
              </span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
          </div>
        </div>
      )}

      {/* Floating Movable Button Handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        className="group relative cursor-grab active:cursor-grabbing"
      >
        <div className="absolute -inset-1.5 rounded-full bg-emerald-500/30 blur-md group-hover:bg-emerald-500/50 transition-all" />
        <button
          type="button"
          aria-label="WhatsApp Support"
          className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ring-4 ${
            isOpen ? "ring-white/40 bg-slate-900" : "ring-emerald-500/40"
          }`}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <>
              <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <MessageCircle className="relative h-7 w-7 fill-white text-emerald-500 stroke-[1.5]" />
            </>
          )}
        </button>

        {/* Hover / Movable Tooltip Badge */}
        {!isOpen && (
          <div className="absolute right-16 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-slate-950/90 px-3 py-1.5 text-[11px] font-black text-emerald-400 shadow-xl backdrop-blur-md whitespace-nowrap pointer-events-none">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Chat Support (Drag Me)</span>
          </div>
        )}
      </div>
    </div>
  );
}
