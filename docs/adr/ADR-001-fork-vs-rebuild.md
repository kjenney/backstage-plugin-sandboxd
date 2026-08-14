# ADR-001: Fork vs Rebuild — Sandboxd Console UI Integration Strategy

**Status:** Accepted  
**Date:** 2025-08-13  
**Deciders:** Development team  
**Consulted:** Backstage plugin ecosystem  
**Informed:** sandboxd maintainers  

## Context

sandboxd ships with a React-based console UI featuring:
- AppView with sandbox lifecycle management
- CodeMirror editor for code editing
- xterm.js terminal integration
- Settings panel for configuration
- App store with 80+ presets
- Deployment modals and sandbox isolation controls

We need to integrate this functionality into Backstage as a native plugin. Two approaches were considered:

### Option A: Fork the sandboxd console UI

Embed the existing React app into a Backstage plugin wrapper. Adapt routing, theming, and entity context.

### Option B: Rebuild as Backstage-native components

Build new React components from scratch following Backstage's entity-plugin pattern, theme system, and routing conventions.

## Decision

**Build new components (Option B).**

## Rationale

1. **Architectural mismatch**: The sandboxd console was designed as a standalone SPA, not as a Backstage entity plugin. Forcing it into Backstage's entity page pattern would require refactoring its routing, state management, and component hierarchy — essentially a rebuild anyway.

2. **Theming integration**: Backstage uses a design system (Material UI + Backstage theme tokens). The sandboxd console uses its own styling approach. Forking would require dual theming or a complete style rewrite to match Backstage's look and feel.

3. **Entity context**: Backstage plugins access entity metadata through `useEntity()`. The sandboxd console has no concept of Backstage entities. A forked approach would need a compatibility layer to map sandboxd entities to Backstage entities.

4. **Plugin lifecycle**: Backstage plugins follow a specific lifecycle (registration, router setup, route discovery). The sandboxd console's initialization pattern doesn't align with this lifecycle.

5. **Bundle size**: For the forked approach, we'd carry dead code from the sandboxd console (standalone routing, auth screens, splash pages) that Backstage already provides.

6. **Maintenance burden**: A fork creates a split-brain problem — upstream sandboxd console changes would need to be selectively cherry-picked, while Backstage-native components evolve independently.

7. **Developer experience**: Backstage-native components benefit from the Backstage plugin ecosystem — shared hooks, API factories, route refs, and the Backstage CLI tooling.

## Consequences

**Positive:**
- Clean integration with Backstage's entity page pattern
- Consistent theming and UX across the Backstage instance
- Full access to Backstage plugin ecosystem (hooks, APIs, tooling)
- No fork drift or cherry-pick maintenance burden
- Smaller bundle size (no dead code from standalone SPA)

**Negative:**
- Higher initial development effort (estimated 2-3 weeks vs 1 week for fork)
- Need to reimplement existing sandboxd console features (terminal, editor, presets)
- Risk of missing subtle UX patterns from the original sandboxd console

## Mitigations

- Phase the rollout: Start with core sandboxd CRUD operations (sandboxes, tasks, apps), then add advanced features (terminal, editor, presets)
- Reference the sandboxd console UI for UX guidance — it's the product spec
- Reuse sandboxd's API contracts — the frontend components call the same `/v1/` endpoints through the backend proxy
