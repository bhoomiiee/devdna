"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl p-8 border border-white/5 max-w-md text-center">
        <h2 className="text-white text-xl font-bold mb-3">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-6">{error.message}</p>
        <button onClick={reset}
          className="bg-brand hover:bg-brand-dark text-white px-6 py-2.5 rounded-xl text-sm">
          Try again
        </button>
        <a href="/" className="block text-slate-500 hover:text-white text-sm mt-3">← Go home</a>
      </div>
    </div>
  );
}
