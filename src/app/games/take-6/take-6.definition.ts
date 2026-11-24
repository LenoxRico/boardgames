import { GameDefinition } from '../../core/models/game.interface';
import { Take6Engine, Take6Config, Take6RoundInput } from './take-6.engine';
import { TAKE_6_RULES } from './take-6.rules';
import { Take6ScorerComponent } from './components/take-6-scorer.component';

export const TAKE_6_DEFINITION: GameDefinition<Take6Config, Take6RoundInput> = {
  metadata: {
    id: 'take-6',
    name: '¡Toma 6! (6 nimmt!)',
    subtitle: 'El clásico de Wolfgang Kramer de evitar cuernos de buey',
    icon: 'pets',
    emoji: '🐂',
    minPlayers: 2,
    maxPlayers: 10,
    victoryType: 'lowest_score',
    hasLoser: true,
    scoreUnit: 'cuernos',
    tagline: 'Coloca cartas con astucia en 4 filas y evita ser quien coloque la 6ª carta.',
    theme: {
      primaryColor: '#10b981',
      secondaryColor: '#dc2626',
      accentColor: '#047857',
      gradient: 'radial-gradient(circle at 85% 15%, rgba(16, 185, 129, 0.16) 0%, rgba(220, 38, 38, 0.14) 50%, transparent 80%)',
      bgImageUrl: '/assets/games/take-6-bg.svg',
    },
  },
  configOptions: [
    {
      key: 'roundsMode',
      label: 'Modo de Rondas Fijas (4 Rondas)',
      type: 'boolean',
      defaultValue: true,
      description: 'Juega solo 4 rondas. Al terminar la 4ª ronda, pierde quien haya acumulado más cuernos.',
    },
    {
      key: 'scoreLimit',
      label: 'Límite Crítico (Modo Clásico)',
      type: 'number',
      defaultValue: 66,
      min: 20,
      max: 200,
      description: 'Aplica en modo clásico: la partida termina cuando alguien alcanza o supera este límite.',
      showIf: (config) => !config['roundsMode'],
    },
  ],
  rules: TAKE_6_RULES,
  engine: new Take6Engine(),
  scorerComponent: Take6ScorerComponent,
};
