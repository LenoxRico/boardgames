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
├── <game-id>-bg.svg              # Arte vectorial temático para marcas de agua en cards (600x600, alta opacidad)
└── <game-id>-rules.svg           # Ilustración panorámica dedicada para card de reglas (800x400, centrada)
```

---

## 2. Reglas de Estructura Visual: Fondos Temáticos en Cards

Para garantizar una experiencia visual inmersiva, cohesiva y uniforme sin problemas de encajonamiento por paddings de página, la aplicación sigue una **arquitectura basada en tarjetas (Card-Based Theme)** idéntica a la vista de Catálogo:

### 2.1 El Fondo Pertenece a Cada Tarjeta (Nunca a la Página)
Los gradientes y el arte alusivo de cada juego **se renderizan dentro de TODAS las tarjetas principales**, garantizando una estricta simetría visual en cualquier pantalla:
- **En Catálogo:** Cada `.game-card` y el hero `.active-match-hero`.
- **En Configuración de Partida:** La tarjeta de configuración `.match-setup-card`.
- **En Visor de Reglas:** **TODAS las tarjetas de la vista de reglas** llevan el fondo temático (`[style.background-image]="game.metadata.theme?.gradient"`):
  1. La tarjeta de controles `.controls-card` (con marca de agua `*-bg.svg`).
  2. La card dedicada de ilustración `.rules-image-card` (con la ilustración panorámica `*-rules.svg` ocupando todo el espacio).
  3. La tarjeta de identidad y especificaciones `.game-overview-card` (con marca de agua `*-bg.svg`).
  4. Cada tarjeta individual de sección de reglas `.rule-card` (con marca de agua `*-bg.svg`).
  5. La tarjeta CTA final para iniciar partida `.start-game-cta-box` (con marca de agua `*-bg.svg`).
- **En la Partida en Vivo:** **TODAS las tarjetas de la mesa**:
  1. `.match-header-card` (cabecera con steppers y repartidor).
  2. Cada `.player-card` (tarjeta de interacción y captura de datos por jugador).
  3. `.matrix-card` (tabla histórica ronda por ronda).
  4. `.current-scores-card` (tarjeta de puntaje actual y posiciones en vivo).
  5. `.final-results-card` (podio de victoria y resultados).
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

### 2.3 Guía para el Arte Vectorial de Marcas de Agua (`public/assets/games/<game-id>-bg.svg`)
1. **Formato:** SVG vectorial limpio, sin fondo sólido (transparente) y optimizado.
2. **Dimensiones:** `viewBox="0 0 600 600"`.
3. **Punto Focal y Composición:** Centrado en la esquina superior derecha alrededor de `(cx="410", cy="230")` para acoplarse con la máscara radial de las cards.
4. **Resplandor y Gradientes:** Resplandores radiales intensos con paradas de opacidad entre `0.38` y `0.50` en el núcleo y gradientes lineales cromáticos de alta saturación.
5. **Opacidad Interna y Trazos:** Los elementos y figuras principales del SVG deben tener opacidades internas elevadas entre **`0.85` y `0.95`** (o `1.0`), y trazos gruesos (**`stroke-width="2.5"` a `"3.5"`**), siguiendo el estándar de Hitster y Pelusas. De este modo, al aplicarse el multiplicador CSS `opacity: 0.6` de `.card-thematic-art`, el arte se visualiza nítido, luminoso y con alto contraste sin desvanecerse en el fondo.

### 2.4 Ilustración Dedicada y Tarjetas en el Visor de Reglas (`/tabs/rules`)
El Visor de Reglas utiliza una arquitectura de doble tarjeta para la presentación del juego:
1. **Card Dedicada de Ilustración (`.rules-image-card`):**
   - Aloja una ilustración vectorial panorámica dedicada (`<game-id>-rules.svg`) vinculada en `rules.coverImage`.
   - **Regla Estricta de Exclusividad:** La imagen de `rules.coverImage` (`*-rules.svg`) **SÓLO se utiliza en esta tarjeta (`.rules-image-card`)**. Ninguna otra vista, componente ni tarjeta de la aplicación debe consumir esta imagen.
   - **Debe ser DIFERENTE a la marca de agua del fondo (`*-bg.svg`)**: mientras el fondo es una silueta o emblema para marcas de agua, la ilustración de reglas representa una escena activa o dinámica del juego (ej. la línea de tiempo musical con cassettes en Hitster, el cuarteto de Pelusas huyendo de la aspiradora, el cofre del tesoro con Kraken y Sirena en Skull King, la estampida del 6º buey en Toma 6, los dados poliédricos en el laberinto de Mino Dice, o las 5 máscaras sagradas ante la fogata en Samoa).
   - **Composición:** Formato panorámico centrado con `viewBox="0 0 800 400"` (ratio 2:1).
   - **Renderizado:** La ilustración ocupa todo el espacio de su tarjeta de manera centrada (`width: 100%; aspect-ratio: 2 / 1; object-fit: cover; max-height: 290px;`).
2. **Card de Identidad y Especificaciones (`.game-overview-card`):**
   - Presenta el emoji, nombre oficial, subtítulo y tagline descriptivo del juego.
   - Contiene la cuadrícula de chips técnicos (número de jugadores, tipo de victoria, cantidad de rondas oficiales y unidad de puntaje).
   - Incorpora la marca de agua temática `.card-thematic-art` en su esquina superior derecha utilizando obligatoriamente `metadata.theme.bgImageUrl` (`*-bg.svg`).
3. **Regla de Uso para Todo lo Demás (Incluyendo Todas las Demás Cards de Reglas):**
   - Para **absolutamente todas las demás tarjetas de la aplicación**, incluyendo **todas las tarjetas de la vista de reglas** (`.controls-card`, `.game-overview-card`, cada `.rule-card` y `.start-game-cta-box`), se utiliza **únicamente la imagen de fondo de marca de agua (`metadata.theme.bgImageUrl` / `*-bg.svg`)** sobre el gradiente temático de la tarjeta.
4. **Ruta Absoluta:** Todas las imágenes deben declararse iniciando obligatoriamente con barra diagonal (ej. `bgImageUrl: '/assets/games/<game-id>-bg.svg'` y `coverImage: '/assets/games/<game-id>-rules.svg'`).

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
- Aplica el fondo y la marca de agua temática en **TODAS las cards del marcador** (`.match-header-card`, `.player-card`, `.matrix-card` y `.final-results-card`):
  ```html
  <!-- En la Cabecera -->
  <div class="match-header-card" [style.background-image]="gameTheme()?.gradient">
    @if (gameTheme()?.bgImageUrl; as bg) {
      <div class="card-thematic-art" [style.background-image]="'url(' + bg + ')'"></div>
    }
    <!-- Contenido de la cabecera (z-index: 1) -->
  </div>

  <!-- En cada Tarjeta de Jugador -->
  <div class="player-card" [style.background-image]="gameTheme()?.gradient">
    @if (gameTheme()?.bgImageUrl; as bg) {
      <div class="card-thematic-art" [style.background-image]="'url(' + bg + ')'"></div>
    }
    <!-- Inputs y perfil del jugador (z-index: 1) -->
  </div>

  <!-- En la Tabla Matriz -->
  <div class="matrix-card" [style.background-image]="gameTheme()?.gradient">
    @if (gameTheme()?.bgImageUrl; as bg) {
      <div class="card-thematic-art" [style.background-image]="'url(' + bg + ')'"></div>
    }
    <!-- Tabla de puntuaciones (z-index: 1) -->
  </div>
  ```
- En estilos SCSS, aplica la simetría a todas las tarjetas:
  ```scss
  .match-header-card,
  .player-card,
  .matrix-card,
  .final-results-card {
    position: relative;
    overflow: hidden;
  }

  .player-card > *,
  .matrix-card > * {
    position: relative;
    z-index: 1;
  }
  ```
- Recibe `match = input.required<MatchRecord<MyGameConfig, MyGameRoundInput>>()`.
- Botones táctiles grandes (mínimo 44px a 48px).
- Inyecta `MatchManagerService` para invocar:
  * `this.matchManager.saveDraftRoundData(draft)` en cada toque.
  * `this.matchManager.commitRound(roundData)` al confirmar la ronda.
  * `this.matchManager.rollbackToRound(roundNumber)` para editar rondas anteriores.
  * `this.matchManager.finalizeMatch()` para concluir la sesión.

- **Uniformidad Obligatoria: Botón 'Finalizar Partida' (Abandono en curso) y Modal de Confirmación**:
  Todos los juegos deben tener exactamente la misma estructura visual, naming y comportamiento para permitir finalizar/abandonar una partida en curso:
  1. **Disposición Vertical en la Barra Inferior Flotante (`.floating-actions-bar`)**:
     - La barra flotante organiza **siempre** los botones de forma vertical (`display: flex; flex-direction: column; gap: var(--space-xs);`).
     - El botón principal de acción (`Confirmar Ronda` o `Finalizar y Ver Podio`) va **arriba** ocupando el 100% del ancho (`width: 100%; min-height: 48px;`).
     - El botón secundario de abandono (`Finalizar Partida`) va **debajo** dentro de `.secondary-actions-row` (`width: 100%; display: flex; gap: var(--space-xs);`). **Nunca deben colocarse uno al lado del otro**, garantizando la misma ergonomía táctil en todos los juegos.
     - **Texto**: `Finalizar Partida` (nunca "Abandonar" ni "Salir").
     - **Icono Material**: `exit_to_app`.
     - **Clases CSS**: `btn-secondary-action btn-danger`.
     - **Acción**: `(click)="askToAbandonMatch()"`.
     ```html
     <div class="floating-actions-bar">
       <button
         type="button"
         class="btn-primary-action"
         [disabled]="!canConfirmRound()"
         (click)="confirmCurrentRound()"
       >
         <span class="material-symbols-outlined">check_circle</span>
         <span>Confirmar Ronda {{ viewingRound() }}</span>
       </button>

       <div class="secondary-actions-row">
         <button
           type="button"
           class="btn-secondary-action btn-danger"
           (click)="askToAbandonMatch()"
         >
           <span class="material-symbols-outlined">exit_to_app</span>
           <span>Finalizar Partida</span>
         </button>
       </div>
     </div>
     ```
  2. **Modal de Confirmación de Abandono (`showAbandonConfirmModal`)**:
     - Si la partida está en curso, al presionar 'Finalizar Partida' **NUNCA** se sale de inmediato; **SIEMPRE** se solicita confirmación.
     - Si confirma, la partida **no se registra en el historial** (`this.matchManager.abandonMatch()`) y se redirige a `/tabs/catalog`.
     - Si cancela, se oculta el modal (`this.showAbandonConfirmModal.set(false)`) y el juego continúa.
     ```html
     @if (showAbandonConfirmModal()) {
       <div class="modal-overlay" (click)="cancelAbandon()">
         <div class="modal-dialog-card" (click)="$event.stopPropagation()">
           <div class="modal-icon-badge danger-badge">
             <span class="material-symbols-outlined">warning</span>
           </div>
           <h3 class="modal-title">¿Abandonar la partida?</h3>
           <p class="modal-message">
             Estás en medio de una partida de [Nombre del Juego]. Si confirmas, saldrás al catálogo de juegos y esta partida <strong>no se guardará en el historial</strong>.
           </p>
           <div class="modal-actions">
             <button
               type="button"
               class="btn-modal-cancel"
               (click)="cancelAbandon()"
             >
               Cancelar y Continuar Jugando
             </button>
             <button
               type="button"
               class="btn-modal-confirm-abandon"
               (click)="confirmAbandon()"
             >
               <span class="material-symbols-outlined">delete_forever</span>
               <span>Sí, Abandonar Partida</span>
             </button>
           </div>
         </div>
       </div>
     }
     ```
  3. **Lógica estándar en TypeScript**:
     ```typescript
     showAbandonConfirmModal = signal(false);

     askToAbandonMatch(): void {
       this.showAbandonConfirmModal.set(true);
     }

     cancelAbandon(): void {
       this.showAbandonConfirmModal.set(false);
     }

     async confirmAbandon(): Promise<void> {
       this.showAbandonConfirmModal.set(false);
       await this.matchManager.abandonMatch();
       await this.router.navigate(['/tabs/catalog']);
     }
     ```
  4. **Estilos SCSS del Modal**:
     ```scss
     .modal-overlay {
       position: fixed;
       inset: 0;
       background: rgba(0, 0, 0, 0.75);
       backdrop-filter: blur(8px);
       display: flex;
       align-items: center;
       justify-content: center;
       padding: var(--space-md);
       z-index: 1000;
     }

     .modal-dialog-card {
       background: var(--color-surface-container);
       border: 1px solid var(--color-border-strong);
       border-radius: var(--radius-2xl);
       padding: var(--space-xl);
       max-width: 440px;
       width: 100%;
       text-align: center;
       display: flex;
       flex-direction: column;
       align-items: center;
       gap: var(--space-md);
       box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
     }

     .modal-icon-badge {
       width: 56px;
       height: 56px;
       border-radius: var(--radius-full);
       display: flex;
       align-items: center;
       justify-content: center;
       background: rgba(239, 68, 68, 0.15);
       color: #ef4444;
       border: 1px solid rgba(239, 68, 68, 0.3);
     }

     .btn-modal-cancel {
       width: 100%;
       min-height: 44px;
       border-radius: var(--radius-lg);
       background: var(--color-surface-container-high);
       border: 1px solid var(--color-border-default);
       color: var(--color-text-primary);
       font-weight: 700;
       font-size: 14px;
       cursor: pointer;
     }

     .btn-modal-confirm-abandon {
       width: 100%;
       min-height: 44px;
       border-radius: var(--radius-lg);
       background: #dc2626;
       border: none;
       color: #ffffff;
       font-weight: 800;
       font-size: 14px;
       display: flex;
       align-items: center;
       justify-content: center;
       gap: 6px;
       cursor: pointer;
       box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
     }
     ```

- **Separación de Puntaje Actual y Tabla de Historial de Rondas**:
  Para mantener una jerarquía visual limpia y no saturar la lectura en la mesa de juego:
  1. **Tabla de Historial (`.matrix-card`)**:
     - Muestra exclusivamente los puntos sumados o restados en cada ronda confirmada (`+X` o `-Y`).
     - **No** debe incluir acumulados entre paréntesis `(accum)` dentro de las celdas de la tabla.
     - **No** debe incluir filas proyectadas en vivo no confirmadas en la tabla histórica.
     - Si aún no hay rondas confirmadas, muestra un mensaje descriptivo: *"Aún no hay rondas confirmadas."*
  2. **Tarjeta de Puntaje Actual (`.current-scores-card`)**:
     - Se ubica **obligatoriamente debajo** de la tarjeta de rondas (`.matrix-card`).
     - Lleva el tema y marca de agua del juego (`[style.background-image]="gameTheme()?.gradient"` y `.card-thematic-art`).
     - Presenta la lista de jugadores ordenados en vivo por su clasificación (`rankedPlayers()`), con avatar, nombre, puesto destacado (`👑 1º Puesto`, etc.) y puntaje total acumulado confirmado (ej. `450 pts` o `12 cuernos`).
     - Se actualiza de forma reactiva ronda tras ronda confirmada.

- **Regla para Juegos de Bazas (Trick-Taking) y Apuestas (ej. Skull King, Mino Dice)**:
  1. **Inicialización de Bazas Ganadas**:
     - Las bazas ganadas se definen como opcionales en la interfaz (`tricks?: number`) e inician en el borrador como `undefined` (mostrando `'-'` en el stepper o selector).
     - Al presionar `+` sobre un valor no definido se inicializa en `1`; al presionar `-` se inicializa en `0`.
  2. **Ocultar Pronóstico Prematuro**:
     - Mientras el valor de bazas esté indefinido, la previsualización del puntaje de la ronda **no debe calcularse** para evitar mostrar puntuaciones apresuradas de jugadas no verificadas. Debe mostrarse como pendiente (`.forecast-pending` con `'-'` y etiqueta *"Pendiente"*).
     - El puntaje y estado (*Exacto*, *Fallada*, etc.) se calcula y muestra **únicamente** cuando el usuario establece un valor numérico (`0` o más).
  3. **Validación de Confirmación**:
     - El botón de confirmar ronda debe permanecer deshabilitado (`!canConfirmRound()`) hasta que todos los jugadores de la partida tengan sus bazas ganadas ingresadas.

- **Diseño Estándar de Chips de Bonificación (`.bonus-chip`)**:
  - Para botones de bonificaciones opcionales o capturas (ej. criaturas, cofres, sirenas), usar chips redondeados (`border-radius: var(--radius-full)`, `padding: 6px 12px`, `font-size: 12px`, `font-weight: 700`, `display: inline-flex`).
  - **Estructura uniforme del label de bonificación**: `[Emoji/Icono] [Descripción de la jugada] +[Puntos] [@if (count > 1) { (Nx) }]` (ej. `💀 Rey vs Piratas +30`, `🐂>🦅 +30`). Los puntos adicionales (`+X`) se ubican **siempre al final del label**, seguidos del multiplicador si aplica (ej. `💀 Rey vs Piratas +30 (2x)` o `🐂>🦅 +30 (2x)`), manteniendo la convención semántica uniforme *"Acción/Evento -> Puntos obtenidos"*.
  - **Cabecera de Bonificaciones (`.bonus-header`)**: Debe incluir el título de la sección (`.selector-title`) y mostrar el total acumulado en vivo (`.bonus-val`) únicamente cuando sea mayor a cero (`@if ((pData.bonusPoints || 0) > 0)`).
  - El botón de limpiar bonificaciones (`.clear-chip`) debe usar **siempre** el icono de Material `<span class="material-symbols-outlined">restart_alt</span>` (con `font-size: 18px`, `color: var(--color-danger)` y `padding: 6px 8px`), **nunca texto plano como "Limpiar"**, para mantener un diseño visual compacto e idéntico en todos los juegos.

- **Opciones de Configuración Condicionales (`showIf` / `dependsOn`)**:
  - En `GameConfigOption`, cuando una opción de partida dependa de otra (ej. en Toma 6, el *Límite Crítico* es indiferente cuando el *Modo de Rondas Fijas* está activo), usar la propiedad `showIf: (config) => boolean` o `dependsOn: { key, value }`.
  - La pantalla de configuración de partida (`new-match`) evaluará esta condición reactivamente para ocultar las opciones irrelevantes y mostrarlas únicamente cuando su modo correspondiente esté activo.

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
  this.register(PELUSAS_DEFINITION);
  this.register(MY_GAME_DEFINITION); // <-- Registrar aquí
}
```

