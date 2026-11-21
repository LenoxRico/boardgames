import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameRegistryService } from '../../core/services/game-registry.service';
import { StorageService } from '../../core/services/storage.service';
import { MatchManagerService } from '../../core/services/match-manager.service';
import { GameDefinition } from '../../core/models/game.interface';

@Component({
  selector: 'app-new-match',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="new-match-page">
      @if (selectedGame(); as game) {
        <div
          class="match-setup-card"
          [style.background-image]="game.metadata.theme?.gradient"
        >
          @if (game.metadata.theme?.bgImageUrl; as bg) {
            <div
              class="card-thematic-art"
              [style.background-image]="'url(' + bg + ')'"
            ></div>
          }

          <!-- Encabezado de Juego -->
          <div class="game-header">
            <div class="game-badge-icon">
              <span class="game-emoji">{{ game.metadata.emoji }}</span>
            </div>
            <div>
              <span class="setup-tag">Configurar Partida</span>
              <h2 class="game-title">{{ game.metadata.name }}</h2>
              <span class="game-limits">
                {{ game.metadata.minPlayers }} a {{ game.metadata.maxPlayers }} jugadores •
                {{ game.metadata.victoryType === 'lowest_score' ? 'Menor puntaje gana' : 'Mayor puntaje gana' }}
              </span>
            </div>
          </div>

          <!-- SECCIÓN 1: Jugadores -->
          <div class="setup-section">
            <div class="section-title-row">
              <h3 class="section-title">
                <span class="material-symbols-outlined">group</span>
                Jugadores en Mesa ({{ players().length }})
              </h3>
              <span class="player-count-badge" [class.valid-count]="isPlayerCountValid()">
                Min {{ game.metadata.minPlayers }} - Max {{ game.metadata.maxPlayers }}
              </span>
            </div>

            <!-- Sugerencias de jugadores recientes -->
            @if (recentSuggestions().length > 0) {
              <div class="recent-players-bar">
                <span class="recent-label">Recientes:</span>
                <div class="recent-chips">
                  @for (name of recentSuggestions(); track name) {
                    <button
                      type="button"
                      class="recent-chip"
                      (click)="addPlayerName(name)"
                      [disabled]="hasPlayer(name) || players().length >= game.metadata.maxPlayers"
                    >
                      <span>+ {{ name }}</span>
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Input para añadir jugador -->
            <div class="add-player-row">
              <input
                type="text"
                class="player-input"
                [(ngModel)]="newPlayerName"
                placeholder="Nombre del jugador..."
                (keyup.enter)="addCurrentPlayer()"
                [disabled]="players().length >= game.metadata.maxPlayers"
              />
              <button
                type="button"
                class="btn-add-player"
                (click)="addCurrentPlayer()"
                [disabled]="!newPlayerName.trim() || players().length >= game.metadata.maxPlayers"
              >
                <span class="material-symbols-outlined">add</span>
                <span>Añadir</span>
              </button>
            </div>

            <!-- Lista de jugadores añadidos -->
            <div class="players-grid">
              @for (player of players(); track player; let idx = $index) {
                <div class="player-item" [class.dealer-item]="dealerIndex() === idx">
                  <div class="player-left">
                    <button
                      type="button"
                      class="dealer-crown-btn"
                      [class.active-dealer]="dealerIndex() === idx"
                      (click)="setDealerIndex(idx)"
                      title="Asignar como repartidor inicial"
                    >
                      👑
                    </button>
                    <span class="player-order-badge">{{ idx + 1 }}</span>
                    <span class="player-list-name">{{ player }}</span>
                    @if (dealerIndex() === idx) {
                      <span class="dealer-label">Reparte 1º</span>
                    }
                  </div>

                  <button
                    type="button"
                    class="btn-remove-player"
                    (click)="removePlayer(idx)"
                    title="Eliminar jugador"
                  >
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- SECCIÓN 2: Opciones de Juego Dinámicas -->
          <div class="setup-section">
            <h3 class="section-title">
              <span class="material-symbols-outlined">tune</span>
              Opciones de Partida
            </h3>

            <div class="config-options-list">
              @for (opt of game.configOptions; track opt.key) {
                <div class="config-item">
                  <div class="config-text">
                    <span class="config-label">{{ opt.label }}</span>
                    @if (opt.description) {
                      <span class="config-desc">{{ opt.description }}</span>
                    }
                  </div>

                  <div class="config-control">
                    @if (opt.type === 'boolean') {
                      <label class="switch">
                        <input
                          type="checkbox"
                          [checked]="configValues()[opt.key]"
                          (change)="setBooleanConfig(opt.key, $event)"
                        />
                        <span class="slider"></span>
                      </label>
                    } @else if (opt.type === 'number') {
                      <div class="number-input-stepper">
                        <button
                          type="button"
                          class="stepper-btn"
                          (click)="adjustNumberConfig(opt.key, -1, opt.min)"
                        >
                          -
                        </button>
                        <span class="stepper-val tabular-nums">{{ configValues()[opt.key] }}</span>
                        <button
                          type="button"
                          class="stepper-btn"
                          (click)="adjustNumberConfig(opt.key, 1, opt.max)"
                        >
                          +
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Botón de Inicio de Partida -->
          <div class="actions-footer">
            <button
              type="button"
              class="btn-start-match"
              [disabled]="!isPlayerCountValid()"
              (click)="startMatch()"
            >
              <span class="material-symbols-outlined">play_circle</span>
              <span>Comenzar Partida ({{ players().length }} Jugadores)</span>
            </button>
          </div>
        </div>
      } @else {
        <div class="not-found-card">
          <p>No se encontró el juego seleccionado.</p>
          <a routerLink="/tabs/catalog" class="btn-back">Volver al Catálogo</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .new-match-page {
      padding: var(--space-md);
      max-width: 800px;
      margin: 0 auto;
      padding-bottom: 90px;
    }

    .match-setup-card {
      position: relative;
      overflow: hidden;
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .card-thematic-art {
      position: absolute;
      top: 0;
      right: 0;
      width: 260px;
      height: 260px;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: top right;
      opacity: 0.6;
      pointer-events: none;
      z-index: 0;
      mask-image: radial-gradient(circle at 100% 0%, rgba(0, 0, 0, 1) 0%, transparent 85%);
      -webkit-mask-image: radial-gradient(circle at 100% 0%, rgba(0, 0, 0, 1) 0%, transparent 85%);
      transition: opacity 0.2s ease;
    }

    :host-context([data-theme="light"]) .card-thematic-art {
      opacity: 0.6;
    }

    .game-header,
    .setup-section,
    .start-match-bar {
      position: relative;
      z-index: 1;
    }

    .game-header {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding-bottom: var(--space-md);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .game-badge-icon {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-lg);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .game-emoji {
      font-size: 30px;
    }

    .setup-tag {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .game-title {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .game-limits {
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .setup-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--color-text-primary);
    }

    .player-count-badge {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-high);
      color: var(--color-text-muted);
    }

    .player-count-badge.valid-count {
      background: var(--color-success-bg);
      color: var(--color-success);
    }

    .recent-players-bar {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      overflow-x: auto;
      padding: 4px 0;
    }

    .recent-label {
      font-size: 12px;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    .recent-chips {
      display: flex;
      gap: 6px;
    }

    .recent-chip {
      padding: 4px 10px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-primary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .recent-chip:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .add-player-row {
      display: flex;
      gap: var(--space-sm);
    }

    .player-input {
      flex: 1;
      min-height: 44px;
      padding: 0 var(--space-md);
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-default);
      color: var(--color-text-primary);
      font-size: 15px;
      font-family: inherit;
    }

    .player-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .btn-add-player {
      min-height: 44px;
      padding: 0 16px;
      border-radius: var(--radius-md);
      background: var(--color-primary-container);
      color: var(--color-primary);
      border: 1px solid var(--color-border-strong);
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }

    .btn-add-player:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .players-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }

    .player-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px var(--space-md);
      background: var(--color-surface-container-high);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);
    }

    .player-item.dealer-item {
      border-color: rgba(163, 206, 241, 0.4);
      background: rgba(39, 76, 119, 0.2);
    }

    .player-left {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .dealer-crown-btn {
      background: transparent;
      border: none;
      font-size: 18px;
      cursor: pointer;
      opacity: 0.4;
      transition: opacity 0.15s ease;
    }

    .dealer-crown-btn.active-dealer {
      opacity: 1;
      transform: scale(1.1);
    }

    .player-order-badge {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--color-surface-container-highest);
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .player-list-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .dealer-label {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: var(--radius-full);
      background: rgba(163, 206, 241, 0.2);
      color: var(--color-primary);
      font-weight: 700;
    }

    .btn-remove-player {
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-remove-player:hover {
      color: var(--color-danger);
    }

    .config-options-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .config-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-sm) var(--space-md);
      background: var(--color-surface-container-high);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);
    }

    .config-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .config-label {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .config-desc {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    /* Switch Style */
    .switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 26px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--color-surface-container-highest);
      transition: 0.2s;
      border-radius: 34px;
      border: 1px solid var(--color-border-subtle);
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: #ffffff;
      transition: 0.2s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--color-primary);
    }

    input:checked + .slider:before {
      transform: translateX(22px);
      background-color: var(--color-on-primary);
    }

    .number-input-stepper {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      background: var(--color-surface-container);
      padding: 4px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-default);
    }

    .stepper-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-container-highest);
      border: none;
      color: var(--color-text-primary);
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
    }

    .stepper-val {
      font-size: 16px;
      font-weight: 800;
      min-width: 30px;
      text-align: center;
      color: var(--color-primary);
    }

    .actions-footer {
      padding-top: var(--space-sm);
    }

    .btn-start-match {
      width: 100%;
      min-height: 50px;
      border-radius: var(--radius-lg);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-size: 16px;
      font-weight: 800;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(163, 206, 241, 0.35);
      transition: transform 0.1s ease;
    }

    .btn-start-match:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-start-match:not(:disabled):active {
      transform: scale(0.98);
    }
  `],
})
export class NewMatchComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private registry = inject(GameRegistryService);
  private storage = inject(StorageService);
  private matchManager = inject(MatchManagerService);

  gameId = signal<string>('skull-king');
  players = signal<string[]>(['Lenox', 'Alejo']);
  dealerIndex = signal<number>(0);
  newPlayerName = '';
  configValues = signal<Record<string, any>>({});

  selectedGame = computed<GameDefinition | undefined>(() => {
    return this.registry.getGame(this.gameId());
  });

  recentSuggestions = computed<string[]>(() => {
    const recent = this.storage.recentPlayers();
    return recent.filter((name) => !this.players().includes(name)).slice(0, 8);
  });

  isPlayerCountValid = computed(() => {
    const game = this.selectedGame();
    if (!game) return false;
    const count = this.players().length;
    return count >= game.metadata.minPlayers && count <= game.metadata.maxPlayers;
  });

  constructor() {
    this.route.params.subscribe((params) => {
      const id = params['gameId'] || 'skull-king';
      this.gameId.set(id);
      this.initDefaultConfig();
    });
  }

  private initDefaultConfig(): void {
    const game = this.selectedGame();
    if (!game) return;

    const initialConfig: Record<string, any> = {};
    game.configOptions.forEach((opt) => {
      initialConfig[opt.key] = opt.defaultValue;
    });
    this.configValues.set(initialConfig);
  }

  hasPlayer(name: string): boolean {
    return this.players().includes(name.trim());
  }

  addPlayerName(name: string): void {
    const clean = name.trim();
    if (!clean || this.hasPlayer(clean)) return;

    const game = this.selectedGame();
    if (game && this.players().length >= game.metadata.maxPlayers) return;

    this.players.update((list) => [...list, clean]);
  }

  addCurrentPlayer(): void {
    if (!this.newPlayerName.trim()) return;
    this.addPlayerName(this.newPlayerName);
    this.newPlayerName = '';
  }

  removePlayer(index: number): void {
    this.players.update((list) => list.filter((_, idx) => idx !== index));
    if (this.dealerIndex() >= this.players().length) {
      this.dealerIndex.set(0);
    }
  }

  setDealerIndex(idx: number): void {
    this.dealerIndex.set(idx);
  }

  setBooleanConfig(key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.configValues.update((cfg) => ({ ...cfg, [key]: checked }));
  }

  adjustNumberConfig(key: string, delta: number, boundary?: number): void {
    this.configValues.update((cfg) => {
      const cur = Number(cfg[key]) || 0;
      const next = cur + delta;
      if (boundary !== undefined) {
        if (delta < 0 && next < boundary) return cfg;
        if (delta > 0 && next > boundary) return cfg;
      }
      return { ...cfg, [key]: next };
    });
  }

  async startMatch(): Promise<void> {
    const game = this.selectedGame();
    if (!game || !this.isPlayerCountValid()) return;

    const playersList = this.players();
    const dealerPlayerName = playersList[this.dealerIndex()];

    const match = await this.matchManager.startNewMatch(
      game.metadata.id,
      playersList,
      this.configValues()
    );

    // Navigate to live scorer
    this.router.navigate(['/match/live', match.id]);
  }
}
