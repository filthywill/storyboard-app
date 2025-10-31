# Image Transform System Analysis

## Current System Overview

### Component Relationship Map

```
StoryboardPage (scale: 0.831)
  ├── previewDimensions calculation (based on gridCols + aspectRatio)
  │   └── imageContainerWidth = f(gridCols, fixedWidth=1000)
  │   └── imageHeight = f(imageContainerWidth, aspectRatio)
  │
  ├── ShotCard (uses previewDimensions)
  │   └── Image with CSS transform:
  │       transform: scale(imageScale) translate(imageOffsetX, imageOffsetY)
  │       transform-origin: center center
  │
  └── ImageEditorModal
      ├── Uses SAME previewDimensions calculation
      ├── Stores absolute pixel offsets: imageOffsetX, imageOffsetY
      └── Adjusts drag sensitivity by imageScale
```

## 🔴 CRITICAL PROBLEM IDENTIFIED

### The Root Cause

**Image offsets (`imageOffsetX`, `imageOffsetY`) are stored as ABSOLUTE PIXEL VALUES tied to a SPECIFIC CONTAINER SIZE, but the container size CHANGES based on `gridCols`.**

### Example Scenario

**Setup:**
- Aspect Ratio: 16:9
- Grid Layout: 3 columns
- Resulting container width: ~308px (calculated from 1000px fixed width)

**User edits image:**
1. Opens Image Editor (shows container at 308px width)
2. Drags image 50px to the right
3. Saves: `imageOffsetX = 50px`

**User changes grid to 2 columns:**
- New container width: ~476px (wider because fewer columns)
- Image still uses `imageOffsetX = 50px`
- **Result**: Image appears to shift LEFT because 50px in a 476px container is proportionally less than 50px in a 308px container

### Why Current System Breaks

```typescript
// ImageEditorModal.tsx - Lines 82-104
const handleMouseMove = useCallback((e: MouseEvent) => {
  const deltaX = e.clientX - dragStart.x;
  const deltaY = e.clientY - dragStart.y;
  
  // This adjusts for ZOOM but NOT for container size
  const scale = editingShot.imageScale || 1.0;
  const adjustedDeltaX = deltaX / scale;  // ❌ Only accounts for imageScale
  const adjustedDeltaY = deltaY / scale;  // ❌ Not aspect-ratio-relative
  
  setEditingShot({
    ...editingShot,
    imageOffsetX: (editingShot.imageOffsetX || 0) + adjustedDeltaX,  // ❌ Absolute pixels
    imageOffsetY: (editingShot.imageOffsetY || 0) + adjustedDeltaY   // ❌ Absolute pixels
  });
}, [isDragging, dragStart, editingShot]);
```

## ✅ PROPOSED SOLUTION

### Concept: Aspect-Ratio-Relative Coordinates

Instead of storing **absolute pixel offsets**, store **normalized offsets relative to the aspect ratio's base dimensions**.

### Design Philosophy

**Key Insight from User:**
> "The true determining factor should be the Aspect Ratio setting, because this is what defines the shape of the container and this shape never changes regardless of any other setting."

**Solution:**
- Define a **canonical coordinate space** based on aspect ratio (e.g., 16:9 = 1600×900 units)
- Store offsets as **percentages or normalized values** in this space
- Scale these values to actual container size at render time

### Implementation Approach

#### Option A: Percentage-Based (Simpler)

Store offsets as **percentage of container dimensions**:

```typescript
// Storage format
interface Shot {
  imageScale: number;          // e.g., 1.5 (unchanged)
  imageOffsetX: number;         // e.g., 0.15 (15% of width)
  imageOffsetY: number;         // e.g., -0.08 (-8% of height)
  imageOffsetUnit: 'percent';   // Metadata for migration
}

// Application at render time
const actualOffsetX = imageOffsetX * containerWidth;   // 0.15 * 308px = 46.2px
const actualOffsetY = imageOffsetY * containerHeight;  // -0.08 * 173px = -13.84px
```

**Pros:**
- Simple to understand
- Easy to implement
- Works for any aspect ratio
- Container-size-agnostic

**Cons:**
- Existing shots need migration
- Precision loss if not enough decimal places

#### Option B: Canonical Space (More Precise)

Define a **canonical coordinate system** per aspect ratio:

