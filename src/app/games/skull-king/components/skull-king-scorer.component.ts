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
  SkullKingConfig,
  SkullKingRoundInput,
  SkullKingEngine,
} from '../skull-king.engine';
import { SKULL_KING_RULES } from '../skull-king.rules';

@Component({
  selector: 'app-skull-king-scorer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scorer-container">
      <!-- 1. Cabecera Contextual de Partida -->
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
              <span class="game-icon">👑</span>
              <h2 class="game-name">Skull King</h2>
              <span class="badge badge-table">Mesa en Vivo</span>
            </div>
            <p class="dealer-text">
              <span class="dealer-badge">👑 Reparte: {{ currentDealer()?.name }}</span>
              <span>• {{ match().players.length }} Jugadores</span>
            </p>
          </div>
          <div class="header-actions">
            <button
              type="button"
              class="icon-action-btn"
              (click)="toggleRulesModal()"
              title="Reglas rápidas"
            >
              <span class="material-symbols-outlined">help_center</span>
            </button>
          </div>
        </div>

        <!-- Stepper horizontal de Rondas -->
        <div class="stepper-section">
          <div class="stepper-label-row">
            <span class="round-status-text">
              <span class="pulse-dot"></span>
              Ronda {{ viewingRound() }} de {{ totalRounds() }}
            </span>
            <span class="cards-count-text">{{ viewingRound() }} cartas / jugador</span>
          </div>

          <div class="rounds-stepper-track">
            @for (r of roundNumbers(); track r) {
              <button
                type="button"
                class="stepper-item"
                [class.completed]="r < currentMatchRound()"
                [class.active]="r === viewingRound()"
                [class.future]="r > currentMatchRound()"
                (click)="selectRoundView(r)"
              >
                @if (r < currentMatchRound()) {
                  <span class="material-symbols-outlined check-icon">check</span>
                } @else {
                  <span>{{ r }}</span>
                }
              </button>
            }
          </div>
        </div>

        <!-- Validador de Bazas de la Mesa -->
        <div class="trick-validator-bar" [class.mismatch]="!isTricksBalanced()">
          <div class="validator-info">
            <span class="material-symbols-outlined validator-icon">
              {{ isTricksBalanced() ? 'verified' : 'warning' }}
            </span>
            <span>
              Bazas contadas:
              <strong class="tabular-nums font-bold">{{ totalTricksEntered() }}</strong>
              / {{ viewingRound() }} de la ronda
            </span>
          </div>
          <span
            class="badge"
            [class.badge-success]="isTricksBalanced()"
            [class.badge-warning]="!isTricksBalanced()"
          >
            {{ isTricksBalanced() ? 'Cuadradas' : 'Descuadre' }}
          </span>
        </div>
      </div>

      <!-- Modal de Reglas Rápidas Desplegable -->
      @if (showRulesModal()) {
        <div class="rules-quick-modal">
          <div class="rules-modal-header">
            <div class="rules-modal-title">
              <span class="material-symbols-outlined">menu_book</span>
              <h3>Arbitraje Rápido (Ronda {{ viewingRound() }})</h3>
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
              <span class="results-sub">Skull King • Clasificación Final de Mesa</span>
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
                    <span class="rank-role">{{ rank.rank === 1 ? 'Ganador de la Mesa' : rank.rank + 'º Puesto' }}</span>
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
                        <td class="col-ronda font-semibold">R{{ r.roundNumber }}</td>
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

          <div
            class="player-card"
            [class.leader-card]="currentRank === 1"
            [style.background-image]="gameTheme()?.gradient"
          >
            @if (gameTheme()?.bgImageUrl; as bg) {
              <div
                class="card-thematic-art"
                [style.background-image]="'url(' + bg + ')'"
              ></div>
            }
            <div class="player-card-header">
              <div class="player-profile">
                <div class="player-avatar" [class.leader-avatar]="currentRank === 1">
                  {{ player.name.charAt(0).toUpperCase() }}
                </div>
                <div class="player-meta">
                  <div class="player-name-row">
                    <span class="player-name">{{ player.name }}</span>
                    <span
                      class="badge"
                      [class.badge-gold]="currentRank === 1"
                      [class.badge-rank]="currentRank > 1"
                    >
                      {{ currentRank }}º
                    </span>
                  </div>
                  <span class="player-score-prev">
                    Total: <strong class="tabular-nums">{{ getPlayerTotalScore(player.id) }} pts</strong>
                  </span>
                </div>
              </div>

              <!-- Pronóstico dinámico de ronda -->
              <div class="forecast-badge" [class.success]="forecast.bidMade" [class.danger]="!forecast.bidMade">
                <span class="forecast-pts">
                  {{ forecast.roundScore >= 0 ? '+' : '' }}{{ forecast.roundScore }} pts
                </span>
                <span class="forecast-status">
                  {{ forecast.bidMade ? 'Acertada' : 'Fallada' }}
                </span>
              </div>
            </div>

            <!-- Fila de Apuesta (Bid) -->
            <div class="selector-group">
              <div class="selector-header">
                <span class="selector-title">🎯 APUESTA (BID)</span>
                <span class="selector-current">Apuesta: {{ pData.bid }} bazas</span>
              </div>
              <div class="buttons-grid">
                @for (val of possibleTricksArray(); track val) {
                  <button
                    type="button"
                    class="number-btn"
                    [class.selected-bid]="pData.bid === val"
                    (click)="setPlayerBid(player.id, val)"
                  >
                    {{ val }}
                  </button>
                }
              </div>
            </div>

            <!-- Fila de Bazas Ganadas (Tricks) -->
            <div class="selector-group">
              <div class="selector-header">
                <span class="selector-title">🏆 BAZAS CONSEGUIDAS</span>
                <span class="selector-current">Ganadas: {{ pData.tricks }}</span>
              </div>
              <div class="buttons-grid">
                @for (val of possibleTricksArray(); track val) {
                  <button
                    type="button"
                    class="number-btn"
                    [class.selected-trick]="pData.tricks === val"
                    (click)="setPlayerTricks(player.id, val)"
                  >
                    {{ val }}
                  </button>
                }
              </div>
            </div>

            <!-- Botones de Bonificación (Solo si reglas recientes activas) -->
            @if (match().config.recentRules) {
              <div class="bonus-section">
                <div class="bonus-header">
                  <span class="selector-title">💎 BONIFICACIONES RECIENTES</span>
                  <span class="bonus-val tabular-nums">+{{ pData.bonusPoints || 0 }} pts</span>
                </div>
                <div class="bonus-chips-row">
                  <button
                    type="button"
                    class="bonus-chip"
                    [class.active-bonus]="(pData.bonusPoints || 0) >= 30"
                    (click)="toggleBonus(player.id, 30)"
                  >
                    <span>💀 +30 Rey vs Piratas</span>
                  </button>
                  <button
                    type="button"
                    class="bonus-chip"
                    [class.active-bonus]="(pData.bonusPoints || 0) >= 40"
                    (click)="toggleBonus(player.id, 40)"
                  >
                    <span>🧜 +40 Sirena vs Rey</span>
                  </button>
                  <button
                    type="button"
                    class="bonus-chip"
                    [class.active-bonus]="(pData.bonusPoints || 0) >= 20"
                    (click)="toggleBonus(player.id, 20)"
                  >
                    <span>🪙 +20 Botín/Cofre</span>
                  </button>
                  <button
                    type="button"
                    class="bonus-chip"
                    [class.active-bonus]="(pData.bonusPoints || 0) >= 10"
                    (click)="toggleBonus(player.id, 10)"
                  >
                    <span>🃏 +10 Carta 14</span>
                  </button>
                  @if ((pData.bonusPoints || 0) > 0) {
                    <button
                      type="button"
                      class="bonus-chip clear-chip"
                      (click)="clearBonuses(player.id)"
                    >
                      Limpiar
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- SECCIÓN 3: Visualización Informativa de Puntos Ronda por Ronda -->
      <div
        class="matrix-card"
        [style.background-image]="gameTheme()?.gradient"
      >
        @if (gameTheme()?.bgImageUrl; as bg) {
          <div
            class="card-thematic-art"
            [style.background-image]="'url(' + bg + ')'"
          ></div>
        }
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
                  <td class="col-round font-semibold">Ronda {{ round.roundNumber }}</td>
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

              <!-- Fila Proyectada en Vivo de la Ronda Activa -->
              @if (match().status === 'in_progress') {
                <tr class="round-row live-projected-row">
                  <td class="col-round font-bold flex-live-cell">
                    <span class="live-dot animate-pulse"></span>
                    R{{ currentMatchRound() }} (Activa)
                  </td>
                  @for (p of match().players; track p.id) {
                    @let forecast = getPlayerForecast(p.id);
                    @let prev = getPlayerPrevScore(p.id);
                    @let projTotal = prev + forecast.roundScore;

                    <td class="col-player text-center tabular-nums">
                      <span class="cell-pts font-bold" [class.text-success]="forecast.roundScore > 0" [class.text-danger]="forecast.roundScore < 0">
                        {{ forecast.roundScore >= 0 ? '+' : '' }}{{ forecast.roundScore }}
                      </span>
                      <span class="cell-accum">({{ projTotal }})</span>
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
        @if (viewingRound() < currentMatchRound()) {
          <div class="inspect-mode-banner">
            <span>Viendo Ronda {{ viewingRound() }} archivada</span>
            <button type="button" class="btn-return" (click)="selectRoundView(currentMatchRound())">
              Volver a Ronda {{ currentMatchRound() }}
            </button>
          </div>
        } @else {
          <!-- Botón de Confirmación: En la última ronda muestra Finalizar y Ver Resultados sin saltar a Ronda 11 -->
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
              [disabled]="match().status === 'completed'"
              (click)="confirmCurrentRound()"
            >
              <span>Confirmar Ronda {{ viewingRound() }} y Avanzar</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          }

          <div class="secondary-actions-row">
            @if (currentMatchRound() > 1 && match().status === 'in_progress') {
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
              Estás en medio de una partida de Skull King. Si confirmas, saldrás al catálogo de juegos y esta partida <strong>no se guardará en el historial</strong>.
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

    .header-top,
    .stepper-section {
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

    .round-status-text {
      font-weight: 700;
      color: var(--color-text-primary);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-primary);
      display: inline-block;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { opacity: 0.4; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.1); }
      100% { opacity: 0.4; transform: scale(0.9); }
    }

    .cards-count-text {
      color: var(--color-text-muted);
    }

    .rounds-stepper-track {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .stepper-item {
      flex: 1;
      min-width: 32px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-secondary);
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
    }

    .stepper-item.completed {
      background: rgba(96, 150, 186, 0.2);
      border-color: rgba(96, 150, 186, 0.4);
      color: var(--color-steel-blue);
    }

    .stepper-item.active {
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-weight: 800;
      box-shadow: 0 0 12px rgba(163, 206, 241, 0.35);
      min-width: 38px;
    }

    .stepper-item.future {
      opacity: 0.5;
    }

    .check-icon {
      font-size: 18px;
    }

    .trick-validator-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-sm) var(--space-md);
      background: var(--color-surface-container-lowest);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);
      font-size: 13px;
    }

    .trick-validator-bar.mismatch {
      border-color: rgba(245, 158, 11, 0.4);
    }

    .validator-info {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .validator-icon {
      font-size: 18px;
      color: var(--color-primary);
    }

    .rules-quick-modal {
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-lg);
      padding: var(--space-md);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .rules-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-sm);
    }

    .rules-modal-title {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      color: var(--color-primary);
    }

    .rules-modal-title h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
    }

    .rules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-sm);
    }

    .rule-box {
      background: var(--color-surface-container);
      padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);
    }

    .rule-title {
      display: block;
      font-weight: 700;
      font-size: 13px;
      color: var(--color-primary);
      margin-bottom: 4px;
    }

    .rule-desc {
      margin: 0;
      font-size: 12px;
      color: var(--color-text-secondary);
      line-height: 1.4;
    }

    /* Modal / Vista de Resultados Finales */
    .final-results-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(6, 14, 32, 0.85);
      backdrop-filter: blur(8px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-md);
    }

    .final-results-card {
      position: relative;
      overflow: hidden;
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-xl);
      padding: var(--space-lg);
      max-width: 650px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .results-header,
    .podium-display,
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
      font-size: 42px;
    }

    .results-title {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      color: var(--color-primary);
    }

    .results-sub {
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .podium-display {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .podium-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px var(--space-md);
      background: var(--color-surface-container-high);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);
    }

    .podium-row.winner-gold {
      background: rgba(251, 191, 36, 0.12);
      border-color: var(--color-gold);
    }

    .podium-rank-box {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 48px;
    }

    .podium-place-num {
      font-size: 16px;
      font-weight: 800;
    }

    .crown-icon {
      font-size: 18px;
    }

    .podium-player-name {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .name-text {
      font-weight: 700;
      font-size: 15px;
      color: var(--color-text-primary);
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

    .results-matrix-preview {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .matrix-preview-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--color-text-secondary);
    }

    .matrix-table-wrap {
      width: 100%;
      overflow-x: auto;
      background: var(--color-surface-container-lowest);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);
      max-height: 200px;
    }

    .results-actions {
      margin-top: var(--space-sm);
    }

    .btn-return-catalog {
      width: 100%;
      min-height: 48px;
      border-radius: var(--radius-lg);
      background: var(--color-primary);
      color: var(--color-on-primary);
      border: none;
      font-size: 15px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(163, 206, 241, 0.3);
    }

    .players-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .player-card {
      position: relative;
      overflow: hidden;
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .player-card > * {
      position: relative;
      z-index: 1;
    }

    .player-card.leader-card {
      border-color: rgba(163, 206, 241, 0.4);
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
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-default);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      color: var(--color-primary);
    }

    .player-avatar.leader-avatar {
      background: rgba(163, 206, 241, 0.2);
      border-color: var(--color-primary);
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

    .forecast-badge {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 4px 10px;
      border-radius: var(--radius-md);
      border: 1px solid;
    }

    .forecast-badge.success {
      background: var(--color-success-bg);
      border-color: rgba(52, 211, 153, 0.3);
      color: var(--color-success);
    }

    .forecast-badge.danger {
      background: var(--color-danger-bg);
      border-color: rgba(248, 113, 113, 0.3);
      color: var(--color-danger);
    }

    .forecast-pts {
      font-size: 14px;
      font-weight: 800;
    }

    .forecast-status {
      font-size: 11px;
      opacity: 0.9;
    }

    .selector-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .selector-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-text-muted);
      letter-spacing: 0.05em;
    }

    .selector-current {
      color: var(--color-primary);
    }

    .buttons-grid {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 2px 0;
    }

    .number-btn {
      flex: 1;
      min-width: 44px;
      min-height: 44px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-primary);
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .number-btn:active {
      transform: scale(0.96);
    }

    .number-btn.selected-bid {
      background: var(--color-primary);
      color: var(--color-on-primary);
      border-color: var(--color-primary);
      box-shadow: 0 2px 8px rgba(163, 206, 241, 0.4);
    }

    .number-btn.selected-trick {
      background: var(--color-steel-blue);
      color: #ffffff;
      border-color: var(--color-steel-blue);
      box-shadow: 0 2px 8px rgba(96, 150, 186, 0.4);
    }

    .bonus-section {
      padding-top: var(--space-xs);
      border-top: 1px solid var(--color-border-subtle);
    }

    .bonus-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-text-muted);
      margin-bottom: 6px;
    }

    .bonus-val {
      color: var(--color-steel-blue);
      font-weight: 800;
    }

    .bonus-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .bonus-chip {
      min-height: 36px;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-primary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .bonus-chip.active-bonus {
      background: rgba(163, 206, 241, 0.25);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .bonus-chip.clear-chip {
      background: transparent;
      border-color: var(--color-text-muted);
      color: var(--color-text-muted);
    }

    /* Matriz de Historial */
    .matrix-card {
      position: relative;
      overflow: hidden;
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    }

    .matrix-card > * {
      position: relative;
      z-index: 1;
    }

    .matrix-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-sm);
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
      padding: 8px;
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .col-round, .col-ronda {
      white-space: nowrap;
      text-align: left;
    }

    .col-player, .col-p {
      min-width: 85px;
    }

    .th-leader {
      color: var(--color-primary);
    }

    .cell-leader {
      background: rgba(163, 206, 241, 0.08);
      color: var(--color-primary);
    }

    .cell-pts, .pts-val {
      font-size: 13px;
      margin-right: 3px;
    }

    .cell-accum, .accum-val {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .live-projected-row {
      background: rgba(39, 76, 119, 0.25);
      border: 1px solid var(--color-border-strong);
    }

    .flex-live-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--color-primary);
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-primary);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-size: 11px;
      font-weight: 700;
    }

    .badge-table {
      background: rgba(163, 206, 241, 0.15);
      color: var(--color-primary);
      border: 1px solid rgba(163, 206, 241, 0.3);
    }

    .badge-gold {
      background: var(--color-gold);
      color: #000;
    }

    .badge-rank {
      background: var(--color-surface-container-high);
      color: var(--color-text-secondary);
    }

    .badge-success {
      background: var(--color-success-bg);
      color: var(--color-success);
    }

    .badge-warning {
      background: var(--color-warning-bg);
      color: var(--color-warning);
    }

    .text-success {
      color: var(--color-success);
    }

    .text-danger {
      color: var(--color-danger);
    }

    .bottom-action-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: var(--space-md);
      background: rgba(11, 19, 38, 0.92);
      backdrop-filter: blur(12px);
      border-top: 1px solid var(--color-border-subtle);
      z-index: 40;
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .btn-primary-action {
      width: 100%;
      min-height: 48px;
      border-radius: var(--radius-lg);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-size: 15px;
      font-weight: 800;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(163, 206, 241, 0.3);
      transition: transform 0.1s ease;
    }

    .btn-primary-action.btn-final-round {
      background: var(--color-gold);
      color: #000000;
      box-shadow: 0 4px 16px rgba(251, 191, 36, 0.4);
    }

    .btn-primary-action:active {
      transform: scale(0.98);
    }

    .secondary-actions-row {
      display: flex;
      gap: var(--space-sm);
    }

    .btn-secondary-action {
      flex: 1;
      min-height: 42px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-primary);
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

    .inspect-mode-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-sm) var(--space-md);
      background: var(--color-surface-container-high);
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 600;
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
  `],
})
export class SkullKingScorerComponent {
  match = input.required<MatchRecord<SkullKingConfig, SkullKingRoundInput>>();
  private matchManager = inject(MatchManagerService);
  private registry = inject(GameRegistryService);
  private router = inject(Router);
  private engine = new SkullKingEngine();

  readonly gameTheme = computed(() => this.registry.getGame(this.match().gameId)?.metadata?.theme);
  readonly quickRules = SKULL_KING_RULES.content.es.summary;

  showRulesModal = signal(false);
  showFinalResultsModal = signal(false);
  showAbandonConfirmModal = signal(false);
  viewingRound = signal(1);
  draftInputs = signal<Record<string, SkullKingRoundInput>>({});

  totalRounds = computed(() => this.match().config.rounds || 10);
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

  possibleTricksArray = computed(() => {
    const r = this.viewingRound();
    return Array.from({ length: r + 1 }, (_, i) => i);
  });

  totalTricksEntered = computed(() => {
    const inputs = this.draftInputs();
    let sum = 0;
    for (const item of Object.values(inputs)) {
      sum += item.tricks || 0;
    }
    return sum;
  });

  isTricksBalanced = computed(() => {
    return this.totalTricksEntered() === this.viewingRound();
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
      const roundNum = Math.min(match.currentRound, this.totalRounds());
      this.viewingRound.set(roundNum);

      if (match.status === 'completed') {
        this.showFinalResultsModal.set(true);
      }

      // Initialize inputs from existing draft or create default 0
      const initial: Record<string, SkullKingRoundInput> = {};
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

  selectRoundView(r: number): void {
    this.viewingRound.set(r);
    const roundRecord = this.match().rounds.find((rec) => rec.roundNumber === r);

    if (roundRecord) {
      this.draftInputs.set({ ...(roundRecord.data as Record<string, SkullKingRoundInput>) });
    } else {
      const draft = this.match().currentDraftRoundData || {};
      const inputs: Record<string, SkullKingRoundInput> = {};
      this.match().players.forEach((p) => {
        inputs[p.id] = {
          bid: draft[p.id]?.bid ?? 0,
          tricks: draft[p.id]?.tricks ?? 0,
          bonusPoints: draft[p.id]?.bonusPoints ?? 0,
        };
      });
      this.draftInputs.set(inputs);
    }
  }

  setPlayerBid(playerId: string, bid: number): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { bid: 0, tricks: 0, bonusPoints: 0 };
      const updated = { ...prev, [playerId]: { ...current, bid } };
      this.matchManager.saveDraftRoundData(updated);
      return updated;
    });
  }

  setPlayerTricks(playerId: string, tricks: number): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { bid: 0, tricks: 0, bonusPoints: 0 };
      const updated = { ...prev, [playerId]: { ...current, tricks } };
      this.matchManager.saveDraftRoundData(updated);
      return updated;
    });
  }

  toggleBonus(playerId: string, points: number): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { bid: 0, tricks: 0, bonusPoints: 0 };
      const currentBonus = current.bonusPoints || 0;
      const updatedBonus = currentBonus + points;
      const updated = { ...prev, [playerId]: { ...current, bonusPoints: updatedBonus } };
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
    const scores = this.match().players.map((p) => ({
      id: p.id,
      score: this.match().cumulativeScores[p.id] ?? 0,
    }));
    scores.sort((a, b) => b.score - a.score);
    const idx = scores.findIndex((s) => s.id === playerId);
    return idx >= 0 ? idx + 1 : 1;
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
