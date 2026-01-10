# Background System Documentation

## 🎨 Overview

The application uses a sophisticated multi-layer background system that creates a dark, atmospheric "aurora" effect with grain/noise texture. The system consists of four main layers:

1. **HTML Base Layer** - Solid dark background color
2. **Body Gradient Layer** - Simplified 3-4 radial gradients + linear base gradient creating "aurora lights"
3. **Noise/Grain Overlay** - SVG-based texture overlay using CSS pseudo-element
4. **Filter Overlay** - Color overlay for brightness/darkness/tint control

---

## 📍 File Location

**Primary Implementation:**
- `src/index.css` (lines 109-270)

**Color System (Centralized):**
- `src/styles/glassmorphism-styles.ts` - Gradient colors and base colors (COLOR_PALETTE.appBackground)

**Note:** Some controls (grain opacity, filter overlay) are edited directly in CSS for immediate effect, while gradient colors are centralized in TypeScript.

---

## 🏗️ Architecture

### Layer 1: HTML Base Background

```110:118:src/index.css
html {
  /* Force scrollbar to always be visible - prevents layout shifts */
  overflow-y: scroll !important;
  background-color: #0a0911;
  min-height: 100vh;
  /* Prevent any padding/margin changes */
  padding-right: 0 !important;
  margin-right: 0 !important;
}
```

**Purpose:** Provides the base dark color that shows through transparent areas and scrollbar gutters.

**Color:** `#0a0911` (very dark blue-black)

**Why it matters:** This color is also used for scrollbar tracks, ensuring visual consistency.

---

### Layer 2: Body Gradient Background

```212:237:src/index.css
  body {
    @apply text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
    /* Prevent body from becoming scrollable when dropdowns open */
    overflow-x: hidden !important;
    overflow-y: visible !important;
    /* CRITICAL: Prevent Radix UI from adding padding-right that creates double gutter */
    /* Radix adds padding-right when dropdowns open to compensate for scrollbar */
    padding: 0 !important;
    margin: 0 !important;
    /* Ensure body takes full width */
    width: 100% !important;
    max-width: 100vw !important;
    /* Simplified Aurora Background - 3-4 gradients controlled via CSS variables */
    background: 
      /* Aurora lights - simplified to 3-4 gradients */
      radial-gradient(ellipse at 20% 30%, var(--app-bg-gradient1) 0%, var(--app-bg-gradient1-fade) 25%, transparent 40%),
      radial-gradient(ellipse at 80% 20%, var(--app-bg-gradient2) 0%, var(--app-bg-gradient2-fade) 20%, transparent 35%),
      radial-gradient(ellipse at 60% 80%, var(--app-bg-gradient3) 0%, var(--app-bg-gradient3-fade) 25%, transparent 40%),
      radial-gradient(circle at 45% 15%, var(--app-bg-gradient4) 0%, transparent 28%),
      /* Deep base gradient with more contrast */
      linear-gradient(135deg, var(--app-bg-base-gradient-start) 0%, var(--app-bg-base-gradient-mid1) 40%, var(--app-bg-base-gradient-mid2) 70%, var(--app-bg-base-gradient-end) 100%);
    background-size: 100% 100%;
    background-attachment: fixed;
    min-height: 100vh;
  }
```

**Structure:** The `background` property uses CSS's ability to stack multiple gradients. They render from **top to bottom** (first gradient on top, last on bottom). Colors are controlled via CSS variables that reference the centralized color system.

#### Gradient Breakdown:

