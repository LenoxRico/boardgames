import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-responsive-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="shell-layout">
      <!-- Barra Lateral para Pantallas Grandes (Desktop / Tablet >= 768px) -->
      <aside class="desktop-sidebar">
        <div class="sidebar-brand">
          <div class="logo-box">
            <span class="material-symbols-outlined logo-icon">casino</span>
          </div>
          <div class="sidebar-title-group">
            <h2 class="sidebar-title">Tabletop Companion</h2>
            <span class="sidebar-sub">Asistente Táctico</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a
            routerLink="/tabs/catalog"
            routerLinkActive="active-nav-item"
            class="nav-item"
          >
            <span class="material-symbols-outlined nav-icon">grid_view</span>
            <span class="nav-label">Catálogo de Juegos</span>
          </a>

          <a
            routerLink="/tabs/history"
            routerLinkActive="active-nav-item"
            class="nav-item"
          >
            <span class="material-symbols-outlined nav-icon">sports_esports</span>
            <span class="nav-label">En Mesa / Historial</span>
            @if (hasActiveMatches()) {
              <span class="sidebar-live-pill">Activa</span>
            }
          </a>

          <a
            routerLink="/tabs/rules"
            routerLinkActive="active-nav-item"
            class="nav-item"
          >
            <span class="material-symbols-outlined nav-icon">menu_book</span>
            <span class="nav-label">Visor de Reglas</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <span class="footer-tag">Tabletop Companion v1.0</span>
          <span class="footer-sub">Optimizado para Mesa de Juego</span>
        </div>
      </aside>

      <!-- Contenedor Principal de Vistas -->
      <main class="main-content-area">
        <router-outlet></router-outlet>
      </main>

      <!-- Barra Inferior de Pestañas Fija en Móviles (< 768px) -->
      <nav class="mobile-tab-bar safe-bottom">
        <a
          routerLink="/tabs/catalog"
          routerLinkActive="active-tab"
          class="tab-link"
        >
          <span class="material-symbols-outlined tab-icon">grid_view</span>
          <span class="tab-label">Juegos</span>
        </a>

        <a
          routerLink="/tabs/history"
          routerLinkActive="active-tab"
          class="tab-link"
        >
          <div class="tab-icon-wrapper">
            <span class="material-symbols-outlined tab-icon">sports_esports</span>
            @if (hasActiveMatches()) {
              <span class="tab-ping-dot"></span>
            }
          </div>
          <span class="tab-label">En Curso</span>
        </a>

        <a
          routerLink="/tabs/rules"
          routerLinkActive="active-tab"
          class="tab-link"
        >
          <span class="material-symbols-outlined tab-icon">menu_book</span>
          <span class="tab-label">Reglas</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    .shell-layout {
      display: flex;
      min-height: calc(100vh - 60px);
      width: 100%;
      background: var(--color-surface);
    }

    /* Desktop Sidebar (>= 768px) */
    .desktop-sidebar {
      display: none;
      width: 260px;
      background: var(--color-surface-container);
      border-right: 1px solid var(--color-border-default);
      padding: var(--space-md);
      flex-direction: column;
      flex-shrink: 0;
      position: sticky;
      top: 60px;
      height: calc(100vh - 60px);
      overflow-y: auto;
    }

    @media (min-width: 768px) {
      .desktop-sidebar {
        display: flex;
      }
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding-bottom: var(--space-lg);
      border-bottom: 1px solid var(--color-border-subtle);
      margin-bottom: var(--space-md);
    }

    .logo-box {
      width: 38px;
      height: 38px;
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

    .sidebar-title {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      color: var(--color-primary);
      line-height: 1.1;
    }

    .sidebar-sub {
      font-size: 11px;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: 10px 14px;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      transition: all 0.15s ease;
    }

    .nav-item:hover {
      background: var(--color-surface-container-high);
      color: var(--color-text-primary);
    }

    .nav-item.active-nav-item {
      background: var(--color-primary-container);
      color: var(--color-primary);
      border: 1px solid var(--color-border-strong);
    }

    .nav-icon {
      font-size: 20px;
    }

    .sidebar-live-pill {
      margin-left: auto;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: var(--radius-full);
      background: rgba(163, 206, 241, 0.2);
      color: var(--color-primary);
      font-weight: 800;
    }

    .sidebar-footer {
      padding-top: var(--space-md);
      border-top: 1px solid var(--color-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .footer-tag {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-text-secondary);
    }

    .footer-sub {
      font-size: 10px;
      color: var(--color-text-muted);
    }

    /* Main Area */
    .main-content-area {
      flex: 1;
      width: 100%;
      min-width: 0;
    }

    /* Mobile Bottom Tab Bar (< 768px) */
    .mobile-tab-bar {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: rgba(11, 19, 38, 0.95);
      backdrop-filter: blur(16px);
      border-top: 1px solid var(--color-border-default);
      z-index: 50;
      box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.3);
    }

    :host-context([data-theme="light"]) .mobile-tab-bar {
      background: rgba(255, 255, 255, 0.95);
    }

    @media (min-width: 768px) {
      .mobile-tab-bar {
        display: none;
      }
    }

    .tab-link {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      color: var(--color-text-muted);
      transition: color 0.15s ease;
      gap: 3px;
    }

    .tab-link.active-tab {
      color: var(--color-primary);
    }

    .tab-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tab-icon {
      font-size: 22px;
    }

    .tab-label {
      font-size: 11px;
      font-weight: 700;
    }

    .tab-ping-dot {
      position: absolute;
      top: -2px;
      right: -4px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--color-primary);
    }
  `],
})
export class ResponsiveShellComponent {
  private storage = inject(StorageService);

  readonly hasActiveMatches = computed(() => {
    return Object.keys(this.storage.activeMatches()).length > 0;
  });
}
