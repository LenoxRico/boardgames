import { Injectable, signal, computed } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  AppStorageSchema,
  CURRENT_SCHEMA_VERSION,
  INITIAL_STORAGE_STATE,
} from '../models/storage.interface';
import { MatchRecord } from '../models/match.interface';

const STORAGE_KEY = 'tabletop_companion_data_v1';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private state = signal<AppStorageSchema>(INITIAL_STORAGE_STATE);
  private isInitialized = false;

  readonly activeMatches = computed(() => this.state().activeMatches);
  readonly completedMatches = computed(() => this.state().completedMatches);
  readonly recentPlayers = computed(() => this.state().recentPlayers);
  readonly preferences = computed(() => this.state().preferences);
  readonly theme = computed(() => this.state().preferences.theme);

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      let loadedData: any = null;

      if (value) {
        loadedData = JSON.parse(value);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        // Fallback reading from localStorage
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) loadedData = JSON.parse(raw);
      }

      if (loadedData) {
        const migrated = this.migrateSchema(loadedData);
        this.state.set(migrated);
      } else {
        // Store initial state
        await this.persist(INITIAL_STORAGE_STATE);
      }
    } catch (err) {
      console.warn('Could not read from Capacitor Preferences, falling back to defaults:', err);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) {
            this.state.set(this.migrateSchema(JSON.parse(raw)));
          }
        } catch (e) {
          console.error('Error reading localStorage fallback:', e);
        }
      }
    } finally {
      this.isInitialized = true;
    }
  }

  private migrateSchema(data: any): AppStorageSchema {
    if (!data || typeof data !== 'object') {
      return { ...INITIAL_STORAGE_STATE };
    }

    const version = data.schemaVersion || 0;
    let migrated: AppStorageSchema = {
      ...INITIAL_STORAGE_STATE,
      ...data,
      activeMatches: data.activeMatches || {},
      completedMatches: Array.isArray(data.completedMatches) ? data.completedMatches : [],
      recentPlayers: Array.isArray(data.recentPlayers) && data.recentPlayers.length > 0
        ? data.recentPlayers
        : INITIAL_STORAGE_STATE.recentPlayers,
      preferences: {
        ...INITIAL_STORAGE_STATE.preferences,
        ...(data.preferences || {}),
      },
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };

    // Future version migrations can be chained here:
    // if (version < 2) { migrated = this.migrateToV2(migrated); }

    return migrated;
  }

  private async persist(newState: AppStorageSchema): Promise<void> {
    const serialized = JSON.stringify(newState);
    try {
      await Preferences.set({ key: STORAGE_KEY, value: serialized });
    } catch (err) {
      console.warn('Preferences.set failed, attempting localStorage fallback:', err);
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, serialized);
      } catch (err) {
        console.error('localStorage.setItem failed:', err);
      }
    }
  }

  async saveActiveMatch(match: MatchRecord): Promise<void> {
    const current = this.state();
    const updatedMatches = {
      ...current.activeMatches,
      [match.id]: {
        ...match,
        status: 'in_progress' as const,
        updatedAt: Date.now(),
      },
    };

    // Also update recent players list
    const playerNames = match.players.map((p) => p.name.trim()).filter((n) => n.length > 0);
    const updatedPlayers = Array.from(new Set([...playerNames, ...current.recentPlayers])).slice(0, 20);

    const newState: AppStorageSchema = {
      ...current,
      activeMatches: updatedMatches,
      recentPlayers: updatedPlayers,
    };

    this.state.set(newState);
    await this.persist(newState);
  }

  async removeActiveMatch(matchId: string): Promise<void> {
    const current = this.state();
    if (!current.activeMatches[matchId]) return;

    const { [matchId]: _, ...remainingActive } = current.activeMatches;
    const newState: AppStorageSchema = {
      ...current,
      activeMatches: remainingActive,
    };

    this.state.set(newState);
    await this.persist(newState);
  }

  async completeMatch(match: MatchRecord): Promise<void> {
    const current = this.state();
    const { [match.id]: _, ...remainingActive } = current.activeMatches;

    const finalizedMatch: MatchRecord = {
      ...match,
      status: 'completed',
      completedAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedCompleted = [
      finalizedMatch,
      ...current.completedMatches.filter((m) => m.id !== match.id),
    ];

    const newState: AppStorageSchema = {
      ...current,
      activeMatches: remainingActive,
      completedMatches: updatedCompleted,
    };

    this.state.set(newState);
    await this.persist(newState);
  }

  async deleteCompletedMatch(matchId: string): Promise<void> {
    const current = this.state();
    const updatedCompleted = current.completedMatches.filter((m) => m.id !== matchId);

    const newState: AppStorageSchema = {
      ...current,
      completedMatches: updatedCompleted,
    };

    this.state.set(newState);
    await this.persist(newState);
  }

  async addRecentPlayer(name: string): Promise<void> {
    const clean = name.trim();
    if (!clean) return;

    const current = this.state();
    const updatedPlayers = Array.from(new Set([clean, ...current.recentPlayers])).slice(0, 20);
    const newState = { ...current, recentPlayers: updatedPlayers };

    this.state.set(newState);
    await this.persist(newState);
  }

  async setTheme(theme: 'dark' | 'light' | 'system'): Promise<void> {
    const current = this.state();
    const newState: AppStorageSchema = {
      ...current,
      preferences: {
        ...current.preferences,
        theme,
      },
    };
    this.state.set(newState);
    await this.persist(newState);
  }

  async setPreferredLanguage(lang: 'es' | 'en'): Promise<void> {
    const current = this.state();
    const newState: AppStorageSchema = {
      ...current,
      preferences: {
        ...current.preferences,
        preferredLanguage: lang,
      },
    };
    this.state.set(newState);
    await this.persist(newState);
  }

  getActiveMatch(matchId: string): MatchRecord | undefined {
    return this.state().activeMatches[matchId];
  }

  getCompletedMatch(matchId: string): MatchRecord | undefined {
    return this.state().completedMatches.find((m) => m.id === matchId);
  }
}
