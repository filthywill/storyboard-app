# Theme Border Color Debug Guide

## Issue
ShotCard borders appear gray/desaturated regardless of color selected in theme editor. No hue is visible.

## Diagnostic Steps Added

### 1. Console Logging in ShotCard
**File:** `src/components/ShotCard.tsx`

Added `useEffect` that logs theme values whenever they change:
```typescript
console.log('🎨 ShotCard Theme Debug:', {
  borderColor: storyboardTheme.shotCard.border,
  borderWidth: storyboardTheme.shotCard.borderWidth,
  background: storyboardTheme.shotCard.background,
  borderRadius: storyboardTheme.shotCard.borderRadius,
});
```

**What to check:**
- Open browser console (F12)
- Look for `🎨 ShotCard Theme Debug:` messages
- Verify `borderColor` is a valid hex value (e.g., `#ff0000`)
- If it's showing `#cccccc` (gray), the theme isn't updating

### 2. Console Logging in ThemeEditorModal
**File:** `src/components/ThemeEditorModal.tsx`

Added logging in `handleColorChange`:
```typescript
console.log('🎨 Color Change:', { path, value });
console.log('🎨 Updated theme (nested):', updated);
```

**What to check:**
- Open theme editor
- Change border color
- Look for `🎨 Color Change:` messages
- Verify `value` is the hex color you selected (e.g., `#ff0000`)
- Check `🎨 Updated theme (nested):` to see the full updated theme object
- Verify `shotCard.border` matches the color you picked

## How to Test

### Step 1: Open Console
1. Press F12 or right-click → Inspect
2. Go to Console tab
3. Clear console

### Step 2: Change Border Color
1. Open "Style Settings" → "Customize Theme"
2. Click "Border" color in "Shot Cards" section
3. Select a bright, saturated color (e.g., pure red `#ff0000`)
4. Watch console for logs

### Step 3: Analyze Logs

**Expected Flow:**
```
🎨 Color Change: { path: "shotCard.border", value: "#ff0000" }
🎨 Updated theme (nested): { ..., shotCard: { border: "#ff0000", ... } }
🎨 ShotCard Theme Debug: { borderColor: "#ff0000", ... }
```

**Problem Scenarios:**

#### Scenario A: Color picker logs wrong value
```
🎨 Color Change: { path: "shotCard.border", value: "#cccccc" }
```
**Diagnosis:** Color picker isn't capturing the selected color correctly.
**Fix:** Issue with `react-colorful` integration or state management.

#### Scenario B: Theme updates but ShotCard doesn't receive it
```
🎨 Color Change: { path: "shotCard.border", value: "#ff0000" }
🎨 Updated theme (nested): { ..., shotCard: { border: "#ff0000", ... } }
🎨 ShotCard Theme Debug: { borderColor: "#cccccc", ... }
```
**Diagnosis:** Zustand store isn't propagating changes to components.
**Fix:** Check store subscription or immer middleware.

#### Scenario C: All logs show correct value but border is still gray
```
🎨 ShotCard Theme Debug: { borderColor: "#ff0000", ... }
```
**Diagnosis:** CSS is overriding the inline style.
**Fix:** Check browser DevTools → Elements → Inspect border element → See computed styles.

## Browser DevTools Inspection

### Step 4: Inspect Rendered Element
1. Right-click on a shot card border
2. Select "Inspect Element"
3. Look at "Styles" panel
4. Find the `div.shot-card` element
5. Check `style` attribute:
   ```html
   <div style="border-color: rgb(255, 0, 0); border-width: 1px; ...">
   ```
6. Check "Computed" tab for final `border-color` value

**If computed value differs from inline style:**
- There's a CSS rule with higher specificity overriding it
- Look for `!important` rules
- Look for classes that set border-color

## Possible Root Causes

### 1. Tailwind CSS Purge/JIT Issue
- Tailwind might be removing color utilities
- Check if `border-color` inline styles work at all

### 2. CSS Specificity Conflict
- Some global CSS rule is overriding inline styles
- Search for `.shot-card` in all CSS files

### 3. Store State Not Persisting
- Theme changes aren't being saved to localStorage
- Check browser DevTools → Application → Local Storage
- Look for `project-store` or similar key
- Verify `storyboardTheme.shotCard.border` has your color

### 4. Browser Rendering Issue
- Try hard refresh (Ctrl+Shift+R)
- Try incognito mode (no extensions)
- Try different browser

## Quick Test: Hardcode Color

**File:** `src/components/ShotCard.tsx`

Temporarily replace:
```typescript
borderColor: storyboardTheme.shotCard.border,
```

With:
```typescript
borderColor: '#ff0000', // HARDCODED RED FOR TESTING
```

**If this works:**
- Issue is with theme system or store
- Color application mechanism works fine

**If this doesn't work:**
- Issue is with CSS/rendering
- Something is overriding ALL border colors

## Next Steps

Based on console logs and DevTools inspection, determine which scenario matches and follow the corresponding fix path.

## Cleanup

**Remove debug logs after diagnosis:**
1. Remove `useEffect` logging in `ShotCard.tsx`
2. Remove `console.log` statements in `ThemeEditorModal.tsx`

Or keep them wrapped in a DEBUG flag:
```typescript
if (import.meta.env.DEV) {
  console.log('🎨 Debug:', ...);
}
```




