# Shot Logic Task – Storyboard App (Claude Code)

You are helping develop a **React + TypeScript** storyboard layout editor that uses **Zustand** for state and **@dnd-kit** for drag-and-drop.

---

## 🎯 Objective

Ensure shot ordering, pagination, and sub-shot behavior work correctly and are fully implemented. Maintain consistency with the user-defined shot number format and dynamic reordering across pages.

---

## 🧱 Context

The project uses a modular Zustand store structure with:

- `pageStore` – manages pages and grid layout
- `shotStore` – manages shots, shotOrder, sub-shots
- `projectStore` – project metadata and settings (including shot number format)
- `useAppStore()` – a unified interface for cross-store access
- `redistributeShotsAcrossPages()` – ensures shots fill pages based on grid
- `renumberingOptimizer` – recalculates display shot numbers efficiently

---

## 🔄 Shot Behavior Rules

### A. Global Shot Order

- All shots are ordered in `shotOrder`
- Each shot’s display number is derived from:
  - Position in order
  - User-defined format (`1`, `01`, `100`, etc.)

### B. Pagination

- Page capacity = `gridRows × gridCols`
- When a page overflows:
  - New pages should be created
  - Overflowed shots fill in order
- Deletion or reordering should rebalance all pages

### C. Sub-shot Groups

- A shot can become a sub-shot group: `2` → `2a`, `2b`
- Sub-shots are sequential and maintain letter suffixes (`a`, `b`, `c`)
- **Inserting a shot *inside* a sub-shot group** appends to that group (`2a`, `2b`, `2c`)
- **Inserting a shot *before* a sub-shot group** creates a **standard shot**, shifting the group forward
  - e.g. New shot → 2, Group → 3a, 3b

### D. Drag-and-Drop

- Reordering must work across:
  - Pages
  - Sub-shot groups
- On drop:
  - Update `shotOrder`
  - Call `redistributeShotsAcrossPages()`
  - Renumber all shots
  - Apply current `shotNumberFormat`

---

## ✅ Task List

1. **Audit `addShot()` and `deleteShot()`**  
   - Ensure consistent shotOrder maintenance  
   - Trigger redistribution and renumbering  

2. **Implement `addSubShot(parentId)`**  
   - Split parent into sub-group  
   - Insert alphabetic sub-shots  
   - Maintain global order  

3. **Update DnD behavior**  
   - Handle reordering across standard and sub-shot groups  
   - Recalculate `shotOrder` correctly  

4. **Implement `formatShotNumber()`** utility  
   - Dynamically format display number using `projectStore.templateSettings.shotNumberFormat`  
   - Support values like `1`, `01`, `001`, `100`, etc.

---

## 🧠 Claude

You are Claude Code. Reference the current codebase and work from this task file. Ask clarifying questions if needed before starting each section.

