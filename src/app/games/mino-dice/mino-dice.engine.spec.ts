import { describe, it, expect } from 'vitest';
import { MinoDiceEngine } from './mino-dice.engine';

describe('MinoDiceEngine', () => {
  const engine = new MinoDiceEngine();
  const defaultConfig = { rounds: 8, enableBonuses: true };

  it('calculates correct points when bid is achieved (> 0)', () => {
    const inputs = {
      p1: { bid: 3, tricks: 3, bonusPoints: 0 },
      p2: { bid: 1, tricks: 1, bonusPoints: 0 },
    };
    const prev = { p1: 10, p2: 20 };

    // Ronda 4 (roundIndex = 3)
    const res = engine.calculateRound(3, inputs, prev, defaultConfig);

    expect(res['p1'].bidMade).toBe(true);
    expect(res['p1'].roundScore).toBe(60); // 3 * 20
    expect(res['p1'].cumulativeScore).toBe(70);

    expect(res['p2'].bidMade).toBe(true);
    expect(res['p2'].roundScore).toBe(20); // 1 * 20
    expect(res['p2'].cumulativeScore).toBe(40);
  });

  it('awards 10 * roundNumber for a successful zero bid', () => {
    const inputs = {
      p1: { bid: 0, tricks: 0 },
    };
    const prev = { p1: 50 };

    // Ronda 5 (roundIndex = 4) -> 10 * 5 = 50 pts
    const res = engine.calculateRound(4, inputs, prev, defaultConfig);

    expect(res['p1'].bidMade).toBe(true);
    expect(res['p1'].roundScore).toBe(50);
    expect(res['p1'].cumulativeScore).toBe(100);
  });

  it('penalizes -10 * roundNumber for a failed zero bid', () => {
    const inputs = {
      p1: { bid: 0, tricks: 2 }, // Tomó 2 bazas habiendo apostado 0
    };
    const prev = { p1: 80 };

    // Ronda 6 (roundIndex = 5) -> -10 * 6 = -60 pts
    const res = engine.calculateRound(5, inputs, prev, defaultConfig);

    expect(res['p1'].bidMade).toBe(false);
    expect(res['p1'].roundScore).toBe(-60);
    expect(res['p1'].cumulativeScore).toBe(20);
  });

  it('penalizes -10 * diff for missed bids (> 0)', () => {
    const inputs = {
      p1: { bid: 4, tricks: 2 }, // diff = 2 -> -20 pts
      p2: { bid: 1, tricks: 3 }, // diff = 2 -> -20 pts
    };
    const prev = { p1: 40, p2: 30 };

    const res = engine.calculateRound(3, inputs, prev, defaultConfig);

    expect(res['p1'].bidMade).toBe(false);
    expect(res['p1'].roundScore).toBe(-20);
    expect(res['p1'].cumulativeScore).toBe(20);

    expect(res['p2'].bidMade).toBe(false);
    expect(res['p2'].roundScore).toBe(-20);
    expect(res['p2'].cumulativeScore).toBe(10);
  });

  it('applies creature bonuses only when bid is achieved and bonuses enabled', () => {
    const inputs = {
      p1: { bid: 2, tricks: 2, bonusPoints: 30 }, // Minotauro vence Grifo (+30) con apuesta acertada
      p2: { bid: 2, tricks: 1, bonusPoints: 50 }, // Sirena vence Minotauro (+50) pero falló apuesta
    };
    const prev = { p1: 0, p2: 0 };

    const res = engine.calculateRound(2, inputs, prev, defaultConfig);

    // p1 acertó: 2 * 20 + 30 = 70 pts
    expect(res['p1'].bidMade).toBe(true);
    expect(res['p1'].bonusPoints).toBe(30);
    expect(res['p1'].roundScore).toBe(70);

    // p2 falló: diff = 1 -> -10 pts, bonificación de 50 se anula
    expect(res['p2'].bidMade).toBe(false);
    expect(res['p2'].bonusPoints).toBe(0);
    expect(res['p2'].roundScore).toBe(-10);
  });

  it('ignores bonuses when enableBonuses config is false', () => {
    const inputs = {
      p1: { bid: 1, tricks: 1, bonusPoints: 50 },
    };
    const prev = { p1: 0 };

    const res = engine.calculateRound(1, inputs, prev, { rounds: 8, enableBonuses: false });

    // Bono no aplicado: 1 * 20 = 20 pts
    expect(res['p1'].roundScore).toBe(20);
    expect(res['p1'].bonusPoints).toBe(0);
  });

  it('evaluates match completion and determines winner correctly', () => {
    const scores = {
      p1: 180,
      p2: 240, // Ganador
      p3: 90,
    };

    const statusNotOver = engine.evaluateMatchStatus(scores, 7, { rounds: 8, enableBonuses: true });
    expect(statusNotOver.isGameOver).toBe(false);

    const statusOver = engine.evaluateMatchStatus(scores, 8, { rounds: 8, enableBonuses: true });
    expect(statusOver.isGameOver).toBe(true);
    expect(statusOver.winnerIds).toEqual(['p2']);
  });
});