```typescript
// Define canonical dimensions (high enough for sub-pixel precision)
const CANONICAL_DIMENSIONS = {
  '16/9': { width: 1600, height: 900 },
  '4/3':  { width: 1200, height: 900 },
  '1/1':  { width: 900, height: 900 },
  '9/16': { width: 900, height: 1600 },
  // ... etc
};

// Storage format (canonical space)
interface Shot {
  imageScale: number;               // e.g., 1.5
  imageOffsetX: number;              // e.g., 240 (in canonical 1600×900 space)
  imageOffsetY: number;              // e.g., -72
  imageOffsetSpace: 'canonical';    // Metadata
}

// Application at render time
const canonical = CANONICAL_DIMENSIONS[aspectRatio];
const scaleX = containerWidth / canonical.width;
const scaleY = containerHeight / canonical.height;
const actualOffsetX = imageOffsetX * scaleX;  // 240 * (308/1600) = 46.2px
const actualOffsetY = imageOffsetY * scaleY;  // -72 * (173/900) = -13.84px
```

**Pros:**
- High precision (integer math in canonical space)
- Clear semantic meaning
- Easy to reason about
- Supports different aspect ratios cleanly

**Cons:**
- More complex implementation
- Need to define canonical dimensions for each aspect ratio
- Migration more involved

## 🎯 RECOMMENDED SOLUTION: Option A (Percentage-Based)

### Why Percentage-Based?

1. **Simplicity**: Easier to implement and maintain
2. **Universality**: Works for any aspect ratio without predefined constants
3. **Migration**: Easier to migrate existing shots (just divide by container size)
4. **User Understanding**: "Image is 15% to the right" is intuitive

### Implementation Plan

#### Phase 1: Update Image Editor Modal

**File: `ImageEditorModal.tsx`**

```typescript
// Update drag handler to store percentages
const handleMouseMove = useCallback((e: MouseEvent) => {
  if (!isDragging || !editingShot) return;
  
  const deltaX = e.clientX - dragStart.x;
  const deltaY = e.clientY - dragStart.y;
  
  // Convert pixel delta to percentage of container size
  const scale = editingShot.imageScale || 1.0;
  const containerWidth = previewDimensions.width - 18; // Account for padding/border
  const containerHeight = previewDimensions.imageHeight;
  
  // Delta as percentage (adjusted for zoom)
  const percentDeltaX = (deltaX / scale) / containerWidth;
  const percentDeltaY = (deltaY / scale) / containerHeight;
  
  setEditingShot({
    ...editingShot,
    imageOffsetX: (editingShot.imageOffsetX || 0) + percentDeltaX,
    imageOffsetY: (editingShot.imageOffsetY || 0) + percentDeltaY
  });
  
  setDragStart({ x: e.clientX, y: e.clientY });
}, [isDragging, dragStart, editingShot, previewDimensions]);
```

#### Phase 2: Update Shot Card Display

**File: `ShotCard.tsx` (Lines 332-339)**

```typescript
// Calculate actual pixel offsets from percentages
const containerWidth = previewDimensions ? 
  previewDimensions.width - 18 : // Use actual container size
  rect.width; // Fallback to element bounds

const containerHeight = previewDimensions ? 
  previewDimensions.imageHeight :
  rect.height;

// Convert percentage offsets to pixels for CSS transform
const actualOffsetX = (shot.imageOffsetX || 0) * containerWidth;
const actualOffsetY = (shot.imageOffsetY || 0) * containerHeight;

<img
  src={imageSource}
  alt={`Shot ${shot.number}`}
  className="w-full h-full object-cover rounded-sm"
  style={{
    transform: `scale(${shot.imageScale || 1.0}) translate(${actualOffsetX}px, ${actualOffsetY}px)`,
    transformOrigin: 'center center',
    // ...
  }}
/>
```

#### Phase 3: Update PDF Export - DOM Capture

**File: `domCapture.ts` (Lines 256-289)**

No changes needed! The system will read the percentage values from the store and they'll be passed through.

#### Phase 4: Update PDF Export - DOM Renderer

**File: `domRenderer.ts` (Lines 256-292)**

```typescript
// In renderShotImage, after parsing inline transform
if (inlineTransform && inlineTransform !== 'none') {
  const scaleMatch = inlineTransform.match(/scale\(([^)]+)\)/);
  const translateMatch = inlineTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
  
  if (scaleMatch) {
    imageScale = parseFloat(scaleMatch[1]);
  }
  if (translateMatch) {
    // These are ALREADY converted to pixels by ShotCard
    // So we can use them directly
    imageOffsetX = parseFloat(translateMatch[1]);
    imageOffsetY = parseFloat(translateMatch[2]);
  }
}
```

**File: `domRenderer.ts` (Lines 463-500)**

No changes needed in `renderImage`! It already receives pixel values and applies them correctly.

#### Phase 5: Data Migration

**File: `store/storyboardStore.ts`** (Add migration function)

