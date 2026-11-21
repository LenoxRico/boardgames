# Guía de Extensión: Cómo Agregar un Nuevo Juego a Tabletop Companion

Esta guía explica detalladamente la arquitectura modular desacoplada (*Plugin / Registry Pattern*), las reglas de diseño visual/background en cards y los pasos requeridos para incorporar cualquier nuevo juego de mesa a la aplicación.

---

## 1. Arquitectura y Principios de Diseño
El núcleo de la aplicación desconoce las particularidades mecánicas de cada juego. La integración se logra mediante un contrato estándar (`GameDefinition<TConfig, TRoundInput, TRoundResult>`):

```
src/app/games/<game-id>/
├── <game-id>.definition.ts       # Metadatos, opciones iniciales, tema visual y registro
├── <game-id>.engine.ts           # Motor puro de cálculo y lógica de victoria/derrota
├── <game-id>.engine.spec.ts      # Suite de pruebas unitarias (Vitest)
├── <game-id>.rules.ts            # Contenido bilingüe estructurado (Resumen + Completas)
└── components/
    └── <game-id>-scorer.component.ts # Componente Standalone del marcador en vivo

public/assets/games/
└── <game-id>-bg.svg              # Arte vectorial temático para marcas de agua en cards
```

---

## 2. Reglas de Estructura Visual: Fondos Temáticos en Cards

Para garantizar una experiencia visual inmersiva, cohesiva y uniforme sin problemas de encajonamiento por paddings de página, la aplicación sigue una **arquitectura basada en tarjetas (Card-Based Theme)** idéntica a la vista de Catálogo:

### 2.1 El Fondo Pertenece a Cada Tarjeta (Nunca a la Página)
Los gradientes y el arte alusivo de cada juego **se renderizan dentro de las tarjetas principales** (`.game-card`, `.active-match-hero`, `.match-header-card`, `.match-setup-card`, `.controls-card`, `.final-results-card`).
- Las vistas de página (`.catalog-page`, `.new-match-page`, `.rules-page`, `.match-live-page`) mantienen su layout limpio con paddings estándar (`padding: var(--space-md); max-width: 900px; margin: 0 auto;`).
- Ninguna vista debe definir backdrops o capas globales sueltas a nivel de viewport o wrapper.

### 2.2 Especificación Estándar de la Card y Marca de Agua
1. **Contenedor de la Tarjeta:**
   ```scss
   .mi-card {
     position: relative;
     overflow: hidden; /* Recorta la marca de agua a los bordes redondeados */
     background: var(--color-surface-container);
     border: 1px solid var(--color-border-default);
     border-radius: var(--radius-xl);
     /* El gradiente temático se inyecta dinámicamente en el template: [style.background-image]="gameTheme()?.gradient" */
   }
   ```
2. **Elemento de Marca de Agua (`.card-thematic-art` o `.hero-thematic-art`):**
   ```scss
   .card-thematic-art {
     position: absolute;
     top: 0;
     right: 0;
     width: 180px a 260px; /* Según el tamaño de la tarjeta */
     height: 100%;
     max-height: 260px;
     background-size: contain;
     background-repeat: no-repeat;
     background-position: top right;
     opacity: 0.6; /* 0.6 estricto para todas las imágenes temáticas */
     pointer-events: none;
     z-index: 0;
     mask-image: radial-gradient(circle at 100% 0%, rgba(0, 0, 0, 1) 0%, transparent 85%);
     -webkit-mask-image: radial-gradient(circle at 100% 0%, rgba(0, 0, 0, 1) 0%, transparent 85%);
     transition: opacity 0.2s ease;
   }

   :host-context([data-theme="light"]) .card-thematic-art {
     opacity: 0.6; /* Se mantiene en 0.6 en tema claro para consistencia */
   }
   ```
3. **Contenido Interno con Z-Index:**
   Todos los elementos de contenido dentro de la tarjeta (títulos, botones, steppers, chips) deben tener `position: relative; z-index: 1;` para flotar limpiamente sobre el arte.

### 2.3 Guía para el Arte Vectorial (`public/assets/games/<game-id>-bg.svg`)
1. **Formato:** SVG vectorial limpio, sin fondo sólido (transparente) y optimizado.
2. **Dimensiones:** `viewBox="0 0 600 600"`.
3. **Estilo visual:** Siluetas, líneas o composiciones temáticas (coronas, barcos, bueyes, dados, laberintos, etc.).
4. **Opacidad y Máscara:** Gracias a la máscara radial y la opacidad estándar de **0.6**, la imagen se aprecia con gran detalle en la esquina superior derecha y se desvanece suavemente hacia los textos para mantener la legibilidad al 100%.

---

## 3. Paso a Paso para Desarrollar un Nuevo Módulo

### Paso 1: Crear el Directorio del Juego y su Arte
Crea la carpeta en `src/app/games/<game-id>/` con el nombre en kebab-case (ej. `flip-7`, `carcassonne`, `trio`).
Agrega el SVG temático en `public/assets/games/<game-id>-bg.svg`.

