import { describe, it, expect } from 'vitest';
import {
  HitsterEngine,
  HitsterConfig,
  HitsterRoundInput,
  parseSpotifyTrackUrl,
  HITSTER_DEMO_TRACKS,
  searchItunesTrack,
  drawRandomCardFromDeck,
  HITSTER_CORE_CARDS,
} from './hitster.engine';

describe('HitsterEngine', () => {
  const engine = new HitsterEngine();
  const defaultConfig: HitsterConfig = {
    targetCards: 10,
    startingTokens: 3,
    gameMode: 'original',
    timerSeconds: 30,
  };

  describe('parseSpotifyTrackUrl', () => {
    it('parsea correctamente URLs web estándar de Spotify', () => {
      const raw = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT';
      const parsed = parseSpotifyTrackUrl(raw);
      expect(parsed.trackId).toBe('4cOdK2wGLETKBW3PvgPWqT');
      expect(parsed.url).toBe('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
      expect(parsed.embedUrl).toContain('embed/track/4cOdK2wGLETKBW3PvgPWqT');
      expect(parsed.appUri).toBe('spotify:track:4cOdK2wGLETKBW3PvgPWqT');
    });

    it('parsea URLs con prefijos internacionales y query params', () => {
      const raw = 'https://open.spotify.com/intl-es/track/5ChkMS8Otdzsq2hnSt4Omm?si=9d7b4e5f';
      const parsed = parseSpotifyTrackUrl(raw);
      expect(parsed.trackId).toBe('5ChkMS8Otdzsq2hnSt4Omm');
      expect(parsed.url).toBe('https://open.spotify.com/track/5ChkMS8Otdzsq2hnSt4Omm');
    });

    it('parsea URIs nativas spotify:track:<id>', () => {
      const raw = 'spotify:track:4u7EnebtmKWzUH433cf5Qv';
      const parsed = parseSpotifyTrackUrl(raw);
      expect(parsed.trackId).toBe('4u7EnebtmKWzUH433cf5Qv');
      expect(parsed.embedUrl).toContain('4u7EnebtmKWzUH433cf5Qv');
    });

    it('parsea códigos QR con prefijo Hitster', () => {
      const raw = 'HITSTER-2PzDXAhNmMy1lD634o2ZgV';
      const parsed = parseSpotifyTrackUrl(raw);
      expect(parsed.trackId).toBe('2PzDXAhNmMy1lD634o2ZgV');
      expect(parsed.url).toBe('https://open.spotify.com/track/2PzDXAhNmMy1lD634o2ZgV');
    });

    it('parsea IDs directos de 22 caracteres alfanuméricos', () => {
      const raw = '0VjIjW4GlULA7k21f1Jglc';
      const parsed = parseSpotifyTrackUrl(raw);
      expect(parsed.trackId).toBe('0VjIjW4GlULA7k21f1Jglc');
    });

    it('parsea y resuelve URLs oficiales con formato SKU (www.hitstergame.com/us/aaaa0023/00066)', () => {
      const raw = 'www.hitstergame.com/us/aaaa0023/00066';
      const parsed = parseSpotifyTrackUrl(raw);
      expect(parsed.isHitsterCard).toBe(true);
      expect(parsed.country).toBe('us');
      expect(parsed.cardId).toBe('00066');
      expect(parsed.trackId).toBe('6epn3r7S14KUqlReYr77hA');
      expect(parsed.url).toBe('https://open.spotify.com/track/6epn3r7S14KUqlReYr77hA');
    });

    it('parsea y resuelve URLs oficiales de cartas Hitster (hitstergame.com/us/{id})', () => {
      const raw = 'https://hitstergame.com/us/00268';
      const parsed = parseSpotifyTrackUrl(raw);
      expect(parsed.isHitsterCard).toBe(true);
      expect(parsed.country).toBe('us');
      expect(parsed.cardId).toBe('00268');
      expect(parsed.trackId).toBe('55CHeLEfn5iJ0IIkgaa4si');
      expect(parsed.url).toBe('https://open.spotify.com/track/55CHeLEfn5iJ0IIkgaa4si');
      expect(parsed.appUri).toBe('spotify:track:55CHeLEfn5iJ0IIkgaa4si');
    });

    it('parsea URLs de cartas de España (http://www.hitstergame.com/es/00001)', () => {
      const raw = 'http://www.hitstergame.com/es/00001';
      const parsed = parseSpotifyTrackUrl(raw);
      expect(parsed.isHitsterCard).toBe(true);
      expect(parsed.country).toBe('es');
      expect(parsed.cardId).toBe('00001');
      expect(parsed.trackId).toBe('0pQskrTITgmCMyr85tb9qq');
      expect(parsed.appUri).toBe('spotify:track:0pQskrTITgmCMyr85tb9qq');
    });

    it('soporta entrada manual directa de número de carta (ej. 00268 o 268)', () => {
      const parsed = parseSpotifyTrackUrl('00268');
      expect(parsed.isHitsterCard).toBe(true);
      expect(parsed.cardId).toBe('00268');
      expect(parsed.trackId).toBe('55CHeLEfn5iJ0IIkgaa4si');

      const parsedShort = parseSpotifyTrackUrl('268');
      expect(parsedShort.trackId).toBe('55CHeLEfn5iJ0IIkgaa4si');
    });

    it('permite inyectar una base de datos externa de cartas', () => {
      const customDb = {
        us: { '99999': 'CUSTOM_SPOTIFY_ID_12345678' },
      };
      const parsed = parseSpotifyTrackUrl('https://hitstergame.com/us/99999', customDb);
      expect(parsed.trackId).toBe('CUSTOM_SPOTIFY_ID_12345678');
      expect(parsed.cardId).toBe('99999');
    });

    it('marca isHitsterCard = true cuando la carta no está en la BD para permitir búsqueda manual', () => {
      const parsed = parseSpotifyTrackUrl('https://hitstergame.com/us/88888');
      expect(parsed.isHitsterCard).toBe(true);
      expect(parsed.cardId).toBe('88888');
      expect(parsed.trackId).toBeUndefined();
      expect(parsed.url).toBe('https://hitstergame.com/us/88888');
    });

    it('resuelve correctamente cartas de Hitster Latino (aaaa0102 / mx / latino)', () => {
      const parsedLatino = parseSpotifyTrackUrl('https://hitstergame.com/latino/00308');
      expect(parsedLatino.isHitsterCard).toBe(true);
      expect(parsedLatino.cardId).toBe('00308');
      expect(parsedLatino.trackId).toBe('1DoK3CdipMjplLk5LXUdcp');

      const parsedSku = parseSpotifyTrackUrl('www.hitstergame.com/mx/aaaa0102/00001');
      expect(parsedSku.cardId).toBe('00001');
      expect(parsedSku.trackId).toBe('1Ikzf2CUcmHzNf4ETPJexW');

      const parsedDirect = parseSpotifyTrackUrl('00002', undefined, 'latino');
      expect(parsedDirect.cardId).toBe('00002');
      expect(parsedDirect.trackId).toBe('3OOWm0MiN6yL4eJsJNXyYk');
    });

    it('maneja strings vacíos o inválidos con elegancia', () => {
      expect(parseSpotifyTrackUrl('').url).toBe('');
      expect(parseSpotifyTrackUrl('   ').url).toBe('');
    });
  });

  describe('calculateRound', () => {
    it('suma correctamente las cartas ganadas a los acumulados anteriores', () => {
      const inputs: Record<string, HitsterRoundInput> = {
        p1: { cardsWon: 2, tokensDelta: 0 },
        p2: { cardsWon: 1, tokensDelta: -1 },
      };
      const previous = { p1: 3, p2: 5 };

      const res = engine.calculateRound(1, inputs, previous, defaultConfig);

      expect(res['p1'].roundCards).toBe(2);
      expect(res['p1'].totalCards).toBe(5);
      expect(res['p1'].isWinner).toBe(false);

      expect(res['p2'].roundCards).toBe(1);
      expect(res['p2'].totalCards).toBe(6);
      expect(res['p2'].roundTokensDelta).toBe(-1);
    });

    it('marca isWinner = true cuando se alcanza o supera targetCards', () => {
      const inputs: Record<string, HitsterRoundInput> = {
        p1: { cardsWon: 1, tokensDelta: 0 },
      };
      const previous = { p1: 9 };

      const res = engine.calculateRound(5, inputs, previous, defaultConfig);
      expect(res['p1'].totalCards).toBe(10);
      expect(res['p1'].isWinner).toBe(true);
    });

    it('acepta wonCardsDetails con información cronológica de canciones', () => {
      const inputs: Record<string, HitsterRoundInput> = {
        p1: {
          cardsWon: 2,
          tokensDelta: 0,
          wonCardsDetails: [
            { id: 'c1', title: 'Song 1982', artist: 'Artist 1', year: 1982 },
            { id: 'c2', title: 'Song 1999', artist: 'Artist 2', year: 1999 },
          ],
        },
      };

      const res = engine.calculateRound(1, inputs, { p1: 0 }, defaultConfig);
      expect(res['p1'].roundCards).toBe(2);
      expect(res['p1'].totalCards).toBe(2);
      expect(inputs['p1'].wonCardsDetails?.length).toBe(2);
      expect(inputs['p1'].wonCardsDetails?.[0].year).toBe(1982);
    });
  });

  describe('calculateCumulativeState', () => {
    it('acumula cartas y ajusta fichas a lo largo de múltiples rondas sin permitir fichas negativas', () => {
      const playerIds = ['p1', 'p2'];
      const rounds: Record<string, HitsterRoundInput>[] = [
        {
          p1: { cardsWon: 1, tokensDelta: -1 }, // p1: 1 carta, 2 fichas
          p2: { cardsWon: 2, tokensDelta: 1 },  // p2: 2 cartas, 4 fichas
        },
        {
          p1: { cardsWon: 2, tokensDelta: -3 }, // p1: 3 cartas, 0 fichas (2 - 3 => 0 min)
          p2: { cardsWon: 1, tokensDelta: -1 }, // p2: 3 cartas, 3 fichas
        },
      ];

      const state = engine.calculateCumulativeState(rounds, playerIds, defaultConfig);

      expect(state['p1'].totalCards).toBe(3);
      expect(state['p1'].totalTokens).toBe(0);

      expect(state['p2'].totalCards).toBe(3);
      expect(state['p2'].totalTokens).toBe(3);
    });
  });

  describe('evaluateMatchStatus', () => {
    it('no termina la partida si nadie ha alcanzado las cartas requeridas', () => {
      const scores = { p1: 7, p2: 8, p3: 4 };
      const status = engine.evaluateMatchStatus(scores, 5, defaultConfig);
      expect(status.isGameOver).toBe(false);
      expect(status.winnerIds).toEqual([]);
    });

    it('termina la partida cuando un jugador alcanza 10 cartas', () => {
      const scores = { p1: 10, p2: 8 };
      const status = engine.evaluateMatchStatus(scores, 6, defaultConfig);
      expect(status.isGameOver).toBe(true);
      expect(status.winnerIds).toEqual(['p1']);
      expect(status.reason).toContain('Ha completado su línea de tiempo');
    });

    it('desempata por fichas Hitster si dos jugadores empatan en 10 cartas', () => {
      const scores = { p1: 10, p2: 10 };
      const tokens = { p1: 1, p2: 4 }; // p2 tiene más fichas

      const status = engine.evaluateMatchStatus(scores, 7, defaultConfig, tokens);
      expect(status.isGameOver).toBe(true);
      expect(status.winnerIds).toEqual(['p2']);
    });

    it('declara empate conjunto si ambos tienen las mismas cartas y fichas', () => {
      const scores = { p1: 10, p2: 10 };
      const tokens = { p1: 2, p2: 2 };

      const status = engine.evaluateMatchStatus(scores, 7, defaultConfig, tokens);
      expect(status.isGameOver).toBe(true);
      expect(status.winnerIds).toEqual(['p1', 'p2']);
      expect(status.reason).toContain('Empate');
      expect(status.rankings).toBeDefined();
      expect(status.rankings?.length).toBe(2);
    });

    it('finaliza la partida al alcanzar el límite de rondas configuradas aunque no se llegue a 10 cartas', () => {
      const scores = { p1: 7, p2: 5 };
      const tokens = { p1: 2, p2: 4 };
      const configWithRounds = { ...defaultConfig, rounds: 10 } as any;

      const status = engine.evaluateMatchStatus(scores, 10, configWithRounds, tokens);
      expect(status.isGameOver).toBe(true);
      expect(status.winnerIds).toEqual(['p1']);
      expect(status.reason).toContain('10 rondas');
      expect(status.rankings?.[0].playerId).toBe('p1');
    });
  });

  describe('rankPlayers', () => {
    it('ordena a los jugadores por cartas descendente y luego fichas descendente', () => {
      const cards = { p1: 8, p2: 10, p3: 8, p4: 6 };
      const tokens = { p1: 3, p2: 1, p3: 5, p4: 4 };

      const ranking = engine.rankPlayers(cards, tokens, 10);

      expect(ranking[0].playerId).toBe('p2'); // 10 cartas (ganador)
      expect(ranking[0].isWinner).toBe(true);

      expect(ranking[1].playerId).toBe('p3'); // 8 cartas, 5 fichas
      expect(ranking[2].playerId).toBe('p1'); // 8 cartas, 3 fichas
      expect(ranking[3].playerId).toBe('p4'); // 6 cartas, 4 fichas
    });
  });

  describe('searchItunesTrack', () => {
    it('retorna null para términos vacíos o nulos', async () => {
      expect(await searchItunesTrack('')).toBeNull();
      expect(await searchItunesTrack('   ')).toBeNull();
    });
  });

  describe('HITSTER_DEMO_TRACKS', () => {
    it('incluye catálogo de canciones de prueba a través de distintas décadas y categorías (latino y global)', () => {
      expect(HITSTER_DEMO_TRACKS.length).toBeGreaterThanOrEqual(25);
      const decades = new Set(HITSTER_DEMO_TRACKS.map((t) => t.decade));
      expect(decades.has('70s')).toBe(true);
      expect(decades.has('80s')).toBe(true);
      expect(decades.has('90s')).toBe(true);
      expect(decades.has('00s')).toBe(true);
      expect(decades.has('10s')).toBe(true);
      expect(decades.has('20s')).toBe(true);

      const latinTracks = HITSTER_DEMO_TRACKS.filter((t) => t.category === 'latino');
      const globalTracks = HITSTER_DEMO_TRACKS.filter((t) => t.category === 'global');
      expect(latinTracks.length).toBeGreaterThanOrEqual(15);
      expect(globalTracks.length).toBeGreaterThanOrEqual(10);

      // Verifica presencia de clásicos latinos legendarios
      const titles = latinTracks.map((t) => t.title);
      expect(titles).toContain('Pedro Navaja');
      expect(titles).toContain('La Incondicional');
      expect(titles).toContain('De Música Ligera');
      expect(titles).toContain('Despacito');
      expect(titles).toContain('Mi Gente');
    });
  });

  describe('drawRandomCardFromDeck', () => {
    const mockDeck = {
      '00001': 'track_01',
      '00002': 'track_02',
      '00003': 'track_03',
    };

    it('extrae una carta aleatoria con su ID normalizado y trackId', () => {
      const drawn = drawRandomCardFromDeck(mockDeck, []);
      expect(drawn).not.toBeNull();
      expect(['00001', '00002', '00003']).toContain(drawn?.cardId);
      expect(drawn?.trackId).toBeDefined();
    });

    it('excluye cartas que ya han sido jugadas (tanto formato normalizado como padded)', () => {
      const drawn = drawRandomCardFromDeck(mockDeck, ['00001', '2']);
      expect(drawn).not.toBeNull();
      expect(drawn?.cardId).toBe('00003');
      expect(drawn?.trackId).toBe('track_03');
    });

    it('retorna null cuando todas las cartas de la baraja han sido jugadas', () => {
      const drawn = drawRandomCardFromDeck(mockDeck, ['00001', '00002', '00003']);
      expect(drawn).toBeNull();
    });

    it('soporta barajas combinadas con claves prefijadas (latino_, us_, es_)', () => {
      const combinedDeck = {
        'latino_00001': 'track_latino_1',
        'us_00001': 'track_us_1',
        'es_00001': 'track_es_1',
      };
      const drawn = drawRandomCardFromDeck(combinedDeck, ['latino_00001', 'us_00001']);
      expect(drawn).not.toBeNull();
      expect(drawn?.cardId).toBe('es_00001');
      expect(drawn?.trackId).toBe('track_es_1');
    });

    it('retorna null con baraja vacía o inválida', () => {
      expect(drawRandomCardFromDeck({}, [])).toBeNull();
      expect(drawRandomCardFromDeck(null as any, [])).toBeNull();
    });
  });
});
