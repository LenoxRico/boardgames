import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { GameRegistryService } from '../../core/services/game-registry.service';
import { StorageService } from '../../core/services/storage.service';
import { GameDefinition, GameRuleSection } from '../../core/models/game.interface';

@Component({
  selector: 'app-rules-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="rules-page">
      @if (selectedGame(); as game) {
        <!-- Selector de Juego y Barra Superior de Controles -->
        <div
          class="controls-card"
          [style.background-image]="game.metadata.theme?.gradient"
        >
          @if (game.metadata.theme?.bgImageUrl; as bg) {
            <div
              class="card-thematic-art"
              [style.background-image]="'url(' + bg + ')'"
            ></div>
          }
          <div class="selector-lang-row">
          <!-- Selector Dropdown de Juego -->
          <div class="game-dropdown-container">
            <select
              class="game-select-input"
              [value]="selectedGameId()"
              (change)="onGameSelect($event)"
            >
              @for (game of games(); track game.metadata.id) {
                <option [value]="game.metadata.id">
                  {{ game.metadata.emoji }} {{ game.metadata.name }}
                </option>
              }
            </select>
          </div>

          <!-- Botón de Idioma: Se muestra ÚNICAMENTE si el juego tiene ambos idiomas definidos -->
          @if (hasMultipleLanguages()) {
            <div class="lang-toggle-pill">
              <button
                type="button"
                class="lang-btn"
                [class.active-lang]="currentLang() === 'es'"
                (click)="setLanguage('es')"
              >
                ES
              </button>
              <button
                type="button"
                class="lang-btn"
                [class.active-lang]="currentLang() === 'en'"
                (click)="setLanguage('en')"
              >
                EN
              </button>
            </div>
          }
        </div>

        <!-- Indicador de Disponibilidad de Idioma -->
        <div class="rules-meta-indicator">
          <div class="meta-left">
            <span class="material-symbols-outlined indicator-icon">
              {{ hasMultipleLanguages() ? 'translate' : 'language' }}
            </span>
            <span class="indicator-text">
              {{ hasMultipleLanguages() ? 'Multilenguaje disponible (ES / EN)' : 'Idioma oficial: ' + currentLang().toUpperCase() }}
            </span>
          </div>
          <span class="version-badge">Oficial v3.2</span>
        </div>

        <!-- Segmento Conmutador: Resumen Rápido vs Reglas Completas -->
        <div class="mode-segmented-bar">
          <button
            type="button"
            class="segment-btn"
            [class.active-segment]="viewMode() === 'summary'"
            (click)="setViewMode('summary')"
          >
            <span class="material-symbols-outlined segment-icon">bolt</span>
            <span>Resumen Rápido</span>
          </button>
          <button
            type="button"
            class="segment-btn"
            [class.active-segment]="viewMode() === 'full'"
            (click)="setViewMode('full')"
          >
            <span class="material-symbols-outlined segment-icon">menu_book</span>
            <span>Reglas Completas</span>
          </button>
        </div>
      </div>
    }

    <!-- Contenido de Reglas -->
      @if (selectedGame(); as game) {
        <div class="rules-content-section">
          <!-- Chips de Secciones Rápidas -->
          <div class="section-chips-row">
            @for (sec of currentSections(); track sec.id) {
              <button
                type="button"
                class="section-chip"
                (click)="scrollToSection(sec.id)"
              >
                <span>{{ sec.title }}</span>
              </button>
            }
          </div>

          <!-- Tarjetas de Contenido de Reglas -->
          <div class="sections-list">
            @for (sec of currentSections(); track sec.id) {
              <div class="rule-card" [id]="sec.id">
                <div class="rule-header">
                  @if (sec.icon) {
                    <span class="material-symbols-outlined rule-header-icon">{{ sec.icon }}</span>
                  }
                  <h3 class="rule-title">{{ sec.title }}</h3>
                </div>

                <div class="rule-body">
                  <p class="rule-text">{{ sec.content }}</p>

                  @if (sec.highlights && sec.highlights.length > 0) {
                    <div class="highlights-row">
                      @for (hl of sec.highlights; track hl) {
                        <span class="highlight-chip">
                          <span class="material-symbols-outlined hl-icon">check_circle</span>
                          <span>{{ hl }}</span>
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- CTA al final para iniciar partida con este juego -->
          <div class="start-game-cta-box">
            <div class="cta-text">
              <h4>¿Listos para jugar a {{ game.metadata.name }}?</h4>
              <p>Inicia el marcador en vivo con cálculo automático de rondas.</p>
            </div>
            <a [routerLink]="['/match/new', game.metadata.id]" class="btn-cta-start">
              <span class="material-symbols-outlined">play_circle</span>
              <span>Abrir Marcador</span>
            </a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .rules-page {
      padding: var(--space-md);
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding-bottom: 90px;
    }

    .controls-card,
    .rules-content-section {
      position: relative;
      z-index: 1;
    }

    .controls-card {
      position: relative;
      overflow: hidden;
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    }

    .card-thematic-art {
      position: absolute;
      top: 0;
      right: 0;
      width: 240px;
      height: 240px;
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

    .selector-lang-row,
    .rules-meta-indicator,
    .mode-segmented-bar {
      position: relative;
      z-index: 1;
    }

    .selector-lang-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-sm);
    }

    .game-dropdown-container {
      flex: 1;
    }

    .game-select-input {
      width: 100%;
      min-height: 44px;
      padding: 0 var(--space-md);
      border-radius: var(--radius-md);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-default);
      color: var(--color-text-primary);
      font-size: 15px;
      font-weight: 700;
      font-family: inherit;
    }

    .game-select-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .lang-toggle-pill {
      display: flex;
      align-items: center;
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-full);
      padding: 3px;
    }

    .lang-btn {
      padding: 6px 12px;
      border-radius: var(--radius-full);
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .lang-btn.active-lang {
      background: var(--color-primary);
      color: var(--color-on-primary);
      box-shadow: 0 2px 6px rgba(163, 206, 241, 0.3);
    }

    .rules-meta-indicator {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 12px;
      background: var(--color-surface-container-lowest);
      border-radius: var(--radius-md);
      font-size: 12px;
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border-subtle);
    }

    .meta-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .indicator-icon {
      font-size: 16px;
      color: var(--color-primary);
    }

    .version-badge {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-primary);
    }

    .mode-segmented-bar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      padding: 4px;
      border-radius: var(--radius-lg);
    }

    .segment-btn {
      min-height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      font-size: 14px;
      font-weight: 700;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .segment-btn.active-segment {
      background: var(--color-primary-container);
      color: var(--color-primary);
      border: 1px solid var(--color-border-strong);
    }

    .segment-icon {
      font-size: 18px;
    }

    .rules-content-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .section-chips-row {
      display: flex;
      gap: var(--space-xs);
      overflow-x: auto;
      padding: 2px 0;
    }

    .section-chip {
      padding: 6px 12px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-secondary);
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.15s ease;
      cursor: pointer;
      font-family: inherit;
      display: inline-flex;
      align-items: center;
    }

    .section-chip:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: var(--color-surface-container-high);
    }

    .sections-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .rule-card {
      background: var(--color-surface-container);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
      scroll-margin-top: 80px;
    }

    .rule-header {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      margin-bottom: var(--space-sm);
    }

    .rule-header-icon {
      font-size: 22px;
      color: var(--color-primary);
    }

    .rule-title {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .rule-body {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .rule-text {
      margin: 0;
      font-size: 14px;
      color: var(--color-text-secondary);
      line-height: 1.6;
      white-space: pre-line;
    }

    .highlights-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: var(--space-xs);
    }

    .highlight-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-subtle);
      font-size: 11px;
      font-weight: 600;
      color: var(--color-primary);
    }

    .hl-icon {
      font-size: 14px;
      color: var(--color-success);
    }

    .start-game-cta-box {
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-xl);
      padding: var(--space-md);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-md);
    }

    .cta-text h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .cta-text p {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .btn-cta-start {
      padding: 10px 18px;
      border-radius: var(--radius-lg);
      background: var(--color-primary);
      color: var(--color-on-primary);
      text-decoration: none;
      font-weight: 800;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(163, 206, 241, 0.3);
    }
  `],
})
export class RulesViewerComponent {
  private route = inject(ActivatedRoute);
  private registry = inject(GameRegistryService);
  private storage = inject(StorageService);

  readonly games = this.registry.games;
  selectedGameId = signal<string>('skull-king');
  currentLang = signal<'es' | 'en'>('es');
  viewMode = signal<'summary' | 'full'>('summary');

  selectedGame = computed<GameDefinition | undefined>(() => {
    return this.registry.getGame(this.selectedGameId());
  });

  /**
   * IMPORTANT: Language toggle button is displayed ONLY if the game has both languages defined!
   */
  hasMultipleLanguages = computed(() => {
    const game = this.selectedGame();
    if (!game) return false;
    return (game.rules.languages || []).length > 1;
  });

  currentSections = computed<GameRuleSection[]>(() => {
    const game = this.selectedGame();
    if (!game) return [];

    const lang = this.currentLang();
    const mode = this.viewMode();
    const content = game.rules.content[lang] || game.rules.content.es;

    return mode === 'summary' ? content.summary : content.full;
  });

  constructor() {
    this.route.queryParams.subscribe((qp) => {
      if (qp['game'] && this.registry.hasGame(qp['game'])) {
        this.selectedGameId.set(qp['game']);
      }
    });

    const preferred = this.storage.preferences().preferredLanguage;
    if (preferred) {
      this.currentLang.set(preferred);
    }
  }

  onGameSelect(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedGameId.set(val);
  }

  setLanguage(lang: 'es' | 'en'): void {
    this.currentLang.set(lang);
    this.storage.setPreferredLanguage(lang);
  }

  setViewMode(mode: 'summary' | 'full'): void {
    this.viewMode.set(mode);
  }

  scrollToSection(sectionId: string): void {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
