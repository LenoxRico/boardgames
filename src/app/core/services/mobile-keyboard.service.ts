import { Injectable, signal, NgZone, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MobileKeyboardService {
  private ngZone = inject(NgZone);

  /**
   * Signal indicating if the virtual keyboard is currently open on mobile devices.
   */
  readonly isKeyboardOpen = signal<boolean>(false);

  /**
   * Signal storing the estimated height of the keyboard in pixels.
   */
  readonly keyboardHeight = signal<number>(0);

  /**
   * Signal storing the current visual viewport height in pixels.
   */
  readonly visualViewportHeight = signal<number>(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  private activeInputElement: HTMLElement | null = null;
  private isInitialized = false;
  private initialWindowHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
  private scrollTimeouts: any[] = [];
  private blurTimeout: any = null;

  constructor() {
    this.init();
  }

  /**
   * Initializes global listeners for window.visualViewport, focusin, and keydown.
   */
  init(): void {
    if (this.isInitialized || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.isInitialized = true;
    this.initialWindowHeight = window.innerHeight;
    this.updateCssVariables(0, window.visualViewport?.height ?? window.innerHeight);

    this.ngZone.runOutsideAngular(() => {
      // 1. Listen to visualViewport resize/scroll (Standard Web API supported by iOS Safari & Android Chrome)
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', this.onViewportResize);
        window.visualViewport.addEventListener('scroll', this.onViewportScroll);
      } else {
        window.addEventListener('resize', this.onWindowResize);
      }

      // 2. Global listener for inputs receiving focus
      document.addEventListener('focusin', this.onFocusIn, true);

      // 3. Global listener for inputs losing focus
      document.addEventListener('focusout', this.onFocusOut, true);

      // 4. Global listener for Enter key to dismiss keyboard
      document.addEventListener('keydown', this.onKeyDown, true);

      // 5. Capacitor Native Keyboard plugin hooks (if present in iOS/Android app container)
      this.initCapacitorKeyboardListeners();
    });
  }

  /**
   * Cleans up all event listeners.
   */
  destroy(): void {
    if (!this.isInitialized || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.clearScrollTimeouts();
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }

    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.onViewportResize);
      window.visualViewport.removeEventListener('scroll', this.onViewportScroll);
    } else {
      window.removeEventListener('resize', this.onWindowResize);
    }

    document.removeEventListener('focusin', this.onFocusIn, true);
    document.removeEventListener('focusout', this.onFocusOut, true);
    document.removeEventListener('keydown', this.onKeyDown, true);

    this.isInitialized = false;
  }

  /**
   * Checks if an element is a text input that triggers the mobile virtual keyboard.
   */
  isTextInputElement(element: any): element is HTMLInputElement | HTMLTextAreaElement {
    if (!element || !(element instanceof HTMLElement)) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    if (tagName === 'textarea') {
      return true;
    }

    if (tagName === 'input') {
      const type = (element.getAttribute('type') || 'text').toLowerCase();
      const nonTextTypes = [
        'checkbox',
        'radio',
        'button',
        'submit',
        'reset',
        'file',
        'image',
        'range',
        'color',
        'hidden',
      ];
      return !nonTextTypes.includes(type);
    }

    return Boolean(element.isContentEditable);
  }

  /**
   * Dismisses the virtual keyboard by blurring the currently focused input
   * and notifying native Capacitor if running in an app.
   */
  dismissKeyboard(): void {
    if (typeof document === 'undefined') return;

    const active = document.activeElement;
    if (active && this.isTextInputElement(active)) {
      (active as HTMLElement).blur();
    }
    this.hideNativeKeyboard();
  }

  /**
   * Intelligently scrolls the given element so it remains fully visible
   * in the center of the available space above the virtual keyboard.
   */
  scrollElementIntoView(element: HTMLElement, smooth = true): void {
    if (!element || typeof element.getBoundingClientRect !== 'function') {
      return;
    }

    // Phase 1: Native scrollIntoView with center alignment and smooth behavior
    if (typeof element.scrollIntoView === 'function') {
      try {
        element.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'center',
          inline: 'nearest',
        });
      } catch {
        element.scrollIntoView(false);
      }
    }

    // Phase 2: Check parent scrollable containers (e.g., modal-body, overflow-y containers)
    let parent = element.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      const isScrollable =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        parent.scrollHeight > parent.clientHeight;

      if (isScrollable) {
        const parentRect = parent.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Calculate offset so element is centered vertically inside parent
        const offsetInsideParent = elementRect.top - parentRect.top;
        const targetScrollTop =
          parent.scrollTop + offsetInsideParent - parent.clientHeight / 2 + elementRect.height / 2;

        parent.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: smooth ? 'smooth' : 'auto',
        });
        break;
      }
      parent = parent.parentElement;
    }
  }

  // --- PRIVATE EVENT HANDLERS ---

  private onViewportResize = (): void => {
    if (!window.visualViewport) return;

    const currentVvHeight = window.visualViewport.height;
    const windowH = window.innerHeight;
    const heightDifference = Math.max(0, windowH - currentVvHeight);

    // Minimum keyboard threshold in px (to ignore small URL bar collapses, ~50-70px)
    const isKeyboardAppeared = heightDifference > 120;
    const computedKeyboardH = isKeyboardAppeared ? heightDifference : 0;

    this.ngZone.run(() => {
      this.isKeyboardOpen.set(isKeyboardAppeared);
      this.keyboardHeight.set(computedKeyboardH);
      this.visualViewportHeight.set(currentVvHeight);
    });

    this.updateCssVariables(computedKeyboardH, currentVvHeight);

    // If an input is currently focused, re-center it within the newly resized viewport
    if (this.activeInputElement && isKeyboardAppeared) {
      this.scrollElementIntoView(this.activeInputElement, true);
    }
  };

  private onViewportScroll = (): void => {
    // Keep CSS variable in sync with visual viewport top offset if user scrolled
    if (window.visualViewport) {
      document.documentElement.style.setProperty(
        '--visual-viewport-offset-top',
        `${window.visualViewport.offsetTop}px`
      );
    }
  };

  private onWindowResize = (): void => {
    const currentH = window.innerHeight;
    const diff = Math.max(0, this.initialWindowHeight - currentH);
    const isKeyboardAppeared = diff > 120;
    const computedKeyboardH = isKeyboardAppeared ? diff : 0;

    this.ngZone.run(() => {
      this.isKeyboardOpen.set(isKeyboardAppeared);
      this.keyboardHeight.set(computedKeyboardH);
      this.visualViewportHeight.set(currentH);
    });

    this.updateCssVariables(computedKeyboardH, currentH);

    if (this.activeInputElement && isKeyboardAppeared) {
      this.scrollElementIntoView(this.activeInputElement, true);
    }
  };

  private onFocusIn = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    if (!this.isTextInputElement(target)) {
      return;
    }

    this.activeInputElement = target;

    // Enhance input for mobile virtual keyboard:
    // Ensure enterkeyhint is set to 'done' (or 'search' if type=search) so OS keyboard displays 'Listo' / checkmark
    if (!target.hasAttribute('enterkeyhint')) {
      const type = target.getAttribute('type') || '';
      target.setAttribute('enterkeyhint', type === 'search' ? 'search' : 'done');
    }

    // Schedule progressive scroll attempts during mobile keyboard opening animation (0ms - 450ms)
    this.scheduleScrollAttempts(target);
  };

  private onFocusOut = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    if (this.activeInputElement === target) {
      this.activeInputElement = null;
      this.clearScrollTimeouts();

      // If no other input became focused shortly, reset keyboard state
      setTimeout(() => {
        if (!this.activeInputElement && (!document.activeElement || !this.isTextInputElement(document.activeElement))) {
          this.ngZone.run(() => {
            this.isKeyboardOpen.set(false);
            this.keyboardHeight.set(0);
            this.visualViewportHeight.set(window.visualViewport?.height ?? window.innerHeight);
          });
          this.updateCssVariables(0, window.visualViewport?.height ?? window.innerHeight);
        }
      }, 150);
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.keyCode === 13) {
      const target = event.target as HTMLElement;
      if (!this.isTextInputElement(target)) {
        return;
      }

      // If it's a textarea, allow Shift+Enter for newlines unless explicitly configured to blur
      if (target.tagName.toLowerCase() === 'textarea') {
        if (event.shiftKey || !target.hasAttribute('data-blur-on-enter')) {
          return;
        }
      }

      // Allow Angular / form handlers ((keyup.enter), (keydown.enter), (submit)) to process first,
      // then immediately blur the input to automatically dismiss the virtual keyboard.
      if (this.blurTimeout) {
        clearTimeout(this.blurTimeout);
      }

      this.blurTimeout = setTimeout(() => {
        if (document.activeElement === target) {
          target.blur();
          this.hideNativeKeyboard();
        }
      }, 50);
    }
  };

  private scheduleScrollAttempts(target: HTMLElement): void {
    this.clearScrollTimeouts();

    // 1. Instant attempt
    this.scrollTimeouts.push(
      setTimeout(() => {
        if (this.activeInputElement === target) {
          this.scrollElementIntoView(target, false);
        }
      }, 50)
    );

    // 2. Mid-animation attempt (~220ms, when keyboard is half-way up)
    this.scrollTimeouts.push(
      setTimeout(() => {
        if (this.activeInputElement === target) {
          this.scrollElementIntoView(target, true);
        }
      }, 220)
    );

    // 3. Final attempt (~420ms, when mobile keyboard transition finishes on iOS & Android)
    this.scrollTimeouts.push(
      setTimeout(() => {
        if (this.activeInputElement === target) {
          this.scrollElementIntoView(target, true);
        }
      }, 420)
    );
  }

  private clearScrollTimeouts(): void {
    for (const t of this.scrollTimeouts) {
      clearTimeout(t);
    }
    this.scrollTimeouts = [];
  }

  private updateCssVariables(kHeight: number, vvHeight: number): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--keyboard-height', `${kHeight}px`);
    root.style.setProperty('--visual-viewport-height', `${vvHeight}px`);

    const isOpen = kHeight > 0;
    root.classList.toggle('keyboard-open', isOpen);
    document.body.classList.toggle('keyboard-open', isOpen);
  }

  private initCapacitorKeyboardListeners(): void {
    try {
      const capacitor = (window as any)?.Capacitor;
      const keyboardPlugin = capacitor?.Plugins?.Keyboard;
      if (keyboardPlugin) {
        keyboardPlugin.addListener('keyboardWillShow', (info: { keyboardHeight: number }) => {
          this.ngZone.run(() => {
            this.isKeyboardOpen.set(true);
            this.keyboardHeight.set(info.keyboardHeight);
          });
          this.updateCssVariables(info.keyboardHeight, window.innerHeight - info.keyboardHeight);
          if (this.activeInputElement) {
            this.scrollElementIntoView(this.activeInputElement, true);
          }
        });

        keyboardPlugin.addListener('keyboardWillHide', () => {
          this.ngZone.run(() => {
            this.isKeyboardOpen.set(false);
            this.keyboardHeight.set(0);
          });
          this.updateCssVariables(0, window.innerHeight);
        });
      }
    } catch {
      // Capacitor not present or Keyboard plugin not initialized; fallback to web standard visualViewport
    }
  }

  private hideNativeKeyboard(): void {
    try {
      const capacitor = (window as any)?.Capacitor;
      if (capacitor?.Plugins?.Keyboard?.hide) {
        capacitor.Plugins.Keyboard.hide();
      }
    } catch {
      // Ignore
    }
  }
}
