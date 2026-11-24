import { GameRules } from '../../core/models/game.interface';

export const HITSTER_RULES: GameRules = {
  languages: ['es', 'en'],
  content: {
    es: {
      summary: [
        {
          id: 'goal',
          title: 'Objetivo de la Fiesta',
          icon: 'flag',
          content:
            '¡Sé el primer jugador o equipo en construir una línea de tiempo cronológica con 10 canciones de los últimos 100 años de éxitos!',
        },
        {
          id: 'turn-flow',
          title: 'El Turno del DJ',
          icon: 'album',
          content:
            '1. El DJ escanea el código QR de una carta física o pulsa "Sacar Canción Aleatoria" en Modo Digital.\n2. La música suena sin mostrar título, artista ni año.\n3. El jugador en turno decide dónde colocarla en su línea de tiempo (antes, entre o después de sus cartas actuales).\n4. ¡Cuidado con los rivales! Pueden usar sus fichas Hitster para desafiar la posición.\n5. El DJ pulsa "Revelar": si está bien colocada, ¡la carta se suma a su línea de tiempo!',
        },
        {
          id: 'digital-mode-rule',
          title: 'Modo Digital (Sin Cartas Físicas)',
          icon: 'shuffle',
          content:
            '¿No tienes las cartas físicas de Hitster Latino o quieres jugar de viaje? Activa el interruptor "Digital: ON". En cada turno, la app saca una canción aleatoria de la baraja oficial (incluyendo Hitster Latino con más de 300 éxitos) sin repetir canciones en la partida.',
        },
        {
          id: 'hitster-tokens',
          title: 'Fichas Hitster',
          icon: 'monetization_on',
          content:
            'Todos comienzan con 3 fichas Hitster:\n• 1 Ficha para Desafiar / Robar: Colócala donde crees que va la canción de un rival antes de revelarla. Si aciertas, ¡te quedas la carta!\n• 1 Ficha para Pasar: Cambia una canción si no tienes idea.\n• 3 Fichas para Comprar: Añade una carta directamente a tu línea de tiempo.\n• Gana 1 Ficha: Acierta el Nombre del Artista y el Título exacto.',
        },
        {
          id: 'game-modes',
          title: 'Modos de Juego',
          icon: 'tune',
          content:
            '• Original: Orden cronológico puro + fichas de desafío.\n• Pro: Gana fichas extra si sabes el artista y el título exacto.\n• Expert: Debes saber el año exacto de lanzamiento además de la posición.\n• Cooperativo: ¡Todos juegan en equipo para crear una sola línea de tiempo de 10 éxitos!',
        },
      ],
      full: [
        {
          id: 'full-prep',
          title: '1. Preparación y Componentes',
          icon: 'layers',
          content:
            'Coloca el mazo de cartas de Hitster boca abajo sobre la mesa. Cada jugador recibe 1 carta inicial colocada boca arriba (con el año y datos visibles) como punto de partida de su línea de tiempo cronológica, además de 3 fichas Hitster iniciales.',
        },
        {
          id: 'full-flow',
          title: '2. Dinámica del Turno',
          icon: 'play_circle',
          content:
            'Por turnos, un jugador actúa como DJ (o el rol rota en sentido de las agujas del reloj):\n\n1. El DJ toma la carta superior y escanea su código QR con la app.\n2. Spotify reproduce la canción. ¡El jugador activo no debe ver el reverso de la carta!\n3. El jugador escucha la melodía y coloca la carta boca abajo en el lugar correspondiente de su línea de tiempo: a la izquierda de canciones más recientes, a la derecha de canciones más antiguas o entre dos canciones intermedias.\n4. Si el jugador no conoce la canción, puede gastar 1 ficha Hitster para descartarla y solicitar una nueva.',
        },
        {
          id: 'full-challenges',
          title: '3. Desafíos con Fichas Hitster (Robo de Carta)',
          icon: 'swords',
          content:
            'Antes de que el DJ revele el año de la carta:\n\nCualquier oponente puede gritar "¡HITSTER!" y colocar una de sus fichas Hitster en la posición de la línea de tiempo donde cree que realmente encaja la canción.\n\n• Si el jugador activo falló y el rival acertó: El rival roba la carta para su propia línea de tiempo y recupera su ficha.\n• Si el rival se equivocó: Pierde su ficha Hitster y va a la reserva.',
        },
        {
          id: 'full-reveal',
          title: '4. Revelación y Puntuación',
          icon: 'visibility',
          content:
            'El DJ pulsa "Revelar Canción y Año" en la app:\n\n• Si la carta está en la posición cronológica correcta respecto a las cartas que ya tiene el jugador, se voltea boca arriba y queda permanentemente en su línea de tiempo.\n• Si está mal ubicada y ningún rival la desafió correctamente, la carta se descarta al cementerio.\n• En Modo Pro o Expert, si el jugador dijo en voz alta el artista y el título exactos antes de la revelación, recibe 1 ficha Hitster adicional.',
        },
        {
          id: 'full-victory',
          title: '5. Fin de la Partida y Desempate',
          icon: 'trophy',
          content:
            'El primer jugador que consiga colocar 10 cartas en orden cronológico en su línea de tiempo se corona como el Campeón de Hitster. En caso de que varios jugadores alcancen 10 cartas en la misma ronda, el desempate se decide a favor de quien tenga más fichas Hitster restantes.',
        },
      ],
    },
    en: {
      summary: [
        {
          id: 'goal-en',
          title: 'Party Objective',
          icon: 'flag',
          content:
            'Be the first player or team to build a chronological timeline with 10 hit songs from the last 100 years of music history!',
        },
        {
          id: 'turn-flow-en',
          title: 'The DJ Turn',
          icon: 'album',
          content:
            '1. The DJ scans the card QR code using the app.\n2. The music plays without revealing the title, artist, or release year.\n3. The active player places the card in their timeline (before, between, or after their current cards).\n4. Opponents may challenge using their Hitster tokens!\n5. Tap "Reveal": if placed correctly, the song joins their timeline.',
        },
        {
          id: 'hitster-tokens-en',
          title: 'Hitster Tokens',
          icon: 'monetization_on',
          content:
            'Each player starts with 3 Hitster tokens:\n• 1 Token to Challenge / Steal: place it where you think the card belongs. If you are right, you steal the card!\n• 1 Token to Skip: discard a song you do not recognize.\n• 3 Tokens to Buy: claim a card directly for your timeline.\n• Earn 1 Token: correctly name both the Artist and Title before revealing.',
        },
        {
          id: 'game-modes-en',
          title: 'Game Modes',
          icon: 'tune',
          content:
            '• Original: Timeline placement + challenge tokens.\n• Pro: Earn extra tokens by naming artist & title.\n• Expert: Exact year required alongside placement.\n• Cooperative: Everyone works together to build a shared 10-card timeline!',
        },
      ],
      full: [
        {
          id: 'full-prep-en',
          title: '1. Setup & Components',
          icon: 'layers',
          content:
            'Place the Hitster card deck face down in the center of the table. Each player receives 1 starter card face up (with year visible) as their timeline anchor, plus 3 Hitster tokens.',
        },
        {
          id: 'full-flow-en',
          title: '2. Turn Flow',
          icon: 'play_circle',
          content:
            'Players take turns being the DJ:\n\n1. The DJ scans the QR code on the top card.\n2. Spotify plays the track. Active player must not see the card back!\n3. The player decides where the track belongs chronologically relative to their existing cards.\n4. If stuck, spend 1 Hitster token to skip.',
        },
        {
          id: 'full-challenges-en',
          title: '3. Challenges with Hitster Tokens',
          icon: 'swords',
          content:
            'Before the DJ reveals the year, any rival can yell "HITSTER!" and place a token on the spot they think the song belongs.\n\n• If active player was wrong and rival was right: rival steals the card and keeps their token.\n• If rival was wrong: they lose their token.',
        },
        {
          id: 'full-reveal-en',
          title: '4. Reveal & Scoring',
          icon: 'visibility',
          content:
            'The DJ taps "Reveal Song & Year":\n\n• If placed correctly, the card is flipped face-up in the timeline.\n• If wrong and not stolen, it is discarded.\n• In Pro or Expert modes, naming artist and title earns +1 Hitster token.',
        },
        {
          id: 'full-victory-en',
          title: '5. Game End & Tiebreaker',
          icon: 'trophy',
          content:
            'The first player to reach 10 cards in their timeline wins the game! Ties are broken by whoever holds the most Hitster tokens.',
        },
      ],
    },
  },
};
