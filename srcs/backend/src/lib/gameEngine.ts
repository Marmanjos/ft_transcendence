export type Elemental = "TITAN" | "RAZOR" | "WRAITH";
export type Outcome = "WIN" | "LOSS" | "DRAW";

// Rock(TITAN) > Scissors(RAZOR) > Paper(WRAITH) > Rock(TITAN)
const winsAgainst: Record<Elemental, Elemental> = {
  TITAN: "RAZOR",  // Rock beats Scissors
  RAZOR: "WRAITH", // Scissors beats Paper
  WRAITH: "TITAN", // Paper beats Rock
};

export function resolveRound(player1Choice: Elemental, player2Choice: Elemental): Outcome {
  if (player1Choice === player2Choice) return "DRAW";
  if (winsAgainst[player1Choice] === player2Choice) return "WIN";
  return "LOSS";
}

const elementals: Elemental[] = ["TITAN", "RAZOR", "WRAITH"];

export function getAiChoice(): Elemental {
  return elementals[Math.floor(Math.random() * elementals.length)];
}
