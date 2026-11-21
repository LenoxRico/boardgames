import { GameDefinition } from '../../core/models/game.interface';
import { MinoDiceEngine, MinoDiceConfig, MinoDiceRoundInput } from './mino-dice.engine';
import { MINO_DICE_RULES } from './mino-dice.rules';
import { MinoDiceScorerComponent } from './components/mino-dice-scorer.component';

export const MINO_DICE_DEFINITION: GameDefinition<MinoDiceConfig, MinoDiceRoundInput> = {
  metadata: {
    id: 'mino-dice',
    name: 'Mino Dice',
    subtitle: 'Bazas mitológicas con dados, apuestas y criaturas legendarias',
    icon: 'casino',
    emoji: '🎲',
    minPlayers: 2,
    maxPlayers: 6,
    victoryType: 'highest_score',
    hasLoser: false,
    scoreUnit: 'pts',
    tagline: 'Lanza tus dados en el laberinto, predice con precisión tus bazas y desata al Minotauro, Grifo y Sirena.',
  },
  configOptions: [
    {
      key: 'rounds',
      label: 'Número de Rondas',
      type: 'number',
      defaultValue: 8,
      min: 3,
      max: 10,
      description: 'Cantidad de rondas de la partida. En la ronda R, cada jugador lanza R dados y hay R bazas.',
    },
    {
      key: 'enableBonuses',
      label: 'Bonificaciones de Criaturas',
      type: 'boolean',
      defaultValue: true,
      description: 'Permite anotar +30 pts (Minotauro vs Grifo) y +50 pts (Sirena vs Minotauro) si aciertas tu apuesta.',
    },
  ],
  rules: MINO_DICE_RULES,
  engine: new MinoDiceEngine(),
  scorerComponent: MinoDiceScorerComponent,
};
