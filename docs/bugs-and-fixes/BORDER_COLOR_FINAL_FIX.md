# Border Color Final Fix - Diagnostic Guide

## Current State

### What We Did
1. **Removed all aggressive global overrides** (~180 lines)
2. **Added simple protection rule** for themeable components:
```css
.storyboard-themeable,
.storyboard-themeable * {
  border-color: unset !important;
}
```
3. **Applied `.storyboard-themeable` class** to ShotCard and container

### How It Should Work

**CSS Cascade:**
```
1. * { @apply border-border; }          → Sets border-color: black (from --border variable)
2. .storyboard-themeable { unset }      → Removes that black
3. Inline style { border-color: #ff0000; } → Applies your theme color
```

**Result:** Your theme color should display!

---

## Diagnostic Steps

### Step 1: Open Test File
1. Navigate to `shot-flow-builder/BORDER_COLOR_TEST.html`
2. Open in browser
3. **All boxes should show their specified colors** (red, blue, green, magenta)

**If test file works:** CSS logic is correct, issue is with React/inline styles
**If test file doesn't work:** CSS specificity issue remains

### Step 2: Inspect ShotCard in Browser
1. Open your app
2. Right-click on a shot card border
3. Select "Inspect Element"
4. Look at "Computed" tab
5. Find `border-color`

**What to check:**
- Is `border-color` the color you selected? ✅ GOOD
- Is `border-color` black/gray? ❌ Something is still overriding

### Step 3: Check Inline Styles in DOM
In DevTools Elements tab:
```html
<div class="... storyboard-themeable" style="border-color: #ff0000; ...">
```

**Verify:**
- ✅ `storyboard-themeable` class is present
- ✅ `border-color: #ff0000` (or your color) is in style attribute
- ✅ No other border-color in style attribute

### Step 4: Check for Conflicting Classes
Look at the full className in DOM:
```html
<div class="group relative transition-all duration-200 shot-card storyboard-themeable ... ">
```

**Check for:**
- ❌ Any `border-*` utility classes (e.g., `border-black`, `border-gray-200`)
- ❌ Any other classes that might set border-color
- ✅ Should only have layout/behavior classes, not border color classes

---

## If It's Still Not Working

### Possible Remaining Issues

#### Issue A: Tailwind JIT Not Purging
**Symptom:** Old CSS rules still applying after changes
**Fix:** 
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

#### Issue B: CSS Variable Still Being Applied
**Symptom:** `--border` CSS variable overriding inline styles
**Diagnosis:** Check computed styles for `var(--border)`
**Fix:** Add this to protection rule:
```css
.storyboard-themeable,
.storyboard-themeable * {
  border-color: unset !important;
  --border: initial !important;  /* Reset CSS variable too */
}
```

#### Issue C: React Inline Style Not Applying
**Symptom:** Inline style attribute is missing or wrong in DOM
**Diagnosis:** 
- Check React DevTools → ShotCard component → Props → style
- Verify `storyboardTheme.shotCard.border` has correct value

**Fix:** Add debug logging:
```typescript
console.log('🎨 Applying border:', {
  borderColor: storyboardTheme.shotCard.border,
  domElement: 'check DevTools'
});
```

#### Issue D: Another CSS Rule with Higher Specificity
**Symptom:** Computed styles show a different rule winning
**Diagnosis:** In DevTools → Styles tab, look for crossed-out rules
**Fix:** Identify the winning rule and either:
  - Remove it
  - Add it to the exception list
  - Increase specificity of protection rule

---

## Nuclear Option: Force Inline Styles

If nothing else works, we can force inline styles to always win:

### Option 1: Use CSS Custom Properties
**ShotCard.tsx:**
```typescript
style={{
  '--shot-border-color': storyboardTheme.shotCard.border,
  borderColor: 'var(--shot-border-color)',
  // ...
}}
```

**index.css:**
```css
.storyboard-themeable[style*="--shot-border-color"] {
  border-color: var(--shot-border-color) !important;
}
```

### Option 2: Increase Specificity
**index.css:**
```css
/* More specific than any other rule */
.storyboard-themeable.shot-card[style*="border-color"] {
  border-color: var(--shot-border-color) !important;
}
```

### Option 3: Remove Global Border Rule Entirely
**index.css** (line 111):
```css
/* BEFORE */
* {
  @apply border-border;  /* ❌ Remove this */
}

/* AFTER */
* {
  /* Don't apply border defaults globally */
}
```
**Warning:** This might affect other UI components that rely on this default.

---

## Expected Behavior

### When Working Correctly:

**Theme Editor:**
1. Select "Customize Theme"
2. Click "Border" color in "Shot Cards" section
3. Pick bright red (#ff0000)
4. **Border changes immediately to red**

**DevTools Verification:**
```
Computed Styles:
  border-color: rgb(255, 0, 0)  ✅ RED!
  
Element:
  <div class="... storyboard-themeable" 
       style="border-color: rgb(255, 0, 0); ...">
```

**Console Logs:**
```
🎨 Color Change: { path: "shotCard.border", value: "#ff0000" }
🎨 ShotCard Theme Debug: { borderColor: "#ff0000", ... }
```

---

## Next Steps

1. **Run test file** (`BORDER_COLOR_TEST.html`) - verify CSS logic works
2. **Inspect live ShotCard** - find which rule is actually winning
3. **Check console logs** - verify correct color is in theme store
4. **Try Nuclear Option** if all else fails

---

## Contact Information

If this still doesn't work after following all diagnostic steps, please provide:
1. Screenshot of DevTools → Elements → Styles for ShotCard
2. Screenshot of DevTools → Elements → Computed for ShotCard
3. Console logs showing theme changes
4. Result of opening `BORDER_COLOR_TEST.html`

This will help identify the exact blocker.




