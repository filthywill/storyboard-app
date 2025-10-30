# Scaling and Alignment Patterns

*Last Updated: January 2025*

## 🎯 Overview

This document defines patterns for maintaining perfect alignment between UI elements during scaling operations, particularly for components that need to scale together as a single unit.

---

## 🏗️ Core Pattern: Single Container Scaling

### The Problem
When elements need to maintain perfect alignment during scaling, separate centering wrappers cause sub-pixel differences that create drift at different viewport sizes.

### The Solution
Use a single container that holds all aligned elements as siblings, then apply scaling to the parent container.

---

## ✅ Correct Pattern: Single Container

```typescript
// ✅ CORRECT: Single container for aligned elements
<div 
  className="w-full flex justify-center"
  style={{
    transform: `scale(${scale})`,
    transformOrigin: 'top center',
  }}
>
  <div style={{ width: '1000px' }}>
    {/* Element A - sibling */}
    <div className="relative z-10">
      <ComponentA />
    </div>
    
    {/* Element B - sibling */}
    <div className="relative z-20">
      <ComponentB />
    </div>
  </div>
</div>
```

**Why this works:**
- Single centering operation (`justify-center`)
- Both elements are siblings in the same container
- Identical positioning context
- No sub-pixel differences when scaled

---

## ❌ Anti-Pattern: Separate Centering Wrappers

```typescript
// ❌ WRONG: Separate centering wrappers
<div 
  className="w-full flex justify-center"
  style={{ transform: `scale(${scale})` }}
>
  <div style={{ width: '1000px' }}>
    <ComponentA />
  </div>
</div>

<div 
  className="w-full flex justify-center"
  style={{ transform: `scale(${scale})` }}
>
  <div style={{ width: '1000px' }}>
    <ComponentB />
  </div>
</div>
```

**Why this fails:**
- Two separate centering operations
- Sub-pixel differences accumulate
- Elements drift apart when scaled
- Inconsistent positioning at different viewport sizes

---

## 🎨 Visual Alignment Patterns

### Asymmetric Padding
For creating visual hierarchy with padding:

```typescript
// More bottom space than top
className="pt-0.5 pb-2"  // 2px top, 8px bottom

// Maximum bottom space
className="pt-0 pb-4"    // 0px top, 16px bottom

// Subtle difference
className="pt-1 pb-1.5"  // 4px top, 6px bottom
```

### Opacity Hierarchy
For inactive elements:

```typescript
// Active element: full opacity
className="bg-white"

// Inactive elements: reduced opacity
className="bg-muted opacity-50"
```

---

## 🔧 Component-Specific Patterns

### Lucide Icons
Proper ways to make Lucide React icons bolder:

```typescript
// ✅ CORRECT: Use strokeWidth prop
<Plus size={14} strokeWidth={3} />

// ❌ WRONG: CSS classes don't work
<Plus size={14} className="stroke-4" />
```

**Stroke Width Options:**
- `strokeWidth={1}` - Thin (default)
- `strokeWidth={2}` - Medium
- `strokeWidth={3}` - Bold
- `strokeWidth={4}` - Very bold
- `strokeWidth={5}` - Extra bold

### Glassmorphism Styling
For consistent glassmorphism effects:

```typescript
// Purple glassmorphism
className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-200 hover:text-purple-100 transition-all duration-200"

// Pink variation
className="bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/30 text-pink-200 hover:text-pink-100 transition-all duration-200"
```

---

## 🧪 Testing Alignment

### Manual Testing Checklist
Before implementing scaling alignment:

- [ ] **Test at different viewport sizes**
  - Desktop (1920px+)
  - Laptop (1366px)
  - Tablet (768px)
  - Mobile (375px)

- [ ] **Test scaling at different levels**
  - 100% (no scaling)
  - 75% (smaller viewport)
  - 50% (very small viewport)

- [ ] **Verify perfect alignment**
  - Left edges should be identical
  - No drift between elements
  - Consistent spacing at all scales

### Success Criteria
- ✅ Elements maintain perfect alignment at all viewport sizes
- ✅ No sub-pixel differences between aligned elements
- ✅ Smooth scaling without drift
- ✅ Consistent visual hierarchy

---

## 🚨 Common Mistakes

### Mistake 1: Using max-width instead of fixed width
```typescript
// ❌ WRONG: Can cause scaling mismatches
<div className="max-w-[1000px]">

// ✅ CORRECT: Fixed width for consistent scaling
<div style={{ width: '1000px' }}>
```

### Mistake 2: Applying transforms to individual elements
```typescript
// ❌ WRONG: Can cause drift
<ElementA style={{ transform: `scale(${scale})` }} />
<ElementB style={{ transform: `scale(${scale})` }} />

// ✅ CORRECT: Transform the parent container
<div style={{ transform: `scale(${scale})` }}>
  <ElementA />
  <ElementB />
</div>
```

### Mistake 3: Using CSS classes for Lucide icon styling
```typescript
// ❌ WRONG: CSS classes don't affect Lucide icons
<Plus className="stroke-4" />

// ✅ CORRECT: Use strokeWidth prop
<Plus strokeWidth={3} />
```

---

## 📚 Related Documentation

- **`CLAUDE.md`** - Component architecture and patterns
- **`UI_STATE_HANDLING.md`** - State management patterns
- **`.cursorrules`** - Critical development rules

---

*This document should be reviewed and updated as new scaling and alignment patterns are discovered.*

