import { Elemental } from "@workspace/api-client-react";

export function getElementalAsset(
  elemental: Elemental,
  fase: number = 0,
  result?: "win" | "lose"
): string {
  const elementalMap: Record<Elemental, string> = {
    [Elemental.TITAN]: "titan",
    [Elemental.RAZOR]: "blade",
    [Elemental.WRAITH]: "wraith",
  };

  const elementalName = elementalMap[elemental];

  // Se fase 2 e resultado é "lose", usar pasta losing
  if (fase === 2 && result === "lose") {
    return `/assets/fases/fase2/losing/losing_${elementalName}.png`;
  }

  return `/assets/fases/fase${fase}/${`fase${fase}_${elementalName}`}.png`;
}

export function useElementalAsset(
  elemental: Elemental,
  fase: number = 0,
  result?: "win" | "lose"
) {
  return getElementalAsset(elemental, fase, result);
}