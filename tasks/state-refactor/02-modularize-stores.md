# 02. Modularize State Stores

**Goal:**
Split state into logical modules (pages, shots, project, UI, etc.) for maintainability and future sync.

## Subtasks
- [ ] Define clear boundaries for each store
- [ ] Move related logic into domain-specific stores
- [ ] Ensure stores only expose necessary actions/selectors
- [ ] Refactor imports/usage in components
- [ ] Remove dead/legacy state logic

## Notes
- Modular stores make Supabase sync and testing easier.
- Keep stores small and focused. 