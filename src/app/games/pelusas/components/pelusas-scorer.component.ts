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
  PelusasConfig,
  PelusasRoundInput,
  PelusasEngine,
} from '../pelusas.engine';
import { PELUSAS_RULES } from '../pelusas.rules';

@Component({
  selector: 'app-pelusas-scorer',
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
              <span class="game-icon">🧶</span>
              <h2 class="game-name">Pelusas</h2>
              <span class="badge badge-table">
                Ronda {{ viewingRound() }} de {{ totalRounds() }}
              </span>
            </div>
            <p class="dealer-text">
              <span>Robo y gestión de riesgo • {{ match().players.length }} Jugadores</span>
              <span class="dot-separator">•</span>
              <span class="dealer-badge">Turno inicial: {{ currentDealer()?.name }} 👑</span>
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

        <!-- Stepper horizontal de Rondas -->
        <div class="stepper-section">
          <div class="stepper-label-row">
            <span class="round-status-text">
              <span class="pulse-dot"></span>
              {{ isEditingPastRound() ? 'Editando Ronda ' + viewingRound() : 'Ronda en Curso: ' + viewingRound() }}
            </span>
            <span class="cards-count-text">
              {{ isLastRound() ? '¡Ronda Final!' : 'Rondas restantes: ' + (totalRounds() - viewingRound()) }}
            </span>
          </div>

          <div class="rounds-stepper-track">
            @for (r of roundNumbers(); track r) {
              <button
                type="button"
                class="stepper-item"
                [class.active-step]="r === viewingRound()"
                [class.completed-step]="r < currentMatchRound()"
                (click)="navigateToRound(r)"
                [disabled]="r > currentMatchRound()"
              >
                <span>R{{ r }}</span>
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Banner de Advertencia si está editando ronda pasada -->
      @if (isEditingPastRound()) {
        <div class="past-round-banner">
          <div class="banner-left">
            <span class="material-symbols-outlined">edit_note</span>
            <span>Modificando datos de la <strong>Ronda {{ viewingRound() }}</strong></span>
          </div>
          <button type="button" class="btn-return-live" (click)="returnToCurrentRound()">
            Volver a R{{ currentMatchRound() }}
          </button>
        </div>
      }

      <!-- 2. Tarjetas de Entrada de Puntos por Jugador -->
      <div class="players-list">
        @for (player of match().players; track player.id) {
          @let pData = draftInputs()[player.id] || { points: 0, lostToWind: false };
          @let prevScore = getPlayerPreviousScore(player.id);
          @let roundPts = pData.lostToWind ? 0 : (pData.points || 0);
          @let projectedTotal = prevScore + roundPts;
          @let currentRank = getPlayerRank(player.id);
          @let showDetail = expandedCardCounter()[player.id] || false;

          <div
            class="player-card"
            [class.leader-card]="currentRank === 1"
            [class.wind-bust-card]="pData.lostToWind"
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
                    @if (currentRank === 1) {
                      <span class="badge badge-gold">
                        <span class="material-symbols-outlined small-icon">trophy</span> Líder
                      </span>
                    } @else {
                      <span class="badge badge-rank">{{ currentRank }}º</span>
                    }
                  </div>
                  <span class="player-sub">Puntos acumulados previos: {{ prevScore }} pts</span>
                </div>
              </div>

              <!-- Puntuación total proyectada -->
              <div class="total-score-badge text-right">
                <span class="total-number tabular-nums" [class.text-primary]="currentRank === 1" [class.text-muted]="pData.lostToWind">
                  {{ projectedTotal }}
                </span>
                <span class="total-label">Total Pts</span>
              </div>
            </div>

            <!-- Resumen de estado de esta ronda -->
            <div class="round-status-bar" [class.bar-wind]="pData.lostToWind">
              @if (pData.lostToWind) {
                <span class="wind-alert-text">
                  <span class="material-symbols-outlined">air</span>
                  ¡Corriente de aire! Perdió todo lo de este turno (0 pts)
                </span>
              } @else {
                <span class="pts-added-text">
                  En esta ronda: <strong>+{{ pData.points || 0 }} pts</strong>
                  @if (pData.cardCounts && getCardCountTotal(pData.cardCounts) > 0) {
                    <span class="cards-count-badge">({{ getCardCountTotal(pData.cardCounts) }} cartas)</span>
                  }
                </span>
              }
            </div>

            <!-- Botones Rápidos de Puntos y Corriente de Aire -->
            <div class="quick-entry-row">
              <div class="quick-chips">
                <button
                  type="button"
                  class="btn-quick-val"
                  (click)="addPoints(player.id, 1)"
                  [disabled]="pData.lostToWind"
                >
                  +1
                </button>
                <button
                  type="button"
                  class="btn-quick-val"
                  (click)="addPoints(player.id, 5)"
                  [disabled]="pData.lostToWind"
                >
                  +5
                </button>
                <button
                  type="button"
                  class="btn-quick-val"
                  (click)="addPoints(player.id, 10)"
                  [disabled]="pData.lostToWind"
                >
                  +10
                </button>
                <button
                  type="button"
                  class="btn-quick-val"
                  (click)="addPoints(player.id, 20)"
                  [disabled]="pData.lostToWind"
                >
                  +20
                </button>
              </div>

              <!-- Botón Toggle de Corriente de Aire -->
              <button
                type="button"
                class="btn-wind-toggle"
                [class.active-wind]="pData.lostToWind"
                (click)="toggleWindBust(player.id)"
              >
                <span class="material-symbols-outlined">air</span>
                <span>{{ pData.lostToWind ? 'Recuperar Puntos' : '¡Viento! (0)' }}</span>
              </button>
            </div>

            <!-- Input Numérico Manual y Toggle de Desglose -->
            <div class="input-actions-bar">
              <div class="manual-input-box">
                <label [for]="'pts-input-' + player.id" class="manual-input-label">Puntos directos:</label>
                <div class="num-stepper-box">
                  <button
                    type="button"
                    class="btn-step"
                    (click)="addPoints(player.id, -1)"
                    [disabled]="pData.lostToWind || (pData.points || 0) <= 0"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    [id]="'pts-input-' + player.id"
                    class="direct-num-input"
                    [value]="pData.points || 0"
                    (change)="onDirectPointsChange(player.id, $event)"
                    [disabled]="pData.lostToWind"
                    min="0"
                  />
                  <button
                    type="button"
                    class="btn-step"
                    (click)="addPoints(player.id, 1)"
                    [disabled]="pData.lostToWind"
                  >
                    +
                  </button>
                </div>
              </div>

              <!-- Botón Desplegable para desglose de cartas (1-10) -->
              <button
                type="button"
                class="btn-toggle-breakdown"
                [class.active-toggle]="showDetail"
                (click)="toggleCardCounter(player.id)"
              >
                <span class="material-symbols-outlined">style</span>
                <span>{{ showDetail ? 'Ocultar Cartas' : 'Contar por Cartas (1-10)' }}</span>
                <span class="material-symbols-outlined arrow-icon">
                  {{ showDetail ? 'expand_less' : 'expand_more' }}
                </span>
              </button>
            </div>

            <!-- Panel Expandible de Desglose de Cartas 1 a 10 -->
            @if (showDetail) {
              <div class="cards-breakdown-drawer">
                <span class="drawer-title">Toca las cartas que acumuló en su montón seguro:</span>
                <div class="cards-grid">
                  @for (num of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track num) {
                    @let count = (pData.cardCounts && pData.cardCounts[num]) || 0;
                    <div class="card-item-counter">
                      <div class="card-chip-val" [class.has-cards]="count > 0">
                        <span class="card-badge-num">{{ num }}</span>
                        <span class="card-sub-mult">{{ count > 0 ? count + 'x = ' + (num * count) : num + ' pts' }}</span>
                      </div>
                      <div class="chip-stepper">
                        <button
                          type="button"
                          class="btn-chip-sub"
                          (click)="adjustCardCount(player.id, num, -1)"
                          [disabled]="count <= 0 || pData.lostToWind"
                        >
                          -
                        </button>
                        <span class="chip-qty-num">{{ count }}</span>
                        <button
                          type="button"
                          class="btn-chip-add"
                          (click)="adjustCardCount(player.id, num, 1)"
                          [disabled]="pData.lostToWind"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- 3. Tabla Matriz Informativa de Puntos por Ronda -->
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
            Historial de Pelusas por Ronda
          </h3>
          <span class="matrix-hint">Puntos Ronda (Total Acumulado)</span>
        </div>

        <div class="matrix-scroll-wrapper">
          <table class="matrix-table">
            <thead>
              <tr>
                <th class="col-round">Ronda</th>
                @for (p of match().players; track p.id) {
                  @let rank = getPlayerRank(p.id);
                  <th class="col-player" [class.col-leader]="rank === 1">
                    <div class="th-content">
                      <span>{{ p.name }}</span>
                      @if (rank === 1) {
                        <span class="trophy-tag">👑 1º</span>
                      }
                    </div>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (r of roundRows(); track r.roundNum) {
                <tr [class.current-row]="r.roundNum === currentMatchRound()">
                  <td class="col-round-num font-bold">R{{ r.roundNum }}</td>
                  @for (p of match().players; track p.id) {
                    @let isBust = r.lostToWind[p.id];
                    @let pts = r.roundPoints[p.id] ?? 0;
                    @let cum = r.cumulativeScores[p.id] ?? 0;
                    <td class="col-score text-center" [class.score-bust]="isBust">
                      @if (isBust) {
                        <span class="round-pts text-danger font-bold">💨 0</span>
                      } @else {
                        <span class="round-pts font-bold">+{{ pts }}</span>
                      }
                      <span class="cum-pts tabular-nums">({{ cum }})</span>
                    </td>
                  }
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="totals-row">
                <td class="font-bold">Total</td>
                @for (p of match().players; track p.id) {
                  @let rank = getPlayerRank(p.id);
                  <td class="col-score text-center font-bold" [class.text-gold]="rank === 1">
                    <span class="final-total tabular-nums">{{ getPlayerTotalScore(p.id) }} pts</span>
                  </td>
                }
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Barra Inferior Flotante de Acciones -->
      <div class="floating-actions-bar">
        @if (isLastRound() && !isEditingPastRound()) {
          <button
            type="button"
            class="btn-primary-action btn-finish-match"
            (click)="finishMatch()"
          >
            <span class="material-symbols-outlined">emoji_events</span>
            <span>Finalizar y Ver Podio</span>
          </button>
        } @else {
          <button
            type="button"
            class="btn-primary-action"
            [disabled]="match().status === 'completed'"
            (click)="confirmCurrentRound()"
          >
            <span class="material-symbols-outlined">check_circle</span>
            <span>
              {{ isEditingPastRound() ? 'Guardar Cambios Ronda ' + viewingRound() : 'Confirmar Ronda ' + viewingRound() }}
            </span>
          </button>
        }

        @if (match().status === 'in_progress') {
          <div class="secondary-actions-row">
            @if (currentMatchRound() > 1 && !isEditingPastRound()) {
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
              <h2 class="results-title">¡Partida de Pelusas Finalizada!</h2>
              <span class="results-sub">
                {{ matchEvaluation().reason || 'Clasificación final tras ' + totalRounds() + ' rondas' }}
              </span>
            </div>

            <!-- Podio de Clasificación -->
            <div class="results-podium">
              @for (item of matchEvaluation().rankings; track item.playerId) {
                @let player = getPlayerById(item.playerId);
                <div class="podium-row" [class.winner-row]="item.rank === 1">
                  <div class="podium-left">
                    <span class="medal-icon">
                      {{ item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank + 'º' }}
                    </span>
                    <div class="podium-player">
                      <span class="podium-name font-bold">{{ player?.name }}</span>
                      @if (item.onesCount > 0) {
                        <span class="tiebreak-note">({{ item.onesCount }} cartas de 1)</span>
                      }
                    </div>
                  </div>
                  <div class="podium-right">
                    <span class="podium-score tabular-nums font-bold">{{ item.totalScore }} pts</span>
                  </div>
                </div>
              }
            </div>

            <!-- Botones de Acción Final -->
            <div class="results-actions">
              <button type="button" class="btn-primary-action" (click)="returnToCatalog()">
                <span class="material-symbols-outlined">storefront</span>
                <span>Volver al Catálogo</span>
              </button>
              <button type="button" class="btn-secondary-action" (click)="toggleFinalResultsModal()">
                <span class="material-symbols-outlined">visibility</span>
                <span>Revisar Marcador</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal de Reglas Rápidas -->
      @if (showRulesModal()) {
        <div class="rules-modal-overlay" (click)="toggleRulesModal()">
          <div class="rules-dialog-card" (click)="$event.stopPropagation()">
            <div class="rules-modal-header">
              <h3>
                <span class="material-symbols-outlined modal-icon">help_center</span>
                Reglas Rápidas de Pelusas
              </h3>
              <button type="button" class="btn-close-modal" (click)="toggleRulesModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="rules-modal-body">
              @for (sec of quickRules; track sec.id) {
                <div class="rule-quick-item">
                  <span class="rule-title-pill">
                    <span class="material-symbols-outlined">{{ sec.icon }}</span>
                    {{ sec.title }}
                  </span>
                  <p class="rule-text">{{ sec.content }}</p>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Modal de Confirmación: Abandonar Partida en Medio del Juego -->
      @if (showAbandonConfirmModal()) {
        <div class="modal-overlay" (click)="cancelAbandon()">
          <div class="modal-dialog-card" (click)="$event.stopPropagation()">
            <div class="modal-icon-badge danger-badge">
              <span class="material-symbols-outlined">warning</span>
            </div>
            <h3 class="modal-title">¿Abandonar la partida?</h3>
            <p class="modal-message">
              Estás en medio de una partida de Pelusas. Si confirmas, saldrás al catálogo de juegos y esta partida <strong>no se guardará en el historial</strong>.
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
    .player-card,
    .matrix-card,
    .final-results-card {
      position: relative;
      overflow: hidden;
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    }

    .match-header-card > *,
    .player-card > *,
    .matrix-card > *,
    .final-results-card > * {
      position: relative;
      z-index: 1;
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
      font-size: 28px;
    }

    .game-name {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .badge-table {
      background: rgba(236, 72, 153, 0.2);
      color: #ec4899;
      font-weight: 700;
      font-size: 12px;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      border: 1px solid rgba(236, 72, 153, 0.4);
    }

    .dealer-text {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .dealer-badge {
      color: var(--color-primary);
      font-weight: 600;
    }

    .dot-separator {
      opacity: 0.5;
    }

    .icon-action-btn {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .stepper-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .stepper-label-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .round-status-text {
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ec4899;
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
      padding-bottom: 2px;
    }

    .stepper-item {
      flex: 1;
      min-width: 44px;
      height: 38px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-secondary);
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .stepper-item.active-step {
      background: #ec4899;
      color: #ffffff;
      border-color: #db2777;
    }

    .stepper-item.completed-step {
      border-color: rgba(236, 72, 153, 0.5);
      color: var(--color-text-primary);
    }

    .stepper-item:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .past-round-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-sm) var(--space-md);
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      border-radius: var(--radius-lg);
      font-size: 13px;
      color: var(--color-warning);
    }

    .banner-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-return-live {
      padding: 6px 12px;
      border-radius: var(--radius-md);
      background: var(--color-warning);
      color: #000;
      border: none;
      font-weight: 700;
      cursor: pointer;
    }

    .players-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .player-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .player-card.leader-card {
      border-color: rgba(251, 191, 36, 0.5);
    }

    .player-card.wind-bust-card {
      border-color: rgba(6, 182, 212, 0.4);
      background: rgba(6, 182, 212, 0.05);
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
      border-radius: 50%;
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      font-weight: 800;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-primary);
    }

    .player-avatar.leader-avatar {
      background: rgba(251, 191, 36, 0.2);
      border-color: #fbbf24;
      color: #fbbf24;
    }

    .player-meta {
      display: flex;
      flex-direction: column;
    }

    .player-name-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .player-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .player-sub {
      font-size: 12px;
      color: var(--color-text-muted);
    }

    .badge-gold {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-full);
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .badge-rank {
      background: var(--color-surface-container-high);
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: var(--radius-full);
    }

    .small-icon {
      font-size: 14px;
    }

    .total-score-badge {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .total-number {
      font-size: 24px;
      font-weight: 900;
      line-height: 1;
    }

    .total-label {
      font-size: 11px;
      color: var(--color-text-muted);
      text-transform: uppercase;
    }

    .round-status-bar {
      padding: 6px 12px;
      border-radius: var(--radius-md);
      background: rgba(236, 72, 153, 0.08);
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .round-status-bar.bar-wind {
      background: rgba(6, 182, 212, 0.15);
      color: #38bdf8;
    }

    .wind-alert-text {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
    }

    .cards-count-badge {
      font-size: 12px;
      color: var(--color-text-muted);
      margin-left: 4px;
    }

    .quick-entry-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .quick-chips {
      display: flex;
      gap: 6px;
    }

    .btn-quick-val {
      min-width: 44px;
      height: 38px;
      padding: 0 10px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-primary);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-quick-val:hover {
      background: var(--color-surface-container-highest);
    }

    .btn-quick-val:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .btn-wind-toggle {
      height: 38px;
      padding: 0 12px;
      border-radius: var(--radius-md);
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(6, 182, 212, 0.4);
      color: #38bdf8;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }

    .btn-wind-toggle.active-wind {
      background: #0284c7;
      color: #ffffff;
      border-color: #0369a1;
    }

    .input-actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .manual-input-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .manual-input-label {
      font-size: 12px;
      color: var(--color-text-muted);
    }

    .num-stepper-box {
      display: flex;
      align-items: center;
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      overflow: hidden;
    }

    .btn-step {
      width: 36px;
      height: 36px;
      background: transparent;
      border: none;
      color: var(--color-text-primary);
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-step:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .direct-num-input {
      width: 50px;
      height: 36px;
      text-align: center;
      background: transparent;
      border: none;
      color: var(--color-text-primary);
      font-weight: 800;
      font-size: 15px;
    }

    .btn-toggle-breakdown {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border-radius: var(--radius-md);
      background: transparent;
      border: 1px solid var(--color-border-subtle);
      color: var(--color-primary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-toggle-breakdown.active-toggle {
      background: var(--color-primary-container);
    }

    .cards-breakdown-drawer {
      padding: var(--space-sm);
      border-radius: var(--radius-lg);
      background: rgba(0, 0, 0, 0.2);
      border: 1px dashed var(--color-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .drawer-title {
      font-size: 11px;
      color: var(--color-text-muted);
      font-weight: 600;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 6px;
    }

    .card-item-counter {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      background: var(--color-surface-container-high);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);
    }

    .card-chip-val {
      display: flex;
      flex-direction: column;
    }

    .card-badge-num {
      font-size: 14px;
      font-weight: 900;
      color: var(--color-text-primary);
    }

    .card-chip-val.has-cards .card-badge-num {
      color: #ec4899;
    }

    .card-sub-mult {
      font-size: 10px;
      color: var(--color-text-muted);
    }

    .chip-stepper {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .btn-chip-sub,
    .btn-chip-add {
      width: 26px;
      height: 26px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border-subtle);
      background: var(--color-surface-container);
      color: var(--color-text-primary);
      font-weight: 800;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-chip-sub:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .chip-qty-num {
      min-width: 16px;
      text-align: center;
      font-size: 13px;
      font-weight: 800;
    }

    /* Tabla Matriz */
    .matrix-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .matrix-header {
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

    .matrix-hint {
      font-size: 12px;
      color: var(--color-text-muted);
    }

    .matrix-scroll-wrapper {
      overflow-x: auto;
    }

    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .matrix-table th,
    .matrix-table td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .col-round {
      text-align: left;
      width: 60px;
    }

    .col-player {
      text-align: center;
      min-width: 90px;
    }

    .col-player.col-leader {
      color: #fbbf24;
    }

    .th-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .trophy-tag {
      font-size: 10px;
    }

    .current-row {
      background: rgba(236, 72, 153, 0.08);
    }

    .score-bust {
      background: rgba(6, 182, 212, 0.08);
    }

    .round-pts {
      display: block;
      font-size: 13px;
    }

    .cum-pts {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .totals-row td {
      border-top: 2px solid var(--color-border-strong);
      border-bottom: none;
      padding-top: 10px;
    }

    .final-total {
      font-size: 15px;
    }

    .text-gold {
      color: #fbbf24;
    }

    /* Floating Bar */
    .floating-actions-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(11, 19, 38, 0.95);
      backdrop-filter: blur(16px);
      border-top: 1px solid var(--color-border-default);
      padding: var(--space-sm) var(--space-md);
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      max-width: 900px;
      margin: 0 auto;
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);
    }

    :host-context([data-theme="light"]) .floating-actions-bar {
      background: rgba(255, 255, 255, 0.95);
    }

    .btn-primary-action {
      width: 100%;
      min-height: 48px;
      border-radius: var(--radius-lg);
      background: #ec4899;
      color: #ffffff;
      border: none;
      font-weight: 800;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(236, 72, 153, 0.35);
    }

    .btn-primary-action:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .btn-finish-match {
      background: #10b981;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
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

    /* Resultados Finales Overlay */
    .final-results-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-md);
      overflow-y: auto;
    }

    .final-results-card {
      max-width: 600px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
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
      font-size: 24px;
      font-weight: 800;
      color: #ec4899;
    }

    .results-sub {
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .results-podium {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .podium-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: var(--color-surface-container-high);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border-subtle);
    }

    .podium-row.winner-row {
      background: rgba(251, 191, 36, 0.15);
      border-color: #fbbf24;
    }

    .podium-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .medal-icon {
      font-size: 24px;
    }

    .podium-name {
      font-size: 15px;
    }

    .tiebreak-note {
      font-size: 11px;
      color: var(--color-text-muted);
      margin-left: 6px;
    }

    .podium-score {
      font-size: 18px;
      color: #ec4899;
    }

    .results-actions {
      display: flex;
      gap: var(--space-sm);
    }

    /* Modal de Reglas */
    .rules-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(6px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-md);
    }

    .rules-dialog-card {
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-lg);
      max-width: 500px;
      width: 100%;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    }

    .rules-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-md);
    }

    .rules-modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-close-modal {
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
    }

    .rules-modal-body {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      max-height: 60vh;
      overflow-y: auto;
    }

    .rule-title-pill {
      font-size: 13px;
      font-weight: 700;
      color: #ec4899;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 2px;
    }

    .rule-text {
      margin: 0;
      font-size: 12px;
      color: var(--color-text-secondary);
      line-height: 1.4;
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
export class PelusasScorerComponent {
  match = input.required<MatchRecord<PelusasConfig, PelusasRoundInput>>();
  private matchManager = inject(MatchManagerService);
  private registry = inject(GameRegistryService);
  private router = inject(Router);
  private engine = new PelusasEngine();

  readonly gameTheme = computed(() => this.registry.getGame(this.match().gameId)?.metadata?.theme);
  readonly quickRules = PELUSAS_RULES.content.es.summary;

  showRulesModal = signal(false);
  showFinalResultsModal = signal(false);
  showAbandonConfirmModal = signal(false);
  viewingRound = signal(1);
  draftInputs = signal<Record<string, PelusasRoundInput>>({});
  expandedCardCounter = signal<Record<string, boolean>>({});

  totalRounds = computed(() => this.match().config.rounds || 3);
  currentMatchRound = computed(() => this.match().currentRound);

  isLastRound = computed(() => this.viewingRound() >= this.totalRounds());
  isEditingPastRound = computed(() => this.viewingRound() < this.currentMatchRound());

  roundNumbers = computed(() => {
    const total = this.totalRounds();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  currentDealer = computed(() => {
    const players = this.match().players;
    if (!players || players.length === 0) return null;
    const dealerIdx = (this.viewingRound() - 1) % players.length;
    return players[dealerIdx];
  });

  matchEvaluation = computed(() => {
    const m = this.match();
    return this.engine.evaluateMatchStatus(
      m.cumulativeScores,
      m.rounds.length,
      m.config
    );
  });

  roundRows = computed(() => {
    const m = this.match();
    return m.rounds.map((r) => {
      const lostToWind: Record<string, boolean> = {};
      for (const [pid, input] of Object.entries(r.data)) {
        lostToWind[pid] = !!input?.lostToWind;
      }
      return {
        roundNum: r.roundNumber,
        roundPoints: r.roundPoints,
        cumulativeScores: r.cumulativeScores,
        lostToWind,
      };
    });
  });

  constructor() {
    effect(
      () => {
        const m = this.match();
        this.viewingRound.set(m.currentRound);
        this.loadDraftForRound(m.currentRound);
      },
      { allowSignalWrites: true }
    );
  }

  loadDraftForRound(roundNum: number) {
    const m = this.match();
    const existing = m.rounds?.find((r) => r.roundNumber === roundNum);
    const initial: Record<string, PelusasRoundInput> = {};

    for (const p of m.players) {
      if (existing && existing.data[p.id]) {
        initial[p.id] = { ...existing.data[p.id] };
      } else {
        initial[p.id] = { points: 0, lostToWind: false };
      }
    }

    this.draftInputs.set(initial);
  }

  navigateToRound(roundNum: number) {
    if (roundNum <= this.currentMatchRound()) {
      this.viewingRound.set(roundNum);
      this.loadDraftForRound(roundNum);
    }
  }

  returnToCurrentRound() {
    this.navigateToRound(this.currentMatchRound());
  }

  addPoints(playerId: string, delta: number) {
    const current = { ...this.draftInputs() };
    const pData = { ...(current[playerId] || { points: 0, lostToWind: false }) };

    if (pData.lostToWind) return;

    pData.points = Math.max(0, (pData.points || 0) + delta);
    current[playerId] = pData;
    this.draftInputs.set(current);
  }

  onDirectPointsChange(playerId: string, event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    const current = { ...this.draftInputs() };
    const pData = { ...(current[playerId] || { points: 0, lostToWind: false }) };

    if (pData.lostToWind) return;

    pData.points = isNaN(val) ? 0 : Math.max(0, val);
    current[playerId] = pData;
    this.draftInputs.set(current);
  }

  toggleWindBust(playerId: string) {
    const current = { ...this.draftInputs() };
    const pData = { ...(current[playerId] || { points: 0, lostToWind: false }) };

    pData.lostToWind = !pData.lostToWind;
    if (pData.lostToWind) {
      pData.points = 0;
    }
    current[playerId] = pData;
    this.draftInputs.set(current);
  }

  toggleCardCounter(playerId: string) {
    const current = { ...this.expandedCardCounter() };
    current[playerId] = !current[playerId];
    this.expandedCardCounter.set(current);
  }

  adjustCardCount(playerId: string, cardNum: number, delta: number) {
    const current = { ...this.draftInputs() };
    const pData = { ...(current[playerId] || { points: 0, lostToWind: false }) };

    if (pData.lostToWind) return;

    const cards = { ...(pData.cardCounts || {}) };
    const currentCount = cards[cardNum] || 0;
    const newCount = Math.max(0, currentCount + delta);

    if (newCount === 0) {
      delete cards[cardNum];
    } else {
      cards[cardNum] = newCount;
    }

    pData.cardCounts = cards;

    // Recalcular puntos a partir de cartas
    let sum = 0;
    for (const [k, v] of Object.entries(cards)) {
      sum += parseInt(k, 10) * (v || 0);
    }
    pData.points = sum;

    current[playerId] = pData;
    this.draftInputs.set(current);
  }

  getCardCountTotal(cards: Record<number, number>): number {
    return Object.values(cards).reduce((acc, c) => acc + (c || 0), 0);
  }

  getPlayerPreviousScore(playerId: string): number {
    const m = this.match();
    const targetRound = this.viewingRound();
    if (targetRound === 1) return 0;

    const prevRound = m.rounds?.find((r) => r.roundNumber === targetRound - 1);
    if (!prevRound || prevRound.cumulativeScores[playerId] === undefined) return 0;
    return prevRound.cumulativeScores[playerId];
  }

  getPlayerTotalScore(playerId: string): number {
    return this.match().cumulativeScores[playerId] ?? 0;
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

  getPlayerById(playerId: string) {
    return this.match().players.find((p) => p.id === playerId);
  }

  toggleRulesModal() {
    this.showRulesModal.set(!this.showRulesModal());
  }

  toggleFinalResultsModal() {
    this.showFinalResultsModal.set(!this.showFinalResultsModal());
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
    await this.router.navigate(['/tabs/catalog']);
  }

  async confirmCurrentRound(): Promise<void> {
    const isFinal = this.isLastRound();

    if (this.isEditingPastRound()) {
      await this.matchManager.rollbackToRound(this.viewingRound());
    }

    await this.matchManager.commitRound(this.draftInputs());

    if (isFinal) {
      await this.matchManager.finalizeMatch();
      this.showFinalResultsModal.set(true);
    } else {
      this.navigateToRound(this.currentMatchRound());
    }
  }

  async finishMatch(): Promise<void> {
    await this.matchManager.finalizeMatch();
    this.showFinalResultsModal.set(true);
  }

  returnToCatalog() {
    this.showFinalResultsModal.set(false);
    this.router.navigate(['/tabs/catalog']);
  }
}