**A. Aurora Light Gradients (Elliptical - 3 layers)**
- **Purpose:** Create soft, organic "aurora" light effects
- **Shape:** Elliptical gradients for more natural light spread
- **Colors Used (from centralized system):**
  - Gradient 1: Pink/Magenta (`--app-bg-gradient1`) - Hot pink (#FF6BC5)
  - Gradient 2: Purple (`--app-bg-gradient2`) - Light purple (#A984FF)
  - Gradient 3: Indigo (`--app-bg-gradient3`) - Deep indigo (#5E5CE6)
- **Positions:** Strategically placed at various percentages (20% 30%, 80% 20%, 60% 80%)
- **Fade Stops:** Each gradient has a fade stop (`--app-bg-gradient1-fade`, etc.) for smooth transitions
- **Transition Zones:** 20-40% of gradient radius

**B. Optional 4th Gradient (Circular - 1 layer)**
- **Purpose:** Additional accent spot for variety
- **Shape:** Circular gradient for point-source lighting
- **Color:** Purple-600 (`--app-bg-gradient4`) - #9333EA
- **Position:** 45% 15% (top-center area)
- **Transition Zone:** 28% of gradient radius

**C. Base Gradient (Linear - Bottom Layer)**
- **Purpose:** Provides the foundational color depth and contrast
- **Type:** Linear gradient at 135 degrees (diagonal)
- **Color Stops (from centralized system):**
  - `--app-bg-base-gradient-start` (0%) - Dark blue-black (matches HTML background)
  - `--app-bg-base-gradient-mid1` (40%) - Slightly lighter dark blue
  - `--app-bg-base-gradient-mid2` (70%) - Dark purple-black
  - `--app-bg-base-gradient-end` (100%) - Dark blue-gray
- **Effect:** Creates subtle depth and prevents flat appearance

**Key Properties:**
- `background-size: 100% 100%` - Ensures gradients cover full viewport
- `background-attachment: fixed` - **Critical:** Keeps background fixed during scroll (creates parallax effect)
- `min-height: 100vh` - Ensures full viewport coverage

---

### Layer 3: Noise/Grain Texture Overlay

```239:253:src/index.css
  /* Grainy noise texture overlay for pixelated color transitions */
  /* Adjust opacity here to control grain intensity (0 = invisible, 1 = full intensity) */
  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='turbulence' baseFrequency='3' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='5 0 0 0 -2 0 5 0 0 -2 0 0 5 0 -2 0 0 0 1 0'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='discrete' tableValues='0 1'/%3E%3CfeFuncG type='discrete' tableValues='0 1'/%3E%3CfeFuncB type='discrete' tableValues='0 1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 1;
    opacity: 0.5; /* Grain intensity: 0 = invisible, 0.1 = subtle, 0.3 = moderate, 0.5+ = strong, 1 = maximum */
    mix-blend-mode: overlay;
  }
```

**Implementation:** Uses CSS `::before` pseudo-element with inline SVG data URI.

**SVG Filter Breakdown:**

The SVG uses SVG filters to generate procedural noise:

1. **`<feTurbulence>`** - Generates Perlin noise
   - `type='turbulence'` - Creates turbulent noise pattern
   - `baseFrequency='3'` - **Controls grain size** (higher = finer grain, lower = coarser)
   - `numOctaves='2'` - **Controls detail level** (more octaves = more detail)
   - `stitchTiles='stitch'` - Ensures seamless tiling

2. **`<feColorMatrix>`** - Enhances contrast
   - Matrix values: `5 0 0 0 -2 0 5 0 0 -2 0 0 5 0 -2 0 0 0 1 0`
   - Multiplies RGB channels by 5 and subtracts 2
   - **Effect:** Increases contrast and makes noise more visible

3. **`<feComponentTransfer>`** - Converts to black/white
   - `type='discrete'` - Creates step function (not smooth)
   - `tableValues='0 1'` - Maps values to pure black (0) or white (1)
   - **Effect:** Creates high-contrast, pixelated grain (not smooth noise)

4. **Final Rect** - Applies filter
   - `opacity='1'` - SVG internal opacity (set to 1 for full control via CSS)
   - Filter applied via `filter='url(#noiseFilter)'`

**CSS Properties:**
- `position: fixed` - Stays in place during scroll (matches body background)
- `pointer-events: none` - Doesn't interfere with user interactions
- `z-index: 1` - Sits above body background, below filter overlay and UI
- `opacity: 0.5` - **Grain intensity control** - Edit this value directly in CSS (0 = invisible, 1 = maximum)
- `mix-blend-mode: overlay` - **Critical:** Blends grain with background using overlay blend mode

**Overlay Blend Mode Effect:**
- Lightens dark areas slightly
- Darkens light areas slightly
- Creates subtle texture without overwhelming the gradients
- Maintains color saturation

**Note:** Grain opacity is controlled directly in CSS (not centralized) for immediate effect when editing.

---

### Layer 4: Filter Overlay

```255:270:src/index.css
  /* Filter overlay layer - for brightness/darkness/tint control */
  /* Adjust background-color here to control brightness/darkness/tint */
  /* Examples: rgba(0, 0, 0, 0.2) = darken, rgba(255, 255, 255, 0.1) = lighten, rgba(100, 50, 200, 0.15) = tint */
  /* z-index: 1 ensures it sits above background gradients and grain, but below all app UI content (which uses z-index: 2+) */
  body::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(34, 56, 88, 0.4); /* Change this: rgba(0,0,0,0) = no effect, rgba(0,0,0,0.2) = darken, rgba(255,255,255,0.1) = lighten */
    pointer-events: none;
    z-index: 1; /* Above background (z-index: 0) and grain (z-index: 1, but ::after comes after ::before), below app UI (z-index: 2+) */
    opacity: 1;
  }
```

**Purpose:** Provides a color overlay layer for controlling overall brightness, darkness, or tinting of the background.

**CSS Properties:**
- `position: fixed` - Stays in place during scroll
- `pointer-events: none` - Doesn't interfere with user interactions
- `z-index: 1` - Above background gradients and grain, but below all app UI content
- `background-color` - **Control point** - Edit this value directly in CSS
- `opacity: 1` - Full opacity (color intensity controlled via background-color alpha)

**Usage Examples:**
- `rgba(0, 0, 0, 0)` - No effect (transparent)
- `rgba(0, 0, 0, 0.2)` - Darken by 20%
- `rgba(255, 255, 255, 0.1)` - Lighten by 10%
- `rgba(100, 50, 200, 0.15)` - Purple tint
- `rgba(59, 130, 246, 0.15)` - Blue tint

**Note:** Filter overlay is controlled directly in CSS (not centralized) for immediate effect when editing.

---

## 🎛️ How to Modify the Background

### Changing Base Colors

**HTML Background:**
Edit in `index.css`:
```css
html {
  background-color: var(--app-bg-base); /* Controlled via CSS variable */
}
```

Or update the centralized value in `glassmorphism-styles.ts`:
```typescript
appBackground: {
  base: '#0a0911', // Change this value
}
```
Then sync the CSS variable in `index.css` `:root` section.

**Base Gradient Colors:**
Update in `glassmorphism-styles.ts`:
```typescript
appBackground: {
  baseGradientStart: '#0a0911', // Start color
  baseGradientMid1: '#1a1825',  // Mid color 1
  baseGradientMid2: '#0f0e1f',  // Mid color 2
  baseGradientEnd: '#151428',   // End color
}
```
Then sync the CSS variables in `index.css` `:root` section.

### Adjusting Aurora Lights

**Change Gradient Colors (Centralized):**
Update in `glassmorphism-styles.ts`:
```typescript
appBackground: {
  gradient1: 'rgba(255, 107, 197, 0.25)', // Pink aurora
  gradient2: 'rgba(169, 132, 255, 0.22)',  // Purple aurora
  gradient3: 'rgba(94, 92, 230, 0.28)',    // Indigo aurora
  gradient4: 'rgba(147, 51, 234, 0.2)',    // Optional 4th gradient
  gradient1Fade: 'rgba(255, 107, 197, 0.12)', // Pink fade
  gradient2Fade: 'rgba(169, 132, 255, 0.1)',  // Purple fade
  gradient3Fade: 'rgba(94, 92, 230, 0.14)',  // Indigo fade
}
```
Then sync the CSS variables in `index.css` `:root` section.

**Add/Remove Aurora Gradients:**
Edit directly in `index.css` `body` background property:
- Add more `radial-gradient(...)` entries
- Remove entries to reduce color spots
- Order matters: First gradient = top layer

**Change Aurora Positions:**
Edit directly in `index.css`:
```css
radial-gradient(ellipse at 20% 30%, ...) /* Change 20% 30% to new position */
```

**Change Aurora Size:**
Edit fade percentages in `index.css`:
- Increase fade percentages (e.g., `transparent 60%`) = larger glow
- Decrease fade percentages (e.g., `transparent 25%`) = smaller, tighter glow

### Modifying Grain/Noise Texture

**Change Grain Intensity (Direct in CSS):**
Edit `opacity` property in `index.css` `body::before`:
```css
body::before {
  opacity: 0.5; /* Change this: 0 = invisible, 0.1 = subtle, 0.3 = moderate, 0.5+ = strong, 1 = maximum */
}
```

**Change Grain Size (Fineness):**
Edit the SVG `baseFrequency` parameter in `index.css` `body::before` background-image URL:
```xml
baseFrequency='3' /* Change this value */
```
- **Higher values** (e.g., `5`) = finer, more detailed grain
- **Lower values** (e.g., `1`) = coarser, chunkier grain
- **Current:** `3` = fine grain

**Change Grain Detail:**
Edit the SVG `numOctaves` parameter in `index.css`:
```xml
numOctaves='2' /* Change this value */
```
- **Higher values** (e.g., `4`) = more detail, more complex patterns
- **Lower values** (e.g., `1`) = simpler, smoother patterns
- **Current:** `2` = balanced detail

**Change Grain Contrast:**
Edit the SVG `feColorMatrix` values in `index.css`:
```xml
<feColorMatrix type='matrix' values='5 0 0 0 -2 0 5 0 0 -2 0 0 5 0 -2 0 0 0 1 0'/>
```
- First number in each row (currently `5`) = contrast multiplier
- Last number in each row (currently `-2`) = brightness offset
- **Higher multiplier** (e.g., `7`) = higher contrast grain
- **Lower multiplier** (e.g., `3`) = softer grain

**Change Grain Blend Mode:**
Edit in `index.css`:
```css
body::before {
  mix-blend-mode: overlay; /* Change this */
}
```
Options:
- `overlay` - Current (subtle, maintains colors)
- `multiply` - Darker, more intense
- `screen` - Lighter, softer
- `soft-light` - Very subtle
- `hard-light` - High contrast
- `normal` - No blending (grain appears on top)

**Remove Grain Entirely:**
Comment out or delete the `body::before` block, or set `opacity: 0`.

### Modifying Filter Overlay

**Change Brightness/Darkness/Tint (Direct in CSS):**
Edit `background-color` property in `index.css` `body::after`:
```css
body::after {
  background-color: rgba(0, 0, 0, 0.2); /* Change this value */
}
```

**Examples:**
- `rgba(0, 0, 0, 0)` - No effect (transparent)
- `rgba(0, 0, 0, 0.2)` - Darken by 20%
- `rgba(255, 255, 255, 0.1)` - Lighten by 10%
- `rgba(100, 50, 200, 0.15)` - Purple tint
- `rgba(59, 130, 246, 0.15)` - Blue tint

**Remove Filter Overlay:**
Set `background-color: rgba(0, 0, 0, 0)` or comment out the `body::after` block.

### Changing Background Behavior

**Make Background Scroll (Remove Parallax):**
```css
body {
  background-attachment: scroll; /* Change from 'fixed' */
}
```

**Change Background Size:**
```css
body {
  background-size: 200% 200%; /* Larger = zoomed in */
  /* or */
  background-size: 50% 50%;   /* Smaller = zoomed out */
}
```

---

## 🔗 Relationship to Color System

**Hybrid Approach:** The background system uses a combination of centralized colors and direct CSS controls.

**Centralized (in `glassmorphism-styles.ts`):**
- Base color (`appBackground.base`)
- Gradient colors (`appBackground.gradient1-4` and fade stops)
- Base gradient stops (`appBackground.baseGradientStart/End`)

**Direct CSS Control (in `index.css`):**
- Grain opacity (`body::before` → `opacity` property)
- Filter overlay (`body::after` → `background-color` property)
- Grain SVG parameters (baseFrequency, numOctaves, etc.)

**Why This Split?**
- Gradient colors change infrequently → centralized for consistency
- Grain/filter controls change frequently during design → direct CSS for immediate effect

**Component-Level Styling:**
- `glassmorphism-styles.ts` also contains component-level styling (glassmorphism effects, buttons, containers)
- These are separate from the app background system

---

## 🎨 Color Palette Reference

### Current Aurora Colors (Centralized)

**Location:** `glassmorphism-styles.ts` → `COLOR_PALETTE.appBackground`

| Gradient | Color Name | RGB Value | Hex | Usage |
|----------|------------|-----------|-----|-------|
| gradient1 | Hot Pink | `rgba(255, 107, 197, 0.25)` | #FF6BC5 | Primary aurora light (ellipse) |
| gradient2 | Light Purple | `rgba(169, 132, 255, 0.22)` | #A984FF | Secondary aurora light (ellipse) |
| gradient3 | Deep Indigo | `rgba(94, 92, 230, 0.28)` | #5E5CE6 | Tertiary aurora light (ellipse) |
| gradient4 | Purple-600 | `rgba(147, 51, 234, 0.2)` | #9333EA | Optional accent spot (circle) |

### Base Gradient Colors

| Stop | Hex | RGB Approximation | Purpose |
|------|-----|-------------------|---------|
| 0% | #0a0911 | rgb(10, 9, 17) | Darkest (matches HTML) |
| 40% | #1a1825 | rgb(26, 24, 37) | Mid-dark |
| 70% | #0f0e1f | rgb(15, 14, 31) | Mid-light |
| 100% | #151428 | rgb(21, 20, 40) | Lightest |

---

## 🧪 Testing Changes

### Quick Test Checklist

1. **Viewport Coverage:**
   - [ ] Background covers full screen at all sizes
   - [ ] No white gaps at edges
   - [ ] Scrollbar area matches background

2. **Gradient Visibility:**
   - [ ] Aurora lights are visible but not overwhelming
   - [ ] Colors blend smoothly
   - [ ] Base gradient provides depth

3. **Grain Texture:**
   - [ ] Grain is visible but subtle
   - [ ] Doesn't interfere with readability
   - [ ] Consistent across viewport

4. **Performance:**
   - [ ] Smooth scrolling (especially with `background-attachment: fixed`)
   - [ ] No visual lag
   - [ ] Works on mobile devices

5. **Browser Compatibility:**
   - [ ] Chrome/Edge (Chromium)
   - [ ] Firefox
   - [ ] Safari
   - [ ] Mobile browsers

---

## 📝 Notes

### Why `background-attachment: fixed`?

This creates a **parallax effect** where the background stays still while content scrolls. This is intentional for the aurora effect, but can impact performance on some devices. If you experience performance issues, change to `scroll`.

### Why SVG Noise Instead of Image?

- **Scalable:** Works at any resolution
- **No file size:** Embedded as data URI
- **Customizable:** Easy to adjust parameters
- **Performance:** GPU-accelerated in modern browsers

### Why Multiple Gradient Layers?

Stacking gradients creates depth and complexity that a single gradient cannot achieve. Each layer adds subtle variation.

### Z-Index Hierarchy

```
z-index: 2+ → App UI content (Index.tsx, components, modals, etc.)
z-index: 1  → body::after (filter overlay) - top background layer
z-index: 1  → body::before (grain overlay) - below filter overlay (::after comes after ::before in DOM)
z-index: 0  → body (gradient background) - default stacking
z-index: 0  → html (base color) - default stacking
```

**Stacking Order (bottom to top):**
1. HTML base color
2. Body gradients
3. Grain overlay (`body::before`)
4. Filter overlay (`body::after`) - appears above grain due to DOM order
5. App UI content (z-index: 2+)

**Note:** The filter overlay and grain both use `z-index: 1`, but `body::after` appears above `body::before` because pseudo-elements stack in DOM order (::after comes after ::before).

---

## 🔄 Migration

If you want to move the background system to a different file or make it themeable:

1. **Extract to CSS Variables:**
   ```css
   :root {
     --bg-base: #0a0911;
     --bg-gradient-start: #0a0911;
     --bg-gradient-end: #151428;
     --grain-opacity: 0.3;
     --grain-frequency: 0.9;
   }
   ```

2. **Create Theme Variants:**
   ```css
   [data-theme="dark"] { /* current */ }
   [data-theme="light"] { /* light variant */ }
   [data-theme="minimal"] { /* no gradients */ }
   ```

3. **Make Grain Optional:**
   ```css
   body[data-grain="false"]::before {
     display: none;
   }
   ```

---

---

## 📚 Quick Reference

### Where to Edit What

| Control | Location | File | Notes |
|---------|----------|------|-------|
| Base color | Centralized | `glassmorphism-styles.ts` | Sync to CSS variable |
| Gradient colors | Centralized | `glassmorphism-styles.ts` | Sync to CSS variables |
| Base gradient stops | Centralized | `glassmorphism-styles.ts` | Sync to CSS variables |
| Grain opacity | Direct CSS | `index.css` → `body::before` | Edit `opacity` property |
| Grain size/detail | Direct CSS | `index.css` → `body::before` | Edit SVG in background-image URL |
| Filter overlay | Direct CSS | `index.css` → `body::after` | Edit `background-color` property |
| Gradient positions | Direct CSS | `index.css` → `body` | Edit gradient positions in background property |

### Current Settings

- **Gradients:** 3-4 (simplified from original 10)
- **Grain baseFrequency:** 3 (fine grain)
- **Grain numOctaves:** 2 (balanced detail)
- **Grain opacity:** 0.5 (moderate intensity)
- **Filter overlay:** `rgba(34, 56, 88, 0.4)` (blue tint, 40% opacity)

---

*Last Updated: January 15, 2025*
*Updated to reflect simplified gradient system, filter overlay layer, and hybrid centralization approach*

