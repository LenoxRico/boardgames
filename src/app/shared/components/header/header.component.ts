import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="app-header safe-top">
      <div class="header-inner">
        <a routerLink="/tabs/catalog" class="brand-link">
          <div class="logo-circle">
            <span class="material-symbols-outlined logo-icon">casino</span>
          </div>
          <div class="brand-text">
            <h1 class="brand-title">Tabletop Companion</h1>
            <span class="brand-sub">Asistente Táctico de Mesa</span>
          </div>
        </a>

        <div class="header-actions">
          @if (hasActiveMatches()) {
            <a
              routerLink="/tabs/history"
              class="active-session-indicator"
              title="Partida activa en curso"
            >
              <span class="ping-ring"></span>
              <span class="ping-dot"></span>
              <span class="live-label">En Mesa</span>
            </a>
          }

          <button
            type="button"
            class="theme-toggle-btn"
            (click)="themeService.toggleTheme()"
            [title]="isDark() ? 'Cambiar a modo diurno' : 'Cambiar a modo nocturno'"
          >
            <span class="material-symbols-outlined theme-icon">
              {{ isDark() ? 'light_mode' : 'dark_mode' }}
            </span>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      position: sticky;
      top: 0;
      width: 100%;
      z-index: 50;
      background: rgba(11, 19, 38, 0.92);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--color-border-default);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
    }

    :host-context([data-theme="light"]) .app-header {
      background: rgba(255, 255, 255, 0.92);
    }

    .header-inner {
      height: 60px;
      padding: 0 var(--space-md);
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
    }

    .brand-link {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      text-decoration: none;
      color: inherit;
    }

    .logo-circle {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--color-primary-container);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--color-border-strong);
    }

    .logo-icon {
      font-size: 22px;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: var(--color-primary);
      line-height: 1.1;
      letter-spacing: -0.01em;
    }

    .brand-sub {
      font-size: 10px;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .active-session-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      background: rgba(163, 206, 241, 0.15);
      border: 1px solid rgba(163, 206, 241, 0.35);
      text-decoration: none;
      color: var(--color-primary);
      position: relative;
    }

    .live-label {
      font-size: 11px;
      font-weight: 700;
    }

    .ping-ring {
      position: absolute;
      left: 8px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-primary);
      opacity: 0.75;
      animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
    }

    .ping-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-primary);
    }

    @keyframes ping {
      75%, 100% {
        transform: scale(2.2);
        opacity: 0;
      }
    }

    .theme-toggle-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid var(--color-border-subtle);
      background: var(--color-surface-container-high);
      color: var(--color-text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .theme-toggle-btn:hover {
      background: var(--color-surface-container-highest);
    }

    .theme-icon {
      font-size: 20px;
      color: var(--color-text-primary);
    }
  `],
})
export class HeaderComponent {
  themeService = inject(ThemeService);
  private storage = inject(StorageService);

  readonly isDark = computed(() => this.themeService.currentTheme() === 'dark');
  readonly hasActiveMatches = computed(() => {
    return Object.keys(this.storage.activeMatches()).length > 0;
  });
}
