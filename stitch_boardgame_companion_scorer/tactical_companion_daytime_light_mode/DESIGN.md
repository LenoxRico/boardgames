---
name: Tactical Companion - Daytime Light Mode
colors:
  surface: '#faf9f6'
  surface-dim: '#dadad7'
  surface-bright: '#faf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f0'
  surface-container: '#eeeeea'
  surface-container-high: '#e8e8e5'
  surface-container-highest: '#e3e3df'
  on-surface: '#1a1c1a'
  on-surface-variant: '#43474f'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f1f1ed'
  outline: '#73777f'
  outline-variant: '#c3c6d0'
  surface-tint: '#3d608c'
  primary: '#08355f'
  on-primary: '#ffffff'
  primary-container: '#274c77'
  on-primary-container: '#9abdee'
  inverse-primary: '#a6c9fb'
  secondary: '#2a6485'
  on-secondary: '#ffffff'
  secondary-container: '#a2d8ff'
  on-secondary-container: '#245f80'
  tertiary: '#273547'
  on-tertiary: '#ffffff'
  tertiary-container: '#3e4c5f'
  on-tertiary-container: '#adbcd3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e4ff'
  primary-fixed-dim: '#a6c9fb'
  on-primary-fixed: '#001c38'
  on-primary-fixed-variant: '#234873'
  secondary-fixed: '#c7e7ff'
  secondary-fixed-dim: '#97cdf3'
  on-secondary-fixed: '#001e2e'
  on-secondary-fixed-variant: '#034c6c'
  tertiary-fixed: '#d5e4fb'
  tertiary-fixed-dim: '#b9c8de'
  on-tertiary-fixed: '#0d1c2d'
  on-tertiary-fixed-variant: '#39485b'
  background: '#faf9f6'
  on-background: '#1a1c1a'
  surface-variant: '#e3e3df'
typography:
  display-score:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-score-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 38px
    fontWeight: '800'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
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
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '800'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is tailored for precision tabletop companion tracking, competitive board gaming, and daytime outdoor terrace play. The interface demands instantaneous legibility in direct sunlight, zero visual ambiguity during rapid turn cycles, and an organized, modern tactical aesthetic. 

The aesthetic direction merges **High-Contrast Modern Utility** with **Crisp Tonal Layering**. It eschews deep murky shadows in favor of ice-white card structures, razor-sharp architectural borders, deep navy primary actions, and high-visibility state indicators. The emotional tone is decisive, methodical, calm, and unmistakably analytical.

## Colors

The palette balances intense outdoor ambient light through high-luminance canvas tones backed by dense navy typography:

- **Canvas & Base Surfaces (`#E7ECEF`):** Ice-white base canvas designed to mitigate glare and preserve clarity under bright daylight conditions.
- **Surface Elevation Cards (`#FFFFFF`):** Pure white layered on top of the ice-white canvas, delivering natural separation without needing heavy drop shadows.
- **Primary Ink & Key Actions (`#274C77`):** Command navy used for primary CTA fills, active navigation tabs, major score counters, and dominant headers.
- **Secondary Accent (`#6096BA`):** Slate blue utilized for secondary metrics, interactive chips, progress tracks, and non-destructive utility toggles.
- **Deep Navy Anchor (`#0F1E2F`):** Extreme contrast pigment for primary values, score counts, and body reading text.
- **Neutral Boundary & Muted Slate (`#8B8C89`):** Subdued stone-slate for container boundaries, inactive dividers, metadata timestamps, and placeholder states.

## Typography

Typography relies entirely on **Plus Jakarta Sans**, chosen for its crisp, geometric apertures, broad counters, and immediate scan-ability at arm's length across a gaming table.

- **Display Scores:** Extra-bold, tight tracking applied to victory points, round counts, and resource trackers to prevent misreads under changing light angles.
- **Headlines:** Set in bold weights with compact line-heights, ensuring player profiles and phase banners remain structurally dense.
- **Labels & Tactical Badges:** Uppercase or high-tracking labels allow rapid identification of game statuses, turn orders, and tactical multipliers.
- **Tabular Figures:** All numeric displays must enforce tabular numeric alignment (`font-variant-numeric: tabular-nums`) to avoid layout jitter during live increment/decrement gestures.

## Layout & Spacing

The layout is built for direct tactile interaction on mobile devices, optimized for single-handed index or thumb inputs while placed flat beside a physical game board.

