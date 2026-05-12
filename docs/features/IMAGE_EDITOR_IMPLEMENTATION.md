# Image Editor Implementation

**Date**: October 22, 2025  
**Status**: Complete and tested

> **Current PDF note:** The image editor behavior described here is still current, but the production PDF architecture has changed since this document was first written.
>
> Production PDF export is now payload-driven through `/api/export-pdf` and `/export/pdf/render-static`. Use `docs/architecture/PDF_EXPORT_CONTRACT.md` for the active PDF pipeline contract.

---

## 🎯 Overview

The Image Editor provides users with the ability to crop, zoom, and position images within their shot cards. The implementation uses a **percentage-based offset system** to ensure consistent positioning across different grid layouts and screen sizes.

---

## 🏗️ Architecture

### Core Components

1. **`ImageEditorModal.tsx`** - Main editor interface
2. **`ShotCard.tsx`** - Displays images with edit button and applies transforms
3. **`StoryboardPage.tsx`** - Integrates editor with shot management

### Data Flow

```
User clicks "Edit" → ImageEditorModal opens → User drags to position → 
Percentage offsets calculated → Stored in shot data → 
ShotCard applies CSS transforms → export payload serializes store values → static export route renders from payload
```

---

## 🔧 Technical Implementation

### Percentage-Based Offset System

**Why Percentages?**
- **Grid-independent**: Position stays consistent when user changes grid layout (3 cols → 2 cols)
- **Aspect-ratio-anchored**: Uses aspect ratio as the stable reference point
- **Responsive**: Works across different screen sizes and zoom levels

**How It Works:**
1. **Storage**: Offsets stored as percentages (e.g., `imageOffsetX: 0.162338`)
2. **Display**: Converted to pixels for CSS transforms based on current container size
3. **Export**: PDF uses percentage values with actual captured container dimensions

### Key Methods

#### `ImageEditorModal.tsx` - Drag Handling
```typescript
// Convert pixel delta to percentage of container size
const containerWidth = previewDimensions.width - 18; // Account for padding/border
const containerHeight = previewDimensions.imageHeight;
const scale = editingShot.imageScale || 1.0;

const percentDeltaX = (deltaX / scale) / containerWidth;
const percentDeltaY = (deltaY / scale) / containerHeight;

setEditingShot({
  ...editingShot,
  imageOffsetX: (editingShot.imageOffsetX || 0) + percentDeltaX,
  imageOffsetY: (editingShot.imageOffsetY || 0) + percentDeltaY
});
```

#### `ShotCard.tsx` - Transform Application
```typescript
// Convert percentage offsets to pixel values for CSS
const actualOffsetX = (shot.imageOffsetX || 0) * containerWidth;
const actualOffsetY = (shot.imageOffsetY || 0) * containerHeight;

const transform = `scale(${shot.imageScale || 1}) translate(${actualOffsetX}px, ${actualOffsetY}px)`;
```

#### `export-pdf-static.ts` - Current PDF Export Render
```typescript
// Use percentage values from payload, convert to pixels for export dimensions
const actualOffsetX = (shot.imageOffsetX || 0) * previewDimensions.width;
const actualOffsetY = (shot.imageOffsetY || 0) * previewDimensions.imageHeight;
```

---

## 🎨 User Interface

### Image Editor Modal
- **Larger preview**: Shows shot card image frame at larger size for precise editing
- **Same aspect ratio**: Maintains exact aspect ratio of the actual shot card
- **Click and drag**: Intuitive positioning with mouse/touch
- **Zoom controls**: Scale from 10% to 400%
- **Reset button**: Returns to "Fit to Frame" (100% scale, centered)

### Shot Card Integration
- **Edit button**: Appears on hover over image
- **Visual feedback**: Shows current transform in real-time
- **Seamless editing**: No disruption to workflow

---

## 🔄 State Management

### Shot Data Structure
```typescript
interface Shot {
  // ... existing fields
  imageScale: number;        // Zoom level (0.1 to 4.0)
  imageOffsetX: number;     // Horizontal position as percentage (-1.0 to 1.0)
  imageOffsetY: number;     // Vertical position as percentage (-1.0 to 1.0)
}
```

