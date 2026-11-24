import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { MobileKeyboardService } from './core/services/mobile-keyboard.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Eagerly activates mobile virtual keyboard repositioning and Enter-to-blur management
  private mobileKeyboard = inject(MobileKeyboardService);
}
