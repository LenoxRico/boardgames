export interface Player {
  id: string;
  name: string;
  avatarSeed?: string;
}

export interface PlayerScoreSummary {
  playerId: string;
  score: number;
  rank: number;
  isWinner?: boolean;
  isLoser?: boolean;
}

export interface RoundRecord<TRoundData = any> {
  roundNumber: number;
  timestamp: number;
  data: Record<string, TRoundData>;
  roundPoints: Record<string, number>;
  cumulativeScores: Record<string, number>;
}

export type MatchStatus = 'in_progress' | 'completed';

export interface MatchRecord<TConfig = any, TRoundData = any> {
  id: string;
  gameId: string;
  status: MatchStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  dealerPlayerId?: string;
  players: Player[];
  config: TConfig;
  currentRound: number;
  rounds: RoundRecord<TRoundData>[];
  currentDraftRoundData?: Record<string, TRoundData>;
  cumulativeScores: Record<string, number>;
  finalRankings?: PlayerScoreSummary[];
}
