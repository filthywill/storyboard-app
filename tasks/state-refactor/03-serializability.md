# 03. Ensure State Serializability

**Goal:**
Make sure all persisted state can be safely serialized/deserialized (for localStorage and Supabase sync).

## Subtasks
- [ ] Identify non-serializable fields (e.g., File, Date, functions)
- [ ] Add serialization logic for complex types (e.g., File references, Dates)
- [ ] Test round-trip serialization/deserialization
- [ ] Document any fields that require special handling

## Notes
- Supabase sync requires state to be JSON-serializable.
- Consider using helper functions for (de)serialization. 