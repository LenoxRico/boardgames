import {
  Component,
  computed,
  inject,
  input,
  signal,
  effect,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import jsQR from 'jsqr';
import { MatchRecord } from '../../../core/models/match.interface';
import { MatchManagerService } from '../../../core/services/match-manager.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import {
  HitsterConfig,
  HitsterRoundInput,
  HitsterTimelineCard,
  HitsterEngine,
  parseSpotifyTrackUrl,
  SpotifyTrackInfo,
  searchItunesTrack,
  ItunesTrackInfo,
  MusicProvider,
  SpotifyTier,
  HITSTER_CORE_CARDS,
  drawRandomCardFromDeck,
} from '../hitster.engine';
import { HITSTER_RULES } from '../hitster.rules';

interface RevealedTrackDetails {
  title: string;
  artist: string;
  year?: number | string;
  albumArt?: string;
  appleMusicUrl?: string;
  spotifyUrl?: string;
  itunesPreviewUrl?: string;
}

@Component({
  selector: 'app-hitster-scorer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="scorer-container">
      <!-- Elemento de audio invisible para reproducción directa de iTunes / Apple Music -->
      <audio
        #itunesAudio
        playsinline
        preload="auto"
        (ended)="onItunesAudioEnded()"
        (error)="onItunesAudioError()"
      ></audio>

      <!-- 1. Cabecera Contextual de Partida -->
      <div class="match-header-card" [style.background-image]="gameTheme()?.gradient">
        @if (gameTheme()?.bgImageUrl; as bg) {
          <div class="card-thematic-art" [style.background-image]="'url(' + bg + ')'"></div>
        }
        <div class="header-top">
          <div class="game-info">
            <div class="game-title-row">
              <span class="game-icon">🎵</span>
              <h2 class="game-name">Hitster</h2>
              <span class="badge badge-table"> Ronda {{ viewingRound() }} </span>
              <span class="badge badge-mode">
                {{ modeLabel() }}
              </span>
            </div>
            <p class="dealer-text">
              <span>100 años de éxitos • Objetivo: {{ targetCards() }} canciones</span>
              <span class="dot-separator">•</span>
              <span class="dealer-badge">Turno DJ: {{ currentDjPlayer()?.name }} 🎧</span>
            </p>
          </div>
          <div class="header-actions">
            <!-- Botón Pill de Modo Digital (Sin Cartas Físicas) -->
            <button
              type="button"
              class="btn-digital-mode-pill"
              [class.active-digital]="isDigitalMode()"
              (click)="toggleDigitalMode()"
              title="Activar/Desactivar Modo Digital para jugar sin cartas físicas"
            >
              <span class="digital-pill-icon">🎲</span>
              <span class="digital-pill-text">
                {{ isDigitalMode() ? 'Digital: ON' : 'Digital: OFF' }}
              </span>
            </button>

            <!-- Botón Pill de Proveedor Musical (Spotify / Apple Music) -->
            <button
              type="button"
              class="btn-music-provider-pill"
              (click)="openMusicSettingsModal()"
              title="Configurar servicio de música y cuenta"
            >
              <span class="provider-pill-icon">
                {{ musicProvider() === 'itunes' ? '🍎' : '🟢' }}
              </span>
              <span class="provider-pill-text">
                {{
                  musicProvider() === 'itunes'
                    ? 'Apple Music / iTunes'
                    : isSpotifyLinked()
                      ? 'Spotify Vinculado'
                      : 'Spotify'
                }}
              </span>
              <span class="material-symbols-outlined provider-pill-gear">settings</span>
            </button>

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

        <!-- Botón Hero para abrir el Escáner DJ / Reproductor -->
        <div class="dj-launcher-box">
          @if (isDigitalMode()) {
            <div class="dj-digital-launcher-group">
              <button
                type="button"
                class="btn-dj-hero btn-dj-digital"
                (click)="drawNextDigitalCardForActivePlayer()"
              >
                <div class="dj-btn-content">
                  <span class="material-symbols-outlined dj-btn-icon">shuffle</span>
                  <div class="dj-btn-text">
                    <span class="dj-btn-title"
                      >🎲 Sacar Canción Aleatoria (Turno: {{ currentDjPlayer()?.name }})</span
                    >
                    <span class="dj-btn-desc">
                      Baraja: {{ digitalDeckName() }} • {{ remainingCardsCount() }} disponibles •
                      Sin spoilers
                    </span>
                  </div>
                </div>
                <span class="dj-badge-pulse digital-pulse">¡LISTO!</span>
              </button>

              <button
                type="button"
                class="btn-secondary-dj-tools"
                (click)="openDjScannerModal()"
                title="Abrir panel de control DJ y opciones de baraja"
              >
                <span class="material-symbols-outlined">tune</span>
                <span>Panel DJ y Baraja</span>
              </button>
            </div>
          } @else {
            <button type="button" class="btn-dj-hero" (click)="openDjScannerModal()">
              <div class="dj-btn-content">
                <span class="material-symbols-outlined dj-btn-icon">album</span>
                <div class="dj-btn-text">
                  <span class="dj-btn-title">🎧 Abrir Escáner DJ / Reproductor</span>
                  <span class="dj-btn-desc">
                    Escanea el código QR de la carta física con la cámara
                  </span>
                </div>
              </div>
              <span class="dj-badge-pulse">¡EN VIVO!</span>
            </button>
          }
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
                R{{ r }}
              </button>
            }
          </div>

          <button
            type="button"
            class="stepper-nav-btn"
            [disabled]="viewingRound() >= currentMatchRound()"
            (click)="setViewingRound(viewingRound() + 1)"
            aria-label="Ronda siguiente"
          >
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <!-- 2. Tarjetas de Interacción por Jugador (Líneas de Tiempo) -->
      <div class="players-grid">
        @for (player of match().players; track player.id; let idx = $index) {
          @let pDraft = getDraftForPlayer(player.id);
          @let stats = getCumulativeStatsForPlayer(player.id);
          @let isDj = player.id === currentDjPlayer()?.id;

          <div
            class="player-card"
            [class.active-turn-card]="isDj"
            [style.background-image]="gameTheme()?.gradient"
          >
            @if (gameTheme()?.bgImageUrl; as bg) {
              <div class="card-thematic-art" [style.background-image]="'url(' + bg + ')'"></div>
            }

            <!-- Cabecera del Jugador -->
            <div class="player-card-header">
              <div class="player-profile">
                <div class="player-avatar" [style.background-color]="getPlayerAvatarColor(idx)">
                  {{ player.name.charAt(0).toUpperCase() }}
                </div>
                <div class="player-meta">
                  <div class="player-name-row">
                    <span class="player-name">{{ player.name }}</span>
                    @if (currentRankings()[player.id] === 1) {
                      <span class="badge-leader">👑 Líder</span>
                    }
                    @if (isDj) {
                      <span class="badge-dj">🎧 Turno DJ</span>
                    }
                  </div>
                  <span class="player-rank-sub">
                    Puesto {{ currentRankings()[player.id] || idx + 1 }}º • {{ stats.totalCards }} /
                    {{ targetCards() }} canciones
                  </span>
                </div>
              </div>

              <!-- Indicador de Fichas Hitster en Mano -->
              <div class="tokens-pill-display" title="Fichas Hitster en mano">
                <span class="token-coin">🪙</span>
                <span class="token-count">{{ stats.totalTokens }}</span>
                <span class="token-label">Fichas</span>
              </div>
            </div>

            <!-- Línea de Tiempo Cronológica con Cartas Hitster -->
            <div class="timeline-visual-box">
              <div class="timeline-meta-row">
                <div class="timeline-title-left">
                  <span class="material-symbols-outlined timeline-mini-icon">view_timeline</span>
                  <span class="timeline-title">Línea de Tiempo</span>
                </div>
                <div class="timeline-meta-right">
                  <span class="timeline-fraction"
                    >{{ getTimelineCardsForPlayer(player.id).length }} /
                    {{ targetCards() }} cartas</span
                  >
                  <button
                    type="button"
                    class="btn-quick-add-card"
                    (click)="openAddCardModal(player.id)"
                    title="Añadir carta manualmente a la línea de tiempo"
                  >
                    <span class="material-symbols-outlined">add</span>
                    <span>Añadir</span>
                  </button>
                </div>
              </div>

              <!-- Carrusel / Riel Horizontal de Cartas de Hitster -->
              <div class="timeline-cards-track">
                @let pCards = getTimelineCardsForPlayer(player.id);
                @let pSlots = getRemainingSlotsForPlayer(player.id);

                <div class="timeline-cards-scroll">
                  @for (card of pCards; track card.id; let cIdx = $index) {
                    <div
                      class="hitster-card-item"
                      (click)="openEditCardModal(player.id, card)"
                      [title]="
                        card.title +
                        ' - ' +
                        card.artist +
                        ' (' +
                        card.year +
                        ') • Toca para ver o editar'
                      "
                    >
                      <div class="card-vinyl-rim"></div>
                      <div class="card-content-wrap">
                        <div class="card-badge-row">
                          <span class="card-num-pill">
                            {{ card.cardId ? '#' + card.cardId : cIdx + 1 + 'ª' }}
                          </span>
                          @if (card.appleMusicUrl || card.spotifyUrl) {
                            <span class="card-has-audio-dot" title="Audio disponible">▶</span>
                          }
                        </div>
                        <div class="card-year-highlight">
                          {{ card.year }}
                        </div>
                        <div class="card-text-group">
                          <strong class="card-song-title" [title]="card.title">{{
                            card.title
                          }}</strong>
                          <span class="card-song-artist" [title]="card.artist">{{
                            card.artist
                          }}</span>
                        </div>
                      </div>
                    </div>

                    @if (cIdx < pCards.length - 1 || pSlots.length > 0) {
                      <div class="timeline-chrono-separator">
                        <span class="separator-dash"></span>
                        <span class="separator-arrow">➔</span>
                        <span class="separator-dash"></span>
                      </div>
                    }
                  }

                  <!-- Ranuras pendientes para completar la meta de cartas -->
                  @for (slot of pSlots; track slot; let sIdx = $index) {
                    <div
                      class="hitster-card-slot-placeholder"
                      (click)="openAddCardModal(player.id)"
                      title="Ranura {{ slot }}ª pendiente • Toca para añadir carta"
                    >
                      <span class="slot-badge">{{ slot }}ª</span>
                      <span class="slot-add-icon material-symbols-outlined">add</span>
                      <span class="slot-hint">Vacía</span>
                    </div>

                    @if (sIdx < pSlots.length - 1) {
                      <div class="timeline-chrono-separator separator-muted">
                        <span class="separator-dash"></span>
                        <span class="separator-arrow">➔</span>
                        <span class="separator-dash"></span>
                      </div>
                    }
                  }
                </div>
              </div>

              <!-- Barra de progreso hacia la meta -->
              <div class="timeline-progress-track">
                <div
                  class="timeline-progress-fill"
                  [style.width.%]="
                    Math.min(
                      100,
                      (getTimelineCardsForPlayer(player.id).length / targetCards()) * 100
                    )
                  "
                ></div>
              </div>
            </div>

            <!-- Controles de la Ronda Actual (Cartas Ganadas y Fichas Gastadas/Ganadas) -->
            <div class="card-inputs-section">
              <div class="input-row-metric">
                <div class="metric-label-group">
                  <span class="material-symbols-outlined metric-icon">music_video</span>
                  <div class="metric-text-col">
                    <span class="metric-label">Canciones Añadidas en R{{ viewingRound() }}</span>
                    <span class="metric-desc">Colocadas con éxito o robadas</span>
                  </div>
                </div>

                <div class="stepper-controls">
                  <button
                    type="button"
                    class="btn-step"
                    [disabled]="(pDraft.cardsWon ?? 0) <= 0"
                    (click)="adjustCardsWon(player.id, -1)"
                    aria-label="Restar carta"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                  <span class="stepper-value tabular-nums">{{ pDraft.cardsWon ?? 0 }}</span>
                  <button
                    type="button"
                    class="btn-step"
                    (click)="adjustCardsWon(player.id, 1)"
                    aria-label="Sumar carta"
                  >
                    <span class="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>

              <!-- Ajuste de Fichas Hitster en esta Ronda -->
              <div class="input-row-metric">
                <div class="metric-label-group">
                  <span class="material-symbols-outlined metric-icon">generating_tokens</span>
                  <div class="metric-text-col">
                    <span class="metric-label">Variación de Fichas R{{ viewingRound() }}</span>
                    <span class="metric-desc">Gastadas (-) o Ganadas (+)</span>
                  </div>
                </div>

                <div class="stepper-controls">
                  <button
                    type="button"
                    class="btn-step btn-token-minus"
                    (click)="adjustTokensDelta(player.id, -1)"
                    aria-label="Gastar ficha"
                  >
                    <span class="material-symbols-outlined">remove</span>
                  </button>
                  <span
                    class="stepper-value tabular-nums"
                    [class.positive-val]="(pDraft.tokensDelta ?? 0) > 0"
                    [class.negative-val]="(pDraft.tokensDelta ?? 0) < 0"
                  >
                    {{ (pDraft.tokensDelta ?? 0) > 0 ? '+' : '' }}{{ pDraft.tokensDelta ?? 0 }}
                  </span>
                  <button
                    type="button"
                    class="btn-step btn-token-plus"
                    (click)="adjustTokensDelta(player.id, 1)"
                    aria-label="Ganar ficha"
                  >
                    <span class="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>

              <!-- Botones de Acción Rápida con Fichas -->
              <div class="quick-token-actions-row">
                <button
                  type="button"
                  class="btn-quick-token"
                  (click)="quickChallengeAction(player.id)"
                  title="Gastar 1 ficha para desafiar o robar carta"
                >
                  <span class="material-symbols-outlined">swords</span>
                  <span>Desafiar (-1 🪙)</span>
                </button>

                <button
                  type="button"
                  class="btn-quick-token"
                  (click)="quickSkipAction(player.id)"
                  title="Gastar 1 ficha para pasar de canción"
                >
                  <span class="material-symbols-outlined">skip_next</span>
                  <span>Pasar (-1 🪙)</span>
                </button>

                <button
                  type="button"
                  class="btn-quick-token btn-buy-card"
                  (click)="quickBuyCardAction(player.id)"
                  title="Gastar 3 fichas para comprar carta directamente (+1 carta, -3 fichas)"
                >
                  <span class="material-symbols-outlined">shopping_cart</span>
                  <span>Comprar (+1 🎵, -3 🪙)</span>
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- 3. Tabla Matriz Histórica de Rondas Confirmadas -->
      <div class="matrix-card" [style.background-image]="gameTheme()?.gradient">
        @if (gameTheme()?.bgImageUrl; as bg) {
          <div class="card-thematic-art" [style.background-image]="'url(' + bg + ')'"></div>
        }
        <div class="matrix-header">
          <div class="matrix-title-group">
            <span class="material-symbols-outlined matrix-icon">history</span>
            <h3 class="matrix-title">Historial de Rondas Confirmadas</h3>
          </div>
          <span class="matrix-subtitle">Canciones y fichas registradas por ronda</span>
        </div>

        @if (roundRows().length === 0) {
          <div class="empty-matrix-state">
            <span class="material-symbols-outlined empty-matrix-icon">album</span>
            <p>
              Aún no se han confirmado rondas. ¡Abre el escáner DJ para reproducir tu primer éxito
              musical!
            </p>
          </div>
        } @else {
          <div class="matrix-table-wrapper">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th class="th-round">Ronda</th>
                  @for (p of match().players; track p.id) {
                    <th class="th-player">{{ p.name }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of roundRows(); track row.roundNumber) {
                  <tr>
                    <td class="td-round">
                      <button
                        type="button"
                        class="btn-link-round"
                        (click)="setViewingRound(row.roundNumber)"
                        [title]="'Ver ronda ' + row.roundNumber"
                      >
                        R{{ row.roundNumber }}
                      </button>
                    </td>
                    @for (p of match().players; track p.id) {
                      @let pData = row.inputs[p.id];
                      <td class="td-player-data">
                        <div class="matrix-cell-content">
                          <span class="matrix-cards-val">+{{ pData?.cardsWon ?? 0 }} 🎵</span>
                          @if ((pData?.tokensDelta ?? 0) !== 0) {
                            <span
                              class="matrix-tokens-val"
                              [class.pos]="(pData?.tokensDelta ?? 0) > 0"
                              [class.neg]="(pData?.tokensDelta ?? 0) < 0"
                            >
                              {{ (pData?.tokensDelta ?? 0) > 0 ? '+' : ''
                              }}{{ pData?.tokensDelta ?? 0 }} 🪙
                            </span>
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

      <!-- 4. Tarjeta de Puntuaciones y Clasificación en Vivo -->
      <div class="current-scores-card" [style.background-image]="gameTheme()?.gradient">
        @if (gameTheme()?.bgImageUrl; as bg) {
          <div class="card-thematic-art" [style.background-image]="'url(' + bg + ')'"></div>
        }
        <div class="scores-card-header">
          <div class="scores-title-group">
            <span class="material-symbols-outlined scores-icon">leaderboard</span>
            <h3 class="scores-title">Posiciones en Vivo</h3>
          </div>
          <span class="scores-subtitle"
            >Objetivo: {{ targetCards() }} canciones (desempate por fichas)</span
          >
        </div>

        <div class="ranked-list">
          @for (ranked of rankedPlayers(); track ranked.id; let idx = $index) {
            <div class="ranked-item" [class.rank-leader]="ranked.rank === 1">
              <div class="item-left">
                <span class="rank-badge">{{ ranked.rank }}º</span>
                <div class="ranked-name-col">
                  <span class="ranked-name">{{ ranked.name }}</span>
                  <span class="ranked-tokens-sub">
                    🪙 {{ ranked.totalTokens }} fichas Hitster en mano
                  </span>
                </div>
              </div>
              <div class="item-right">
                <span class="ranked-score tabular-nums"
                  >{{ ranked.totalCards }} / {{ targetCards() }}</span
                >
                <span class="score-unit-label">canciones</span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- 5. Barra Inferior Flotante de Acciones (Disposición Estrictamente Vertical) -->
      <div class="floating-actions-bar">
        @if (isEditingPastRound()) {
          <div class="editing-past-notice">
            <span class="material-symbols-outlined">edit_note</span>
            <span>Editando Ronda Histórica {{ viewingRound() }}</span>
          </div>
          <button
            type="button"
            class="btn-primary-action btn-save-past"
            (click)="commitPastRound()"
          >
            <span class="material-symbols-outlined">save</span>
            <span>Volver a Ronda {{ viewingRound() }} para reescribir</span>
          </button>
        } @else {
          <button
            type="button"
            class="btn-primary-action"
            [disabled]="!canConfirmRound()"
            (click)="confirmCurrentRound()"
          >
            <span class="material-symbols-outlined">check_circle</span>
            <span>Confirmar Ronda {{ viewingRound() }}</span>
          </button>
        }

        <!-- Fila Secundaria: Botón de Abandono (Finalizar Partida) -->
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

      <!-- MODAL 1: Escáner DJ / Reproductor sin Spoilers -->
      @if (showDjModal()) {
        <div class="modal-overlay" (click)="closeDjModal()">
          <div class="dj-modal-dialog" (click)="$event.stopPropagation()">
            <!-- Cabecera del DJ -->
            <div class="dj-modal-header">
              <div class="dj-modal-title-group">
                <span class="material-symbols-outlined dj-header-icon">headphones</span>
                <div class="dj-title-text">
                  <h3>Modo DJ Hitster</h3>
                  <p>
                    Reproduciendo con:
                    <strong>{{
                      musicProvider() === 'itunes' ? '🍎 Apple Music / iTunes' : '🟢 Spotify'
                    }}</strong>
                  </p>
                </div>
              </div>
              <div class="dj-header-actions">
                <button
                  type="button"
                  class="btn-switch-provider-icon"
                  (click)="openMusicSettingsModal()"
                  title="Cambiar proveedor o vincular cuenta"
                >
                  <span class="material-symbols-outlined">tune</span>
                </button>
                <button
                  type="button"
                  class="btn-close-modal"
                  (click)="closeDjModal()"
                  aria-label="Cerrar modal"
                >
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div class="dj-modal-body">
              <!-- Selector de Jugador Activo de este Turno -->
              <div class="dj-turn-selector">
                <span class="turn-label">🎧 ¿Quién está jugando este turno?</span>
                <div class="turn-players-chips">
                  @for (p of match().players; track p.id) {
                    <button
                      type="button"
                      class="turn-player-chip"
                      [class.active-chip]="p.id === effectiveActiveGuesserId()"
                      (click)="setActiveGuesserPlayer(p.id)"
                    >
                      {{ p.name }}
                    </button>
                  }
                </div>
              </div>

              <!-- Sección de Selección / Entrada de Canción -->
              @if (!activeTrack()) {
                <div class="dj-source-section">
                  @if (isDigitalMode()) {
                    <!-- 1. Vista Exclusiva de Modo Digital (Sin Cámara QR, Sin Enlace, Sin Demo) -->
                    <div class="digital-mode-view">
                      <div class="digital-deck-header">
                        <div class="digital-deck-info">
                          <div class="deck-title-group">
                            <span class="material-symbols-outlined deck-icon">style</span>
                            <div class="deck-title-meta">
                              <span class="deck-sub-label"
                                >Versión de la partida (igual para todos):</span
                              >
                              <strong class="deck-main-name">{{ digitalDeckName() }}</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            class="btn-change-deck-pill"
                            (click)="openDeckSelectModal()"
                            title="Cambiar versión para todos los participantes"
                          >
                            <span class="material-symbols-outlined">swap_horiz</span>
                            <span>Cambiar</span>
                          </button>
                        </div>

                        <div class="digital-deck-stats">
                          <span class="deck-counter-badge">
                            🃏 {{ usedCardIds().length }} / {{ totalDeckCards() }} jugadas
                          </span>
                          <span class="deck-remaining-badge">
                            ✨ {{ remainingCardsCount() }} disponibles
                          </span>
                        </div>
                      </div>

                      <div class="digital-draw-action-box">
                        <button
                          type="button"
                          class="btn-draw-digital-card"
                          (click)="drawDigitalCard()"
                          [disabled]="remainingCardsCount() === 0"
                        >
                          <span class="material-symbols-outlined draw-icon">play_circle</span>
                          <div class="draw-texts">
                            <span class="draw-title"> 🎲 Sacar Canción Aleatoria </span>
                            <span class="draw-sub">
                              Para <strong>{{ activeGuesserName() }}</strong> • Sin spoilers
                            </span>
                          </div>
                        </button>

                        @if (remainingCardsCount() === 0) {
                          <div class="deck-empty-alert">
                            <p>¡Se han agotado todas las canciones de esta baraja!</p>
                            <button type="button" class="btn-reset-deck" (click)="resetUsedDeck()">
                              🔄 Barajar y reiniciar mazo
                            </button>
                          </div>
                        }
                      </div>

                      <div class="digital-info-card">
                        <div class="info-row">
                          <span class="material-symbols-outlined info-icon">info</span>
                          <span>
                            Al pulsar el botón, sonará el fragmento de 30 segundos en
                            {{ musicProvider() === 'itunes' ? 'Apple Music / iTunes' : 'Spotify' }}.
                            Los datos (año, título y artista) permanecerán ocultos hasta que pulses
                            "Revelar".
                          </span>
                        </div>
                      </div>
                    </div>
                  } @else {
                    <!-- 2. Vista Exclusiva de Modo Físico (Cámara QR) -->
                    <div class="camera-scanner-view">
                      <div class="camera-viewport-box">
                        <video
                          #videoElement
                          class="camera-video"
                          playsinline
                          webkit-playsinline
                          autoplay
                          muted
                        ></video>
                        <div class="scanner-frame-overlay">
                          <div class="scanner-corner tl"></div>
                          <div class="scanner-corner tr"></div>
                          <div class="scanner-corner bl"></div>
                          <div class="scanner-corner br"></div>
                          <div class="scanner-laser-line"></div>
                        </div>
                      </div>
                      <p class="scanner-hint">
                        Apunta la cámara al código QR de la carta física de Hitster.
                      </p>
                      @if (cameraError()) {
                        <div class="camera-error-banner">
                          <span class="material-symbols-outlined">videocam_off</span>
                          <span>{{ cameraError() }}</span>
                        </div>
                      }
                      <div class="camera-actions-row">
                        <button
                          type="button"
                          class="btn-secondary-action"
                          (click)="startCameraScanner()"
                        >
                          <span class="material-symbols-outlined">refresh</span>
                          <span>Reiniciar Cámara</span>
                        </button>

                        <!-- Subir imagen como alternativa -->
                        <label class="btn-secondary-action btn-upload-label">
                          <span class="material-symbols-outlined">photo_camera</span>
                          <span>Subir Foto QR</span>
                          <input
                            type="file"
                            accept="image/*"
                            (change)="onQrImageFileSelected($event)"
                            hidden
                          />
                        </label>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <!-- SECCIÓN DE CARTA NO MAPEADA O REPRODUCTOR SIN SPOILERS -->
                @if (unmappedCardDetected(); as unmapped) {
                  <div class="unmapped-card-box">
                    <div class="unmapped-badge-row">
                      <span class="unmapped-badge"
                        >🃏 Carta #{{ unmapped.cardId }} ({{
                          unmapped.country.toUpperCase()
                        }})</span
                      >
                      <span class="unmapped-tag">No encontrada en índice local</span>
                    </div>
                    <p class="unmapped-desc">
                      Esta carta física no está en la base de datos descargada. Escribe el título o
                      artista para escucharla de inmediato en
                      {{ musicProvider() === 'itunes' ? 'iTunes' : 'Spotify' }}:
                    </p>
                    <div class="unmapped-input-row">
                      <input
                        type="text"
                        class="form-control-input"
                        placeholder="Ej: Bohemian Rhapsody Queen"
                        [(ngModel)]="fallbackSearchText"
                        (keyup.enter)="searchAndPlayFallback()"
                      />
                      <button
                        type="button"
                        class="btn-load-track"
                        [disabled]="!fallbackSearchText.trim()"
                        (click)="searchAndPlayFallback()"
                      >
                        Buscar
                      </button>
                    </div>
                    <div class="unmapped-secondary-actions">
                      <a
                        [href]="unmapped.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="link-open-card-web"
                      >
                        <span>Abrir enlace de la carta en el navegador</span>
                        <span class="material-symbols-outlined open-ext-icon">open_in_new</span>
                      </a>
                      <button type="button" class="btn-rescan-card" (click)="resetDjTrack()">
                        <span class="material-symbols-outlined">qr_code_scanner</span>
                        <span>Escanear otra carta</span>
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="dj-player-screen">
                    <!-- Indicador de Proveedor Activo en Reproducción -->
                    <div class="active-provider-indicator">
                      <span class="provider-badge-icon">
                        {{ musicProvider() === 'itunes' ? '🍎' : '🟢' }}
                      </span>
                      <span class="provider-badge-text">
                        {{
                          musicProvider() === 'itunes'
                            ? 'Audio Oficial iTunes / Apple Music (30s sin anuncios)'
                            : 'Reproduciendo vía Spotify'
                        }}
                      </span>
                      @if (activeTrack()?.cardId; as cid) {
                        <span class="card-id-pill">
                          {{ isDigitalMode() ? '🎲 Carta Digital #' + cid : 'Carta #' + cid }}
                        </span>
                      }
                    </div>

                    <!-- Botón Hero para Iniciar Audio en iTunes si Safari bloqueó autoplay -->
                    @if (musicProvider() === 'itunes' && !isPlaying()) {
                      <div class="itunes-hero-play-container">
                        <button type="button" class="btn-hero-itunes-play" (click)="startTimer()">
                          <span class="material-symbols-outlined hero-play-icon">play_circle</span>
                          <div class="hero-play-text">
                            <strong>Reproducir Audio Oficial (30s)</strong>
                            <span>Toca para comenzar la cuenta regresiva sin spoilers</span>
                          </div>
                        </button>
                      </div>
                    }

                    <!-- Botón Hero Gigante para Spotify: Abrir en la App -->
                    @if (musicProvider() === 'spotify') {
                      <div class="spotify-hero-card">
                        <button
                          type="button"
                          class="btn-hero-spotify-play"
                          (click)="openSpotifyApp()"
                        >
                          <span class="spotify-circle-icon">▶</span>
                          <div class="spotify-btn-text">
                            <strong>Abrir y Reproducir en Spotify App</strong>
                            <span>Toca para escuchar la canción en tu aplicación de Spotify</span>
                          </div>
                          <span class="material-symbols-outlined open-ext-icon">open_in_new</span>
                        </button>
                      </div>
                    }

                    <!-- Animación del Vinilo Neón y Temporizador -->
                    <div class="player-visual-center">
                      <div class="vinyl-record-disc" [class.spinning]="isPlaying()">
                        <div class="vinyl-groove"></div>
                        <div class="vinyl-center-sticker">
                          <span class="material-symbols-outlined">music_note</span>
                        </div>
                      </div>

                      <!-- Temporizador Regresivo de 30 Segundos -->
                      <div class="countdown-timer-box">
                        <div class="timer-display" [class.time-warning]="timerSecondsLeft() <= 5">
                          <span class="timer-digits tabular-nums">{{ timerSecondsLeft() }}</span>
                          <span class="timer-unit">seg</span>
                        </div>
                        <div class="timer-controls-row">
                          @if (!isTimerRunning()) {
                            <button
                              type="button"
                              class="btn-timer-action"
                              (click)="startTimer()"
                              title="Iniciar temporizador y audio"
                            >
                              <span class="material-symbols-outlined">play_arrow</span>
                            </button>
                          } @else {
                            <button
                              type="button"
                              class="btn-timer-action btn-pause"
                              (click)="pauseTimer()"
                              title="Pausar temporizador y audio"
                            >
                              <span class="material-symbols-outlined">pause</span>
                            </button>
                          }
                          <button
                            type="button"
                            class="btn-timer-action btn-reset"
                            (click)="resetTimer()"
                            title="Reiniciar a 30s"
                          >
                            <span class="material-symbols-outlined">restart_alt</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Reproductor según el Proveedor Musical Seleccionado -->
                    @if (musicProvider() === 'itunes') {
                      <!-- Modo iTunes / Apple Music: Audio Nativo HTML5 sin Iframe -->
                      <div class="itunes-player-box">
                        <div class="itunes-status-row">
                          <span class="itunes-sound-wave">🎵 Vista Previa Oficial de iTunes</span>
                          @if (isAudioLoading()) {
                            <span class="audio-loading-tag">Cargando audio...</span>
                          }
                        </div>

                        <div class="itunes-direct-actions">
                          @if (revealedTrack()?.appleMusicUrl; as appleUrl) {
                            <a
                              [href]="appleUrl"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="btn-open-apple-music"
                            >
                              <span class="apple-icon"></span>
                              <span>Abrir en Apple Music</span>
                              <span class="material-symbols-outlined open-ext-icon"
                                >open_in_new</span
                              >
                            </a>
                          }
                        </div>
                      </div>
                    } @else {
                      <!-- Modo Spotify: Embed si es Free -->
                      @if (spotifyTier() === 'free' && sanitizedEmbedUrl()) {
                        <div class="spotify-embed-container">
                          <iframe
                            [src]="sanitizedEmbedUrl()"
                            width="100%"
                            height="152"
                            frameBorder="0"
                            allowfullscreen=""
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            class="spotify-iframe"
                          ></iframe>
                        </div>
                      }
                    }

                    <!-- Línea de Tiempo del Jugador en Turno en Modo Digital (Arriba de Información Oculta) -->
                    @if (isDigitalMode() && effectiveActiveGuesserId()) {
                      <div class="dj-modal-timeline-box">
                        <div class="dj-timeline-meta-row">
                          <div class="dj-timeline-title-left">
                            <span class="material-symbols-outlined timeline-mini-icon">view_timeline</span>
                            <span class="dj-timeline-title">
                              Línea de Tiempo de <strong>{{ activeGuesserName() }}</strong>
                            </span>
                          </div>
                          <div class="dj-timeline-meta-right">
                            <span class="dj-timeline-count-badge">
                              {{ getTimelineCardsForPlayer(effectiveActiveGuesserId()).length }} /
                              {{ targetCards() }} cartas
                            </span>
                            <button
                              type="button"
                              class="btn-quick-add-card"
                              (click)="openAddCardModal(effectiveActiveGuesserId())"
                              title="Añadir carta manualmente a la línea de tiempo de {{ activeGuesserName() }}"
                            >
                              <span class="material-symbols-outlined">add</span>
                              <span>Añadir</span>
                            </button>
                          </div>
                        </div>

                        <!-- Carrusel / Riel Horizontal de Cartas de Hitster -->
                        <div class="timeline-cards-track dj-timeline-cards-track">
                          @let pCards = getTimelineCardsForPlayer(effectiveActiveGuesserId());
                          @let pSlots = getRemainingSlotsForPlayer(effectiveActiveGuesserId());

                          <div class="timeline-cards-scroll">
                            @for (card of pCards; track card.id; let cIdx = $index) {
                              <div
                                class="hitster-card-item"
                                (click)="openEditCardModal(effectiveActiveGuesserId(), card)"
                                [title]="
                                  card.title +
                                  ' - ' +
                                  card.artist +
                                  ' (' +
                                  card.year +
                                  ') • Toca para ver o editar'
                                "
                              >
                                <div class="card-vinyl-rim"></div>
                                <div class="card-content-wrap">
                                  <div class="card-badge-row">
                                    <span class="card-num-pill">
                                      {{ card.cardId ? '#' + card.cardId : cIdx + 1 + 'ª' }}
                                    </span>
                                    @if (card.appleMusicUrl || card.spotifyUrl) {
                                      <span class="card-has-audio-dot" title="Audio disponible">▶</span>
                                    }
                                  </div>
                                  <div class="card-year-highlight">
                                    {{ card.year }}
                                  </div>
                                  <div class="card-text-group">
                                    <strong class="card-song-title" [title]="card.title">{{
                                      card.title
                                    }}</strong>
                                    <span class="card-song-artist" [title]="card.artist">{{
                                      card.artist
                                    }}</span>
                                  </div>
                                </div>
                              </div>

                              @if (cIdx < pCards.length - 1 || pSlots.length > 0) {
                                <div class="timeline-chrono-separator">
                                  <span class="separator-dash"></span>
                                  <span class="separator-arrow">➔</span>
                                  <span class="separator-dash"></span>
                                </div>
                              }
                            }

                            <!-- Ranuras pendientes para completar la meta de cartas -->
                            @for (slot of pSlots; track slot; let sIdx = $index) {
                              <div
                                class="hitster-card-slot-placeholder"
                                (click)="openAddCardModal(effectiveActiveGuesserId())"
                                title="Ranura {{ slot }}ª pendiente • Toca para añadir carta"
                              >
                                <span class="slot-badge">{{ slot }}ª</span>
                                <span class="slot-add-icon material-symbols-outlined">add</span>
                                <span class="slot-hint">Vacía</span>
                              </div>

                              @if (sIdx < pSlots.length - 1) {
                                <div class="timeline-chrono-separator separator-muted">
                                  <span class="separator-dash"></span>
                                  <span class="separator-arrow">➔</span>
                                  <span class="separator-dash"></span>
                                </div>
                              }
                            }
                          </div>
                        </div>
                      </div>
                    }

                    <!-- ESTADO 1: Oculto (El jugador está pensando dónde colocarla) -->
                    @if (!isRevealed()) {
                      <div class="hidden-spoiler-banner">
                        <div class="spoiler-icon-badge">
                          <span class="material-symbols-outlined">visibility_off</span>
                        </div>
                        <h4 class="spoiler-title">Información Oculta</h4>
                        <p class="spoiler-desc">
                          El jugador activo <strong>{{ activeGuesserName() }}</strong> debe colocar
                          la carta en su línea de tiempo. Los rivales pueden desafiar con sus fichas
                          Hitster antes de pulsar revelar.
                        </p>

                        <button
                          type="button"
                          class="btn-reveal-hero"
                          (click)="revealTrackDetails()"
                        >
                          <span class="material-symbols-outlined">visibility</span>
                          <span>Revelar Canción y Año</span>
                        </button>
                      </div>
                    } @else {
                      <!-- ESTADO 2: Revelado (Título, Artista, Año y Asignación de Resultados) -->
                      <div class="revealed-details-card">
                        @if (revealedTrack()?.albumArt; as art) {
                          <div class="revealed-cover-box">
                            <img [src]="art" alt="Portada del álbum" class="revealed-album-art" />
                          </div>
                        }

                        <div class="revealed-year-badge">
                          <span class="year-label">AÑO DE LANZAMIENTO</span>
                          <span class="year-number">{{
                            revealedTrack()?.year || 'Año de Éxito'
                          }}</span>
                        </div>

                        <div class="revealed-song-meta">
                          <h3 class="revealed-title">
                            {{ revealedTrack()?.title || 'Título de la canción' }}
                          </h3>
                          <h4 class="revealed-artist">
                            {{ revealedTrack()?.artist || 'Artista' }}
                          </h4>
                        </div>

                        <!-- Enlaces oficiales a plataformas -->
                        <div class="revealed-platform-links">
                          @if (revealedTrack()?.appleMusicUrl; as amUrl) {
                            <a
                              [href]="amUrl"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="link-platform-tag apple-tag"
                            >
                              <span> Apple Music</span>
                            </a>
                          }
                          @if (activeTrack()?.url; as spUrl) {
                            <a
                              [href]="spUrl"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="link-platform-tag spotify-tag"
                            >
                              <span>🟢 Spotify</span>
                            </a>
                          }
                        </div>

                        <!-- Panel de Resolución Rápida del Turno -->
                        <div class="smart-resolution-panel">
                          <h4 class="panel-section-title">
                            ¿Qué ocurrió en este turno con {{ activeGuesserName() }}?
                          </h4>

                          <!-- 1. Colocación en la Línea de Tiempo -->
                          <div class="resolution-options">
                            <button
                              type="button"
                              class="btn-resolve-success"
                              [class.selected-action]="placementOutcome() === 'success'"
                              (click)="awardSuccessToActivePlayer()"
                            >
                              <span class="material-symbols-outlined">check_circle</span>
                              <span>✅ ¡Correcto! (+1 Carta para {{ activeGuesserName() }})</span>
                            </button>

                            <button
                              type="button"
                              class="btn-resolve-fail"
                              [class.selected-action]="placementOutcome() === 'fail'"
                              (click)="markActivePlayerFailed()"
                            >
                              <span class="material-symbols-outlined">cancel</span>
                              <span>❌ Falló (Carta descartada al pozo)</span>
                            </button>
                          </div>

                          <!-- 2. Desafío de Rivales con Ficha Hitster -->
                          <div class="rival-challenge-section">
                            <span class="sub-section-label"
                              >¿Algún rival desafió la colocación con su ficha?</span
                            >
                            <div class="rival-challenge-list">
                              @for (rival of rivalPlayers(); track rival.id) {
                                <div class="rival-challenge-row">
                                  <span class="rival-name">{{ rival.name }}:</span>
                                  <div class="challenge-actions-group">
                                    <button
                                      type="button"
                                      class="btn-rival-action btn-rival-win"
                                      [class.selected-action]="rivalOutcomes()[rival.id] === 'win'"
                                      (click)="awardStolenCardToRival(rival.id)"
                                      title="Robó la carta con éxito (+1 carta para el rival)"
                                    >
                                      <span>🎯 Acertó (+1 🎵)</span>
                                    </button>
                                    <button
                                      type="button"
                                      class="btn-rival-action btn-rival-lose"
                                      [class.selected-action]="rivalOutcomes()[rival.id] === 'lose'"
                                      (click)="penalizeRivalToken(rival.id)"
                                      title="Desafío erróneo (pierde 1 ficha Hitster)"
                                    >
                                      <span>💥 Falló (-1 🪙)</span>
                                    </button>
                                  </div>
                                </div>
                              }
                            </div>
                          </div>

                          <!-- 3. Bonificación por Artista y Título (Modos Pro / Expert) -->
                          <div class="bonus-token-section">
                            <button
                              type="button"
                              class="btn-bonus-token"
                              [class.selected-action]="bonusTokenAwarded()"
                              (click)="awardBonusTokenToActivePlayer()"
                            >
                              <span class="material-symbols-outlined">star</span>
                              <span
                                >⭐ Supo Artista y Título (+1 Ficha 🪙 para
                                {{ activeGuesserName() }})</span
                              >
                            </button>
                          </div>
                        </div>

                        <div class="revealed-footer-actions">
                          @if (isDigitalMode()) {
                            <button
                              type="button"
                              class="btn-next-digital-track"
                              (click)="nextDigitalTurn()"
                            >
                              <span class="material-symbols-outlined">shuffle</span>
                              <span>🎲 Confirmar Ronda y Siguiente Canción</span>
                            </button>
                          } @else {
                            <button
                              type="button"
                              class="btn-next-track"
                              (click)="nextPhysicalTurn()"
                            >
                              <span class="material-symbols-outlined">skip_next</span>
                              <span>Confirmar Ronda y Escanear Siguiente</span>
                            </button>
                          }
                          <button type="button" class="btn-done-dj" (click)="closeDjModal()">
                            <span>Volver a la Mesa</span>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </div>
        </div>
      }

      <!-- MODAL 2: Configuración del Servicio Musical y Vinculación de Cuenta -->
      @if (showMusicSettingsModal()) {
        <div class="modal-overlay" (click)="closeMusicSettingsModal()">
          <div class="music-settings-dialog" (click)="$event.stopPropagation()">
            <div class="music-settings-header">
              <div class="music-settings-title-group">
                <span class="material-symbols-outlined music-settings-icon">queue_music</span>
                <div>
                  <h3>Servicio Musical de Hitster</h3>
                  <p>Elige tu proveedor preferido para reproducir las canciones</p>
                </div>
              </div>
              <button
                type="button"
                class="btn-close-modal"
                (click)="closeMusicSettingsModal()"
                aria-label="Cerrar modal"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="music-settings-body">
              <!-- Opción 1: Apple Music / iTunes (Recomendado) -->
              <div
                class="provider-choice-card"
                [class.selected]="musicProvider() === 'itunes'"
                (click)="setMusicProvider('itunes')"
              >
                <div class="choice-card-header">
                  <div class="choice-brand">
                    <span class="brand-badge itunes-badge">🍎 Apple Music / iTunes</span>
                    <span class="recommended-tag">Recomendado en iPhone</span>
                  </div>
                  <span class="material-symbols-outlined radio-check">
                    {{
                      musicProvider() === 'itunes'
                        ? 'radio_button_checked'
                        : 'radio_button_unchecked'
                    }}
                  </span>
                </div>
                <p class="choice-desc">
                  Reproduce audio oficial de 30 segundos directamente en la app mediante la API de
                  iTunes, con sonido nítido AAC, sin publicidad y sin requerir suscripción ni cuenta
                  de pago.
                </p>
              </div>

              <!-- Opción 2: Spotify -->
              <div
                class="provider-choice-card"
                [class.selected]="musicProvider() === 'spotify'"
                (click)="setMusicProvider('spotify')"
              >
                <div class="choice-card-header">
                  <div class="choice-brand">
                    <span class="brand-badge spotify-badge">🟢 Spotify</span>
                  </div>
                  <span class="material-symbols-outlined radio-check">
                    {{
                      musicProvider() === 'spotify'
                        ? 'radio_button_checked'
                        : 'radio_button_unchecked'
                    }}
                  </span>
                </div>
                <p class="choice-desc">
                  Reproduce abriendo la aplicación oficial de Spotify o a través del reproductor web
                  integrado.
                </p>

                @if (musicProvider() === 'spotify') {
                  <div class="spotify-account-box" (click)="$event.stopPropagation()">
                    <span class="spotify-box-title">Modo de Cuenta Spotify:</span>
                    <div class="spotify-tier-selector">
                      <button
                        type="button"
                        class="tier-pill"
                        [class.active]="spotifyTier() === 'premium'"
                        (click)="setSpotifyTier('premium')"
                      >
                        ⭐ Spotify Premium
                      </button>
                      <button
                        type="button"
                        class="tier-pill"
                        [class.active]="spotifyTier() === 'free'"
                        (click)="setSpotifyTier('free')"
                      >
                        🎧 Spotify Free
                      </button>
                    </div>

                    <div class="spotify-user-input-group">
                      <label class="input-tiny-label">Vincular Nombre de Usuario o Cuenta:</label>
                      <div class="spotify-user-input-row">
                        <input
                          type="text"
                          class="spotify-user-input"
                          placeholder="Tu usuario de Spotify"
                          [(ngModel)]="tempSpotifyUser"
                        />
                        <button
                          type="button"
                          class="btn-link-spotify"
                          (click)="saveSpotifyAccount()"
                        >
                          {{ isSpotifyLinked() ? 'Guardado ✓' : 'Vincular' }}
                        </button>
                      </div>
                    </div>

                    @if (isSpotifyLinked()) {
                      <div class="linked-success-badge">
                        <span class="material-symbols-outlined">verified</span>
                        <span
                          >Cuenta Vinculada:
                          <strong>{{ spotifyUser() || 'Spotify Conectado' }}</strong></span
                        >
                      </div>
                    }

                    <button type="button" class="btn-test-spotify" (click)="testSpotifyLink()">
                      <span class="material-symbols-outlined">play_circle</span>
                      <span>Probar Conexión con Spotify App</span>
                    </button>
                  </div>
                }
              </div>

              <!-- Selector de Edición o País de tus Cartas Hitster -->
              <div class="settings-edition-section">
                <span class="settings-subheading">Edición o País de tus Cartas Hitster:</span>
                <div class="edition-pills-row">
                  @for (opt of countryOptions; track opt.code) {
                    <button
                      type="button"
                      class="country-edition-pill"
                      [class.active]="selectedCardCountry() === opt.code"
                      (click)="setCardCountry(opt.code)"
                    >
                      <span>{{ opt.flag }} {{ opt.label }}</span>
                    </button>
                  }
                </div>
                <p class="settings-sub-hint">
                  Las cartas con prefijo regional (ej. hitstergame.com/us/...) se auto-detectan.
                  Este ajuste asegura la concordancia exacta en mazos nacionales.
                </p>
              </div>

              <!-- Toggle de Redirección Automática para Spotify -->
              @if (musicProvider() === 'spotify') {
                <div class="toggle-setting-row" (click)="toggleAutoRedirectSpotify()">
                  <div class="toggle-setting-text">
                    <span class="toggle-title">Redirección directa a Spotify App</span>
                    <span class="toggle-desc"
                      >Abre la app de Spotify automáticamente al escanear</span
                    >
                  </div>
                  <span
                    class="material-symbols-outlined toggle-switch-icon"
                    [class.enabled]="autoRedirectSpotify()"
                  >
                    {{ autoRedirectSpotify() ? 'toggle_on' : 'toggle_off' }}
                  </span>
                </div>
              }
            </div>

            <div class="music-settings-footer">
              <button type="button" class="btn-primary-action" (click)="closeMusicSettingsModal()">
                Guardar y Listo
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL 3: Reglas Rápidas de Hitster -->
      @if (showRulesModal()) {
        <div class="modal-overlay" (click)="toggleRulesModal()">
          <div class="rules-modal-dialog" (click)="$event.stopPropagation()">
            <div class="rules-modal-header">
              <div class="rules-title-group">
                <span class="material-symbols-outlined rules-icon">album</span>
                <h3>Reglas Rápidas de Hitster</h3>
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
                </div>
              }
            </div>
            <div class="rules-modal-footer">
              <button type="button" class="btn-modal-cancel" (click)="toggleRulesModal()">
                Entendido, ¡a jugar!
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Selección de Baraja Digital (Versión compartida para todos) -->
      @if (showDeckSelectModal()) {
        <div class="modal-overlay" (click)="closeDeckSelectModal()">
          <div class="deck-select-modal-dialog" (click)="$event.stopPropagation()">
            <div class="deck-select-header">
              <div class="deck-select-title-group">
                <span class="material-symbols-outlined deck-select-icon">style</span>
                <div>
                  <h3 class="deck-select-title">Seleccionar Baraja Digital</h3>
                  <p class="deck-select-subtitle">
                    Todos los jugadores jugarán con la misma baraja en esta partida:
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="btn-close-modal"
                (click)="closeDeckSelectModal()"
                aria-label="Cerrar selección de baraja"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="deck-select-body">
              <!-- Opción 1: Hitster Latino -->
              <div
                class="deck-option-card"
                [class.selected-deck]="digitalDeck() === 'latino'"
                (click)="selectDeckEdition('latino')"
              >
                <div class="deck-option-header">
                  <div class="deck-flag-title">
                    <span class="deck-flag-icon">🇲🇽</span>
                    <div class="deck-card-meta">
                      <strong class="deck-card-title">Hitster Latino</strong>
                      <span class="deck-badge-count">308 éxitos</span>
                    </div>
                  </div>
                  <span class="material-symbols-outlined deck-check-icon">
                    {{ digitalDeck() === 'latino' ? 'check_circle' : 'radio_button_unchecked' }}
                  </span>
                </div>
                <p class="deck-card-desc">
                  Grandes himnos de pop latino, rock en español, reggaetón clásico, salsa, cumbia y
                  éxitos internacionales que marcaron época en Latinoamérica y España.
                </p>
              </div>

              <!-- Opción 2: Hitster Original US -->
              <div
                class="deck-option-card"
                [class.selected-deck]="digitalDeck() === 'us'"
                (click)="selectDeckEdition('us')"
              >
                <div class="deck-option-header">
                  <div class="deck-flag-title">
                    <span class="deck-flag-icon">🇺🇸</span>
                    <div class="deck-card-meta">
                      <strong class="deck-card-title">Hitster Original (US / Internacional)</strong>
                      <span class="deck-badge-count">336 éxitos</span>
                    </div>
                  </div>
                  <span class="material-symbols-outlined deck-check-icon">
                    {{ digitalDeck() === 'us' ? 'check_circle' : 'radio_button_unchecked' }}
                  </span>
                </div>
                <p class="deck-card-desc">
                  Clásicos legendarios en inglés desde los años 50 hasta la actualidad: Pop
                  internacional, Rock, Disco, R&B y las canciones más escuchadas del mundo.
                </p>
              </div>

              <!-- Opción 3: Hitster España -->
              <div
                class="deck-option-card"
                [class.selected-deck]="digitalDeck() === 'es'"
                (click)="selectDeckEdition('es')"
              >
                <div class="deck-option-header">
                  <div class="deck-flag-title">
                    <span class="deck-flag-icon">🇪🇸</span>
                    <div class="deck-card-meta">
                      <strong class="deck-card-title">Hitster España</strong>
                      <span class="deck-badge-count">420 éxitos</span>
                    </div>
                  </div>
                  <span class="material-symbols-outlined deck-check-icon">
                    {{ digitalDeck() === 'es' ? 'check_circle' : 'radio_button_unchecked' }}
                  </span>
                </div>
                <p class="deck-card-desc">
                  Edición española oficial con los éxitos más emblemáticos del pop español, la
                  Movida Madrileña, indie nacional y números uno de las listas de España.
                </p>
              </div>

              <!-- Opción 4: Todas las Barajas Combinadas -->
              <div
                class="deck-option-card"
                [class.selected-deck]="digitalDeck() === 'all'"
                (click)="selectDeckEdition('all')"
              >
                <div class="deck-option-header">
                  <div class="deck-flag-title">
                    <span class="deck-flag-icon">🌍</span>
                    <div class="deck-card-meta">
                      <strong class="deck-card-title">Todas las Barajas Combinadas</strong>
                      <span class="deck-badge-count highlight">Más de 1,000 canciones</span>
                    </div>
                  </div>
                  <span class="material-symbols-outlined deck-check-icon">
                    {{ digitalDeck() === 'all' ? 'check_circle' : 'radio_button_unchecked' }}
                  </span>
                </div>
                <p class="deck-card-desc">
                  Combina todas las barajas existentes (Latina, EE.UU. y España) en un mega-mazo
                  aleatorio sin canciones repetidas para partidas épicas e infinitas.
                </p>
              </div>
            </div>

            <div class="deck-select-footer">
              <button type="button" class="btn-primary-action" (click)="confirmDeckSelection()">
                Listo, Usar esta Baraja
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Ver / Editar / Añadir Carta a la Línea de Tiempo -->
      @if (showCardEditModal()) {
        <div class="modal-overlay" (click)="closeCardEditModal()">
          <div class="card-edit-modal-dialog" (click)="$event.stopPropagation()">
            <div class="card-edit-header">
              <div class="card-edit-title-group">
                <span class="material-symbols-outlined card-edit-icon">style</span>
                <div>
                  <h3 class="card-edit-title">
                    {{ isNewCard() ? 'Añadir Carta a la Línea de Tiempo' : 'Detalles de la Carta' }}
                  </h3>
                  <p class="card-edit-subtitle">
                    Línea de tiempo de: <strong>{{ getPlayerNameById(editingPlayerId()) }}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="btn-close-modal"
                (click)="closeCardEditModal()"
                aria-label="Cerrar modal"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="card-edit-body">
              <div class="card-preview-banner">
                <div class="preview-year">{{ editFormYear() }}</div>
                <div class="preview-meta">
                  <strong class="preview-title">{{
                    editFormTitle() || 'Título de la canción'
                  }}</strong>
                  <span class="preview-artist">{{ editFormArtist() || 'Artista' }}</span>
                </div>
              </div>

              <div class="card-edit-form-group">
                <label class="form-field-label">Año de lanzamiento (clave de colocación):</label>
                <div class="year-stepper-input">
                  <input
                    type="number"
                    class="form-control-input year-input"
                    [value]="editFormYear()"
                    (input)="onYearInput($event)"
                    min="1900"
                    max="2030"
                    placeholder="Ej: 1984"
                  />
                  <div class="year-quick-adjust-group">
                    <button type="button" class="btn-year-adjust" (click)="adjustEditYear(-10)">
                      -10
                    </button>
                    <button type="button" class="btn-year-adjust" (click)="adjustEditYear(-1)">
                      -1
                    </button>
                    <button type="button" class="btn-year-adjust" (click)="adjustEditYear(1)">
                      +1
                    </button>
                    <button type="button" class="btn-year-adjust" (click)="adjustEditYear(10)">
                      +10
                    </button>
                  </div>
                </div>
              </div>

              <div class="card-edit-form-group">
                <label class="form-field-label">Título de la canción:</label>
                <input
                  type="text"
                  class="form-control-input"
                  [value]="editFormTitle()"
                  (input)="onTitleInput($event)"
                  placeholder="Ej: Bohemian Rhapsody"
                />
              </div>

              <div class="card-edit-form-group">
                <label class="form-field-label">Artista o Banda:</label>
                <input
                  type="text"
                  class="form-control-input"
                  [value]="editFormArtist()"
                  (input)="onArtistInput($event)"
                  placeholder="Ej: Queen"
                />
              </div>

              @if (editingCard()?.appleMusicUrl || editingCard()?.spotifyUrl; as link) {
                <div class="card-external-listen-box">
                  <a
                    [href]="link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-listen-external"
                  >
                    <span class="material-symbols-outlined">play_circle</span>
                    <span
                      >Escuchar en
                      {{ editingCard()?.appleMusicUrl ? 'Apple Music' : 'Spotify' }}</span
                    >
                  </a>
                </div>
              }
            </div>

            <div class="card-edit-footer">
              @if (!isNewCard()) {
                <button
                  type="button"
                  class="btn-delete-card"
                  (click)="deleteEditingCard()"
                  title="Eliminar esta carta de la línea de tiempo"
                >
                  <span class="material-symbols-outlined">delete</span>
                  <span>Eliminar</span>
                </button>
              }
              <div class="footer-save-actions">
                <button type="button" class="btn-modal-cancel" (click)="closeCardEditModal()">
                  Cancelar
                </button>
                <button
                  type="button"
                  class="btn-primary-action btn-save-card"
                  (click)="saveTimelineCardForm()"
                >
                  <span class="material-symbols-outlined">save</span>
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- MODAL 4: Confirmación de Abandono (Regla Estricta de Diseño) -->
      @if (showAbandonConfirmModal()) {
        <div class="modal-overlay" (click)="cancelAbandon()">
          <div class="modal-dialog-card" (click)="$event.stopPropagation()">
            <div class="modal-icon-badge danger-badge">
              <span class="material-symbols-outlined">warning</span>
            </div>
            <h3 class="modal-title">¿Finalizar la partida en curso?</h3>
            <p class="modal-message">
              Estás en medio de una partida de <strong>Hitster</strong>. Si confirmas, saldrás al
              catálogo de juegos y esta partida <strong>no se guardará en el historial</strong>.
            </p>
            <div class="modal-actions">
              <button type="button" class="btn-modal-cancel" (click)="cancelAbandon()">
                Cancelar y Continuar Jugando
              </button>
              <button type="button" class="btn-modal-confirm-abandon" (click)="confirmAbandon()">
                <span class="material-symbols-outlined">delete_forever</span>
                <span>Sí, Finalizar Partida</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .scorer-container {
        padding: 0 var(--space-xs) 120px;
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
        box-sizing: border-box;
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
      }

      /* Cards Estándar con Temática y Marca de Agua */
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

      :host-context([data-theme='light']) .match-header-card,
      :host-context([data-theme='light']) .player-card,
      :host-context([data-theme='light']) .matrix-card,
      :host-context([data-theme='light']) .current-scores-card {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        border-color: var(--color-border-subtle);
        background: #ffffff;
      }

      .match-header-card > *,
      .player-card > *,
      .matrix-card > *,
      .current-scores-card > * {
        position: relative;
        z-index: 1;
      }

      .card-thematic-art {
        position: absolute !important;
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
        -webkit-mask-image: radial-gradient(
          circle at 100% 0%,
          rgba(0, 0, 0, 1) 0%,
          transparent 85%
        );
        transition: opacity 0.2s ease;
      }

      :host-context([data-theme='light']) .card-thematic-art {
        opacity: 0.6;
      }

      /* 1. Cabecera */
      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--space-sm);
        gap: 8px;
      }

      .game-title-row {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        flex-wrap: wrap;
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
        background: rgba(236, 72, 153, 0.15);
        border: 1px solid rgba(236, 72, 153, 0.3);
        color: #ec4899;
        font-size: 11px;
        font-weight: 700;
      }

      .badge-mode {
        padding: 2px 8px;
        border-radius: var(--radius-full);
        background: rgba(139, 92, 246, 0.15);
        border: 1px solid rgba(139, 92, 246, 0.3);
        color: #8b5cf6;
        font-size: 11px;
        font-weight: 700;
      }

      .dealer-text {
        margin: 4px 0 0;
        font-size: 12px;
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }

      .dot-separator {
        opacity: 0.5;
      }

      .dealer-badge {
        font-weight: 700;
        color: #ec4899;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn-digital-mode-pill {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: var(--radius-full);
        background: var(--color-surface);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-secondary);
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-digital-mode-pill.active-digital {
        background: rgba(16, 185, 129, 0.15);
        border-color: #10b981;
        color: #10b981;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
      }

      .digital-pill-icon {
        font-size: 13px;
      }

      .btn-music-provider-pill {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: var(--radius-full);
        background: var(--color-surface);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-music-provider-pill:hover {
        background: var(--color-surface-hover);
        border-color: #ec4899;
      }

      .provider-pill-icon {
        font-size: 14px;
      }

      .provider-pill-gear {
        font-size: 14px;
        opacity: 0.6;
      }

      .icon-action-btn {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-full);
        background: var(--color-surface);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .icon-action-btn:hover {
        background: var(--color-surface-hover);
        transform: scale(1.05);
      }

      /* Botón Hero DJ Launcher */
      .dj-launcher-box {
        margin: var(--space-sm) 0 var(--space-md);
      }

      .btn-dj-hero {
        width: 100%;
        min-height: 58px;
        border-radius: var(--radius-lg);
        background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%);
        border: none;
        color: #ffffff;
        padding: var(--space-sm) var(--space-md);
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(236, 72, 153, 0.35);
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }

      .btn-dj-hero:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(236, 72, 153, 0.5);
      }

      .dj-btn-content {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        text-align: left;
      }

      .dj-btn-icon {
        font-size: 32px;
      }

      .dj-btn-text {
        display: flex;
        flex-direction: column;
      }

      .dj-btn-title {
        font-size: 15px;
        font-weight: 800;
        letter-spacing: -0.2px;
      }

      .dj-btn-desc {
        font-size: 11px;
        opacity: 0.9;
      }

      .dj-badge-pulse {
        background: rgba(255, 255, 255, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: var(--radius-full);
        padding: 4px 8px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.5px;
        animation: pulseGlow 2s infinite;
      }

      @keyframes pulseGlow {
        0%,
        100% {
          opacity: 0.8;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.06);
        }
      }

      .dj-digital-launcher-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .btn-dj-digital {
        background: linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #8b5cf6 100%);
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
      }

      .btn-dj-digital:hover {
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
      }

      .digital-pulse {
        background: rgba(255, 255, 255, 0.3);
        border-color: #ffffff;
      }

      .btn-secondary-dj-tools {
        align-self: center;
        background: transparent;
        border: none;
        color: var(--color-text-secondary);
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        padding: 4px 10px;
        border-radius: var(--radius-md);
        transition: all 0.2s ease;
      }

      .btn-secondary-dj-tools:hover {
        color: var(--color-text-primary);
        background: var(--color-surface);
      }

      /* Stepper de Rondas */
      .rounds-stepper-bar {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        background: var(--color-surface);
        border-radius: var(--radius-lg);
        padding: 4px;
        border: 1px solid var(--color-border-subtle);
      }

      .stepper-nav-btn {
        width: 32px;
        height: 32px;
        border-radius: var(--radius-md);
        background: transparent;
        border: none;
        color: var(--color-text-secondary);
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
        flex: 1;
        display: flex;
        gap: 4px;
        overflow-x: auto;
        scrollbar-width: none;
      }

      .rounds-scroll-track::-webkit-scrollbar {
        display: none;
      }

      .round-chip-btn {
        padding: 4px 10px;
        border-radius: var(--radius-md);
        background: transparent;
        border: 1px solid transparent;
        color: var(--color-text-secondary);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }

      .round-chip-btn.active-round {
        background: #ec4899;
        color: #ffffff;
        font-weight: 800;
      }

      .round-chip-btn.confirmed-round:not(.active-round) {
        color: #10b981;
        border-color: rgba(16, 185, 129, 0.3);
      }

      /* 2. Grid de Jugadores */
      .players-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
        gap: var(--space-md);
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
      }

      .player-card.active-turn-card {
        border-color: #ec4899;
        box-shadow: 0 0 0 2px rgba(236, 72, 153, 0.35);
      }

      .player-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-sm);
        gap: 8px;
      }

      .player-profile {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        min-width: 0;
      }

      .player-avatar {
        width: 38px;
        height: 38px;
        border-radius: var(--radius-full);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 15px;
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        flex-shrink: 0;
      }

      .player-meta {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .player-name-row {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .player-name {
        font-size: 15px;
        font-weight: 800;
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .badge-leader {
        font-size: 10px;
        padding: 1px 6px;
        background: rgba(245, 158, 11, 0.2);
        border: 1px solid rgba(245, 158, 11, 0.4);
        color: #f59e0b;
        border-radius: var(--radius-full);
        font-weight: 700;
      }

      .badge-dj {
        font-size: 10px;
        padding: 1px 6px;
        background: rgba(236, 72, 153, 0.2);
        border: 1px solid rgba(236, 72, 153, 0.4);
        color: #ec4899;
        border-radius: var(--radius-full);
        font-weight: 700;
      }

      .player-rank-sub {
        font-size: 11px;
        color: var(--color-text-muted);
      }

      .tokens-pill-display {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: var(--radius-full);
        background: rgba(236, 72, 153, 0.12);
        border: 1px solid rgba(236, 72, 153, 0.3);
        flex-shrink: 0;
      }

      .token-coin {
        font-size: 14px;
      }

      .token-count {
        font-size: 14px;
        font-weight: 800;
        color: #ec4899;
      }

      .token-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--color-text-secondary);
      }

      /* Barra de Progreso de Línea de Tiempo */
      .timeline-visual-box {
        background: var(--color-surface);
        border: 1px solid var(--color-border-subtle);
        border-radius: var(--radius-lg);
        padding: 8px 10px;
        margin-bottom: var(--space-sm);
        width: 100%;
        max-width: 100%;
        min-width: 0;
        box-sizing: border-box;
        overflow: hidden;
      }

      .timeline-meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        margin-bottom: 6px;
        flex-wrap: wrap;
      }

      .timeline-title-left {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        flex-shrink: 1;
      }

      .timeline-mini-icon {
        font-size: 16px;
        color: #ec4899;
        flex-shrink: 0;
      }

      .timeline-title {
        font-weight: 700;
        color: var(--color-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .timeline-meta-right {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        flex-shrink: 0;
      }

      .timeline-fraction {
        font-weight: 800;
        color: #ec4899;
        white-space: nowrap;
      }

      .btn-quick-add-card {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 2px 8px;
        border-radius: var(--radius-full);
        background: rgba(236, 72, 153, 0.12);
        border: 1px solid rgba(236, 72, 153, 0.35);
        color: #ec4899;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }

      .btn-quick-add-card:hover {
        background: #ec4899;
        color: #ffffff;
      }

      .timeline-cards-track {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        box-sizing: border-box;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 6px 2px 10px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: rgba(236, 72, 153, 0.4) transparent;
      }

      .timeline-cards-track::-webkit-scrollbar {
        height: 6px;
      }

      .timeline-cards-track::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: var(--radius-full);
      }

      .timeline-cards-track::-webkit-scrollbar-thumb {
        background: rgba(236, 72, 153, 0.4);
        border-radius: var(--radius-full);
      }

      .timeline-cards-track::-webkit-scrollbar-thumb:hover {
        background: #ec4899;
      }

      .timeline-cards-scroll {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: max-content;
        padding: 2px;
      }

      /* Tarjeta Hitster en la Línea de Tiempo */
      .hitster-card-item {
        width: 130px;
        min-width: 130px;
        min-height: 136px;
        height: 136px;
        background: radial-gradient(circle at 50% 0%, #1f1f2e 0%, #12121a 100%);
        border: 2px solid #ec4899;
        border-radius: var(--radius-lg);
        padding: 8px 10px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(236, 72, 153, 0.25);
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease;
        flex-shrink: 0;
        box-sizing: border-box;
      }

      :host-context([data-theme='light']) .hitster-card-item {
        background: radial-gradient(circle at 50% 0%, #ffffff 0%, #f4f4f8 100%);
        border-color: #ec4899;
        box-shadow: 0 4px 12px rgba(236, 72, 153, 0.15);
      }

      .hitster-card-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(236, 72, 153, 0.45);
      }

      .card-vinyl-rim {
        position: absolute;
        top: -24px;
        right: -24px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 1px dashed rgba(236, 72, 153, 0.25);
        pointer-events: none;
      }

      .card-content-wrap {
        display: flex;
        flex-direction: column;
        height: 100%;
        justify-content: space-between;
        gap: 2px;
        position: relative;
        z-index: 1;
        box-sizing: border-box;
      }

      .card-badge-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
      }

      .card-num-pill {
        font-size: 9px;
        font-weight: 800;
        color: #8b5cf6;
        background: rgba(139, 92, 246, 0.15);
        padding: 1px 5px;
        border-radius: var(--radius-sm);
      }

      .card-has-audio-dot {
        font-size: 8px;
        color: #10b981;
      }

      .card-year-highlight {
        font-size: 24px;
        font-weight: 900;
        line-height: 1;
        color: #ffffff;
        text-shadow: 0 2px 8px rgba(236, 72, 153, 0.6);
        text-align: center;
        margin: 2px 0;
        letter-spacing: -0.5px;
      }

      :host-context([data-theme='light']) .card-year-highlight {
        color: #ec4899;
        text-shadow: none;
      }

      .card-text-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
        text-align: center;
        width: 100%;
      }

      .card-song-title {
        font-size: 11px;
        font-weight: 800;
        color: var(--color-text-primary);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.25;
        text-align: center;
        word-break: break-word;
      }

      .card-song-artist {
        font-size: 10px;
        color: var(--color-text-secondary);
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.2;
        text-align: center;
        word-break: break-word;
      }

      /* Ranura pendiente en la Línea de Tiempo */
      .hitster-card-slot-placeholder {
        width: 90px;
        min-width: 90px;
        height: 136px;
        border: 2px dashed rgba(236, 72, 153, 0.35);
        border-radius: var(--radius-lg);
        background: rgba(236, 72, 153, 0.04);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        cursor: pointer;
        flex-shrink: 0;
        box-sizing: border-box;
        transition: all 0.15s ease;
        padding: 6px;
      }

      :host-context([data-theme='light']) .hitster-card-slot-placeholder {
        border-color: rgba(236, 72, 153, 0.4);
        background: rgba(236, 72, 153, 0.05);
      }

      .hitster-card-slot-placeholder:hover {
        border-color: #ec4899;
        background: rgba(236, 72, 153, 0.12);
        transform: translateY(-2px);
      }

      .slot-badge {
        font-size: 10px;
        font-weight: 800;
        color: #8b5cf6;
        background: rgba(139, 92, 246, 0.15);
        padding: 1px 6px;
        border-radius: var(--radius-sm);
      }

      .slot-add-icon {
        font-size: 22px;
        color: #ec4899;
      }

      .slot-hint {
        font-size: 9px;
        font-weight: 700;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Conectores cronológicos */
      .timeline-chrono-separator {
        display: flex;
        align-items: center;
        gap: 2px;
        color: var(--color-text-tertiary);
        font-size: 11px;
        flex-shrink: 0;
        user-select: none;
      }

      .timeline-chrono-separator.separator-muted {
        opacity: 0.4;
      }

      .separator-dash {
        width: 6px;
        height: 1px;
        background: var(--color-border-subtle);
      }

      .separator-arrow {
        color: #ec4899;
        font-weight: 700;
      }

      .timeline-progress-track {
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.08);
        overflow: hidden;
        margin-top: 4px;
      }

      :host-context([data-theme='light']) .timeline-progress-track {
        background: rgba(0, 0, 0, 0.08);
      }

      .timeline-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #ec4899, #8b5cf6, #06b6d4);
        border-radius: 3px;
        transition: width 0.3s ease;
      }

      /* Controles de Inputs */
      .card-inputs-section {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
      }

      .input-row-metric {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        background: var(--color-surface);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border-subtle);
      }

      .metric-label-group {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
      }

      .metric-icon {
        font-size: 20px;
        color: #ec4899;
      }

      .metric-text-col {
        display: flex;
        flex-direction: column;
      }

      .metric-label {
        font-size: 13px;
        font-weight: 700;
        color: var(--color-text-primary);
      }

      .metric-desc {
        font-size: 10px;
        color: var(--color-text-muted);
      }

      .stepper-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .btn-step {
        width: 34px;
        height: 34px;
        border-radius: var(--radius-md);
        background: var(--color-surface-container);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .btn-step:hover:not(:disabled) {
        background: var(--color-surface-hover);
      }

      .btn-step:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      .stepper-value {
        min-width: 28px;
        text-align: center;
        font-size: 16px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .positive-val {
        color: #10b981;
      }

      .negative-val {
        color: #ef4444;
      }

      /* Acciones Rápidas con Fichas */
      .quick-token-actions-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1.3fr;
        gap: 6px;
        margin-top: 4px;
      }

      .btn-quick-token {
        min-height: 36px;
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--color-border-subtle);
        color: var(--color-text-secondary);
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        cursor: pointer;
        padding: 4px 6px;
        transition: all 0.2s ease;
      }

      :host-context([data-theme='light']) .btn-quick-token {
        background: rgba(0, 0, 0, 0.04);
      }

      .btn-quick-token:hover {
        background: rgba(236, 72, 153, 0.15);
        border-color: #ec4899;
        color: #ec4899;
      }

      .btn-buy-card {
        background: rgba(139, 92, 246, 0.12);
        border-color: rgba(139, 92, 246, 0.35);
        color: #8b5cf6;
      }

      .btn-buy-card:hover {
        background: rgba(139, 92, 246, 0.25);
        border-color: #8b5cf6;
        color: #ffffff;
      }

      /* 3. Matriz Histórica */
      .matrix-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-sm);
      }

      .matrix-title-group {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
      }

      .matrix-icon {
        font-size: 20px;
        color: #8b5cf6;
      }

      .matrix-title {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .matrix-subtitle {
        font-size: 11px;
        color: var(--color-text-muted);
      }

      .empty-matrix-state {
        padding: var(--space-lg);
        text-align: center;
        color: var(--color-text-muted);
        font-size: 13px;
      }

      .empty-matrix-icon {
        font-size: 40px;
        margin-bottom: var(--space-xs);
        opacity: 0.5;
      }

      .matrix-table-wrapper {
        overflow-x: auto;
      }

      .matrix-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      .matrix-table th,
      .matrix-table td {
        padding: 8px 12px;
        text-align: center;
        border-bottom: 1px solid var(--color-border-subtle);
      }

      .matrix-table th {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-secondary);
        background: var(--color-surface);
      }

      .th-round {
        width: 70px;
      }

      .btn-link-round {
        background: transparent;
        border: none;
        color: #ec4899;
        font-weight: 800;
        cursor: pointer;
      }

      .matrix-cell-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }

      .matrix-cards-val {
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .matrix-tokens-val {
        font-size: 10px;
        font-weight: 700;
      }

      .matrix-tokens-val.pos {
        color: #10b981;
      }

      .matrix-tokens-val.neg {
        color: #ef4444;
      }

      /* 4. Posiciones en Vivo */
      .scores-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-sm);
      }

      .scores-title-group {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
      }

      .scores-icon {
        font-size: 20px;
        color: #ec4899;
      }

      .scores-title {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .scores-subtitle {
        font-size: 11px;
        color: var(--color-text-muted);
      }

      .ranked-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
      }

      .ranked-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-radius: var(--radius-md);
        background: var(--color-surface);
        border: 1px solid var(--color-border-subtle);
      }

      .ranked-item.rank-leader {
        border-color: rgba(236, 72, 153, 0.4);
        background: rgba(236, 72, 153, 0.08);
      }

      .item-left {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
      }

      .rank-badge {
        width: 24px;
        height: 24px;
        border-radius: var(--radius-full);
        background: var(--color-surface-container);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .ranked-name-col {
        display: flex;
        flex-direction: column;
      }

      .ranked-name {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-primary);
      }

      .ranked-tokens-sub {
        font-size: 10px;
        color: var(--color-text-muted);
      }

      .item-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .ranked-score {
        font-size: 16px;
        font-weight: 900;
        color: #ec4899;
      }

      .score-unit-label {
        font-size: 10px;
        color: var(--color-text-muted);
      }

      /* 5. Barra Flotante Inferior (Vertical Estricta) */
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

      :host-context([data-theme='light']) .floating-actions-bar {
        box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
        background: #ffffff;
      }

      .btn-primary-action {
        width: 100%;
        min-height: 48px;
        border-radius: var(--radius-lg);
        background: #ec4899;
        color: #ffffff;
        border: none;
        font-size: 15px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-xs);
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
        transition: all 0.2s ease;
      }

      .btn-primary-action:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(236, 72, 153, 0.45);
      }

      .btn-primary-action:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .btn-save-past {
        background: #8b5cf6;
      }

      .secondary-actions-row {
        width: 100%;
        display: flex;
        gap: var(--space-xs);
      }

      .btn-secondary-action {
        width: 100%;
        min-height: 40px;
        border-radius: var(--radius-md);
        background: transparent;
        border: 1px solid var(--color-border-default);
        color: var(--color-text-secondary);
        font-size: 13px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-xs);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-secondary-action.btn-danger {
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.35);
      }

      .btn-secondary-action.btn-danger:hover {
        background: rgba(239, 68, 68, 0.1);
        border-color: #ef4444;
      }

      .btn-upload-label {
        cursor: pointer;
      }

      .editing-past-notice {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 700;
        color: #8b5cf6;
      }

      /* MODAL BASE */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.82);
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
        border-radius: var(--radius-xl);
        padding: var(--space-lg);
        max-width: 440px;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--space-sm);
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
      }

      :host-context([data-theme='light']) .modal-dialog-card {
        background: #ffffff;
      }

      .modal-icon-badge {
        width: 52px;
        height: 52px;
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

      .modal-title {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .modal-message {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: var(--color-text-secondary);
      }

      .modal-actions {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        width: 100%;
        margin-top: var(--space-sm);
      }

      .btn-modal-cancel {
        width: 100%;
        min-height: 44px;
        border-radius: var(--radius-md);
        background: var(--color-surface);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        font-weight: 700;
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
        gap: var(--space-xs);
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        transition: background 0.15s ease;
      }

      .btn-modal-confirm-abandon:hover {
        background: #b91c1c;
      }

      /* MODAL DE REGLAS */
      .rules-modal-dialog {
        background: var(--color-surface-container);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-xl);
        max-width: 560px;
        width: 100%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      :host-context([data-theme='light']) .rules-modal-dialog {
        background: #ffffff;
      }

      .rules-modal-header {
        padding: var(--space-md);
        border-bottom: 1px solid var(--color-border-subtle);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .rules-title-group {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
      }

      .rules-icon {
        font-size: 24px;
        color: #ec4899;
      }

      .rules-modal-body {
        padding: var(--space-md);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
      }

      .rule-card-item {
        background: var(--color-surface);
        border: 1px solid var(--color-border-subtle);
        border-radius: var(--radius-lg);
        padding: var(--space-sm) var(--space-md);
      }

      .rule-title-row {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        margin-bottom: 4px;
      }

      .rule-item-icon {
        font-size: 18px;
        color: #ec4899;
      }

      .rule-content {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: var(--color-text-secondary);
        white-space: pre-line;
      }

      .rules-modal-footer {
        padding: var(--space-sm) var(--space-md);
        border-top: 1px solid var(--color-border-subtle);
        display: flex;
        justify-content: flex-end;
      }

      .btn-close-modal {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-full);
        background: transparent;
        border: none;
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      /* MODAL DJ HITSTER */
      .dj-modal-dialog {
        background: var(--color-surface-container);
        border: 1px solid rgba(236, 72, 153, 0.4);
        border-radius: var(--radius-xl);
        max-width: 580px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow:
          0 16px 48px rgba(0, 0, 0, 0.5),
          0 0 24px rgba(236, 72, 153, 0.25);
      }

      :host-context([data-theme='light']) .dj-modal-dialog {
        background: #ffffff;
      }

      .dj-modal-header {
        padding: var(--space-sm) var(--space-md);
        background: linear-gradient(90deg, rgba(236, 72, 153, 0.15), rgba(139, 92, 246, 0.15));
        border-bottom: 1px solid var(--color-border-subtle);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .dj-modal-title-group {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
      }

      .dj-header-icon {
        font-size: 28px;
        color: #ec4899;
      }

      .dj-title-text h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .dj-title-text p {
        margin: 2px 0 0;
        font-size: 11px;
        color: var(--color-text-muted);
      }

      .dj-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn-switch-provider-icon {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-full);
        background: var(--color-surface);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .dj-modal-body {
        padding: var(--space-md);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
      }

      /* Selector de Turno en el DJ */
      .dj-turn-selector {
        background: var(--color-surface);
        border: 1px solid var(--color-border-subtle);
        border-radius: var(--radius-lg);
        padding: var(--space-xs) var(--space-sm);
      }

      .turn-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-secondary);
        display: block;
        margin-bottom: 6px;
      }

      .turn-players-chips {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        scrollbar-width: none;
      }

      .turn-player-chip {
        padding: 4px 12px;
        border-radius: var(--radius-full);
        background: var(--color-surface-container);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
      }

      .turn-player-chip.active-chip {
        background: #ec4899;
        border-color: #ec4899;
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(236, 72, 153, 0.4);
      }

      /* MODAL DE SELECCIÓN DE BARAJA DIGITAL */
      .deck-select-modal-dialog {
        background: var(--color-surface-container);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-xl);
        max-width: 540px;
        width: 100%;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
      }

      :host-context([data-theme='light']) .deck-select-modal-dialog {
        background: #ffffff;
      }

      .deck-select-header {
        padding: var(--space-md);
        border-bottom: 1px solid var(--color-border-subtle);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .deck-select-title-group {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
      }

      .deck-select-icon {
        font-size: 28px;
        color: #10b981;
      }

      .deck-select-title {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .deck-select-subtitle {
        margin: 2px 0 0;
        font-size: 12px;
        color: var(--color-text-secondary);
      }

      .deck-select-body {
        padding: var(--space-md);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
      }

      .deck-option-card {
        background: var(--color-surface);
        border: 2px solid var(--color-border-subtle);
        border-radius: var(--radius-lg);
        padding: var(--space-sm) var(--space-md);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 6px;
        transition: all 0.2s ease;
      }

      .deck-option-card:hover {
        border-color: rgba(16, 185, 129, 0.5);
        background: rgba(16, 185, 129, 0.04);
      }

      .deck-option-card.selected-deck {
        border-color: #10b981;
        background: rgba(16, 185, 129, 0.1);
      }

      .deck-option-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-xs);
      }

      .deck-flag-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .deck-flag-icon {
        font-size: 24px;
        line-height: 1;
      }

      .deck-card-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .deck-card-title {
        font-size: 14px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .deck-badge-count {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: var(--radius-full);
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }

      .deck-badge-count.highlight {
        background: rgba(236, 72, 153, 0.15);
        color: #ec4899;
        font-weight: 800;
      }

      .deck-check-icon {
        font-size: 22px;
        color: var(--color-text-muted);
      }

      .deck-option-card.selected-deck .deck-check-icon {
        color: #10b981;
      }

      .deck-card-desc {
        margin: 0;
        font-size: 11px;
        line-height: 1.4;
        color: var(--color-text-secondary);
      }

      .deck-select-footer {
        padding: var(--space-sm) var(--space-md);
        border-top: 1px solid var(--color-border-subtle);
        display: flex;
        justify-content: flex-end;
      }

      /* Modo Digital */
      .digital-mode-view {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
      }

      .digital-deck-header {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        background: var(--color-surface);
        border: 1px solid var(--color-border-subtle);
        border-radius: var(--radius-lg);
        padding: var(--space-sm) var(--space-md);
      }

      .digital-deck-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-xs);
      }

      .deck-title-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .deck-icon {
        font-size: 24px;
        color: #10b981;
      }

      .deck-title-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        text-align: left;
      }

      .deck-sub-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--color-text-muted);
        font-weight: 700;
      }

      .deck-main-name {
        font-size: 14px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .btn-change-deck-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border-radius: var(--radius-full);
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid #10b981;
        color: #10b981;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-change-deck-pill:hover {
        background: #10b981;
        color: #ffffff;
      }

      /* Modal de Edición de Carta de Línea de Tiempo */
      .card-edit-modal-dialog {
        background: var(--color-surface-container);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-xl);
        max-width: 480px;
        width: 100%;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
      }

      :host-context([data-theme='light']) .card-edit-modal-dialog {
        background: #ffffff;
      }

      .card-edit-header {
        padding: var(--space-md);
        border-bottom: 1px solid var(--color-border-subtle);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .card-edit-title-group {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
      }

      .card-edit-icon {
        font-size: 24px;
        color: #ec4899;
      }

      .card-edit-title {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .card-edit-subtitle {
        margin: 2px 0 0;
        font-size: 12px;
        color: var(--color-text-secondary);
      }

      .card-edit-body {
        padding: var(--space-md);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
      }

      .card-preview-banner {
        background: radial-gradient(circle at 50% 0%, #1f1f2e 0%, #12121a 100%);
        border: 2px solid #ec4899;
        border-radius: var(--radius-lg);
        padding: var(--space-md);
        display: flex;
        align-items: center;
        gap: var(--space-md);
        box-shadow: 0 4px 16px rgba(236, 72, 153, 0.2);
      }

      :host-context([data-theme='light']) .card-preview-banner {
        background: #fbfbfe;
      }

      .preview-year {
        font-size: 32px;
        font-weight: 900;
        color: #ec4899;
        line-height: 1;
      }

      .preview-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        text-align: left;
      }

      .preview-title {
        font-size: 14px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .preview-artist {
        font-size: 12px;
        color: #8b5cf6;
      }

      .card-edit-form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .form-field-label {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-primary);
      }

      .year-stepper-input {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
      }

      .year-input {
        max-width: 140px;
        font-size: 18px;
        font-weight: 800;
        text-align: center;
      }

      .year-quick-adjust-group {
        display: flex;
        gap: 4px;
      }

      .btn-year-adjust {
        padding: 6px 10px;
        border-radius: var(--radius-md);
        background: var(--color-surface);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }

      .btn-year-adjust:hover {
        background: rgba(236, 72, 153, 0.15);
        border-color: #ec4899;
        color: #ec4899;
      }

      .card-external-listen-box {
        margin-top: 4px;
      }

      .btn-listen-external {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: var(--radius-md);
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid #10b981;
        color: #10b981;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
      }

      .card-edit-footer {
        padding: var(--space-sm) var(--space-md);
        border-top: 1px solid var(--color-border-subtle);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-xs);
      }

      .btn-delete-card {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 8px 12px;
        border-radius: var(--radius-md);
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid #ef4444;
        color: #ef4444;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }

      .footer-save-actions {
        display: flex;
        gap: var(--space-xs);
        margin-left: auto;
      }

      .btn-save-card {
        min-width: 100px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }

      .digital-deck-selector {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-sm);
      }

      .digital-label {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        font-weight: 700;
        color: var(--color-text-primary);
      }

      .digital-select-control {
        flex: 1;
        max-width: 260px;
        padding: 6px 10px;
        border-radius: var(--radius-md);
        background: var(--color-surface-container);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        font-size: 13px;
        font-weight: 600;
      }

      .digital-deck-stats {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        font-size: 11px;
        color: var(--color-text-muted);
      }

      .deck-counter-badge,
      .deck-remaining-badge {
        padding: 2px 8px;
        border-radius: var(--radius-full);
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        font-weight: 700;
      }

      .digital-draw-action-box {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
      }

      .btn-draw-digital-card {
        width: 100%;
        min-height: 64px;
        border-radius: var(--radius-lg);
        background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
        border: none;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md);
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
        transition: all 0.2s ease;
      }

      .btn-draw-digital-card:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
      }

      .btn-draw-digital-card:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .draw-icon {
        font-size: 36px;
      }

      .draw-texts {
        display: flex;
        flex-direction: column;
        text-align: left;
      }

      .draw-title {
        font-size: 16px;
        font-weight: 800;
      }

      .draw-sub {
        font-size: 12px;
        opacity: 0.9;
      }

      .deck-empty-alert {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: var(--radius-md);
        padding: var(--space-sm);
        text-align: center;
        color: var(--color-error);
        font-size: 12px;
      }

      .btn-reset-deck {
        margin-top: 6px;
        padding: 6px 12px;
        border-radius: var(--radius-md);
        background: var(--color-surface);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
      }

      .digital-info-card {
        background: rgba(6, 182, 212, 0.08);
        border: 1px solid rgba(6, 182, 212, 0.2);
        border-radius: var(--radius-md);
        padding: var(--space-sm);
        font-size: 12px;
        color: var(--color-text-secondary);
      }

      .info-row {
        display: flex;
        align-items: flex-start;
        gap: 6px;
      }

      .info-icon {
        font-size: 16px;
        color: #06b6d4;
        flex-shrink: 0;
        margin-top: 1px;
      }

      /* Cámara QR */
      .camera-scanner-view {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-sm);
      }

      .camera-viewport-box {
        position: relative;
        width: 100%;
        max-width: 320px;
        height: 240px;
        background: #000000;
        border-radius: var(--radius-lg);
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      }

      .camera-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .scanner-frame-overlay {
        position: absolute;
        inset: 20px;
        pointer-events: none;
      }

      .scanner-corner {
        position: absolute;
        width: 24px;
        height: 24px;
        border-color: #ec4899;
        border-style: solid;
        border-width: 0;
      }

      .scanner-corner.tl {
        top: 0;
        left: 0;
        border-top-width: 3px;
        border-left-width: 3px;
      }
      .scanner-corner.tr {
        top: 0;
        right: 0;
        border-top-width: 3px;
        border-right-width: 3px;
      }
      .scanner-corner.bl {
        bottom: 0;
        left: 0;
        border-bottom-width: 3px;
        border-left-width: 3px;
      }
      .scanner-corner.br {
        bottom: 0;
        right: 0;
        border-bottom-width: 3px;
        border-right-width: 3px;
      }

      .scanner-laser-line {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, #ec4899, #06b6d4, transparent);
        box-shadow: 0 0 8px #ec4899;
        animation: laserScan 2s infinite ease-in-out;
      }

      @keyframes laserScan {
        0%,
        100% {
          top: 0%;
        }
        50% {
          top: 95%;
        }
      }

      .scanner-hint {
        font-size: 12px;
        color: var(--color-text-secondary);
        text-align: center;
        margin: 0;
      }

      .camera-actions-row {
        display: flex;
        gap: var(--space-xs);
        width: 100%;
        max-width: 320px;
      }

      .camera-error-banner {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid #ef4444;
        color: #ef4444;
        padding: 6px 12px;
        border-radius: var(--radius-md);
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .form-control-input {
        flex: 1;
        height: 44px;
        border-radius: var(--radius-md);
        background: var(--color-surface);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        padding: 0 12px;
        font-size: 14px;
      }

      /* Pantalla del Reproductor DJ */
      .dj-player-screen {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
      }

      .active-provider-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 4px 10px;
        background: rgba(236, 72, 153, 0.1);
        border: 1px solid rgba(236, 72, 153, 0.25);
        border-radius: var(--radius-full);
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .player-visual-center {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-lg);
        padding: var(--space-sm) 0;
      }

      /* Vinilo Animado */
      .vinyl-record-disc {
        width: 100px;
        height: 100px;
        border-radius: var(--radius-full);
        background: radial-gradient(circle, #18181b 30%, #09090b 70%);
        border: 3px solid #ec4899;
        box-shadow: 0 0 16px rgba(236, 72, 153, 0.4);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .vinyl-record-disc.spinning {
        animation: spinVinyl 3s linear infinite;
      }

      @keyframes spinVinyl {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .vinyl-groove {
        position: absolute;
        inset: 8px;
        border-radius: var(--radius-full);
        border: 1px dashed rgba(255, 255, 255, 0.15);
      }

      .vinyl-center-sticker {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-full);
        background: #ec4899;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 16px;
      }

      /* Temporizador */
      .countdown-timer-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }

      .timer-display {
        display: flex;
        align-items: baseline;
        gap: 4px;
        background: var(--color-surface);
        border: 2px solid #8b5cf6;
        border-radius: var(--radius-lg);
        padding: 4px 16px;
      }

      .timer-display.time-warning {
        border-color: #ef4444;
        color: #ef4444;
        animation: pulseWarning 1s infinite;
      }

      @keyframes pulseWarning {
        0%,
        100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }

      .timer-digits {
        font-size: 32px;
        font-weight: 900;
        color: #8b5cf6;
      }

      .time-warning .timer-digits {
        color: #ef4444;
      }

      .timer-unit {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-muted);
      }

      .timer-controls-row {
        display: flex;
        gap: 6px;
      }

      .btn-timer-action {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-full);
        background: var(--color-surface);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .btn-timer-action:hover {
        background: var(--color-surface-hover);
      }

      .btn-timer-action.btn-pause {
        color: #f59e0b;
      }

      /* Player Box iTunes */
      .itunes-player-box {
        background: var(--color-surface);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-lg);
        padding: var(--space-sm) var(--space-md);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .itunes-status-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-primary);
      }

      .audio-loading-tag {
        font-size: 10px;
        color: #ec4899;
        animation: pulseGlow 1.5s infinite;
      }

      .btn-open-apple-music {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: var(--radius-full);
        background: #fa2d48;
        color: #ffffff;
        font-size: 12px;
        font-weight: 800;
        text-decoration: none;
        box-shadow: 0 2px 8px rgba(250, 45, 72, 0.3);
      }

      .apple-icon {
        font-size: 14px;
      }

      /* Spotify Embed & Link */
      .spotify-embed-container {
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      }

      .spotify-iframe {
        border-radius: 12px;
        background: transparent;
      }

      .spotify-app-link-box {
        display: flex;
        justify-content: center;
      }

      .btn-open-spotify {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: var(--radius-full);
        background: #1ed760;
        color: #000000;
        font-size: 12px;
        font-weight: 800;
        text-decoration: none;
        box-shadow: 0 2px 8px rgba(30, 215, 96, 0.3);
        transition: transform 0.2s ease;
      }

      .btn-open-spotify:hover {
        transform: scale(1.03);
      }

      .open-ext-icon {
        font-size: 16px;
      }

      /* Línea de Tiempo del Jugador en Turno dentro del Modal DJ (Modo Digital) */
      .dj-modal-timeline-box {
        background: var(--color-surface);
        border: 1px solid rgba(236, 72, 153, 0.35);
        border-radius: var(--radius-lg);
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        max-width: 100%;
        min-width: 0;
        box-sizing: border-box;
      }

      :host-context([data-theme='light']) .dj-modal-timeline-box {
        background: #fdf2f8;
        border-color: rgba(236, 72, 153, 0.4);
      }

      .dj-timeline-meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }

      .dj-timeline-title-left {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .dj-timeline-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--color-text-primary);
      }

      .dj-timeline-title strong {
        color: #ec4899;
      }

      .dj-timeline-meta-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .dj-timeline-count-badge {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-secondary);
        background: var(--color-surface-container);
        padding: 2px 8px;
        border-radius: var(--radius-full);
      }

      .dj-timeline-cards-track {
        margin: 0;
        padding-top: 4px;
        padding-bottom: 6px;
      }

      /* Spoiler Oculto */
      .hidden-spoiler-banner {
        background: var(--color-surface);
        border: 1px dashed rgba(236, 72, 153, 0.4);
        border-radius: var(--radius-lg);
        padding: var(--space-md);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-xs);
      }

      .spoiler-icon-badge {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-full);
        background: rgba(236, 72, 153, 0.15);
        color: #ec4899;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }

      .spoiler-title {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .spoiler-desc {
        margin: 0;
        font-size: 13px;
        color: var(--color-text-secondary);
        max-width: 400px;
        line-height: 1.4;
      }

      .btn-reveal-hero {
        margin-top: var(--space-xs);
        min-height: 48px;
        padding: 0 var(--space-lg);
        border-radius: var(--radius-full);
        background: linear-gradient(135deg, #ec4899, #8b5cf6);
        border: none;
        color: #ffffff;
        font-size: 15px;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(236, 72, 153, 0.4);
        transition: all 0.2s ease;
      }

      .btn-reveal-hero:hover {
        transform: scale(1.03);
        box-shadow: 0 6px 20px rgba(236, 72, 153, 0.6);
      }

      /* Detalles Revelados */
      .revealed-details-card {
        background: var(--color-surface);
        border: 1px solid rgba(236, 72, 153, 0.4);
        border-radius: var(--radius-lg);
        padding: var(--space-md);
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
        text-align: center;
      }

      .revealed-cover-box {
        display: flex;
        justify-content: center;
      }

      .revealed-album-art {
        width: 120px;
        height: 120px;
        border-radius: var(--radius-lg);
        object-fit: cover;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      }

      .revealed-year-badge {
        background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2));
        border: 1px solid #ec4899;
        border-radius: var(--radius-lg);
        padding: var(--space-xs) var(--space-md);
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .year-label {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1px;
        color: #ec4899;
      }

      .year-number {
        font-size: 38px;
        font-weight: 900;
        color: #ffffff;
        text-shadow: 0 2px 10px rgba(236, 72, 153, 0.6);
      }

      :host-context([data-theme='light']) .year-number {
        color: #8b5cf6;
      }

      .revealed-song-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .revealed-title {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .revealed-artist {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #8b5cf6;
      }

      .revealed-platform-links {
        display: flex;
        justify-content: center;
        gap: 8px;
      }

      .link-platform-tag {
        padding: 4px 10px;
        border-radius: var(--radius-full);
        font-size: 11px;
        font-weight: 700;
        text-decoration: none;
      }

      .apple-tag {
        background: rgba(250, 45, 72, 0.15);
        border: 1px solid rgba(250, 45, 72, 0.4);
        color: #fa2d48;
      }

      .spotify-tag {
        background: rgba(30, 215, 96, 0.15);
        border: 1px solid rgba(30, 215, 96, 0.4);
        color: #10b981;
      }

      /* Smart Resolution Panel */
      .smart-resolution-panel {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
        text-align: left;
        background: var(--color-surface-container);
        border-radius: var(--radius-md);
        padding: var(--space-sm);
      }

      .panel-section-title {
        margin: 0;
        font-size: 13px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .resolution-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-xs);
      }

      .btn-resolve-success {
        min-height: 44px;
        border-radius: var(--radius-md);
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid #10b981;
        color: #10b981;
        font-size: 12px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        cursor: pointer;
        padding: 6px;
        transition: all 0.2s ease;
      }

      .btn-resolve-success:hover,
      .btn-resolve-success.selected-action {
        background: #10b981;
        color: #ffffff;
        box-shadow: 0 0 16px rgba(16, 185, 129, 0.5);
      }

      .btn-resolve-fail {
        min-height: 44px;
        border-radius: var(--radius-md);
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.4);
        color: #ef4444;
        font-size: 12px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        cursor: pointer;
        padding: 6px;
        transition: all 0.2s ease;
      }

      .btn-resolve-fail:hover,
      .btn-resolve-fail.selected-action {
        background: #ef4444;
        color: #ffffff;
        box-shadow: 0 0 16px rgba(239, 68, 68, 0.5);
      }

      .rival-challenge-section {
        border-top: 1px solid var(--color-border-subtle);
        padding-top: var(--space-xs);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .sub-section-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .rival-challenge-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .rival-challenge-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 4px 6px;
        background: var(--color-surface);
        border-radius: var(--radius-sm);
      }

      .rival-name {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-primary);
      }

      .challenge-actions-group {
        display: flex;
        gap: 4px;
      }

      .btn-rival-action {
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border-subtle);
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }

      .btn-rival-win {
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.4);
        color: #10b981;
        transition: all 0.2s ease;
      }

      .btn-rival-win:hover,
      .btn-rival-win.selected-action {
        background: #10b981;
        color: #ffffff;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
      }

      .btn-rival-lose {
        background: rgba(239, 68, 68, 0.12);
        border-color: rgba(239, 68, 68, 0.4);
        color: #ef4444;
        transition: all 0.2s ease;
      }

      .btn-rival-lose:hover,
      .btn-rival-lose.selected-action {
        background: #ef4444;
        color: #ffffff;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
      }

      .bonus-token-section {
        border-top: 1px solid var(--color-border-subtle);
        padding-top: var(--space-xs);
      }

      .btn-bonus-token {
        width: 100%;
        min-height: 38px;
        border-radius: var(--radius-md);
        background: rgba(245, 158, 11, 0.12);
        border: 1px solid #f59e0b;
        color: #f59e0b;
        font-size: 12px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-bonus-token:hover,
      .btn-bonus-token.selected-action {
        background: rgba(245, 158, 11, 0.3);
        border-color: #f59e0b;
        color: #f59e0b;
        box-shadow: 0 0 12px rgba(245, 158, 11, 0.35);
      }

      .btn-bonus-token:hover {
        background: #f59e0b;
        color: #ffffff;
      }

      .revealed-footer-actions {
        display: flex;
        gap: var(--space-xs);
      }

      .btn-next-digital-track {
        flex: 1;
        min-height: 44px;
        border-radius: var(--radius-md);
        background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
        border: none;
        color: #ffffff;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        transition: all 0.2s ease;
      }

      .btn-next-digital-track:hover {
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
        transform: translateY(-1px);
      }

      .btn-next-track {
        flex: 1;
        min-height: 44px;
        border-radius: var(--radius-md);
        background: #ec4899;
        border: none;
        color: #ffffff;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
      }

      .btn-done-dj {
        min-width: 120px;
        min-height: 44px;
        border-radius: var(--radius-md);
        background: var(--color-surface);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        font-weight: 700;
        cursor: pointer;
      }

      /* MODAL DE CONFIGURACIÓN DE MÚSICA */
      .music-settings-dialog {
        background: var(--color-surface-container);
        border: 1px solid rgba(236, 72, 153, 0.4);
        border-radius: var(--radius-xl);
        max-width: 520px;
        width: 100%;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
      }

      :host-context([data-theme='light']) .music-settings-dialog {
        background: #ffffff;
      }

      .music-settings-header {
        padding: var(--space-md);
        border-bottom: 1px solid var(--color-border-subtle);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .music-settings-title-group {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
      }

      .music-settings-icon {
        font-size: 28px;
        color: #ec4899;
      }

      .music-settings-title-group h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .music-settings-title-group p {
        margin: 2px 0 0;
        font-size: 11px;
        color: var(--color-text-muted);
      }

      .music-settings-body {
        padding: var(--space-md);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
      }

      .provider-choice-card {
        background: var(--color-surface);
        border: 2px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        padding: var(--space-md);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .provider-choice-card:hover {
        border-color: rgba(236, 72, 153, 0.6);
      }

      .provider-choice-card.selected {
        border-color: #ec4899;
        background: rgba(236, 72, 153, 0.06);
      }

      .choice-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }

      .choice-brand {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .brand-badge {
        font-size: 14px;
        font-weight: 800;
      }

      .itunes-badge {
        color: #fa2d48;
      }

      .spotify-badge {
        color: #10b981;
      }

      .recommended-tag {
        font-size: 10px;
        padding: 2px 8px;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid #10b981;
        color: #10b981;
        border-radius: var(--radius-full);
        font-weight: 800;
      }

      .radio-check {
        font-size: 22px;
        color: #ec4899;
      }

      .choice-desc {
        margin: 0;
        font-size: 12px;
        line-height: 1.4;
        color: var(--color-text-secondary);
      }

      .spotify-account-box {
        margin-top: var(--space-sm);
        padding-top: var(--space-sm);
        border-top: 1px dashed var(--color-border-subtle);
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
      }

      .spotify-box-title {
        font-size: 11px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      .spotify-tier-selector {
        display: flex;
        gap: 6px;
      }

      .tier-pill {
        flex: 1;
        padding: 6px 10px;
        border-radius: var(--radius-md);
        background: var(--color-surface-container);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-secondary);
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }

      .tier-pill.active {
        background: rgba(30, 215, 96, 0.2);
        border-color: #10b981;
        color: #10b981;
        font-weight: 800;
      }

      .spotify-user-input-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .input-tiny-label {
        font-size: 10px;
        color: var(--color-text-muted);
      }

      .spotify-user-input-row {
        display: flex;
        gap: 6px;
      }

      .spotify-user-input {
        flex: 1;
        height: 38px;
        border-radius: var(--radius-md);
        background: var(--color-surface-container);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        padding: 0 10px;
        font-size: 12px;
      }

      .btn-link-spotify {
        padding: 0 14px;
        height: 38px;
        border-radius: var(--radius-md);
        background: #1ed760;
        border: none;
        color: #000000;
        font-weight: 800;
        font-size: 12px;
        cursor: pointer;
      }

      .linked-success-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: rgba(30, 215, 96, 0.12);
        border: 1px solid rgba(30, 215, 96, 0.3);
        border-radius: var(--radius-sm);
        font-size: 11px;
        color: #10b981;
      }

      .btn-test-spotify {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: var(--radius-md);
        background: transparent;
        border: 1px solid var(--color-border-default);
        color: var(--color-text-secondary);
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }

      /* Carta No Mapeada / Búsqueda Manual */
      .unmapped-card-box {
        background: var(--color-surface);
        border: 1px dashed rgba(245, 158, 11, 0.5);
        border-radius: var(--radius-lg);
        padding: var(--space-md);
        margin-bottom: var(--space-md);
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
      }

      .unmapped-badge-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-xs);
      }

      .unmapped-badge {
        font-size: 13px;
        font-weight: 800;
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.12);
        padding: 3px 8px;
        border-radius: var(--radius-full);
      }

      .unmapped-tag {
        font-size: 11px;
        color: var(--color-text-secondary);
      }

      .unmapped-desc {
        font-size: 12px;
        color: var(--color-text-secondary);
        line-height: 1.4;
        margin: 0;
      }

      .unmapped-input-row {
        display: flex;
        gap: var(--space-xs);
      }

      .unmapped-secondary-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-xs);
        margin-top: 4px;
      }

      .link-open-card-web {
        font-size: 11px;
        color: var(--color-text-secondary);
        text-decoration: underline;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .btn-rescan-card {
        background: transparent;
        border: none;
        color: var(--color-primary);
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      /* Spotify Hero Button */
      .spotify-hero-card {
        width: 100%;
        margin-bottom: var(--space-xs);
      }

      .btn-hero-spotify-play {
        width: 100%;
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: 10px 14px;
        border-radius: var(--radius-md);
        background: #1ed760;
        color: #000000;
        border: none;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(30, 215, 96, 0.35);
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease;
      }

      .btn-hero-spotify-play:active {
        transform: scale(0.98);
      }

      .spotify-circle-icon {
        font-size: 16px;
        background: #000000;
        color: #1ed760;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .spotify-btn-text {
        display: flex;
        flex-direction: column;
        text-align: left;
        flex: 1;
      }

      .spotify-btn-text strong {
        font-size: 13px;
        font-weight: 800;
        color: #000000;
      }

      .spotify-btn-text span {
        font-size: 10px;
        color: rgba(0, 0, 0, 0.7);
        font-weight: 600;
      }

      /* iTunes Hero Button */
      .itunes-hero-play-container {
        width: 100%;
        margin-bottom: var(--space-xs);
      }

      .btn-hero-itunes-play {
        width: 100%;
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: 10px 14px;
        border-radius: var(--radius-md);
        background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
        color: #ffffff;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(236, 72, 153, 0.35);
        transition: transform 0.15s ease;
      }

      .btn-hero-itunes-play:active {
        transform: scale(0.98);
      }

      .hero-play-icon {
        font-size: 30px;
        flex-shrink: 0;
      }

      .hero-play-text {
        display: flex;
        flex-direction: column;
        text-align: left;
        flex: 1;
      }

      .hero-play-text strong {
        font-size: 13px;
        font-weight: 800;
      }

      .hero-play-text span {
        font-size: 10px;
        opacity: 0.9;
      }

      .card-id-pill {
        background: rgba(236, 72, 153, 0.15);
        color: #ec4899;
        padding: 2px 8px;
        border-radius: var(--radius-full);
        font-size: 11px;
        font-weight: 800;
        margin-left: auto;
      }

      /* Country Edition & Auto-Redirect Settings */
      .settings-edition-section {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        margin-top: var(--space-sm);
        padding-top: var(--space-sm);
        border-top: 1px solid var(--color-border-subtle);
      }

      .settings-subheading {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .edition-pills-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .country-edition-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 10px;
        border-radius: var(--radius-full);
        background: var(--color-surface);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-primary);
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .country-edition-pill.active {
        background: rgba(236, 72, 153, 0.15);
        border-color: #ec4899;
        color: #ec4899;
      }

      .settings-sub-hint {
        font-size: 10px;
        color: var(--color-text-tertiary);
        margin: 0;
      }

      .toggle-setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-sm);
        padding: var(--space-xs) 0;
        cursor: pointer;
        margin-top: 4px;
      }

      .toggle-setting-text {
        display: flex;
        flex-direction: column;
      }

      .toggle-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-primary);
      }

      .toggle-desc {
        font-size: 10px;
        color: var(--color-text-secondary);
      }

      .toggle-switch-icon {
        font-size: 32px;
        color: var(--color-text-tertiary);
        transition: color 0.2s ease;
      }

      .toggle-switch-icon.enabled {
        color: #1ed760;
      }

      .music-settings-footer {
        padding: var(--space-sm) var(--space-md);
        border-top: 1px solid var(--color-border-subtle);
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
})
export class HitsterScorerComponent implements OnDestroy {
  match = input.required<MatchRecord<HitsterConfig, HitsterRoundInput>>();
  private matchManager = inject(MatchManagerService);
  private registry = inject(GameRegistryService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private engine = new HitsterEngine();

  readonly Math = Math;
  readonly gameTheme = computed(() => this.registry.getGame(this.match().gameId)?.metadata?.theme);
  readonly quickRules = HITSTER_RULES.content.es.summary;

  @ViewChild('videoElement') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('itunesAudio') itunesAudioRef?: ElementRef<HTMLAudioElement>;

  // Estado del flujo de juego
  showRulesModal = signal(false);
  showAbandonConfirmModal = signal(false);
  showDjModal = signal(false);
  showMusicSettingsModal = signal(false);
  showDeckSelectModal = signal(false);
  viewingRound = signal(1);
  draftInputs = signal<Record<string, HitsterRoundInput>>({});

  // Estado de resolución del turno actual dentro del modal DJ
  turnResolutionChosen = signal<boolean>(false);
  placementOutcome = signal<'success' | 'fail' | null>(null);
  rivalOutcomes = signal<Record<string, 'win' | 'lose'>>({});
  bonusTokenAwarded = signal<boolean>(false);

  // Modal de edición y adición manual de cartas a la línea de tiempo
  showCardEditModal = signal(false);
  editingPlayerId = signal('');
  editingCard = signal<HitsterTimelineCard | null>(null);
  editFormYear = signal(2000);
  editFormTitle = signal('');
  editFormArtist = signal('');
  isNewCard = signal(false);

  // Configuración del juego
  targetCards = computed(() => this.match().config?.targetCards ?? 10);
  startingTokens = computed(() => this.match().config?.startingTokens ?? 3);
  gameMode = computed(() => this.match().config?.gameMode ?? 'original');
  timerDefaultDuration = computed(() => this.match().config?.timerSeconds ?? 30);

  // Configuración de Proveedor Musical (Persistente en LocalStorage)
  musicProvider = signal<MusicProvider>('itunes');
  spotifyTier = signal<SpotifyTier>('free');
  spotifyUser = signal<string>('');
  tempSpotifyUser = '';
  isSpotifyLinked = signal<boolean>(false);

  modeLabel = computed(() => {
    switch (this.gameMode()) {
      case 'pro':
        return 'Modo Pro';
      case 'expert':
        return 'Modo Expert';
      case 'cooperative':
        return 'Cooperativo';
      default:
        return 'Modo Original';
    }
  });

  // Hitos de cartas para la barra visual (ej. 1 a 10)
  cardSlots = computed(() => {
    const total = this.targetCards();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  currentMatchRound = computed(() => this.match().currentRound);
  isEditingPastRound = computed(() => this.viewingRound() < this.currentMatchRound());

  // Rondas disponibles para navegación
  roundNumbers = computed(() => {
    const current = this.currentMatchRound();
    const count = Math.max(current, this.match().rounds.length + 1);
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  // DJ / Turno actual
  currentDjPlayer = computed(() => {
    const players = this.match().players;
    if (players.length === 0) return null;
    const roundIdx = (this.viewingRound() - 1) % players.length;
    return players[roundIdx] || players[0];
  });

  // Estado del DJ Scanner y Modo Digital
  activeGuesserPlayerId = signal<string>('');
  isDigitalMode = signal<boolean>(false);
  digitalDeck = signal<'latino' | 'us' | 'es' | 'all'>('latino');
  usedCardIds = signal<string[]>([]);
  cameraError = signal<string>('');
  private cameraStream?: MediaStream;
  private isScanning = false;
  private scanAnimationId?: number;
  private scanCanvas: HTMLCanvasElement = document.createElement('canvas');

  // Estado de Reproducción de Canción
  activeTrack = signal<SpotifyTrackInfo | null>(null);
  sanitizedEmbedUrl = signal<SafeResourceUrl | null>(null);
  isRevealed = signal(false);
  revealedTrack = signal<RevealedTrackDetails | null>(null);
  isAudioLoading = signal(false);
  currentItunesPreviewUrl = signal<string>('');

  // Base de datos de cartas Hitster y configuración regional
  cardsDatabase = signal<Record<string, Record<string, string>>>({});
  selectedCardCountry = signal<string>('us');
  autoRedirectSpotify = signal<boolean>(true);
  unmappedCardDetected = signal<{ cardId: string; country: string; url: string } | null>(null);
  fallbackSearchText = '';

  readonly countryOptions = [
    { code: 'latino', label: 'Hitster Latino (308 éxitos)', flag: '🇲🇽' },
    { code: 'us', label: 'Hitster Original US (336 éxitos)', flag: '🇺🇸' },
    { code: 'es', label: 'Hitster España (420 éxitos)', flag: '🇪🇸' },
    { code: 'all', label: 'Todas las Barajas Combinadas', flag: '🌍' },
    { code: 'de', label: 'Alemania', flag: '🇩🇪' },
    { code: 'fr', label: 'Francia', flag: '🇫🇷' },
    { code: 'it', label: 'Italia', flag: '🇮🇹' },
  ];

  digitalDeckName = computed(() => {
    switch (this.digitalDeck()) {
      case 'latino':
        return 'Hitster Latino (308 éxitos)';
      case 'us':
        return 'Hitster Original US (336 éxitos)';
      case 'es':
        return 'Hitster España (420 éxitos)';
      case 'all':
        return 'Todas las Barajas (1,000+ canciones)';
      default:
        return 'Hitster Latino';
    }
  });

  activeDeckCards = computed<Record<string, string>>(() => {
    const deck = this.digitalDeck();
    const db = this.cardsDatabase();

    const getDeckMap = (targetDeck: 'latino' | 'us' | 'es'): Record<string, string> => {
      if (targetDeck === 'latino') {
        return (
          db['latino'] ||
          db['aaaa0102'] ||
          db['mx'] ||
          db['aaaa0053'] ||
          HITSTER_CORE_CARDS['latino'] ||
          {}
        );
      }
      if (targetDeck === 'us') {
        return db['aaaa0023'] || db['us'] || HITSTER_CORE_CARDS['us'] || {};
      }
      return db['es'] || HITSTER_CORE_CARDS['es'] || {};
    };

    if (deck === 'all') {
      const combined: Record<string, string> = {};
      const decks: ('latino' | 'us' | 'es')[] = ['latino', 'us', 'es'];
      for (const d of decks) {
        const dMap = getDeckMap(d);
        for (const [k, v] of Object.entries(dMap)) {
          if (k.length === 5 && /^[0-9]+$/.test(k)) {
            combined[`${d}_${k}`] = v;
          } else if (!/^[0-9]+$/.test(k)) {
            combined[`${d}_${k}`] = v;
          }
        }
      }
      return combined;
    }

    return getDeckMap(deck);
  });

  totalDeckCards = computed(() => {
    const cards = this.activeDeckCards();
    const count = Object.keys(cards).length;
    if (count > 0) return count;
    if (this.digitalDeck() === 'latino') return 308;
    if (this.digitalDeck() === 'us') return 336;
    if (this.digitalDeck() === 'es') return 420;
    return 1064;
  });

  remainingCardsCount = computed(() => {
    const total = this.totalDeckCards();
    const used = this.usedCardIds().length;
    return Math.max(0, total - used);
  });

  // Temporizador de 30 segundos
  timerSecondsLeft = signal(30);
  isTimerRunning = signal(false);
  isPlaying = signal(false);
  private timerIntervalId?: any;

  effectiveActiveGuesserId = computed(() => {
    const id = this.activeGuesserPlayerId();
    if (id) return id;
    const dj = this.currentDjPlayer();
    if (dj) return dj.id;
    return this.match().players[0]?.id || '';
  });

  activeGuesserName = computed(() => {
    const id = this.effectiveActiveGuesserId();
    const p = this.match().players.find((pl) => pl.id === id);
    return p ? p.name : 'el jugador';
  });

  rivalPlayers = computed(() => {
    const activeId = this.effectiveActiveGuesserId();
    return this.match().players.filter((p) => p.id !== activeId);
  });

  // Acumulados y rankings en vivo
  cumulativeStats = computed(() => {
    const m = this.match();
    const allInputs = m.rounds.map((r) => r.data);
    const pids = m.players.map((p) => p.id);
    return this.engine.calculateCumulativeState(allInputs, pids, m.config);
  });

  rankedPlayers = computed(() => {
    const m = this.match();
    const stats = this.cumulativeStats();
    const cardsMap: Record<string, number> = {};
    const tokensMap: Record<string, number> = {};

    for (const p of m.players) {
      cardsMap[p.id] = stats[p.id]?.totalCards ?? 0;
      tokensMap[p.id] = stats[p.id]?.totalTokens ?? this.startingTokens();
    }

    const ranking = this.engine.rankPlayers(cardsMap, tokensMap, this.targetCards());
    return ranking.map((item) => {
      const p = m.players.find((pl) => pl.id === item.playerId);
      return {
        id: item.playerId,
        name: p?.name || item.playerId,
        totalCards: item.totalCards,
        totalTokens: item.totalTokens,
        rank: item.rank,
        isWinner: item.isWinner,
      };
    });
  });

  currentRankings = computed(() => {
    const map: Record<string, number> = {};
    for (const r of this.rankedPlayers()) {
      map[r.id] = r.rank;
    }
    return map;
  });

  roundRows = computed(() => {
    return this.match().rounds.map((r) => ({
      roundNumber: r.roundNumber,
      inputs: r.data,
    }));
  });

  // Líneas de tiempo cronológicas de cartas para cada jugador
  playerTimelines = computed<Record<string, HitsterTimelineCard[]>>(() => {
    const m = this.match();
    const result: Record<string, HitsterTimelineCard[]> = {};

    for (const p of m.players) {
      result[p.id] = [];
    }

    // 1. Cartas de rondas completadas y confirmadas
    for (const r of m.rounds) {
      for (const [pid, input] of Object.entries(r.data)) {
        if (!result[pid]) result[pid] = [];
        if (input.wonCardsDetails && Array.isArray(input.wonCardsDetails)) {
          result[pid].push(...input.wonCardsDetails);
        } else if (input.cardsWon && input.cardsWon > 0) {
          for (let i = 0; i < input.cardsWon; i++) {
            result[pid].push({
              id: `${r.roundNumber}_${pid}_${i}`,
              title: `Canción Ronda ${r.roundNumber}`,
              artist: 'Hitster',
              year: 1980 + ((r.roundNumber * 7 + i * 11) % 43),
            });
          }
        }
      }
    }

    // 2. Cartas en el borrador de la ronda actual
    if (this.viewingRound() === this.currentMatchRound()) {
      const draft = this.draftInputs();
      for (const [pid, input] of Object.entries(draft)) {
        if (!result[pid]) result[pid] = [];
        if (input.wonCardsDetails && Array.isArray(input.wonCardsDetails)) {
          result[pid].push(...input.wonCardsDetails);
        }
      }
    }

    // 3. Ordenar cronológicamente cada línea de tiempo de menor a mayor año
    for (const pid of Object.keys(result)) {
      result[pid].sort((a, b) => a.year - b.year);
    }

    return result;
  });

  getTimelineCardsForPlayer(playerId: string): HitsterTimelineCard[] {
    return this.playerTimelines()[playerId] || [];
  }

  getRemainingSlotsForPlayer(playerId: string): number[] {
    const currentCount = this.getTimelineCardsForPlayer(playerId).length;
    const target = this.targetCards();
    const remaining = Math.max(0, target - currentCount);
    return Array.from({ length: remaining }, (_, i) => currentCount + i + 1);
  }

  getPlayerNameById(playerId: string): string {
    const p = this.match().players.find((pl) => pl.id === playerId);
    return p ? p.name : 'Jugador';
  }

  constructor() {
    this.loadSavedMusicSettings();
    this.loadHitsterCardsDatabase();

    effect(
      () => {
        const m = this.match();
        this.viewingRound.set(m.currentRound);
        this.initDraftForRound(m.currentRound);

        // Sincronizar jugador activo del turno según la ronda actual
        if (m.players && m.players.length > 0) {
          const roundIdx = (m.currentRound - 1) % m.players.length;
          const turnPlayer = m.players[roundIdx] || m.players[0];
          if (!this.showDjModal() || !this.activeGuesserPlayerId()) {
            this.activeGuesserPlayerId.set(turnPlayer.id);
          }
        }

        // Sincronizar de forma reactiva la configuración de Modo Digital de la partida
        if (m.config?.isDigitalMode !== undefined) {
          this.isDigitalMode.set(m.config.isDigitalMode);
        }
        if (m.config?.digitalDeckEdition) {
          const deck = m.config.digitalDeckEdition;
          this.digitalDeck.set(deck);
          this.selectedCardCountry.set(deck);
        }

        try {
          const savedUsed = localStorage.getItem('hitster_used_cards_' + m.id);
          if (savedUsed) {
            const parsed = JSON.parse(savedUsed);
            if (Array.isArray(parsed)) {
              this.usedCardIds.set(parsed);
            }
          }
        } catch {}
      },
      { allowSignalWrites: true },
    );
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.hidden) {
      this.stopItunesAudio();
      this.pauseTimer();
    }
  }

  ngOnDestroy(): void {
    this.showDjModal.set(false);
    this.stopCameraScanner();
    this.stopTimer();
    this.stopItunesAudio();
  }

  private loadSavedMusicSettings(): void {
    try {
      const browserLang = navigator.language?.toLowerCase() || '';
      const defaultCountry = browserLang.startsWith('es') ? 'latino' : 'us';
      const rawCountry = localStorage.getItem('hitster_card_country');
      const savedCountry =
        rawCountry === 'mx' ? 'latino' : rawCountry === 'global' ? 'all' : rawCountry;
      this.selectedCardCountry.set(savedCountry || defaultCountry);

      const savedAutoRedirect = localStorage.getItem('hitster_auto_redirect_spotify');
      if (savedAutoRedirect !== null) {
        this.autoRedirectSpotify.set(savedAutoRedirect === 'true');
      }

      const savedProvider = localStorage.getItem('hitster_music_provider');
      if (savedProvider === 'spotify' || savedProvider === 'itunes') {
        this.musicProvider.set(savedProvider);
      } else {
        // En iOS / web móvil, Apple Music / iTunes es la opción predeterminada más fluida
        this.musicProvider.set('itunes');
      }

      const savedTier = localStorage.getItem('hitster_spotify_tier');
      if (savedTier === 'premium' || savedTier === 'free') {
        this.spotifyTier.set(savedTier);
      }

      const savedUser = localStorage.getItem('hitster_spotify_user');
      if (savedUser) {
        this.spotifyUser.set(savedUser);
        this.tempSpotifyUser = savedUser;
        this.isSpotifyLinked.set(true);
      }

      // Fallbacks locales para Modo Digital (se sobreescriben por effect() si la partida tiene config)
      const savedDigital = localStorage.getItem('hitster_digital_mode');
      if (savedDigital !== null) {
        this.isDigitalMode.set(savedDigital === 'true');
      }

      const savedDeck = localStorage.getItem('hitster_digital_deck') as
        'latino' | 'us' | 'es' | 'all' | null;
      if (savedDeck && ['latino', 'us', 'es', 'all'].includes(savedDeck)) {
        this.digitalDeck.set(savedDeck);
      }
    } catch {}
  }

  private async loadHitsterCardsDatabase(): Promise<void> {
    try {
      const res = await fetch('assets/games/hitster/cards-db.json');
      if (res.ok) {
        const db = await res.json();
        this.cardsDatabase.set(db);
      }
    } catch {}
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
        const initialDraft: Record<string, HitsterRoundInput> = {};
        for (const p of m.players) {
          initialDraft[p.id] = { cardsWon: 0, tokensDelta: 0 };
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

  getDraftForPlayer(playerId: string): HitsterRoundInput {
    return this.draftInputs()[playerId] || { cardsWon: 0, tokensDelta: 0 };
  }

  getCumulativeStatsForPlayer(playerId: string): { totalCards: number; totalTokens: number } {
    const stats = this.cumulativeStats()[playerId];
    const draft = this.getDraftForPlayer(playerId);
    const prevCards = stats?.totalCards ?? 0;
    const prevTokens = stats?.totalTokens ?? this.startingTokens();

    return {
      totalCards: prevCards + (draft.cardsWon ?? 0),
      totalTokens: Math.max(0, prevTokens + (draft.tokensDelta ?? 0)),
    };
  }

  getPlayerAvatarColor(idx: number): string {
    const colors = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6'];
    return colors[idx % colors.length];
  }

  // Modificación de Cartas y Fichas en el Draft
  adjustCardsWon(playerId: string, delta: number): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { cardsWon: 0, tokensDelta: 0 };
      const newCount = Math.max(0, (current.cardsWon ?? 0) + delta);
      let wonCards = current.wonCardsDetails ? [...current.wonCardsDetails] : [];

      if (delta > 0) {
        wonCards.push({
          id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          title: 'Carta Hitster',
          artist: 'Artista',
          year: 2000,
        });
      } else if (delta < 0 && wonCards.length > 0) {
        wonCards.pop();
      }

      const updated = {
        ...prev,
        [playerId]: {
          ...current,
          cardsWon: newCount,
          wonCardsDetails: wonCards,
        },
      };
      this.syncDraft(updated);
      return updated;
    });
  }

  adjustTokensDelta(playerId: string, delta: number): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { cardsWon: 0, tokensDelta: 0 };
      const updated = {
        ...prev,
        [playerId]: {
          ...current,
          tokensDelta: (current.tokensDelta ?? 0) + delta,
        },
      };
      this.syncDraft(updated);
      return updated;
    });
  }

