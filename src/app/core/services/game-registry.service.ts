import { Injectable, signal, computed } from '@angular/core';
import { GameDefinition } from '../models/game.interface';
import { SKULL_KING_DEFINITION } from '../../games/skull-king/skull-king.definition';
import { TAKE_6_DEFINITION } from '../../games/take-6/take-6.definition';
import { MINO_DICE_DEFINITION } from '../../games/mino-dice/mino-dice.definition';
import { PELUSAS_DEFINITION } from '../../games/pelusas/pelusas.definition';

@Injectable({
  providedIn: 'root',
})
export class GameRegistryService {
  private gamesMap = signal<Map<string, GameDefinition>>(new Map());

  readonly games = computed(() => Array.from(this.gamesMap().values()));

  constructor() {
    // Register initial core games
    this.register(SKULL_KING_DEFINITION);
    this.register(TAKE_6_DEFINITION);
    this.register(MINO_DICE_DEFINITION);
    this.register(PELUSAS_DEFINITION);
  }

  register(definition: GameDefinition): void {
    this.gamesMap.update((map) => {
      const newMap = new Map(map);
      newMap.set(definition.metadata.id, definition);
      return newMap;
    });
  }

  getGame(id: string): GameDefinition | undefined {
    return this.gamesMap().get(id);
  }

  hasGame(id: string): boolean {
    return this.gamesMap().has(id);
  }
}
