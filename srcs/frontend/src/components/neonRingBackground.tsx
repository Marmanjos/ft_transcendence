// src/components/NeonRingBackground.tsx

interface NeonRingBackgroundProps {
  sparkCount?: number;  // Número de faíscas (opcional)
  className?: string;   // Classes adicionais (opcional)
}

export function NeonRingBackground({ 
  sparkCount = 18, 
  className = "" 
}: NeonRingBackgroundProps) {
  // Gera as faíscas dinamicamente
  const sparks = Array.from({ length: sparkCount }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: 20 + Math.random() * 60,
    size: 2 + Math.random() * 3,
    duration: 6 + Math.random() * 6,
    delay: Math.random() * 8,
    color: i % 2 === 0 ? "rgba(0,255,255,0.8)" : "rgba(168,85,247,0.8)",
  }));

  return (
    <div className={`neon-ring-bg ${className}`}>
      <div className="ring-stage">
        <div className="ring-floor" />
        
        <div className="ring-ropes">
          <div className="ring-rope h top-1" />
          <div className="ring-rope h top-2" />
          <div className="ring-rope h top-3" />
          <div className="ring-rope h bot-1" />
          <div className="ring-rope h bot-2" />
          <div className="ring-rope h bot-3" />
          <div className="ring-rope v left-1" />
          <div className="ring-rope v left-2" />
          <div className="ring-rope v left-3" />
          <div className="ring-rope v right-1" />
          <div className="ring-rope v right-2" />
          <div className="ring-rope v right-3" />
        </div>

        <div className="ring-post tl" />
        <div className="ring-post tr" />
        <div className="ring-post bl" />
        <div className="ring-post br" />
      </div>

      {sparks.map((s) => (
        <span
          key={s.id}
          className="ring-spark"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: s.color,
            boxShadow: `0 0 6px ${s.color}`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      <div className="ring-vignette" />
    </div>
  );
}