// ft_finish/srcs/frontend/src/pages/about.tsx

import React from "react";

export default function About() {
  const badges = [
    { lvl: 4, name: "Arena Recruit", desc: "Awarded to players who have mastered the basics of combat and begun their journey." },
    { lvl: 8, name: "Elemental Warrior", desc: "Awarded to players demonstrating consistency and mastery over elemental mechanics." },
    { lvl: 12, name: "Element Master", desc: "Reserved for experienced combatants with an extensive history of victories." },
    { lvl: 16, name: "Mars Legend", desc: "Elite milestone achievement for veteran fighters of the arena." },
    { lvl: 20, name: "Undefeated Titan", desc: "The highest prestige tier, reached only by the most dedicated operators." },
  ];

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono p-6 md:p-12 flex flex-col items-center selection:bg-cyan-500 selection:text-black">
      <div className="max-w-4xl w-full border border-cyan-500/30 p-6 md:p-10 rounded-sm bg-cyan-950/10 shadow-[0_0_30px_rgba(6,182,212,0.1)] space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-widest uppercase text-center neon-text animate-pulse">
            // CORE_SYSTEM_OVERVIEW
          </h1>
          <p className="text-cyan-300/60 text-xs">ARCH: REACT + NODE.JS + WEBSOCKETS + DRIZZLE DB</p>
        </div>

        {/* General Context */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold uppercase tracking-wider text-cyan-300 border-b border-cyan-500/20 pb-1">// 01. PROJECT TRANSMISSION</h2>
          <p className="text-cyan-400/80 text-sm leading-relaxed text-justify">
            <span className="text-cyan-300 font-bold">Elemental Duel</span> is a high-performance full-stack web application that combines a real-time tactical dueling game with a robust social infrastructure. The system integrates complex relational data persistence and packet synchronization via WebSockets, delivering dynamic 1v1 matchmaking alongside single-player simulations driven by an adaptive AI.
          </p>
        </section>

        {/* Combat Mechanics */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold uppercase tracking-wider text-cyan-300 border-b border-cyan-500/20 pb-1">// 02. GAMEPLAY METHODOLOGY</h2>
          <p className="text-cyan-400/80 text-sm">
            Engagements operate on a cyclic and intuitive elemental triangulation system. The operational efficiency of each command is absolute:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-xs tracking-widest uppercase pt-2">
            <div className="border border-red-500/40 bg-red-950/10 p-3 rounded shadow-[0_0_10px_rgba(239,68,68,0.1)]">
              <span className="font-bold text-red-400">TITAN</span> <br /> <span className="text-cyan-500/60">neutralizes</span> <br /> <span className="font-bold text-yellow-400">RAZOR</span>
            </div>
            <div className="border border-yellow-500/40 bg-yellow-950/10 p-3 rounded shadow-[0_0_10px_rgba(234,179,8,0.1)]">
              <span className="font-bold text-yellow-400">RAZOR</span> <br /> <span className="text-cyan-500/60">neutralizes</span> <br /> <span className="font-bold text-purple-400">WRAITH</span>
            </div>
            <div className="border border-purple-500/40 bg-purple-950/10 p-3 rounded shadow-[0_0_10px_rgba(168,85,247,0.1)]">
              <span className="font-bold text-purple-400">WRAITH</span> <br /> <span className="text-cyan-500/60">neutralizes</span> <br /> <span className="font-bold text-red-400">TITAN</span>
            </div>
          </div>
        </section>

        {/* Progression & XP Formula */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold uppercase tracking-wider text-cyan-300 border-b border-cyan-500/20 pb-1">// 03. PROGRESSION CALCULATION</h2>
          <p className="text-cyan-400/80 text-sm">
            Level telemetry is deterministically evaluated at <span className="text-cyan-300 italic">runtime</span> by aggregating total historical Experience Points (XP):
          </p>
          
          <div className="grid grid-cols-3 gap-2 text-center text-xs border border-cyan-500/20 p-3 bg-cyan-950/5">
            <div><span className="text-green-400 font-bold">VICTORY</span><br/>+100 XP</div>
            <div><span className="text-yellow-400 font-bold">DRAW</span><br/>+30 XP</div>
            <div><span className="text-red-400 font-bold">DEFEAT</span><br/>+10 XP</div>
          </div>

          <div className="border border-cyan-400/30 p-4 bg-black/50 space-y-2">
            <span className="text-xs uppercase tracking-widest text-cyan-300 block font-bold">// ALGORITHMIC EQUATION:</span>
            <code className="text-xs text-cyan-200 block bg-cyan-950/40 p-2 border-l-2 border-cyan-400">
              Level = Math.floor(Total_XP / 400) + 1
            </code>
            <p className="text-cyan-400/60 text-xs pt-1">
              * Security Note: User levels are never statically stored in the database, preventing external tampering and ensuring data integrity.
            </p>
          </div>
        </section>

        {/* Badges / Milestones */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold uppercase tracking-wider text-cyan-300 border-b border-cyan-500/20 pb-1">// 04. MILESTONES & REWARDS</h2>
          <div className="overflow-x-auto border border-cyan-500/20 rounded-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-cyan-500/30 bg-cyan-950/20 uppercase tracking-wider text-cyan-300">
                  <th className="p-3 w-24">Required</th>
                  <th className="p-3 w-44">Badge Badge</th>
                  <th className="p-3">Directive / Significance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10">
                {badges.map((b) => (
                  <tr key={b.lvl} className="hover:bg-cyan-950/10 transition-colors">
                    <td className="p-3 text-cyan-300 font-bold">LVL {b.lvl}</td>
                    <td className="p-3 uppercase font-bold text-cyan-200 tracking-wide">{b.name}</td>
                    <td className="p-3 text-cyan-400/70">{b.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-cyan-500/20 text-center">
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-2.5 border border-cyan-400 text-xs uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          >
            [ DISCONNECT_TERMINAL ]
          </button>
        </div>
      </div>
    </div>
  );
}
