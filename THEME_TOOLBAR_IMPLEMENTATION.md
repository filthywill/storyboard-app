# Theme Toolbar Implementation

## Overview
New horizontal toolbar component that provides inline theme customization with dropdown sections, replacing the modal-based approach for better live feedback and UX.

---

## Component Structure

### Main Component: `ThemeToolbar.tsx`

Located below the existing layout toolbar in `StoryboardPage.tsx`.

---

## Toolbar Sections

### 1. **Themes Section**
- **Theme Dropdown** - Select from Light, Dark, or custom themes
- **Plus Button** - Save current settings as a new theme
- **Custom Theme Management** - Delete custom themes with X icon (hover to reveal)

**Features:**
- Preset themes (Light/Dark) always available
- Custom themes stored per-user in Supabase
- Delete confirmation dialog for custom themes
- Auto-switches to Light theme when deleting active theme

---

### 2. **Page Style Section**
Single button with dropdown containing:
- **Background** - Content background color
- **Header Text** - Header text color

**Layout:** Simple color swatches aligned to the right

---

### 3. **Shot Style Section**
Three buttons grouped together:

#### a. **Shot Card Button**
Dropdown with:
- **Background** - Toggle + color swatch (when enabled)
- **Border** - Toggle + color swatch + width slider (when enabled)
- **Corner Radius** - Always visible slider (0-20px)

#### b. **Label Style Button**
Dropdown with:
- **Number Text** - Color swatch
- **Background** - Color swatch
- **Border** - Toggle + color swatch + width slider (when enabled)
- **Corner Radius** - Always visible slider (0-20px)

#### c. **Shot Text Button**
Dropdown with:
- **Action Text** - Color swatch
- **Script Text** - Color swatch

---

## Interaction Patterns

### Dropdown Behavior
- **Click to open**, auto-closes when clicking elsewhere
- **Only one dropdown open at a time** (enforced via state)
- Managed by `openDropdown` state variable

### Color Picker
- **Color swatches** trigger center-screen modal with `react-colorful` picker
- Modal includes:
  - Interactive color picker
  - Live preview swatch
  - Hex input field
  - "Done" button to close

### Toggles
- **On same line as label** (compact design)
- **Conditional fields appear below** when toggle is enabled
- Uses shadcn `Switch` component

### Sliders
- **Show current value** in label (e.g., "Width: 3px")
- **Range:** Border width 0-5px, Corner radius 0-20px
- Uses shadcn `Slider` component

---

## Styling & Design

### Visual Style
- **Glassmorphism containers** using `getToolbarContainerStyles()`
- **Matches existing toolbar patterns** (compact, consistent spacing)
- **No color swatches on buttons** - only in dropdowns

### Layout
- **Horizontal flexbox** with gap-3
- **Flex-wrap enabled** for responsive stacking
- **Each section** has its own glassmorphism container
- **Spacing separates sections** (no explicit dividers)

---

## State Management

### Theme Changes
All changes immediately update `storyboardTheme` in Zustand store via:
- `handleColorChange(path, value)` - For color values
- `handleBooleanChange(path, value)` - For toggles
- `handleNumberChange(path, value)` - For sliders

**Deep clone strategy:** Uses `JSON.parse(JSON.stringify(updated))` to ensure React/Zustand detects nested object changes.

### Save/Delete Operations
- **Save** - Creates new theme with UUID, saves to Supabase via `ThemeService`
- **Delete** - Removes from Supabase, reloads theme cache, switches to Light if deleting active theme

---

## Integration Points

### StoryboardPage.tsx
```tsx
import { ThemeToolbar } from './ThemeToolbar';

// Rendered between main toolbar and ErrorBoundary
<ThemeToolbar />
```

### Coexistence with StyleSettings
- **StyleSettings button kept** for backward compatibility
- Opens the full `ThemeEditorModal` for advanced editing
- Both systems work with the same `storyboardTheme` state

---

## User Experience Benefits

1. **Live Preview** - See changes immediately without modal overlay
2. **Compact Interface** - Minimal space, organized sections
3. **Quick Access** - All settings one click away
4. **Context Awareness** - Can see storyboard while adjusting
5. **Clear Organization** - Logical grouping by element type

---

## Technical Notes

### Dependencies
- `react-colorful` - Color picker
- shadcn/ui components: `Dialog`, `Select`, `DropdownMenu`, `Switch`, `Slider`, `Input`, `Button`
- `ThemeService` - Supabase CRUD operations
- `storyboardTheme` types from `@/styles/storyboardTheme`

### Performance
- **Minimal re-renders** - Only affected components update
- **Dropdown state isolation** - One open at a time
- **Efficient theme loading** - In-memory cache for user themes

---

## Future Enhancements (Optional)

- [ ] Keyboard shortcuts for common actions
- [ ] Theme import/export (JSON)
- [ ] Theme preview thumbnails
- [ ] Undo/redo for theme changes
- [ ] Recent colors palette
- [ ] Preset color palettes

---

*Last Updated: 2025-10-31*




