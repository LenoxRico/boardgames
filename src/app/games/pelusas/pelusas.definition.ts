import { GameDefinition } from '../../core/models/game.interface';
import {
  PelusasEngine,
  PelusasConfig,
  PelusasRoundInput,
  PelusasRoundResult,
} from './pelusas.engine';
import { PELUSAS_RULES } from './pelusas.rules';
import { PelusasScorerComponent } from './components/pelusas-scorer.component';

export const PELUSAS_DEFINITION: GameDefinition<
  PelusasConfig,
  PelusasRoundInput,
  PelusasRoundResult
> = {
  metadata: {
    id: 'pelusas',
    name: 'Pelusas',
    subtitle: 'Tienta tu suerte y roba a tus rivales',
    icon: 'cyclone',
    emoji: '🧶',
    minPlayers: 2,
    maxPlayers: 6,
    victoryType: 'highest_score',
    hasLoser: false,
    scoreUnit: 'pts',
    tagline: 'Acumula pelusas sin que una corriente de aire se lleve tu botín.',
    theme: {
      primaryColor: '#ec4899',
      secondaryColor: '#8b5cf6',
      accentColor: '#06b6d4',
      gradient:
        'radial-gradient(circle at 85% 15%, rgba(236, 72, 153, 0.22) 0%, rgba(139, 92, 246, 0.20) 50%, transparent 80%)',
      bgImageUrl: '/assets/games/pelusas-bg.svg',
    },
  },
  configOptions: [
    {
      key: 'rounds',
      label: 'Número de Rondas',
      type: 'number',
      defaultValue: 3,
      min: 1,
      max: 10,
    },
    {
      key: 'targetScore',
      label: 'Puntaje Objetivo (0 = solo por rondas)',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 300,
    },
  ],
  rules: PELUSAS_RULES,
  engine: new PelusasEngine(),
  scorerComponent: PelusasScorerComponent,
};
