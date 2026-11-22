import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { GameRegistryService } from '../../core/services/game-registry.service';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="catalog-page">
      <!-- Banner de Partidas Activas en Pausa si existen -->
      @if (activeMatches().length > 0) {
        <div
          class="active-match-hero"
          [style.background-image]="heroBackgroundGradient()"
          (click)="openResumeModal()"
        >
          <div class="hero-glow"></div>
          @if (heroThematicArt(); as bg) {
            <div
              class="hero-thematic-art"
              [style.background-image]="'url(' + bg + ')'"
            ></div>
          }
          <div class="hero-content">
            <div class="hero-header-row">
              <span class="badge badge-pulse">
                <span class="pulse-dot"></span> Mesas en Pausa
              </span>
              <span class="hero-date">
                {{ activeMatches().length }} {{ activeMatches().length === 1 ? 'partida en pausa' : 'partidas en pausa' }}
              </span>
            </div>
            <h2 class="hero-title">
              @if (activeMatches().length === 1) {
                1 Partida en Pausa
              } @else {
                {{ activeMatches().length }} Partidas en Pausa
              }
            </h2>
            <p class="hero-players">
              @if (activeMatches().length === 1) {
                @let active = activeMatches()[0];
                {{ getGame(active.gameId)?.metadata?.name || active.gameId }} (Ronda {{ active.currentRound }}) • {{ active.players.length }} jugadores:
                @for (p of active.players; track p.id; let last = $last) {
                  <span>{{ p.name }}{{ !last ? ', ' : '' }}</span>
                }
              } @else {
                Mesas activas:
                @for (m of activeMatches(); track m.id; let last = $last) {
                  <span>{{ getGame(m.gameId)?.metadata?.name || m.gameId }} (Ronda {{ m.currentRound }}){{ !last ? ', ' : '' }}</span>
                }
              }
            </p>
            <div class="hero-actions">
              <button
                type="button"
                class="btn-resume"
                (click)="$event.stopPropagation(); openResumeModal()"
              >
                <span class="material-symbols-outlined">play_arrow</span>
                <span>
                  @if (activeMatches().length === 1) {
                    Reanudar Partida
                  } @else {
                    Elegir Partida a Reanudar
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Selector de Partida a Reanudar -->
      @if (showResumeModal()) {
        <div class="modal-overlay" (click)="closeResumeModal()">
          <div class="modal-dialog-card resume-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-group">
                <div class="modal-icon-badge">
                  <span class="material-symbols-outlined">pause_circle</span>
                </div>
                <div>
                  <h3 class="modal-title">¿Qué partida deseas reanudar?</h3>
                  <span class="modal-subtitle">
                    Selecciona una de tus {{ activeMatches().length }} {{ activeMatches().length === 1 ? 'mesa guardada' : 'mesas guardadas' }}
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="btn-close-modal"
                (click)="closeResumeModal()"
                aria-label="Cerrar ventana"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="paused-matches-list">
              @for (m of activeMatches(); track m.id) {
                @let g = getGame(m.gameId);
                <div class="paused-match-item" (click)="resumeMatch(m.id)">
                  <div class="item-badge-icon">
                    <span class="item-emoji">{{ g?.metadata?.emoji || '🎲' }}</span>
                  </div>
                  <div class="item-info">
                    <div class="item-top">
                      <span class="item-game-name">{{ g?.metadata?.name || m.gameId }}</span>
                      <span class="item-round-chip">Ronda {{ m.currentRound }}</span>
                    </div>
                    <div class="item-meta">
                      <div class="item-players">
                        <span class="material-symbols-outlined player-icon">group</span>
                        <span class="player-names">
                          {{ m.players.length }} jugadores:
                          @for (p of m.players; track p.id; let last = $last) {
                            {{ p.name }}{{ !last ? ', ' : '' }}
                          }
                        </span>
                      </div>
                      <span class="item-date">{{ m.updatedAt | date: 'd MMM, HH:mm' }}</span>
                    </div>
                  </div>
                  <div class="item-action">
                    <button type="button" class="btn-item-resume">
                      <span class="material-symbols-outlined">play_arrow</span>
                      <span>Reanudar</span>
                    </button>
                  </div>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-modal-cancel" (click)="closeResumeModal()">
                Cancelar
              </button>
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
          <div class="game-card" [style.background-image]="game.metadata.theme?.gradient">
            @if (game.metadata.theme?.bgImageUrl; as bg) {
              <div
                class="card-thematic-art"
                [style.background-image]="'url(' + bg + ')'"
              ></div>
            }
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
      cursor: pointer;
      transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    }

    :host-context([data-theme="light"]) .active-match-hero {
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
      border-color: var(--color-border-default);
    }

    .active-match-hero:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }

    :host-context([data-theme="light"]) .active-match-hero:hover {
      border-color: var(--color-primary);
      box-shadow: 0 8px 24px rgba(39, 76, 119, 0.14);
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

    :host-context([data-theme="light"]) .hero-glow {
      background: rgba(39, 76, 119, 0.08);
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
      border: none;
      cursor: pointer;
      font-weight: 800;
      font-size: 14px;
      box-shadow: 0 4px 14px rgba(163, 206, 241, 0.3);
      transition: transform 0.1s ease, box-shadow 0.15s ease;
    }

    :host-context([data-theme="light"]) .btn-resume {
      box-shadow: 0 4px 14px rgba(39, 76, 119, 0.25);
    }

    .btn-resume:hover {
      transform: scale(1.02);
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

    .hero-thematic-art {
      position: absolute;
      top: 0;
      right: 0;
      width: 320px;
      height: 100%;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: top right;
      opacity: 0.6;
      pointer-events: none;
      z-index: 1;
      mask-image: radial-gradient(circle at 100% 0%, rgba(0, 0, 0, 1) 0%, transparent 80%);
      -webkit-mask-image: radial-gradient(circle at 100% 0%, rgba(0, 0, 0, 1) 0%, transparent 80%);
    }

    :host-context([data-theme="light"]) .hero-thematic-art {
      opacity: 0.6;
    }

    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-md);
    }

    .game-card {
      position: relative;
      overflow: hidden;
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

    .card-thematic-art {
      position: absolute;
      top: 0;
      right: 0;
      width: 170px;
      height: 170px;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: top right;
      opacity: 0.6;
      pointer-events: none;
      z-index: 0;
      mask-image: radial-gradient(circle at 100% 0%, rgba(0, 0, 0, 1) 0%, transparent 80%);
      -webkit-mask-image: radial-gradient(circle at 100% 0%, rgba(0, 0, 0, 1) 0%, transparent 80%);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .game-card:hover .card-thematic-art {
      opacity: 0.8;
      transform: scale(1.06);
    }

    :host-context([data-theme="light"]) .card-thematic-art {
      opacity: 0.6;
    }

    :host-context([data-theme="light"]) .game-card:hover .card-thematic-art {
      opacity: 0.8;
    }

    .card-top, .card-tagline, .card-meta-chips, .card-actions {
      position: relative;
      z-index: 1;
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

    :host-context([data-theme="light"]) .badge-pulse {
      background: var(--color-primary-container);
      border-color: rgba(39, 76, 119, 0.25);
      color: var(--color-primary);
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

    /* Modal de Selección de Partida en Pausa */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-md);
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    .resume-dialog {
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-2xl);
      max-width: 540px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .modal-title-group {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .modal-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-lg);
      background: rgba(163, 206, 241, 0.15);
      border: 1px solid rgba(163, 206, 241, 0.3);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .modal-icon-badge .material-symbols-outlined {
      font-size: 26px;
    }

    .modal-title {
      margin: 0;
      font-size: 17px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .modal-subtitle {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .btn-close-modal {
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 6px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .btn-close-modal:hover {
      color: var(--color-text-primary);
      background: var(--color-surface-container-high);
    }

    .paused-matches-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: var(--space-md) var(--space-lg);
      overflow-y: auto;
      max-height: 55vh;
    }

    .paused-match-item {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: 12px 14px;
      border-radius: var(--radius-xl);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .paused-match-item:hover {
      border-color: var(--color-primary);
      background: var(--color-surface-container-highest);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .item-badge-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-lg);
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .item-emoji {
      font-size: 24px;
    }

    .item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .item-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .item-game-name {
      font-size: 15px;
      font-weight: 800;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-round-chip {
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: rgba(163, 206, 241, 0.15);
      border: 1px solid rgba(163, 206, 241, 0.3);
      color: var(--color-primary);
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    .item-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .item-players {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .player-icon {
      font-size: 14px;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .player-names {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-date {
      font-size: 11px;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .item-action {
      flex-shrink: 0;
    }

    .btn-item-resume {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 8px 14px;
      border-radius: var(--radius-lg);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-size: 13px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      pointer-events: none;
      transition: transform 0.1s ease;
      box-shadow: 0 2px 8px rgba(163, 206, 241, 0.25);
    }

    .paused-match-item:hover .btn-item-resume {
      transform: scale(1.04);
    }

    .modal-footer {
      padding: var(--space-sm) var(--space-lg) var(--space-md);
      border-top: 1px solid var(--color-border-subtle);
      display: flex;
      justify-content: flex-end;
    }

    .btn-modal-cancel {
      padding: 8px 18px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-primary);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-modal-cancel:hover {
      background: var(--color-surface-container-highest);
    }

    :host-context([data-theme="light"]) .modal-overlay {
      background: rgba(15, 23, 42, 0.5);
    }

    :host-context([data-theme="light"]) .resume-dialog {
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.15);
    }

    :host-context([data-theme="light"]) .modal-icon-badge {
      background: var(--color-primary-container);
      border-color: rgba(39, 76, 119, 0.25);
      color: var(--color-primary);
    }

    :host-context([data-theme="light"]) .item-round-chip {
      background: var(--color-primary-container);
      border-color: rgba(39, 76, 119, 0.25);
      color: var(--color-primary);
    }

    :host-context([data-theme="light"]) .paused-match-item {
      background: var(--color-surface-container);
      border-color: var(--color-border-subtle);
    }

    :host-context([data-theme="light"]) .paused-match-item:hover {
      background: var(--color-surface-container-highest);
      border-color: var(--color-primary);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
})
export class CatalogComponent {
  private registry = inject(GameRegistryService);
  private storage = inject(StorageService);
  private router = inject(Router);

  readonly games = this.registry.games;
  readonly showResumeModal = signal<boolean>(false);

  readonly activeMatches = computed(() => {
    const active = Object.values(this.storage.activeMatches());
    active.sort((a, b) => b.updatedAt - a.updatedAt);
    return active;
  });

  readonly latestActiveMatch = computed(() => {
    const matches = this.activeMatches();
    return matches.length > 0 ? matches[0] : null;
  });

  readonly heroBackgroundGradient = computed(() => {
    const matches = this.activeMatches();
    if (matches.length === 1) {
      const game = this.getGame(matches[0].gameId);
      if (game?.metadata?.theme?.gradient) {
        return game.metadata.theme.gradient;
      }
    }
    return 'radial-gradient(circle at 85% 15%, rgba(96, 150, 186, 0.22) 0%, rgba(39, 76, 119, 0.12) 50%, transparent 80%)';
  });

  readonly heroThematicArt = computed(() => {
    const matches = this.activeMatches();
    if (matches.length > 0) {
      const game = this.getGame(matches[0].gameId);
      return game?.metadata?.theme?.bgImageUrl || null;
    }
    return null;
  });

  getGame(id: string) {
    return this.registry.getGame(id);
  }

  openResumeModal() {
    this.showResumeModal.set(true);
  }

  closeResumeModal() {
    this.showResumeModal.set(false);
  }

  resumeMatch(matchId: string) {
    this.showResumeModal.set(false);
    this.router.navigate(['/match/live', matchId]);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.showResumeModal()) {
      this.closeResumeModal();
    }
  }
}
