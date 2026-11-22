import { GameEngine } from '../../core/models/game.interface';

export interface SkullKingConfig {
  rounds: number;
  recentRules: boolean;
}

export interface SkullKingRoundInput {
  bid: number;
  tricks?: number;
  bonusPoints?: number;
}

export interface SkullKingRoundResult {
  playerId: string;
  bid: number;
  tricks: number;
  bidMade: boolean;
  basePoints: number;
  bonusPoints: number;
  roundScore: number;
  cumulativeScore: number;
}

export class SkullKingEngine implements GameEngine<SkullKingConfig, SkullKingRoundInput, SkullKingRoundResult> {
  calculateRound(
    roundIndex: number,
    inputs: Record<string, SkullKingRoundInput>,
    previousScores: Record<string, number>,
    config: SkullKingConfig
  ): Record<string, SkullKingRoundResult> {
    const roundNumber = roundIndex + 1;
    const results: Record<string, SkullKingRoundResult> = {};

    for (const [playerId, input] of Object.entries(inputs)) {
      const bid = Math.max(0, input.bid ?? 0);
      const tricks = Math.max(0, input.tricks ?? 0);
      const bidMade = bid === tricks;

      let basePoints = 0;
      let appliedBonus = 0;

      if (bidMade) {
        if (bid === 0) {
          basePoints = 10 * roundNumber;
        } else {
          basePoints = 20 * tricks;
        }

        // Bonuses only award when bid is achieved
        if (config.recentRules && input.bonusPoints && input.bonusPoints > 0) {
          appliedBonus = input.bonusPoints;
        }
      } else {
        if (bid === 0) {
          basePoints = -10 * roundNumber;
        } else {
          const diff = Math.abs(bid - tricks);
          basePoints = -10 * diff;
        }
        appliedBonus = 0; // In Skull King, failed bids forfeit all bonuses
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
    config: SkullKingConfig
  ): { isGameOver: boolean; reason?: string; winnerIds: string[]; loserIds?: string[] } {
    const targetRounds = config?.rounds || 10;
    const isGameOver = roundsPlayed >= targetRounds;

    const playerIds = Object.keys(totalScores);
    if (playerIds.length === 0) {
      return { isGameOver, winnerIds: [] };
    }

    let maxScore = -Infinity;
    let minScore = Infinity;

    for (const score of Object.values(totalScores)) {
      if (score > maxScore) maxScore = score;
      if (score < minScore) minScore = score;
    }

    const winnerIds = playerIds.filter((id) => totalScores[id] === maxScore);
    const loserIds = playerIds.filter((id) => totalScores[id] === minScore);

    return {
      isGameOver,
      reason: isGameOver ? `Se han completado las ${targetRounds} rondas de la partida.` : undefined,
      winnerIds,
      loserIds,
    };
  }
}
