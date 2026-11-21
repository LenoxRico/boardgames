import { GameRules } from '../../core/models/game.interface';

export const TAKE_6_RULES: GameRules = {
  languages: ['es', 'en'],
  content: {
    es: {
      summary: [
        {
          id: 't6-sum-1',
          title: 'Objetivo y Condición de Victoria',
          icon: 'flag',
          content: 'El objetivo es acumular la MENOR cantidad de cuernos de buey posibles. La partida finaliza inmediatamente cuando un jugador alcanza o supera 66 cuernos. Gana quien tenga menos puntos.',
          highlights: ['Gana menor puntaje', 'Fin al superar 66 cuernos'],
        },
        {
          id: 't6-sum-2',
          title: 'Regla del Sexto Búfalo (Take 6)',
          icon: 'warning',
          content: 'Hay 4 filas de cartas en la mesa. Cada fila admite un máximo de 5 cartas. Quien deba colocar la 6ª carta en una fila debe recoger las 5 cartas previas y anotarse sus cuernos.',
          highlights: ['Fila de 5 cartas máximo', 'La 6ª carta recoge la fila'],
        },
        {
          id: 't6-sum-3',
          title: 'Valor de los Cuernos por Carta',
          icon: 'pets',
          content: '• Cartas regulares: 1 cuerno.\n• Múltiplos de 5 (5, 15, 25...): 2 cuernos.\n• Múltiplos de 10 (10, 20, 30...): 3 cuernos.\n• Dobles (11, 22, 33...): 5 cuernos.\n• ¡El 55 tiene 7 cuernos!',
          highlights: ['Dobles = 5 cuernos', '55 = 7 cuernos'],
        },
      ],
      full: [
        {
          id: 't6-full-1',
          title: '1. Preparación de la Mesa',
          icon: 'table_restaurant',
          content: 'La baraja cuenta con 104 cartas numeradas del 1 al 104. Se reparten 10 cartas a cada jugador. Se colocan 4 cartas boca arriba en el centro formando el inicio de 4 filas.',
        },
        {
          id: 't6-full-2',
          title: '2. Selección y Revelación Simultánea',
          icon: 'visibility',
          content: 'En cada turno, todos los jugadores eligen simultáneamente 1 carta de su mano y la colocan boca abajo. Una vez todos han elegido, se revelan a la vez.',
        },
        {
          id: 't6-full-3',
          title: '3. Colocación en Filas en Orden Ascendente',
          icon: 'sort',
          content: 'Las cartas se colocan por orden de menor a mayor valor siguiendo dos reglas básicas:\n1) Orden ascendente: Debe ir en una fila cuyo valor final sea menor que la carta jugada.\n2) Diferencia mínima: Debe colocarse en la fila con la menor diferencia respecto al último número.',
        },
        {
          id: 't6-full-4',
          title: '4. ¿Qué pasa si tu carta es menor que todas las filas?',
          icon: 'low_priority',
          content: 'Si tu carta es más baja que el final de las 4 filas, debes elegir voluntariamente una fila completa, recogerla para tu pila de penalización y dejar tu carta como inicio de esa fila.',
        },
        {
          id: 't6-full-5',
          title: '5. La 6ª Carta (¡Toma 6!)',
          icon: 'gavel',
          content: 'Si tu carta es la 6ª en una fila, recoges las 5 cartas de esa fila para tu marcador de penalización. Tu carta queda como la primera carta de la nueva fila.',
        },
        {
          id: 't6-full-6',
          title: '6. Fin de Partida y Puntuación',
          icon: 'emoji_events',
          content: 'Al agotar las 10 cartas de la mano, se contabilizan los cuernos recogidos. Si alguien llega o supera 66 cuernos, la partida termina. El jugador con MENOS cuernos se corona campeón.',
        },
      ],
    },
    en: {
      summary: [
        {
          id: 't6-en-sum-1',
          title: 'Goal and Victory Condition',
          icon: 'flag',
          content: 'The goal is to collect as FEW bullheads as possible. The game ends immediately when a player reaches or exceeds 66 bullheads. Lowest score wins.',
          highlights: ['Lowest score wins', 'Ends at 66+ bullheads'],
        },
        {
          id: 't6-en-sum-2',
          title: 'The 6th Card Rule',
          icon: 'warning',
          content: 'There are 4 rows on the table. Each holds up to 5 cards. Whoever plays the 6th card in a row must take the first 5 cards and suffer their bullheads penalty.',
          highlights: ['Max 5 cards per row', '6th card takes the row'],
        },
        {
          id: 't6-en-sum-3',
          title: 'Bullheads Values',
          icon: 'pets',
          content: '• Regular cards: 1 bullhead.\n• Multiples of 5 (5, 15, 25...): 2 bullheads.\n• Multiples of 10 (10, 20, 30...): 3 bullheads.\n• Double digits (11, 22, 33...): 5 bullheads.\n• Card 55 has 7 bullheads!',
          highlights: ['Doubles = 5 bullheads', 'Card 55 = 7 bullheads'],
        },
      ],
      full: [
        {
          id: 't6-en-full-1',
          title: '1. Setup',
          icon: 'table_restaurant',
          content: 'The deck contains 104 cards (1 to 104). Deal 10 cards to each player. Place 4 cards face up in the center to start 4 rows.',
        },
        {
          id: 't6-en-full-2',
          title: '2. Simultaneous Play',
          icon: 'visibility',
          content: 'Each round, players secretly choose 1 card from hand and place it face down. All chosen cards are revealed simultaneously.',
        },
        {
          id: 't6-en-full-3',
          title: '3. Row Placement in Ascending Order',
          icon: 'sort',
          content: 'Cards are placed from lowest to highest. Two rules apply:\n1) Ascending: A card must be placed in a row where the last card is lower than it.\n2) Lowest difference: Place it in the row with the smallest numerical difference.',
        },
        {
          id: 't6-en-full-4',
          title: '4. Playing a Card Lower Than All Rows',
          icon: 'low_priority',
          content: 'If your card is lower than the end card of all four rows, you must pick any row of your choice, take all its cards as penalty, and start a new row with your card.',
        },
        {
          id: 't6-en-full-5',
          title: '5. The 6th Card (Take 6!)',
          icon: 'gavel',
          content: 'If your card becomes the 6th card in a row, you take the 5 cards in that row into your penalty stack. Your card remains as the 1st card in the row.',
        },
        {
          id: 't6-en-full-6',
          title: '6. End of Game & Scoring',
          icon: 'emoji_events',
          content: 'After 10 cards are played, score bullheads. If any player hits 66 or more, game ends. The player with the fewest bullheads wins.',
        },
      ],
    },
  },
};
