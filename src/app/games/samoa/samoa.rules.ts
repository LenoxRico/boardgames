import { GameRules } from '../../core/models/game.interface';

export const SAMOA_RULES: GameRules = {
  languages: ['es', 'en'],
  coverImage: '/assets/games/samoa-rules.svg',
  content: {
    es: {
      summary: [
        {
          id: 'samoa-sum-goal',
          title: 'Objetivo y Faroleo',
          icon: 'flag',
          content:
            'En Samoa compites por decorar con plumas de colores las máscaras ceremoniales de madera colocadas en la playa. Cada ronda recibes una máscara secreta que debes beneficiar sin delatar tu identidad, mientras intentas deducir las máscaras de tus rivales.',
          highlights: [
            'Partida a 3 rondas',
            'Identidad de máscara secreta en cada ronda',
            'Gana quien acumule más puntos totales',
          ],
        },
        {
          id: 'samoa-sum-turn',
          title: 'Dinámica de la Ronda',
          icon: 'style',
          content:
            'En tu turno, robas la carta superior del mazo de plumas y la colocas en la parte superior o inferior de cualquiera de las 5 máscaras de la playa.\n\n• Plumas de Colores: Suman puntos a la máscara.\n• Plumas Negras: Restan puntos (mala suerte).\n• Cartas Especiales: Generan corrientes de aire o fuegos que alteran las plumas ya colocadas.\n\nLa ronda finaliza de inmediato cuando cualquier máscara acumula 5 cartas.',
          highlights: [
            'Robar 1 carta de pluma y asignarla a una máscara',
            'Colocar arriba o abajo de la máscara elegida',
            'Fin de ronda: la primera máscara en alcanzar 5 plumas',
          ],
        },
        {
          id: 'samoa-sum-deduction',
          title: 'Deducción y Aciertos (+5 pts)',
          icon: 'psychology',
          content:
            'Al terminar la ronda, todos los jugadores escriben o anuncian en secreto qué máscara creen que le pertenece a cada rival.\n\nLuego se revelan las cartas secretas: por cada máscara rival que adivines correctamente, recibes +5 puntos de bonificación.',
          highlights: [
            '+5 pts por cada máscara rival acertada',
            'Máximo de aciertos posibles: número de rivales en la mesa',
          ],
        },
        {
          id: 'samoa-sum-penalty',
          title: '¡Penalización Unánime! (0 pts)',
          icon: 'report_problem',
          content:
            '¡Cuidado con ser demasiado obvio! Si TODOS los demás jugadores acertaron cuál era tu máscara secreta, tu faroleo fracasa por completo.\n\nEn ese caso sufres la penalización unánime: obtienes 0 puntos en la ronda (pierdes tanto los puntos de tu máscara como los puntos de tus propios aciertos).',
          highlights: [
            'Si todos los rivales te descubren: 0 pts en la ronda',
            '¡Equilibra beneficiar tu máscara con disimular tus intenciones!',
          ],
        },
      ],
      full: [
        {
          id: 'samoa-full-overview',
          title: '1. Introducción y Componentes',
          icon: 'info',
          content:
            'Samoa es un juego de cartas de faroleo, deducción y tentar la suerte diseñado por Agustín Ruiz y publicado por Devir. Los jugadores representan artesanos en las islas de Samoa que decoran con esmero máscaras ceremoniales de madera.\n\nComponentes:\n• 10 Cartas de Máscara (5 para la playa y 5 cartas secretas de jugador)\n• 50 Cartas de Pluma (con valores positivos y plumas negras negativas)\n• 12 Cartas Especiales (remolinos de viento, hogueras y eventos)\n• Reglamento oficial.',
        },
        {
          id: 'samoa-full-setup',
          title: '2. Preparación de la Mesa',
          icon: 'grid_view',
          content:
            '1. Se colocan las 5 cartas de máscara de madera en una fila central en la mesa ("la playa").\n2. Se barajan las 5 cartas de máscara secretas y se reparte 1 boca abajo a cada jugador. Cada uno la mira en secreto: esa es su máscara asignada para la ronda actual.\n3. Se baraja el mazo de cartas de pluma y especiales, dejándolo boca abajo al alcance de todos.\n4. Se elige al jugador inicial.',
        },
        {
          id: 'samoa-full-flow',
          title: '3. Desarrollo del Turno',
          icon: 'play_circle',
          content:
            'Los jugadores se alternan por turnos en sentido horario. En tu turno:\n1. Robas la carta superior del mazo central.\n2. La muestras abiertamente a todos los jugadores.\n3. Decides en cuál de las 5 máscaras de la playa colocarla, situándola en la parte superior o en la parte inferior de la columna de dicha máscara.\n\nEfectos de cartas:\n• Plumas de Colores: Aportan puntos positivos a la máscara.\n• Plumas Negras: Aportan puntos negativos (-1, -2, -3) que restan del valor final.\n• Cartas de Viento / Fuego: Permiten intercambiar, desplazar o descartar cartas de pluma previamente colocadas.',
        },
        {
          id: 'samoa-full-round-end',
          title: '4. Fin de la Ronda',
          icon: 'sports_score',
          content:
            'En el instante exacto en que cualquiera de las 5 máscaras de la playa alcance 5 cartas de pluma, la ronda se detiene inmediatamente. No se juegan más turnos y se procede a la fase de puntuación.',
        },
        {
          id: 'samoa-full-scoring',
          title: '5. Fase de Puntuación y Deducción',
          icon: 'calculate',
          content:
            'La puntuación se resuelve en tres pasos rigurosos:\n\n1. Fase de Apuesta Secreta:\nCada jugador anota en secreto qué máscara cree que corresponde a cada uno de sus contrincantes.\n\n2. Revelación y Deducción:\nTodos revelan simultáneamente sus máscaras secretas. Cada jugador gana 5 puntos por cada rival cuya máscara haya adivinado correctamente.\n\n3. Puntos de Máscara y Penalización:\n• Cada jugador calcula la suma neta de las cartas de su máscara secreta (positivas menos negativas).\n• Excepción Unánime: Si TODOS los demás jugadores de la mesa acertaron cuál era tu máscara secreta, tu puntuación total de la ronda pasa a ser 0 (se anulan tanto los puntos de tu máscara como tus aciertos).',
        },
        {
          id: 'samoa-full-end',
          title: '6. Fin de la Partida y Desempate',
          icon: 'emoji_events',
          content:
            'El juego se disputa a 3 rondas completas. Al término de la 3ª ronda, se suman los puntos de todas las rondas.\n\n• Ganador: El jugador con la mayor puntuación acumulada.\n• Desempate: Si dos o más jugadores empatan en puntos, gana quien haya conseguido más aciertos de deducción en total a lo largo de la partida. Si persiste el empate, comparten la victoria.',
        },
      ],
    },
    en: {
      summary: [
        {
          id: 'samoa-sum-goal-en',
          title: 'Goal and Bluffing',
          icon: 'flag',
          content:
            'In Samoa, players compete to decorate ceremonial wooden masks on the beach with colored feathers. Each round you secretly receive a mask that you want to score well without revealing your identity, while trying to deduce your opponents’ masks.',
          highlights: [
            'Played over 3 rounds',
            'Secret mask identity each round',
            'Highest cumulative score wins',
          ],
        },
        {
          id: 'samoa-sum-turn-en',
          title: 'Round Mechanics',
          icon: 'style',
          content:
            'On your turn, draw the top card from the deck and place it at the top or bottom of any of the 5 beach masks.\n\n• Color Feathers: Add positive points.\n• Black Feathers: Subtract points (bad luck).\n• Special Cards: Wind and fire alter placed feathers.\n\nThe round ends immediately when any mask reaches 5 feather cards.',
          highlights: [
            'Draw 1 card and place it on a mask',
            'Place at the top or bottom of the column',
            'Round ends as soon as any mask has 5 feathers',
          ],
        },
        {
          id: 'samoa-sum-deduction-en',
          title: 'Deduction and Guesses (+5 pts)',
          icon: 'psychology',
          content:
            'At the end of the round, players secretly record which mask they believe belongs to each opponent.\n\nIdentities are revealed: you earn +5 bonus points for each opponent mask you correctly guessed.',
          highlights: [
            '+5 pts per correct opponent guess',
            'Max guesses: number of opponents at the table',
          ],
        },
        {
          id: 'samoa-sum-penalty-en',
          title: 'Unanimous Discovery Penalty (0 pts)',
          icon: 'report_problem',
          content:
            'Do not make your intentions too obvious! If ALL opponents correctly guessed your secret mask, your bluff fails completely.\n\nYou suffer the unanimous penalty: you score 0 points for the entire round (forfeiting your mask points and guess points).',
          highlights: [
            'If all rivals guess your mask: 0 pts for the round',
            'Balance helping your mask while concealing your identity!',
          ],
        },
      ],
      full: [
        {
          id: 'samoa-full-overview-en',
          title: '1. Overview and Components',
          icon: 'info',
          content:
            'Samoa is a pocket card game of deduction, bluffing, and press-your-luck designed by Agustín Ruiz and published by Devir.\n\nComponents:\n• 10 Mask Cards (5 beach masks & 5 secret player masks)\n• 50 Feather Cards (positive values and negative black feathers)\n• 12 Special Cards (wind gusts, bonfires, and special effects)\n• Rulebook.',
        },
        {
          id: 'samoa-full-setup-en',
          title: '2. Setup',
          icon: 'grid_view',
          content:
            '1. Place 5 wooden mask cards in a row in the center of the table ("the beach").\n2. Shuffle the 5 secret mask cards and deal 1 face down to each player. Inspect it secretly: this is your assigned mask for this round.\n3. Shuffle the feather deck and place it face down.\n4. Choose the starting player.',
        },
        {
          id: 'samoa-full-flow-en',
          title: '3. Turn Flow',
          icon: 'play_circle',
          content:
            'Players take turns in clockwise order. On your turn:\n1. Draw the top card of the deck.\n2. Reveal it openly to all players.\n3. Decide which of the 5 beach masks to attach it to, placing it at the top or bottom of that mask’s column.\n\nCard types:\n• Colored Feathers: Add points to the mask.\n• Black Feathers: Subtract points (-1, -2, -3).\n• Wind / Fire: Swap, move, or discard previously placed feathers.',
        },
        {
          id: 'samoa-full-round-end-en',
          title: '4. Round End',
          icon: 'sports_score',
          content:
            'The round ends immediately when any of the 5 beach masks reaches 5 feather cards. No more turns are taken, and scoring begins.',
        },
        {
          id: 'samoa-full-scoring-en',
          title: '5. Scoring and Deduction Phase',
          icon: 'calculate',
          content:
            '1. Secret Guesses: Each player secretly writes down their guess for each opponent’s mask.\n2. Revelation: Everyone reveals their secret mask. Players earn +5 points for each correct opponent guess.\n3. Mask Points & Penalty: Each player scores the net total of feathers on their mask. However, if ALL other players correctly guessed your mask, you score 0 points for the round.',
        },
        {
          id: 'samoa-full-end-en',
          title: '6. Game End and Tiebreaker',
          icon: 'emoji_events',
          content:
            'The game lasts exactly 3 rounds. The player with the highest total score wins.\n\nTiebreaker: If tied, the player who achieved the most total correct deduction guesses across all rounds wins. If still tied, they share victory.',
        },
      ],
    },
  },
};