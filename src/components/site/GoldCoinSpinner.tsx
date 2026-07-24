import React from "react";

interface GoldCoinSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  className?: string;
}

export function GoldCoinSpinner({ size = "md", label, className = "" }: GoldCoinSpinnerProps) {
  const sizePx = size === "sm" ? 28 : size === "md" ? 44 : size === "lg" ? 64 : 96;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {/* 3D Spinning Gold Coin */}
      <div
        className="relative flex items-center justify-center rounded-full shadow-[0_0_25px_rgba(234,179,8,0.5)] transition-all"
        style={{
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          perspective: "1000px",
        }}
      >
        <div
          className="w-full h-full rounded-full flex items-center justify-center font-black text-amber-950 select-none shadow-inner border-2 border-amber-300 animate-[coinSpin_1.8s_infinite_linear]"
          style={{
            background: "radial-gradient(circle at 30% 30%, #fef08a 0%, #eab308 50%, #854d0e 100%)",
            boxShadow: "0 0 15px rgba(250, 204, 21, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.8), inset 0 -3px 6px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div
            className="w-[78%] h-[78%] rounded-full border border-amber-200/60 flex items-center justify-center font-black tracking-tighter"
            style={{
              fontSize: sizePx < 32 ? "10px" : sizePx < 50 ? "16px" : sizePx < 75 ? "24px" : "36px",
              background: "linear-gradient(135deg, #fef08a 0%, #ca8a04 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))",
            }}
          >
            ₵
          </div>
        </div>
      </div>

      {label && (
        <p className="text-xs font-black tracking-wider uppercase text-amber-400 animate-pulse">
          {label}
        </p>
      )}

      {/* Keyframe animation injected inline */}
      <style>{`
        @keyframes coinSpin {
          0% {
            transform: rotateY(0deg) scale(1);
          }
          50% {
            transform: rotateY(180deg) scale(1.08);
          }
          100% {
            transform: rotateY(360deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
