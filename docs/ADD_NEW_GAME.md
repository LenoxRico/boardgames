# Guía de Extensión: Cómo Agregar un Nuevo Juego a Tabletop Companion

Esta guía explica detalladamente la arquitectura modular desacoplada (*Plugin / Registry Pattern*) y los pasos requeridos para incorporar cualquier nuevo juego de mesa a la aplicación.

---

## 1. Arquitectura y Principios de Diseño
El núcleo de la aplicación desconoce las particularidades mecánicas de cada juego. La integración se logra mediante un contrato estándar (`GameDefinition<TConfig, TRoundInput, TRoundResult>`):

```
src/app/games/<game-id>/
├── <game-id>.definition.ts       # Metadatos, opciones iniciales y registro
├── <game-id>.engine.ts           # Motor puro de cálculo y lógica de victoria/derrota
├── <game-id>.engine.spec.ts      # Suite de pruebas unitarias (Vitest)
├── <game-id>.rules.ts            # Contenido bilingüe estructurado (Resumen + Completas)
└── components/
    └── <game-id>-scorer.component.ts # Componente Standalone del marcador en vivo
```

---

## 2. Paso a Paso para Desarrollar un Nuevo Módulo

### Paso 1: Crear el Directorio del Juego
Crea la carpeta en `src/app/games/<game-id>/` con el nombre en kebab-case (ej. `flip-7`, `carcassonne`, `trio`).

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
Diseña un componente standalone adaptado a la ergonomía del juego:
- Recibe `match = input.required<MatchRecord<MyGameConfig, MyGameRoundInput>>()`.
- Botones táctiles grandes (mínimo 44px a 48px).
- Inyecta `MatchManagerService` para invocar:
  * `this.matchManager.saveDraftRoundData(draft)` en cada toque.
  * `this.matchManager.commitRound(roundData)` al confirmar la ronda.
  * `this.matchManager.rollbackToRound(roundNumber)` para editar rondas anteriores.
  * `this.matchManager.finalizeMatch()` para concluir la sesión.

### Paso 6: Definir y Registrar el Juego
1. En `<game-id>.definition.ts`, exporta la constante `MY_GAME_DEFINITION`:

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
  this.register(MY_GAME_DEFINITION); // <-- Registrar aquí
}
```

---

## 3. Checklist de Datos Requeridos

Completa este formulario al solicitar o diseñar un nuevo juego:

| Campo | Ejemplo | Obligatorio | Descripción |
|---|---|---|---|
| **ID / Slug** | `skull-king`, `take-6` | Sí | Minúsculas y guiones, único en el sistema. |
| **Nombre Oficial** | `Skull King`, `¡Toma 6!` | Sí | Nombre a mostrar en pantalla. |
| **Emoji / Icono** | `👑`, `🐂`, `casino` | Sí | Icono visible en catálogo y cabecera. |
| **Rango de Jugadores** | Mínimo: 2, Máximo: 8 | Sí | Límites físicos de componentes del juego. |
| **Condición de Victoria** | `highest_score` o `lowest_score` | Sí | Define ordenación de podio y medalla de oro. |
| **Tiene Perdedor Destacado** | `true` o `false` | Sí | `true` si alguien detona el fin (ej. Take 6 al superar 66 pts). |
| **Unidad de Puntuación** | `pts`, `cuernos`, `monedas` | Sí | Etiqueta para los marcadores numéricos. |
| **Opciones Previas** | Rondas (10), Límite (66), Expansiones | Opcional | Opciones booleanas o numéricas editables antes de iniciar. |
| **Idiomas de Reglas** | `['es']` o `['es', 'en']` | Sí | Si contiene ambos, habilita botón conmutador de idioma. |
| **Resumen Rápido (Mesa)** | 3 a 5 tarjetas clave | Sí | Objetivo, penalizaciones y casos especiales. |
| **Reglas Completas** | Objetivo, Preparación, Turnos, Puntuación | Sí | Documentación para resolver dudas de arbitraje. |

---

## 4. Validación y Ejecución de Pruebas

Para validar que el nuevo juego no introduce regresiones y que sus cálculos funcionan al 100%:

```bash
# Ejecutar suite de pruebas unitarias
npm test

# Compilar para producción web y Capacitor
npm run build
```
