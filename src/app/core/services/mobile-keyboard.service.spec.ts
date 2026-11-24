import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MobileKeyboardService } from './mobile-keyboard.service';

describe('MobileKeyboardService', () => {
  let service: MobileKeyboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MobileKeyboardService],
    });
    service = TestBed.inject(MobileKeyboardService);
  });

  afterEach(() => {
    service.destroy();
    document.querySelectorAll('.test-input').forEach((el) => el.remove());
  });

  it('should be created and initialized', () => {
    expect(service).toBeTruthy();
    expect(service.isKeyboardOpen()).toBe(false);
  });

  describe('isTextInputElement', () => {
    it('should return true for text, number, search and email inputs', () => {
      const textInput = document.createElement('input');
      textInput.type = 'text';

      const numberInput = document.createElement('input');
      numberInput.type = 'number';

      const searchInput = document.createElement('input');
      searchInput.type = 'search';

      const textarea = document.createElement('textarea');

      expect(service.isTextInputElement(textInput)).toBe(true);
      expect(service.isTextInputElement(numberInput)).toBe(true);
      expect(service.isTextInputElement(searchInput)).toBe(true);
      expect(service.isTextInputElement(textarea)).toBe(true);
    });

    it('should return false for checkbox, radio, button and file inputs', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';

      const radio = document.createElement('input');
      radio.type = 'radio';

      const btn = document.createElement('input');
      btn.type = 'button';

      const file = document.createElement('input');
      file.type = 'file';

      const div = document.createElement('div');

      expect(service.isTextInputElement(checkbox)).toBe(false);
      expect(service.isTextInputElement(radio)).toBe(false);
      expect(service.isTextInputElement(btn)).toBe(false);
      expect(service.isTextInputElement(file)).toBe(false);
      expect(service.isTextInputElement(div)).toBe(false);
    });
  });

  describe('enterkeyhint auto-enhancement on focus', () => {
    it('should automatically set enterkeyhint="done" on text inputs without it', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'test-input';
      document.body.appendChild(input);

      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      expect(input.getAttribute('enterkeyhint')).toBe('done');
    });

    it('should set enterkeyhint="search" on search inputs', () => {
      const input = document.createElement('input');
      input.type = 'search';
      input.className = 'test-input';
      document.body.appendChild(input);

      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      expect(input.getAttribute('enterkeyhint')).toBe('search');
    });

    it('should preserve existing enterkeyhint if already specified', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('enterkeyhint', 'go');
      input.className = 'test-input';
      document.body.appendChild(input);

      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      expect(input.getAttribute('enterkeyhint')).toBe('go');
    });
  });

  describe('Enter key hides keyboard (auto-blur)', () => {
    it('should blur input when Enter key is pressed', async () => {
      vi.useFakeTimers();

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'test-input';
      document.body.appendChild(input);

      input.focus();
      expect(document.activeElement).toBe(input);

      const blurSpy = vi.spyOn(input, 'blur');

      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(enterEvent);

      // Fast-forward 60ms for timeout to fire
      vi.advanceTimersByTime(60);

      expect(blurSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should not blur textarea if Shift+Enter is pressed', () => {
      vi.useFakeTimers();

      const textarea = document.createElement('textarea');
      textarea.className = 'test-input';
      document.body.appendChild(textarea);

      textarea.focus();
      const blurSpy = vi.spyOn(textarea, 'blur');

      const shiftEnter = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
      });
      textarea.dispatchEvent(shiftEnter);

      vi.advanceTimersByTime(60);

      expect(blurSpy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('dismissKeyboard', () => {
    it('should blur active text input when called directly', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'test-input';
      document.body.appendChild(input);

      input.focus();
      const blurSpy = vi.spyOn(input, 'blur');

      service.dismissKeyboard();

      expect(blurSpy).toHaveBeenCalled();
    });
  });
});
