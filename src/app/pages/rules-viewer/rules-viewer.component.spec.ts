import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { RulesViewerComponent } from './rules-viewer.component';
import { GameRegistryService } from '../../core/services/game-registry.service';

describe('RulesViewerComponent', () => {
  let component: RulesViewerComponent;
  let fixture: ComponentFixture<RulesViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RulesViewerComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'game' ? 'pelusas' : null),
              },
            },
            queryParams: of({ game: 'pelusas' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RulesViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with the game specified in queryParams rather than defaulting to skull-king', () => {
    expect(component.selectedGameId()).toBe('pelusas');
    expect(component.selectedGame()?.metadata.name).toBe('Pelusas');
  });

  it('should render the game hero card with the allusive game image and specs', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const heroCard = compiled.querySelector('.game-hero-card');
    expect(heroCard).toBeTruthy();

    const heroImage = compiled.querySelector('.game-art-image') as HTMLImageElement;
    expect(heroImage).toBeTruthy();
    expect(heroImage.src).toContain('/assets/games/pelusas-bg.svg');

    const heroName = compiled.querySelector('.game-hero-name');
    expect(heroName?.textContent).toContain('Pelusas');
  });

  it('should normalize game image url to ensure leading slash', () => {
    const registry = TestBed.inject(GameRegistryService);
    const game = registry.getGame('skull-king')!;
    const imgUrl = component.getGameImage(game);
    expect(imgUrl.startsWith('/')).toBe(true);
    expect(imgUrl).toBe('/assets/games/skull-king-bg.svg');
  });

  it('should update selected game when onGameSelectId is called', () => {
    component.onGameSelectId('hitster');
    expect(component.selectedGameId()).toBe('hitster');
    expect(component.selectedGame()?.metadata.name).toBe('Hitster');
  });
});
