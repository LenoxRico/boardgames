import { GameDefinition } from '../../core/models/game.interface';
import {
  HitsterEngine,
  HitsterConfig,
  HitsterRoundInput,
  HitsterRoundResult,
} from './hitster.engine';
import { HITSTER_RULES } from './hitster.rules';
import { HitsterScorerComponent } from './components/hitster-scorer.component';

export const HITSTER_DEFINITION: GameDefinition<
  HitsterConfig,
  HitsterRoundInput,
  HitsterRoundResult
> = {
  metadata: {
    id: 'hitster',
    name: 'Hitster',
    subtitle: 'El juego musical con más de 100 años de éxitos',
    icon: 'album',
    emoji: '🎵',
    minPlayers: 2,
    maxPlayers: 12,
    defaultRounds: 10,
    victoryType: 'highest_score',
    hasLoser: false,
    scoreUnit: 'canciones',
    tagline: 'Escucha la música, viaja en el tiempo y construye tu línea de éxitos sin revelar las cartas.',
    theme: {
      primaryColor: '#ec4899',
      secondaryColor: '#8b5cf6',
      accentColor: '#06b6d4',
      gradient:
        'radial-gradient(circle at 85% 15%, rgba(236, 72, 153, 0.22) 0%, rgba(139, 92, 246, 0.18) 50%, transparent 80%)',
      bgImageUrl: '/assets/games/hitster-bg.svg',
    },
  },
  configOptions: [
    {
      key: 'targetCards',
      label: 'Canciones en Línea para Ganar',
      type: 'number',
      defaultValue: 10,
      min: 5,
      max: 20,
      description: 'El primer jugador o equipo en reunir este número de canciones cronológicas gana la partida.',
    },
    {
      key: 'startingTokens',
      label: 'Fichas Hitster Iniciales',
      type: 'number',
      defaultValue: 3,
      min: 0,
      max: 5,
      description: 'Número de fichas con las que inicia cada participante para desafiar, robar o pasar canciones.',
    },
    {
      key: 'gameMode',
      label: 'Modo de Juego',
      type: 'select',
      defaultValue: 'original',
      options: [
        { label: 'Original (Clásico - Línea de Tiempo)', value: 'original' },
        { label: 'Pro (+1 Ficha si sabes Artista y Título)', value: 'pro' },
        { label: 'Expert (Requiere Año Exacto)', value: 'expert' },
        { label: 'Cooperativo (Construir Línea en Equipo)', value: 'cooperative' },
      ],
      description: 'Regla de dificultad y condición adicional de victoria.',
    },
    {
      key: 'timerSeconds',
      label: 'Tiempo de Escucha (segundos)',
      type: 'number',
      defaultValue: 30,
      min: 10,
      max: 60,
      description: 'Duración del temporizador regresivo de DJ para escuchar la canción.',
    },
  ],
  rules: HITSTER_RULES,
  engine: new HitsterEngine(),
  scorerComponent: HitsterScorerComponent,
};
