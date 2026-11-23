import { GameEngine } from '../../core/models/game.interface';

export interface SamoaMask {
  id: string;
  name: string;
  color: string;
  emoji: string;
  imageUrl: string;
}

export const SAMOA_MASKS: SamoaMask[] = [
  {
    id: 'red',
    name: 'Roja',
    color: '#ef4444',
    emoji: '🔴',
    imageUrl: '/assets/games/samoa/mask-red.svg',
  },
  {
    id: 'green',
    name: 'Verde',
    color: '#10b981',
    emoji: '🟢',
    imageUrl: '/assets/games/samoa/mask-green.svg',
  },
  {
    id: 'blue',
    name: 'Azul',
    color: '#0ea5e9',
    emoji: '🔵',
    imageUrl: '/assets/games/samoa/mask-blue.svg',
  },
  {
    id: 'yellow',
    name: 'Amarilla',
    color: '#f59e0b',
    emoji: '🟡',
    imageUrl: '/assets/games/samoa/mask-yellow.svg',
  },
  {
    id: 'purple',
    name: 'Morada',
    color: '#8b5cf6',
    emoji: '🟣',
    imageUrl: '/assets/games/samoa/mask-purple.svg',
  },
];

export interface PlayerDeductionVote {
  ownMask: string; // id de la máscara secreta del propio jugador
  opponentGuesses: Record<string, string>; // rivalPlayerId -> maskId
}

export interface DeductionEvaluationResult {
  correctGuesses: number;
  unanimouslyGuessed: boolean;
  guessedByRivals: string[]; // IDs de rivales que adivinaron su máscara
}

/**
 * Evalúa los votos secretos de deducción estilo Devir Companion:
 * - Determina cuántos rivales adivinó correctamente cada jugador.
 * - Detecta si un jugador fue descubierto unánimemente por todos los demás rivales.
 */
export function evaluateDeductionVotes(
  playerIds: string[],
  votes: Record<string, PlayerDeductionVote>
): Record<string, DeductionEvaluationResult> {
  const result: Record<string, DeductionEvaluationResult> = {};

  for (const pid of playerIds) {
    const ownMask = votes[pid]?.ownMask;
    const opponentGuesses = votes[pid]?.opponentGuesses || {};

    // 1. Contar aciertos del jugador
    let correctCount = 0;
    for (const otherId of playerIds) {
      if (otherId === pid) continue;
      const guessForOther = opponentGuesses[otherId];
      const otherRealMask = votes[otherId]?.ownMask;
      if (guessForOther && otherRealMask && guessForOther === otherRealMask) {
        correctCount++;
      }
    }

    // 2. Comprobar cuántos rivales descubrieron la máscara de este jugador
    const guessedByRivals: string[] = [];
    for (const otherId of playerIds) {
      if (otherId === pid) continue;
      const otherGuessForP = votes[otherId]?.opponentGuesses?.[pid];
      if (otherGuessForP && ownMask && otherGuessForP === ownMask) {
        guessedByRivals.push(otherId);
      }
    }

    const totalRivals = Math.max(0, playerIds.length - 1);
    const unanimouslyGuessed = totalRivals > 0 && guessedByRivals.length === totalRivals;

    result[pid] = {
      correctGuesses: correctCount,
      unanimouslyGuessed,
      guessedByRivals,
    };
  }

  return result;
}

export interface SamoaConfig {
  rounds: number; // Número de rondas de la partida (oficial: 3 rondas)
  guessBonus: number; // Puntos por cada rival adivinado correctamente (oficial: 5 pts)
  unanimousPenalty: boolean; // Si todos los rivales aciertan tu máscara, tu puntuación de ronda es 0
}

export interface SamoaRoundInput {
  maskPoints: number; // Puntos de las plumas de la máscara secreta (pueden ser positivos o negativos)
  correctGuesses: number; // Cantidad de rivales cuya máscara adivinó correctamente (0 a N-1)
  unanimouslyGuessed?: boolean; // ¿Fue descubierto unánimemente por todos los demás rivales?
  assignedMask?: string; // id de máscara elegida por el jugador en la votación secreta
  guessedMasks?: Record<string, string>; // rivalId -> maskId
}

export interface SamoaRoundResult {
  maskPoints: number;
  correctGuesses: number;
  guessPoints: number;
  unanimouslyGuessed: boolean;
  roundScore: number;
  cumulativeScore: number;
}

export interface SamoaRanking {
  playerId: string;
  totalScore: number;
  rank: number;
  totalCorrectGuesses: number;
}

