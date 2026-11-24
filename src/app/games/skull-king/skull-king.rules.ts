import { GameRules } from '../../core/models/game.interface';

export const SKULL_KING_RULES: GameRules = {
  languages: ['es', 'en'],
  coverImage: '/assets/games/skull-king-rules.svg',
  content: {
    es: {
      summary: [
        {
          id: 'sk-sum-1',
          title: 'Mecánica de Apuesta',
          icon: 'target',
          content: 'Cada jugador apuesta cuántas bazas ganará en la ronda (de 0 a N cartas). En la cuenta de tres ("Yo-Ho-Ho"), todos revelan su apuesta con los dedos a la vez.',
          highlights: ['Apuesta simultánea', '0 a número de cartas de la ronda'],
        },
        {
          id: 'sk-sum-2',
          title: 'Puntuación Principal',
          icon: 'sports_score',
          content: 'Si aciertas tu apuesta: ganas +20 pts por baza ganada. Si fallas tu apuesta: pierdes -10 pts por cada baza de diferencia (por exceso o defecto).',
          highlights: ['Acierto: +20 pts/baza', 'Fallo: -10 pts/baza de error'],
        },
        {
          id: 'sk-sum-3',
          title: 'Apuesta Cero (0)',
          icon: 'star',
          content: 'Apostar 0 es de alto riesgo: si no ganas ninguna baza, obtienes +10 pts × número de la ronda (ej. ronda 5 = +50 pts). Si ganas al menos una baza, pierdes -10 pts × número de la ronda (-50 pts).',
          highlights: ['Éxito: +10 × Ronda', 'Fallo: -10 × Ronda'],
        },
        {
          id: 'sk-sum-4',
          title: 'Jerarquía y Bonificaciones Pirata',
          icon: 'diamond',
          content: 'Sirena gana a cartas numeradas y al Skull King (+40 pts). Piratas ganan a Sirenas y numeradas. Skull King gana a Piratas (+30 pts por cada pirata capturado). Kraken destruye la baza sin ganador. Tigresa puede jugarse como Escape o Pirata.',
          highlights: ['Sirena vence a Skull King (+40 pts)', 'Skull King vence a Piratas (+30 pts c/u)'],
        },
      ],
      full: [
        {
          id: 'sk-full-1',
          title: '1. Objetivo del Juego',
          icon: 'flag',
          content: 'Skull King se juega a lo largo de 10 rondas. El objetivo es predecir con exactitud cuántas bazas ganarás en cada ronda para acumular la mayor cantidad de puntos al final de la partida.',
        },
        {
          id: 'sk-full-2',
          title: '2. Preparación y Reparto',
          icon: 'layers',
          content: 'Baraja todas las cartas. En la Ronda 1, reparte 1 carta por jugador. En la Ronda 2, 2 cartas; así sucesivamente hasta la Ronda 10 con 10 cartas por jugador. El rol de repartidor rota en sentido horario tras cada ronda.',
        },
        {
          id: 'sk-full-3',
          title: '3. Fase de Apuestas (Bids)',
          icon: 'visibility',
          content: 'Tras ver su mano, todos los jugadores golpean tres veces la mesa al grito de "¡Yo-Ho-Ho!" y muestran simultáneamente con sus dedos cuántas bazas estiman que ganarán (de 0 al total de cartas repartidas).',
        },
        {
          id: 'sk-full-4',
          title: '4. Desarrollo de las Bazas',
          icon: 'sailing',
          content: 'El jugador a la izquierda del repartidor lidera la primera baza. Los jugadores deben asistir al palo de la primera carta numerada jugada. Si no tienen del palo, pueden jugar cualquier otro palo, triunfos (cartas negras Jolly Roger) o cartas especiales.',
        },
        {
          id: 'sk-full-5',
          title: '5. Jerarquía de Cartas Especiales',
          icon: 'military_tech',
          content: '• Escape / Bandera Blanca: Pierde siempre salvo que todos jueguen Escape.\n• Cartas Numeradas (1-14): Palo líder o palo negro (triunfo).\n• Sirenas: Vencen a cualquier carta numerada y al Skull King.\n• Piratas: Vencen a numeradas y a las Sirenas.\n• Skull King: Vence a todo, excepto a las Sirenas.\n• Tigresa: Se declara al jugarse como Escape o Pirata.\n• Kraken: Destruye la baza completa, nadie se la lleva.',
        },
        {
          id: 'sk-full-6',
          title: '6. Sistema de Puntuación Detallado',
          icon: 'calculate',
          content: '• Apuesta acertada (>0): +20 puntos por cada baza ganada.\n• Apuesta fallada (>0): -10 puntos por cada baza de diferencia.\n• Apuesta cero (0) acertada: +10 × Ronda actual.\n• Apuesta cero (0) fallada: -10 × Ronda actual.\n• Bonificaciones (solo si se acierta la apuesta):\n  - Capturar Skull King con Sirena: +40 pts.\n  - Capturar Piratas con Skull King: +30 pts por cada pirata capturado en la baza.\n  - Cartas de 14: +10 pts (+20 pts si es el 14 negro).',
        },
      ],
    },
    en: {
      summary: [
        {
          id: 'sk-en-sum-1',
          title: 'Bidding Mechanic',
          icon: 'target',
          content: 'Each player bids how many tricks they will win (from 0 to the number of cards in hand). On the count of three ("Yo-Ho-Ho"), all players reveal their bids simultaneously.',
          highlights: ['Simultaneous bid', '0 to round cards'],
        },
        {
          id: 'sk-en-sum-2',
          title: 'Core Scoring',
          icon: 'sports_score',
          content: 'If you make your bid: earn +20 points per trick won. If you fail your bid: lose -10 points for each trick difference (over or under).',
          highlights: ['Made: +20 pts/trick', 'Failed: -10 pts/trick diff'],
        },
        {
          id: 'sk-en-sum-3',
          title: 'Zero Bid (0)',
          icon: 'star',
          content: 'Bidding 0 is high risk, high reward: if you win 0 tricks, score +10 pts × current round number (e.g. Round 5 = +50 pts). If you take any trick, lose -10 pts × round number (-50 pts).',
          highlights: ['Success: +10 × Round', 'Failure: -10 × Round'],
        },
        {
          id: 'sk-en-sum-4',
          title: 'Pirate Hierarchy & Bonuses',
          icon: 'diamond',
          content: 'Mermaid beats Skull King (+40 pts bonus). Pirates beat Mermaids. Skull King beats Pirates (+30 pts each). Kraken destroys trick. Tigress acts as Escape or Pirate.',
          highlights: ['Mermaid captures Skull King (+40 pts)', 'Skull King captures Pirates (+30 pts each)'],
        },
      ],
      full: [
        {
          id: 'sk-en-full-1',
          title: '1. Game Objective',
          icon: 'flag',
          content: 'Skull King is played over 10 rounds. The goal is to accurately predict the number of tricks you will win in each round to achieve the highest cumulative score.',
        },
        {
          id: 'sk-en-full-2',
          title: '2. Setup and Deal',
          icon: 'layers',
          content: 'Shuffle the deck. Deal 1 card in Round 1, 2 cards in Round 2, up to 10 cards in Round 10. The dealer rotates clockwise each round.',
        },
        {
          id: 'sk-en-full-3',
          title: '3. Bidding Phase',
          icon: 'visibility',
          content: 'After inspecting their cards, players thump their fists three times chanting "Yo-Ho-Ho!" and simultaneously extend fingers to indicate their trick bid.',
        },
        {
          id: 'sk-en-full-4',
          title: '4. Playing Tricks',
          icon: 'sailing',
          content: 'Players must follow suit if they hold the lead suit. If they do not have that suit, they can play any color, black trumps (Jolly Roger), or special character cards.',
        },
        {
          id: 'sk-en-full-5',
          title: '5. Special Cards Hierarchy',
          icon: 'military_tech',
          content: '• Escape / White Flag: Always loses unless everyone plays Escape.\n• Number Cards: Standard hierarchy (Black suits trump other colors).\n• Mermaid: Beats numbered cards and the Skull King.\n• Pirates: Beat numbered cards and Mermaids.\n• Skull King: Beats all cards except Mermaids.\n• Tigress: Declared as Escape or Pirate when played.\n• Kraken: Destroys the trick, no one claims it.',
        },
        {
          id: 'sk-en-full-6',
          title: '6. Detailed Scoring Rules',
          icon: 'calculate',
          content: '• Exact Bid (>0): +20 points per trick won.\n• Missed Bid (>0): -10 points per trick difference.\n• Exact 0 Bid: +10 × Round number.\n• Missed 0 Bid: -10 × Round number.\n• Bonus points (awarded ONLY when bid is met):\n  - Mermaid captures Skull King: +40 pts.\n  - Skull King captures Pirate: +30 pts per pirate.\n  - Number 14 cards: +10 pts (+20 pts for Black 14).',
        },
      ],
    },
  },
};
