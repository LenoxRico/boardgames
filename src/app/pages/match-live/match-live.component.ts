import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatchManagerService } from '../../core/services/match-manager.service';
import { GameRegistryService } from '../../core/services/game-registry.service';

@Component({
  selector: 'app-match-live',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="match-live-page">
      @if (match(); as m) {
        @if (gameDefinition(); as game) {
          <!-- Dynamic Game Scorer Injection -->
          <ng-container
            *ngComponentOutlet="game.scorerComponent; inputs: { match: m }"
          ></ng-container>
        } @else {
          <div class="error-card">
            <h3>Juego no reconocido</h3>
            <p>No se encontró el módulo para el juego "{{ m.gameId }}".</p>
            <a routerLink="/tabs/catalog" class="btn-back">Volver al Catálogo</a>
          </div>
        }
      } @else {
        <div class="error-card">
          <span class="material-symbols-outlined error-icon">search_off</span>
          <h3>Partida no encontrada</h3>
          <p>No se encontró ninguna partida activa o guardada con el ID proporcionado.</p>
          <a routerLink="/tabs/catalog" class="btn-back">Ir al Catálogo</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .match-live-page {
      padding: var(--space-md);
      max-width: 900px;
      margin: 0 auto;
    }

    .error-card {
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-xl);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-md);
      margin-top: var(--space-xl);
    }

    .error-icon {
      font-size: 48px;
      color: var(--color-warning);
    }

    .error-card h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .error-card p {
      margin: 0;
      color: var(--color-text-secondary);
      font-size: 14px;
    }

    .btn-back {
      padding: 10px 20px;
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: var(--color-on-primary);
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
    }
  `],
})
export class MatchLiveComponent {
  private route = inject(ActivatedRoute);
  private matchManager = inject(MatchManagerService);
  private registry = inject(GameRegistryService);

  readonly match = this.matchManager.currentMatch;

  readonly gameDefinition = computed(() => {
    const m = this.match();
    if (!m) return null;
    return this.registry.getGame(m.gameId) || null;
  });

  constructor() {
    this.route.params.subscribe((params) => {
      const matchId = params['matchId'];
      if (matchId) {
        this.matchManager.loadMatch(matchId);
      }
    });
  }
}
