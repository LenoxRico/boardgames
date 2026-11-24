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

    // The dedicated rules image card MUST use the rules illustration (*-rules.svg)
    const coverImage = compiled.querySelector('.rules-cover-image') as HTMLImageElement;
    expect(coverImage).toBeTruthy();
    expect(coverImage.src).toContain('/assets/games/pelusas-rules.svg');

    // Everywhere else (controls card and overview card) MUST use the background watermark (*-bg.svg)
    const controlsThematicArt = compiled.querySelector('.controls-card .card-thematic-art') as HTMLElement;
    expect(controlsThematicArt).toBeTruthy();
    expect(controlsThematicArt.style.backgroundImage).toContain('/assets/games/pelusas-bg.svg');

    const overviewCard = compiled.querySelector('.game-overview-card');
    expect(overviewCard).toBeTruthy();

    const overviewThematicArt = compiled.querySelector('.game-overview-card .card-thematic-art') as HTMLElement;
    expect(overviewThematicArt).toBeTruthy();
    expect(overviewThematicArt.style.backgroundImage).toContain('/assets/games/pelusas-bg.svg');

    // All rule section cards and the CTA card MUST also render the background watermark (*-bg.svg)
    const ruleCards = compiled.querySelectorAll('.rule-card');
    expect(ruleCards.length).toBeGreaterThan(0);
    ruleCards.forEach((rc) => {
      const art = rc.querySelector('.card-thematic-art') as HTMLElement;
      expect(art).toBeTruthy();
      expect(art.style.backgroundImage).toContain('/assets/games/pelusas-bg.svg');
    });

    const ctaBoxArt = compiled.querySelector('.start-game-cta-box .card-thematic-art') as HTMLElement;
    expect(ctaBoxArt).toBeTruthy();
    expect(ctaBoxArt.style.backgroundImage).toContain('/assets/games/pelusas-bg.svg');

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

    // getGameImage returns the background watermark for all general uses
    expect(component.getGameImage(game)).toBe('/assets/games/skull-king-bg.svg');
  });

  it('should update selected game when onGameSelectId is called', () => {
    component.onGameSelectId('hitster');
    expect(component.selectedGameId()).toBe('hitster');
    expect(component.selectedGame()?.metadata.name).toBe('Hitster');
  });
});
