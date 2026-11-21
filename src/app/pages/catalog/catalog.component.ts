import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GameRegistryService } from '../../core/services/game-registry.service';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="catalog-page">
      <!-- Banner de Partida Activa si existe -->
      @if (latestActiveMatch(); as active) {
        @let game = getGame(active.gameId);
        <div class="active-match-hero">
          <div class="hero-glow"></div>
          <div class="hero-content">
            <div class="hero-header-row">
              <span class="badge badge-pulse">
                <span class="pulse-dot"></span> Mesa en Pausa
              </span>
              <span class="hero-date">Ronda {{ active.currentRound }} en curso</span>
            </div>
            <h2 class="hero-title">{{ game?.metadata?.name || active.gameId }}</h2>
            <p class="hero-players">
              {{ active.players.length }} jugadores en mesa •
              @for (p of active.players; track p.id; let last = $last) {
                <span>{{ p.name }}{{ !last ? ', ' : '' }}</span>
              }
            </p>
            <div class="hero-actions">
              <a [routerLink]="['/match/live', active.id]" class="btn-resume">
                <span class="material-symbols-outlined">play_arrow</span>
                <span>Reanudar Partida</span>
              </a>
            </div>
          </div>
        </div>
      }

      <!-- Título de Sección -->
      <div class="catalog-header">
        <h2 class="section-title">Catálogo de Juegos</h2>
        <span class="section-subtitle">Selecciona un juego para iniciar mesa o consultar arbitraje</span>
      </div>

      <!-- Cuadrícula de Juegos -->
      <div class="games-grid">
        @for (game of games(); track game.metadata.id) {
          <div class="game-card">
            <div class="card-top">
              <div class="game-badge-icon">
                <span class="game-emoji">{{ game.metadata.emoji }}</span>
              </div>
              <div class="card-titles">
                <h3 class="card-game-name">{{ game.metadata.name }}</h3>
                <span class="card-game-sub">{{ game.metadata.subtitle }}</span>
              </div>
            </div>

            <p class="card-tagline">{{ game.metadata.tagline }}</p>

            <div class="card-meta-chips">
              <span class="meta-chip">
                <span class="material-symbols-outlined chip-icon">group</span>
                <span>{{ game.metadata.minPlayers }}-{{ game.metadata.maxPlayers }} jugadores</span>
              </span>
              <span class="meta-chip" [class.chip-lowest]="game.metadata.victoryType === 'lowest_score'">
                <span class="material-symbols-outlined chip-icon">
                  {{ game.metadata.victoryType === 'lowest_score' ? 'arrow_downward' : 'arrow_upward' }}
                </span>
                <span>{{ game.metadata.victoryType === 'lowest_score' ? 'Menor puntaje gana' : 'Mayor puntaje gana' }}</span>
              </span>
              @if (game.metadata.defaultRounds) {
                <span class="meta-chip">
                  <span class="material-symbols-outlined chip-icon">repeat</span>
                  <span>{{ game.metadata.defaultRounds }} rondas</span>
                </span>
              }
            </div>

            <div class="card-actions">
              <a [routerLink]="['/match/new', game.metadata.id]" class="btn-new-match">
                <span class="material-symbols-outlined">add_circle</span>
                <span>Nueva Partida</span>
              </a>
              <a [routerLink]="['/tabs/rules']" [queryParams]="{ game: game.metadata.id }" class="btn-rules">
                <span class="material-symbols-outlined">menu_book</span>
                <span>Reglas</span>
              </a>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .catalog-page {
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
      max-width: 1200px;
      margin: 0 auto;
      padding-bottom: 90px;
    }

    .active-match-hero {
      position: relative;
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(11, 19, 38, 0.4);
    }

    .hero-glow {
      position: absolute;
      top: -40px;
      right: -40px;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: rgba(163, 206, 241, 0.15);
      filter: blur(40px);
      pointer-events: none;
    }

    .hero-content {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .hero-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .hero-date {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .hero-title {
      margin: 4px 0 0 0;
      font-size: 22px;
      font-weight: 800;
      color: var(--color-primary);
    }

    .hero-players {
      margin: 0;
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .hero-actions {
      margin-top: var(--space-sm);
    }

    .btn-resume {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: 10px 18px;
      border-radius: var(--radius-lg);
      background: var(--color-primary);
      color: var(--color-on-primary);
      text-decoration: none;
      font-weight: 800;
      font-size: 14px;
      box-shadow: 0 4px 14px rgba(163, 206, 241, 0.3);
      transition: transform 0.1s ease;
    }

    .btn-resume:active {
      transform: scale(0.97);
    }

    .catalog-header {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .section-title {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .section-subtitle {
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-md);
    }

    .game-card {
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
      transition: border-color 0.15s ease, transform 0.15s ease;
    }

    .game-card:hover {
      border-color: var(--color-primary);
    }

    .card-top {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .game-badge-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .game-emoji {
      font-size: 26px;
    }

    .card-titles {
      display: flex;
      flex-direction: column;
    }

    .card-game-name {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .card-game-sub {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .card-tagline {
      margin: 0;
      font-size: 13px;
      color: var(--color-text-secondary);
      line-height: 1.4;
      min-height: 36px;
    }

    .card-meta-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: var(--space-xs) 0;
    }

    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .meta-chip.chip-lowest {
      border-color: rgba(96, 150, 186, 0.3);
      color: var(--color-primary);
    }

    .chip-icon {
      font-size: 14px;
    }

    .card-actions {
      display: flex;
      gap: var(--space-sm);
      margin-top: auto;
      padding-top: var(--space-xs);
    }

    .btn-new-match {
      flex: 1;
      min-height: 44px;
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: var(--color-on-primary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 2px 8px rgba(163, 206, 241, 0.25);
    }

    .btn-rules {
      min-height: 44px;
      padding: 0 16px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-primary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .badge-pulse {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: rgba(163, 206, 241, 0.15);
      border: 1px solid rgba(163, 206, 241, 0.3);
      color: var(--color-primary);
      font-size: 11px;
      font-weight: 700;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-primary);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { opacity: 0.4; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.1); }
      100% { opacity: 0.4; transform: scale(0.9); }
    }
  `],
})
export class CatalogComponent {
  private registry = inject(GameRegistryService);
  private storage = inject(StorageService);

  readonly games = this.registry.games;

  readonly latestActiveMatch = computed(() => {
    const active = Object.values(this.storage.activeMatches());
    if (active.length === 0) return null;
    active.sort((a, b) => b.updatedAt - a.updatedAt);
    return active[0];
  });

  getGame(id: string) {
    return this.registry.getGame(id);
  }
}
