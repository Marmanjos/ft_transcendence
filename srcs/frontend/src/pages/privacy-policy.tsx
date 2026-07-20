import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono p-8 flex flex-col items-center justify-center selection:bg-cyan-500 selection:text-black">
      <div className="max-w-3xl border border-cyan-500/30 p-8 rounded-sm bg-cyan-950/10 shadow-[0_0_20px_rgba(6,182,212,0.15)] space-y-6">
        <h1 className="text-3xl font-bold tracking-widest uppercase text-center neon-text mb-8 animate-pulse">
          // PRIVACY POLICY
        </h1>
        
        <p className="text-cyan-300/80 leading-relaxed text-sm">
          Last updated: July 20, 2026. Your data privacy is hardcoded into our core directives. 
          We minimize information gathering to ensure maximum security.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-cyan-300">1. Data Collection</h2>
          <p className="text-cyan-400/70 text-xs leading-relaxed">
            We collect basic profile data required for match history and leaderboard statistics. 
            This includes your username, encrypted authentication credentials, and match scores.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-cyan-300">2. Real-time Status</h2>
          <p className="text-cyan-400/70 text-xs leading-relaxed">
            Websocket connections actively monitor your online/offline status to manage lobby matchmaking. 
            This state information is ephemeral and volatile.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold uppercase tracking-wider text-cyan-300">3. Cryptographic Keys</h2>
          <p className="text-cyan-400/70 text-xs leading-relaxed">
            All user authentication tokens are stored securely and encrypted. We do not transmit or sell 
            your digital signature to external multi-national megacorporations.
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
