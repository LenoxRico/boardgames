import {
  Component,
  computed,
  inject,
  input,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatchRecord } from '../../../core/models/match.interface';
import { MatchManagerService } from '../../../core/services/match-manager.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import {
  MinoDiceConfig,
  MinoDiceRoundInput,
  MinoDiceEngine,
} from '../mino-dice.engine';
import { MINO_DICE_RULES } from '../mino-dice.rules';

@Component({
  selector: 'app-mino-dice-scorer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scorer-container">
      <!-- 1. Cabecera Contextual -->
      <div
        class="match-header-card"
        [style.background-image]="gameTheme()?.gradient"
      >
        @if (gameTheme()?.bgImageUrl; as bg) {
          <div
            class="card-thematic-art"
            [style.background-image]="'url(' + bg + ')'"
          ></div>
        }
        <div class="header-top">
          <div class="game-info">
            <div class="game-title-row">
              <span class="game-icon">🎲</span>
              <h2 class="game-name">Mino Dice</h2>
              <span class="badge badge-table">
                Ronda {{ viewingRound() }} de {{ totalRounds() }}
              </span>
            </div>
            <p class="dealer-text">
              <span>{{ viewingRound() }} dados por jugador en esta ronda</span>
              <span class="dot-separator">•</span>
              <span class="dealer-badge">Reparte: {{ currentDealer()?.name }} 👑</span>
            </p>
          </div>
          <div class="header-actions">
            <button
              type="button"
              class="icon-action-btn"
              (click)="toggleRulesModal()"
              title="Reglas rápidas"
            >
              <span class="material-symbols-outlined">help_outline</span>
            </button>
          </div>
        </div>

        <!-- Stepper Horizontal de Rondas -->
        <div class="stepper-section">
          <div class="stepper-label-row">
            <span class="stepper-title">
              <span class="material-symbols-outlined">casino</span>
              Laberinto de Rondas ({{ viewingRound() }} Dados)
            </span>
            <span class="badge badge-info">R{{ viewingRound() }} / {{ totalRounds() }}</span>
          </div>

          <div class="rounds-stepper-scroll">
            <div class="rounds-stepper">
              @for (r of roundNumbers(); track r) {
                <button
                  type="button"
                  class="step-pill"
                  [class.active-step]="viewingRound() === r"
                  [class.completed-step]="r < currentMatchRound()"
                  [class.locked-step]="r > currentMatchRound()"
                  (click)="onStepClick(r)"
                  [disabled]="r > currentMatchRound()"
                >
                  <span class="step-num">R{{ r }}</span>
                  <span class="step-dice-sub">{{ r }} 🎲</span>
                </button>
              }
            </div>
          </div>
        </div>

        @if (viewingRound() < currentMatchRound()) {
          <div class="inspect-mode-banner">
            <span>Inspeccionando historial de la Ronda {{ viewingRound() }}</span>
            <button type="button" class="btn-return" (click)="returnToCurrentRound()">
              Volver a Ronda {{ currentMatchRound() }}
            </button>
          </div>
        }
      </div>

      <!-- Modal de Reglas Rápidas Desplegable -->
      @if (showRulesModal()) {
        <div class="rules-quick-modal">
          <div class="rules-modal-header">
            <div class="rules-modal-title">
              <span class="material-symbols-outlined">menu_book</span>
              <h3>Reglas Rápidas: Mino Dice</h3>
            </div>
            <button type="button" class="close-btn" (click)="toggleRulesModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="rules-grid">
            @for (sec of quickRules; track sec.id) {
              <div class="rule-box">
                <span class="rule-title">{{ sec.title }}</span>
                <p class="rule-desc">{{ sec.content }}</p>
              </div>
            }
          </div>
        </div>
      }

      <!-- Modal / Vista de Resultado Final de Partida -->
      @if (showFinalResultsModal() || match().status === 'completed') {
        <div class="final-results-overlay">
          <div
            class="final-results-card"
            [style.background-image]="gameTheme()?.gradient"
          >
            @if (gameTheme()?.bgImageUrl; as bg) {
              <div
                class="card-thematic-art"
                [style.background-image]="'url(' + bg + ')'"
              ></div>
            }
            <div class="results-header">
              <span class="trophy-badge">🏆</span>
              <h2 class="results-title">¡Partida Finalizada!</h2>
              <span class="results-sub">Mino Dice • Campeón del Laberinto</span>
            </div>

            <!-- Podio de Ganadores -->
            <div class="podium-display">
              @for (rank of sortedRankings(); track rank.playerId) {
                @let player = getPlayerById(rank.playerId);
                <div class="podium-row" [class.winner-gold]="rank.rank === 1">
                  <div class="podium-rank-box">
                    <span class="podium-place-num">{{ rank.rank }}º</span>
                    @if (rank.rank === 1) {
                      <span class="crown-icon">👑</span>
                    }
                  </div>
                  <div class="podium-player-name">
                    <span class="name-text">{{ player?.name }}</span>
                    <span class="rank-role">{{ rank.rank === 1 ? 'Campeón del Laberinto' : rank.rank + 'º Puesto' }}</span>
                  </div>
                  <div class="podium-player-score text-right">
                    <span class="score-num tabular-nums font-bold">{{ rank.score }}</span>
                    <span class="score-unit">pts</span>
                  </div>
                </div>
              }
            </div>

            <!-- Resumen Informativo de Puntos Ronda por Ronda en Resultados -->
            <div class="results-matrix-preview">
              <h4 class="matrix-preview-title">
                <span class="material-symbols-outlined">table_chart</span>
                Puntos Obtenidos en Cada Ronda
              </h4>
              <div class="matrix-table-wrap">
                <table class="matrix-table">
                  <thead>
                    <tr>
                      <th class="col-ronda">Ronda</th>
                      @for (p of match().players; track p.id) {
                        <th class="col-p text-center">{{ p.name }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of match().rounds; track r.roundNumber) {
                      <tr>
                        <td class="col-ronda font-semibold">R{{ r.roundNumber }} ({{ r.roundNumber }}🎲)</td>
                        @for (p of match().players; track p.id) {
                          @let pts = r.roundPoints[p.id] ?? 0;
                          @let accum = r.cumulativeScores[p.id] ?? 0;
                          <td class="col-p text-center tabular-nums">
                            <span class="pts-val" [class.text-success]="pts > 0" [class.text-danger]="pts < 0">
                              {{ pts >= 0 ? '+' : '' }}{{ pts }}
                            </span>
                            <span class="accum-val">({{ accum }})</span>
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Botón para finalizar partida y volver al catálogo -->
            <div class="results-actions">
              <button type="button" class="btn-return-catalog" (click)="returnToCatalog()">
                <span class="material-symbols-outlined">home</span>
                <span>Finalizar Partida y Volver al Catálogo</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- 2. Tarjetas de Registro por Jugador -->
      <div class="players-list">
        @for (player of match().players; track player.id) {
          @let pData = draftInputs()[player.id] || { bid: 0, tricks: 0, bonusPoints: 0 };
          @let forecast = getPlayerForecast(player.id);
          @let currentRank = getPlayerRank(player.id);

          <div class="player-card" [class.leader-card]="currentRank === 1">
            <div class="player-card-header">
              <div class="player-profile">
                <div class="player-avatar" [class.leader-avatar]="currentRank === 1">
                  {{ player.name.charAt(0).toUpperCase() }}
                </div>
                <div class="player-meta">
                  <div class="player-name-row">
                    <span class="player-name">{{ player.name }}</span>
                    @if (currentRank === 1) {
                      <span class="badge badge-gold">
                        <span class="material-symbols-outlined small-icon">trophy</span> Líder
                      </span>
                    } @else {
                      <span class="badge badge-rank">{{ currentRank }}º Puesto</span>
                    }
                  </div>
                  <span class="player-score-prev">
                    Previo: <strong class="tabular-nums">{{ getPlayerPrevScore(player.id) }} pts</strong>
                  </span>
                </div>
              </div>

              <div class="player-forecast-pill" [class.forecast-success]="forecast.bidMade" [class.forecast-fail]="!forecast.bidMade">
                <span class="forecast-pts tabular-nums">
                  {{ forecast.roundScore >= 0 ? '+' : '' }}{{ forecast.roundScore }} pts
                </span>
                <span class="forecast-status">
                  @if (forecast.bidMade) {
                    {{ pData.bid === 0 ? '🛡️ Baza Cero' : '🎯 Exacto' }}
                  } @else {
                    {{ pData.bid === 0 ? '⚠️ Falló Baza 0' : '❌ Fallada' }}
                  }
                </span>
              </div>
            </div>

            <!-- Fila de Controles: Apuesta y Bazas -->
            <div class="inputs-grid">
              <!-- Selector de Apuesta -->
              <div class="input-stepper-box">
                <span class="stepper-label">
                  <span class="material-symbols-outlined small-icon">psychology</span>
                  Apuesta
                </span>
                <div class="stepper-controls">
                  <button
                    type="button"
                    class="stepper-btn"
                    [disabled]="pData.bid <= 0 || viewingRound() < currentMatchRound()"
                    (click)="adjustBid(player.id, -1)"
                  >
                    -
                  </button>
                  <span class="stepper-value tabular-nums font-bold">{{ pData.bid }}</span>
                  <button
                    type="button"
                    class="stepper-btn"
                    [disabled]="pData.bid >= viewingRound() || viewingRound() < currentMatchRound()"
                    (click)="adjustBid(player.id, 1)"
                  >
                    +
                  </button>
                </div>
              </div>

              <!-- Selector de Bazas Ganadas -->
              <div class="input-stepper-box">
                <span class="stepper-label">
                  <span class="material-symbols-outlined small-icon">military_tech</span>
                  Bazas Ganadas
                </span>
                <div class="stepper-controls">
                  <button
                    type="button"
                    class="stepper-btn"
                    [disabled]="pData.tricks <= 0 || viewingRound() < currentMatchRound()"
                    (click)="adjustTricks(player.id, -1)"
                  >
                    -
                  </button>
                  <span class="stepper-value tabular-nums font-bold" [class.text-gold]="pData.tricks === pData.bid">
                    {{ pData.tricks }}
                  </span>
                  <button
                    type="button"
                    class="stepper-btn"
                    [disabled]="pData.tricks >= viewingRound() || viewingRound() < currentMatchRound()"
                    (click)="adjustTricks(player.id, 1)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <!-- Sección de Bonificaciones de Criaturas Mitológicas -->
            @if (match().config.enableBonuses) {
              <div class="bonus-section">
                <div class="bonus-title-row">
                  <span class="bonus-title">
                    <span class="material-symbols-outlined small-icon">stars</span>
                    Criaturas Vencidas (Solo con Apuesta Acertada)
                  </span>
                  @if (pData.bonusPoints && pData.bonusPoints > 0) {
                    <span class="bonus-total-pill tabular-nums">+{{ pData.bonusPoints }} pts</span>
                  }
                </div>

                <div class="bonus-chips-row">
                  <button
                    type="button"
                    class="bonus-chip"
                    [disabled]="viewingRound() < currentMatchRound()"
                    (click)="addBonus(player.id, 30)"
                    title="Minotauro vence a Grifo (+30 pts)"
                  >
                    <span>🐂>🦅 +30</span>
                  </button>
                  <button
                    type="button"
                    class="bonus-chip"
                    [disabled]="viewingRound() < currentMatchRound()"
                    (click)="addBonus(player.id, 50)"
                    title="Sirena vence a Minotauro (+50 pts)"
                  >
                    <span>🧜‍♀️>🐂 +50</span>
                  </button>
                  @if (pData.bonusPoints && pData.bonusPoints > 0) {
                    <button
                      type="button"
                      class="bonus-chip clear-chip"
                      [disabled]="viewingRound() < currentMatchRound()"
                      (click)="clearBonuses(player.id)"
                    >
                      <span class="material-symbols-outlined">restart_alt</span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- SECCIÓN 3: Tabla Matriz Informativa de Puntos por Ronda -->
      <div class="matrix-card">
        <div class="matrix-header">
          <h3 class="section-title">
            <span class="material-symbols-outlined">table_chart</span>
            Historial de Puntos por Ronda
          </h3>
          <span class="matrix-hint">Puntos de Ronda (Acumulado)</span>
        </div>

        <div class="matrix-scroll-wrapper">
          <table class="matrix-table">
            <thead>
              <tr>
                <th class="col-round">Ronda</th>
                @for (p of match().players; track p.id) {
                  @let rank = getPlayerRank(p.id);
                  <th class="col-player text-center" [class.th-leader]="rank === 1">
                    {{ p.name }} {{ rank === 1 ? '👑' : '' }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (round of match().rounds; track round.roundNumber) {
                <tr class="round-row">
                  <td class="col-round font-semibold">R{{ round.roundNumber }} ({{ round.roundNumber }}🎲)</td>
                  @for (p of match().players; track p.id) {
                    @let pts = round.roundPoints[p.id] ?? 0;
                    @let accum = round.cumulativeScores[p.id] ?? 0;
                    @let rank = getPlayerRank(p.id);
                    <td class="col-player text-center tabular-nums" [class.cell-leader]="rank === 1">
                      <span class="cell-pts font-bold" [class.text-success]="pts > 0" [class.text-danger]="pts < 0">
                        {{ pts >= 0 ? '+' : '' }}{{ pts }}
                      </span>
                      <span class="cell-accum">({{ accum }})</span>
                    </td>
                  }
                </tr>
              }

              <!-- Fila Proyectada en Vivo (Ronda Actual) -->
              @if (match().status === 'in_progress') {
                <tr class="round-row live-projected-row">
                  <td class="col-round font-bold flex-live-cell">
                    <span class="live-dot animate-pulse"></span>
                    R{{ currentMatchRound() }} (Activa)
                  </td>
                  @for (p of match().players; track p.id) {
                    @let forecast = getPlayerForecast(p.id);
                    @let prev = getPlayerPrevScore(p.id);
                    @let projected = prev + forecast.roundScore;

                    <td class="col-player text-center tabular-nums">
                      <span class="cell-pts font-bold" [class.text-success]="forecast.roundScore > 0" [class.text-danger]="forecast.roundScore < 0">
                        {{ forecast.roundScore >= 0 ? '+' : '' }}{{ forecast.roundScore }}
                      </span>
                      <span class="cell-accum">({{ projected }})</span>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Barra Inferior Fija de Acciones -->
      <div class="bottom-action-bar safe-bottom">
        @if (isLastRound()) {
          <button
            type="button"
            class="btn-primary-action btn-final-round"
            [disabled]="match().status === 'completed'"
            (click)="confirmCurrentRound()"
          >
            <span class="material-symbols-outlined">emoji_events</span>
            <span>Finalizar Ronda {{ totalRounds() }} y Ver Resultados</span>
          </button>
        } @else {
          <button
            type="button"
            class="btn-primary-action"
            [disabled]="match().status === 'completed' || viewingRound() < currentMatchRound()"
            (click)="confirmCurrentRound()"
          >
            <span>Confirmar Ronda {{ currentMatchRound() }} y Avanzar</span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </button>
        }

        @if (match().status === 'in_progress') {
          <div class="secondary-actions-row">
            @if (currentMatchRound() > 1) {
              <button
                type="button"
                class="btn-secondary-action"
                (click)="editPreviousRound()"
              >
                <span class="material-symbols-outlined">undo</span>
                <span>Editar Ronda {{ currentMatchRound() - 1 }}</span>
              </button>
            }
            <button
              type="button"
              class="btn-secondary-action btn-danger"
              (click)="askToAbandonMatch()"
            >
              <span class="material-symbols-outlined">exit_to_app</span>
              <span>Finalizar Partida</span>
            </button>
          </div>
        }
      </div>

      <!-- Modal de Confirmación: Abandonar Partida en Medio del Juego -->
      @if (showAbandonConfirmModal()) {
        <div class="modal-overlay" (click)="cancelAbandon()">
          <div class="modal-dialog-card" (click)="$event.stopPropagation()">
            <div class="modal-icon-badge danger-badge">
              <span class="material-symbols-outlined">warning</span>
            </div>
            <h3 class="modal-title">¿Abandonar la partida?</h3>
            <p class="modal-message">
              Estás en medio de una partida de Mino Dice. Si confirmas, saldrás al catálogo de juegos y esta partida <strong>no se guardará en el historial</strong>.
            </p>
            <div class="modal-actions">
              <button
                type="button"
                class="btn-modal-cancel"
                (click)="cancelAbandon()"
              >
                Cancelar y Continuar Jugando
              </button>
              <button
                type="button"
                class="btn-modal-confirm-abandon"
                (click)="confirmAbandon()"
              >
                <span class="material-symbols-outlined">delete_forever</span>
                <span>Sí, Abandonar Partida</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .scorer-container {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding-bottom: 120px;
    }

    .match-header-card,
    .players-list,
    .matrix-card {
      position: relative;
      z-index: 1;
    }

    .match-header-card {
      position: relative;
      overflow: hidden;
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .card-thematic-art {
      position: absolute;
      top: 0;
      right: 0;
      width: 220px;
      height: 100%;
      max-height: 220px;
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

    .header-top {
      position: relative;
      z-index: 1;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-md);
    }

    .game-title-row {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .game-icon {
      font-size: 24px;
    }

    .game-name {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: var(--color-primary);
    }

    .dealer-text {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: var(--color-text-secondary);
      display: flex;
      gap: var(--space-sm);
      align-items: center;
    }

    .dealer-badge {
      color: var(--color-primary);
      font-weight: 600;
    }

    .icon-action-btn {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .icon-action-btn:hover {
      background: var(--color-surface-container-highest);
    }

    .stepper-section {
      margin-bottom: var(--space-md);
    }

    .stepper-label-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: var(--space-sm);
    }

    .stepper-title {
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--color-text-primary);
    }

    .rounds-stepper-scroll {
      width: 100%;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .rounds-stepper {
      display: flex;
      gap: var(--space-xs);
      min-width: max-content;
    }

    .step-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px 14px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: 60px;
    }

    .step-pill.active-step {
      background: var(--color-primary);
      color: var(--color-on-primary);
      border-color: var(--color-primary);
      font-weight: 800;
      box-shadow: 0 4px 12px rgba(163, 206, 241, 0.4);
    }

    .step-pill.completed-step {
      border-color: var(--color-success);
      color: var(--color-text-primary);
    }

    .step-pill.locked-step {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .step-num {
      font-size: 13px;
      font-weight: 700;
    }

    .step-dice-sub {
      font-size: 10px;
      opacity: 0.85;
    }

    .players-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .player-card {
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
    }

    .player-card.leader-card {
      border-color: rgba(251, 191, 36, 0.4);
    }

    .player-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .player-profile {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .player-avatar {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-highest);
      border: 1px solid var(--color-border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      color: var(--color-primary);
    }

    .player-avatar.leader-avatar {
      background: rgba(251, 191, 36, 0.2);
      border-color: #fbbf24;
      color: #fbbf24;
    }

    .player-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .player-name-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .player-name {
      font-weight: 700;
      font-size: 16px;
      color: var(--color-text-primary);
    }

    .player-score-prev {
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .player-forecast-pill {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 6px 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);
      background: var(--color-surface-container-lowest);
    }

    .player-forecast-pill.forecast-success {
      border-color: rgba(52, 211, 153, 0.5);
      background: rgba(52, 211, 153, 0.1);
      color: #34d399;
    }

    .player-forecast-pill.forecast-fail {
      border-color: rgba(248, 113, 113, 0.5);
      background: rgba(248, 113, 113, 0.1);
      color: #f87171;
    }

    .forecast-pts {
      font-size: 16px;
      font-weight: 800;
    }

    .forecast-status {
      font-size: 11px;
      font-weight: 700;
    }

    .inputs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-sm);
    }

    .input-stepper-box {
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-sm);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .stepper-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stepper-controls {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      width: 100%;
      justify-content: center;
    }

    .stepper-btn {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-highest);
      border: 1px solid var(--color-border-default);
      color: var(--color-text-primary);
      font-size: 18px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .stepper-btn:hover:not(:disabled) {
      background: var(--color-primary-container);
      color: var(--color-primary);
    }

    .stepper-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .stepper-value {
      font-size: 20px;
      min-width: 32px;
      text-align: center;
    }

    .bonus-section {
      background: var(--color-surface-container-lowest);
      border-radius: var(--radius-md);
      padding: var(--space-sm);
      display: flex;
      flex-direction: column;
      gap: 6px;
      border: 1px solid var(--color-border-subtle);
    }

    .bonus-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-text-secondary);
    }

    .bonus-title {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .bonus-total-pill {
      color: var(--color-primary);
      font-weight: 800;
    }

    .bonus-chips-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .bonus-chip {
      padding: 6px 12px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-primary);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .bonus-chip:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .bonus-chip.clear-chip {
      color: var(--color-danger);
      padding: 6px 8px;
    }

    /* Tabla Matriz */
    .matrix-card {
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    }

    .matrix-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-sm);
    }

    .matrix-hint {
      font-size: 12px;
      color: var(--color-text-muted);
    }

    .matrix-scroll-wrapper {
      width: 100%;
      overflow-x: auto;
    }

    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .matrix-table th {
      padding: 10px 8px;
      background: var(--color-surface-container-highest);
      color: var(--color-text-secondary);
      font-weight: 700;
      border-bottom: 1px solid var(--color-border-default);
    }

    .matrix-table td {
      padding: 10px 8px;
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .col-round {
      text-align: left;
      white-space: nowrap;
    }

    .col-player {
      white-space: nowrap;
    }

    .th-leader {
      color: #fbbf24 !important;
      font-weight: 800;
    }

    .cell-pts {
      font-size: 14px;
      margin-right: 4px;
    }

    .cell-accum {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .flex-live-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--color-primary);
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-primary);
    }

    /* Barra Inferior Fija */
    .bottom-action-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: var(--space-sm) var(--space-md);
      background: rgba(11, 19, 38, 0.95);
      backdrop-filter: blur(16px);
      border-top: 1px solid var(--color-border-default);
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      z-index: 40;
      max-width: 900px;
      margin: 0 auto;
    }

    :host-context([data-theme="light"]) .bottom-action-bar {
      background: rgba(255, 255, 255, 0.95);
    }

    .btn-primary-action {
      width: 100%;
      min-height: 48px;
      border-radius: var(--radius-lg);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-weight: 800;
      font-size: 15px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(163, 206, 241, 0.35);
    }

    .btn-primary-action:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .btn-final-round {
      background: #fbbf24;
      color: #1a1a1a;
      box-shadow: 0 4px 14px rgba(251, 191, 36, 0.4);
    }

    .secondary-actions-row {
      display: flex;
      gap: var(--space-sm);
    }

    .btn-secondary-action {
      flex: 1;
      min-height: 40px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-secondary);
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
    }

    .btn-secondary-action.btn-danger {
      color: var(--color-danger);
    }

    /* Modal de Confirmación de Abandono */
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
    }

    .modal-dialog-card {
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-2xl);
      padding: var(--space-xl);
      max-width: 440px;
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-md);
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
    }

    .modal-icon-badge {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .modal-icon-badge .material-symbols-outlined {
      font-size: 30px;
    }

    .modal-title {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .modal-message {
      margin: 0;
      font-size: 14px;
      color: var(--color-text-secondary);
      line-height: 1.5;
    }

    .modal-actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      width: 100%;
      margin-top: var(--space-xs);
    }

    .btn-modal-cancel {
      width: 100%;
      min-height: 44px;
      border-radius: var(--radius-lg);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-default);
      color: var(--color-text-primary);
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-modal-cancel:hover {
      background: var(--color-surface-container-highest);
    }

    .btn-modal-confirm-abandon {
      width: 100%;
      min-height: 44px;
      border-radius: var(--radius-lg);
      background: #dc2626;
      border: none;
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
      transition: background 0.15s ease;
    }

    .btn-modal-confirm-abandon:hover {
      background: #b91c1c;
    }

    /* Modal de Resultados */
    .final-results-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-md);
      z-index: 100;
      overflow-y: auto;
    }

    .final-results-card {
      position: relative;
      overflow: hidden;
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-2xl);
      padding: var(--space-xl);
      max-width: 650px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
      max-height: 90vh;
      overflow-y: auto;
    }

    .results-header,
    .results-podium,
    .results-actions {
      position: relative;
      z-index: 1;
    }

    .results-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .trophy-badge {
      font-size: 48px;
    }

    .results-title {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      color: var(--color-primary);
    }

    .results-sub {
      font-size: 14px;
      color: var(--color-text-secondary);
    }

    .podium-display {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .podium-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--color-surface-container-high);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);
    }

    .podium-row.winner-gold {
      background: rgba(251, 191, 36, 0.15);
      border-color: #fbbf24;
    }

    .podium-rank-box {
      width: 40px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .podium-place-num {
      font-weight: 800;
      font-size: 16px;
    }

    .podium-player-name {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .name-text {
      font-weight: 700;
      font-size: 15px;
    }

    .rank-role {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .score-num {
      font-size: 20px;
      color: var(--color-primary);
    }

    .score-unit {
      font-size: 11px;
      color: var(--color-text-muted);
      margin-left: 2px;
    }

    .results-actions {
      padding-top: var(--space-xs);
    }

    .btn-return-catalog {
      width: 100%;
      min-height: 48px;
      border-radius: var(--radius-lg);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-weight: 800;
      font-size: 15px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      cursor: pointer;
    }

    .rules-quick-modal {
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .rules-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .rules-modal-title {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .rules-modal-title h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
    }

    .rules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-sm);
    }

    .rule-box {
      background: var(--color-surface-container-lowest);
      border-radius: var(--radius-md);
      padding: var(--space-sm);
      border: 1px solid var(--color-border-subtle);
    }

    .rule-title {
      font-size: 12px;
      font-weight: 800;
      color: var(--color-primary);
      margin-bottom: 4px;
      display: block;
    }

    .rule-desc {
      margin: 0;
      font-size: 12px;
      color: var(--color-text-secondary);
      line-height: 1.4;
    }

    .inspect-mode-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-sm) var(--space-md);
      background: var(--color-surface-container-high);
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 600;
      margin-top: var(--space-sm);
    }

    .btn-return {
      padding: 6px 12px;
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: var(--color-on-primary);
      border: none;
      font-weight: 700;
      cursor: pointer;
    }
  `],
})
export class MinoDiceScorerComponent {
  match = input.required<MatchRecord<MinoDiceConfig, MinoDiceRoundInput>>();
  private matchManager = inject(MatchManagerService);
  private registry = inject(GameRegistryService);
  private router = inject(Router);
  private engine = new MinoDiceEngine();

  readonly gameTheme = computed(() => this.registry.getGame(this.match().gameId)?.metadata?.theme);
  readonly quickRules = MINO_DICE_RULES.content.es.summary;

  showRulesModal = signal(false);
  showFinalResultsModal = signal(false);
  showAbandonConfirmModal = signal(false);
  viewingRound = signal(1);
  draftInputs = signal<Record<string, MinoDiceRoundInput>>({});

  totalRounds = computed(() => this.match().config.rounds || 8);
  currentMatchRound = computed(() => this.match().currentRound);

  isLastRound = computed(() => {
    return this.viewingRound() >= this.totalRounds();
  });

  roundNumbers = computed(() => {
    const total = this.totalRounds();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  currentDealer = computed(() => {
    const m = this.match();
    return m.players.find((p) => p.id === m.dealerPlayerId) || m.players[0];
  });

  sortedRankings = computed(() => {
    const m = this.match();
    const entries = m.players.map((p) => ({
      playerId: p.id,
      score: m.cumulativeScores[p.id] ?? 0,
    }));
    entries.sort((a, b) => b.score - a.score);
    return entries.map((e, idx) => ({
      playerId: e.playerId,
      score: e.score,
      rank: idx + 1,
    }));
  });

  constructor() {
    effect(() => {
      const match = this.match();
      this.viewingRound.set(match.currentRound);

      const initial: Record<string, MinoDiceRoundInput> = {};
      const draft = match.currentDraftRoundData || {};

      match.players.forEach((p) => {
        initial[p.id] = {
          bid: draft[p.id]?.bid ?? 0,
          tricks: draft[p.id]?.tricks ?? 0,
          bonusPoints: draft[p.id]?.bonusPoints ?? 0,
        };
      });
      this.draftInputs.set(initial);
    });
  }

  toggleRulesModal(): void {
    this.showRulesModal.update((v) => !v);
  }

  onStepClick(stepNumber: number): void {
    if (stepNumber <= this.currentMatchRound()) {
      this.viewingRound.set(stepNumber);
      if (stepNumber < this.currentMatchRound()) {
        const roundRecord = this.match().rounds.find((r) => r.roundNumber === stepNumber);
        if (roundRecord) {
          this.draftInputs.set(roundRecord.data as Record<string, MinoDiceRoundInput>);
        }
      } else {
        const draft = this.match().currentDraftRoundData || {};
        const restored: Record<string, MinoDiceRoundInput> = {};
        this.match().players.forEach((p) => {
          restored[p.id] = {
            bid: draft[p.id]?.bid ?? 0,
            tricks: draft[p.id]?.tricks ?? 0,
            bonusPoints: draft[p.id]?.bonusPoints ?? 0,
          };
        });
        this.draftInputs.set(restored);
      }
    }
  }

  returnToCurrentRound(): void {
    this.onStepClick(this.currentMatchRound());
  }

  adjustBid(playerId: string, delta: number): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { bid: 0, tricks: 0, bonusPoints: 0 };
      const nextBid = Math.max(0, Math.min(this.viewingRound(), current.bid + delta));
      const updated = { ...prev, [playerId]: { ...current, bid: nextBid } };
      this.matchManager.saveDraftRoundData(updated);
      return updated;
    });
  }

  adjustTricks(playerId: string, delta: number): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { bid: 0, tricks: 0, bonusPoints: 0 };
      const nextTricks = Math.max(0, Math.min(this.viewingRound(), current.tricks + delta));
      const updated = { ...prev, [playerId]: { ...current, tricks: nextTricks } };
      this.matchManager.saveDraftRoundData(updated);
      return updated;
    });
  }

  addBonus(playerId: string, points: number): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { bid: 0, tricks: 0, bonusPoints: 0 };
      const updated = {
        ...prev,
        [playerId]: { ...current, bonusPoints: (current.bonusPoints || 0) + points },
      };
      this.matchManager.saveDraftRoundData(updated);
      return updated;
    });
  }

  clearBonuses(playerId: string): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { bid: 0, tricks: 0, bonusPoints: 0 };
      const updated = { ...prev, [playerId]: { ...current, bonusPoints: 0 } };
      this.matchManager.saveDraftRoundData(updated);
      return updated;
    });
  }

  getPlayerTotalScore(playerId: string): number {
    return this.match().cumulativeScores[playerId] ?? 0;
  }

  getPlayerPrevScore(playerId: string): number {
    const rounds = this.match().rounds;
    if (rounds.length === 0) return 0;
    return rounds[rounds.length - 1].cumulativeScores[playerId] ?? 0;
  }

  getPlayerById(playerId: string) {
    return this.match().players.find((p) => p.id === playerId);
  }

  getPlayerRank(playerId: string): number {
    const ranks = this.sortedRankings();
    const item = ranks.find((r) => r.playerId === playerId);
    return item ? item.rank : 1;
  }

  getPlayerForecast(playerId: string): { roundScore: number; bidMade: boolean } {
    const input = this.draftInputs()[playerId] || { bid: 0, tricks: 0, bonusPoints: 0 };
    const roundIdx = this.viewingRound() - 1;
    const res = this.engine.calculateRound(
      roundIdx,
      { [playerId]: input },
      { [playerId]: 0 },
      this.match().config
    );
    const item = res[playerId];
    return {
      roundScore: item?.roundScore ?? 0,
      bidMade: item?.bidMade ?? false,
    };
  }

  async confirmCurrentRound(): Promise<void> {
    const isFinal = this.isLastRound();
    await this.matchManager.commitRound(this.draftInputs());

    if (isFinal) {
      await this.matchManager.finalizeMatch();
      this.showFinalResultsModal.set(true);
    }
  }

  async editPreviousRound(): Promise<void> {
    const prev = this.currentMatchRound() - 1;
    if (prev >= 1) {
      await this.matchManager.rollbackToRound(prev);
    }
  }

  askToAbandonMatch(): void {
    this.showAbandonConfirmModal.set(true);
  }

  cancelAbandon(): void {
    this.showAbandonConfirmModal.set(false);
  }

  async confirmAbandon(): Promise<void> {
    this.showAbandonConfirmModal.set(false);
    await this.matchManager.abandonMatch();
    this.router.navigate(['/tabs/catalog']);
  }

  returnToCatalog(): void {
    this.showFinalResultsModal.set(false);
    this.router.navigate(['/tabs/catalog']);
  }
}
