import { describe, it, expect } from 'vitest';
import {
  HitsterEngine,
  HitsterConfig,
  HitsterRoundInput,
  parseSpotifyTrackUrl,
  HITSTER_DEMO_TRACKS,
  searchItunesTrack,
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
    it('incluye catálogo de canciones de prueba a través de distintas décadas y términos de iTunes', () => {
      expect(HITSTER_DEMO_TRACKS.length).toBeGreaterThanOrEqual(10);
      const decades = new Set(HITSTER_DEMO_TRACKS.map((t) => t.decade));
      expect(decades.has('70s')).toBe(true);
      expect(decades.has('80s')).toBe(true);
      expect(decades.has('90s')).toBe(true);
      expect(HITSTER_DEMO_TRACKS[0].itunesSearchTerm).toBeDefined();
    });
  });
});
