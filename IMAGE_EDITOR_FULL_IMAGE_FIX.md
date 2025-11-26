# Image Editor Full Image Support Fix

**Date:** November 26, 2025  
**Branch:** `fix/image-editor-full-image-support`  
**Status:** Implementation in progress

---

## 🎯 Problem Statement

Currently, the Image Editor feature cannot reveal parts of images beyond the visible container boundaries. This is because `object-cover` pre-crops the image before transforms are applied.

**Current Behavior:**
- Images use `object-cover` CSS property
- Browser crops image to fill container dimensions
- Transform operations (zoom/pan) only affect the already-cropped image
- User cannot pan to reveal hidden portions of original image

**Desired Behavior:**
- Full original image should be available in DOM
- Container acts as viewport/"window" showing portion of image
- Zoom/pan transforms can reveal any part of original image
- User can zoom out to see entire image (even with letterboxing)

---

## 🔍 Root Cause Analysis

### Display System (ShotCard.tsx)
```typescript
// Line 406
className="w-full h-full object-cover"
```
- `object-cover` crops image to fill container
- Excess pixels are discarded
- Transform operates on cropped result

### PDF Export System (domRenderer.ts)
```typescript
// Lines 640-648
if (objectFit === 'cover') {
  // Calculates crop dimensions to fill bounds
  if (imgAspect > boundsAspect) {
    drawWidth = bounds.height * imgAspect;
  } else {
    drawHeight = bounds.width / imgAspect;
  }
}
```
- Canvas rendering replicates `object-cover` logic
- Maintains WYSIWYG with display
- But also limits image to cropped portion

**Conclusion:** Both systems use `object-cover` semantics, so WYSIWYG is maintained, but full image is not available.

---

## ✅ Solution Design

Replace `object-cover` with `object-fit: none` semantics in both display and PDF export.

### Key Principles:
1. **Full image in DOM** - Load complete original image
2. **Container clips overflow** - `overflow: hidden` creates viewport
3. **Transforms reveal** - Scale/translate can show any part of image
4. **Minimum scale** - Small images scale up to fill at least 100% width
5. **Center by default** - Images start centered before user transforms
6. **WYSIWYG preserved** - Display and PDF export must match exactly

---

## 📋 Implementation Plan

### Change 1: ShotCard.tsx (Display)

**File:** `shot-flow-builder/src/components/ShotCard.tsx`  
**Line:** 406

**Current Code:**
```typescript
<img
  src={imageSource}
  alt={`Shot ${shot.number}`}
  className="w-full h-full object-cover"
  style={{
    borderRadius: `${storyboardTheme.shotCard.borderRadius}px`,
    transform: `scale(${shot.imageScale || 1.0}) translate(${actualOffsetX}px, ${actualOffsetY}px)`,
    transformOrigin: 'center center',
    border: 'none',
    boxShadow: 'none',
    outline: 'none'
  }}
  onError={handleImageError}
/>
```

**New Code:**
```typescript
<img
  src={imageSource}
  alt={`Shot ${shot.number}`}
  className="w-full h-auto"
  style={{
    borderRadius: `${storyboardTheme.shotCard.borderRadius}px`,
    objectFit: 'none',
    objectPosition: 'center center',
    minWidth: '100%',
    minHeight: '100%',
    transform: `scale(${shot.imageScale || 1.0}) translate(${actualOffsetX}px, ${actualOffsetY}px)`,
    transformOrigin: 'center center',
    border: 'none',
    boxShadow: 'none',
    outline: 'none'
  }}
  onError={handleImageError}
/>
```

**Changes Explained:**
- `w-full h-auto` - Width fills container, height maintains aspect ratio
- `objectFit: 'none'` - Image keeps natural size, no cropping
- `objectPosition: 'center center'` - Centers image before transforms
- `minWidth: '100%'` - Ensures small images scale up to fill width
- `minHeight: '100%'` - Ensures small images scale up to fill height
- Transform logic unchanged - existing system works with full image

