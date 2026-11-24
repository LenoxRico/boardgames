import { GameEngine } from '../../core/models/game.interface';

export type HitsterGameMode = 'original' | 'pro' | 'expert' | 'cooperative';
export type MusicProvider = 'spotify' | 'itunes';
export type SpotifyTier = 'free' | 'premium';

export interface HitsterMusicSettings {
  provider: MusicProvider;
  spotifyTier: SpotifyTier;
  spotifyLinkedUser?: string;
  isSpotifyLinked?: boolean;
}

export interface HitsterConfig {
  targetCards: number; // Número de cartas en la línea de tiempo para ganar (10 por defecto)
  startingTokens: number; // Fichas Hitster iniciales por jugador (3 por defecto)
  gameMode: HitsterGameMode; // 'original' | 'pro' | 'expert' | 'cooperative'
  timerSeconds: number; // Duración del temporizador de escucha en segundos (30 por defecto)
  preferredMusicProvider?: MusicProvider; // 'spotify' | 'itunes'
  isDigitalMode?: boolean; // Jugar 100% digital sin cartas físicas (aleatorio)
  digitalDeckEdition?: 'latino' | 'us' | 'es' | 'all'; // Edición digital para sacar canciones ('latino' por defecto)
}

export interface HitsterTimelineCard {
  id: string;
  cardId?: string; // Número de carta (ej. "00023")
  title: string;
  artist: string;
  year: number; // Año oficial de lanzamiento
  albumArt?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
}

export interface HitsterRoundInput {
  cardsWon: number; // Cartas ganadas / añadidas a la línea de tiempo en este turno/ronda
  tokensDelta: number; // Cambio neto de fichas Hitster (+1 ganado, -1 gastado, etc.)
  cardsStolen?: number; // Cartas robadas a oponentes mediante desafío correcto
  challengesLost?: number; // Fichas perdidas por desafíos erróneos
  songsSkipped?: number; // Fichas gastadas para pasar / cambiar de canción
  perfectGuesses?: number; // Fichas ganadas por adivinar artista + título (Pro/Expert)
  tokensSpentForCard?: number; // Fichas gastadas (3 fichas) para comprar la carta directamente
  wonCardsDetails?: HitsterTimelineCard[]; // Detalles de las cartas ganadas para la línea de tiempo
}

export interface HitsterRoundResult {
  playerId: string;
  roundCards: number;
  roundTokensDelta: number;
  totalCards: number; // Total acumulado de cartas en la línea de tiempo
  totalTokens: number; // Total acumulado de fichas en mano
  roundScore: number; // Puntaje de la ronda (igual a roundCards)
  cumulativeScore: number; // Puntos acumulados oficiales (totalCards)
  isWinner: boolean; // ¿Alcanzó la meta de cartas para ganar?
}

export interface HitsterRanking {
  playerId: string;
  totalCards: number;
  totalTokens: number;
  rank: number;
  isWinner: boolean;
}

export interface SpotifyTrackInfo {
  trackId?: string;
  url: string;
  embedUrl?: string;
  appUri?: string;
  cardId?: string;
  country?: string;
  isHitsterCard?: boolean;
}

export interface ItunesTrackInfo {
  trackName: string;
  artistName: string;
  year?: number;
  previewUrl?: string;
  artworkUrl?: string;
  trackViewUrl?: string;
}

export interface HitsterDemoTrack {
  id: string;
  title: string;
  artist: string;
  year: number;
  decade: string;
  category?: 'latino' | 'global';
  spotifyTrackId: string;
  spotifyUrl: string;
  itunesSearchTerm?: string;
}

/**
 * Consulta la API oficial y pública de iTunes / Apple Music (con CORS habilitado)
 * para obtener la vista previa oficial de audio de 30 segundos, el año de lanzamiento
 * y la portada del álbum.
 */
