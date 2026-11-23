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
  SamoaConfig,
  SamoaRoundInput,
  SamoaEngine,
  SAMOA_MASKS,
  SamoaMask,
  PlayerDeductionVote,
  DeductionEvaluationResult,
  evaluateDeductionVotes,
} from '../samoa.engine';
import { SAMOA_RULES } from '../samoa.rules';

@Component({
  selector: 'app-samoa-scorer',
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
              <span class="game-icon">🎭</span>
              <h2 class="game-name">Samoa</h2>
              <span class="badge badge-table">
                Ronda {{ viewingRound() }} de {{ totalRounds() }}
              </span>
            </div>
            <p class="dealer-text">
              <span>Máscaras secretas y faroleo • {{ match().players.length }} Jugadores</span>
              <span class="dot-separator">•</span>
              <span class="dealer-badge">Turno inicial: {{ currentDealer()?.name }} 👑</span>
            </p>
          </div>
          <div class="header-actions">
            <button
              type="button"
              class="icon-action-btn"
              (click)="toggleRulesModal()"
              title="Consultar Reglas Rápidas"
              aria-label="Reglas rápidas"
            >
              <span class="material-symbols-outlined">help_center</span>
            </button>
          </div>
        </div>

        <!-- Selector Rápido de Rondas -->
        <div class="rounds-stepper-bar">
          <button
            type="button"
            class="stepper-nav-btn"
            [disabled]="viewingRound() <= 1"
            (click)="setViewingRound(viewingRound() - 1)"
            aria-label="Ronda anterior"
          >
            <span class="material-symbols-outlined">chevron_left</span>
          </button>

          <div class="rounds-scroll-track">
            @for (r of roundNumbers(); track r) {
              <button
                type="button"
                class="round-chip-btn"
                [class.active-round]="r === viewingRound()"
                [class.confirmed-round]="r < currentMatchRound()"
                (click)="setViewingRound(r)"
              >
                <span>R{{ r }}</span>
                @if (r < currentMatchRound()) {
                  <span class="material-symbols-outlined chip-check">check</span>
                }
              </button>
            }
          </div>

          <button
            type="button"
            class="stepper-nav-btn"
            [disabled]="viewingRound() >= currentMatchRound()"
            (click)="setViewingRound(viewingRound() + 1)"
            aria-label="Siguiente ronda"
          >
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <!-- Banner de Asistente Devir Companion (Votación Secreta de Máscaras) -->
      <div class="deduction-action-card">
        <div class="action-card-info">
          <div class="action-card-title-row">
            <span class="action-icon">🎭</span>
            <h3 class="action-title">Votación Secreta de Máscaras</h3>
            <span class="badge badge-devir">Modo Devir Companion</span>
          </div>
          <p class="action-desc">
            Pasa el dispositivo a cada jugador para registrar en secreto su propia máscara y sus deducciones sin que nadie vea sus elecciones.
          </p>
        </div>
        <button
          type="button"
          class="btn-start-deduction"
          [disabled]="viewingRound() < currentMatchRound()"
          (click)="startDeductionWizard()"
        >
          <span class="material-symbols-outlined">how_to_vote</span>
          <span>Iniciar Votación Pasa-y-Juega</span>
        </button>
      </div>

      <!-- 2. Tarjetas de Entrada de Puntuación por Jugador -->
      <div class="players-grid">
        @for (player of match().players; track player.id; let pIdx = $index) {
          @let pData = draftInputs()[player.id] || { maskPoints: 0, correctGuesses: 0, unanimouslyGuessed: false };
          @let isLeader = currentRankings()[player.id] === 1;

          <div
            class="player-card"
            [style.background-image]="gameTheme()?.gradient"
            [class.card-leader]="isLeader"
          >
            @if (gameTheme()?.bgImageUrl; as bg) {
              <div
                class="card-thematic-art"
                [style.background-image]="'url(' + bg + ')'"
              ></div>
            }

            <div class="player-card-header">
              <div class="player-profile">
                <div class="avatar-circle">
                  <span>{{ player.name.charAt(0).toUpperCase() }}</span>
                  @if (isLeader) {
                    <span class="leader-crown" title="Líder actual">👑</span>
                  }
                </div>
                <div class="player-names-col">
                  <div class="player-name-row">
                    <h3 class="player-name">{{ player.name }}</h3>
                    @if (getMask(pData.assignedMask); as myMask) {
                      <span class="player-mask-badge" [style.background]="myMask.color + '22'" [style.border-color]="myMask.color" title="Máscara asignada: {{ myMask.name }}">
                        <img [src]="myMask.imageUrl" [alt]="myMask.name" class="mask-img-micro" />
                        <span [style.color]="myMask.color">{{ myMask.name }}</span>
                      </span>
                    }
                  </div>
                  <span class="player-meta-info">
                    Total confirmado: <strong>{{ match().cumulativeScores[player.id] || 0 }} pts</strong>
                  </span>
                </div>
              </div>

              <!-- Previsualización de la ronda -->
              <div class="forecast-pill" [class.forecast-zero]="pData.unanimouslyGuessed">
                @if (pData.unanimouslyGuessed && unanimousPenalty()) {
                  <span class="forecast-val">0 pts</span>
                  <span class="forecast-lbl">¡Descubierto!</span>
                } @else {
                  @let rPts = calculateForecastPoints(pData);
                  <span class="forecast-val">{{ rPts >= 0 ? '+' : '' }}{{ rPts }} pts</span>
                  <span class="forecast-lbl">Pronóstico</span>
                }
              </div>
            </div>

            <!-- Controles Táctiles de Puntuación -->
            <div class="scoring-controls">
              <!-- Sección 1: Puntos de la Máscara (Plumas) -->
              <div class="control-row">
                <div class="control-info">
                  <div class="control-title-row">
                    <span class="control-label">🪶 Plumas en Máscara</span>
                    <span class="control-badge-val">{{ pData.maskPoints || 0 }} pts</span>
                  </div>
                  <span class="control-subtext">Valor neto de plumas de su máscara secreta</span>
                </div>

                <div class="stepper-widget">
                  <button
                    type="button"
                    class="btn-step btn-step-minus"
                    [disabled]="viewingRound() < currentMatchRound()"
                    (click)="adjustMaskPoints(player.id, -1)"
                    aria-label="Restar 1 pluma"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                  <span class="step-value tabular-nums">{{ pData.maskPoints || 0 }}</span>
                  <button
                    type="button"
                    class="btn-step btn-step-plus"
                    [disabled]="viewingRound() < currentMatchRound()"
                    (click)="adjustMaskPoints(player.id, 1)"
                    aria-label="Sumar 1 pluma"
                  >
                    <span class="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>

              <!-- Chips Rápidos de Plumas -->
              <div class="quick-chips-row">
                <button
                  type="button"
                  class="quick-chip chip-neg"
                  [disabled]="viewingRound() < currentMatchRound()"
                  (click)="adjustMaskPoints(player.id, -5)"
                >
                  -5
                </button>
                <button
                  type="button"
                  class="quick-chip"
                  [disabled]="viewingRound() < currentMatchRound()"
                  (click)="setMaskPoints(player.id, 0)"
                >
                  0
                </button>
                <button
                  type="button"
                  class="quick-chip chip-pos"
                  [disabled]="viewingRound() < currentMatchRound()"
                  (click)="adjustMaskPoints(player.id, 5)"
                >
                  +5
                </button>
                <button
                  type="button"
                  class="quick-chip chip-pos"
                  [disabled]="viewingRound() < currentMatchRound()"
                  (click)="adjustMaskPoints(player.id, 10)"
                >
                  +10
                </button>
              </div>

              <!-- Sección 2: Aciertos de Deducción (+5 pts por rival) -->
              <div class="control-row deduction-row">
                <div class="control-info">
                  <div class="control-title-row">
                    <span class="control-label">🔍 Máscaras Adivinadas</span>
                    <span class="control-badge-val highlight-badge">
                      +{{ (pData.correctGuesses || 0) * guessBonus() }} pts
                    </span>
                  </div>
                  <span class="control-subtext">
                    +{{ guessBonus() }} pts por cada rival acertado (máx {{ maxRivals() }})
                  </span>
                </div>

                <div class="guesses-selector-bar">
                  @for (gCount of guessOptions(); track gCount) {
                    <button
                      type="button"
                      class="guess-option-btn"
                      [class.active-guess]="(pData.correctGuesses || 0) === gCount"
                      [disabled]="viewingRound() < currentMatchRound()"
                      (click)="setCorrectGuesses(player.id, gCount)"
                    >
                      {{ gCount }}
                    </button>
                  }
                </div>
              </div>

              <!-- Sección 3: Penalización Unánime (Descubierto por todos los rivales) -->
              @if (unanimousPenalty()) {
                <div class="penalty-section">
                  <button
                    type="button"
                    class="penalty-toggle-chip"
                    [class.active-penalty]="pData.unanimouslyGuessed"
                    [disabled]="viewingRound() < currentMatchRound()"
                    (click)="toggleUnanimouslyGuessed(player.id)"
                  >
                    <span class="material-symbols-outlined chip-icon">
                      {{ pData.unanimouslyGuessed ? 'error' : 'visibility' }}
                    </span>
                    <span>
                      {{ pData.unanimouslyGuessed ? '¡Descubierto por Todos! (0 pts)' : '¿Descubierto por todos los rivales?' }}
                    </span>
                  </button>
                  @if (pData.unanimouslyGuessed) {
                    <span class="penalty-warning-note">
                      ⚠️ Faroleo fallido: se anulan tanto las plumas como los aciertos de esta ronda.
                    </span>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- 3. Tabla Matriz Histórica de Puntuaciones por Ronda -->
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
          <div class="matrix-title-group">
            <span class="material-symbols-outlined matrix-icon">history</span>
            <h3 class="matrix-title">Historial de Rondas Confirmadas</h3>
          </div>
          <span class="matrix-subtitle">Puntuación sumada en cada ronda</span>
        </div>

        @if (roundRows().length === 0) {
          <div class="empty-matrix-state">
            <span class="material-symbols-outlined empty-matrix-icon">draw</span>
            <p>Aún no hay rondas confirmadas. Ingresa los resultados de la ronda 1 y pulsa Confirmar.</p>
          </div>
        } @else {
          <div class="table-responsive-wrapper">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th class="th-round">Ronda</th>
                  @for (p of match().players; track p.id) {
                    <th class="th-player">
                      <div class="th-player-content">
                        <span>{{ p.name }}</span>
                      </div>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of roundRows(); track row.roundNum) {
                  <tr [class.current-viewing-row]="row.roundNum === viewingRound()">
                    <td class="td-round">R{{ row.roundNum }}</td>
                    @for (p of match().players; track p.id) {
                      @let pts = row.roundPoints[p.id] ?? 0;
                      @let unan = row.unanimous[p.id];
                      <td class="td-points tabular-nums">
                        <div class="cell-score">
                          <span class="score-val" [class.score-negative]="pts < 0" [class.score-zero]="pts === 0">
                            {{ pts > 0 ? '+' : '' }}{{ pts }}
                          </span>
                          @if (unan) {
                            <span class="penalty-tag" title="Descubierto por todos (0 pts)">Desc.</span>
                          }
                        </div>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- 4. Tarjeta Informativa de Puntaje Actual (Obligatoria debajo de la matriz) -->
      <div
        class="current-scores-card"
        [style.background-image]="gameTheme()?.gradient"
      >
        @if (gameTheme()?.bgImageUrl; as bg) {
          <div
            class="card-thematic-art"
            [style.background-image]="'url(' + bg + ')'"
          ></div>
        }
        <div class="current-scores-header">
          <div class="title-with-icon">
            <span class="material-symbols-outlined">leaderboard</span>
            <h3 class="card-title">Clasificación en Vivo</h3>
          </div>
          <span class="scores-update-tag">Actualizado ronda a ronda</span>
        </div>

        <div class="ranked-players-list">
          @for (ranked of rankedPlayers(); track ranked.id; let idx = $index) {
            <div class="ranked-player-item" [class.rank-gold]="ranked.rank === 1">
              <div class="item-left">
                <div class="rank-badge" [class.rank-1]="ranked.rank === 1" [class.rank-2]="ranked.rank === 2" [class.rank-3]="ranked.rank === 3">
                  @if (ranked.rank === 1) { 👑 1º }
                  @else if (ranked.rank === 2) { 🥈 2º }
                  @else if (ranked.rank === 3) { 🥉 3º }
                  @else { {{ ranked.rank }}º }
                </div>
                <div class="ranked-name-col">
                  <span class="ranked-name">{{ ranked.name }}</span>
                  <span class="ranked-guesses-count">
                    {{ ranked.totalGuesses }} {{ ranked.totalGuesses === 1 ? 'acierto acumulado' : 'aciertos acumulados' }}
                  </span>
                </div>
              </div>
              <div class="item-right">
                <span class="ranked-score tabular-nums">{{ ranked.score }} pts</span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- 5. Barra Inferior Flotante de Acciones -->
      <div class="floating-actions-bar">
        @if (isEditingPastRound()) {
          <div class="editing-past-notice">
            <span class="material-symbols-outlined">edit_note</span>
            <span>Editando Ronda {{ viewingRound() }}</span>
          </div>
          <button
            type="button"
            class="btn-primary-action btn-save-past"
            (click)="commitPastRound()"
          >
            <span class="material-symbols-outlined">save</span>
            <span>Guardar Cambios R{{ viewingRound() }}</span>
          </button>
        } @else {
          <button
            type="button"
            class="btn-primary-action"
            [disabled]="!canConfirmRound()"
            (click)="confirmCurrentRound()"
          >
            <span class="material-symbols-outlined">
              {{ isLastRound() ? 'emoji_events' : 'check_circle' }}
            </span>
            <span>
              {{ isLastRound() ? 'Finalizar Partida de Samoa' : 'Confirmar Ronda ' + viewingRound() }}
            </span>
          </button>
        }

        <!-- Botón Obligatorio y Estandarizado de Finalizar/Abandonar Partida en Curso -->
        <div class="secondary-actions-row">
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

      <!-- Modal de Confirmación de Abandono de Partida -->
      @if (showAbandonConfirmModal()) {
        <div class="modal-overlay" (click)="cancelAbandon()">
          <div class="modal-dialog-card" (click)="$event.stopPropagation()">
            <div class="modal-icon-badge danger-badge">
              <span class="material-symbols-outlined">warning</span>
            </div>
            <h3 class="modal-title">¿Abandonar la partida?</h3>
            <p class="modal-message">
              Estás en medio de una partida de <strong>Samoa</strong>. Si confirmas, saldrás al catálogo de juegos y esta partida <strong>no se guardará en el historial</strong>.
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

      <!-- Modal de Reglas Rápidas -->
      @if (showRulesModal()) {
        <div class="modal-overlay" (click)="toggleRulesModal()">
          <div class="rules-modal-dialog" (click)="$event.stopPropagation()">
            <div class="rules-modal-header">
              <div class="rules-title-group">
                <span class="material-symbols-outlined rules-icon">menu_book</span>
                <h3>Reglas Rápidas de Samoa</h3>
              </div>
              <button
                type="button"
                class="btn-close-modal"
                (click)="toggleRulesModal()"
                aria-label="Cerrar reglas"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="rules-modal-body">
              @for (rule of quickRules; track rule.id) {
                <div class="rule-card-item">
                  <div class="rule-title-row">
                    <span class="material-symbols-outlined rule-item-icon">{{ rule.icon }}</span>
                    <h4>{{ rule.title }}</h4>
                  </div>
                  <p class="rule-content">{{ rule.content }}</p>
                  @if (rule.highlights) {
                    <ul class="rule-highlights">
                      @for (hl of rule.highlights; track hl) {
                        <li>{{ hl }}</li>
                      }
                    </ul>
                  }
                </div>
              }
            </div>
            <div class="rules-modal-footer">
              <button type="button" class="btn-modal-cancel" (click)="toggleRulesModal()">
                Entendido
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal / Asistente de Votación Secreta (Devir Companion Pasa-y-Juega) -->
      @if (showDeductionWizard()) {
        <div class="modal-overlay">
          <div class="wizard-dialog-card" (click)="$event.stopPropagation()">
            <!-- Paso 1: Traspaso / Pantalla de Privacidad -->
            @if (wizardStep() === 'handover') {
              <div class="handover-step">
                <div class="privacy-badge">
                  <span class="material-symbols-outlined">visibility_off</span>
                </div>
                <h3 class="wizard-step-title">Pasa el dispositivo a</h3>
                <div class="player-highlight-card">
                  <div class="avatar-large">{{ currentVotingPlayer()?.name?.charAt(0)?.toUpperCase() }}</div>
                  <span class="player-large-name">{{ currentVotingPlayer()?.name }}</span>
                </div>
                <p class="handover-notice">
                  🤫 Asegúrate de que los demás jugadores <strong>no miren la pantalla</strong> antes de pulsar continuar.
                </p>
                <div class="wizard-button-group">
                  <button
                    type="button"
                    class="btn-wizard-action"
                    (click)="proceedToVoting()"
                  >
                    <span class="material-symbols-outlined">visibility</span>
                    <span>Soy {{ currentVotingPlayer()?.name }}, ¡estoy listo!</span>
                  </button>
                  <button
                    type="button"
                    class="btn-wizard-cancel"
                    (click)="cancelDeductionWizard()"
                  >
                    Cancelar y salir
                  </button>
                </div>
              </div>
            }

            <!-- Paso 2: Votación Secreta del Jugador -->
            @if (wizardStep() === 'voting') {
              <div class="voting-step">
                <div class="voting-header">
                  <div class="voting-player-badge">
                    <span class="material-symbols-outlined">person</span>
                    <span>Turno de {{ currentVotingPlayer()?.name }}</span>
                  </div>
                  <span class="voting-progress">
                    Jugador {{ currentVotingPlayerIdx() + 1 }} de {{ match().players.length }}
                  </span>
                </div>

                <!-- 1. Su propia máscara secreta -->
                <div class="voting-section">
                  <div class="section-title-group">
                    <span class="section-num">1</span>
                    <div class="section-text-col">
                      <h4 class="section-title">¿Cuál es tu máscara secreta?</h4>
                      <span class="section-desc">Selecciona la máscara asignada en tu carta secreta</span>
                    </div>
                  </div>

                  <div class="masks-grid">
                    @for (mask of masks; track mask.id) {
                      <button
                        type="button"
                        class="mask-choice-btn"
                        [class.selected-mask]="tempOwnMask() === mask.id"
                        [style.--mask-color]="mask.color"
                        (click)="selectOwnMask(mask.id)"
                      >
                        <img [src]="mask.imageUrl" [alt]="mask.name" class="mask-img" />
                        <span class="mask-name">{{ mask.name }}</span>
                      </button>
                    }
                  </div>
                </div>

                <!-- 2. Deducción de rivales -->
                <div class="voting-section">
                  <div class="section-title-group">
                    <span class="section-num">2</span>
                    <div class="section-text-col">
                      <h4 class="section-title">¿Qué máscara tiene cada rival?</h4>
                      <span class="section-desc">+{{ guessBonus() }} pts por cada rival acertado</span>
                    </div>
                  </div>

                  <div class="rivals-vote-list">
                    @for (rival of rivalPlayers(); track rival.id) {
                      <div class="rival-vote-card">
                        <div class="rival-card-header">
                          <span class="rival-name">{{ rival.name }}</span>
                          @let guessed = getMask(tempGuesses()[rival.id]);
                          <span class="rival-selected-tag" [style.color]="guessed?.color || 'var(--color-text-muted)'">
                            @if (guessed) {
                              <img [src]="guessed.imageUrl" [alt]="guessed.name" class="mask-img-micro" />
                            }
                            <span>{{ guessed?.name || 'Sin seleccionar' }}</span>
                          </span>
                        </div>
                        <div class="masks-row-compact">
                          @for (mask of masks; track mask.id) {
                            <button
                              type="button"
                              class="mask-mini-btn"
                              [class.selected-mini]="tempGuesses()[rival.id] === mask.id"
                              [style.--mask-color]="mask.color"
                              (click)="selectRivalGuess(rival.id, mask.id)"
                              [title]="mask.name"
                            >
                              <img [src]="mask.imageUrl" [alt]="mask.name" class="mask-img-mini" />
                              <span class="mask-label-mini">{{ mask.name }}</span>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <div class="voting-actions">
                  <button
                    type="button"
                    class="btn-wizard-action"
                    [disabled]="!canSubmitCurrentVote()"
                    (click)="submitCurrentVote()"
                  >
                    <span class="material-symbols-outlined">visibility_off</span>
                    <span>
                      {{ isLastVotingPlayer() ? 'Guardar y Revelar Resultados' : 'Guardar y Ocultar para Siguiente Jugador' }}
                    </span>
                  </button>
                </div>
              </div>
            }

            <!-- Paso 3: Revelación de Resultados y Asignación Automática -->
            @if (wizardStep() === 'reveal') {
              <div class="reveal-step">
                <div class="reveal-header">
                  <span class="material-symbols-outlined reveal-icon">theater_comedy</span>
                  <h3 class="wizard-step-title">¡Revelación de Máscaras!</h3>
                  <p class="reveal-subtitle">
                    Comprobación oficial de máscaras secretas y deducciones de la ronda.
                  </p>
                </div>

                <div class="reveal-cards-list">
                  @for (player of match().players; track player.id) {
                    @let vote = wizardVotes()[player.id];
                    @let evalRes = evaluationResults()[player.id];
                    @let realMask = getMask(vote?.ownMask);

                    <div class="reveal-player-card" [class.unanimous-card]="evalRes?.unanimouslyGuessed">
                      <div class="reveal-player-top">
                        <div class="reveal-identity">
                          <div class="reveal-avatar">{{ player.name.charAt(0).toUpperCase() }}</div>
                          <div class="reveal-info-col">
                            <span class="reveal-name">{{ player.name }}</span>
                            <span class="real-mask-badge" [style.background]="realMask?.color + '22'" [style.border-color]="realMask?.color">
                              @if (realMask) {
                                <img [src]="realMask.imageUrl" [alt]="realMask.name" class="mask-img-micro" />
                              }
                              <span [style.color]="realMask?.color">Máscara {{ realMask?.name }}</span>
                            </span>
                          </div>
                        </div>
                        <div class="reveal-score-badge">
                          @if (evalRes?.unanimouslyGuessed && unanimousPenalty()) {
                            <span class="unanimous-pill">¡Descubierto! (0 pts)</span>
                          } @else {
                            <span class="guesses-pill">
                              +{{ (evalRes?.correctGuesses || 0) * guessBonus() }} pts
                              ({{ evalRes?.correctGuesses || 0 }} {{ evalRes?.correctGuesses === 1 ? 'acierto' : 'aciertos' }})
                            </span>
                          }
                        </div>
                      </div>

                      <!-- Detalle de sus deducciones hacia los rivales -->
                      <div class="reveal-guesses-breakdown">
                        <span class="breakdown-title">Deducciones de {{ player.name }}:</span>
                        <div class="guesses-chips-wrap">
                          @for (rival of getRivalPlayers(player.id); track rival.id) {
                            @let guessedMaskId = vote?.opponentGuesses?.[rival.id];
                            @let rivalRealMaskId = wizardVotes()[rival.id]?.ownMask;
                            @let isCorrect = guessedMaskId && rivalRealMaskId && guessedMaskId === rivalRealMaskId;
                            @let guessedMask = getMask(guessedMaskId);

                            <div class="guess-result-chip" [class.guess-correct]="isCorrect" [class.guess-wrong]="!isCorrect">
                              @if (guessedMask) {
                                <img [src]="guessedMask.imageUrl" [alt]="guessedMask.name" class="mask-img-micro" />
                              }
                              <span>{{ rival.name }}: {{ guessedMask?.name }}</span>
                              <span class="material-symbols-outlined chip-status-icon">
                                {{ isCorrect ? 'check_circle' : 'cancel' }}
                              </span>
                            </div>
                          }
                        </div>
                      </div>

                      @if (evalRes?.unanimouslyGuessed && unanimousPenalty()) {
                        <div class="unanimous-alert">
                          ⚠️ ¡Todos los rivales descubrieron su máscara! (Penalización: 0 pts en la ronda).
                        </div>
                      }
                    </div>
                  }
                </div>

                <div class="reveal-actions">
                  <button
                    type="button"
                    class="btn-wizard-action btn-apply"
                    (click)="applyDeductionResults()"
                  >
                    <span class="material-symbols-outlined">done_all</span>
                    <span>Aplicar Resultados al Marcador de la Ronda</span>
                  </button>
                  <button
                    type="button"
                    class="btn-wizard-cancel"
                    (click)="cancelDeductionWizard()"
                  >
                    Cerrar sin aplicar
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .scorer-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding-bottom: 120px;
      max-width: 900px;
      margin: 0 auto;
    }

    /* 1. Cabecera */
    .match-header-card,
    .player-card,
    .matrix-card,
    .current-scores-card {
      position: relative;
      overflow: hidden;
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }

    :host-context([data-theme="light"]) .match-header-card,
    :host-context([data-theme="light"]) .player-card,
    :host-context([data-theme="light"]) .matrix-card,
    :host-context([data-theme="light"]) .current-scores-card {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      border-color: var(--color-border-subtle);
    }

    .match-header-card > *,
    .player-card > *,
    .matrix-card > *,
    .current-scores-card > * {
      position: relative;
      z-index: 1;
    }

    .card-thematic-art {
      position: absolute;
      top: 0;
      right: 0;
      width: 220px;
      height: 100%;
      max-height: 240px;
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
      margin-bottom: var(--space-sm);
    }

    .game-title-row {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .game-icon {
      font-size: 24px;
    }

    .game-name {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .badge-table {
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: rgba(13, 148, 136, 0.15);
      border: 1px solid rgba(13, 148, 136, 0.3);
      color: #0d9488;
      font-size: 11px;
      font-weight: 700;
    }

    :host-context([data-theme="light"]) .badge-table {
      background: #ccfbf1;
      color: #0f766e;
    }

    .dealer-text {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .dealer-badge {
      color: var(--color-primary);
      font-weight: 700;
    }

    .icon-action-btn {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .icon-action-btn:hover {
      color: var(--color-text-primary);
      border-color: var(--color-primary);
    }

    .rounds-stepper-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: var(--space-xs);
    }

    .stepper-nav-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .stepper-nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .rounds-scroll-track {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 2px;
    }

    .round-chip-btn {
      padding: 4px 12px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-secondary);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }

    .round-chip-btn.active-round {
      background: var(--color-primary);
      color: var(--color-on-primary);
      border-color: var(--color-primary);
    }

    .round-chip-btn.confirmed-round:not(.active-round) {
      border-color: rgba(52, 211, 153, 0.4);
      color: #34d399;
    }

    .chip-check {
      font-size: 14px;
    }

    /* 2. Grid de Jugadores */
    .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: var(--space-md);
    }

    .player-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .player-card.card-leader {
      border-color: rgba(245, 158, 11, 0.4);
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

    .avatar-circle {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-high);
      border: 2px solid var(--color-border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
      color: var(--color-text-primary);
    }

    .leader-crown {
      position: absolute;
      top: -8px;
      right: -6px;
      font-size: 14px;
    }

    .player-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .player-name {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .player-mask-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      border: 1px solid transparent;
      font-size: 11px;
      font-weight: 800;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .player-meta-info {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .forecast-pill {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 4px 10px;
      border-radius: var(--radius-lg);
      background: rgba(13, 148, 136, 0.12);
      border: 1px solid rgba(13, 148, 136, 0.3);
    }

    .forecast-val {
      font-size: 15px;
      font-weight: 800;
      color: #0d9488;
    }

    .forecast-lbl {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-muted);
    }

    .forecast-pill.forecast-zero {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.35);
    }

    .forecast-pill.forecast-zero .forecast-val {
      color: #ef4444;
    }

    /* Controles */
    .scoring-controls {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .control-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-lg);
      gap: var(--space-sm);
    }

    .control-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .control-label {
      font-size: 13px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .control-badge-val {
      font-size: 12px;
      font-weight: 800;
      color: var(--color-primary);
    }

    .control-badge-val.highlight-badge {
      color: #f59e0b;
    }

    .control-subtext {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .stepper-widget {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-step {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      color: var(--color-text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-step:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .btn-step:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .step-value {
      font-size: 16px;
      font-weight: 800;
      min-width: 28px;
      text-align: center;
      color: var(--color-text-primary);
    }

    .quick-chips-row {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
      margin-top: -4px;
    }

    .quick-chip {
      padding: 4px 10px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .quick-chip:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .quick-chip.chip-neg {
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.25);
    }

    .quick-chip.chip-pos {
      color: #10b981;
      border-color: rgba(16, 185, 129, 0.25);
    }

    .deduction-row {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .guesses-selector-bar {
      display: flex;
      gap: 8px;
    }

    .guess-option-btn {
      flex: 1;
      min-height: 40px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-primary);
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .guess-option-btn:hover:not(:disabled) {
      border-color: #f59e0b;
      color: #f59e0b;
    }

    .guess-option-btn.active-guess {
      background: #f59e0b;
      color: #000000;
      border-color: #f59e0b;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35);
    }

    .penalty-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
    }

    .penalty-toggle-chip {
      width: 100%;
      min-height: 40px;
      border-radius: var(--radius-lg);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-secondary);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .penalty-toggle-chip:hover:not(:disabled) {
      border-color: #ef4444;
      color: #ef4444;
    }

    .penalty-toggle-chip.active-penalty {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #ef4444;
      font-weight: 800;
    }

    .penalty-warning-note {
      font-size: 11px;
      color: #ef4444;
      text-align: center;
    }

    /* 3. Tabla Matriz */
    .matrix-card {
      padding: var(--space-md);
    }

    .matrix-header {
      margin-bottom: var(--space-md);
    }

    .matrix-title-group {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .matrix-icon {
      color: var(--color-primary);
      font-size: 22px;
    }

    .matrix-title {
      margin: 0;
      font-size: 17px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .matrix-subtitle {
      font-size: 12px;
      color: var(--color-text-muted);
    }

    .empty-matrix-state {
      padding: var(--space-lg);
      text-align: center;
      color: var(--color-text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-xs);
    }

    .empty-matrix-icon {
      font-size: 32px;
      opacity: 0.5;
    }

    .table-responsive-wrapper {
      overflow-x: auto;
    }

    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .matrix-table th,
    .matrix-table td {
      padding: 10px 12px;
      text-align: center;
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .th-round,
    .td-round {
      text-align: left;
      font-weight: 800;
      color: var(--color-text-muted);
      width: 70px;
    }

    .th-player {
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .cell-score {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .score-val {
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .score-val.score-negative {
      color: #ef4444;
    }

    .score-val.score-zero {
      color: var(--color-text-muted);
    }

    .penalty-tag {
      font-size: 10px;
      font-weight: 800;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
      padding: 1px 4px;
      border-radius: var(--radius-sm);
    }

    .current-viewing-row {
      background: rgba(13, 148, 136, 0.08);
    }

    /* 4. Tarjeta de Clasificación en Vivo */
    .current-scores-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .current-scores-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .title-with-icon {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .title-with-icon .material-symbols-outlined {
      color: #f59e0b;
      font-size: 22px;
    }

    .card-title {
      margin: 0;
      font-size: 17px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .scores-update-tag {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .ranked-players-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ranked-player-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-radius: var(--radius-lg);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
    }

    .ranked-player-item.rank-gold {
      border-color: rgba(245, 158, 11, 0.35);
      background: rgba(245, 158, 11, 0.06);
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .rank-badge {
      font-size: 13px;
      font-weight: 800;
      min-width: 48px;
      color: var(--color-text-secondary);
    }

    .rank-badge.rank-1 {
      color: #f59e0b;
    }

    .rank-badge.rank-2 {
      color: #94a3b8;
    }

    .rank-badge.rank-3 {
      color: #b45309;
    }

    .ranked-name-col {
      display: flex;
      flex-direction: column;
    }

    .ranked-name {
      font-size: 14px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .ranked-guesses-count {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .ranked-score {
      font-size: 17px;
      font-weight: 800;
      color: var(--color-primary);
    }

    /* 5. Barra Inferior Flotante */
    .floating-actions-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--color-surface-container);
      border-top: 1px solid var(--color-border-strong);
      padding: var(--space-sm) var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      z-index: 100;
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.25);
      max-width: 900px;
      margin: 0 auto;
    }

    :host-context([data-theme="light"]) .floating-actions-bar {
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
      background: #ffffff;
    }

    .btn-primary-action {
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
      gap: var(--space-xs);
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
      transition: transform 0.1s ease;
    }

    .btn-primary-action:hover:not(:disabled) {
      transform: scale(1.02);
    }

    .btn-primary-action:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      box-shadow: none;
    }

    .secondary-actions-row {
      display: flex;
      gap: var(--space-xs);
      width: 100%;
    }

    .btn-secondary-action {
      width: 100%;
      min-height: 42px;
      border-radius: var(--radius-lg);
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-secondary-action.btn-danger {
      background: rgba(220, 38, 38, 0.15);
      border: 1px solid rgba(220, 38, 38, 0.35);
      color: #ef4444;
    }

    .btn-secondary-action.btn-danger:hover {
      background: #dc2626;
      color: #ffffff;
    }

    /* Banner Devir Companion */
    .deduction-action-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md);
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%);
      border: 1px solid rgba(13, 148, 136, 0.3);
      border-radius: var(--radius-xl);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      flex-wrap: wrap;
    }

    :host-context([data-theme="light"]) .deduction-action-card {
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
      border-color: rgba(13, 148, 136, 0.25);
    }

    .action-card-info {
      flex: 1;
      min-width: 260px;
    }

    .action-card-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }

    .action-icon {
      font-size: 20px;
    }

    .action-title {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .badge-devir {
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: rgba(139, 92, 246, 0.2);
      border: 1px solid rgba(139, 92, 246, 0.4);
      color: #a78bfa;
      font-size: 11px;
      font-weight: 700;
    }

    :host-context([data-theme="light"]) .badge-devir {
      background: #ede9fe;
      color: #6d28d9;
    }

    .action-desc {
      margin: 0;
      font-size: 12px;
      color: var(--color-text-secondary);
      line-height: 1.4;
    }

    .btn-start-deduction {
      padding: 10px 18px;
      border-radius: var(--radius-lg);
      background: #0d9488;
      border: none;
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn-start-deduction:hover:not(:disabled) {
      transform: scale(1.02);
      background: #0f766e;
    }

    .btn-start-deduction:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* Modal Asistente Devir Companion */
    .wizard-dialog-card {
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-2xl);
      max-width: 580px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: var(--space-lg);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    }

    .wizard-step-title {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: var(--color-text-primary);
      text-align: center;
    }

    .wizard-button-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      width: 100%;
    }

    .btn-wizard-action {
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
      gap: var(--space-xs);
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
      transition: transform 0.1s ease;
    }

    .btn-wizard-action:hover:not(:disabled) {
      transform: scale(1.02);
    }

    .btn-wizard-action:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-wizard-cancel {
      width: 100%;
      min-height: 40px;
      border-radius: var(--radius-lg);
      background: transparent;
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-secondary);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    /* Paso 1: Handover */
    .handover-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-md);
      text-align: center;
      padding: var(--space-md) 0;
    }

    .privacy-badge {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-full);
      background: rgba(13, 148, 136, 0.15);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .privacy-badge .material-symbols-outlined {
      font-size: 34px;
    }

    .player-highlight-card {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: 14px 24px;
      background: var(--color-surface-container-high);
      border: 2px solid var(--color-primary);
      border-radius: var(--radius-xl);
    }

    .avatar-large {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-full);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-size: 22px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .player-large-name {
      font-size: 20px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .handover-notice {
      margin: 0;
      font-size: 14px;
      color: var(--color-text-secondary);
      max-width: 420px;
      line-height: 1.5;
    }

    /* Paso 2: Votación */
    .voting-step {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .voting-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: var(--space-xs);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .voting-player-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 15px;
      font-weight: 800;
      color: var(--color-primary);
    }

    .voting-progress {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-muted);
    }

    .voting-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .section-title-group {
      display: flex;
      align-items: flex-start;
      gap: var(--space-xs);
    }

    .section-num {
      width: 24px;
      height: 24px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-default);
      color: var(--color-primary);
      font-size: 12px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .section-text-col {
      display: flex;
      flex-direction: column;
    }

    .section-title {
      margin: 0;
      font-size: 14px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .section-desc {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .masks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(95px, 1fr));
      gap: 8px;
      margin-top: 4px;
    }

    .mask-choice-btn {
      padding: 12px 8px;
      border-radius: var(--radius-xl);
      background: var(--color-surface-container-high);
      border: 2px solid var(--color-border-subtle);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .mask-choice-btn:hover {
      border-color: var(--mask-color);
      transform: translateY(-2px);
    }

    .mask-choice-btn.selected-mask {
      border-color: var(--mask-color);
      background: rgba(13, 148, 136, 0.15);
      box-shadow: 0 0 0 2px var(--mask-color);
    }

    .mask-img {
      width: 48px;
      height: 58px;
      object-fit: contain;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
      transition: transform 0.15s ease;
    }

    .mask-choice-btn:hover .mask-img {
      transform: scale(1.08);
    }

    .mask-img-mini {
      width: 22px;
      height: 26px;
      object-fit: contain;
      filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
    }

    .mask-img-micro {
      width: 18px;
      height: 20px;
      object-fit: contain;
      vertical-align: middle;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
    }

    .mask-name {
      font-size: 12px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .rivals-vote-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }

    .rival-vote-card {
      padding: 10px 12px;
      border-radius: var(--radius-lg);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rival-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .rival-name {
      font-size: 13px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .rival-selected-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 700;
    }

    .masks-row-compact {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .mask-mini-btn {
      flex: 1;
      min-width: 60px;
      padding: 6px 4px;
      border-radius: var(--radius-md);
      background: var(--color-surface-container);
      border: 1.5px solid var(--color-border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .mask-mini-btn:hover {
      border-color: var(--mask-color);
    }

    .mask-mini-btn.selected-mini {
      border-color: var(--mask-color);
      background: rgba(13, 148, 136, 0.15);
      box-shadow: 0 0 0 1px var(--mask-color);
    }

    .mask-label-mini {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .voting-actions {
      margin-top: var(--space-xs);
    }

    /* Paso 3: Revelación */
    .reveal-step {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .reveal-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .reveal-icon {
      font-size: 36px;
      color: #f59e0b;
    }

    .reveal-subtitle {
      margin: 0;
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .reveal-cards-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      max-height: 48vh;
      overflow-y: auto;
      padding-right: 2px;
    }

    .reveal-player-card {
      padding: 12px 14px;
      border-radius: var(--radius-lg);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .reveal-player-card.unanimous-card {
      border-color: rgba(239, 68, 68, 0.4);
      background: rgba(239, 68, 68, 0.05);
    }

    .reveal-player-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .reveal-identity {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .reveal-avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
    }

    .reveal-info-col {
      display: flex;
      flex-direction: column;
    }

    .reveal-name {
      font-size: 14px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .real-mask-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      border: 1px solid transparent;
      font-size: 11px;
      font-weight: 700;
      margin-top: 2px;
    }

    .guesses-pill {
      font-size: 12px;
      font-weight: 800;
      color: #10b981;
    }

    .unanimous-pill {
      font-size: 12px;
      font-weight: 800;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    .reveal-guesses-breakdown {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .breakdown-title {
      font-size: 11px;
      color: var(--color-text-muted);
      font-weight: 700;
    }

    .guesses-chips-wrap {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .guess-result-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: var(--radius-md);
      font-size: 11px;
      font-weight: 700;
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-subtle);
    }

    .guess-result-chip.guess-correct {
      border-color: rgba(16, 185, 129, 0.4);
      color: #10b981;
      background: rgba(16, 185, 129, 0.08);
    }

    .guess-result-chip.guess-wrong {
      border-color: rgba(239, 68, 68, 0.3);
      color: #ef4444;
      background: rgba(239, 68, 68, 0.06);
    }

    .chip-status-icon {
      font-size: 14px;
    }

    .unanimous-alert {
      font-size: 11px;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
      padding: 6px 10px;
      border-radius: var(--radius-md);
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    .reveal-actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      margin-top: var(--space-xs);
    }

    .btn-apply {
      background: #0d9488;
      box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);
    }

    .editing-past-notice {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 700;
      color: var(--color-primary);
      padding: 0 var(--space-xs);
    }

    .btn-save-past {
      flex: 2;
      background: #0d9488;
      color: #ffffff;
    }

    /* Modales */
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

    :host-context([data-theme="light"]) .modal-overlay {
      background: rgba(15, 23, 42, 0.5);
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
    }

    .modal-icon-badge.danger-badge {
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
    }

    /* Modal de Reglas */
    .rules-modal-dialog {
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-2xl);
      max-width: 600px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    }

    .rules-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .rules-title-group {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .rules-icon {
      color: #0d9488;
      font-size: 24px;
    }

    .rules-modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .btn-close-modal {
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .rules-modal-body {
      padding: var(--space-md) var(--space-lg);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .rule-card-item {
      padding: 12px;
      border-radius: var(--radius-lg);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
    }

    .rule-title-row {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      margin-bottom: 4px;
    }

    .rule-item-icon {
      font-size: 18px;
      color: #f59e0b;
    }

    .rule-title-row h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .rule-content {
      margin: 0;
      font-size: 13px;
      color: var(--color-text-secondary);
      line-height: 1.5;
      white-space: pre-line;
    }

    .rule-highlights {
      margin: 8px 0 0 0;
      padding-left: 18px;
      font-size: 12px;
      color: var(--color-primary);
    }

    .rules-modal-footer {
      padding: var(--space-sm) var(--space-lg) var(--space-md);
      border-top: 1px solid var(--color-border-subtle);
      display: flex;
      justify-content: flex-end;
    }
  `],
})
export class SamoaScorerComponent {
  match = input.required<MatchRecord<SamoaConfig, SamoaRoundInput>>();
  private matchManager = inject(MatchManagerService);
  private registry = inject(GameRegistryService);
  private router = inject(Router);
  private engine = new SamoaEngine();

  readonly gameTheme = computed(() => this.registry.getGame(this.match().gameId)?.metadata?.theme);
  readonly quickRules = SAMOA_RULES.content.es.summary;
  readonly masks = SAMOA_MASKS;

  showRulesModal = signal(false);
  showAbandonConfirmModal = signal(false);
  viewingRound = signal(1);
  draftInputs = signal<Record<string, SamoaRoundInput>>({});

  showDeductionWizard = signal(false);
  wizardStep = signal<'handover' | 'voting' | 'reveal'>('handover');
  currentVotingPlayerIdx = signal(0);
  wizardVotes = signal<Record<string, PlayerDeductionVote>>({});
  tempOwnMask = signal<string>('');
  tempGuesses = signal<Record<string, string>>({});
  evaluationResults = signal<Record<string, DeductionEvaluationResult>>({});

  currentVotingPlayer = computed(() => {
    const players = this.match().players;
    const idx = this.currentVotingPlayerIdx();
    return players[idx] || null;
  });

  rivalPlayers = computed(() => {
    const current = this.currentVotingPlayer();
    if (!current) return [];
    return this.match().players.filter((p) => p.id !== current.id);
  });

  isLastVotingPlayer = computed(() => {
    return this.currentVotingPlayerIdx() + 1 >= this.match().players.length;
  });

  totalRounds = computed(() => this.match().config.rounds || 3);
  currentMatchRound = computed(() => this.match().currentRound);
  guessBonus = computed(() => this.match().config.guessBonus ?? 5);
  unanimousPenalty = computed(() => this.match().config.unanimousPenalty !== false);

  maxRivals = computed(() => Math.max(1, (this.match().players?.length || 2) - 1));

  guessOptions = computed(() => {
    const max = this.maxRivals();
    return Array.from({ length: max + 1 }, (_, i) => i);
  });

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

  roundRows = computed(() => {
    const m = this.match();
    return m.rounds.map((r) => {
      const unanimous: Record<string, boolean> = {};
      for (const [pid, input] of Object.entries(r.data)) {
        unanimous[pid] = !!input?.unanimouslyGuessed;
      }
      return {
        roundNum: r.roundNumber,
        roundPoints: r.roundPoints,
        cumulativeScores: r.cumulativeScores,
        unanimous,
      };
    });
  });

  rankedPlayers = computed(() => {
    const m = this.match();
    const scores = m.cumulativeScores || {};
    const history = m.rounds.map((r) => ({ data: r.data }));
    const ranked = this.engine.rankPlayers(m.players, history, scores);

    return ranked.map((item) => {
      const p = m.players.find((pl) => pl.id === item.playerId);
      return {
        id: item.playerId,
        name: p?.name || item.playerId,
        score: item.totalScore,
        rank: item.rank,
        totalGuesses: item.totalCorrectGuesses,
      };
    });
  });

  currentRankings = computed(() => {
    const rankings: Record<string, number> = {};
    for (const p of this.rankedPlayers()) {
      rankings[p.id] = p.rank;
    }
    return rankings;
  });

  constructor() {
    effect(
      () => {
        const m = this.match();
        this.viewingRound.set(m.currentRound);
        this.initDraftForRound(m.currentRound);
      },
      { allowSignalWrites: true }
    );
  }

  setViewingRound(r: number): void {
    this.viewingRound.set(r);
    this.initDraftForRound(r);
  }

  private initDraftForRound(roundNum: number): void {
    const m = this.match();
    if (roundNum === m.currentRound) {
      if (m.currentDraftRoundData && Object.keys(m.currentDraftRoundData).length > 0) {
        this.draftInputs.set(JSON.parse(JSON.stringify(m.currentDraftRoundData)));
      } else {
        const initialDraft: Record<string, SamoaRoundInput> = {};
        for (const p of m.players) {
          initialDraft[p.id] = {
            maskPoints: 0,
            correctGuesses: 0,
            unanimouslyGuessed: false,
          };
        }
        this.draftInputs.set(initialDraft);
      }
    } else {
      const pastRound = m.rounds.find((r) => r.roundNumber === roundNum);
      if (pastRound) {
        this.draftInputs.set(JSON.parse(JSON.stringify(pastRound.data)));
      }
    }
  }

  calculateForecastPoints(pData: SamoaRoundInput): number {
    if (pData.unanimouslyGuessed && this.unanimousPenalty()) {
      return 0;
    }
    const mask = pData.maskPoints ?? 0;
    const guesses = (pData.correctGuesses ?? 0) * this.guessBonus();
    return mask + guesses;
  }

  adjustMaskPoints(playerId: string, delta: number): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { maskPoints: 0, correctGuesses: 0 };
      const updated = {
        ...prev,
        [playerId]: {
          ...current,
          maskPoints: (current.maskPoints ?? 0) + delta,
        },
      };
      this.syncDraft(updated);
      return updated;
    });
  }

  setMaskPoints(playerId: string, points: number): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { maskPoints: 0, correctGuesses: 0 };
      const updated = {
        ...prev,
        [playerId]: {
          ...current,
          maskPoints: points,
        },
      };
      this.syncDraft(updated);
      return updated;
    });
  }

  setCorrectGuesses(playerId: string, count: number): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { maskPoints: 0, correctGuesses: 0 };
      const updated = {
        ...prev,
        [playerId]: {
          ...current,
          correctGuesses: Math.max(0, Math.min(this.maxRivals(), count)),
        },
      };
      this.syncDraft(updated);
      return updated;
    });
  }

  toggleUnanimouslyGuessed(playerId: string): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { maskPoints: 0, correctGuesses: 0 };
      const updated = {
        ...prev,
        [playerId]: {
          ...current,
          unanimouslyGuessed: !current.unanimouslyGuessed,
        },
      };
      this.syncDraft(updated);
      return updated;
    });
  }

  private syncDraft(draft: Record<string, SamoaRoundInput>): void {
    if (this.viewingRound() === this.currentMatchRound()) {
      this.matchManager.saveDraftRoundData(draft);
    }
  }

  canConfirmRound(): boolean {
    return this.match().players.length >= 2;
  }

  async confirmCurrentRound(): Promise<void> {
    const draft = this.draftInputs();
    await this.matchManager.commitRound(draft);

    const updatedMatch = this.match();
    if (updatedMatch.status === 'completed') {
      // Partida terminada
    } else {
      this.viewingRound.set(updatedMatch.currentRound);
      this.initDraftForRound(updatedMatch.currentRound);
    }
  }

  async commitPastRound(): Promise<void> {
    const roundNum = this.viewingRound();
    await this.matchManager.rollbackToRound(roundNum);
  }

  toggleRulesModal(): void {
    this.showRulesModal.update((v) => !v);
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

  startDeductionWizard(): void {
    this.wizardVotes.set({});
    this.currentVotingPlayerIdx.set(0);
    this.tempOwnMask.set('');
    this.tempGuesses.set({});
    this.evaluationResults.set({});
    this.wizardStep.set('handover');
    this.showDeductionWizard.set(true);
  }

  cancelDeductionWizard(): void {
    this.showDeductionWizard.set(false);
  }

  proceedToVoting(): void {
    this.wizardStep.set('voting');
  }

  selectOwnMask(maskId: string): void {
    this.tempOwnMask.set(maskId);
  }

  selectRivalGuess(rivalId: string, maskId: string): void {
    this.tempGuesses.update((g) => ({
      ...g,
      [rivalId]: maskId,
    }));
  }

  canSubmitCurrentVote(): boolean {
    if (!this.tempOwnMask()) return false;
    const rivals = this.rivalPlayers();
    const guesses = this.tempGuesses();
    return rivals.every((r) => !!guesses[r.id]);
  }

  submitCurrentVote(): void {
    const current = this.currentVotingPlayer();
    if (!current) return;

    const updatedVotes = {
      ...this.wizardVotes(),
      [current.id]: {
        ownMask: this.tempOwnMask(),
        opponentGuesses: { ...this.tempGuesses() },
      },
    };
    this.wizardVotes.set(updatedVotes);

    if (this.currentVotingPlayerIdx() + 1 < this.match().players.length) {
      this.currentVotingPlayerIdx.update((i) => i + 1);
      this.tempOwnMask.set('');
      this.tempGuesses.set({});
      this.wizardStep.set('handover');
    } else {
      const pids = this.match().players.map((p) => p.id);
      const evalResults = evaluateDeductionVotes(pids, updatedVotes);
      this.evaluationResults.set(evalResults);
      this.wizardStep.set('reveal');
    }
  }

  applyDeductionResults(): void {
    const evals = this.evaluationResults();
    const votes = this.wizardVotes();

    this.draftInputs.update((prev) => {
      const next = { ...prev };
      for (const player of this.match().players) {
        const pid = player.id;
        const current = next[pid] || { maskPoints: 0, correctGuesses: 0 };
        const evalRes = evals[pid];
        const playerVote = votes[pid];

        next[pid] = {
          ...current,
          correctGuesses: evalRes?.correctGuesses ?? 0,
          unanimouslyGuessed: !!evalRes?.unanimouslyGuessed,
          assignedMask: playerVote?.ownMask,
          guessedMasks: playerVote?.opponentGuesses,
        };
      }
      this.syncDraft(next);
      return next;
    });

    this.showDeductionWizard.set(false);
  }

  getMask(maskId?: string): SamoaMask | undefined {
    return SAMOA_MASKS.find((m) => m.id === maskId);
  }

  getMaskColor(maskId?: string): string {
    return this.getMask(maskId)?.color || 'inherit';
  }

  getMaskName(maskId?: string): string {
    return this.getMask(maskId)?.name || '';
  }

  getRivalPlayers(playerId: string) {
    return this.match().players.filter((p) => p.id !== playerId);
  }
}