### State Updates
1. **During editing**: Updates stored in `editingShot` state
2. **On apply**: Committed to shot store via `updateShot()`
3. **On cancel**: Discarded, reverts to original values

---

## 📤 PDF Export Integration

### Data Flow for Export
1. **Store snapshot**: `buildServerPdfPayload()` serializes `imageScale`, `imageOffsetX`, and `imageOffsetY` into `ServerPDFExportPayload`
2. **Shared layout math**: Export render uses `calculatePreviewDimensions()` so shot sizing stays aligned with the live storyboard subtree
3. **Pixel conversion**: `src/export-pdf-static.ts` converts percentage offsets to pixels using export-time dimensions
4. **Server capture**: Headless Chromium waits for the readiness contract, then captures the static route DOM with `page.pdf()`

### Why Not Inline Styles?
- **Determinism**: Production PDF export rebuilds the export DOM from payload instead of reading live SPA transforms
- **Scale safety**: Percentage values survive changes in export surface size
- **Stale style avoidance**: Inline styles can reflect the active view, not the export surface
- **Store accuracy**: Stored percentage values remain the source of truth

---

## 🧪 Testing Scenarios

### Basic Functionality
- [ ] Open image editor from shot card
- [ ] Drag to reposition image
- [ ] Use zoom controls (10% to 400%)
- [ ] Reset to fit frame
- [ ] Apply changes
- [ ] Cancel changes

### Grid Layout Independence
- [ ] Edit image in 3-column grid
- [ ] Switch to 2-column grid
- [ ] Verify image position remains consistent
- [ ] Switch to 4-column grid
- [ ] Verify image position remains consistent

### PDF Export Accuracy
- [ ] Edit image with zoom and pan
- [ ] Export to PDF
- [ ] Verify PDF matches on-screen appearance
- [ ] Test with different grid layouts
- [ ] Test with different aspect ratios

### Edge Cases
- [ ] Very small images (should scale appropriately)
- [ ] Very large images (should crop appropriately)
- [ ] Extreme zoom levels (10%, 400%)
- [ ] Extreme pan positions (edges of container)

---

## 🐛 Troubleshooting

### Image Position Wrong After Grid Change
**Cause**: Using absolute pixel offsets instead of percentages
**Fix**: Ensure `imageOffsetX` and `imageOffsetY` are stored as percentages

### PDF Export Shows Wrong Image Position
**Cause**: Reading inline styles instead of store values
**Fix**: Use `shot.imageOffsetX` from store, not `computedStyle.transform`

### Image Jumps During Drag
**Cause**: Native browser drag behavior interfering
**Fix**: Ensure `e.preventDefault()` and `draggable={false}` are set

### Transform Not Applied in Shot Card
**Cause**: CSS transform not being applied to image element
**Fix**: Verify `transform` style is set on the `<img>` tag, not container

---

## 📁 Files Modified

### New Files
- `src/components/ImageEditorModal.tsx` - Main editor component

### Modified Files
- `src/components/ShotCard.tsx` - Added edit button and transform application
- `src/components/StoryboardPage.tsx` - Integrated editor modal
- `src/utils/export/serverPdfPayload.ts` - Serializes transform data into export payload
- `src/export-pdf-static.ts` - Applies percentage-based offsets during static export render
- `api/export-pdf.ts` - Captures the rendered static route through Headless Chromium

---

## 🎯 Key Principles

### 1. **Percentage-Based Positioning**
- Store all offsets as percentages of container dimensions
- Convert to pixels only when applying CSS transforms
- Use aspect ratio as the stable reference point

### 2. **Store-First Data Flow**
- Production PDF export reads from a payload built from store state, not from live DOM mutation
- Inline styles are for live display only
- Store values remain the source of truth

### 3. **Responsive Design**
- Editor adapts to different aspect ratios
- Grid layout changes don't affect positioning
- Works across different screen sizes

### 4. **User Experience**
- Intuitive click-and-drag interface
- Real-time visual feedback
- Seamless integration with existing workflow

---

*Last Updated: April 20, 2026*
