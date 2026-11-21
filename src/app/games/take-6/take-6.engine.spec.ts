import { describe, it, expect } from 'vitest';
import { Take6Engine } from './take-6.engine';

describe('Take6Engine', () => {
  const engine = new Take6Engine();

  it('calculates round points and adds to previous score', () => {
    const inputs = {
      p1: { bullheads: 4 },
      p2: { bullheads: 12 },
    };
    const prev = {
      p1: 10,
      p2: 25,
    };

    const res = engine.calculateRound(1, inputs, prev, { scoreLimit: 66 });

    expect(res['p1'].roundScore).toBe(4);
    expect(res['p1'].cumulativeScore).toBe(14);
    expect(res['p2'].roundScore).toBe(12);
    expect(res['p2'].cumulativeScore).toBe(37);
  });

  it('does not end match when all players are below score limit in classic mode', () => {
    const totalScores = {
      p1: 14,
      p2: 30,
      p3: 48,
      p4: 65, // Close, but not >= 66
    };

    const status = engine.evaluateMatchStatus(totalScores, 4, { scoreLimit: 66 });
    expect(status.isGameOver).toBe(false);
  });

  it('ends match when at least one player hits or exceeds score limit in classic mode', () => {
    const totalScores = {
      p1: 14,
      p2: 30,
      p3: 48,
      p4: 67, // Reached or exceeded 66!
    };

    const status = engine.evaluateMatchStatus(totalScores, 4, { scoreLimit: 66 });
    expect(status.isGameOver).toBe(true);
    expect(status.winnerIds).toEqual(['p1']);
    expect(status.loserIds).toEqual(['p4']);
  });

  it('handles roundsMode (4 rounds mode): game over at 4 rounds, highest score loses, lowest wins', () => {
    const totalScores = {
      p1: 12, // menor puntaje -> ganador
      p2: 24,
      p3: 35, // mayor puntaje -> perdedor
    };

    // Ronda 3 -> no termina
    const statusR3 = engine.evaluateMatchStatus(totalScores, 3, { scoreLimit: 66, roundsMode: true, roundsCount: 4 });
    expect(statusR3.isGameOver).toBe(false);

    // Ronda 4 -> termina
    const statusR4 = engine.evaluateMatchStatus(totalScores, 4, { scoreLimit: 66, roundsMode: true, roundsCount: 4 });
    expect(statusR4.isGameOver).toBe(true);
    expect(statusR4.winnerIds).toEqual(['p1']);
    expect(statusR4.loserIds).toEqual(['p3']);
    expect(statusR4.reason).toContain('4 rondas');
  });

  it('handles ties for winner and loser properly in rounds mode', () => {
    const totalScores = {
      p1: 15,
      p2: 15, // Empate menor
      p3: 40,
      p4: 40, // Empate mayor
    };

    const status = engine.evaluateMatchStatus(totalScores, 4, { scoreLimit: 66, roundsMode: true });
    expect(status.isGameOver).toBe(true);
    expect(status.winnerIds).toEqual(['p1', 'p2']);
    expect(status.loserIds).toEqual(['p3', 'p4']);
  });
});
