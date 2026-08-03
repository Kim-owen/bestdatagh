import { useState, useRef, useEffect } from "react";

export function FloatingWhatsApp() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  const CHANNEL_LINK = "https://whatsapp.com/channel/0029Vb87LlELdQebZ0K7n51E";

  useEffect(() => {
    const saved = sessionStorage.getItem("wa_float_pos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          // Clamp to current screen bounds
          const clampedX = Math.min(window.innerWidth - 70, Math.max(16, parsed.x));
          const clampedY = Math.min(window.innerHeight - 70, Math.max(16, parsed.y));
          setPosition({ x: clampedX, y: clampedY });
        }
      } catch {}
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(false);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position?.x ?? rect.left,
      initialY: position?.y ?? rect.top,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setIsDragging(true);
      }
      const newX = Math.min(window.innerWidth - 70, Math.max(12, dragRef.current.initialX + dx));
      const newY = Math.min(window.innerHeight - 70, Math.max(12, dragRef.current.initialY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(false);
    const touch = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: position?.x ?? rect.left,
      initialY: position?.y ?? rect.top,
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const touch = moveEvent.touches[0];
      const dx = touch.clientX - dragRef.current.startX;
      const dy = touch.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        setIsDragging(true);
      }
      const newX = Math.min(window.innerWidth - 70, Math.max(12, dragRef.current.initialX + dx));
      const newY = Math.min(window.innerHeight - 70, Math.max(12, dragRef.current.initialY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    window.open(CHANNEL_LINK, "_blank", "noopener,noreferrer");
  };

  // Determine inline position styles vs default fixed position
  const containerStyle: React.CSSProperties = position
    ? { left: `${position.x}px`, top: `${position.y}px` }
    : {};

  const containerClass = position
    ? "fixed z-[9999] select-none pointer-events-auto"
    : "fixed bottom-6 right-5 z-[9999] select-none pointer-events-auto";

  return (
    <div style={containerStyle} className={containerClass}>
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        className="group relative cursor-grab active:cursor-grabbing touch-none"
      >
        {/* Glowing backdrop pulse */}
        <div className="absolute -inset-1 rounded-full bg-[#25D366]/40 blur-md group-hover:bg-[#25D366]/70 transition-all animate-pulse" />

        {/* WhatsApp Official Floating Button Handle */}
        <button
          type="button"
          aria-label="Join Official WhatsApp Channel"
          title="Join Official WhatsApp Channel"
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ring-4 ring-emerald-500/30"
        >
          <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 animate-ping" />
          
          {/* Official WhatsApp Logo SVG */}
          <svg className="relative h-8 w-8 fill-white drop-shadow-md" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.572-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.854 0-3.676-.499-5.269-1.442l-.378-.225-3.916 1.027 1.045-3.819-.247-.393A9.833 9.833 0 012.2 12.043c0-5.432 4.42-9.851 9.853-9.851 2.63 0 5.102 1.024 6.96 2.883a9.78 9.78 0 012.88 6.961c0 5.433-4.422 9.853-9.842 9.853m0-18.001C6.273 3.842 1.66 8.455 1.66 14.043c0 1.956.559 3.864 1.619 5.513l-1.719 6.277 6.425-1.685a10.158 10.158 0 005.487 1.574h.004c5.58 0 10.192-4.613 10.194-10.201.001-2.722-1.056-5.281-2.981-7.205A10.125 10.125 0 0012.051 3.842" />
          </svg>
        </button>

        {/* Desktop Tooltip Badge */}
        <div className="absolute right-16 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-slate-950/95 px-3.5 py-1.5 text-[11px] font-black text-emerald-400 shadow-xl backdrop-blur-md whitespace-nowrap pointer-events-none">
          <span className="h-2 w-2 rounded-full bg-[#25D366] animate-ping" />
          <span>Join WhatsApp Channel</span>
        </div>
      </div>
    </div>
  );
}
