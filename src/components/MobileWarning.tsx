import { useEffect, useState } from "react";
import { Monitor, X } from "lucide-react";

const STORAGE_KEY = "cadence:mobile-warning-dismissed";

export function MobileWarning() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isMobile || dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/95 p-6 text-center">
      <div className="max-w-sm space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
          <Monitor className="h-6 w-6 text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Best viewed on desktop</h2>
        <p className="text-sm text-slate-300">
          Cadence is an enterprise performance management tool optimized for desktop.
          For the best experience, please open on a larger screen.
        </p>
        <button
          onClick={handleDismiss}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          <X className="h-4 w-4" />
          Continue anyway
        </button>
      </div>
    </div>
  );
}
