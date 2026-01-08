# Image Editor Fix - Test Implementation V2

**Date:** November 26, 2025  
**Branch:** `test/image-editor-fix-v2`  
**Status:** Testing

---

## 🎯 Goal

Allow Image Editor to pan/zoom and reveal the full original image, while maintaining the current "fill frame" behavior for initial display.

---

## 🔧 Change Made

**File:** `src/components/ShotCard.tsx`  
**Line:** 406-409

**Before:**
```typescript
className="w-full h-full object-cover"
style={{
  borderRadius: `${storyboardTheme.shotCard.borderRadius}px`,
  transform: `scale(${shot.imageScale || 1.0}) translate(${actualOffsetX}px, ${actualOffsetY}px)`,
```

**After:**
```typescript
className="w-full h-full"
style={{
  borderRadius: `${storyboardTheme.shotCard.borderRadius}px`,
  objectFit: 'none',
  transform: `scale(${shot.imageScale || 1.0}) translate(${actualOffsetX}px, ${actualOffsetY}px)`,
```

**What changed:**
- Removed `object-cover` from className
- Added `objectFit: 'none'` to inline styles

---

## 🤔 How This Should Work

### With `object-cover` (current/old):
1. CSS scales image to fill container
2. CSS **crops** overflow parts
3. Only cropped image is in DOM
4. Transforms move the cropped image ❌

### With `object-fit: none` (new):
1. Image displays at natural size
2. `w-full h-full` on className sizes the image element
3. Image is **NOT cropped** - full image is in DOM
4. Container's `overflow-hidden` clips the VIEW
5. Transforms can move the FULL image within the clipped viewport ✅

---

## 📋 Test Checklist

### Test 1: Initial Display
- [ ] Add a new portrait image (taller than wide)
- [ ] **Expected:** Image should fill the container width, height may extend beyond
- [ ] **Check:** Is there letterboxing? (black bars on sides)

### Test 2: Image Editor - Portrait Image
- [ ] Open Image Editor with portrait image
- [ ] Pan DOWN
- [ ] **Expected:** Should reveal the BOTTOM part of the image that was hidden
- [ ] Pan UP
- [ ] **Expected:** Should reveal the TOP part of the image that was hidden

### Test 3: Image Editor - Landscape Image
- [ ] Add a landscape image (wider than tall)
- [ ] Open Image Editor
- [ ] Pan LEFT/RIGHT
- [ ] **Expected:** Should reveal hidden left/right portions

### Test 4: Zoom Out
- [ ] In Image Editor, zoom OUT to 50%
- [ ] **Expected:** Should see MORE of the original image (possibly with empty space around it)

### Test 5: Existing Images
- [ ] Load a project with existing positioned images
- [ ] **Expected:** They may look different (positioned parts revealed/hidden)
- [ ] **Action:** Re-adjust in Image Editor if needed

---

## ⚠️ Known Trade-offs

### Possible Issue: Images might display smaller initially
- **Why:** Without `object-cover`, images display at natural size
- **Impact:** Small images might not fill the container
- **If this happens:** We need to add `min-width/min-height` logic

### Possible Issue: Images might show letterboxing
- **Why:** If image aspect ratio doesn't match container
- **Impact:** Black bars visible initially
- **If this happens:** Need to calculate initial scale to match `object-cover`

---

## 🔄 Rollback Instructions

If this doesn't work:

```bash
cd /home/wsamatis/projects/storyboard-app-claude/shot-flow-builder
git checkout custom-styles
```

---

## 📝 Next Steps After Testing

**If it works:**
1. Apply same change to PDF export renderer
2. Test PDF WYSIWYG
3. Document the fix
4. Merge to main

**If it doesn't work:**
1. Document what went wrong
2. Try alternative approach (calculate base scale factor)
3. Rollback to custom-styles

---

*Ready to test!*

