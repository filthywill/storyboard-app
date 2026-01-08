# Centralized Background System - Quick Guide

## 🎯 Overview

The app background system is now centralized in the color system, making it easy to control all background colors, gradients, grain, and filter overlay from one place.

---

## 📍 Where to Make Changes

**Primary Location:** `shot-flow-builder/src/styles/glassmorphism-styles.ts`

Look for the `appBackground` section in `COLOR_PALETTE`:

```typescript
appBackground: {
  base: '#0a0911',                        // HTML base color
  gradient1: 'rgba(255, 107, 197, 0.25)', // Pink aurora
  gradient2: 'rgba(169, 132, 255, 0.22)', // Purple aurora
  gradient3: 'rgba(94, 92, 230, 0.28)',    // Indigo aurora
  gradient4: 'rgba(147, 51, 234, 0.2)',    // Optional 4th gradient
  gradient1Fade: 'rgba(255, 107, 197, 0.12)', // Pink fade
  gradient2Fade: 'rgba(169, 132, 255, 0.1)',  // Purple fade
  gradient3Fade: 'rgba(94, 92, 230, 0.14)',  // Indigo fade
  baseGradientStart: '#0a0911',
  baseGradientMid1: '#1a1825',
  baseGradientMid2: '#0f0e1f',
  baseGradientEnd: '#151428',
  filterOverlay: 'rgba(0, 0, 0, 0)',     // Filter layer
  grainOpacity: 0.3,                      // Grain intensity
}
```

**CSS Variables:** `shot-flow-builder/src/index.css` (lines 9-30)

The CSS file uses CSS custom properties that reference the TypeScript values. **Keep them in sync** when making changes.

---

## 🎨 What Each Property Controls

### Base Color
- **`base`**: The solid background color (HTML element, scrollbar tracks)
- **Default:** `#0a0911` (dark blue-black)

### Gradient Colors (Aurora Lights)
- **`gradient1`**: Pink aurora light (full intensity)
- **`gradient2`**: Purple aurora light (full intensity)
- **`gradient3`**: Indigo aurora light (full intensity)
- **`gradient4`**: Optional 4th gradient (circular spot)

**Fade Stops:**
- **`gradient1Fade`**: Pink mid-fade (for smooth transitions)
- **`gradient2Fade`**: Purple mid-fade
- **`gradient3Fade`**: Indigo mid-fade

### Base Gradient (Foundation)
- **`baseGradientStart`**: Start color (matches base)
- **`baseGradientMid1`**: First mid-point
- **`baseGradientMid2`**: Second mid-point
- **`baseGradientEnd`**: End color

### Filter Overlay
- **Filter overlay**: Controlled directly in CSS (`index.css` → `body::after` → `background-color` property)
  - Edit in: `shot-flow-builder/src/index.css` (line ~265)
  - `rgba(0, 0, 0, 0)` = No effect (transparent)
  - `rgba(0, 0, 0, 0.2)` = Darken by 20%
  - `rgba(255, 255, 255, 0.1)` = Lighten by 10%
  - `rgba(100, 50, 200, 0.15)` = Purple tint

### Grain Texture
- **Grain opacity**: Controlled directly in CSS (`index.css` → `body::before` → `opacity` property)
  - Edit in: `shot-flow-builder/src/index.css` (line ~255)
  - `0` = Invisible (no grain)
  - `0.1` = Very subtle
  - `0.3` = Moderate
  - `0.5+` = Strong

---

## 🔧 Common Modifications

### Change Background Brightness/Tint

**Edit directly in CSS** (`shot-flow-builder/src/index.css`, find `body::after`):

**Darken:**
```css
background-color: rgba(0, 0, 0, 0.2); /* 20% darker */
```

**Lighten:**
```css
background-color: rgba(255, 255, 255, 0.1); /* 10% lighter */
```

**Blue tint:**
```css
background-color: rgba(59, 130, 246, 0.15); /* Blue tint */
```

**Warm tint:**
```css
background-color: rgba(255, 200, 100, 0.1); /* Warm orange tint */
```

