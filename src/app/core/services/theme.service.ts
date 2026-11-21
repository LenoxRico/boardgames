import { Injectable, effect, inject } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private storage = inject(StorageService);

  readonly currentTheme = this.storage.theme;

  constructor() {
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
    });
  }

  toggleTheme(): void {
    const current = this.currentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.storage.setTheme(next);
  }

  setTheme(theme: 'dark' | 'light' | 'system'): void {
    this.storage.setTheme(theme);
  }

  private applyTheme(theme: 'dark' | 'light' | 'system'): void {
    if (typeof document === 'undefined') return;

    let isDark = theme === 'dark';
    if (theme === 'system' && typeof window !== 'undefined') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    const htmlEl = document.documentElement;
    if (isDark) {
      htmlEl.classList.add('dark');
      htmlEl.setAttribute('data-theme', 'dark');
    } else {
      htmlEl.classList.remove('dark');
      htmlEl.setAttribute('data-theme', 'light');
    }
  }
}
