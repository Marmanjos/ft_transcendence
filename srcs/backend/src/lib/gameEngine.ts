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

// ✅ NOVA VERSÃO - Com suporte a histórico
export function getAiChoice(playerHistory?: Elemental[]): Elemental {
  const elementals: Elemental[] = ["TITAN", "RAZOR", "WRAITH"];
  
  // Se não há histórico, escolhe aleatório (primeira jogada)
  if (!playerHistory || playerHistory.length === 0) {
    return elementals[Math.floor(Math.random() * elementals.length)];
  }

  // Conta as escolhas do jogador
  const counts = { TITAN: 0, RAZOR: 0, WRAITH: 0 };
  playerHistory.forEach(choice => counts[choice]++);

  // Encontra o elemento mais escolhido pelo jogador
  let mostFrequent = elementals[0];
  let maxCount = 0;
  for (const el of elementals) {
    if (counts[el] > maxCount) {
      maxCount = counts[el];
      mostFrequent = el;
    }
  }

  // Regras: o que vence cada elemento
  const losesTo: Record<Elemental, Elemental> = {
    TITAN: "WRAITH",   // WRAITH vence TITAN
    RAZOR: "TITAN",    // TITAN vence RAZOR
    WRAITH: "RAZOR"    // RAZOR vence WRAITH
    };

  // 70% das vezes: escolhe o elemento que vence o mais frequente do jogador
  // 30% das vezes: escolhe aleatório (para ser imprevisível)
  if (Math.random() < 0.7) {
    return losesTo[mostFrequent];
  } else {
    return elementals[Math.floor(Math.random() * elementals.length)];
  }
}
