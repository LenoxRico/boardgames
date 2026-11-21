import { GameEngine } from '../../core/models/game.interface';

export interface PelusasConfig {
  rounds: number; // Número de rondas a jugar (por defecto 3)
  targetScore?: number; // Opcional: alcanzar puntaje objetivo (ej. 100)
  revolutionMode?: boolean; // Versión Pelusas Revolution
}

export interface PelusasRoundInput {
  points: number; // Puntos obtenidos en la ronda
  lostToWind?: boolean; // ¿Perdió todo por corriente de aire en esta ronda?
  cardCounts?: Record<number, number>; // Desglose opcional de cartas (1 al 10)
  diablillos?: number; // Pelusas Revolution: cada diablillo resta -7 puntos
}

export interface PelusasRoundResult {
  roundScore: number;
  cumulativeScore: number;
  lostToWind: boolean;
  totalCardsCount: number;
  cardCounts?: Record<number, number>;
  diablillos?: number;
}

export interface PelusasRanking {
  playerId: string;
  totalScore: number;
  rank: number;
  onesCount: number;
  twosCount: number;
  diablillosCount?: number;
}

export class PelusasEngine
  implements GameEngine<PelusasConfig, PelusasRoundInput, PelusasRoundResult>
{
  /**
   * Calcula la puntuación obtenida en una ronda y el total acumulado.
   */
  calculateRound(
    roundIndex: number,
    inputs: Record<string, PelusasRoundInput>,
    previousScores: Record<string, number>,
    config: PelusasConfig
  ): Record<string, PelusasRoundResult> {
    const results: Record<string, PelusasRoundResult> = {};
    const isRev = !!config.revolutionMode;

    for (const [playerId, input] of Object.entries(inputs)) {
      const prev = previousScores[playerId] ?? 0;
      const lostToWind = !!input.lostToWind;
      const diablillos = isRev && input.diablillos ? input.diablillos : 0;

      let roundScore = 0;
      let totalCardsCount = 0;

      if (!lostToWind) {
        if (input.cardCounts && Object.keys(input.cardCounts).length > 0) {
          // Si el jugador ingresó el desglose detallado de cartas
          roundScore = 0;
          for (const [cardValStr, count] of Object.entries(input.cardCounts)) {
            const val = parseInt(cardValStr, 10);
            const qty = count ?? 0;
            roundScore += val * qty;
            totalCardsCount += qty;
          }
          if (diablillos > 0) {
            roundScore += diablillos * -7;
          }
        } else {
          // Si ingresó los puntos directamente
          const basePoints = input.points ?? 0;
          roundScore = basePoints;
          if (diablillos > 0) {
            roundScore += diablillos * -7;
          }
          if (!isRev) {
            roundScore = Math.max(0, roundScore);
          }
        }
      }

      results[playerId] = {
        roundScore,
        cumulativeScore: prev + roundScore,
        lostToWind,
        totalCardsCount,
        cardCounts: input.cardCounts ? { ...input.cardCounts } : undefined,
        diablillos: diablillos > 0 ? diablillos : undefined,
      };
    }

    return results;
  }

  /**
   * Evalúa si la partida ha finalizado y determina los ganadores por mayor puntaje
   * y desempate oficial (más cartas de 1, luego de 2, etc.).
   */
  evaluateMatchStatus(
    totalScores: Record<string, number>,
    roundsPlayed: number,
    config: PelusasConfig,
    allRoundResults?: Record<string, PelusasRoundResult>[]
  ): {
    isGameOver: boolean;
    winnerIds: string[];
    rankings: PelusasRanking[];
    reason?: string;
  } {
    const maxRounds = config.rounds || 3;
    const playerIds = Object.keys(totalScores);

    if (playerIds.length === 0) {
      return { isGameOver: false, winnerIds: [], rankings: [] };
    }

    // Comprobar condición de fin: rondas completadas o targetScore alcanzado
    const isGameOverByRounds = roundsPlayed >= maxRounds;
    const isGameOverByTarget =
      config.targetScore && config.targetScore > 0
        ? Object.values(totalScores).some((s) => s >= config.targetScore!)
        : false;

    const isGameOver = isGameOverByRounds || isGameOverByTarget;

    // Calcular desglose acumulado de cartas para desempate si está disponible
    const aggregatedCards: Record<string, Record<number, number>> = {};
    const diablillosTotals: Record<string, number> = {};
    for (const pid of playerIds) {
      aggregatedCards[pid] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
      diablillosTotals[pid] = 0;
    }

    if (allRoundResults) {
      for (const round of allRoundResults) {
        for (const [pid, res] of Object.entries(round)) {
          if (res.cardCounts && aggregatedCards[pid]) {
            for (const [valStr, qty] of Object.entries(res.cardCounts)) {
              const val = parseInt(valStr, 10);
              aggregatedCards[pid][val] = (aggregatedCards[pid][val] || 0) + (qty || 0);
            }
          }
          if (res.diablillos) {
            diablillosTotals[pid] = (diablillosTotals[pid] || 0) + res.diablillos;
          }
        }
      }
    }

    // Ordenar jugadores: mayor puntuación primero
    const sorted = [...playerIds].sort((a, b) => {
      const scoreA = totalScores[a] ?? 0;
      const scoreB = totalScores[b] ?? 0;

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      // Desempate oficial: quien tenga más 1s, luego más 2s, etc.
      for (let num = 1; num <= 10; num++) {
        const countA = aggregatedCards[a]?.[num] ?? 0;
        const countB = aggregatedCards[b]?.[num] ?? 0;
        if (countB !== countA) {
          return countB - countA;
        }
      }

      return 0;
    });

    const highestScore = totalScores[sorted[0]] ?? 0;
    const winnerIds = sorted.filter((id) => {
      if (totalScores[id] !== highestScore) return false;
      // Verificar si empatan también en todos los criterios de desempate
      for (let num = 1; num <= 10; num++) {
        const countWin = aggregatedCards[sorted[0]]?.[num] ?? 0;
        const countCurrent = aggregatedCards[id]?.[num] ?? 0;
        if (countWin !== countCurrent) return false;
      }
      return true;
    });

    // Construir tabla de rankings
    const rankings: PelusasRanking[] = sorted.map((pid, idx) => ({
      playerId: pid,
      totalScore: totalScores[pid] ?? 0,
      rank: idx + 1,
      onesCount: aggregatedCards[pid]?.[1] ?? 0,
      twosCount: aggregatedCards[pid]?.[2] ?? 0,
      diablillosCount: diablillosTotals[pid],
    }));

    let reason: string | undefined;
    if (isGameOver) {
      if (isGameOverByTarget) {
        reason = `¡Se alcanzó el puntaje objetivo de ${config.targetScore} puntos!`;
      } else {
        reason = `¡Partida completada tras ${roundsPlayed} rondas!`;
      }
    }

    return {
      isGameOver,
      winnerIds,
      rankings,
      reason,
    };
  }
}