---

### Change 2: domRenderer.ts (PDF Export)

**File:** `shot-flow-builder/src/utils/export/domRenderer.ts`

#### Change 2a: Add 'none' object-fit mode

**Location:** Lines 640-658 (inside `renderImage` method)

**Current Code:**
```typescript
if (objectFit === 'cover') {
  // object-cover: fill container, crop overflow
  if (imgAspect > boundsAspect) {
    // Image is wider - fit to height (crop sides)
    drawWidth = bounds.height * imgAspect;
  } else {
    // Image is taller - fit to width (crop top/bottom)
    drawHeight = bounds.width / imgAspect;
  }
} else {
  // object-contain: show full image, add letterboxing
  if (imgAspect > boundsAspect) {
    // Image is wider - fit to width (letterbox top/bottom)
    drawHeight = bounds.width / imgAspect;
  } else {
    // Image is taller - fit to height (letterbox sides)
    drawWidth = bounds.height * imgAspect;
  }
}
```

**New Code:**
```typescript
if (objectFit === 'cover') {
  // object-cover: fill container, crop overflow
  if (imgAspect > boundsAspect) {
    // Image is wider - fit to height (crop sides)
    drawWidth = bounds.height * imgAspect;
  } else {
    // Image is taller - fit to width (crop top/bottom)
    drawHeight = bounds.width / imgAspect;
  }
} else if (objectFit === 'none') {
  // object-fit: none - image at natural size, scaled to fill at least container
  // This matches CSS: object-fit: none with min-width: 100%, min-height: 100%
  
  // Calculate scale factors to fill container (minimum scale)
  const scaleToFillWidth = bounds.width / imageData.naturalWidth;
  const scaleToFillHeight = bounds.height / imageData.naturalHeight;
  const minScale = Math.max(scaleToFillWidth, scaleToFillHeight);
  
  // Apply minimum scale to ensure image fills container
  drawWidth = imageData.naturalWidth * minScale;
  drawHeight = imageData.naturalHeight * minScale;
} else {
  // object-contain: show full image, add letterboxing
  if (imgAspect > boundsAspect) {
    // Image is wider - fit to width (letterbox top/bottom)
    drawHeight = bounds.width / imgAspect;
  } else {
    // Image is taller - fit to height (letterbox sides)
    drawWidth = bounds.height * imgAspect;
  }
}
```

**Changes Explained:**
- New `else if (objectFit === 'none')` branch
- Calculates minimum scale to fill container (like CSS `min-width/min-height: 100%`)
- Image maintains natural aspect ratio
- Scales up small images, keeps large images at size that fills container
- User transforms can then zoom out to reveal full image

#### Change 2b: Update renderImage call

**Location:** Line 381

**Current Code:**
```typescript
await this.renderImage(shot.imageData, imageBounds, imageScale, imageOffsetX, imageOffsetY);
```

**New Code:**
```typescript
await this.renderImage(shot.imageData, imageBounds, imageScale, imageOffsetX, imageOffsetY, 'none');
```

**Changes Explained:**
- Pass `'none'` as objectFit parameter
- Uses new 'none' logic instead of default 'cover'
- Matches CSS behavior in ShotCard

---

## 🧪 Testing Plan

### Test Scenarios:

#### 1. Portrait Image in Landscape Container
- **Image:** 1000px × 1500px (2:3 portrait)
- **Container:** 300px × 169px (16:9 landscape)
- **Expected:** Image centered, top/bottom clipped, can pan up/down to reveal
- **Test:** Zoom out to see full image with letterboxing

#### 2. Landscape Image in Portrait Container
- **Image:** 1500px × 1000px (3:2 landscape)
- **Container:** 169px × 300px (9:16 portrait)
- **Expected:** Image centered, left/right clipped, can pan left/right to reveal
- **Test:** Zoom out to see full image with letterboxing

