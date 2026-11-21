---
name: Tactical Companion
colors:
  surface: '#121412'
  surface-dim: '#121412'
  surface-bright: '#383a37'
  surface-container-lowest: '#0d0f0d'
  surface-container-low: '#1a1c1a'
  surface-container: '#1e201e'
  surface-container-high: '#292a28'
  surface-container-highest: '#333533'
  on-surface: '#e3e3df'
  on-surface-variant: '#c1c7ce'
  inverse-surface: '#e3e3df'
  inverse-on-surface: '#2f312f'
  outline: '#8b9198'
  outline-variant: '#41474d'
  surface-tint: '#a1ccee'
  primary: '#cfe8ff'
  on-primary: '#00344e'
  primary-container: '#a3cef1'
  on-primary-container: '#2c5876'
  inverse-primary: '#376381'
  secondary: '#97cdf3'
  on-secondary: '#00344c'
  secondary-container: '#084e6f'
  on-secondary-container: '#89bfe4'
  tertiary: '#d7e6ff'
  on-tertiary: '#02315b'
  tertiary-container: '#a8cbfd'
  on-tertiary-container: '#325681'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cae6ff'
  primary-fixed-dim: '#a1ccee'
  on-primary-fixed: '#001e2f'
  on-primary-fixed-variant: '#1c4b68'
  secondary-fixed: '#c7e7ff'
  secondary-fixed-dim: '#97cdf3'
  on-secondary-fixed: '#001e2e'
  on-secondary-fixed-variant: '#034c6c'
  tertiary-fixed: '#d3e4ff'
  tertiary-fixed-dim: '#a6c9fb'
  on-tertiary-fixed: '#001c38'
  on-tertiary-fixed-variant: '#234873'
  background: '#121412'
  on-background: '#e3e3df'
  surface-variant: '#333533'
  ice-white: '#E7ECEF'
  deep-navy: '#274C77'
  steel-blue: '#6096BA'
  sky-blue: '#A3CEF1'
  slate-neutral: '#8B8C89'
  surface-midnight: '#0B1326'
  surface-tier-1: '#131E38'
  surface-tier-2: '#1B2A4A'
  surface-tier-3: '#24375E'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.04em
  tabular-score:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.03em
  tabular-score-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system powers an agile tabletop companion and tournament tracker built for physical gaming spaces—from atmospheric basements and gaming taverns to bustling convention halls. The interface emphasizes instant legibility across the table, zero interaction ambiguity, and fluid single-thumb ergonomics.

The visual direction follows **Tactile Modernism** with an oceanic, cool-toned palette. It merges precision mobile tool ergonomics with deep midnight surfaces, steel-blue structure, and soft sky-blue illuminations. The aesthetic is clean, calculating, and dependable, evoking strategic navigation tools, brushed slate counters, and tactical star-charts. Physical game tokens and state counters are translated into crisp, balanced digital cards that reduce cognitive fatigue across multi-hour gameplay sessions.

## Colors
The palette adopts the specified color scheme, using a midnight-navy canvas (`#0B1326`) as the dark foundation to minimize glare during extended tabletop sessions.

- **Primary (`#A3CEF1` - Sky Blue):** The primary focal accent. Applied to active player indicators, current score totals, confirmed actions, and prominent interactive triggers.
- **Secondary (`#6096BA` - Steel Blue):** Mid-tier interactive elements, secondary action steppers, segmented tab active states, and tactical rule icons.
- **Tertiary (`#274C77` - Deep Navy):** Structural headers, prominent card fills, sticky navigation chrome, and deep container accents.
- **Neutral (`#8B8C89` - Slate Gray):** Container outlines, inactive state indicators, subtle hairline dividers, and muted metadata labels.
- **Ice White (`#E7ECEF`):** High-contrast textual ink for headline and key numerical readouts across all dark surfaces.
- **Surface Elevation Series:** Built specifically from midnight navy undertones (`#0B1326`, `#131E38`, `#1B2A4A`, `#24375E`) to sustain depth while maintaining the cool marine chromatic balance.

## Typography
**Plus Jakarta Sans** serves across all typographic tiers, providing geometric structure, open apertures, and exceptional numerical clarity.

- **Tabular Figures:** Scores, turn counters, round timers, and victory points must mandate `font-variant-numeric: tabular-nums` to ensure numerical shifts never cause layout reflow or eye jumping.
- **Hierarchical Roles:** `headline-xl` and `headline-lg` are reserved for major victory states, active player announcements, and main scoreboard overviews. `body-*` tokens render rules text, phase checklists, and system logs.
- **Labels & Microcopy:** `label-sm` applies uppercase transformation with expanded letter-spacing (`0.04em`) to establish crisp section badges, category dividers, and tactical condition tags.

