import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes Inactivity Timeout

export function InactivityTimer() {
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!user) return;

    let timer: any = null;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        console.warn("[Banking Inactivity Timeout]: Auto logging out idle session for user security.");
        signOut();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [user, signOut]);

  return null;
}