**No effect:**
```css
background-color: rgba(0, 0, 0, 0); /* Transparent - no change */
```

### Adjust Gradient Colors

**Change pink aurora to red:**
```typescript
gradient1: 'rgba(239, 68, 68, 0.25)',  // Red instead of pink
gradient1Fade: 'rgba(239, 68, 68, 0.12)',
```

**Change purple aurora to blue:**
```typescript
gradient2: 'rgba(59, 130, 246, 0.22)',  // Blue instead of purple
gradient2Fade: 'rgba(59, 130, 246, 0.1)',
```

### Remove a Gradient

**Remove 4th gradient:**
1. Set `gradient4` to transparent:
```typescript
gradient4: 'rgba(0, 0, 0, 0)',
```

2. Or remove the gradient from CSS (line 230 in `index.css`):
```css
/* Remove this line: */
radial-gradient(circle at 45% 15%, var(--app-bg-gradient4) 0%, transparent 28%),
```

### Adjust Grain Intensity

**Edit directly in CSS** (`shot-flow-builder/src/index.css`, find `body::before`):

**Subtle grain:**
```css
opacity: 0.1; /* In body::before */
```

**Moderate grain:**
```css
opacity: 0.3; /* In body::before */
```

**Strong grain:**
```css
opacity: 0.5; /* In body::before */
```

**Remove grain entirely:**
```css
opacity: 0; /* In body::before */
```

---

## 📝 Step-by-Step: Making Changes

### For Colors and Gradients

1. **Open** `shot-flow-builder/src/styles/glassmorphism-styles.ts`

2. **Find** the `appBackground` section in `COLOR_PALETTE`

3. **Update** the value you want to change

4. **Sync** the CSS variable in `shot-flow-builder/src/index.css` (lines 9-30) if needed

5. **Save** and see the changes immediately

### For Grain Opacity

1. **Open** `shot-flow-builder/src/index.css`

2. **Find** `body::before` (around line 250)

3. **Change** the `opacity` property (currently `0.5`)

4. **Save** and see the changes immediately

### For Filter Overlay (Brightness/Darkness/Tint)

1. **Open** `shot-flow-builder/src/index.css`

2. **Find** `body::after` (around line 257)

3. **Change** the `background-color` property (currently `rgba(0, 0, 0, 0)`)

4. **Save** and see the changes immediately

---

## 🎯 Layer Structure

The background consists of 4 layers (bottom to top):

1. **HTML base** (`--app-bg-base`) - Solid color
2. **Body gradients** - 3-4 radial gradients + 1 linear gradient
3. **Grain overlay** (`body::before`) - Noise texture
4. **Filter overlay** (`body::after`) - Brightness/darkness/tint control

**Z-index order:**
- Filter overlay: `z-index: 2` (top)
- Grain overlay: `z-index: 1`
- Body gradients: `z-index: 0` (default)
- HTML base: `z-index: -1` (default)

---

## 💡 Tips

### Quick Brightness Test
Change `filterOverlay` to see immediate effect:
- `rgba(0, 0, 0, 0.3)` = Much darker
- `rgba(0, 0, 0, 0)` = Normal (no change)
- `rgba(255, 255, 255, 0.2)` = Much lighter

### Color Harmony
Keep gradient colors in the same color family for harmony:
- **Cool tones:** Blues, purples, indigos
- **Warm tones:** Pinks, oranges, reds
- **Mixed:** Use filter overlay to unify different tones

### Performance
- Filter overlay is very lightweight (just a colored layer)
- Grain uses SVG filters (GPU-accelerated)
- Gradients are native CSS (very fast)

---

## 🔗 Related Files

- **Color System:** `shot-flow-builder/src/styles/glassmorphism-styles.ts`
- **CSS Implementation:** `shot-flow-builder/src/index.css` (lines 9-30, 209-250)
- **Documentation:** `BACKGROUND_SYSTEM_DOCUMENTATION.md` (detailed technical docs)

---

*Last Updated: January 15, 2025*
*Centralized background system implementation*