## Layout & Spacing
The layout model employs a fluid 12-column grid adapted for multi-device tabletop use, anchored by an 8px base spacing scale.

- **Mobile Viewport (< 640px):** Single vertical column stack with fixed bottom toolbars and sticky scoreboard headers. Outer canvas margins compress to `margin-mobile` (`1rem`) with `gutter-mobile` (`0.75rem`) to maximize touch area.
- **Tablet / Playmat Hub (640px - 1024px):** 2-to-4 column split view allowing simultaneous live score tracking, turn timers, and rule quick-search panels side by side.
- **Desktop / Master Table (> 1024px):** Fixed-width container capped at `1280px` with `margin` (`1.5rem`), facilitating full-table matrix views and audit trails.
- **Spacing Rhythm:** Micro spaces (`space-xs`, `space-sm`) group coupled controls like +/- counter steppers. Larger spaces (`space-lg`, `space-xl`) separate player turns, phases, and tournament brackets.

## Elevation & Depth
Depth is constructed through tonal surface stacking paired with low-contrast structural outlines rather than heavy atmospheric drop shadows, ensuring clarity on matte mobile displays.

- **Canvas (`#0B1326`):** The primary ground surface.
- **Container Level 1 (`#131E38`):** Base cards, inactive player panels, and collapsed rule accordions. Bordered with `1px solid rgba(139, 140, 137, 0.18)` using the neutral tone.
- **Container Level 2 (`#1B2A4A`):** Interactive cards, modal drawers, score input blocks, and floating action sheets.
- **Container Level 3 (`#24375E`):** Active player highlights, tooltips, elevated steppers, and popovers.
- **Active Focus Glow:** Active players and turn triggers cast an ambient outer glow using the soft sky-blue primary (`0 0 16px -2px rgba(163, 206, 241, 0.25)`), making the focal turn immediately distinguishable from across a 6-foot gaming table.

## Shapes
The design adopts a refined roundedness language (`roundedness: 2`):

- **Cards, Panels, and Containers:** Feature an 8px (`0.5rem`) corner radius, scaling to 16px (`1rem`) on full-screen modal sheets and popovers.
- **Interactive Pill Elements:** Segmented controls, phase chips, condition tags, and score steppers use full pill radius (`9999px`) to reinforce tactile touch affordance and ergonomic tapping.
- **Control Outlines:** Hairline 1px borders adhere precisely to the boundary curvature, framing every touch target clearly against midnight backgrounds.

## Components

### Buttons
- **Primary Buttons:** Solid sky blue (`#A3CEF1`) fill with dark midnight navy (`#0B1326`) typography in bold weight. Rounded to `0.5rem` or full pill (`9999px`). Bounding box maintains a minimum 48px height.
- **Secondary Buttons:** Steel blue (`#6096BA`) background with ice white (`#E7ECEF`) text, or transparent background with 1.5px steel blue border.
- **Tactical Stepper Buttons:** Circular 48x48px or 56x56px touch controls for score increments/decrements with distinct active states that scale down (`scale: 0.95`) upon press.

### Chips & Badges
- **Status Badges:** Pill-shaped markers indicating round phases ("Combat", "Upkeep", "Drafting"). Built with deep navy (`#274C77`) background at 40% opacity, paired with an inner border of neutral slate (`#8B8C89`) and sky blue (`#A3CEF1`) typography.
- **Player Turn Badges:** Active player chip leverages a sky blue border with an ambient sky blue glow.

### Scoreboard & Matrix Lists
- **Row Tiers:** Alternating rows using `#131E38` and `#1B2A4A` with 1px neutral borders (`rgba(139, 140, 137, 0.15)`).
- **Tabular Cells:** Dedicated numeric score displays using `tabular-score` styling in ice white (`#E7ECEF`), with point differentials displayed via muted steel blue (`#6096BA`) tags.

### Inputs & Search Fields
- Inset dark wells (`#0B1326`) framed by a 1px slate neutral outline (`#8B8C89`).
- Focus states transition the border to solid sky blue (`#A3CEF1`) accompanied by a subtle 2px outer ring in `rgba(163, 206, 241, 0.2)`. Placeholder text sits in `#8B8C89`.

### Cards & Accordions
- Structural cards utilize container level 1 (`#131E38`) with ice white headlines and slate gray supporting text.
- Collapsible rulebook accordions present a clear steel-blue chevron icon that rotates 180 degrees smoothly on expand, exposing nested rules styled with subtle dividers.