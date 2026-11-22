import { GameRules } from '../../core/models/game.interface';

export const MINO_DICE_RULES: GameRules = {
  languages: ['es', 'en'],
  content: {
    es: {
      summary: [
        {
          id: 'mino-sum-goal',
          title: 'Objetivo y Rondas',
          icon: 'flag',
          content: 'Mino Dice es un juego de bazas con dados mitológicos. Se juegan de 6 a 8 rondas (dependiendo del número de jugadores o configuración). En cada ronda R, cada jugador extrae R dados de la bolsa a ciegas y debe predecir cuántas bazas ganará.',
          highlights: ['Ronda R = R dados y R bazas', 'Mayor puntaje final gana', 'Dados ocultos tras la pantalla'],
        },
        {
          id: 'mino-sum-hierarchy',
          title: 'Jerarquía de Dados y Combate',
          icon: 'swords',
          content: 'En cada baza, el líder lanza 1 dado y el resto lanza 1 en sentido horario.\n• Criaturas Especiales vencen a los números:\n  - Minotauro 🐂 vence a Grifo 🦅\n  - Grifo 🦅 vence a Sirena 🧜‍♀️\n  - Sirena 🧜‍♀️ vence a Minotauro 🐂\n• Dados Numéricos: Gana el valor numérico más alto.\n• Bandera Blanca 🏳️: El lado más débil, pierde ante todo.\n• Empates: Si hay empate entre criaturas o números iguales, gana quien lanzó el dado último.',
          highlights: ['Minotauro > Grifo', 'Grifo > Sirena', 'Sirena > Minotauro', 'Bandera Blanca pierde siempre', 'Empates: gana el último lanzado'],
        },
        {
          id: 'mino-sum-scoring',
          title: 'Puntuación y Baza Cero',
          icon: 'calculate',
          content: 'Al terminar la ronda se evalúa la predicción:\n• Apuesta Acertada (> 0): 20 puntos por cada baza ganada.\n• Apuesta Fallada (> 0): -10 puntos por cada baza de diferencia con la apuesta.\n• Baza Cero Acertada (apuesta 0 y 0 bazas): 10 puntos × número de la ronda (ej. Ronda 5 = +50 pts).\n• Baza Cero Fallada (apuesta 0 pero gana ≥ 1 baza): -10 puntos × número de la ronda (ej. Ronda 5 = -50 pts).',
          highlights: ['Acierto: +20 pts por baza', 'Fallo: -10 pts por baza de diferencia', 'Baza 0: ±(10 × Ronda)'],
        },
        {
          id: 'mino-sum-bonuses',
          title: 'Bonificaciones de Criaturas',
          icon: 'military_tech',
          content: 'Durante las bazas puedes conseguir bonificaciones especiales, pero SOLO se suman si acertaste tu apuesta exacta:\n• Minotauro vence Grifo: +30 puntos por cada Grifo vencido en esa baza (solo existen 3 Grifos en juego, máx +90 pts).\n• Sirena vence Minotauro: +50 puntos si la Sirena derrota al Minotauro (solo existe 1 Minotauro, máx 1 vez).',
          highlights: ['Minotauro vs Grifo: +30 pts (máx 3x)', 'Sirena vs Minotauro: +50 pts (máx 1x)', '¡Condición obligatoria: acertar la apuesta!'],
        },
      ],
      full: [
        {
          id: 'mino-full-prep',
          title: '1. Preparación y Componentes',
          icon: 'layers',
          content: 'Introduce todos los dados en la bolsa de tela opaca. Cada jugador toma una pantalla protectora para ocultar sus dados. El número de rondas estándar es:\n• 3 o 4 jugadores: 8 rondas.\n• 5 jugadores: 7 rondas.\n• 6 jugadores: 6 rondas.\nEn la ronda 1 cada jugador saca 1 dado; en la ronda 2, 2 dados; y así sucesivamente hasta la ronda final.',
          highlights: ['Bolsa opaca de dados', 'Pantallas protectoras', 'Rondas incrementales (1 a N)'],
        },
        {
          id: 'mino-full-bidding',
          title: '2. Apuestas Simultáneas',
          icon: 'psychology',
          content: 'Tras examinar en secreto los dados obtenidos (sus caras y probabilidades), todos los jugadores cierran el puño. A la cuenta de "¡Mino Dice!", todos abren la mano mostrando con sus dedos el número de bazas que pronostican ganar en esa ronda (de 0 a R bazas).\nEl anotador registra la apuesta de cada jugador en la aplicación.',
          highlights: ['Apuesta simultánea secreta', 'Pronóstico de 0 a R bazas', 'No se puede modificar durante la ronda'],
        },
        {
          id: 'mino-full-tricks',
          title: '3. Desarrollo de las Bazas',
          icon: 'casino',
          content: 'El jugador inicial (o quien ganó la baza previa) selecciona uno de sus dados ocultos y lo lanza en el centro de la mesa.\nPor orden de turno horario, cada uno elige y lanza un dado.\nSe compara la tirada según la jerarquía:\n1. Criaturas míticas derrotan a cualquier dado numérico.\n2. Triángulo mitológico: Minotauro derrota a Grifo, Grifo derrota a Sirena, Sirena derrota a Minotauro.\n3. Si solo hay números, gana el número más alto.\n4. La bandera blanca representa una rendición y pierde contra cualquier otro resultado.\n5. En caso de empates exactos (mismo número o misma criatura), el último dado lanzado gana la baza.\nEl ganador recoge los dados lanzados y lidera la siguiente baza.',
          highlights: ['Se lanza un dado por jugador por baza', 'Gana según jerarquía', 'El ganador lidera la siguiente'],
        },
        {
          id: 'mino-full-scoring',
          title: '4. Sistema Completo de Puntuación',
          icon: 'functions',
          content: 'Al concluir todas las bazas de la ronda:\n\n• Si acertaste tu apuesta (> 0):\n  Puntuación = 20 × número de bazas ganadas + bonificaciones de criaturas logradas.\n\n• Si fallaste tu apuesta (> 0):\n  Puntuación = -10 × |Apuesta - Bazas ganadas|. Todas las bonificaciones de criaturas se anulan por completo.\n\n• Si apostaste CERO (0):\n  - Si no ganaste ninguna baza: +10 × número de ronda actual.\n  - Si ganaste 1 o más bazas: -10 × número de ronda actual (sin importar cuántas ganaste de más).\n\n• Bonificaciones de Criaturas (solo si acertaste):\n  - Cada Grifo derrotado por tu Minotauro: +30 pts.\n  - Si tu Sirena derrota al Minotauro: +50 pts.',
          highlights: ['Acierto: 20x', 'Fallo: -10x diferencia', 'Baza cero: ±(10x ronda)', 'Bonos: +30 Grifo / +50 Minotauro'],
        },
        {
          id: 'mino-full-end',
          title: '5. Fin de la Partida y Victoria',
          icon: 'trophy',
          content: 'Tras jugar la ronda límite configurada (por defecto 8 rondas), se suman los acumulados de todas las rondas.\nEl jugador con la mayor puntuación total es coronado Campeón del Laberinto.\nEn caso de empate a puntos, comparten la victoria.',
          highlights: ['Mayor puntaje final gana', 'Historial acumulado ronda a ronda'],
        },
      ],
    },
    en: {
      summary: [
        {
          id: 'mino-en-goal',
          title: 'Goal & Rounds',
          icon: 'flag',
          content: 'Mino Dice is a mythological trick-taking dice game. Played over 6 to 8 rounds. In each round R, each player draws R dice blindly from the bag and must predict how many tricks they will win.',
          highlights: ['Round R = R dice and R tricks', 'Highest total score wins', 'Dice kept secret behind screens'],
        },
        {
          id: 'mino-en-hierarchy',
          title: 'Dice Hierarchy & Combat',
          icon: 'swords',
          content: 'The leader rolls 1 die, then others follow clockwise.\n• Mythical Creatures beat all numbers:\n  - Minotaur 🐂 beats Griffin 🦅\n  - Griffin 🦅 beats Mermaid 🧜‍♀️\n  - Mermaid 🧜‍♀️ beats Minotaur 🐂\n• Number Dice: Highest number wins.\n• White Flag 🏳️: Weakest roll, loses to everything.\n• Ties: When identical numbers or creatures tie, the die rolled LAST wins.',
          highlights: ['Minotaur > Griffin', 'Griffin > Mermaid', 'Mermaid > Minotaur', 'White Flag loses always', 'Ties: last rolled wins'],
        },
        {
          id: 'mino-en-scoring',
          title: 'Scoring & Zero Bids',
          icon: 'calculate',
          content: 'At the end of the round:\n• Bid Met (> 0): 20 points per trick won.\n• Bid Missed (> 0): -10 points per trick off from bid.\n• Zero Bid Met (bid 0 & 0 tricks): +10 points × round number (e.g. Round 5 = +50 pts).\n• Zero Bid Failed (bid 0 & ≥1 tricks): -10 points × round number (e.g. Round 5 = -50 pts).',
          highlights: ['Made: +20 pts / trick', 'Missed: -10 pts / trick off', 'Zero bid: ±(10 × Round)'],
        },
        {
          id: 'mino-en-bonuses',
          title: 'Creature Bonuses',
          icon: 'military_tech',
          content: 'Extra bonuses during tricks are awarded ONLY if your bid was exactly met:\n• Minotaur defeats Griffin: +30 points per Griffin captured.\n• Mermaid defeats Minotaur: +50 points.',
          highlights: ['Minotaur vs Griffin: +30 pts', 'Mermaid vs Minotaur: +50 pts', 'Must meet your bid to collect!'],
        },
      ],
      full: [
        {
          id: 'mino-en-full-setup',
          title: '1. Setup & Components',
          icon: 'layers',
          content: 'Place all dice into the dice bag. Each player takes a player screen. Players draw dice equal to the round number (1 die in Round 1, 2 dice in Round 2, up to round N). Keep drawn dice hidden behind your screen.',
          highlights: ['Dice bag & screens', 'Hidden dice supply', 'Round N draws N dice'],
        },
        {
          id: 'mino-en-full-bidding',
          title: '2. Bidding Phase',
          icon: 'psychology',
          content: 'Players secretly evaluate their dice and simultaneously declare their bid (0 to R tricks) on the count of three. Bids are logged in the app and cannot be changed during the round.',
          highlights: ['Simultaneous secret bid', '0 to R tricks', 'Locked for the round'],
        },
        {
          id: 'mino-en-full-tricks',
          title: '3. Trick Resolution',
          icon: 'casino',
          content: 'The starting player rolls 1 die into the arena. Clockwise, other players roll 1 die. Mythical creatures beat numbers. In creature combat, Minotaur beats Griffin, Griffin beats Mermaid, Mermaid beats Minotaur. White flag loses to everything. Ties are won by the last die rolled. The winner leads the next trick.',
          highlights: ['1 die rolled per trick', 'Creature hierarchy beats numbers', 'Last rolled breaks ties'],
        },
        {
          id: 'mino-en-full-scoring',
          title: '4. Scoring Rules',
          icon: 'functions',
          content: 'Exact bid (> 0): 20 pts per trick + creature bonuses.\nMissed bid (> 0): -10 pts per trick of difference (bonuses forfeited).\nZero bid: +10 × Round number if successful; -10 × Round number if failed.\nBonuses: +30 pts per Griffin defeated by Minotaur, +50 pts when Mermaid defeats Minotaur.',
          highlights: ['20x on hit', '-10x diff on miss', 'Zero bid: ±(10x round)', 'Bonuses require exact bid'],
        },
        {
          id: 'mino-en-full-end',
          title: '5. End of Game & Victory',
          icon: 'trophy',
          content: 'After the final round, total scores are summed across all rounds. The player with the highest total score is crowned the Champion of the Labyrinth!',
          highlights: ['Highest total score wins', 'Full round matrix history'],
        },
      ],
    },
  },
};
