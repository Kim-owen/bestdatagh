import React from "react";

export type NetworkName = "MTN" | "Telecel" | "AirtelTigo" | "AT";

export function MtnLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="65" cy="35" rx="58" ry="30" stroke="#FFCC00" strokeWidth="8" fill="#FFCC00" fillOpacity="0.08" />
      <text x="65" y="44" textAnchor="middle" fill="#FFCC00" fontFamily="Sora, sans-serif" fontWeight="900" fontSize="26" letterSpacing="1">MTN</text>
    </svg>
  );
}

export function TelecelLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="38" r="32" fill="#E61C24" />
      <text x="50" y="50" textAnchor="middle" fill="#FFFFFF" fontFamily="Manrope, sans-serif" fontWeight="900" fontSize="36">t</text>
      <text x="50" y="90" textAnchor="middle" fill="#E61C24" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="19" letterSpacing="-0.5">telecel</text>
    </svg>
  );
}

export function AtLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="32" y="65" textAnchor="middle" fill="#ED1C24" fontFamily="Sora, sans-serif" fontWeight="900" fontSize="62">a</text>
      <text x="75" y="65" textAnchor="middle" fill="#1C3F7C" fontFamily="Sora, sans-serif" fontWeight="900" fontSize="62">t</text>
      <text x="55" y="88" textAnchor="middle" fill="currentColor" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="11" fontStyle="italic">life is simple</text>
    </svg>
  );
}

export function NetworkLogo({ network, className = "h-8 w-8" }: { network: string; className?: string }) {
  const n = (network || "").toLowerCase();
  if (n.includes("mtn")) return <MtnLogo className={className} />;
  if (n.includes("telecel")) return <TelecelLogo className={className} />;
  return <AtLogo className={className} />;
}
