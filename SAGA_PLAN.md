# SAGA Implementation Plan

1. Add `compensate?: Class` to `AgentMeta` in `meta-types.ts`.
2. Implement routing for `catchError` in `build.ts` (adding conditional edges).
3. Implement `triggerSaga` node runner that walks back the `state.path`.