---

## 4. Checklist de Datos Requeridos

Completa este formulario al solicitar o diseñar un nuevo juego:

| Campo | Ejemplo | Obligatorio | Descripción |
|---|---|---|---|
| **ID / Slug** | `skull-king`, `take-6`, `mino-dice`, `pelusas` | Sí | Minúsculas y guiones, único en el sistema. |
| **Nombre Oficial** | `Skull King`, `¡Toma 6!`, `Mino Dice`, `Pelusas` | Sí | Nombre a mostrar en pantalla. |
| **Emoji / Icono** | `👑`, `🐂`, `🎲`, `🧶` | Sí | Icono visible en catálogo y cabecera. |
| **Rango de Jugadores** | Mínimo: 2, Máximo: 8 | Sí | Límites físicos de componentes del juego. |
| **Condición de Victoria** | `highest_score` o `lowest_score` | Sí | Define ordenación de podio y medalla de oro. |
| **Tiene Perdedor Destacado** | `true` o `false` | Sí | `true` si alguien detona el fin (ej. Take 6 al superar 66 pts). |
| **Unidad de Puntuación** | `pts`, `cuernos`, `dados` | Sí | Etiqueta para los marcadores numéricos. |
| **Tema Visual (`theme`)** | Colores primario/secundario y gradiente | Sí | Gradiente radial ambiental aplicado a las cards. |
| **Marca de Agua SVG (`bgImageUrl`)** | `/assets/games/<id>-bg.svg` | Sí | Arte vectorial para marca de agua en **TODAS las tarjetas de la app** (600x600, alta opacidad interna 0.85-0.95, foco en 410,230). |
| **Ilustración de Reglas (`coverImage`)** | `/assets/games/<id>-rules.svg` | Sí | Ilustración panorámica dedicada **EXCLUSIVA para la card de reglas (.rules-image-card)** (800x400 / ratio 2:1, centrada y diferente al fondo). |
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