  // Acciones Rápidas con Fichas
  quickChallengeAction(playerId: string): void {
    this.adjustTokensDelta(playerId, -1);
  }

  quickSkipAction(playerId: string): void {
    this.adjustTokensDelta(playerId, -1);
  }

  quickBuyCardAction(playerId: string): void {
    this.adjustCardsWon(playerId, 1);
    this.adjustTokensDelta(playerId, -3);
  }

  private syncDraft(draft: Record<string, HitsterRoundInput>): void {
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

    const updatedMatch =
      (this.matchManager.currentMatch() as MatchRecord<HitsterConfig, HitsterRoundInput>) ||
      this.match();

    if (updatedMatch.status !== 'completed') {
      const nextRound = updatedMatch.currentRound;
      this.viewingRound.set(nextRound);
      this.initDraftForRound(nextRound);

      const players = updatedMatch.players;
      if (players && players.length > 0) {
        const nextIdx = (nextRound - 1) % players.length;
        const nextPlayer = players[nextIdx] || players[0];
        this.activeGuesserPlayerId.set(nextPlayer.id);
      }
    }
  }

  async commitPastRound(): Promise<void> {
    const roundNum = this.viewingRound();
    await this.matchManager.rollbackToRound(roundNum);
  }

  // Métodos del Modal de Cartas de la Línea de Tiempo
  openAddCardModal(playerId: string): void {
    this.editingPlayerId.set(playerId);
    this.editingCard.set(null);
    this.isNewCard.set(true);
    this.editFormYear.set(2000);
    this.editFormTitle.set('');
    this.editFormArtist.set('');
    this.showCardEditModal.set(true);
  }

