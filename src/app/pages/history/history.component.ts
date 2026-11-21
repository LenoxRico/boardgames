import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';
import { GameRegistryService } from '../../core/services/game-registry.service';
import { MatchRecord } from '../../core/models/match.interface';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="history-page">
      <!-- Selector de pestaña: En Curso vs Finalizadas -->
      <div class="history-tabs-bar">
        <button
          type="button"
          class="tab-btn"
          [class.active-tab]="selectedTab() === 'active'"
          (click)="selectedTab.set('active')"
        >
          <span class="material-symbols-outlined tab-icon">play_circle</span>
          <span>En Curso ({{ activeMatches().length }})</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active-tab]="selectedTab() === 'completed'"
          (click)="selectedTab.set('completed')"
        >
          <span class="material-symbols-outlined tab-icon">history</span>
          <span>Finalizadas ({{ completedMatches().length }})</span>
        </button>
      </div>

      <!-- SECCIÓN 1: Partidas Activas / Pausadas -->
      @if (selectedTab() === 'active') {
        <div class="matches-list">
          @if (activeMatches().length === 0) {
            <div class="empty-state-card">
              <span class="material-symbols-outlined empty-icon">sports_esports</span>
              <h3>No hay partidas en curso</h3>
              <p>Inicia una nueva partida desde el catálogo para comenzar a anotar.</p>
              <a routerLink="/tabs/catalog" class="btn-primary-link">Ir al Catálogo</a>
            </div>
          } @else {
            @for (match of activeMatches(); track match.id) {
              @let game = getGame(match.gameId);
              <div class="match-item-card active-card">
                <div class="match-card-top">
                  <div class="game-info">
                    <span class="game-emoji">{{ game?.metadata?.emoji || '🎲' }}</span>
                    <div>
                      <h3 class="card-game-title">{{ game?.metadata?.name || match.gameId }}</h3>
                      <span class="card-date">{{ match.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>
                  <span class="badge badge-pulse">
                    <span class="pulse-dot"></span> Ronda {{ match.currentRound }}
                  </span>
                </div>

                <div class="players-scores-preview">
                  <span class="players-label">Jugadores y Puntuación Actual:</span>
                  <div class="scores-chips-row">
                    @for (p of match.players; track p.id) {
                      <div class="score-chip">
                        <span class="chip-name">{{ p.name }}:</span>
                        <strong class="tabular-nums chip-score">{{ match.cumulativeScores[p.id] ?? 0 }} pts</strong>
                      </div>
                    }
                  </div>
                </div>

                <div class="match-card-actions">
                  <a [routerLink]="['/match/live', match.id]" class="btn-resume">
                    <span class="material-symbols-outlined">play_arrow</span>
                    <span>Reanudar</span>
                  </a>
                  <button
                    type="button"
                    class="btn-delete"
                    (click)="deleteActiveMatch(match.id)"
                    title="Eliminar partida en curso"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            }
          }
        </div>
      }

      <!-- SECCIÓN 2: Partidas Finalizadas (Historial Completo) -->
      @if (selectedTab() === 'completed') {
        <div class="matches-list">
          @if (completedMatches().length === 0) {
            <div class="empty-state-card">
              <span class="material-symbols-outlined empty-icon">inventory_2</span>
              <h3>No hay partidas archivadas</h3>
              <p>Las partidas completadas se guardarán automáticamente aquí con sus ganadores y estadísticas.</p>
            </div>
          } @else {
            @for (match of completedMatches(); track match.id) {
              @let game = getGame(match.gameId);
              <div class="match-item-card completed-card">
                <div class="match-card-top">
                  <div class="game-info">
                    <span class="game-emoji">{{ game?.metadata?.emoji || '🏆' }}</span>
                    <div>
                      <h3 class="card-game-title">{{ game?.metadata?.name || match.gameId }}</h3>
                      <span class="card-date">{{ (match.completedAt || match.updatedAt) | date: 'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>
                  <span class="badge badge-completed">
                    {{ match.rounds.length }} Rondas
                  </span>
                </div>

                <!-- Ganador(es) y Perdedor(es) -->
                @if (match.finalRankings && match.finalRankings.length > 0) {
                  <div class="outcome-bar">
                    @let winners = getWinners(match);
                    @let losers = getLosers(match);

                    @if (winners.length > 0) {
                      <div class="outcome-winner">
                        <span class="outcome-icon">👑</span>
                        <span>Ganador: <strong>{{ winners.join(', ') }}</strong></span>
                      </div>
                    }

                    @if (losers.length > 0 && game?.metadata?.hasLoser) {
                      <div class="outcome-loser">
                        <span class="outcome-icon">💀</span>
                        <span>Detonó: <strong>{{ losers.join(', ') }}</strong></span>
                      </div>
                    }
                  </div>
                }

                <!-- Tabla de Jugadores y Puntos Finales -->
                <div class="final-scores-table">
                  @for (rank of (match.finalRankings || []); track rank.playerId) {
                    @let player = getPlayer(match, rank.playerId);
                    <div class="final-score-row" [class.winner-row]="rank.isWinner" [class.loser-row]="rank.isLoser">
                      <div class="row-player-info">
                        <span class="rank-pos">{{ rank.rank }}º</span>
                        <span class="player-name">{{ player?.name }}</span>
                      </div>
                      <span class="final-pts tabular-nums font-bold">
                        {{ rank.score }} {{ game?.metadata?.scoreUnit || 'pts' }}
                      </span>
                    </div>
                  }
                </div>

                <div class="match-card-actions">
                  <button
                    type="button"
                    class="btn-delete"
                    (click)="deleteCompletedMatch(match.id)"
                    title="Eliminar del historial"
                  >
                    <span class="material-symbols-outlined">delete</span>
                    <span>Eliminar Registro</span>
                  </button>
                </div>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .history-page {
      padding: var(--space-md);
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding-bottom: 90px;
    }

    .history-tabs-bar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      padding: 4px;
      border-radius: var(--radius-lg);
    }

    .tab-btn {
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      font-size: 14px;
      font-weight: 700;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tab-btn.active-tab {
      background: var(--color-primary-container);
      color: var(--color-primary);
      border: 1px solid var(--color-border-strong);
    }

    .tab-icon {
      font-size: 20px;
    }

    .matches-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .empty-state-card {
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-xl);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-sm);
    }

    .empty-icon {
      font-size: 48px;
      color: var(--color-text-muted);
    }

    .empty-state-card h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .empty-state-card p {
      margin: 0;
      font-size: 13px;
      color: var(--color-text-secondary);
      max-width: 320px;
    }

    .btn-primary-link {
      margin-top: var(--space-sm);
      padding: 10px 20px;
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: var(--color-on-primary);
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
    }

    .match-item-card {
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
    }

    .match-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .game-info {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .game-emoji {
      font-size: 24px;
    }

    .card-game-title {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .card-date {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .players-scores-preview {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: var(--space-xs) 0;
    }

    .players-label {
      font-size: 11px;
      color: var(--color-text-muted);
      font-weight: 600;
    }

    .scores-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .score-chip {
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      font-size: 12px;
      display: flex;
      gap: 4px;
    }

    .chip-name {
      color: var(--color-text-secondary);
    }

    .chip-score {
      color: var(--color-primary);
    }

    .outcome-bar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
      padding: var(--space-xs) 0;
    }

    .outcome-winner {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      background: var(--color-success-bg);
      border: 1px solid rgba(52, 211, 153, 0.3);
      color: var(--color-success);
      font-size: 12px;
    }

    .outcome-loser {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      background: var(--color-danger-bg);
      border: 1px solid rgba(248, 113, 113, 0.3);
      color: var(--color-danger);
      font-size: 12px;
    }

    .final-scores-table {
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: var(--color-surface-container-lowest);
      border-radius: var(--radius-md);
      padding: var(--space-sm);
      border: 1px solid var(--color-border-subtle);
    }

    .final-score-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      padding: 2px 4px;
    }

    .final-score-row.winner-row {
      color: var(--color-gold);
      font-weight: 700;
    }

    .final-score-row.loser-row {
      color: var(--color-danger);
      font-weight: 700;
    }

    .row-player-info {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .rank-pos {
      font-size: 11px;
      opacity: 0.8;
      width: 16px;
    }

    .match-card-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-sm);
      padding-top: var(--space-xs);
      border-top: 1px solid var(--color-border-subtle);
    }

    .btn-resume {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 8px 16px;
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: var(--color-on-primary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
    }

    .btn-delete {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      border-radius: var(--radius-md);
      background: transparent;
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 12px;
    }

    .btn-delete:hover {
      color: var(--color-danger);
      border-color: var(--color-danger);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-size: 11px;
      font-weight: 700;
    }

    .badge-pulse {
      background: rgba(163, 206, 241, 0.15);
      color: var(--color-primary);
      border: 1px solid rgba(163, 206, 241, 0.3);
      gap: 4px;
    }

    .badge-completed {
      background: var(--color-surface-container-high);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border-subtle);
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-primary);
    }
  `],
})
export class HistoryComponent {
  private storage = inject(StorageService);
  private registry = inject(GameRegistryService);

  selectedTab = signal<'active' | 'completed'>('active');

  readonly activeMatches = computed(() => {
    return Object.values(this.storage.activeMatches()).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  });

  readonly completedMatches = this.storage.completedMatches;

  getGame(gameId: string) {
    return this.registry.getGame(gameId);
  }

  getPlayer(match: MatchRecord, playerId: string) {
    return match.players.find((p) => p.id === playerId);
  }

  getWinners(match: MatchRecord): string[] {
    if (!match.finalRankings) return [];
    const winnerIds = match.finalRankings
      .filter((r) => r.isWinner)
      .map((r) => r.playerId);
    return winnerIds.map((id) => this.getPlayer(match, id)?.name || id);
  }

  getLosers(match: MatchRecord): string[] {
    if (!match.finalRankings) return [];
    const loserIds = match.finalRankings
      .filter((r) => r.isLoser)
      .map((r) => r.playerId);
    return loserIds.map((id) => this.getPlayer(match, id)?.name || id);
  }

  async deleteActiveMatch(matchId: string): Promise<void> {
    if (confirm('¿Eliminar esta partida en curso?')) {
      await this.storage.removeActiveMatch(matchId);
    }
  }

  async deleteCompletedMatch(matchId: string): Promise<void> {
    if (confirm('¿Eliminar este registro del historial?')) {
      await this.storage.deleteCompletedMatch(matchId);
    }
  }
}
