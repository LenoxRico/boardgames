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
  Take6Config,
  Take6RoundInput,
  Take6Engine,
} from '../take-6.engine';
import { TAKE_6_RULES } from '../take-6.rules';

@Component({
  selector: 'app-take-6-scorer',
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
              <span class="game-icon">🐂</span>
              <h2 class="game-name">Take 6! (¡Toma 6!)</h2>
              <span class="badge badge-table">
                {{ isRoundsMode() ? 'Modo 4 Rondas' : 'Modo Clásico' }}
              </span>
            </div>
            <p class="dealer-text">
              @if (isRoundsMode()) {
                Ronda {{ currentMatchRound() }} de 4 • Pierde quien acumule más cuernos
              } @else {
                Ronda {{ currentMatchRound() }} en Curso • Menos cuernos gana (Límite {{ scoreLimit() }})
              }
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

        <!-- Indicador de Modo de Rondas (4 Rondas Fijas) -->
        @if (isRoundsMode()) {
          <div class="rounds-mode-box">
            <div class="rounds-status-header">
              <span class="rounds-mode-title">
                <span class="material-symbols-outlined">repeat</span>
                Progreso de Partida (4 Rondas Fijas)
              </span>
              <span class="badge badge-info">Ronda {{ currentMatchRound() }} / 4</span>
            </div>

            <!-- Stepper horizontal de 4 Rondas -->
            <div class="rounds-stepper-track">
              @for (r of [1, 2, 3, 4]; track r) {
                <div
                  class="stepper-item"
                  [class.completed]="r < currentMatchRound()"
                  [class.active]="r === currentMatchRound()"
                  [class.future]="r > currentMatchRound()"
                >
                  @if (r < currentMatchRound()) {
                    <span class="material-symbols-outlined check-icon">check</span>
                  } @else {
                    <span>R{{ r }}</span>
                  }
                </div>
              }
            </div>
            <span class="rounds-mode-note">
              Al finalizar la 4ª ronda, se declara perdedor al jugador con mayor número de cuernos.
            </span>
          </div>
        } @else {
          <!-- Indicador de Meta / Límite Crítico 66 Cuernos (Modo Clásico) -->
          <div class="critical-limit-box" [class.danger-zone]="maxProximityPercent() >= 80">
            <div class="limit-status-header">
              <div class="limit-title">
                <span class="bull-icon">🐂</span>
                <span class="limit-label font-bold">Límite Crítico: {{ scoreLimit() }} Cuernos</span>
              </div>
              @if (highestPlayer(); as hp) {
                <span
                  class="badge"
                  [class.badge-danger]="maxProximityPercent() >= 90"
                  [class.badge-warning]="maxProximityPercent() < 90"
                >
                  {{ hp.name }} en {{ hp.score }}/{{ scoreLimit() }} ({{ maxProximityPercent() }}%)
                </span>
              }
            </div>

            <!-- Barra de proximidad general del juego hacia el fin -->
            <div class="progress-bar-track">
              <div
                class="progress-bar-fill"
                [style.width.%]="maxProximityPercent()"
                [class.fill-danger]="maxProximityPercent() >= 85"
              ></div>
            </div>

            <div class="progress-legend">
              <span>0 pts (Inicio)</span>
              <span>{{ halfLimit() }} pts (Punto medio)</span>
              <span class="text-danger font-bold">{{ scoreLimit() }} pts (Fin detonado)</span>
            </div>
          </div>
        }
      </div>

      <!-- Modal de Reglas Rápidas Desplegable -->
      @if (showRulesModal()) {
        <div class="rules-quick-modal">
          <div class="rules-modal-header">
            <div class="rules-modal-title">
              <span class="material-symbols-outlined">menu_book</span>
              <h3>Puntuación y Valores de Cuernos</h3>
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
      @if (showFinalResultsModal() || isGameOver() || match().status === 'completed') {
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
              <p class="results-sub">{{ gameOverEvaluation().reason || 'Partida de Take 6 completada.' }}</p>
            </div>

            <!-- Ganador y Perdedor Destacados -->
            <div class="outcomes-grid">
              <div class="outcome-card winner-card">
                <span class="outcome-badge-icon">👑</span>
                <div class="outcome-meta">
                  <span class="outcome-title">GANADOR (Menos cuernos)</span>
                  <span class="outcome-names">{{ winnerNames() }}</span>
                </div>
              </div>
              <div class="outcome-card loser-card">
                <span class="outcome-badge-icon">💀</span>
                <div class="outcome-meta">
                  <span class="outcome-title">PERDEDOR (Más cuernos)</span>
                  <span class="outcome-names">{{ loserNames() }}</span>
                </div>
              </div>
            </div>

            <!-- Clasificación de Podio Completo -->
            <div class="podium-display">
              @for (rank of sortedRankings(); track rank.playerId) {
                @let player = getPlayerById(rank.playerId);
                <div class="podium-row" [class.winner-row]="rank.isWinner" [class.loser-row]="rank.isLoser">
                  <div class="podium-rank-box">
                    <span class="podium-place-num">{{ rank.rank }}º</span>
                    @if (rank.isWinner) {
                      <span class="crown-icon">👑</span>
                    }
                    @if (rank.isLoser) {
                      <span class="skull-icon">💀</span>
                    }
                  </div>
                  <div class="podium-player-name">
                    <span class="name-text">{{ player?.name }}</span>
                    <span class="rank-role">
                      {{ rank.isWinner ? 'Ganador de la partida' : (rank.isLoser ? 'Perdedor de la partida' : rank.rank + 'º Puesto') }}
                    </span>
                  </div>
                  <div class="podium-player-score text-right">
                    <span class="score-num tabular-nums font-bold">{{ rank.score }}</span>
                    <span class="score-unit">cuernos</span>
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
                      <th class="col-round">Ronda</th>
                      @for (p of match().players; track p.id) {
                        <th class="col-player text-center">{{ p.name }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (round of match().rounds; track round.roundNumber) {
                      <tr>
                        <td class="col-round font-semibold">R{{ round.roundNumber }}</td>
                        @for (p of match().players; track p.id) {
                          @let pts = round.roundPoints[p.id] ?? 0;
                          @let accum = round.cumulativeScores[p.id] ?? 0;
                          <td class="col-player text-center tabular-nums">
                            <span class="cell-pts font-bold">+{{ pts }}</span>
                            <span class="cell-accum">({{ accum }})</span>
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

      <!-- SECCIÓN 1: Tarjetas de Jugadores (Ingreso Ágil de Ronda) -->
      <div class="section-header">
        <h3 class="section-title">
          <span class="material-symbols-outlined">sports_score</span>
          Registro de Ronda {{ currentMatchRound() }}
        </h3>
        <span class="badge badge-live">
          <span class="pulse-dot"></span> En Vivo
        </span>
      </div>

      <div class="players-list">
        @for (player of match().players; track player.id) {
          @let pData = draftInputs()[player.id] || { bullheads: 0 };
          @let prevScore = getPlayerPrevScore(player.id);
          @let projectedTotal = prevScore + (pData.bullheads || 0);
          @let currentRank = getPlayerRank(player.id);
          @let isLeader = currentRank === 1;
          @let isNearLimit = projectedTotal >= scoreLimit() * 0.85;

          <div
            class="player-card"
            [class.leader-card]="isLeader"
            [class.danger-card]="!isRoundsMode() && isNearLimit"
          >
            <div class="player-card-header">
              <div class="player-profile">
                <div class="player-avatar" [class.leader-avatar]="isLeader">
                  {{ player.name.charAt(0).toUpperCase() }}
                </div>
                <div class="player-meta">
                  <div class="player-name-row">
                    <span class="player-name">{{ player.name }}</span>
                    @if (isLeader) {
                      <span class="badge badge-gold">
                        <span class="material-symbols-outlined small-icon">trophy</span> Líder
                      </span>
                    } @else if (!isRoundsMode() && isNearLimit) {
                      <span class="badge badge-danger">¡En Peligro!</span>
                    } @else {
                      <span class="badge badge-rank">{{ currentRank }}º Puesto</span>
                    }
                  </div>
                  <span class="player-score-prev">
                    Previo acumulado: <strong class="tabular-nums font-semibold">{{ prevScore }} cuernos</strong>
                  </span>
                </div>
              </div>

              <!-- Puntuación total proyectada -->
              <div class="total-score-badge text-right">
                <span class="total-number tabular-nums" [class.text-danger]="!isRoundsMode() && isNearLimit" [class.text-primary]="isLeader">
                  {{ projectedTotal }}
                </span>
                <span class="total-label">Total Cuernos</span>
              </div>
            </div>

            <!-- Resumen de adición en ronda -->
            <div class="round-addition-bar">
              <span class="addition-label">En esta ronda:</span>
              <span class="addition-value tabular-nums" [class.text-danger]="pData.bullheads > 10">
                +{{ pData.bullheads }} cuernos 🐂
              </span>
            </div>

            <!-- Control de Ingreso de Cuernos: Entrada Manual y Presets -->
            <div class="horns-entry-section">
              <div class="manual-horns-box">
                <div class="manual-label-row">
                  <label [for]="'horns-input-' + player.id" class="manual-input-label">
                    <span class="material-symbols-outlined">edit</span>
                    <span>Cuernos obtenidos:</span>
                  </label>
                  <span class="manual-value-pill tabular-nums" [class.danger-val]="pData.bullheads > 10">
                    +{{ pData.bullheads }} cuernos 🐂
                  </span>
                </div>

                <div class="manual-input-control-row">
                  <button
                    type="button"
                    class="stepper-action-btn minus"
                    (click)="incrementPlayerBullheads(player.id, -1)"
                    [disabled]="(pData.bullheads || 0) <= 0"
                    title="Restar 1 cuerno"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>

                  <div class="input-number-wrap">
                    <input
                      [id]="'horns-input-' + player.id"
                      type="number"
                      min="0"
                      max="150"
                      inputmode="numeric"
                      class="manual-numeric-field tabular-nums"
                      [value]="pData.bullheads ?? 0"
                      (input)="onManualBullheadsInput(player.id, $event)"
                      (focus)="$any($event.target).select()"
                      placeholder="0"
                    />
                    <span class="field-unit">cuernos</span>
                  </div>

                  <button
                    type="button"
                    class="stepper-action-btn plus"
                    (click)="incrementPlayerBullheads(player.id, 1)"
                    title="Sumar 1 cuerno"
                  >
                    <span class="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>

              <!-- Atajos / Presets para agilidad en mesa -->
              <div class="quick-presets-row">
                <button
                  type="button"
                  class="preset-chip"
                  [class.active-preset]="pData.bullheads === 0"
                  (click)="setPlayerBullheads(player.id, 0)"
                >
                  0
                </button>
                <button
                  type="button"
                  class="preset-chip"
                  [class.active-preset]="pData.bullheads === 1"
                  (click)="setPlayerBullheads(player.id, 1)"
                >
                  +1
                </button>
                <button
                  type="button"
                  class="preset-chip"
                  [class.active-preset]="pData.bullheads === 2"
                  (click)="setPlayerBullheads(player.id, 2)"
                >
                  +2
                </button>
                <button
                  type="button"
                  class="preset-chip"
                  [class.active-preset]="pData.bullheads === 3"
                  (click)="setPlayerBullheads(player.id, 3)"
                >
                  +3
                </button>
                <button
                  type="button"
                  class="preset-chip"
                  [class.active-preset]="pData.bullheads === 5"
                  (click)="setPlayerBullheads(player.id, 5)"
                >
                  +5
                </button>
                <button
                  type="button"
                  class="preset-chip"
                  [class.active-preset]="pData.bullheads === 7"
                  (click)="setPlayerBullheads(player.id, 7)"
                >
                  +7
                </button>
                <button
                  type="button"
                  class="preset-chip"
                  [class.active-preset]="pData.bullheads === 10"
                  (click)="setPlayerBullheads(player.id, 10)"
                >
                  +10
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- SECCIÓN 2: Tabla / Matriz Informativa Ronda por Ronda -->
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
                  <td class="col-round font-semibold">Ronda {{ round.roundNumber }}</td>
                  @for (p of match().players; track p.id) {
                    @let pts = round.roundPoints[p.id] ?? 0;
                    @let accum = round.cumulativeScores[p.id] ?? 0;
                    @let rank = getPlayerRank(p.id);
                    <td class="col-player text-center tabular-nums" [class.cell-leader]="rank === 1">
                      <span class="cell-pts font-bold">+{{ pts }}</span>
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
                    @let pData = draftInputs()[p.id] || { bullheads: 0 };
                    @let prev = getPlayerPrevScore(p.id);
                    @let projected = prev + (pData.bullheads || 0);
                    @let isNearLimit = !isRoundsMode() && projected >= scoreLimit() * 0.85;
                    @let isExceeded = !isRoundsMode() && projected >= scoreLimit();

                    <td
                      class="col-player text-center tabular-nums"
                      [class.cell-danger]="isNearLimit"
                      [class.cell-dead]="isExceeded"
                    >
                      <span class="cell-pts font-bold">+{{ pData.bullheads }}</span>
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
            <span>Finalizar Ronda {{ isRoundsMode() ? '4' : currentMatchRound() }} y Ver Resultados</span>
          </button>
        } @else {
          <button
            type="button"
            class="btn-primary-action"
            [disabled]="match().status === 'completed'"
            (click)="confirmCurrentRound()"
          >
            <span>Confirmar Ronda {{ currentMatchRound() }} y Avanzar</span>
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
              Estás en medio de una partida de Take 6. Si confirmas, saldrás al catálogo de juegos y esta partida <strong>no se guardará en el historial</strong>.
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
    }

    /* Caja de Modo 4 Rondas */
    .rounds-mode-box {
      background: var(--color-surface-container-lowest);
      border-radius: var(--radius-lg);
      padding: var(--space-md);
      border: 1px solid var(--color-border-strong);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .rounds-status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .rounds-mode-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-primary);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .rounds-stepper-track {
      display: flex;
      gap: 8px;
    }

    .stepper-item {
      flex: 1;
      height: 38px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-secondary);
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
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
    }

    .stepper-item.future {
      opacity: 0.5;
    }

    .check-icon {
      font-size: 18px;
    }

    .rounds-mode-note {
      font-size: 11px;
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    .critical-limit-box {
      background: var(--color-surface-container-lowest);
      border-radius: var(--radius-lg);
      padding: var(--space-md);
      border: 1px solid var(--color-border-subtle);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .critical-limit-box.danger-zone {
      border-color: rgba(248, 113, 113, 0.4);
    }

    .limit-status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .limit-title {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--color-text-primary);
      font-size: 14px;
    }

    .progress-bar-track {
      width: 100%;
      height: 10px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-highest);
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(to right, var(--color-steel-blue), var(--color-sky-blue), var(--color-warning));
      transition: width 0.3s ease;
      border-radius: var(--radius-full);
    }

    .progress-bar-fill.fill-danger {
      background: linear-gradient(to right, var(--color-steel-blue), var(--color-warning), var(--color-danger));
    }

    .progress-legend {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--color-text-muted);
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
      margin: 0;
      text-align: center;
    }

    .outcomes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-sm);
    }

    .outcome-card {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: 10px var(--space-md);
      border-radius: var(--radius-md);
    }

    .winner-card {
      background: rgba(52, 211, 153, 0.15);
      border: 1px solid rgba(52, 211, 153, 0.35);
    }

    .loser-card {
      background: rgba(248, 113, 113, 0.15);
      border: 1px solid rgba(248, 113, 113, 0.35);
    }

    .outcome-badge-icon {
      font-size: 24px;
    }

    .outcome-meta {
      display: flex;
      flex-direction: column;
    }

    .outcome-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .winner-card .outcome-title {
      color: var(--color-success);
    }

    .loser-card .outcome-title {
      color: var(--color-danger);
    }

    .outcome-names {
      font-size: 15px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .podium-display {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .podium-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px var(--space-md);
      background: var(--color-surface-container-high);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-subtle);
    }

    .podium-row.winner-row {
      border-color: rgba(52, 211, 153, 0.4);
      background: rgba(52, 211, 153, 0.1);
    }

    .podium-row.loser-row {
      border-color: rgba(248, 113, 113, 0.4);
      background: rgba(248, 113, 113, 0.1);
    }

    .podium-rank-box {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 48px;
    }

    .podium-place-num {
      font-size: 15px;
      font-weight: 800;
    }

    .crown-icon, .skull-icon {
      font-size: 16px;
    }

    .podium-player-name {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .name-text {
      font-weight: 700;
      font-size: 14px;
      color: var(--color-text-primary);
    }

    .rank-role {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .score-num {
      font-size: 18px;
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

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 4px;
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
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .player-card.leader-card {
      border-color: rgba(163, 206, 241, 0.4);
    }

    .player-card.danger-card {
      border-color: rgba(248, 113, 113, 0.4);
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

    .total-score-badge {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .total-number {
      font-size: 28px;
      font-weight: 800;
      line-height: 1;
    }

    .total-label {
      font-size: 11px;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .round-addition-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 12px;
      background: var(--color-surface-container-lowest);
      border-radius: var(--radius-md);
      font-size: 13px;
    }

    .addition-label {
      color: var(--color-text-secondary);
    }

    .addition-value {
      font-weight: 700;
      color: var(--color-primary);
    }

    .horns-entry-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .manual-horns-box {
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-sm);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .manual-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-secondary);
    }

    .manual-input-label {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }

    .manual-input-label .material-symbols-outlined {
      font-size: 16px;
      color: var(--color-primary);
    }

    .manual-value-pill {
      font-size: 13px;
      font-weight: 800;
      color: var(--color-primary);
    }

    .manual-value-pill.danger-val {
      color: #ef4444;
    }

    .manual-input-control-row {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .stepper-action-btn {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-highest);
      border: 1px solid var(--color-border-default);
      color: var(--color-text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease;
      flex-shrink: 0;
    }

    .stepper-action-btn:hover:not(:disabled) {
      background: var(--color-primary-container);
      color: var(--color-primary);
    }

    .stepper-action-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .input-number-wrap {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
    }

    .manual-numeric-field {
      width: 100%;
      height: 44px;
      background: var(--color-surface-container-lowest);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      color: var(--color-text-primary);
      font-size: 18px;
      font-weight: 800;
      text-align: center;
      padding: 0 44px 0 12px;
      font-family: inherit;
      transition: border-color 0.15s ease;
    }

    .manual-numeric-field:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(163, 206, 241, 0.25);
    }

    .field-unit {
      position: absolute;
      right: 12px;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-text-muted);
      pointer-events: none;
    }

    .quick-presets-row {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      padding: 2px 0;
    }

    .preset-chip {
      padding: 6px 12px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-secondary);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .preset-chip:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .preset-chip.active-preset {
      background: var(--color-primary);
      color: var(--color-on-primary);
      border-color: var(--color-primary);
      box-shadow: 0 2px 8px rgba(163, 206, 241, 0.35);
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
      animation: fadeIn 0.2s ease;
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
      white-space: nowrap;
      text-align: left;
    }

    .col-player {
      min-width: 80px;
    }

    .th-leader {
      color: var(--color-primary);
    }

    .cell-leader {
      background: rgba(163, 206, 241, 0.08);
      color: var(--color-primary);
    }

    .cell-pts {
      font-size: 14px;
      margin-right: 3px;
    }

    .cell-accum {
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

    .cell-danger {
      background: rgba(248, 113, 113, 0.15);
      color: var(--color-danger);
    }

    .cell-dead {
      background: rgba(220, 38, 38, 0.3);
      color: #ffb4ab;
      font-weight: 800;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-size: 11px;
      font-weight: 700;
      gap: 3px;
    }

    .badge-table {
      background: rgba(163, 206, 241, 0.15);
      color: var(--color-primary);
      border: 1px solid rgba(163, 206, 241, 0.3);
    }

    .badge-live {
      background: rgba(39, 76, 119, 0.4);
      color: var(--color-primary);
      border: 1px solid var(--color-border-default);
    }

    .badge-gold {
      background: var(--color-gold);
      color: #000;
    }

    .badge-rank {
      background: var(--color-surface-container-highest);
      color: var(--color-text-secondary);
    }

    .badge-danger {
      background: var(--color-danger-bg);
      color: var(--color-danger);
    }

    .badge-warning {
      background: var(--color-warning-bg);
      color: var(--color-warning);
    }

    .badge-info {
      background: rgba(163, 206, 241, 0.15);
      color: var(--color-primary);
    }

    .small-icon {
      font-size: 12px;
    }

    .text-danger {
      color: var(--color-danger);
    }

    .text-primary {
      color: var(--color-primary);
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-primary);
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
  `],
})
export class Take6ScorerComponent {
  match = input.required<MatchRecord<Take6Config, Take6RoundInput>>();
  private matchManager = inject(MatchManagerService);
  private registry = inject(GameRegistryService);
  private router = inject(Router);
  private engine = new Take6Engine();

  readonly gameTheme = computed(() => this.registry.getGame(this.match().gameId)?.metadata?.theme);
  readonly quickRules = TAKE_6_RULES.content.es.summary;

  showRulesModal = signal(false);
  showFinalResultsModal = signal(false);
  showAbandonConfirmModal = signal(false);
  draftInputs = signal<Record<string, Take6RoundInput>>({});

  isRoundsMode = computed(() => !!this.match().config.roundsMode);
  scoreLimit = computed(() => this.match().config.scoreLimit || 66);
  halfLimit = computed(() => Math.floor(this.scoreLimit() / 2));
  currentMatchRound = computed(() => this.match().currentRound);

  isLastRound = computed(() => {
    if (this.isRoundsMode()) {
      return this.currentMatchRound() >= 4;
    }
    return this.gameOverEvaluation().isGameOver;
  });

  highestPlayer = computed(() => {
    const m = this.match();
    let max = -1;
    let target = null;
    for (const p of m.players) {
      const s = m.cumulativeScores[p.id] ?? 0;
      if (s > max) {
        max = s;
        target = { name: p.name, score: s };
      }
    }
    return target;
  });

  maxProximityPercent = computed(() => {
    const limit = this.scoreLimit();
    const hp = this.highestPlayer();
    if (!hp || limit <= 0) return 0;
    return Math.min(100, Math.round((hp.score / limit) * 100));
  });

  gameOverEvaluation = computed(() => {
    const m = this.match();
    return this.engine.evaluateMatchStatus(
      m.cumulativeScores,
      m.rounds.length,
      m.config
    );
  });

  isGameOver = computed(() => this.gameOverEvaluation().isGameOver);

  winnerNames = computed(() => {
    const ev = this.gameOverEvaluation();
    const players = this.match().players;
    return ev.winnerIds
      .map((id) => players.find((p) => p.id === id)?.name || id)
      .join(', ');
  });

  loserNames = computed(() => {
    const ev = this.gameOverEvaluation();
    const players = this.match().players;
    return (ev.loserIds || [])
      .map((id) => players.find((p) => p.id === id)?.name || id)
      .join(', ');
  });

  sortedRankings = computed(() => {
    const m = this.match();
    const entries = m.players.map((p) => ({
      playerId: p.id,
      score: m.cumulativeScores[p.id] ?? 0,
    }));
    // Lowest score first (menor puntaje gana)
    entries.sort((a, b) => a.score - b.score);
    const ev = this.gameOverEvaluation();

    return entries.map((entry, index) => ({
      playerId: entry.playerId,
      score: entry.score,
      rank: index + 1,
      isWinner: ev.winnerIds?.includes(entry.playerId),
      isLoser: ev.loserIds?.includes(entry.playerId),
    }));
  });

  constructor() {
    effect(() => {
      const match = this.match();
      if (match.status === 'completed' || this.isGameOver()) {
        this.showFinalResultsModal.set(true);
      }

      const initial: Record<string, Take6RoundInput> = {};
      const draft = match.currentDraftRoundData || {};

      match.players.forEach((p) => {
        initial[p.id] = {
          bullheads: draft[p.id]?.bullheads ?? 0,
        };
      });
      this.draftInputs.set(initial);
    });
  }

  toggleRulesModal(): void {
    this.showRulesModal.update((v) => !v);
  }

  setPlayerBullheads(playerId: string, val: number): void {
    this.draftInputs.update((prev) => {
      const updated = { ...prev, [playerId]: { bullheads: val } };
      this.matchManager.saveDraftRoundData(updated);
      return updated;
    });
  }

  incrementPlayerBullheads(playerId: string, delta: number): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId]?.bullheads || 0;
      const updated = { ...prev, [playerId]: { bullheads: Math.max(0, current + delta) } };
      this.matchManager.saveDraftRoundData(updated);
      return updated;
    });
  }

  getPlayerPrevScore(playerId: string): number {
    return this.match().cumulativeScores[playerId] ?? 0;
  }

  getPlayerById(playerId: string) {
    return this.match().players.find((p) => p.id === playerId);
  }

  getPlayerRank(playerId: string): number {
    const ranks = this.sortedRankings();
    const item = ranks.find((r) => r.playerId === playerId);
    return item ? item.rank : 1;
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

  onManualBullheadsInput(playerId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = target.value.trim();
    const parsed = val === '' ? 0 : parseInt(val, 10);
    this.setPlayerBullheads(playerId, isNaN(parsed) ? 0 : Math.max(0, parsed));
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