export class SamoaEngine
  implements GameEngine<SamoaConfig, SamoaRoundInput, SamoaRoundResult>
{
  /**
   * Calcula la puntuación obtenida en una ronda y el total acumulado.
   * Regla de Samoa (Devir):
   * - Puntos de la máscara: valor neto de plumas de la máscara secreta del jugador.
   * - Puntos de deducción: +5 puntos por cada máscara rival adivinada correctamente.
   * - Penalización unánime: Si TODOS los demás jugadores descubrieron tu máscara,
   *   tu faroleo ha fallado por completo y obtienes 0 puntos en la ronda (anulando máscara y aciertos).
   */
  calculateRound(
    roundIndex: number,
    inputs: Record<string, SamoaRoundInput>,
    previousScores: Record<string, number>,
    config: SamoaConfig
  ): Record<string, SamoaRoundResult> {
    const results: Record<string, SamoaRoundResult> = {};
    const guessBonus = config.guessBonus ?? 5;
    const applyUnanimousPenalty = config.unanimousPenalty !== false;

    for (const [playerId, input] of Object.entries(inputs)) {
      const prev = previousScores[playerId] ?? 0;
      const maskPoints = input.maskPoints ?? 0;
      const correctGuesses = Math.max(0, input.correctGuesses ?? 0);
      const guessPoints = correctGuesses * guessBonus;
      const unanimouslyGuessed = !!input.unanimouslyGuessed;

      let roundScore = 0;
      if (unanimouslyGuessed && applyUnanimousPenalty) {
        // Fracaso total de faroleo: 0 puntos en la ronda
        roundScore = 0;
      } else {
        roundScore = maskPoints + guessPoints;
      }

      results[playerId] = {
        maskPoints,
        correctGuesses,
        guessPoints,
        unanimouslyGuessed,
        roundScore,
        cumulativeScore: prev + roundScore,
      };
    }

    return results;
  }

  /**
   * Evalúa si la partida ha finalizado según las rondas configuradas (por defecto 3).
   * En caso de empate, el criterio oficial de Samoa premia a quien haya obtenido más
   * puntos de deducción (mayor cantidad acumulada de máscaras rivales adivinadas).
   */
  evaluateMatchStatus(
    totalScores: Record<string, number>,
    roundsPlayed: number,
    config: SamoaConfig,
    roundsHistory?: Array<{ data: Record<string, SamoaRoundInput> }>
  ): { isGameOver: boolean; winnerIds: string[] } {
    const maxRounds = config.rounds || 3;
    const isGameOver = roundsPlayed >= maxRounds;
    let winnerIds: string[] = [];

    if (isGameOver) {
      let maxScore = -Infinity;
      for (const [id, score] of Object.entries(totalScores)) {
        if (score > maxScore) {
          maxScore = score;
          winnerIds = [id];
        } else if (score === maxScore) {
          winnerIds.push(id);
        }
      }

      // Desempate oficial: más aciertos totales a lo largo de las rondas
      if (winnerIds.length > 1 && roundsHistory && roundsHistory.length > 0) {
        const totalGuessesByPlayer: Record<string, number> = {};
        for (const id of winnerIds) {
          totalGuessesByPlayer[id] = 0;
        }

        for (const r of roundsHistory) {
          for (const [pid, input] of Object.entries(r.data)) {
            if (totalGuessesByPlayer[pid] !== undefined) {
              totalGuessesByPlayer[pid] += input?.correctGuesses || 0;
            }
          }
        }

        let maxGuesses = -1;
        let tieBreakerWinners: string[] = [];
        for (const id of winnerIds) {
          const guesses = totalGuessesByPlayer[id];
          if (guesses > maxGuesses) {
            maxGuesses = guesses;
            tieBreakerWinners = [id];
          } else if (guesses === maxGuesses) {
            tieBreakerWinners.push(id);
          }
        }

        if (tieBreakerWinners.length > 0) {
          winnerIds = tieBreakerWinners;
        }
      }
    }

    return { isGameOver, winnerIds };
  }

  /**
   * Clasifica los jugadores por puntaje total descendente,
   * aplicando desempate por total de aciertos de deducción.
   */
  rankPlayers(
    players: Array<{ id: string; name: string }>,
    roundsHistory: Array<{ data: Record<string, SamoaRoundInput> }>,
    totalScores: Record<string, number>
  ): SamoaRanking[] {
    const totalGuessesByPlayer: Record<string, number> = {};
    for (const p of players) {
      totalGuessesByPlayer[p.id] = 0;
    }

    for (const r of roundsHistory) {
      for (const [pid, input] of Object.entries(r.data)) {
        if (totalGuessesByPlayer[pid] !== undefined) {
          totalGuessesByPlayer[pid] += input?.correctGuesses || 0;
        }
      }
    }

    const playerStats = players.map((p) => ({
      playerId: p.id,
      totalScore: totalScores[p.id] ?? 0,
      totalCorrectGuesses: totalGuessesByPlayer[p.id] ?? 0,
    }));

    // Ordenar por score descendente, luego por aciertos descendente
    playerStats.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return b.totalCorrectGuesses - a.totalCorrectGuesses;
    });

    let currentRank = 1;
    return playerStats.map((item, idx) => {
      if (idx > 0) {
        const prev = playerStats[idx - 1];
        if (
          item.totalScore !== prev.totalScore ||
          item.totalCorrectGuesses !== prev.totalCorrectGuesses
        ) {
          currentRank = idx + 1;
        }
      }
      return {
        ...item,
        rank: currentRank,
      };
    });
  }
}