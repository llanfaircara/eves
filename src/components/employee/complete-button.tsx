"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

export default function CompleteButton({
  onComplete,
  disabled,
}: {
  onComplete: () => Promise<void> | void;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "flying" | "done">("idle");

  async function handleClick() {
    if (phase !== "idle" || disabled) return;
    setPhase("flying");
    // Play satisfying sequence: button scales, check flies in, confetti bursts
    setTimeout(async () => {
      try {
        await onComplete();
        setPhase("done");
        setTimeout(() => setPhase("idle"), 2200);
      } catch {
        setPhase("idle");
      }
    }, 650);
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || phase !== "idle"}
      className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
        phase === "done"
          ? "border-green-300 bg-green-50 text-green-700"
          : phase === "flying"
            ? "border-orange-300 bg-orange-50 text-orange-700"
            : "border-green-300 bg-white text-green-700 hover:bg-green-50 hover:border-green-400 hover:shadow-md"
      }`}
    >
      {/* Background shimmer when idle */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-green-100/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Confetti burst on flying/done */}
      {phase !== "idle" && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="absolute animate-[confetti_800ms_ease-out_forwards] text-xs"
              style={{
                left: `${12 + i * 11}%`,
                top: "50%",
                animationDelay: `${i * 40}ms`,
                // CSS keyframes defined below via style tag
              }}
            >
              {["🎉", "✨", "✅", "🌟", "💚", "🎊", "⭐", "✨"][i]}
            </span>
          ))}
        </span>
      )}

      <span className={`flex items-center gap-2 transition-transform ${phase === "flying" ? "scale-110" : phase === "done" ? "scale-100" : ""}`}>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${phase === "done" ? "border-green-500 bg-green-500 text-white scale-110" : phase === "flying" ? "border-orange-400 bg-orange-400 text-white scale-110 animate-spin" : "border-green-500 bg-green-50 text-green-600"}`}
        >
          {phase === "done" ? <Check className="h-4 w-4 animate-[pop_300ms_ease_out]" /> : phase === "flying" ? <Sparkles className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </span>
        <span>
          {phase === "idle" && "Mark as Finished"}
          {phase === "flying" && "Sending for approval..."}
          {phase === "done" && "Sent! Awaiting approval"}
        </span>
      </span>

      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(-60px) rotate(180deg) scale(0.5); opacity: 0; }
        }
        @keyframes pop {
          0% { transform: scale(0.5); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </button>
  );
}
