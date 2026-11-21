import { describe, it, expect } from 'vitest';
import { PelusasEngine, PelusasConfig, PelusasRoundInput } from './pelusas.engine';

describe('PelusasEngine', () => {
  const engine = new PelusasEngine();
  const defaultConfig: PelusasConfig = { rounds: 3 };

  it('calcula correctamente los puntos directos en una ronda', () => {
    const inputs: Record<string, PelusasRoundInput> = {
      p1: { points: 28 },
      p2: { points: 15 },
    };
    const prev = { p1: 10, p2: 20 };

    const results = engine.calculateRound(0, inputs, prev, defaultConfig);

    expect(results['p1'].roundScore).toBe(28);
    expect(results['p1'].cumulativeScore).toBe(38);
    expect(results['p1'].lostToWind).toBe(false);

    expect(results['p2'].roundScore).toBe(15);
    expect(results['p2'].cumulativeScore).toBe(35);
  });

  it('calcula puntos automáticamente a partir del desglose de cartas (1-10)', () => {
    const inputs: Record<string, PelusasRoundInput> = {
      p1: {
        points: 0,
        cardCounts: {
          1: 3, // 3 x 1 = 3
          7: 2, // 2 x 7 = 14
          10: 1, // 1 x 10 = 10 -> Total: 27
        },
      },
    };
    const prev = { p1: 0 };

    const results = engine.calculateRound(0, inputs, prev, defaultConfig);

    expect(results['p1'].roundScore).toBe(27);
    expect(results['p1'].totalCardsCount).toBe(6);
    expect(results['p1'].cumulativeScore).toBe(27);
  });

  it('asigna 0 puntos de ronda si el jugador perdió todo por corriente de aire (lostToWind)', () => {
    const inputs: Record<string, PelusasRoundInput> = {
      p1: { points: 35, lostToWind: true },
    };
    const prev = { p1: 50 };

    const results = engine.calculateRound(1, inputs, prev, defaultConfig);

    expect(results['p1'].roundScore).toBe(0);
    expect(results['p1'].cumulativeScore).toBe(50);
    expect(results['p1'].lostToWind).toBe(true);
  });

  it('acumula puntuaciones consecutivas correctamente', () => {
    let prev = { p1: 0, p2: 0 };

    // Ronda 1
    const r1 = engine.calculateRound(0, { p1: { points: 20 }, p2: { points: 30 } }, prev, defaultConfig);
    prev = { p1: r1['p1'].cumulativeScore, p2: r1['p2'].cumulativeScore };

    // Ronda 2
    const r2 = engine.calculateRound(1, { p1: { points: 15 }, p2: { points: 0, lostToWind: true } }, prev, defaultConfig);

    expect(r2['p1'].cumulativeScore).toBe(35);
    expect(r2['p2'].cumulativeScore).toBe(30);
  });

  it('detecta fin de partida por número de rondas y declara ganador al de mayor puntaje', () => {
    const totalScores = { p1: 65, p2: 45, p3: 80 };

    const statusNotOver = engine.evaluateMatchStatus(totalScores, 2, defaultConfig);
    expect(statusNotOver.isGameOver).toBe(false);

    const statusGameOver = engine.evaluateMatchStatus(totalScores, 3, defaultConfig);
    expect(statusGameOver.isGameOver).toBe(true);
    expect(statusGameOver.winnerIds).toEqual(['p3']);
    expect(statusGameOver.rankings[0].playerId).toBe('p3');
    expect(statusGameOver.rankings[0].rank).toBe(1);
    expect(statusGameOver.rankings[2].playerId).toBe('p2');
  });

  it('desempata usando el criterio oficial de más cartas de 1 cuando hay empate en puntos', () => {
    const totalScores = { p1: 50, p2: 50 };
    const allRoundResults = [
      {
        p1: { roundScore: 50, cumulativeScore: 50, lostToWind: false, totalCardsCount: 8, cardCounts: { 1: 4, 10: 4 } }, // 4 unos
        p2: { roundScore: 50, cumulativeScore: 50, lostToWind: false, totalCardsCount: 6, cardCounts: { 1: 2, 8: 6 } },  // 2 unos
      },
    ];

    const status = engine.evaluateMatchStatus(totalScores, 3, defaultConfig, allRoundResults);

    expect(status.isGameOver).toBe(true);
    expect(status.winnerIds).toEqual(['p1']); // p1 tiene 4 unos vs 2 unos de p2
    expect(status.rankings[0].playerId).toBe('p1');
    expect(status.rankings[1].playerId).toBe('p2');
  });

  it('permite finalizar partida por puntaje objetivo (targetScore)', () => {
    const configWithTarget: PelusasConfig = { rounds: 10, targetScore: 100 };
    const totalScores = { p1: 85, p2: 105 };

    const status = engine.evaluateMatchStatus(totalScores, 2, configWithTarget);
    expect(status.isGameOver).toBe(true);
    expect(status.winnerIds).toEqual(['p2']);
  });
});
