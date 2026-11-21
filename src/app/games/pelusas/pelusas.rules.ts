import { GameRules } from '../../core/models/game.interface';

export const PELUSAS_RULES: GameRules = {
  languages: ['es', 'en'],
  content: {
    es: {
      summary: [
        {
          id: 'sec-obj',
          title: 'Objetivo del Juego',
          icon: 'emoji_events',
          content:
            'Consigue la mayor cantidad de puntos acumulando cartas de pelusas en tu montón seguro. Quien tenga el valor total más alto al agotarse el mazo de polvo gana la partida.',
          highlights: [
            '2 a 6 jugadores',
            'Mayor puntuación gana',
            'Mazo de 110 cartas numeradas del 1 al 10',
          ],
        },
        {
          id: 'sec-turno',
          title: 'Estructura del Turno',
          icon: 'sync',
          content:
            'En tu turno sigues 3 pasos en orden: 1) Recoge tus pelusas boca arriba pendientes de la ronda anterior a tu montón seguro de puntos. 2) Saca cartas una a una del montón central de polvo. 3) Decide si plantarte o seguir arriesgando.',
          highlights: [
            'Paso 1: Guardar cartas seguras si te plantaste en tu turno previo',
            'Paso 2: Revelar cartas del montón central una a una',
            'Paso 3: Decidir tras cada carta si te plantas o continúas',
          ],
        },
        {
          id: 'sec-robar',
          title: 'Robar Pelusas a Rivales',
          icon: 'swap_horiz',
          content:
            '¡Cada vez que saques una carta del mazo central, puedes robar inmediatamente todas las cartas del mismo número que cualquier otro jugador tenga descubiertas delante de sí! Esas cartas pasan a tu fila de este turno.',
          highlights: [
            'Robo instantáneo al revelar la carta coincidente',
            'Solo puedes robar cartas descubiertas (no las ya guardadas en puntos)',
            'Puedes robar a varios jugadores a la vez si tienen ese mismo número',
          ],
        },
        {
          id: 'sec-viento',
          title: '¡Corriente de Aire! (Pasarse)',
          icon: 'air',
          content:
            'Si al sacar una carta del montón central revelas un número que YA tienes boca arriba frente a ti en este mismo turno, ¡sopla una corriente de aire! Pierdes todas las cartas descubiertas de este turno (incluso las robadas) y tu turno termina de inmediato con 0 puntos.',
          highlights: [
            'Número repetido en tu zona = pierdes todo lo del turno',
            'Las cartas descartadas van a la caja',
            'Las cartas de tu montón seguro de puntos NO se ven afectadas',
          ],
        },
        {
          id: 'sec-fin',
          title: 'Final de Partida y Desempate',
          icon: 'flag',
          content:
            'La partida termina de inmediato cuando se agota la última carta del montón central de polvo. Todos los jugadores pasan sus cartas descubiertas a su montón de puntos y suman los valores. Quien tenga más puntos gana. En caso de empate, gana quien tenga más cartas con el número 1; si persiste, con el 2, y así sucesivamente.',
          highlights: [
            'Fin instantáneo al vaciar el mazo',
            'Mayor valor total de cartas acumuladas gana',
            'Desempate oficial: más unos, luego más doses, etc.',
          ],
        },
        {
          id: 'sec-revolution',
          title: 'Novedades de Pelusas Revolution',
          icon: 'local_fire_department',
          content:
            'La edición Revolution añade gran interacción y caos con cartas especiales: Diablillos (-7 pts obligatorios), Aspiradoras para asegurar columnas al instante, Atrapa para robar columnas enteras a rivales, Seguro anti-corriente de aire, Regalos envenenados y Angelitos.',
          highlights: [
            'Diablillos: -7 puntos cada uno (¡restan al marcador!)',
            'Cartas de acción: Aspira (Aspiradora), Atrapa y Seguro',
            'Pelusas especiales: Regalo, Angelito y Parejita',
          ],
        },
      ],
      full: [
        {
          id: 'full-prep',
          title: '1. Componentes y Preparación',
          icon: 'layers',
          content:
            'Pelusas contiene 110 cartas de pelusas con valores del 1 al 10 (13 cartas de cada número del 1 al 5, y 9 cartas de cada número del 6 al 10). Se barajan todas las cartas a conciencia para evitar números repetidos juntos y se colocan boca abajo en el centro de la mesa formando un montón desordenado llamado el "montón de polvo". Comienza el jugador más desordenado o quien elija el grupo.',
        },
        {
          id: 'full-fases',
          title: '2. Fases Detalladas del Turno',
          icon: 'play_arrow',
          content:
            'Cada turno se divide obligatoriamente en las siguientes fases:\n\n' +
            '• FASE A - Asegurar Puntos: Si en tu turno anterior te plantaste con éxito, esas cartas habrán sobrevivido a los turnos de los rivales. Colócalas boca abajo en tu montón personal de puntos. Nadie podrá robártelas ya.\n\n' +
            '• FASE B - Buscar Pelusas: Roba una carta del montón de polvo y ponla boca arriba frente a ti. Agrupa las cartas por números visibles para que todos las vean.\n\n' +
            '• FASE C - Robo de Oponentes: Si la carta robada coincide con cartas descubiertas de cualquier oponente, tómale todas las cartas de ese valor y colócalas en tu zona.\n\n' +
            '• FASE D - Decisión (¿Seguir o Plantarse?): Si te plantas, tu turno concluye y tus cartas quedan expuestas en mesa hasta tu próximo turno. Si decides seguir, vuelve a la Fase B.',
        },
        {
          id: 'full-riesgo',
          title: '3. La Corriente de Aire',
          icon: 'cyclone',
          content:
            'El corazón del juego es la gestión de riesgo (push your luck). Si sacas una carta cuyo número ya tienes visible frente a ti en tu turno actual, una corriente de aire barre tu mesa: todas las cartas acumuladas en ese turno (las robadas del mazo y las robadas a los rivales) se descartan a la caja y tu turno finaliza de inmediato. Saber cuándo conformarse es la clave para ganar.',
        },
        {
          id: 'full-puntuacion',
          title: '4. Recuento de Puntos y Desempate Oficial',
          icon: 'calculate',
          content:
            'En el instante en que se toma la última carta del montón de polvo central, la partida concluye de inmediato. Si algún jugador tenía cartas descubiertas en su zona, las incorpora a su montón de puntos. Cada jugador suma el valor facial de todas sus cartas.\n\n' +
            'Regla Oficial de Desempate (Reiner Knizia):\n' +
            '1. Gana el jugador con la mayor cantidad de cartas con el número 1.\n' +
            '2. Si persiste el empate, quien tenga más cartas del número 2.\n' +
            '3. Se continúa comparando número por número (3, 4, 5...) hasta desempatar.',
        },
        {
          id: 'full-revolution',
          title: '5. Reglas Especiales: Pelusas Revolution',
          icon: 'bolt',
          content:
            'En la edición Pelusas Revolution se incorporan cartas con dinámicas directas:\n\n' +
            '• Diablillos (-7 Puntos): Si revelas un diablillo, estás obligado a cargarlo junto con todos los diablillos visibles en mesa. Cada uno resta 7 puntos de tu puntuación total.\n\n' +
            '• Aspira (Aspiradora): Acción inmediata que permite enviar una columna entera de cartas descubiertas a tu montón seguro de puntos antes de seguir tentando la suerte.\n\n' +
            '• Atrapa: Te permite robar una columna completa de pelusas descubiertas a otro jugador, sin importar el número.\n\n' +
            '• Seguro: Protege tu turno; si revelas un número repetido, el Seguro se descarta pero no sufres la corriente de aire.\n\n' +
            '• Regalos & Angelitos: Los regalos alteran el aseguramiento de cartas al inicio del turno y los angelitos otorgan bonificaciones directas.',
        },
      ],
    },
    en: {
      summary: [
        {
          id: 'sec-obj',
          title: 'Game Objective',
          icon: 'emoji_events',
          content:
            'Score the highest total value by collecting dust bunny (pelusas) cards into your safe scoring pile. When the central dust pile runs out, the player with the most points wins.',
          highlights: [
            '2 to 6 players',
            'Highest score wins',
            '110 cards numbered 1 to 10',
          ],
        },
        {
          id: 'sec-turno',
          title: 'Turn Structure',
          icon: 'sync',
          content:
            'On your turn, follow 3 steps in order: 1) Bank your pending face-up cards from your previous turn into your safe score pile. 2) Draw cards one by one from the central dust pile. 3) Decide whether to stop or push your luck.',
          highlights: [
            'Step 1: Secure cards if you stopped safely last turn',
            'Step 2: Reveal cards one by one from the dust pile',
            'Step 3: Decide after each card whether to bank or continue',
          ],
        },
        {
          id: 'sec-robar',
          title: 'Stealing from Opponents',
          icon: 'swap_horiz',
          content:
            'Whenever you draw a card from the deck, you may immediately steal all face-up cards of that same number from any opponent! Stolen cards are added to your face-up cards for this turn.',
          highlights: [
            'Instant steal upon revealing matching number',
            'Only face-up exposed cards can be stolen (not banked points)',
            'Can steal from multiple opponents simultaneously',
          ],
        },
        {
          id: 'sec-viento',
          title: 'Draft of Wind! (Bust)',
          icon: 'air',
          content:
            'If you draw a card whose number you ALREADY have face-up in front of you this turn, a draft of wind blows them all away! You lose all cards collected this turn (including stolen ones) and your turn ends immediately with 0 points.',
          highlights: [
            'Duplicate number in your row = lose everything this turn',
            'Blown cards are discarded to the box',
            'Previously banked safe score pile is never affected',
          ],
        },
        {
          id: 'sec-fin',
          title: 'Game End & Tiebreaker',
          icon: 'flag',
          content:
            'The game ends instantly when the last card from the central dust pile is drawn. All players move their current face-up cards into their score pile and sum up card values. Highest score wins. Tiebreaker: most number 1 cards; if tied, most number 2 cards, and so on.',
          highlights: [
            'Ends instantly when central deck is exhausted',
            'Highest total sum of card values wins',
            'Official tiebreaker: most 1s, then most 2s, etc.',
          ],
        },
        {
          id: 'sec-revolution',
          title: 'Pelusas Revolution Edition',
          icon: 'local_fire_department',
          content:
            'The Revolution edition introduces high player interaction and special cards: Little Devils / Diablillos (-7 points each), Vacuums (Aspira) to instantly bank a column, Traps (Atrapa) to steal columns, Insurance against busts, and Poisoned Gifts.',
          highlights: [
            'Diablillos: -7 points each (subtracted from score!)',
            'Action cards: Vacuum (Aspira), Steal (Atrapa), Insurance (Seguro)',
            'Special dust bunnies: Gifts, Angels, and Pairs',
          ],
        },
      ],
      full: [
        {
          id: 'full-prep',
          title: '1. Components and Setup',
          icon: 'layers',
          content:
            'Pelusas contains 110 dust bunny cards numbered 1 to 10 (13 cards each for numbers 1 to 5, and 9 cards each for numbers 6 to 10). Shuffle all cards thoroughly to prevent clumps of duplicate numbers. Place them face down in a messy pile at the center of the table called the "dust pile". The messiest player or agreed starter goes first.',
        },
        {
          id: 'full-fases',
          title: '2. Detailed Turn Phases',
          icon: 'play_arrow',
          content:
            'Every turn follows these mandatory phases:\n\n' +
            '• PHASE A - Secure Points: If you stopped safely in your previous turn, those face-up cards have survived your opponents’ turns. Move them face down to your personal score pile. They are now completely safe.\n\n' +
            '• PHASE B - Search for Dust Bunnies: Draw one card from the dust pile and place it face up in front of you. Group cards by number so all players can see them.\n\n' +
            '• PHASE C - Steal from Opponents: If your drawn card matches any face-up cards held by opponents, immediately take all cards of that number and add them to your row.\n\n' +
            '• PHASE D - Decision (Push or Stop?): If you stop, your turn ends and your cards remain exposed until your next turn. If you push your luck, return to Phase B.',
        },
        {
          id: 'full-riesgo',
          title: '3. The Draft of Wind (Busting)',
          icon: 'cyclone',
          content:
            'The heart of the game is risk management (push your luck). Drawing any card number you already have in front of you in your current turn triggers a draft of wind: every single card collected this turn (both drawn and stolen) is immediately discarded to the box. Knowing when to stop is the key to winning.',
        },
        {
          id: 'full-puntuacion',
          title: '4. Scoring & Official Tiebreak',
          icon: 'calculate',
          content:
            'As soon as the last card is drawn from the dust pile, the game ends immediately. Any player who still has face-up cards secures them into their score pile. Each player sums the numbers on all their collected cards.\n\n' +
            'Official Tiebreaker Rule (Reiner Knizia):\n' +
            '1. The player with the most number 1 cards wins.\n' +
            '2. If still tied, the player with the most number 2 cards wins.\n' +
            '3. Continue comparing card counts in ascending order (3, 4, 5...) until broken.',
        },
        {
          id: 'full-revolution',
          title: '5. Revolution Edition: Special Cards & Actions',
          icon: 'bolt',
          content:
            'In Pelusas Revolution, special cards shake up gameplay:\n\n' +
            '• Diablillos (-7 Points): Whenever a devil is drawn, the player must take it and all other visible devils on the table. Each subtracts 7 points from the final score.\n\n' +
            '• Aspira (Vacuum): An action card allowing you to immediately move an entire column of face-up cards to your safe score pile before risking further.\n\n' +
            '• Atrapa (Steal Column): Allows you to steal any opponent’s entire face-up column regardless of number.\n\n' +
            '• Seguro (Insurance): Discarded instead of losing your cards when drawing a duplicate number.\n\n' +
            '• Gifts & Angels: Gifts disrupt banking and angels provide direct positive scoring.',
        },
      ],
    },
  },
};