### Paso 2: Implementar el Motor Puro (`<game-id>.engine.ts`)
El motor debe ser una clase pura sin dependencias de UI o del DOM, facilitando pruebas automatizadas. Debe implementar la interfaz `GameEngine`:

```typescript
import { GameEngine } from '../../core/models/game.interface';

export interface MyGameConfig {
  targetScore: number;
  enableVariant: boolean;
}

export interface MyGameRoundInput {
  points: number;
}

export interface MyGameRoundResult {
  roundScore: number;
  cumulativeScore: number;
}

export class MyGameEngine implements GameEngine<MyGameConfig, MyGameRoundInput, MyGameRoundResult> {
  calculateRound(
    roundIndex: number,
    inputs: Record<string, MyGameRoundInput>,
    previousScores: Record<string, number>,
    config: MyGameConfig
  ): Record<string, MyGameRoundResult> {
    const results: Record<string, MyGameRoundResult> = {};
    for (const [playerId, input] of Object.entries(inputs)) {
      const roundScore = input.points ?? 0;
      const prev = previousScores[playerId] ?? 0;
      results[playerId] = {
        roundScore,
        cumulativeScore: prev + roundScore,
      };
    }
    return results;
  }

  evaluateMatchStatus(
    totalScores: Record<string, number>,
    roundsPlayed: number,
    config: MyGameConfig
  ) {
    const isGameOver = Object.values(totalScores).some((s) => s >= config.targetScore);
    const winnerIds = Object.keys(totalScores).filter((id) => totalScores[id] >= config.targetScore);
    return { isGameOver, winnerIds };
  }
}
```

### Paso 3: Crear las Pruebas Unitarias (`<game-id>.engine.spec.ts`)
Asegura la fidelidad matemática de las reglas antes de crear la interfaz gráfica:

```typescript
import { describe, it, expect } from 'vitest';
import { MyGameEngine } from './my-game.engine';

describe('MyGameEngine', () => {
  const engine = new MyGameEngine();

  it('calcula correctamente los acumulados de ronda', () => {
    const inputs = { p1: { points: 15 } };
    const prev = { p1: 30 };
    const res = engine.calculateRound(0, inputs, prev, { targetScore: 100, enableVariant: false });
    expect(res['p1'].cumulativeScore).toBe(45);
  });
});
```

### Paso 4: Redactar las Reglas Estructuradas (`<game-id>.rules.ts`)
Debe implementar la interfaz `GameRules`. Provee modo `summary` (arbitraje rápido en mesa) y `full` (reglas completas).

> [!IMPORTANT]
> **Comportamiento Bilingüe Condicional:** Si defines tanto `es` como `en` en el array `languages: ['es', 'en']`, la aplicación mostrará automáticamente el botón selector de idioma en la cabecera. Si solo defines un idioma (ej. `languages: ['es']`), el botón selector se ocultará para mantener limpia la interfaz.

```typescript
import { GameRules } from '../../core/models/game.interface';

export const MY_GAME_RULES: GameRules = {
  languages: ['es', 'en'], // O solo ['es']
  content: {
    es: {
      summary: [
        { id: 'sec-1', title: 'Objetivo Rápido', icon: 'flag', content: 'Primero en llegar a 100 puntos.' }
      ],
      full: [
        { id: 'full-1', title: '1. Preparación', icon: 'layers', content: 'Detalle completo del mazo...' }
      ]
    },
    en: {
      summary: [
        { id: 'sec-en-1', title: 'Quick Goal', icon: 'flag', content: 'First to reach 100 points.' }
      ],
      full: [
        { id: 'full-en-1', title: '1. Setup', icon: 'layers', content: 'Deck setup details...' }
      ]
    }
  }
};
```

### Paso 5: Crear el Marcador Específico (`components/<game-id>-scorer.component.ts`)
Diseña un componente standalone enfocado 100% en la interacción táctil en mesa:
- Inyecta `GameRegistryService` para leer de forma reactiva el tema visual del juego:
  ```typescript
  private registry = inject(GameRegistryService);
  readonly gameTheme = computed(() => this.registry.getGame(this.match().gameId)?.metadata?.theme);
  ```
- Aplica el fondo y la marca de agua temática en `.match-header-card` y en `.final-results-card`:
  ```html
  <div class="match-header-card" [style.background-image]="gameTheme()?.gradient">
    @if (gameTheme()?.bgImageUrl; as bg) {
      <div class="card-thematic-art" [style.background-image]="'url(' + bg + ')'"></div>
    }
    <!-- Contenido de la cabecera (z-index: 1) -->
  </div>
  ```