export async function searchItunesTrack(term: string): Promise<ItunesTrackInfo | null> {
  if (!term || typeof term !== 'string' || !term.trim()) return null;
  try {
    const encoded = encodeURIComponent(term.trim());
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encoded}&entity=song&limit=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const item = data.results[0];
      let year: number | undefined;
      if (item.releaseDate) {
        const d = new Date(item.releaseDate);
        if (!isNaN(d.getFullYear())) {
          year = d.getFullYear();
        }
      }
      return {
        trackName: item.trackName,
        artistName: item.artistName,
        year,
        previewUrl: item.previewUrl,
        artworkUrl: item.artworkUrl100 || item.artworkUrl60,
        trackViewUrl: item.trackViewUrl,
      };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Catálogo enriquecido de canciones de demostración por décadas (1960s - 2020s)
 * combinando grandes himnos latinos (Hitster Latino) y clásicos internacionales
 * para jugar de forma inmediata en Modo Digital o probar el reproductor DJ.
 */
export const HITSTER_DEMO_TRACKS: HitsterDemoTrack[] = [
  // --- CLÁSICOS INTERNACIONALES ---
  {
    id: 'demo-1965',
    title: "(I Can't Get No) Satisfaction",
    artist: 'The Rolling Stones',
    year: 1965,
    decade: '60s',
    category: 'global',
    spotifyTrackId: '2PzDXAhNmMy1lD634o2ZgV',
    spotifyUrl: 'https://open.spotify.com/track/2PzDXAhNmMy1lD634o2ZgV',
    itunesSearchTerm: 'Rolling Stones Satisfaction',
  },
  {
    id: 'demo-1975',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    year: 1975,
    decade: '70s',
    category: 'global',
    spotifyTrackId: '4u7EnebtmKWzUH433cf5Qv',
    spotifyUrl: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
    itunesSearchTerm: 'Queen Bohemian Rhapsody',
  },
  {
    id: 'demo-1976',
    title: 'Dancing Queen',
    artist: 'ABBA',
    year: 1976,
    decade: '70s',
    category: 'global',
    spotifyTrackId: '0GjEhRrOhbyBMr7KG5p0m4',
    spotifyUrl: 'https://open.spotify.com/track/0GjEhRrOhbyBMr7KG5p0m4',
    itunesSearchTerm: 'ABBA Dancing Queen',
  },
  {
    id: 'demo-1982',
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    year: 1982,
    decade: '80s',
    category: 'global',
    spotifyTrackId: '5ChkMS8Otdzsq2hnSt4Omm',
    spotifyUrl: 'https://open.spotify.com/track/5ChkMS8Otdzsq2hnSt4Omm',
    itunesSearchTerm: 'Michael Jackson Billie Jean',
  },
  {
    id: 'demo-1983',
    title: 'Sweet Dreams (Are Made of This)',
    artist: 'Eurythmics',
    year: 1983,
    decade: '80s',
    category: 'global',
    spotifyTrackId: '1TfqLAPs4KFs2HQ6AyFYxm',
    spotifyUrl: 'https://open.spotify.com/track/1TfqLAPs4KFs2HQ6AyFYxm',
    itunesSearchTerm: 'Eurythmics Sweet Dreams',
  },
  {
    id: 'demo-1987',
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    year: 1987,
    decade: '80s',
    category: 'global',
    spotifyTrackId: '4cOdK2wGLETKBW3PvgPWqT',
    spotifyUrl: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    itunesSearchTerm: 'Rick Astley Never Gonna Give You Up',
  },
  {
    id: 'demo-1991',
    title: 'Smells Like Teen Spirit',
    artist: 'Nirvana',
    year: 1991,
    decade: '90s',
    category: 'global',
    spotifyTrackId: '5ghIWrM2980CTj0fI9vFIO',
    spotifyUrl: 'https://open.spotify.com/track/5ghIWrM2980CTj0fI9vFIO',
    itunesSearchTerm: 'Nirvana Smells Like Teen Spirit',
  },
  {
    id: 'demo-1999',
    title: '...Baby One More Time',
    artist: 'Britney Spears',
    year: 1999,
    decade: '90s',
    category: 'global',
    spotifyTrackId: '3MjUtNVVq3C8Fn0MP3zhcW',
    spotifyUrl: 'https://open.spotify.com/track/3MjUtNVVq3C8Fn0MP3zhcW',
    itunesSearchTerm: 'Britney Spears Baby One More Time',
  },
  {
    id: 'demo-2003',
    title: 'Crazy In Love',
    artist: 'Beyoncé ft. JAY-Z',
    year: 2003,
    decade: '00s',
    category: 'global',
    spotifyTrackId: '5IVuqXILoxVWvWEPm82Jxr',
    spotifyUrl: 'https://open.spotify.com/track/5IVuqXILoxVWvWEPm82Jxr',
    itunesSearchTerm: 'Beyonce Crazy In Love',
  },
  {
    id: 'demo-2011',
    title: 'Rolling in the Deep',
    artist: 'Adele',
    year: 2011,
    decade: '10s',
    category: 'global',
    spotifyTrackId: '4OSBTYWVwsQhGLF9v0E957',
    spotifyUrl: 'https://open.spotify.com/track/4OSBTYWVwsQhGLF9v0E957',
    itunesSearchTerm: 'Adele Rolling in the Deep',
  },
  {
    id: 'demo-2013',
    title: 'Get Lucky',
    artist: 'Daft Punk ft. Pharrell Williams',
    year: 2013,
    decade: '10s',
    category: 'global',
    spotifyTrackId: '2Foc5Q5nqNiosCNqttzHof',
    spotifyUrl: 'https://open.spotify.com/track/2Foc5Q5nqNiosCNqttzHof',
    itunesSearchTerm: 'Daft Punk Get Lucky',
  },
  {
    id: 'demo-2020',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    year: 2020,
    decade: '20s',
    category: 'global',
    spotifyTrackId: '0VjIjW4GlULA7k21f1Jglc',
    spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlULA7k21f1Jglc',
    itunesSearchTerm: 'The Weeknd Blinding Lights',
  },

  // --- ÉXITOS LATINOS (HITSTER LATINO) ---
  {
    id: 'demo-lat-1978',
    title: 'Pedro Navaja',
    artist: 'Rubén Blades & Willie Colón',
    year: 1978,
    decade: '70s',
    category: 'latino',
    spotifyTrackId: '0l1zBq81KjL7NlqB4G1u24',
    spotifyUrl: 'https://open.spotify.com/track/0l1zBq81KjL7NlqB4G1u24',
    itunesSearchTerm: 'Ruben Blades Pedro Navaja',
  },
  {
    id: 'demo-lat-1985',
    title: 'Devuélveme a mi chica',
    artist: 'Hombres G',
    year: 1985,
    decade: '80s',
    category: 'latino',
    spotifyTrackId: '46c5N6v6gZ1r6kP014N0Nq',
    spotifyUrl: 'https://open.spotify.com/track/46c5N6v6gZ1r6kP014N0Nq',
    itunesSearchTerm: 'Hombres G Devuelveme a mi chica',
  },
  {
    id: 'demo-lat-1988',
    title: 'La Incondicional',
    artist: 'Luis Miguel',
    year: 1988,
    decade: '80s',
    category: 'latino',
    spotifyTrackId: '6naxalmIoLFYR06082162q',
    spotifyUrl: 'https://open.spotify.com/track/6naxalmIoLFYR06082162q',
    itunesSearchTerm: 'Luis Miguel La Incondicional',
  },
  {
    id: 'demo-lat-1990',
    title: 'De Música Ligera',
    artist: 'Soda Stereo',
    year: 1990,
    decade: '90s',
    category: 'latino',
    spotifyTrackId: '1TfZhKjK12x425J4dJ4K4U',
    spotifyUrl: 'https://open.spotify.com/track/1TfZhKjK12x425J4dJ4K4U',
    itunesSearchTerm: 'Soda Stereo De Musica Ligera',
  },
  {
    id: 'demo-lat-1993',
    title: 'Macarena',
    artist: 'Los Del Río',
    year: 1993,
    decade: '90s',
    category: 'latino',
    spotifyTrackId: '1lO9O51Y48m0mH5f0Z27vK',
    spotifyUrl: 'https://open.spotify.com/track/1lO9O51Y48m0mH5f0Z27vK',
    itunesSearchTerm: 'Los Del Rio Macarena',
  },
  {
    id: 'demo-lat-1996',
    title: 'La Flaca',
    artist: 'Jarabe de Palo',
    year: 1996,
    decade: '90s',
    category: 'latino',
    spotifyTrackId: '7d0Z7iE411lC4q9M6iSj1Q',
    spotifyUrl: 'https://open.spotify.com/track/7d0Z7iE411lC4q9M6iSj1Q',
    itunesSearchTerm: 'Jarabe de Palo La Flaca',
  },
  {
    id: 'demo-lat-1998',
    title: 'Suavemente',
    artist: 'Elvis Crespo',
    year: 1998,
    decade: '90s',
    category: 'latino',
    spotifyTrackId: '2flP1tqV7q15ZtM7wJ5P0G',
    spotifyUrl: 'https://open.spotify.com/track/2flP1tqV7q15ZtM7wJ5P0G',
    itunesSearchTerm: 'Elvis Crespo Suavemente',
  },
  {
    id: 'demo-lat-2002',
    title: 'A Dios le Pido',
    artist: 'Juanes',
    year: 2002,
    decade: '00s',
    category: 'latino',
    spotifyTrackId: '2wA4pT8CvdqD52g3Vb1G2k',
    spotifyUrl: 'https://open.spotify.com/track/2wA4pT8CvdqD52g3Vb1G2k',
    itunesSearchTerm: 'Juanes A Dios le Pido',
  },
  {
    id: 'demo-lat-2004',
    title: 'Gasolina',
    artist: 'Daddy Yankee',
    year: 2004,
    decade: '00s',
    category: 'latino',
    spotifyTrackId: '6ia35bK2g3P4dG5q1H9K2G',
    spotifyUrl: 'https://open.spotify.com/track/6ia35bK2g3P4dG5q1H9K2G',
    itunesSearchTerm: 'Daddy Yankee Gasolina',
  },
  {
    id: 'demo-lat-2004-b',
    title: 'La Camisa Negra',
    artist: 'Juanes',
    year: 2004,
    decade: '00s',
    category: 'latino',
    spotifyTrackId: '2cOuFfQ3rB9J7j2W2s2Z0D',
    spotifyUrl: 'https://open.spotify.com/track/2cOuFfQ3rB9J7j2W2s2Z0D',
    itunesSearchTerm: 'Juanes La Camisa Negra',
  },
  {
    id: 'demo-lat-2005',
    title: "Hips Don't Lie",
    artist: 'Shakira ft. Wyclef Jean',
    year: 2005,
    decade: '00s',
    category: 'latino',
    spotifyTrackId: '3ZFTkvIEUrbd9VuvqYumQg',
    spotifyUrl: 'https://open.spotify.com/track/3ZFTkvIEUrbd9VuvqYumQg',
    itunesSearchTerm: 'Shakira Hips Dont Lie',
  },
  {
    id: 'demo-lat-2010',
    title: 'Danza Kuduro',
    artist: 'Don Omar ft. Lucenzo',
    year: 2010,
    decade: '10s',
    category: 'latino',
    spotifyTrackId: '2a1TDV10j4rT0k1J2d8g5h',
    spotifyUrl: 'https://open.spotify.com/track/2a1TDV10j4rT0k1J2d8g5h',
    itunesSearchTerm: 'Don Omar Danza Kuduro',
  },
  {
    id: 'demo-lat-2014',
    title: 'Bailando',
    artist: 'Enrique Iglesias ft. Descemer Bueno, Gente de Zona',
    year: 2014,
    decade: '10s',
    category: 'latino',
    spotifyTrackId: '0e8jX1mF4K1nK8j6h8K5L2',
    spotifyUrl: 'https://open.spotify.com/track/0e8jX1mF4K1nK8j6h8K5L2',
    itunesSearchTerm: 'Enrique Iglesias Bailando',
  },
  {
    id: 'demo-lat-2017',
    title: 'Despacito',
    artist: 'Luis Fonsi ft. Daddy Yankee',
    year: 2017,
    decade: '10s',
    category: 'latino',
    spotifyTrackId: '6habFhsOp2NvshLv26DqMb',
    spotifyUrl: 'https://open.spotify.com/track/6habFhsOp2NvshLv26DqMb',
    itunesSearchTerm: 'Luis Fonsi Despacito',
  },
  {
    id: 'demo-lat-2017-b',
    title: 'Mi Gente',
    artist: 'J Balvin & Willy William',
    year: 2017,
    decade: '10s',
    category: 'latino',
    spotifyTrackId: '1DoK3CdipMjplLk5LXUdcp',
    spotifyUrl: 'https://open.spotify.com/track/1DoK3CdipMjplLk5LXUdcp',
    itunesSearchTerm: 'J Balvin Mi Gente',
  },
  {
    id: 'demo-lat-2020',
    title: 'Dákiti',
    artist: 'Bad Bunny & Jhayco',
    year: 2020,
    decade: '20s',
    category: 'latino',
    spotifyTrackId: '47EiUVwUp4IrFuG6BCu9bP',
    spotifyUrl: 'https://open.spotify.com/track/47EiUVwUp4IrFuG6BCu9bP',
    itunesSearchTerm: 'Bad Bunny Dakiti',
  },
  {
    id: 'demo-lat-2021',
    title: 'Todo de Ti',
    artist: 'Rauw Alejandro',
    year: 2021,
    decade: '20s',
    category: 'latino',
    spotifyTrackId: '4fSIb4hdOQ151TILNsSEaJ',
    spotifyUrl: 'https://open.spotify.com/track/4fSIb4hdOQ151TILNsSEaJ',
    itunesSearchTerm: 'Rauw Alejandro Todo de Ti',
  },
  {
    id: 'demo-lat-2023',
    title: 'Bzrp Music Sessions, Vol. 53',
    artist: 'Bizarrap & Shakira',
    year: 2023,
    decade: '20s',
    category: 'latino',
    spotifyTrackId: '4nr1w0m4o3m0Z1w0p2h0z1',
    spotifyUrl: 'https://open.spotify.com/track/4nr1w0m4o3m0Z1w0p2h0z1',
    itunesSearchTerm: 'Bizarrap Shakira Bzrp Music Sessions Vol 53',
  },
];

/**
 * Diccionario integrado de cartas Hitster fundamentales (ediciones Latino, US y España)
 * para garantizar resolución offline inmediata y cobertura en pruebas unitarias.
 */
export const HITSTER_CORE_CARDS: Record<string, Record<string, string>> = {
  latino: {
    '00001': '1Ikzf2CUcmHzNf4ETPJexW',
    '1': '1Ikzf2CUcmHzNf4ETPJexW',
    '00002': '3OOWm0MiN6yL4eJsJNXyYk',
    '2': '3OOWm0MiN6yL4eJsJNXyYk',
    '00003': '6JAUEdbkqPJYp4EeH3a3FU',
    '3': '6JAUEdbkqPJYp4EeH3a3FU',
    '00004': '1lDx45n8dnAU1v9yct5bxU',
    '4': '1lDx45n8dnAU1v9yct5bxU',
    '00010': '2nkgtQejMhfvrpH5KIzIub',
    '10': '2nkgtQejMhfvrpH5KIzIub',
    '00020': '1p7m9H4H8s0Y7SgRm7j3ED',
    '20': '1p7m9H4H8s0Y7SgRm7j3ED',
    '00100': '06CjoRh35NWhEmpPPs1nzD',
    '100': '06CjoRh35NWhEmpPPs1nzD',
    '00200': '45rQqSqb95p5lkZy13Tl1u',
    '200': '45rQqSqb95p5lkZy13Tl1u',
    '00306': '3gO8mvkxIcyF9N7Vd1WM2i',
    '306': '3gO8mvkxIcyF9N7Vd1WM2i',
    '00307': '3slDIEuZJqMRq0P0UI8Ps9',
    '307': '3slDIEuZJqMRq0P0UI8Ps9',
    '00308': '1DoK3CdipMjplLk5LXUdcp',
    '308': '1DoK3CdipMjplLk5LXUdcp',
  },
  mx: {
    '00001': '1Ikzf2CUcmHzNf4ETPJexW',
    '1': '1Ikzf2CUcmHzNf4ETPJexW',
    '00002': '3OOWm0MiN6yL4eJsJNXyYk',
    '2': '3OOWm0MiN6yL4eJsJNXyYk',
    '00308': '1DoK3CdipMjplLk5LXUdcp',
    '308': '1DoK3CdipMjplLk5LXUdcp',
  },
  us: {
    '00001': '0KMGxYKeUzK9wc5DZCt3HT',
    '1': '0KMGxYKeUzK9wc5DZCt3HT',
    '00002': '7o2CTH4ctstm8TNelqjb51',
    '2': '7o2CTH4ctstm8TNelqjb51',
    '00003': '3L7RtEcu1Hw3OXrpnthngx',
    '3': '3L7RtEcu1Hw3OXrpnthngx',
    '00010': '5jUA1njy3h6ynHLvPdEVHt',
    '10': '5jUA1njy3h6ynHLvPdEVHt',
    '00020': '4aTCNddtjztjuK2EOgz7ZZ',
    '20': '4aTCNddtjztjuK2EOgz7ZZ',
    '00066': '6epn3r7S14KUqlReYr77hA',
    '66': '6epn3r7S14KUqlReYr77hA',
    '00100': '62AuGbAkt8Ox2IrFFb8GKV',
    '100': '62AuGbAkt8Ox2IrFFb8GKV',
    '00200': '57yz5oqMytzbwdewSG28L9',
    '200': '57yz5oqMytzbwdewSG28L9',
    '00268': '55CHeLEfn5iJ0IIkgaa4si',
    '268': '55CHeLEfn5iJ0IIkgaa4si',
  },
  es: {
    '00001': '0pQskrTITgmCMyr85tb9qq',
    '1': '0pQskrTITgmCMyr85tb9qq',
    '00002': '5Hu3Y13dE9rEZire0tlAMW',
    '2': '5Hu3Y13dE9rEZire0tlAMW',
    '00003': '7iL6o9tox1zgHpKUfh9vuC',
    '3': '7iL6o9tox1zgHpKUfh9vuC',
    '00010': '40riOy7x9W7GXjyGp4pjAv',
    '10': '40riOy7x9W7GXjyGp4pjAv',
    '00020': '7GrAOZRMBhUPN5PdbJZVO9',
    '20': '7GrAOZRMBhUPN5PdbJZVO9',
    '00100': '08bNPGLD8AhKpnnERrAc6G',
    '100': '08bNPGLD8AhKpnnERrAc6G',
    '00200': '4pt5fDVTg5GhEvEtlz9dKk',
    '200': '4pt5fDVTg5GhEvEtlz9dKk',
    '00268': '5RzFJd6W40SDTyZkX6xx45',
    '268': '5RzFJd6W40SDTyZkX6xx45',
  },
};

/**
 * Selecciona al azar una carta de la baraja especificada que no haya sido jugada aún.
 * Soporta normalización de números de carta con o sin ceros a la izquierda.
 */
export function drawRandomCardFromDeck(
  cardsMap: Record<string, string>,
  usedCardIds: string[] | Set<string> = []
): { cardId: string; trackId: string } | null {
  if (!cardsMap || typeof cardsMap !== 'object') return null;
  const usedSet = usedCardIds instanceof Set ? usedCardIds : new Set(usedCardIds);

  const allKeys = Object.keys(cardsMap);
  if (allKeys.length === 0) return null;

  const availableKeys = allKeys.filter((k) => {
    const isDigits = /^[0-9]+$/.test(k);
    const norm = isDigits ? String(parseInt(k, 10)) : k;
    const padded = isDigits ? k.padStart(5, '0') : k;
    return !usedSet.has(k) && !usedSet.has(norm) && !usedSet.has(padded);
  });

  if (availableKeys.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * availableKeys.length);
  const chosenKey = availableKeys[randomIndex];
  const trackId = cardsMap[chosenKey];
  const cardId = /^[0-9]+$/.test(chosenKey) ? chosenKey.padStart(5, '0') : chosenKey;

  return { cardId, trackId };
}

/**
 * Función pura que analiza y parsea cualquier formato de URL, URI o código de Spotify,
 * incluyendo URLs oficiales de cartas físicas Hitster (ej. hitstergame.com/us/{id}).
 */
export function parseSpotifyTrackUrl(
  raw: string,
  cardsDb?: Record<string, Record<string, string>>,
  defaultCountry = 'us'
): SpotifyTrackInfo {
  if (!raw || typeof raw !== 'string') {
    return { url: '' };
  }

  const clean = raw.trim();

  // Caso 1: URI nativo spotify:track:<id>
  const spotifyUriMatch = clean.match(/^spotify:track:([a-zA-Z0-9]+)/i);
  if (spotifyUriMatch && spotifyUriMatch[1]) {
    const trackId = spotifyUriMatch[1];
    return {
      trackId,
      url: `https://open.spotify.com/track/${trackId}`,
      embedUrl: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`,
      appUri: `spotify:track:${trackId}`,
    };
  }

  // Caso 2: URL web open.spotify.com/.../track/<id>
  const spotifyUrlMatch = clean.match(
    /https?:\/\/open\.spotify\.com\/(?:[a-zA-Z-]+\/)?track\/([a-zA-Z0-9]+)/i
  );
  if (spotifyUrlMatch && spotifyUrlMatch[1]) {
    const trackId = spotifyUrlMatch[1];
    return {
      trackId,
      url: `https://open.spotify.com/track/${trackId}`,
      embedUrl: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`,
      appUri: `spotify:track:${trackId}`,
    };
  }

  // Caso 3: URL oficial de cartas físicas de Hitster (ej. www.hitstergame.com/us/aaaa0023/00066 o hitstergame.com/us/00268)
  const isHitsterDomain = /(?:https?:\/\/)?(?:www\.)?hitstergame\.com/i.test(clean);
  if (isHitsterDomain) {
    const pathOnly = clean.replace(/^(?:https?:\/\/)?(?:www\.)?hitstergame\.com\/?/i, '');
    const segments = pathOnly.split(/[?#]/)[0].split('/').filter(Boolean);

    let country = defaultCountry ? defaultCountry.toLowerCase() : 'us';
    let sku: string | undefined;
    let cardIdRaw = '';

    if (segments.length >= 3) {
      country = segments[0].toLowerCase();
      sku = segments[1].toLowerCase();
      cardIdRaw = segments[2];
    } else if (segments.length === 2) {
      if (segments[0].length === 2 && isNaN(Number(segments[0]))) {
        country = segments[0].toLowerCase();
        cardIdRaw = segments[1];
      } else {
        sku = segments[0].toLowerCase();
        cardIdRaw = segments[1];
      }
    } else if (segments.length === 1) {
      cardIdRaw = segments[0];
    }

    const isDigits = /^[0-9]+$/.test(cardIdRaw);
    const normId = isDigits ? String(parseInt(cardIdRaw, 10)) : cardIdRaw;
    const paddedId = isDigits ? cardIdRaw.padStart(5, '0') : cardIdRaw;

    const dbToSearch = cardsDb || HITSTER_CORE_CARDS;
    const foundTrackId =
      (sku ? dbToSearch?.[sku]?.[paddedId] || dbToSearch?.[sku]?.[normId] : undefined) ||
      dbToSearch?.[country]?.[paddedId] ||
      dbToSearch?.[country]?.[normId] ||
      (country === 'latino' || country === 'mx'
        ? dbToSearch?.['aaaa0102']?.[paddedId] ||
          dbToSearch?.['aaaa0102']?.[normId] ||
          dbToSearch?.['aaaa0053']?.[paddedId] ||
          dbToSearch?.['aaaa0053']?.[normId] ||
          HITSTER_CORE_CARDS['latino']?.[paddedId] ||
          HITSTER_CORE_CARDS['latino']?.[normId]
        : undefined) ||
      dbToSearch?.['global']?.[paddedId] ||
      dbToSearch?.['global']?.[normId] ||
      HITSTER_CORE_CARDS[country]?.[paddedId] ||
      HITSTER_CORE_CARDS[country]?.[normId] ||
      HITSTER_CORE_CARDS['latino']?.[paddedId] ||
      HITSTER_CORE_CARDS['latino']?.[normId] ||
      HITSTER_CORE_CARDS['us']?.[paddedId] ||
      HITSTER_CORE_CARDS['us']?.[normId];

    if (foundTrackId) {
      return {
        trackId: foundTrackId,
        url: `https://open.spotify.com/track/${foundTrackId}`,
        embedUrl: `https://open.spotify.com/embed/track/${foundTrackId}?utm_source=generator`,
        appUri: `spotify:track:${foundTrackId}`,
        cardId: paddedId,
        country,
        isHitsterCard: true,
      };
    }

    return {
      url: `https://hitstergame.com/${country}/${sku ? sku + '/' : ''}${cardIdRaw}`,
      cardId: paddedId || cardIdRaw,
      country,
      isHitsterCard: true,
    };
  }

  // Caso 4: Número de carta directo introducido manualmente (ej. 00268, #268, card:100)
  const directCardMatch = clean.match(/^(?:#|card:|hitster:)?([0-9]{1,6})$/i);
  if (directCardMatch && clean.length <= 6) {
    const cardIdRaw = directCardMatch[1];
    const country = (defaultCountry || 'us').toLowerCase();
    const normId = String(parseInt(cardIdRaw, 10));
    const paddedId = cardIdRaw.padStart(5, '0');

    const dbToSearch = cardsDb || HITSTER_CORE_CARDS;
    const foundTrackId =
      dbToSearch?.[country]?.[paddedId] ||
      dbToSearch?.[country]?.[normId] ||
      (country === 'latino' || country === 'mx'
        ? dbToSearch?.['aaaa0102']?.[paddedId] ||
          dbToSearch?.['aaaa0102']?.[normId] ||
          dbToSearch?.['aaaa0053']?.[paddedId] ||
          dbToSearch?.['aaaa0053']?.[normId] ||
          HITSTER_CORE_CARDS['latino']?.[paddedId] ||
          HITSTER_CORE_CARDS['latino']?.[normId]
        : undefined) ||
      dbToSearch?.['global']?.[paddedId] ||
      dbToSearch?.['global']?.[normId] ||
      HITSTER_CORE_CARDS[country]?.[paddedId] ||
      HITSTER_CORE_CARDS[country]?.[normId] ||
      HITSTER_CORE_CARDS['latino']?.[paddedId] ||
      HITSTER_CORE_CARDS['latino']?.[normId] ||
      HITSTER_CORE_CARDS['us']?.[paddedId] ||
      HITSTER_CORE_CARDS['us']?.[normId];

    if (foundTrackId) {
      return {
        trackId: foundTrackId,
        url: `https://open.spotify.com/track/${foundTrackId}`,
        embedUrl: `https://open.spotify.com/embed/track/${foundTrackId}?utm_source=generator`,
        appUri: `spotify:track:${foundTrackId}`,
        cardId: paddedId,
        country,
        isHitsterCard: true,
      };
    }
  }

  // Caso 5: Formato Hitster con prefijo (ej. HITSTER-id o QR:id)
  const hitsterPrefixMatch = clean.match(/(?:hitster|qr)[:\-_]([a-zA-Z0-9]{22})/i);
  if (hitsterPrefixMatch && hitsterPrefixMatch[1]) {
    const trackId = hitsterPrefixMatch[1];
    return {
      trackId,
      url: `https://open.spotify.com/track/${trackId}`,
      embedUrl: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`,
      appUri: `spotify:track:${trackId}`,
    };
  }

  // Caso 6: Solo el ID alfanumérico directo de Spotify (22 caracteres alfanuméricos)
  if (/^[a-zA-Z0-9]{22}$/.test(clean)) {
    const trackId = clean;
    return {
      trackId,
      url: `https://open.spotify.com/track/${trackId}`,
      embedUrl: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`,
      appUri: `spotify:track:${trackId}`,
    };
  }

  // Caso 7: URL genérica o no reconocida
  return {
    url: clean,
    embedUrl: clean.startsWith('http') ? clean : undefined,
  };
}

export class HitsterEngine
  implements GameEngine<HitsterConfig, HitsterRoundInput, HitsterRoundResult>
{
  /**
   * Calcula el resultado de la ronda: suma cartas a la línea de tiempo
   * y ajusta el inventario de fichas Hitster.
   */
  calculateRound(
    roundIndex: number,
    inputs: Record<string, HitsterRoundInput>,
    previousScores: Record<string, number>,
    config: HitsterConfig
  ): Record<string, HitsterRoundResult> {
    const results: Record<string, HitsterRoundResult> = {};
    const target = config?.targetCards ?? 10;
    const startTokens = config?.startingTokens ?? 3;

    for (const [playerId, input] of Object.entries(inputs)) {
      const prevCards = Math.max(0, previousScores[playerId] ?? 0);
      const roundCards = Math.max(0, input.cardsWon ?? 0);
      const totalCards = prevCards + roundCards;

      // Cálculo de fichas: para la ronda 0 parte de startTokens,
      // para rondas posteriores acumula sobre el cambio de fichas
      const deltaTokens = input.tokensDelta ?? 0;
      // En la ronda 0, totalTokens = startTokens + deltaTokens;
      // El total real de fichas es manejado progresivamente.
      // Aseguramos que nunca sea menor a 0.
      const roundTokens = Math.max(0, deltaTokens);

      const isWinner = totalCards >= target;

      results[playerId] = {
        playerId,
        roundCards,
        roundTokensDelta: deltaTokens,
        totalCards,
        totalTokens: Math.max(0, startTokens + deltaTokens), // Base de cálculo inicial
        roundScore: roundCards,
        cumulativeScore: totalCards,
        isWinner,
      };
    }

    return results;
  }

  /**
   * Recalcula el acumulado completo de cartas y fichas con base en todo el historial
   * de rondas jugadas, garantizando una consistencia perfecta en fichas y cartas.
   */
  calculateCumulativeState(
    allRoundsInputs: Record<string, HitsterRoundInput>[],
    playerIds: string[],
    config: HitsterConfig
  ): Record<string, { totalCards: number; totalTokens: number; isWinner: boolean }> {
    const state: Record<string, { totalCards: number; totalTokens: number; isWinner: boolean }> =
      {};
    const startTokens = config?.startingTokens ?? 3;
    const target = config?.targetCards ?? 10;

    for (const pid of playerIds) {
      state[pid] = { totalCards: 0, totalTokens: startTokens, isWinner: false };
    }

    for (const roundInputs of allRoundsInputs) {
      for (const pid of playerIds) {
        const inp = roundInputs[pid];
        if (inp) {
          const cardsWon = Math.max(0, inp.cardsWon ?? 0);
          const delta = inp.tokensDelta ?? 0;
          state[pid].totalCards += cardsWon;
          state[pid].totalTokens = Math.max(0, state[pid].totalTokens + delta);
          if (state[pid].totalCards >= target) {
            state[pid].isWinner = true;
          }
        }
      }
    }

    return state;
  }

  /**
   * Evalúa si algún jugador o equipo ha ganado la partida al completar su línea de tiempo.
   * En caso de empate en cartas (ej. dos jugadores alcanzaron 10 cartas en la misma ronda),
   * el desempate oficial de Hitster favorece a quien tenga más fichas Hitster en mano.
   */
  evaluateMatchStatus(
    totalScores: Record<string, number>,
    roundsPlayed: number,
    config: HitsterConfig,
    tokensByPlayer?: Record<string, number>
  ): {
    isGameOver: boolean;
    reason?: string;
    winnerIds: string[];
    rankings?: HitsterRanking[];
  } {
    const playerIds = Object.keys(totalScores);
    if (playerIds.length === 0 || roundsPlayed === 0) {
      return { isGameOver: false, winnerIds: [] };
    }

    const target = config?.targetCards ?? 10;
    const winners = playerIds.filter((pid) => (totalScores[pid] ?? 0) >= target);

    // Si nadie alcanzó el objetivo, la partida continúa
    if (winners.length === 0) {
      return { isGameOver: false, winnerIds: [] };
    }

    // Ordenar ganadores por total de cartas (descendente), luego por fichas Hitster (descendente)
    const rankedWinners = [...winners].sort((a, b) => {
      const cardsDiff = (totalScores[b] ?? 0) - (totalScores[a] ?? 0);
      if (cardsDiff !== 0) return cardsDiff;
      const tokensA = tokensByPlayer ? (tokensByPlayer[a] ?? 0) : 0;
      const tokensB = tokensByPlayer ? (tokensByPlayer[b] ?? 0) : 0;
      return tokensB - tokensA;
    });

    const topWinnerId = rankedWinners[0];
    const topCards = totalScores[topWinnerId] ?? 0;
    const topTokens = tokensByPlayer ? (tokensByPlayer[topWinnerId] ?? 0) : 0;

    // Verificar si hay empate absoluto en cartas y fichas
    const tiedWinners = rankedWinners.filter((pid) => {
      const c = totalScores[pid] ?? 0;
      const t = tokensByPlayer ? (tokensByPlayer[pid] ?? 0) : 0;
      return c === topCards && t === topTokens;
    });

    const reason =
      tiedWinners.length > 1
        ? `¡Empate histórico! Varios jugadores completaron ${topCards} canciones en su línea de tiempo con ${topTokens} fichas.`
        : `¡Victoria! Ha completado su línea de tiempo con ${topCards} canciones en orden cronológico.`;

    return {
      isGameOver: true,
      reason,
      winnerIds: tiedWinners,
    };
  }

  /**
   * Ordena a todos los jugadores en la tabla de posiciones en vivo:
   * 1. Más cartas en la línea de tiempo.
   * 2. Más fichas Hitster en posesión (criterio de desempate oficial).
   */
  rankPlayers(
    totalCardsMap: Record<string, number>,
    totalTokensMap: Record<string, number>,
    targetCards: number
  ): HitsterRanking[] {
    const playerIds = Object.keys(totalCardsMap);

    const sorted = [...playerIds].sort((a, b) => {
      const cardsA = totalCardsMap[a] ?? 0;
      const cardsB = totalCardsMap[b] ?? 0;
      if (cardsB !== cardsA) return cardsB - cardsA;

      const tokensA = totalTokensMap[a] ?? 0;
      const tokensB = totalTokensMap[b] ?? 0;
      return tokensB - tokensA;
    });

    return sorted.map((pid, idx) => ({
      playerId: pid,
      totalCards: totalCardsMap[pid] ?? 0,
      totalTokens: totalTokensMap[pid] ?? 0,
      rank: idx + 1,
      isWinner: (totalCardsMap[pid] ?? 0) >= targetCards,
    }));
  }
}