  openEditCardModal(playerId: string, card: HitsterTimelineCard): void {
    this.editingPlayerId.set(playerId);
    this.editingCard.set(card);
    this.isNewCard.set(false);
    this.editFormYear.set(card.year || 2000);
    this.editFormTitle.set(card.title || '');
    this.editFormArtist.set(card.artist || '');
    this.showCardEditModal.set(true);
  }

  closeCardEditModal(): void {
    this.showCardEditModal.set(false);
    this.editingCard.set(null);
  }

  adjustEditYear(delta: number): void {
    this.editFormYear.update((y) => Math.min(2030, Math.max(1900, y + delta)));
  }

  onYearInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseInt(input.value, 10);
    if (!isNaN(val)) {
      this.editFormYear.set(val);
    }
  }

  onTitleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.editFormTitle.set(input.value);
  }

  onArtistInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.editFormArtist.set(input.value);
  }

  saveTimelineCardForm(): void {
    const pid = this.editingPlayerId();
    if (!pid) return;

    const year = this.editFormYear();
    const title = this.editFormTitle().trim() || 'Canción Hitster';
    const artist = this.editFormArtist().trim() || 'Artista';

    if (this.isNewCard()) {
      const newCard: HitsterTimelineCard = {
        id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        title,
        artist,
        year,
      };

      this.draftInputs.update((prev) => {
        const current = prev[pid] || { cardsWon: 0, tokensDelta: 0 };
        const wonCards = current.wonCardsDetails
          ? [...current.wonCardsDetails, newCard]
          : [newCard];
        const updated = {
          ...prev,
          [pid]: {
            ...current,
            cardsWon: (current.cardsWon ?? 0) + 1,
            wonCardsDetails: wonCards,
          },
        };
        this.syncDraft(updated);
        return updated;
      });
    } else {
      const card = this.editingCard();
      if (!card) return;

      this.draftInputs.update((prev) => {
        const current = prev[pid] || { cardsWon: 0, tokensDelta: 0 };
        if (current.wonCardsDetails) {
          const idx = current.wonCardsDetails.findIndex((c) => c.id === card.id);
          if (idx !== -1) {
            const updatedList = [...current.wonCardsDetails];
            updatedList[idx] = {
              ...updatedList[idx],
              title,
              artist,
              year,
            };
            const updated = {
              ...prev,
              [pid]: {
                ...current,
                wonCardsDetails: updatedList,
              },
            };
            this.syncDraft(updated);
            return updated;
          }
        }
        return prev;
      });

      card.title = title;
      card.artist = artist;
      card.year = year;
    }

    this.closeCardEditModal();
  }

  deleteEditingCard(): void {
    const card = this.editingCard();
    const pid = this.editingPlayerId();
    if (card && pid) {
      this.deleteTimelineCard(pid, card.id);
    }
    this.closeCardEditModal();
  }

  deleteTimelineCard(playerId: string, cardId: string): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { cardsWon: 0, tokensDelta: 0 };
      if (current.wonCardsDetails) {
        const updatedCards = current.wonCardsDetails.filter((c) => c.id !== cardId);
        const updated = {
          ...prev,
          [playerId]: {
            ...current,
            cardsWon: Math.max(0, updatedCards.length),
            wonCardsDetails: updatedCards,
          },
        };
        this.syncDraft(updated);
        return updated;
      }
      return prev;
    });
  }

  // DJ Modal & Scanner
  openDjScannerModal(): void {
    const dj = this.currentDjPlayer();
    if (dj) {
      this.activeGuesserPlayerId.set(dj.id);
    } else if (this.match().players.length > 0) {
      this.activeGuesserPlayerId.set(this.match().players[0].id);
    }
    this.showDjModal.set(true);
    if (!this.isDigitalMode()) {
      setTimeout(() => this.startCameraScanner(), 300);
    }
  }

  async closeDjModal(): Promise<void> {
    this.showDjModal.set(false);
    this.stopCameraScanner();
    this.stopTimer();
    this.stopItunesAudio();
    this.resetDjTrackState();

    if (this.turnResolutionChosen()) {
      await this.confirmCurrentRound();
      this.turnResolutionChosen.set(false);
      this.placementOutcome.set(null);
      this.rivalOutcomes.set({});
      this.bonusTokenAwarded.set(false);
    }
  }

  setActiveGuesserPlayer(id: string): void {
    this.activeGuesserPlayerId.set(id);
  }

  toggleDigitalMode(): void {
    this.isDigitalMode.update((v) => {
      const next = !v;
      try {
        localStorage.setItem('hitster_digital_mode', String(next));
      } catch {}
      return next;
    });
  }

  openDeckSelectModal(): void {
    this.showDeckSelectModal.set(true);
  }

  closeDeckSelectModal(): void {
    this.showDeckSelectModal.set(false);
  }

  confirmDeckSelection(): void {
    this.isDigitalMode.set(true);
    this.selectedCardCountry.set(this.digitalDeck());
    try {
      localStorage.setItem('hitster_digital_mode', 'true');
      localStorage.setItem('hitster_digital_deck', this.digitalDeck());
      localStorage.setItem('hitster_card_country', this.digitalDeck());
    } catch {}
    this.closeDeckSelectModal();
  }

  selectDeckEdition(deck: 'latino' | 'us' | 'es' | 'all'): void {
    this.setDigitalDeck(deck);
    this.isDigitalMode.set(true);
    try {
      localStorage.setItem('hitster_digital_mode', 'true');
    } catch {}
    this.closeDeckSelectModal();
  }

  setDigitalDeck(deck: 'latino' | 'us' | 'es' | 'all'): void {
    this.digitalDeck.set(deck);
    this.selectedCardCountry.set(deck);
    try {
      localStorage.setItem('hitster_digital_deck', deck);
      localStorage.setItem('hitster_card_country', deck);
    } catch {}
  }

  resetUsedDeck(): void {
    this.usedCardIds.set([]);
    try {
      localStorage.removeItem('hitster_used_cards_' + this.match().id);
    } catch {}
  }

  async drawDigitalCard(): Promise<void> {
    const cards = this.activeDeckCards();
    const drawn = drawRandomCardFromDeck(cards, this.usedCardIds());
    if (!drawn) {
      alert(
        '¡Todas las cartas de esta baraja ya han sido jugadas! Puedes reiniciar el mazo de cartas usadas.',
      );
      return;
    }

    this.usedCardIds.update((prev) => {
      const next = [...prev, drawn.cardId];
      try {
        localStorage.setItem('hitster_used_cards_' + this.match().id, JSON.stringify(next));
      } catch {}
      return next;
    });

    let displayCardNumber = drawn.cardId;
    let deckEditionLabel = this.digitalDeckName();

    if (drawn.cardId.startsWith('latino_')) {
      displayCardNumber = drawn.cardId.replace('latino_', '');
      deckEditionLabel = 'Hitster Latino';
    } else if (drawn.cardId.startsWith('us_')) {
      displayCardNumber = drawn.cardId.replace('us_', '');
      deckEditionLabel = 'Hitster US';
    } else if (drawn.cardId.startsWith('es_')) {
      displayCardNumber = drawn.cardId.replace('es_', '');
      deckEditionLabel = 'Hitster España';
    }

    const trackInfo: SpotifyTrackInfo = {
      trackId: drawn.trackId,
      url: `https://open.spotify.com/track/${drawn.trackId}`,
      embedUrl: `https://open.spotify.com/embed/track/${drawn.trackId}?utm_source=generator`,
      appUri: `spotify:track:${drawn.trackId}`,
      cardId: displayCardNumber,
      country: this.digitalDeck(),
      isHitsterCard: true,
    };

    if (this.musicProvider() === 'spotify' && this.autoRedirectSpotify()) {
      this.openSpotifyApp(trackInfo);
    }

    await this.loadTrackForCurrentProvider(trackInfo, {
      title: 'Cargando título...',
      artist: 'Cargando artista...',
      year: `Carta Digital #${displayCardNumber} (${deckEditionLabel})`,
    });
  }

  async drawNextDigitalCardForActivePlayer(): Promise<void> {
    const dj = this.currentDjPlayer();
    if (dj) {
      this.activeGuesserPlayerId.set(dj.id);
    } else if (this.match().players.length > 0) {
      this.activeGuesserPlayerId.set(this.match().players[0].id);
    }
    this.showDjModal.set(true);
    await this.drawDigitalCard();
  }

  async nextDigitalTurn(): Promise<void> {
    await this.confirmCurrentRound();
    this.turnResolutionChosen.set(false);
    this.placementOutcome.set(null);
    this.rivalOutcomes.set({});
    this.bonusTokenAwarded.set(false);

    const currentMatch =
      (this.matchManager.currentMatch() as MatchRecord<HitsterConfig, HitsterRoundInput>) ||
      this.match();

    if (currentMatch.status === 'completed') {
      this.closeDjModal();
      return;
    }
    this.resetDjTrackState();
    const nextRound = this.viewingRound();
    const players = currentMatch.players;
    if (players && players.length > 0) {
      const nextIdx = (nextRound - 1) % players.length;
      const nextPlayer = players[nextIdx] || players[0];
      this.activeGuesserPlayerId.set(nextPlayer.id);
    }
    await this.drawDigitalCard();
  }

  async nextPhysicalTurn(): Promise<void> {
    await this.confirmCurrentRound();
    this.turnResolutionChosen.set(false);
    this.placementOutcome.set(null);
    this.rivalOutcomes.set({});
    this.bonusTokenAwarded.set(false);

    const currentMatch =
      (this.matchManager.currentMatch() as MatchRecord<HitsterConfig, HitsterRoundInput>) ||
      this.match();

    if (currentMatch.status === 'completed') {
      this.closeDjModal();
      return;
    }
    this.resetDjTrackState();
    const nextRound = this.viewingRound();
    const players = currentMatch.players;
    if (players && players.length > 0) {
      const nextIdx = (nextRound - 1) % players.length;
      const nextPlayer = players[nextIdx] || players[0];
      this.activeGuesserPlayerId.set(nextPlayer.id);
    }
    setTimeout(() => this.startCameraScanner(), 200);
  }

  /**
   * Inicia el escáner de cámara asegurando compatibilidad completa con Safari en iPhone:
   * playsinline, webkit-playsinline, muted y decodificación universal mediante jsQR.
   */
  async startCameraScanner(): Promise<void> {
    this.cameraError.set('');
    this.stopCameraScanner();

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        this.cameraError.set('Acceso a la cámara no disponible en este dispositivo/navegador.');
        return;
      }

      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (this.videoRef?.nativeElement) {
        const video = this.videoRef.nativeElement;
        video.srcObject = this.cameraStream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.autoplay = true;
        await video.play();
      }

      this.startJsQrScanning();
    } catch (err: any) {
      this.cameraError.set(
        'No se pudo acceder a la cámara. Revisa los permisos o activa el Modo Digital para jugar sin cartas físicas.',
      );
    }
  }

  /**
   * Decodificador de alta precisión optimizado para las cartas físicas de Hitster:
   * 1. Las cartas de Hitster presentan códigos QR invertidos (blancos sobre fondo negro)
   *    con surcos concéntricos de colores neon estilo vinilo alrededor.
   * 2. Recorta y analiza la zona central (65%, 50%, 80%) con 'invertFirst'.
   * 3. Fallback al encuadre completo con 'attemptBoth'.
   */
  private decodeQrFromContext(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): string | null {
    if (width <= 0 || height <= 0) return null;

    // A. Recortes centrales (ROI) concéntricos para aislar el QR de los aros de vinilo
    const cropFactors = [0.65, 0.5, 0.8];
    for (const factor of cropFactors) {
      const cw = Math.floor(width * factor);
      const ch = Math.floor(height * factor);
      const sx = Math.floor((width - cw) / 2);
      const sy = Math.floor((height - ch) / 2);

      const centerData = ctx.getImageData(sx, sy, cw, ch);
      const res = jsQR(centerData.data, cw, ch, {
        inversionAttempts: 'invertFirst',
      });
      if (res && res.data && res.data.trim()) {
        return res.data.trim();
      }
    }

    // B. Fotograma completo con soporte de inversión
    const fullData = ctx.getImageData(0, 0, width, height);
    const resFull = jsQR(fullData.data, width, height, {
      inversionAttempts: 'attemptBoth',
    });
    if (resFull && resFull.data && resFull.data.trim()) {
      return resFull.data.trim();
    }

    return null;
  }

  /**
   * Bucle de escaneo continuo con jsQR leyendo cada fotograma sobre un canvas oculto.
   * Funciona instantáneamente en Safari de iPhone, Android y Desktop sin banderas experimentales.
   */
  private startJsQrScanning(): void {
    this.isScanning = true;
    let lastScanTime = 0;

    const scanLoop = (time: number) => {
      if (!this.isScanning) return;

      // Limitar a ~6 análisis por segundo para máxima fluidez y bajo consumo de batería
      if (time - lastScanTime >= 150) {
        lastScanTime = time;
        const video = this.videoRef?.nativeElement;

        if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          this.scanCanvas.width = video.videoWidth;
          this.scanCanvas.height = video.videoHeight;
          const ctx = this.scanCanvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(video, 0, 0, this.scanCanvas.width, this.scanCanvas.height);
            const decoded = this.decodeQrFromContext(
              ctx,
              this.scanCanvas.width,
              this.scanCanvas.height,
            );

            if (decoded) {
              this.isScanning = false;
              this.stopCameraScanner();
              this.triggerScanFeedback();
              this.handleScannedRawText(decoded);
              return;
            }
          }
        }
      }

      this.scanAnimationId = requestAnimationFrame(scanLoop);
    };

    this.scanAnimationId = requestAnimationFrame(scanLoop);
  }

  private stopCameraScanner(): void {
    this.isScanning = false;
    if (this.scanAnimationId) {
      cancelAnimationFrame(this.scanAnimationId);
      this.scanAnimationId = undefined;
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = undefined;
    }
  }

  private triggerScanFeedback(): void {
    try {
      if (navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
    } catch {}
  }

  /**
   * Alternativa fotográfica: procesa una foto o captura subida por el usuario
   */
  onQrImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        this.scanCanvas.width = img.width;
        this.scanCanvas.height = img.height;
        const ctx = this.scanCanvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const decoded = this.decodeQrFromContext(ctx, img.width, img.height);
          if (decoded) {
            this.triggerScanFeedback();
            this.handleScannedRawText(decoded);
          } else {
            alert(
              'No se detectó el código QR en la imagen. Asegúrate de encuadrar el código QR central dentro del visor o que la foto tenga buena luz.',
            );
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async handleScannedRawText(raw: string): Promise<void> {
    this.unmappedCardDetected.set(null);
    const trackInfo = parseSpotifyTrackUrl(raw, this.cardsDatabase(), this.selectedCardCountry());

    if (trackInfo.trackId) {
      const cardLabel = trackInfo.cardId ? `Carta #${trackInfo.cardId}` : 'Carta Hitster';

      // Redirección directa a la app de Spotify si está configurada
      if (this.musicProvider() === 'spotify' && this.autoRedirectSpotify()) {
        this.openSpotifyApp(trackInfo);
      }

      await this.loadTrackForCurrentProvider(trackInfo, {
        title: 'Cargando título...',
        artist: 'Cargando artista...',
        year: cardLabel,
      });
    } else if (trackInfo.isHitsterCard && trackInfo.cardId) {
      // Es una carta física de Hitster pero no está en la base de datos local
      this.stopCameraScanner();
      this.unmappedCardDetected.set({
        cardId: trackInfo.cardId,
        country: trackInfo.country || this.selectedCardCountry(),
        url: trackInfo.url,
      });
    } else if (trackInfo.url) {
      await this.loadTrackForCurrentProvider(trackInfo, {
        title: 'Canción Hitster',
        artist: 'Artista',
        year: 'Hitster Card',
      });
    }
  }

  /**
   * Carga y orquesta la reproducción según el servicio configurado (iTunes o Spotify)
   */
  private async loadTrackForCurrentProvider(
    info: SpotifyTrackInfo,
    fallbackDetails: RevealedTrackDetails,
  ): Promise<void> {
    this.stopCameraScanner();
    this.activeTrack.set(info);
    this.revealedTrack.set(fallbackDetails);
    this.isRevealed.set(false);

    if (info.embedUrl) {
      this.sanitizedEmbedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(info.embedUrl));
    } else {
      this.sanitizedEmbedUrl.set(null);
    }

    // 1. Obtener metadatos reales de Spotify vía oEmbed en segundo plano
    let oEmbedData: { title?: string; author_name?: string; thumbnail_url?: string } | null = null;
    if (info.url) {
      oEmbedData = await this.fetchSpotifyOEmbed(info.url);
    }

    const title = oEmbedData?.title || fallbackDetails.title;
    const artist = oEmbedData?.author_name || fallbackDetails.artist;
    const albumArt = oEmbedData?.thumbnail_url || fallbackDetails.albumArt;

    this.revealedTrack.update((prev) => ({
      ...prev,
      title,
      artist,
      albumArt,
    }));

    // 2. Si el servicio es iTunes / Apple Music, buscar y reproducir la vista previa oficial
    if (this.musicProvider() === 'itunes') {
      const query =
        title && title !== 'Cargando título...'
          ? `${artist && artist !== 'Cargando artista...' ? artist + ' ' : ''}${title}`
          : info.cardId
            ? `Carta ${info.cardId}`
            : '';
      if (query) {
        this.fetchAndPlayItunesAudio(query, {
          title,
          artist,
          albumArt,
        });
      } else {
        this.resetTimer();
        this.startTimer();
      }
    } else {
      this.resetTimer();
      this.startTimer();
    }
  }

  /**
   * Consulta iTunes Search API para reproducir audio nativo de 30 segundos
   */
  private async fetchAndPlayItunesAudio(
    query: string,
    currentDetails: RevealedTrackDetails,
  ): Promise<void> {
    this.isAudioLoading.set(true);
    try {
      const itunesResult = await searchItunesTrack(query);
      if (!this.showDjModal()) {
        this.isAudioLoading.set(false);
        this.stopItunesAudio();
        return;
      }

      if (itunesResult && itunesResult.previewUrl) {
        this.revealedTrack.update((prev) => ({
          ...prev,
          title: itunesResult.trackName || prev?.title || currentDetails.title,
          artist: itunesResult.artistName || prev?.artist || currentDetails.artist,
          year: itunesResult.year || prev?.year || currentDetails.year,
          albumArt: itunesResult.artworkUrl || prev?.albumArt || currentDetails.albumArt,
          appleMusicUrl: itunesResult.trackViewUrl,
          itunesPreviewUrl: itunesResult.previewUrl,
        }));

        this.playItunesAudioStream(itunesResult.previewUrl);
      } else {
        this.isAudioLoading.set(false);
        if (this.showDjModal()) {
          this.resetTimer();
          this.startTimer();
        }
      }
    } catch {
      this.isAudioLoading.set(false);
      if (this.showDjModal()) {
        this.resetTimer();
        this.startTimer();
      }
    }
  }

  private playItunesAudioStream(url: string): void {
    this.currentItunesPreviewUrl.set(url);
    if (!this.showDjModal()) {
      this.stopItunesAudio();
      return;
    }

    if (this.itunesAudioRef?.nativeElement) {
      const audio = this.itunesAudioRef.nativeElement;
      audio.src = url;
      audio.currentTime = 0;
      this.isAudioLoading.set(false);
      this.stopTimer();
      this.timerSecondsLeft.set(this.timerDefaultDuration());

      audio
        .play()
        .then(() => {
          if (!this.showDjModal()) {
            this.stopItunesAudio();
            return;
          }
          this.isPlaying.set(true);
          this.isTimerRunning.set(true);
          this.startCountdownInterval();
        })
        .catch(() => {
          this.isPlaying.set(false);
          this.isTimerRunning.set(false);
          this.stopTimer();
        });
    } else {
      this.isAudioLoading.set(false);
    }
  }

  private stopItunesAudio(): void {
    if (this.itunesAudioRef?.nativeElement) {
      const audio = this.itunesAudioRef.nativeElement;
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audio.load();
      } catch {}
    }
    this.isPlaying.set(false);
    this.isAudioLoading.set(false);
  }

  onItunesAudioEnded(): void {
    this.pauseTimer();
  }

  onItunesAudioError(): void {
    this.isAudioLoading.set(false);
  }

  private async fetchSpotifyOEmbed(
    url: string,
  ): Promise<{ title?: string; author_name?: string; thumbnail_url?: string } | null> {
    try {
      const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return null;
  }

  private startCountdownInterval(): void {
    this.stopTimer();
    this.timerIntervalId = setInterval(() => {
      if (!this.showDjModal()) {
        this.stopTimer();
        this.stopItunesAudio();
        return;
      }
      this.timerSecondsLeft.update((s) => {
        if (s <= 1) {
          this.stopTimer();
          this.stopItunesAudio();
          this.playTimerChime();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  // Controles de Reproducción y Temporizador
  startTimer(): void {
    if (!this.showDjModal()) {
      this.stopTimer();
      this.stopItunesAudio();
      return;
    }

    this.stopTimer();
    this.isTimerRunning.set(true);
    this.isPlaying.set(true);

    if (this.musicProvider() === 'itunes' && this.itunesAudioRef?.nativeElement) {
      const audio = this.itunesAudioRef.nativeElement;
      if (!audio.src && this.currentItunesPreviewUrl()) {
        audio.src = this.currentItunesPreviewUrl();
      }
      if (audio.src) {
        audio.play().catch(() => {
          this.isPlaying.set(false);
          this.isTimerRunning.set(false);
          this.stopTimer();
        });
      }
    }

    this.startCountdownInterval();
  }

  pauseTimer(): void {
    this.stopTimer();
    this.isTimerRunning.set(false);
    this.isPlaying.set(false);
    if (this.itunesAudioRef?.nativeElement) {
      this.itunesAudioRef.nativeElement.pause();
    }
  }

  resetTimer(): void {
    this.stopTimer();
    this.timerSecondsLeft.set(this.timerDefaultDuration());
    this.isTimerRunning.set(false);
    this.isPlaying.set(false);
    if (this.itunesAudioRef?.nativeElement) {
      this.itunesAudioRef.nativeElement.pause();
      this.itunesAudioRef.nativeElement.currentTime = 0;
    }
  }

  private stopTimer(): void {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = undefined;
    }
  }

  private playTimerChime(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
      if (navigator.vibrate) {
        navigator.vibrate(300);
      }
    } catch {}
  }

  revealTrackDetails(): void {
    this.isRevealed.set(true);
  }

  // Asignar carta a un jugador guardando detalles para la línea de tiempo cronológica
  awardCardToPlayer(playerId: string): void {
    const track = this.activeTrack();
    const revealed = this.revealedTrack();

    let yearNum = 2000;
    if (revealed?.year) {
      const match = String(revealed.year).match(/\b(19\d\d|20\d\d)\b/);
      if (match) {
        yearNum = parseInt(match[1], 10);
      }
    }

    const newCard: HitsterTimelineCard = {
      id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      cardId: track?.cardId,
      title: revealed?.title || 'Canción Hitster',
      artist: revealed?.artist || 'Artista',
      year: yearNum,
      albumArt: revealed?.albumArt,
      spotifyUrl: track?.url,
      appleMusicUrl: revealed?.appleMusicUrl,
    };

    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { cardsWon: 0, tokensDelta: 0 };
      const wonCards = current.wonCardsDetails ? [...current.wonCardsDetails, newCard] : [newCard];
      const updated = {
        ...prev,
        [playerId]: {
          ...current,
          cardsWon: (current.cardsWon ?? 0) + 1,
          wonCardsDetails: wonCards,
        },
      };
      this.syncDraft(updated);
      return updated;
    });
  }

  // Eliminar la última carta ganada por un jugador en el borrador actual (ej. al desmarcar o cambiar resolución)
  removeLastWonCardFromPlayer(playerId: string): void {
    this.draftInputs.update((prev) => {
      const current = prev[playerId] || { cardsWon: 0, tokensDelta: 0 };
      const wonCards = current.wonCardsDetails ? [...current.wonCardsDetails] : [];
      if (wonCards.length > 0) {
        wonCards.pop();
      }
      const updated = {
        ...prev,
        [playerId]: {
          ...current,
          cardsWon: Math.max(0, (current.cardsWon ?? 1) - 1),
          wonCardsDetails: wonCards,
        },
      };
      this.syncDraft(updated);
      return updated;
    });
  }

  private checkIfAnyResolutionRemaining(): void {
    const hasPlacement = this.placementOutcome() !== null;
    const hasRival = Object.keys(this.rivalOutcomes()).length > 0;
    const hasBonus = this.bonusTokenAwarded();
    this.turnResolutionChosen.set(hasPlacement || hasRival || hasBonus);
  }

  // Acciones Rápidas del DJ tras Revelar
  awardSuccessToActivePlayer(): void {
    const id = this.effectiveActiveGuesserId();
    if (!id) return;

    if (this.placementOutcome() === 'success') {
      // Toggle off al volver a pulsar
      this.removeLastWonCardFromPlayer(id);
      this.placementOutcome.set(null);
      this.checkIfAnyResolutionRemaining();
      return;
    }

    this.placementOutcome.set('success');
    this.turnResolutionChosen.set(true);
    this.awardCardToPlayer(id);
  }

  markActivePlayerFailed(): void {
    const id = this.effectiveActiveGuesserId();
    if (!id) return;

    if (this.placementOutcome() === 'fail') {
      // Toggle off al volver a pulsar
      this.placementOutcome.set(null);
      this.checkIfAnyResolutionRemaining();
      return;
    }

    if (this.placementOutcome() === 'success') {
      // Revertir la carta que se le había asignado
      this.removeLastWonCardFromPlayer(id);
    }

    this.placementOutcome.set('fail');
    this.turnResolutionChosen.set(true);
  }

  awardStolenCardToRival(rivalId: string): void {
    const current = this.rivalOutcomes()[rivalId];
    if (current === 'win') {
      // Toggle off al volver a pulsar
      this.removeLastWonCardFromPlayer(rivalId);
      this.rivalOutcomes.update((m) => {
        const next = { ...m };
        delete next[rivalId];
        return next;
      });
      this.checkIfAnyResolutionRemaining();
      return;
    }

    if (current === 'lose') {
      // Revertir penalización de ficha
      this.adjustTokensDelta(rivalId, 1);
    }

    this.awardCardToPlayer(rivalId);
    this.rivalOutcomes.update((m) => ({ ...m, [rivalId]: 'win' }));
    this.turnResolutionChosen.set(true);
  }

  penalizeRivalToken(rivalId: string): void {
    const current = this.rivalOutcomes()[rivalId];
    if (current === 'lose') {
      // Toggle off al volver a pulsar
      this.adjustTokensDelta(rivalId, 1);
      this.rivalOutcomes.update((m) => {
        const next = { ...m };
        delete next[rivalId];
        return next;
      });
      this.checkIfAnyResolutionRemaining();
      return;
    }

    if (current === 'win') {
      // Revertir carta ganada si pasa de ganar a perder
      this.removeLastWonCardFromPlayer(rivalId);
    }

    this.adjustTokensDelta(rivalId, -1);
    this.rivalOutcomes.update((m) => ({ ...m, [rivalId]: 'lose' }));
    this.turnResolutionChosen.set(true);
  }

  awardBonusTokenToActivePlayer(): void {
    const id = this.effectiveActiveGuesserId();
    if (!id) return;

    if (this.bonusTokenAwarded()) {
      // Toggle off
      this.adjustTokensDelta(id, -1);
      this.bonusTokenAwarded.set(false);
      this.checkIfAnyResolutionRemaining();
      return;
    }

    this.adjustTokensDelta(id, 1);
    this.bonusTokenAwarded.set(true);
    this.turnResolutionChosen.set(true);
  }

  private resetDjTrackState(): void {
    this.stopItunesAudio();
    this.currentItunesPreviewUrl.set('');
    this.unmappedCardDetected.set(null);
    this.fallbackSearchText = '';
    this.activeTrack.set(null);
    this.sanitizedEmbedUrl.set(null);
    this.isRevealed.set(false);
    this.revealedTrack.set(null);
    this.resetTimer();
  }

  resetDjTrack(): void {
    this.resetDjTrackState();

    // Rotar al siguiente jugador activo
    const players = this.match().players;
    const currentIdx = players.findIndex((p) => p.id === this.activeGuesserPlayerId());
    const nextIdx = (currentIdx + 1) % players.length;
    this.activeGuesserPlayerId.set(players[nextIdx].id);

    if (!this.isDigitalMode()) {
      setTimeout(() => this.startCameraScanner(), 200);
    }
  }

  openSpotifyApp(info?: SpotifyTrackInfo): void {
    const track = info || this.activeTrack();
    if (!track) return;
    const targetUri = track.appUri || track.url;
    if (!targetUri) return;

    try {
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        window.location.href = track.appUri || track.url;
      } else {
        window.open(track.url, '_blank');
      }
    } catch {
      window.open(track.url, '_blank');
    }
  }

  async searchAndPlayFallback(): Promise<void> {
    const query = this.fallbackSearchText.trim();
    if (!query) return;

    const unmapped = this.unmappedCardDetected();
    const cardYear = unmapped ? `Carta #${unmapped.cardId}` : 'Canción Hitster';
    this.unmappedCardDetected.set(null);

    if (this.musicProvider() === 'itunes') {
      const pseudoTrack: SpotifyTrackInfo = {
        url: `https://itunes.apple.com/search?term=${encodeURIComponent(query)}`,
        cardId: unmapped?.cardId,
        country: unmapped?.country,
      };
      this.activeTrack.set(pseudoTrack);
      this.revealedTrack.set({
        title: query,
        artist: 'Búsqueda en iTunes',
        year: cardYear,
      });
      this.isRevealed.set(false);
      await this.fetchAndPlayItunesAudio(query, {
        title: query,
        artist: 'Artista',
        year: cardYear,
      });
    } else {
      const encoded = encodeURIComponent(query);
      const searchTrack: SpotifyTrackInfo = {
        url: `https://open.spotify.com/search/${encoded}`,
        appUri: `spotify:search:${encoded}`,
        cardId: unmapped?.cardId,
        country: unmapped?.country,
      };
      this.activeTrack.set(searchTrack);
      this.revealedTrack.set({
        title: query,
        artist: 'Búsqueda en Spotify',
        year: cardYear,
      });
      this.isRevealed.set(false);
      if (this.autoRedirectSpotify()) {
        this.openSpotifyApp(searchTrack);
      }
      this.resetTimer();
      this.startTimer();
    }
  }

  setCardCountry(country: string): void {
    const norm = country === 'mx' ? 'latino' : country === 'global' ? 'all' : country;
    this.selectedCardCountry.set(norm);
    if (norm === 'latino' || norm === 'us' || norm === 'es' || norm === 'all') {
      this.digitalDeck.set(norm as 'latino' | 'us' | 'es' | 'all');
      try {
        localStorage.setItem('hitster_digital_deck', norm);
      } catch {}
    }
    try {
      localStorage.setItem('hitster_card_country', norm);
    } catch {}
  }

  toggleAutoRedirectSpotify(): void {
    this.autoRedirectSpotify.update((v) => {
      const next = !v;
      try {
        localStorage.setItem('hitster_auto_redirect_spotify', String(next));
      } catch {}
      return next;
    });
  }

  // Modales y Configuración Musical
  openMusicSettingsModal(): void {
    this.showMusicSettingsModal.set(true);
  }

  closeMusicSettingsModal(): void {
    this.showMusicSettingsModal.set(false);
  }

  setMusicProvider(provider: MusicProvider): void {
    this.musicProvider.set(provider);
    try {
      localStorage.setItem('hitster_music_provider', provider);
    } catch {}
  }

  setSpotifyTier(tier: SpotifyTier): void {
    this.spotifyTier.set(tier);
    try {
      localStorage.setItem('hitster_spotify_tier', tier);
    } catch {}
  }

  saveSpotifyAccount(): void {
    const user = this.tempSpotifyUser.trim();
    this.spotifyUser.set(user);
    this.isSpotifyLinked.set(true);
    try {
      localStorage.setItem('hitster_spotify_user', user);
    } catch {}
  }

  testSpotifyLink(): void {
    // Abrir un tema legendario en la app de Spotify para verificar vinculación
    window.open('spotify:track:4u7EnebtmKWzUH433cf5Qv', '_blank');
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
}
