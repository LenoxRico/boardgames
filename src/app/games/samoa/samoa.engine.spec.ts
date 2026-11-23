import { describe, it, expect } from 'vitest';
import {
  SamoaEngine,
  SamoaConfig,
  evaluateDeductionVotes,
  PlayerDeductionVote,
} from './samoa.engine';

describe('SamoaEngine', () => {
  const engine = new SamoaEngine();
  const defaultConfig: SamoaConfig = {
    rounds: 3,
    guessBonus: 5,
    unanimousPenalty: true,
  };

  it('calcula la puntuación sumando plumas de la máscara y bonos por aciertos', () => {
    const inputs = {
      p1: { maskPoints: 12, correctGuesses: 2 }, // 12 + 2*5 = 22 pts
      p2: { maskPoints: 8, correctGuesses: 1 },  // 8 + 1*5 = 13 pts
    };
    const prev = { p1: 10, p2: 15 };

    const res = engine.calculateRound(0, inputs, prev, defaultConfig);

    expect(res['p1'].maskPoints).toBe(12);
    expect(res['p1'].correctGuesses).toBe(2);
    expect(res['p1'].guessPoints).toBe(10);
    expect(res['p1'].roundScore).toBe(22);
    expect(res['p1'].cumulativeScore).toBe(32);

    expect(res['p2'].maskPoints).toBe(8);
    expect(res['p2'].correctGuesses).toBe(1);
    expect(res['p2'].guessPoints).toBe(5);
    expect(res['p2'].roundScore).toBe(13);
    expect(res['p2'].cumulativeScore).toBe(28);
  });

  it('permite valores negativos de plumas negras en la máscara', () => {
    const inputs = {
      p1: { maskPoints: -4, correctGuesses: 1 }, // -4 + 5 = 1 pt
      p2: { maskPoints: -6, correctGuesses: 0 }, // -6 + 0 = -6 pts
    };
    const prev = { p1: 20, p2: 10 };

    const res = engine.calculateRound(1, inputs, prev, defaultConfig);

    expect(res['p1'].roundScore).toBe(1);
    expect(res['p1'].cumulativeScore).toBe(21);

    expect(res['p2'].roundScore).toBe(-6);
    expect(res['p2'].cumulativeScore).toBe(4);
  });

  it('aplica la penalización unánime otorgando 0 puntos en la ronda si todos descubren la máscara', () => {
    const inputs = {
      p1: { maskPoints: 18, correctGuesses: 3, unanimouslyGuessed: true }, // Descubierto por todos -> 0 pts
      p2: { maskPoints: 7, correctGuesses: 2, unanimouslyGuessed: false },  // 7 + 10 = 17 pts
    };
    const prev = { p1: 30, p2: 25 };

    const res = engine.calculateRound(1, inputs, prev, defaultConfig);

    expect(res['p1'].unanimouslyGuessed).toBe(true);
    expect(res['p1'].roundScore).toBe(0);
    expect(res['p1'].cumulativeScore).toBe(30); // No suma nada

    expect(res['p2'].unanimouslyGuessed).toBe(false);
    expect(res['p2'].roundScore).toBe(17);
    expect(res['p2'].cumulativeScore).toBe(42);
  });

  it('ignora la penalización unánime si unanimousPenalty está desactivado en la configuración', () => {
    const customConfig: SamoaConfig = {
      rounds: 3,
      guessBonus: 5,
      unanimousPenalty: false,
    };
    const inputs = {
      p1: { maskPoints: 15, correctGuesses: 2, unanimouslyGuessed: true },
    };
    const prev = { p1: 10 };

    const res = engine.calculateRound(0, inputs, prev, customConfig);

    // Suma normal porque la regla opcional está desactivada: 15 + 10 = 25 pts
    expect(res['p1'].roundScore).toBe(25);
    expect(res['p1'].cumulativeScore).toBe(35);
  });

  it('evalúa la finalización tras alcanzar el número de rondas', () => {
    const scores = { p1: 45, p2: 52, p3: 38 };

    const statusRonda2 = engine.evaluateMatchStatus(scores, 2, defaultConfig);
    expect(statusRonda2.isGameOver).toBe(false);

    const statusRonda3 = engine.evaluateMatchStatus(scores, 3, defaultConfig);
    expect(statusRonda3.isGameOver).toBe(true);
    expect(statusRonda3.winnerIds).toEqual(['p2']);
  });

  it('desempata al ganador por mayor cantidad de aciertos acumulados', () => {
    const scores = { p1: 50, p2: 50, p3: 40 };
    const history = [
      {
        data: {
          p1: { maskPoints: 10, correctGuesses: 1 },
          p2: { maskPoints: 10, correctGuesses: 2 },
          p3: { maskPoints: 10, correctGuesses: 1 },
        },
      },
      {
        data: {
          p1: { maskPoints: 15, correctGuesses: 1 },
          p2: { maskPoints: 15, correctGuesses: 2 }, // p2 tiene 4 aciertos en total vs 2 de p1
          p3: { maskPoints: 10, correctGuesses: 0 },
        },
      },
      {
        data: {
          p1: { maskPoints: 15, correctGuesses: 0 },
          p2: { maskPoints: 15, correctGuesses: 0 },
          p3: { maskPoints: 10, correctGuesses: 1 },
        },
      },
    ];

    const status = engine.evaluateMatchStatus(scores, 3, defaultConfig, history);
    expect(status.isGameOver).toBe(true);
    expect(status.winnerIds).toEqual(['p2']);
  });

  it('clasifica correctamente a los jugadores con sus rangos', () => {
    const players = [
      { id: 'p1', name: 'Ana' },
      { id: 'p2', name: 'Beto' },
      { id: 'p3', name: 'Carla' },
    ];
    const scores = { p1: 60, p2: 45, p3: 60 };
    const history = [
      {
        data: {
          p1: { maskPoints: 20, correctGuesses: 1 },
          p2: { maskPoints: 15, correctGuesses: 0 },
          p3: { maskPoints: 20, correctGuesses: 3 }, // Carla tiene más aciertos que Ana empatando a 60
        },
      },
    ];

    const ranking = engine.rankPlayers(players, history, scores);

    expect(ranking[0].playerId).toBe('p3'); // Carla 1º (60 pts, 3 aciertos)
    expect(ranking[0].rank).toBe(1);

    expect(ranking[1].playerId).toBe('p1'); // Ana 2º (60 pts, 1 acierto)
    expect(ranking[1].rank).toBe(2);

    expect(ranking[2].playerId).toBe('p2'); // Beto 3º (45 pts)
    expect(ranking[2].rank).toBe(3);
  });

  describe('evaluateDeductionVotes', () => {
    it('evalúa correctamente los aciertos y descubre la unanimidad cuando todos los rivales aciertan', () => {
      const playerIds = ['p1', 'p2', 'p3'];
      const votes: Record<string, PlayerDeductionVote> = {
        p1: {
          ownMask: 'red',
          opponentGuesses: { p2: 'green', p3: 'blue' },
        },
        p2: {
          ownMask: 'green',
          opponentGuesses: { p1: 'red', p3: 'yellow' },
        },
        p3: {
          ownMask: 'blue',
          opponentGuesses: { p1: 'red', p2: 'green' },
        },
      };

      const evalResult = evaluateDeductionVotes(playerIds, votes);

      // p1 adivinó p2=green (correcto) y p3=blue (correcto) -> 2 aciertos
      expect(evalResult['p1'].correctGuesses).toBe(2);
      // p1 fue adivinado por p2 (red) y p3 (red) -> ¡los 2 rivales lo adivinaron! Unánime
      expect(evalResult['p1'].unanimouslyGuessed).toBe(true);
      expect(evalResult['p1'].guessedByRivals).toEqual(['p2', 'p3']);

      // p2 adivinó p1=red (correcto), p3=yellow (incorrecto, p3 es blue) -> 1 acierto
      expect(evalResult['p2'].correctGuesses).toBe(1);
      // p2 fue adivinado por p1 (green) y p3 (green) -> ¡los 2 rivales lo adivinaron! Unánime
      expect(evalResult['p2'].unanimouslyGuessed).toBe(true);

      // p3 adivinó p1=red (correcto) y p2=green (correcto) -> 2 aciertos
      expect(evalResult['p3'].correctGuesses).toBe(2);
      // p3 fue adivinado por p1 (blue), pero NO por p2 (que apostó yellow) -> no unánime
      expect(evalResult['p3'].unanimouslyGuessed).toBe(false);
      expect(evalResult['p3'].guessedByRivals).toEqual(['p1']);
    });
  });
});