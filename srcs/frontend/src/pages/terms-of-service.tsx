import React from "react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono p-8 flex flex-col items-center justify-center selection:bg-cyan-500 selection:text-black">
      <div className="max-w-3xl border border-cyan-500/30 p-8 rounded-sm bg-cyan-950/10 shadow-[0_0_20px_rgba(6,182,212,0.15)] space-y-6">
        <h1 className="text-3xl font-bold tracking-widest uppercase text-center neon-text mb-8 animate-pulse">
          // TERMS OF SERVICE
        </h1>
        
        <p className="text-cyan-300/80 leading-relaxed text-sm">
          Welcome to the Arena protocols. By executing this client, you agree to comply with the 
          following system rules.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-cyan-300">1. User Accountability</h2>
          <p className="text-cyan-400/70 text-xs leading-relaxed">
            You are fully responsible for safeguarding your login keys. Any unauthorized deployment 
            or illegal bot injections into the game engine via your account remains your sole liability.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-cyan-300">2. Matchmaking Protocol</h2>
          <p className="text-cyan-400/70 text-xs leading-relaxed">
            Exploiting glitches, script injections, or win-trading inside the 3v3 Arena ruins the telemetry data 
            for everyone. Detected anomalies will result in immediate connection termination.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-cyan-300">3. Termination</h2>
          <p className="text-cyan-400/70 text-xs leading-relaxed">
            The administrator maintains the authority to revoke access tokens and purge parameters of profiles 
            that infringe upon network stability or exhibit toxic packets toward peer nodes.
          </p>
        </section>

        <div className="pt-6 border-t border-cyan-500/20 text-center">
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-cyan-400 text-xs uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
          >
            [ Return to Main Terminal ]
          </button>
        </div>
      </div>
    </div>
  );
}
