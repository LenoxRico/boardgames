import { GameDefinition } from '../../core/models/game.interface';
import {
  SamoaEngine,
  SamoaConfig,
  SamoaRoundInput,
  SamoaRoundResult,
} from './samoa.engine';
import { SAMOA_RULES } from './samoa.rules';
import { SamoaScorerComponent } from './components/samoa-scorer.component';

export const SAMOA_DEFINITION: GameDefinition<
  SamoaConfig,
  SamoaRoundInput,
  SamoaRoundResult
> = {
  metadata: {
    id: 'samoa',
    name: 'Samoa',
    subtitle: 'Máscaras secretas, plumas y faroleo',
    icon: 'theater_comedy',
    emoji: '🎭',
    minPlayers: 2,
    maxPlayers: 4,
    defaultRounds: 3,
    victoryType: 'highest_score',
    hasLoser: false,
    scoreUnit: 'pts',
    tagline: 'Decora las máscaras de la playa con plumas de colores sin revelar cuál es la tuya.',
    theme: {
      primaryColor: '#0d9488',
      secondaryColor: '#f59e0b',
      accentColor: '#f43f5e',
      gradient:
        'radial-gradient(circle at 85% 15%, rgba(13, 148, 136, 0.22) 0%, rgba(245, 158, 11, 0.18) 50%, transparent 80%)',
      bgImageUrl: '/assets/games/samoa-bg.svg',
    },
  },
  configOptions: [
    {
      key: 'rounds',
      label: 'Número de Rondas',
      type: 'number',
      defaultValue: 3,
      min: 1,
      max: 5,
      description: 'El juego oficial de Devir se disputa a exactamente 3 rondas.',
    },
    {
      key: 'guessBonus',
      label: 'Puntos por Rival Adivinado',
      type: 'number',
      defaultValue: 5,
      min: 1,
      max: 10,
      description: 'Bonificación obtenida al acertar la máscara secreta de cada oponente.',
    },
    {
      key: 'unanimousPenalty',
      label: 'Penalización por Descubrimiento Unánime',
      type: 'boolean',
      defaultValue: true,
      description: 'Si todos los rivales aciertan tu máscara secreta, anulas tu puntuación y obtienes 0 pts en la ronda.',
    },
  ],
  rules: SAMOA_RULES,
  engine: new SamoaEngine(),
  scorerComponent: SamoaScorerComponent,
};
