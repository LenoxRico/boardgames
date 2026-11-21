import { GameEngine } from '../../core/models/game.interface';

export interface Take6Config {
  scoreLimit: number; // default: 66
  roundsMode?: boolean; // Modo de rondas fijas (4 rondas)
  roundsCount?: number; // 4 por defecto
}

export interface Take6RoundInput {
  bullheads: number; // cuernos recogidos en la ronda
}

export interface Take6RoundResult {
  playerId: string;
  bullheads: number;
  roundScore: number;
  cumulativeScore: number;
}

export class Take6Engine implements GameEngine<Take6Config, Take6RoundInput, Take6RoundResult> {
  calculateRound(
    roundIndex: number,
    inputs: Record<string, Take6RoundInput>,
    previousScores: Record<string, number>,
    _config: Take6Config
  ): Record<string, Take6RoundResult> {
    const results: Record<string, Take6RoundResult> = {};

    for (const [playerId, input] of Object.entries(inputs)) {
      const bullheads = Math.max(0, input.bullheads ?? 0);
      const prev = previousScores[playerId] ?? 0;
      const cumulativeScore = prev + bullheads;

      results[playerId] = {
        playerId,
        bullheads,
        roundScore: bullheads,
        cumulativeScore,
      };
    }

    return results;
  }

  evaluateMatchStatus(
    totalScores: Record<string, number>,
    roundsPlayed: number,
    config: Take6Config
  ): { isGameOver: boolean; reason?: string; winnerIds: string[]; loserIds?: string[] } {
    const playerIds = Object.keys(totalScores);

    if (playerIds.length === 0 || roundsPlayed === 0) {
      return { isGameOver: false, winnerIds: [] };
    }

    let minScore = Infinity;
    let maxScore = -Infinity;

    for (const score of Object.values(totalScores)) {
      if (score < minScore) minScore = score;
      if (score > maxScore) maxScore = score;
    }

    // Modo de Rondas Fijas (4 Rondas)
    if (config?.roundsMode) {
      const targetRounds = config.roundsCount || 4;
      const isGameOver = roundsPlayed >= targetRounds;
      const winnerIds = playerIds.filter((id) => totalScores[id] === minScore);
      const loserIds = playerIds.filter((id) => totalScores[id] === maxScore);

      return {
        isGameOver,
        reason: isGameOver
          ? `Partida finalizada tras completar las ${targetRounds} rondas. Pierde quien obtuvo mayor número de cuernos.`
          : undefined,
        winnerIds,
        loserIds,
      };
    }

    // Modo Clásico por Límite de Puntos (66 Cuernos por defecto)
    const limit = config?.scoreLimit || 66;
    let anyExceededLimit = false;

    for (const score of Object.values(totalScores)) {
      if (score >= limit) {
        anyExceededLimit = true;
        break;
      }
    }

    const isGameOver = anyExceededLimit;
    const winnerIds = playerIds.filter((id) => totalScores[id] === minScore);
    const loserIds = playerIds.filter((id) => totalScores[id] === maxScore);

    return {
      isGameOver,
      reason: isGameOver
        ? `Partida finalizada: al menos un jugador alcanzó el límite crítico de ${limit} cuernos.`
        : undefined,
      winnerIds,
      loserIds,
    };
  }
}
