"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

const IDLE_LIMIT_MS = 15 * 60 * 1000;

export function IdleLogout() {
  useEffect(() => {
    let timer = window.setTimeout(() => signOut({ callbackUrl: "/login" }), IDLE_LIMIT_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => signOut({ callbackUrl: "/login" }), IDLE_LIMIT_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, []);

  return null;
}
