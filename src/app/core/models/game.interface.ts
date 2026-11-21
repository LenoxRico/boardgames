import { Type } from '@angular/core';

export type VictoryConditionType = 'highest_score' | 'lowest_score';

export interface GameVisualTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gradient: string;
  bgImageUrl: string;
}

export interface GameMetadata {
  id: string;
  name: string;
  subtitle?: string;
  icon: string;
  emoji: string;
  minPlayers: number;
  maxPlayers: number;
  defaultRounds?: number;
  victoryType: VictoryConditionType;
  hasLoser: boolean;
  scoreUnit: string;
  tagline: string;
  theme?: GameVisualTheme;
}

export interface GameConfigOption<T = unknown> {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'select';
  defaultValue: T;
  description?: string;
  min?: number;
  max?: number;
  options?: { label: string; value: T }[];
}

export interface GameRuleSection {
  id: string;
  title: string;
  icon?: string;
  content: string;
  highlights?: string[];
}

export interface GameRulesContent {
  summary: GameRuleSection[];
  full: GameRuleSection[];
}

export interface GameRules {
  languages: ('es' | 'en')[];
  content: {
    es: GameRulesContent;
    en?: GameRulesContent;
  };
}

export interface GameEngine<TConfig = any, TRoundInput = any, TRoundResult = any> {
  calculateRound(
    roundIndex: number,
    inputs: Record<string, TRoundInput>,
    previousScores: Record<string, number>,
    config: TConfig
  ): Record<string, TRoundResult>;

  evaluateMatchStatus(
    totalScores: Record<string, number>,
    roundsPlayed: number,
    config: TConfig
  ): { isGameOver: boolean; reason?: string; winnerIds: string[]; loserIds?: string[] };
}

export interface GameDefinition<TConfig = any, TRoundInput = any, TRoundResult = any> {
  metadata: GameMetadata;
  configOptions: GameConfigOption[];
  rules: GameRules;
  engine: GameEngine<TConfig, TRoundInput, TRoundResult>;
  scorerComponent: Type<any>;
}
