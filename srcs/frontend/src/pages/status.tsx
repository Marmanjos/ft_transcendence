import { useHealthCheck } from "@workspace/api-client-react";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function Status() {
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const lastErrorRef = useRef<any>(null);

  const { data: health, isLoading, error } = useHealthCheck({
    query: {
      refetchInterval: 5000,
    },
    request: {
      signal: AbortSignal.timeout(10000),
    },
  });

  const isHealthy = health?.status === "ok";

  useEffect(() => {
    if (error) {
      if (lastErrorRef.current !== error) {
        setConsecutiveFailures(prev => Math.min(prev + 1, 2));
        lastErrorRef.current = error;
      }
    } else {
      setConsecutiveFailures(0);
      lastErrorRef.current = null;
    }
  }, [error]);

  const isDown = consecutiveFailures >= 2;

  return (
    <div className="max-w-2xl mx-auto space-y-8 min-h-screen flex flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black uppercase tracking-widest text-secondary neon-text-secondary">
          System Status
        </h1>
        <p className="text-muted-foreground font-mono">Backend health and availability check</p>
      </div>

      <div className="w-full max-w-md">
        {isLoading && consecutiveFailures === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 border border-border rounded-xl bg-card/40">
            <Loader className="w-12 h-12 text-secondary animate-spin" />
            <p className="text-muted-foreground font-mono">Checking system health...</p>
          </div>
        ) : isDown ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 border border-red-500/50 rounded-xl bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <div className="text-center">
              <p className="text-red-400 font-bold font-mono uppercase text-2xl">Down</p>
              <p className="text-red-300/70 text-sm font-mono mt-2">Backend is unreachable</p>
              <p className="text-red-300/50 text-xs font-mono mt-3">Checking every 5 seconds...</p>
            </div>
          </div>
        ) : isHealthy ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 border border-green-500/50 rounded-xl bg-green-950/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <div className="text-center">
              <p className="text-green-400 font-bold font-mono uppercase text-2xl">Up</p>
              <p className="text-green-300/70 text-sm font-mono mt-2">Backend is operational</p>
              <p className="text-green-300/50 text-xs font-mono mt-3">Checking every 5 seconds...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 border border-yellow-500/50 rounded-xl bg-yellow-950/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <AlertCircle className="w-12 h-12 text-yellow-500" />
            <div className="text-center">
              <p className="text-yellow-400 font-bold font-mono uppercase">Checking...</p>
              <p className="text-yellow-300/70 text-sm font-mono mt-2">Waiting for confirmation (attempt {consecutiveFailures})</p>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-md px-6 py-4 border border-border rounded-xl bg-card/40 font-mono text-sm text-muted-foreground">
        <p className="font-bold text-foreground mb-2">Details:</p>
        <ul className="space-y-1">
          <li>Status: <span className={isDown ? "text-red-400" : isHealthy ? "text-green-400" : "text-yellow-400"}>{isDown ? "down" : isHealthy ? "up" : "checking"}</span></li>
          <li>Consecutive failures: <span className={consecutiveFailures > 0 ? "text-yellow-400" : "text-green-400"}>{consecutiveFailures}/2</span></li>
          <li>Last check: {new Date().toLocaleTimeString()}</li>
          <li>Refresh interval: Every 5 seconds</li>
        </ul>
      </div>
    </div>
  );
}