- Recibe `match = input.required<MatchRecord<MyGameConfig, MyGameRoundInput>>()`.
- Botones táctiles grandes (mínimo 44px a 48px).
- Inyecta `MatchManagerService` para invocar:
  * `this.matchManager.saveDraftRoundData(draft)` en cada toque.
  * `this.matchManager.commitRound(roundData)` al confirmar la ronda.
  * `this.matchManager.rollbackToRound(roundNumber)` para editar rondas anteriores.
  * `this.matchManager.finalizeMatch()` para concluir la sesión.
- Modal de abandono de partida: si el usuario decide salir a mitad de partida, solicitar confirmación antes de redireccionar al catálogo sin guardar en el historial.

### Paso 6: Definir y Registrar el Juego con su Tema Visual
1. En `<game-id>.definition.ts`, exporta la constante `MY_GAME_DEFINITION` incluyendo el bloque `theme`:

```typescript
import { GameDefinition } from '../../core/models/game.interface';
import { MyGameEngine } from './my-game.engine';
import { MY_GAME_RULES } from './my-game.rules';
import { MyGameScorerComponent } from './components/my-game-scorer.component';

export const MY_GAME_DEFINITION: GameDefinition = {
  metadata: {
    id: 'my-game',
    name: 'Mi Juego',
    subtitle: 'Subtítulo descriptivo',
    icon: 'casino',
    emoji: '🎲',
    minPlayers: 2,
    maxPlayers: 6,
    victoryType: 'highest_score', // o 'lowest_score'
    hasLoser: false,
    scoreUnit: 'pts',
    tagline: 'Frase que resume la experiencia de juego.',
    theme: {
      primaryColor: '#8b5cf6',
      secondaryColor: '#ec4899',
      accentColor: '#f59e0b',
      gradient: 'radial-gradient(circle at 85% 15%, rgba(139, 92, 246, 0.22) 0%, rgba(236, 72, 153, 0.18) 50%, transparent 80%)',
      bgImageUrl: '/assets/games/my-game-bg.svg',
    },
  },
  configOptions: [
    {
      key: 'targetScore',
      label: 'Puntaje Objetivo',
      type: 'number',
      defaultValue: 100,
      min: 50,
      max: 500,
    },
  ],
  rules: MY_GAME_RULES,
  engine: new MyGameEngine(),
  scorerComponent: MyGameScorerComponent,
};
```

2. Registra el juego en `src/app/core/services/game-registry.service.ts`:

```typescript
import { MY_GAME_DEFINITION } from '../../games/my-game/my-game.definition';

constructor() {
  this.register(SKULL_KING_DEFINITION);
  this.register(TAKE_6_DEFINITION);
  this.register(MINO_DICE_DEFINITION);
  this.register(MY_GAME_DEFINITION); // <-- Registrar aquí
}
```

---

## 4. Checklist de Datos Requeridos

Completa este formulario al solicitar o diseñar un nuevo juego:

| Campo | Ejemplo | Obligatorio | Descripción |
|---|---|---|---|
| **ID / Slug** | `skull-king`, `take-6`, `mino-dice` | Sí | Minúsculas y guiones, único en el sistema. |
| **Nombre Oficial** | `Skull King`, `¡Toma 6!`, `Mino Dice` | Sí | Nombre a mostrar en pantalla. |
| **Emoji / Icono** | `👑`, `🐂`, `🎲` | Sí | Icono visible en catálogo y cabecera. |
| **Rango de Jugadores** | Mínimo: 2, Máximo: 8 | Sí | Límites físicos de componentes del juego. |
| **Condición de Victoria** | `highest_score` o `lowest_score` | Sí | Define ordenación de podio y medalla de oro. |
| **Tiene Perdedor Destacado** | `true` o `false` | Sí | `true` si alguien detona el fin (ej. Take 6 al superar 66 pts). |
| **Unidad de Puntuación** | `pts`, `cuernos`, `dados` | Sí | Etiqueta para los marcadores numéricos. |
| **Tema Visual (`theme`)** | Colores primario/secundario y gradiente | Sí | Gradiente radial ambiental aplicado a las cards. |
| **Asset SVG (`bgImageUrl`)** | `/assets/games/<id>-bg.svg` | Sí | Arte vectorial para marca de agua en cards con opacidad 0.6. |
| **Opciones Previas** | Rondas fijas, Límite, Expansiones | Opcional | Opciones booleanas o numéricas editables antes de iniciar. |
| **Idiomas de Reglas** | `['es']` o `['es', 'en']` | Sí | Si contiene ambos, habilita botón conmutador de idioma. |
| **Resumen Rápido (Mesa)** | 3 a 5 tarjetas clave | Sí | Objetivo, penalizaciones y casos especiales. |
| **Reglas Completas** | Objetivo, Preparación, Turnos, Puntuación | Sí | Documentación para resolver dudas de arbitraje. |

---

## 5. Validación y Ejecución de Pruebas

Para validar que el nuevo juego no introduce regresiones y que sus cálculos funcionan al 100%:

```bash
# Ejecutar suite de pruebas unitarias
npm test

# Compilar para producción web y Capacitor
npm run build
npx cap sync
```
