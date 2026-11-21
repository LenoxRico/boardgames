import { MatchRecord } from './match.interface';

export const CURRENT_SCHEMA_VERSION = 1;

export interface AppStorageSchema {
  schemaVersion: number;
  activeMatches: Record<string, MatchRecord>;
  completedMatches: MatchRecord[];
  recentPlayers: string[];
  preferences: {
    theme: 'dark' | 'light' | 'system';
    preferredLanguage: 'es' | 'en';
    enableHaptics: boolean;
  };
}

export const INITIAL_STORAGE_STATE: AppStorageSchema = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  activeMatches: {},
  completedMatches: [],
  recentPlayers: ['Lenox', 'Alejo'],
  preferences: {
    theme: 'dark',
    preferredLanguage: 'es',
    enableHaptics: true,
  },
};
