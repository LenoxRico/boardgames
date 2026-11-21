import { describe, it, expect } from 'vitest';
import { SkullKingEngine } from './skull-king.engine';

describe('SkullKingEngine', () => {
  const engine = new SkullKingEngine();

  it('calculates successful non-zero bid (+20 per trick)', () => {
    const inputs = {
      p1: { bid: 3, tricks: 3, bonusPoints: 0 },
    };
    const prev = { p1: 100 };
    const res = engine.calculateRound(4, inputs, prev, { rounds: 10, recentRules: false });

    expect(res['p1'].bidMade).toBe(true);
    expect(res['p1'].basePoints).toBe(60);
    expect(res['p1'].roundScore).toBe(60);
    expect(res['p1'].cumulativeScore).toBe(160);
  });

  it('calculates successful zero bid (+10 * roundNumber)', () => {
    // Round 5 (index 4) -> 5 * 10 = +50
    const inputs = {
      p1: { bid: 0, tricks: 0, bonusPoints: 0 },
    };
    const prev = { p1: 50 };
    const res = engine.calculateRound(4, inputs, prev, { rounds: 10, recentRules: false });

    expect(res['p1'].bidMade).toBe(true);
    expect(res['p1'].basePoints).toBe(50);
    expect(res['p1'].roundScore).toBe(50);
    expect(res['p1'].cumulativeScore).toBe(100);
  });

  it('calculates failed non-zero bid (-10 per trick difference)', () => {
    // Bid 3, won 1 trick -> diff = 2 -> -20
    const inputs = {
      p1: { bid: 3, tricks: 1, bonusPoints: 0 },
    };
    const prev = { p1: 80 };
    const res = engine.calculateRound(4, inputs, prev, { rounds: 10, recentRules: false });

    expect(res['p1'].bidMade).toBe(false);
    expect(res['p1'].basePoints).toBe(-20);
    expect(res['p1'].roundScore).toBe(-20);
    expect(res['p1'].cumulativeScore).toBe(60);
  });

  it('calculates failed zero bid (-10 * roundNumber)', () => {
    // Round 7 (index 6) with bid 0, won 1 trick -> failed 0-bid: -70
    const inputs = {
      p1: { bid: 0, tricks: 1, bonusPoints: 0 },
    };
    const prev = { p1: 120 };
    const res = engine.calculateRound(6, inputs, prev, { rounds: 10, recentRules: false });

    expect(res['p1'].bidMade).toBe(false);
    expect(res['p1'].basePoints).toBe(-70);
    expect(res['p1'].roundScore).toBe(-70);
    expect(res['p1'].cumulativeScore).toBe(50);
  });

  it('includes bonus points when recentRules is true and bid is achieved', () => {
    const inputs = {
      p1: { bid: 2, tricks: 2, bonusPoints: 50 }, // e.g. +30 SK vs Pirate, +20 loot
    };
    const prev = { p1: 0 };
    const res = engine.calculateRound(2, inputs, prev, { rounds: 10, recentRules: true });

    expect(res['p1'].bidMade).toBe(true);
    expect(res['p1'].basePoints).toBe(40);
    expect(res['p1'].bonusPoints).toBe(50);
    expect(res['p1'].roundScore).toBe(90);
    expect(res['p1'].cumulativeScore).toBe(90);
  });

  it('ignores bonus points if recentRules is true but bid was failed', () => {
    const inputs = {
      p1: { bid: 3, tricks: 2, bonusPoints: 50 },
    };
    const prev = { p1: 100 };
    const res = engine.calculateRound(3, inputs, prev, { rounds: 10, recentRules: true });

    expect(res['p1'].bidMade).toBe(false);
    expect(res['p1'].basePoints).toBe(-10);
    expect(res['p1'].bonusPoints).toBe(0);
    expect(res['p1'].roundScore).toBe(-10);
  });

  it('evaluates game over when reaching target rounds and identifies highest score winner', () => {
    const totalScores = {
      p1: 180,
      p2: 240,
      p3: 110,
    };
    const statusNotOver = engine.evaluateMatchStatus(totalScores, 9, { rounds: 10, recentRules: true });
    expect(statusNotOver.isGameOver).toBe(false);

    const statusOver = engine.evaluateMatchStatus(totalScores, 10, { rounds: 10, recentRules: true });
    expect(statusOver.isGameOver).toBe(true);
    expect(statusOver.winnerIds).toEqual(['p2']);
    expect(statusOver.loserIds).toEqual(['p3']);
  });
});
