# Image Editor Implementation

**Date**: October 22, 2025  
**Status**: Complete and tested

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
ShotCard applies CSS transforms → PDF export uses store values
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

#### `domRenderer.ts` - PDF Export
```typescript
// Use percentage values from store, convert to pixels for captured container
const imageOffsetX = (shot.imageOffsetX || 0) * containerWidth;
const imageOffsetY = (shot.imageOffsetY || 0) * containerHeight;
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
1. **Store values**: PDF export reads `imageScale`, `imageOffsetX`, `imageOffsetY` from shot store
2. **Container dimensions**: Uses actual captured container size (not inline styles)
3. **Pixel conversion**: Converts percentages to pixels based on captured dimensions
4. **Canvas rendering**: Applies transforms using Canvas API

### Why Not Inline Styles?
- **Timing issue**: Inline styles contain pixel values calculated for scaled view
- **Scale removal**: PDF export temporarily removes CSS scale, changing container size
- **Stale data**: Inline styles become incorrect when container dimensions change
- **Store accuracy**: Store values are always current and percentage-based

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
- `src/utils/export/domCapture.ts` - Pass transform data from store
- `src/utils/export/domRenderer.ts` - Use percentage-based offsets
- `src/utils/export/pdfRenderer.ts` - Updated to use DOMCapture approach

---

## 🎯 Key Principles

### 1. **Percentage-Based Positioning**
- Store all offsets as percentages of container dimensions
- Convert to pixels only when applying CSS transforms
- Use aspect ratio as the stable reference point

### 2. **Store-First Data Flow**
- PDF export reads from store, not DOM
- Inline styles are for display only
- Store values are the source of truth

### 3. **Responsive Design**
- Editor adapts to different aspect ratios
- Grid layout changes don't affect positioning
- Works across different screen sizes

### 4. **User Experience**
- Intuitive click-and-drag interface
- Real-time visual feedback
- Seamless integration with existing workflow

---

*Last Updated: October 22, 2025*
