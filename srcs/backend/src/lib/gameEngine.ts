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

export function getAiChoice(difficulty: string = "MEDIUM", previousPlayerChoices: Elemental[] = []): Elemental {
  const elementals: Elemental[] = ["TITAN", "RAZOR", "WRAITH"];
  
  const counterChoice: Record<Elemental, Elemental> = {
    TITAN: "WRAITH",
    RAZOR: "TITAN",
    WRAITH: "RAZOR",
  };

  // Se for EASY (Fácil)
  if (difficulty === "EASY") {
    // Escolha aleatória pura 60% das vezes
    if (Math.random() < 0.6 || previousPlayerChoices.length === 0) {
      return elementals[Math.floor(Math.random() * elementals.length)];
    }
    // Tende a repetir a jogada anterior do jogador (fácil de antecipar e vencer)
    return previousPlayerChoices[previousPlayerChoices.length - 1];
  }

  // Se for MEDIUM (Médio)
  if (difficulty === "MEDIUM") {
    if (previousPlayerChoices.length === 0) {
      return elementals[Math.floor(Math.random() * elementals.length)];
    }
    const lastPlayerChoice = previousPlayerChoices[previousPlayerChoices.length - 1];
    
    // 50% de chance de tentar prever e contra-atacar a jogada anterior
    if (Math.random() < 0.5) {
      return counterChoice[lastPlayerChoice];
    }
    return elementals[Math.floor(Math.random() * elementals.length)];
  }

  // Se for HARD (Difícil)
  if (difficulty === "HARD") {
    if (previousPlayerChoices.length === 0) {
      return elementals[Math.floor(Math.random() * elementals.length)];
    }

    // Descobrir qual elemental o jogador usou mais na partida (heurística de frequência)
    const frequencies: Record<Elemental, number> = { TITAN: 0, RAZOR: 0, WRAITH: 0 };
    for (const choice of previousPlayerChoices) {
      frequencies[choice]++;
    }

    let favorite: Elemental = "TITAN";
    let maxCount = -1;
    for (const choice of elementals) {
      if (frequencies[choice] > maxCount) {
        maxCount = frequencies[choice];
        favorite = choice;
      }
    }

    // 70% de chance de jogar o counter do elemental favorito do jogador
    if (Math.random() < 0.7) {
      return counterChoice[favorite];
    }

    // 30% de chance de counterar a última jogada diretamente
    const lastPlayerChoice = previousPlayerChoices[previousPlayerChoices.length - 1];
    return counterChoice[lastPlayerChoice];
  }

  return elementals[Math.floor(Math.random() * elementals.length)];
}