#### 3. Square Image in Landscape Container
- **Image:** 1000px × 1000px (1:1 square)
- **Container:** 300px × 169px (16:9 landscape)
- **Expected:** Image fills height, sides clipped, can pan left/right
- **Test:** Zoom out to see full square with letterboxing

#### 4. Small Image
- **Image:** 200px × 150px (smaller than container)
- **Container:** 300px × 169px
- **Expected:** Image scales up to fill width (300px × 225px)
- **Test:** Should not show at tiny natural size

#### 5. Matching Aspect Ratio
- **Image:** 1920px × 1080px (16:9)
- **Container:** 300px × 169px (16:9)
- **Expected:** Image scales perfectly to container
- **Test:** No clipping, clean fill

#### 6. Existing Project with Positioned Images
- **Load project:** With images already edited using old system
- **Expected:** Images may appear in different positions
- **Test:** User can re-edit to reposition as needed

#### 7. PDF Export WYSIWYG
- **For each scenario above:**
  - Position image in Image Editor
  - Export to PDF
  - **Expected:** PDF matches on-screen appearance exactly
  - **Test:** Compare side-by-side

#### 8. Extreme Zoom Levels
- **Zoom in:** 400% - should reveal fine detail
- **Zoom out:** 10% - should show full image with large letterboxing
- **Expected:** Smooth behavior at all zoom levels

---

## ⚠️ Known Issues & Trade-offs

### 1. Existing Positioned Images
**Issue:** Images edited with old system may appear differently  
**Impact:** LOW - Acceptable per user requirements  
**Mitigation:** Users can re-edit images if needed  

### 2. No Migration Path
**Issue:** No automatic conversion of old offsets to new system  
**Impact:** LOW - New system is better, worth the one-time adjustment  
**Mitigation:** Document in release notes  

### 3. Transform Origin Behavior
**Issue:** With full image, zoom behavior might feel slightly different  
**Impact:** MEDIUM - Need to test and verify feels natural  
**Mitigation:** Extensive testing with various scenarios  

### 4. Small Image Handling
**Issue:** Very small images will be scaled up, might look pixelated  
**Impact:** LOW - Better than showing tiny image in large container  
**Mitigation:** This is expected behavior, same as before with object-cover  

---

## 🔄 Rollback Plan

If issues are discovered:

### Quick Rollback:
```bash
cd /home/wsamatis/projects/storyboard-app-claude
git checkout custom-styles
```

### Selective Rollback:
```bash
# Stay on fix branch, revert specific files
git checkout custom-styles -- shot-flow-builder/src/components/ShotCard.tsx
git checkout custom-styles -- shot-flow-builder/src/utils/export/domRenderer.ts
```

### Commit Restoration:
Parent repo commit: `5e5a517`  
Submodule commit: `2c8680e`

---

## 📊 Success Criteria

✅ User can pan to reveal hidden parts of original image  
✅ User can zoom out to see entire image  
✅ Small images scale up to fill container  
✅ Images are centered by default  
✅ PDF export matches on-screen display (WYSIWYG)  
✅ Transform system continues to work correctly  
✅ Percentage-based offsets remain valid  
✅ Image Editor modal works seamlessly  

---

## 📝 Files Modified

### Display System:
- `shot-flow-builder/src/components/ShotCard.tsx` (Line 406 + style object)

### PDF Export System:
- `shot-flow-builder/src/utils/export/domRenderer.ts` (Lines 640-658, Line 381)

### Documentation:
- `IMAGE_EDITOR_FULL_IMAGE_FIX.md` (This file)

---

## 🎯 Next Steps

1. ✅ Create feature branch - COMPLETE
2. ✅ Document implementation plan - COMPLETE
3. 🔄 Implement Change 1 (ShotCard.tsx)
4. 🔄 Implement Change 2 (domRenderer.ts)
5. 🔄 Test all scenarios
6. 🔄 Verify PDF WYSIWYG
7. 🔄 Commit changes
8. 🔄 User acceptance testing
9. 🔄 Merge to main or rollback if needed

---

*Last Updated: November 26, 2025*

