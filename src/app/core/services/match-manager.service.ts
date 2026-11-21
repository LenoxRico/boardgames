import { Injectable, signal, computed, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { GameRegistryService } from './game-registry.service';
import { MatchRecord, Player, RoundRecord, PlayerScoreSummary } from '../models/match.interface';

@Injectable({
  providedIn: 'root',
})
export class MatchManagerService {
  private storage = inject(StorageService);
  private registry = inject(GameRegistryService);

  readonly currentMatch = signal<MatchRecord | null>(null);

  readonly isGameOver = computed(() => {
    const match = this.currentMatch();
    if (!match) return false;
    const game = this.registry.getGame(match.gameId);
    if (!game) return false;

    const evaluation = game.engine.evaluateMatchStatus(
      match.cumulativeScores,
      match.rounds.length,
      match.config
    );
    return evaluation.isGameOver;
  });

  readonly currentRankings = computed<PlayerScoreSummary[]>(() => {
    const match = this.currentMatch();
    if (!match) return [];
    const game = this.registry.getGame(match.gameId);
    if (!game) return [];

    const isLowestWins = game.metadata.victoryType === 'lowest_score';
    const entries = match.players.map((p) => ({
      playerId: p.id,
      score: match.cumulativeScores[p.id] ?? 0,
    }));

    entries.sort((a, b) => (isLowestWins ? a.score - b.score : b.score - a.score));

    const evaluation = game.engine.evaluateMatchStatus(
      match.cumulativeScores,
      match.rounds.length,
      match.config
    );

    return entries.map((entry, index) => ({
      playerId: entry.playerId,
      score: entry.score,
      rank: index + 1,
      isWinner: evaluation.winnerIds?.includes(entry.playerId),
      isLoser: evaluation.loserIds?.includes(entry.playerId),
    }));
  });

  async startNewMatch(
    gameId: string,
    playerNames: string[],
    config: any,
    dealerPlayerId?: string
  ): Promise<MatchRecord> {
    const game = this.registry.getGame(gameId);
    if (!game) throw new Error(`Game ${gameId} not found`);

    const players: Player[] = playerNames.map((name, idx) => ({
      id: `p_${Date.now()}_${idx + 1}`,
      name: name.trim() || `Jugador ${idx + 1}`,
    }));

    const initialScores: Record<string, number> = {};
    players.forEach((p) => {
      initialScores[p.id] = 0;
    });

    const match: MatchRecord = {
      id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      gameId,
      status: 'in_progress',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dealerPlayerId: dealerPlayerId || players[0]?.id,
      players,
      config,
      currentRound: 1,
      rounds: [],
      currentDraftRoundData: {},
      cumulativeScores: initialScores,
    };

    this.currentMatch.set(match);
    await this.storage.saveActiveMatch(match);
    return match;
  }

  loadMatch(matchId: string): boolean {
    const match = this.storage.getActiveMatch(matchId) || this.storage.getCompletedMatch(matchId);
    if (match) {
      this.currentMatch.set(match);
      return true;
    }
    return false;
  }

  async saveDraftRoundData(draftData: Record<string, any>): Promise<void> {
    const match = this.currentMatch();
    if (!match || match.status !== 'in_progress') return;

    const updatedMatch: MatchRecord = {
      ...match,
      currentDraftRoundData: draftData,
      updatedAt: Date.now(),
    };

    this.currentMatch.set(updatedMatch);
    await this.storage.saveActiveMatch(updatedMatch);
  }

  async commitRound(roundData: Record<string, any>): Promise<void> {
    const match = this.currentMatch();
    if (!match) return;
    const game = this.registry.getGame(match.gameId);
    if (!game) return;

    const roundIndex = match.rounds.length;
    const roundNumber = roundIndex + 1;

    // Previous scores before this round
    const prevScores = roundIndex > 0 ? match.rounds[roundIndex - 1].cumulativeScores : {};
    match.players.forEach((p) => {
      if (prevScores[p.id] === undefined) prevScores[p.id] = 0;
    });

    const calculated = game.engine.calculateRound(roundIndex, roundData, prevScores, match.config);

    const roundPoints: Record<string, number> = {};
    const cumulativeScores: Record<string, number> = {};

    for (const player of match.players) {
      const res = calculated[player.id];
      roundPoints[player.id] = res?.roundScore ?? 0;
      cumulativeScores[player.id] = res?.cumulativeScore ?? prevScores[player.id] ?? 0;
    }

    const newRound: RoundRecord = {
      roundNumber,
      timestamp: Date.now(),
      data: roundData,
      roundPoints,
      cumulativeScores,
    };

    const updatedRounds = [...match.rounds, newRound];

    // Rotate dealer for next round
    const currentDealerIdx = match.players.findIndex((p) => p.id === match.dealerPlayerId);
    const nextDealerIdx = (currentDealerIdx + 1) % match.players.length;
    const nextDealerId = match.players[nextDealerIdx]?.id;

    const updatedMatch: MatchRecord = {
      ...match,
      rounds: updatedRounds,
      currentRound: roundNumber + 1,
      currentDraftRoundData: {},
      cumulativeScores,
      dealerPlayerId: nextDealerId,
      updatedAt: Date.now(),
    };

    this.currentMatch.set(updatedMatch);
    await this.storage.saveActiveMatch(updatedMatch);

    // Check if game has reached completion condition
    const evaluation = game.engine.evaluateMatchStatus(
      cumulativeScores,
      updatedRounds.length,
      match.config
    );

    if (evaluation.isGameOver) {
      await this.finalizeMatch();
    }
  }

  async rollbackToRound(targetRoundNumber: number): Promise<void> {
    const match = this.currentMatch();
    if (!match || targetRoundNumber < 1) return;

    const keptRounds = match.rounds.filter((r) => r.roundNumber < targetRoundNumber);
    const targetRoundRecord = match.rounds.find((r) => r.roundNumber === targetRoundNumber);

    const lastKeptRound = keptRounds[keptRounds.length - 1];
    const newCumulative: Record<string, number> = {};

    match.players.forEach((p) => {
      newCumulative[p.id] = lastKeptRound ? lastKeptRound.cumulativeScores[p.id] ?? 0 : 0;
    });

    const updatedMatch: MatchRecord = {
      ...match,
      rounds: keptRounds,
      currentRound: targetRoundNumber,
      currentDraftRoundData: targetRoundRecord?.data || {},
      cumulativeScores: newCumulative,
      status: 'in_progress',
      updatedAt: Date.now(),
    };

    this.currentMatch.set(updatedMatch);
    await this.storage.saveActiveMatch(updatedMatch);
  }

  async finalizeMatch(): Promise<void> {
    const match = this.currentMatch();
    if (!match) return;
    const game = this.registry.getGame(match.gameId);
    if (!game) return;

    const isLowestWins = game.metadata.victoryType === 'lowest_score';
    const entries = match.players.map((p) => ({
      playerId: p.id,
      score: match.cumulativeScores[p.id] ?? 0,
    }));
    entries.sort((a, b) => (isLowestWins ? a.score - b.score : b.score - a.score));

    const evaluation = game.engine.evaluateMatchStatus(
      match.cumulativeScores,
      match.rounds.length,
      match.config
    );

    const finalRankings: PlayerScoreSummary[] = entries.map((entry, index) => ({
      playerId: entry.playerId,
      score: entry.score,
      rank: index + 1,
      isWinner: evaluation.winnerIds?.includes(entry.playerId),
      isLoser: evaluation.loserIds?.includes(entry.playerId),
    }));

    const completed: MatchRecord = {
      ...match,
      status: 'completed',
      completedAt: Date.now(),
      updatedAt: Date.now(),
      finalRankings,
    };

    this.currentMatch.set(completed);
    await this.storage.completeMatch(completed);
  }
}
