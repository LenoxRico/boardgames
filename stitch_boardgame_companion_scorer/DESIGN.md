# DESIGN.md — Sistema de Diseño: Tabletop Companion (Tactical Companion)

## 1. Visión General del Producto y Principios
**Tabletop Companion** es un asistente táctico de mesa mobile-first diseñado para calcular puntuaciones, consultar reglamentos y registrar estadísticas en juegos de mesa competitivos y casuales (como *Skull King* y *¡Toma 6! / 6 nimmt!*). 

### Principios de Diseño
1. **Ergonomía de Mesa (Arm's Length Usability)**: Los elementos interactivos (selectores de apuestas, incremento de puntos, confirmación de ronda) cuentan con un target táctil mínimo de 48px y números de gran formato visibles desde el centro de la mesa.
2. **Dualidad Nocturna / Diurna (Dark & Day Mode)**: 
   - **Modo Nocturno (Default)**: Diseñado para sesiones de juego en interiores con luz tenue, minimizando la fatiga visual con azules marinos profundos.
   - **Modo Diurno / Terraza (Light Mode)**: Diseñado para partidas al aire libre bajo luz solar directa, priorizando blanco puro, contraste AAA y tipografía profunda (`#0F172A`).
3. **Escaneo Rápido de Estado**: Indicadores de tensión (peligro al superar umbral crítico en Take 6, aciertos de apuesta cero en Skull King, podios y medallas) con códigos cromáticos semánticos unificados.

---

## 2. Tokens de Color y Paletas

Basado en la paleta cromática fría optimizada:
- **Azul Marino Primario**: `#274C77`
- **Azul Acero Secundario**: `#6096BA`
- **Azul Cielo Acento**: `#A3CEF1`
- **Gris Neutro / Borde**: `#8B8C89` / `#CBD5E1`
- **Blanco Hielo**: `#E7ECEF`

### A. Paleta Modo Oscuro (Tabletop Night Mode)
```css
:root[data-theme="dark"] {
  /* Superficies */
  --color-surface-lowest: #060e20;
  --color-surface-low: #0b1326;
  --color-surface: #101935;
  --color-surface-container: #17223b;
  --color-surface-container-high: #1e2c4a;
  --color-surface-container-highest: #263659;

  /* Contraste y Textos */
  --color-text-primary: #e7ecef;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;

  /* Marca y Acentos */
  --color-primary: #a3cef1;
  --color-primary-container: #274c77;
  --color-on-primary: #060e20;
  --color-secondary: #6096ba;
  
  /* Bordes */
  --color-border-subtle: rgba(255, 255, 255, 0.08);
  --color-border-default: rgba(163, 206, 241, 0.18);
  --color-border-strong: rgba(163, 206, 241, 0.35);

  /* Semántica de Juego */
  --color-success: #34d399;        /* Baza ganada / Apuesta acertada */
  --color-success-bg: rgba(52, 211, 153, 0.12);
  --color-warning: #f59e0b;        /* Advertencia / Podio plata */
  --color-warning-bg: rgba(245, 158, 11, 0.12);
  --color-danger: #f87171;         /* Límite crítico / Puntos de buey */
  --color-danger-bg: rgba(248, 113, 113, 0.15);
  --color-gold: #fbbf24;           /* Rango Oro / Ganador */
}
```

### B. Paleta Modo Claro (Daytime / Terraza Mode)
```css
:root[data-theme="light"] {
  /* Superficies */
  --color-surface-lowest: #ffffff;
  --color-surface-low: #f8fafc;
  --color-surface: #f1f5f9;
  --color-surface-container: #ffffff;
  --color-surface-container-high: #f8fafc;
  --color-surface-container-highest: #e2e8f0;

  /* Contraste y Textos */
  --color-text-primary: #0f172a;
  --color-text-secondary: #334155;
  --color-text-muted: #64748b;

  /* Marca y Acentos */
  --color-primary: #274c77;
  --color-primary-container: #e0f2fe;
  --color-on-primary: #ffffff;
  --color-secondary: #6096ba;

  /* Bordes */
  --color-border-subtle: #e2e8f0;
  --color-border-default: #cbd5e1;
  --color-border-strong: #94a3b8;

  /* Semántica de Juego */
  --color-success: #059669;
  --color-success-bg: #ecfdf5;
  --color-warning: #d97706;
  --color-warning-bg: #fffbeb;
  --color-danger: #dc2626;
  --color-danger-bg: #fef2f2;
  --color-gold: #b45309;
}
```

---

## 3. Tipografía y Escala
- **Familia Tipográfica**: `Plus Jakarta Sans`, sans-serif (Fallbacks: system-ui, -apple-system, Segoe UI).
- **Características**: Números tabulares (`font-feature-settings: 'tnum' on`) habilitados para contadores, puntos y temporizadores.

### Escala de Tipos
| Token | Tamaño (px / rem) | Peso | Tracking | Uso Principal |
|---|---|---|---|---|
| `display-lg` | 36px / 2.25rem | 800 (Bold) | -0.03em | Puntuaciones de jugador principales |
| `display-md` | 28px / 1.75rem | 700 (Bold) | -0.02em | Títulos de pantalla (H1), Winrates |
| `title-lg` | 20px / 1.25rem | 700 (Bold) | -0.01em | Nombres de juegos, encabezados de tarjeta |
| `title-md` | 16px / 1.0rem | 600 (SemiBold) | 0 | Nombres de jugador, categorías de reglamentos |
| `body-md` | 14px / 0.875rem | 500 (Medium) | 0 | Textos de reglas, descripciones de estado |
| `caption` | 12px / 0.75rem | 600 (SemiBold) | +0.02em | Badges, tags de estado, subtítulos de navegación |
| `metric-sm` | 11px / 0.6875rem | 700 (Bold) | +0.05em | Mini etiquetas en píldoras y chips |

---

## 4. Radios de Borde, Sombras y Elevaciones

### Radios (`border-radius`)
- `radius-sm`: `6px` (Badges de etiqueta, mini botones numéricos)
- `radius-md`: `10px` (Controles segmentados, inputs de jugador)
- `radius-lg`: `16px` (Tarjetas de jugador, módulos de contenido)
- `radius-xl`: `24px` (Contenedores modales, banners destacados)
- `radius-full`: `9999px` (Píldoras de filtro, avatares, chips de ronda)

### Sombras
- `shadow-subtle`: `0 1px 3px rgba(0, 0, 0, 0.05)`
- `shadow-card`: `0 4px 14px -2px rgba(11, 19, 38, 0.08)`
- `shadow-elevated`: `0 10px 25px -4px rgba(11, 19, 38, 0.15)`
- `shadow-glow-accent`: `0 0 16px rgba(163, 206, 241, 0.25)`

---

## 5. Biblioteca de Componentes Clave

### 1. Barra de Aplicación Superior (App Header)
- **Estructura**: Isotipo vectorial + Marca *"Tabletop Companion"* con badge de sección activa + Switch de Iluminación Sol/Noche + Avatar/Perfil de usuario.
- **Posición**: Sticky top (`z-index: 50`), fondo difuminado (`backdrop-blur-md`).

### 2. Selector Táctil Numérico (Steppers & Button Grids)
- Botones de selección de 0 a 10 para apuestas de Skull King y penalizaciones de ¡Toma 6!.
- Target táctil de 44x44px mínimo con feedback activo de color inverso y borde resaltado.

### 3. Tarjeta de Jugador en Mesa
- Muestra: Avatar inicial, nombre editable, badges de posición (1º Oro, 2º Plata, Farolillo), acumulado total y fila de selección de ronda activa.
- Estado crítico: Borde carmesí pulsante y badge de advertencia cuando se está al 90%+ del límite de derrota.

### 4. Barra de Acciones Fija Inferior (Bottom Sticky CTA)
- Botón principal de ancho completo *"Confirmar Ronda y Pasar a Siguiente"* / *"Iniciar Partida"* con icono de flecha.
- Botones secundarios simétricos (*"Editar Ronda Anterior"*, *"Terminar Partida"*).

### 5. Barra de Navegación Móvil (Bottom Tab Bar)
- 3 pestañas fijas con altura de 64px:
  1. `Juegos` (Catálogo de reglamentos y mesas)
  2. `En Curso` (Acceso con punto indicador de actividad si hay partidas vivas)
  3. `Reglas` (Buscador y consultas rápidas de arbitraje)

---

## 6. Mapeo de Vistas del Sistema
1. **Inicio - Catálogo de Juegos** (`SCREEN_14` / `SCREEN_22` / `SCREEN_43`): Selección de títulos, reanudación inmediata de mesa activa y selector de modo de iluminación.
2. **Configuración de Nueva Partida** (`SCREEN_16` / `SCREEN_20` / `SCREEN_41`): Sorteo de repartidor, adición de jugadores y configuración de módulos/expansiones.
3. **Marcador Skull King** (`SCREEN_12` / `SCREEN_24` / `SCREEN_39`): Selector de 10 rondas, conteo de bazas vs apuestas, bonificaciones de cartas especiales y clasificación en vivo.
4. **Marcador Take 6 (¡Toma 6!)** (`SCREEN_10` / `SCREEN_26` / `SCREEN_37`): Registro de cuernos de buey por mano, barra de presión de límite (66 pts) y proyección de puestos.
5. **Visor de Reglas de Juego** (`SCREEN_4` / `SCREEN_18` / `SCREEN_45`): Arbitraje rápido, jerarquía pirata, cálculo de puntuación y resolución de dudas frecuentes.
6. **Partidas Guardadas e Historial** (`SCREEN_8` / `SCREEN_28` / `SCREEN_35`): Mesas activas en pausa, historial con ganadores y revancha rápida con exportación CSV.
7. **Estadísticas Globales de Jugadores** (`SCREEN_6` / `SCREEN_30` / `SCREEN_33`): Winrate, podios, duelos directos cara a cara y récords de puntuación.