- **Grid Architecture:** 
  - **Mobile (< 600px):** 4-column layout with 16px (`1rem`) outer canvas margins and 12px (`gutter-sm`) inter-column gutters.
  - **Tablet / Terrace Board (600px - 1024px):** 8-column layout with 24px (`1.5rem`) outer margins and 16px gutters, allowing side-by-side player match tracking and real-time round logs.
- **Density:** Compact, high-efficiency vertical spacing. Hit targets preserve a strict minimum bounding size of 44x44px, while internal gap tokens favor `space-sm` (8px) and `space-md` (12px) to maximize screen real estate for game stats.

## Elevation & Depth

To maintain high contrast and clarity in bright daylight, this design system avoids soft, muddy drop shadows. Depth is generated through **Tonal Layering** and **Crisp Structural Borders**:

- **Level 0 (Canvas):** `#E7ECEF` solid, non-reflective base.
- **Level 1 (Cards & Modules):** Pure `#FFFFFF` fill bounded by a sharp `1px` border of `#8B8C89` with a subtle diffused ambient rim: `box-shadow: 0 1px 3px rgba(15, 30, 47, 0.06)`.
- **Level 2 (Active Player Surface / Focused Card):** Pure `#FFFFFF` surface framed by an intensified `1.5px` border of `#274C77` and a crisp, shallow shadow: `box-shadow: 0 4px 12px rgba(39, 76, 119, 0.12)`.
- **Level 3 (Modal / Score Override Drawers):** High-opacity `#FFFFFF` surface bordered by `#274C77` with an ambient backdrop overlay tinted in `#0F1E2F` at 40% opacity.

## Shapes

The design system standardizes on a geometric **8px base corner radius (`roundedness: 2`)**, fulfilling the round-eight requirement across all core structural components.

- **Primary Cards, Panels, & Action Blocks:** Fixed `8px` (`0.5rem`) border radius, preserving clean alignment without soft, playful distortion.
- **Secondary Containers & Nested Panels:** `8px` corner radius maintains absolute uniformity inside larger modules.
- **Tactical Badges & Micro Chips:** Compact, high-visibility indicators also inherit `4px` to `8px` boundaries, reserving complete capsule pill shapes exclusively for turn-order toggles or round indicators.

## Components

### Buttons
- **Primary Action (Tactical Commit):** Solid `#274C77` fill, white `#FFFFFF` text, `8px` border radius, bold typography. Minimum height 48px for instant tap feedback. Active state presses down to `#0F1E2F`.
- **Secondary Counter / Adjuster:** Ghost container with `#FFFFFF` background, a 1px border of `#6096BA`, and text in `#274C77`.
- **Destructive / Reset:** Bordered with `#8B8C89` at resting, shifting to an assertive deep slate fill on press.

### Cards & Player Modules
- **Structure:** Pure white `#FFFFFF` background on the `#E7ECEF` canvas, bordered with 1px `#8B8C89`.
- **Active Turn Highlight:** Border shifts to 2px solid `#274C77`, with player score rendered in `display-score` using `#0F1E2F`.
- **Internal Separators:** 1px hairline horizontal rules colored in `#E7ECEF`.

### Scoring Badges & Chips
- **High-Contrast Score Badges:** Deep `#0F1E2F` or vibrant `#274C77` background with inverted white text for current leader tags or multiplier bonuses.
- **Resource & Condition Chips:** `#FFFFFF` background with a 1px `#6096BA` boundary, paired with high-contrast text and uppercase tracking (`label-sm`).

### Steppers & Score Modifiers (+ / -)
- **Increment/Decrement Clusters:** Modular segmented pair with 8px external corners. Divided by a 1px `#8B8C89` center line. Haptic feedback on tap with immediate visual invert to `#6096BA`.

### Input Fields & Search
- **Text & Numeric Entry:** `#FFFFFF` fill, 1px `#8B8C89` resting border, shifting to a 2px `#274C77` ring on focus. Placeholder text in `#8B8C89`. All numbers render in tabular Plus Jakarta Sans.

### Checkboxes & Segmented Controls
- **Checkboxes / Toggles:** 8px soft-cornered square inputs. Unchecked: `#FFFFFF` with 1.5px `#8B8C89` boundary. Checked: solid `#274C77` fill with crisp white checkmark icon.
- **Phase Bar Segmented Control:** `#E7ECEF` track container with active state pill/segment popping forward in pure `#FFFFFF`, bounded by a hairline `#8B8C89` rim.