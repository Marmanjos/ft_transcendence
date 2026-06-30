export function OnlineDot({ online, className = "w-3 h-3 border-2" }: { online: boolean; className?: string }) {
  if (!online) return null;
  return (
    <span className={`absolute bottom-0 right-0 rounded-full bg-green-400 border-background ${className}`} />
  );
}