import { GameDefinition } from '../../core/models/game.interface';
import { SkullKingEngine, SkullKingConfig, SkullKingRoundInput } from './skull-king.engine';
import { SKULL_KING_RULES } from './skull-king.rules';
import { SkullKingScorerComponent } from './components/skull-king-scorer.component';

export const SKULL_KING_DEFINITION: GameDefinition<SkullKingConfig, SkullKingRoundInput> = {
  metadata: {
    id: 'skull-king',
    name: 'Skull King',
    subtitle: 'El juego de bazas y apuestas piratas',
    icon: 'sailing',
    emoji: '👑',
    minPlayers: 2,
    maxPlayers: 8,
    defaultRounds: 10,
    victoryType: 'highest_score',
    hasLoser: false,
    scoreUnit: 'pts',
    tagline: 'Predice tus bazas con precisión pirata a lo largo de 10 rondas intensas.',
    theme: {
      primaryColor: '#f59e0b',
      secondaryColor: '#1e3a8a',
      accentColor: '#d97706',
      gradient: 'radial-gradient(circle at 85% 15%, rgba(245, 158, 11, 0.16) 0%, rgba(30, 58, 138, 0.22) 50%, transparent 80%)',
      bgImageUrl: 'assets/games/skull-king-bg.svg',
    },
  },
  configOptions: [
    {
      key: 'rounds',
      label: 'Número de Rondas',
      type: 'number',
      defaultValue: 10,
      min: 1,
      max: 10,
      description: 'Partida estándar de 10 rondas.',
    },
    {
      key: 'recentRules',
      label: 'Habilitar Reglas y Bonificaciones Recientes',
      type: 'boolean',
      defaultValue: true,
      description: 'Activa bonos de Sirena, Skull King capturando piratas y botines especiales.',
    },
  ],
  rules: SKULL_KING_RULES,
  engine: new SkullKingEngine(),
  scorerComponent: SkullKingScorerComponent,
};