```typescript
// Migration function to convert existing absolute pixel offsets to percentages
export const migrateImageOffsetsToPercentages = (
  shots: Record<string, Shot>,
  pages: StoryboardPage[]
): Record<string, Shot> => {
  const migratedShots = { ...shots };
  
  for (const [shotId, shot] of Object.entries(migratedShots)) {
    // Skip if already migrated or no offsets
    if (!shot.imageOffsetX && !shot.imageOffsetY) continue;
    
    // Find the page this shot belongs to
    const page = pages.find(p => p.shots.some(s => s.id === shotId));
    if (!page) continue;
    
    // Calculate container size for this shot's original grid layout
    const { gridCols, aspectRatio } = page;
    const fixedWidth = 1000;
    const headerPadding = 16;
    const gridWrapperPadding = 4;
    const totalPadding = (headerPadding + gridWrapperPadding) * 2;
    const availableWidth = fixedWidth - totalPadding;
    const gaps = (gridCols - 1) * 8;
    const shotWidth = Math.floor((availableWidth - gaps) / gridCols);
    const cardContentPadding = 8 * 2;
    const imageBorder = 1 * 2;
    const containerWidth = shotWidth - cardContentPadding - imageBorder;
    const [w, h] = aspectRatio.split('/').map(str => parseInt(str.trim(), 10));
    const containerHeight = Math.floor((containerWidth * h) / w);
    
    // Convert absolute pixels to percentages
    migratedShots[shotId] = {
      ...shot,
      imageOffsetX: (shot.imageOffsetX || 0) / containerWidth,
      imageOffsetY: (shot.imageOffsetY || 0) / containerHeight
    };
  }
  
  return migratedShots;
};

// Call this migration on app load or when loading a project
```

## 📊 Impact Analysis

### Benefits

1. **Grid Layout Independence**: Changing grid columns won't affect image positioning
2. **Consistent Appearance**: Image looks the same regardless of container size
3. **PDF Export Accuracy**: Offsets work correctly in export because they scale with container
4. **Future-Proof**: Works with any aspect ratio or layout changes

### Potential Issues

1. **Existing Projects**: Need to migrate old data (one-time operation)
2. **Precision**: Need sufficient decimal places (use 6 decimal places for sub-pixel accuracy)
3. **UI Display**: Image Editor should show pixel values to user, but store percentages internally

## 🤔 Questions for User

### Question 1: Migration Strategy
How should we handle existing projects with absolute pixel offsets?

**Option A**: Automatic migration on project load (recommended)
- Pros: Seamless, users don't notice
- Cons: Need to detect old format, calculate container size retroactively

**Option B**: One-time migration with user confirmation
- Pros: Transparent, user has control
- Cons: Extra step, might be confusing

**Option C**: Dual-format support (read old, write new)
- Pros: Gradual migration, backwards compatible
- Cons: More complex code, technical debt

### Question 2: Image Editor UI
Should the Image Editor display:

**Option A**: Percentage values to user
- "X: 15%, Y: -8%"
- Pros: Matches internal representation
- Cons: Less intuitive for users

**Option B**: Pixel values (but store as percentages)
- "X: 46px, Y: -14px"
- Pros: More intuitive, matches user's mental model
- Cons: Slightly misleading since internal format is different

**Option C**: Both values
- "X: 46px (15%), Y: -14px (-8%)"
- Pros: Educational, transparent
- Cons: Cluttered UI

### Question 3: Decimal Precision
How many decimal places for percentage storage?

**Recommendation**: 6 decimal places (e.g., 0.152345)
- Provides sub-pixel accuracy even for large containers
- Example: 0.000001 × 1000px = 0.001px (imperceptible)

Is this sufficient, or do you need higher precision?

### Question 4: Aspect Ratio Changes
What should happen if user changes a page's aspect ratio AFTER positioning images?

**Option A**: Reset all image positions to default (0, 0)
- Pros: Clean slate, no weird stretching
- Cons: User loses work

**Option B**: Keep percentage positions (image may look different)
- Pros: Preserves user intent (percentage-wise)
- Cons: Visual appearance changes (15% of 16:9 width ≠ 15% of 1:1 width)

**Option C**: Prompt user to choose
- Pros: User control
- Cons: Interrupts workflow

## 🚀 Next Steps

Please review this analysis and answer the questions above. Once we align on the approach, I'll implement the solution with confidence that it will:

1. ✅ Fix the current PDF export offset issue
2. ✅ Make image positioning stable across grid layout changes
3. ✅ Future-proof the system for any container size variations
4. ✅ Maintain WYSIWYG accuracy

The core insight is: **Aspect Ratio is the stable anchor, grid layout is variable → store offsets relative to aspect ratio's container dimensions (as percentages).**



