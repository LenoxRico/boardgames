import { GameEngine } from '../../core/models/game.interface';

export interface MinoDiceConfig {
  rounds: number;
  enableBonuses: boolean;
}

export interface MinoDiceRoundInput {
  bid: number;
  tricks?: number;
  bonusPoints?: number;
}

export interface MinoDiceRoundResult {
  playerId: string;
  bid: number;
  tricks: number;
  bidMade: boolean;
  basePoints: number;
  bonusPoints: number;
  roundScore: number;
  cumulativeScore: number;
}

export class MinoDiceEngine implements GameEngine<MinoDiceConfig, MinoDiceRoundInput, MinoDiceRoundResult> {
  calculateRound(
    roundIndex: number,
    inputs: Record<string, MinoDiceRoundInput>,
    previousScores: Record<string, number>,
    config: MinoDiceConfig
  ): Record<string, MinoDiceRoundResult> {
    const roundNumber = roundIndex + 1;
    const results: Record<string, MinoDiceRoundResult> = {};

    for (const [playerId, input] of Object.entries(inputs)) {
      const bid = Math.max(0, input.bid ?? 0);
      const tricks = Math.max(0, input.tricks ?? 0);
      const bidMade = bid === tricks;

      let basePoints = 0;
      let appliedBonus = 0;

      if (bidMade) {
        if (bid === 0) {
          // Baza 0 exitosa: 10 pts por cada dado/baza de la ronda
          basePoints = 10 * roundNumber;
        } else {
          // Apuesta acertada: 20 pts por cada baza ganada
          basePoints = 20 * tricks;
        }

        // Bonificaciones de criaturas (Minotauro vence Grifo +30, Sirena vence Minotauro +50)
        // Se otorgan estrictamente si se acertó la apuesta
        if (config.enableBonuses && input.bonusPoints && input.bonusPoints > 0) {
          appliedBonus = input.bonusPoints;
        }
      } else {
        if (bid === 0) {
          // Baza 0 fallada: penalización fija de -10 pts por cada dado de la ronda
          basePoints = -10 * roundNumber;
        } else {
          // Apuesta fallada: -10 pts por cada baza de diferencia
          const diff = Math.abs(bid - tricks);
          basePoints = -10 * diff;
        }
        appliedBonus = 0; // Se pierden las bonificaciones
      }

      const roundScore = basePoints + appliedBonus;
      const prev = previousScores[playerId] ?? 0;
      const cumulativeScore = prev + roundScore;

      results[playerId] = {
        playerId,
        bid,
        tricks,
        bidMade,
        basePoints,
        bonusPoints: appliedBonus,
        roundScore,
        cumulativeScore,
      };
    }

    return results;
  }

  evaluateMatchStatus(
    totalScores: Record<string, number>,
    roundsPlayed: number,
    config: MinoDiceConfig
  ): { isGameOver: boolean; reason?: string; winnerIds: string[]; loserIds?: string[] } {
    const targetRounds = config?.rounds || 8;
    const isGameOver = roundsPlayed >= targetRounds;

    const playerIds = Object.keys(totalScores);
    if (playerIds.length === 0) {
      return { isGameOver, winnerIds: [] };
    }

    let maxScore = -Infinity;
    for (const score of Object.values(totalScores)) {
      if (score > maxScore) maxScore = score;
    }

    const winnerIds = playerIds.filter((id) => totalScores[id] === maxScore);

    return {
      isGameOver,
      reason: isGameOver
        ? `Partida de Mino Dice completada tras ${targetRounds} rondas de dados en el laberinto.`
        : undefined,
      winnerIds,
    };
  }
}
