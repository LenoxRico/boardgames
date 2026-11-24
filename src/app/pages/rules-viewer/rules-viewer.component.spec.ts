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

  it('should render the dedicated rules image card and the game overview card', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rulesImageCard = compiled.querySelector('.rules-image-card');
    expect(rulesImageCard).toBeTruthy();

    const coverImage = compiled.querySelector('.rules-cover-image') as HTMLImageElement;
    expect(coverImage).toBeTruthy();
    expect(coverImage.src).toContain('/assets/games/pelusas-rules.svg');

    const overviewCard = compiled.querySelector('.game-overview-card');
    expect(overviewCard).toBeTruthy();

    const heroName = compiled.querySelector('.game-hero-name');
    expect(heroName?.textContent).toContain('Pelusas');
  });

  it('should normalize game rules image url to ensure leading slash', () => {
    const registry = TestBed.inject(GameRegistryService);
    const game = registry.getGame('skull-king')!;
    const coverUrl = component.getRulesCoverImage(game);
    expect(coverUrl.startsWith('/')).toBe(true);
    expect(coverUrl).toBe('/assets/games/skull-king-rules.svg');

    const bgUrl = component.getGameBgImage(game);
    expect(bgUrl.startsWith('/')).toBe(true);
    expect(bgUrl).toBe('/assets/games/skull-king-bg.svg');
  });

  it('should update selected game when onGameSelectId is called', () => {
    component.onGameSelectId('hitster');
    expect(component.selectedGameId()).toBe('hitster');
    expect(component.selectedGame()?.metadata.name).toBe('Hitster');
  });
});
