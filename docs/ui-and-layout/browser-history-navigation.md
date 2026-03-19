# Browser History Navigation

**Epic:** UI & Layout
**Type:** Feature
**Status:** Todo

## Summary

Enable browser back/forward button navigation for stateful interactions — selecting paints, changing color scheme filters, toggling brand filters, and (in the future) selecting palettes. Currently, all app state is ephemeral in-memory React state. When a user selects a complementary match from the detail panel, there is no way to return to the previously selected paint without manually finding it again.

## User Story

As a miniature painter browsing the color wheel, I want to use the browser back button to undo my last selection change so I can explore color relationships without losing my place.

**Example flow:**
1. Select "Mephiston Red" on the wheel
2. Enable Complementary color scheme
3. Click "Sybarite Green" in the scheme matches
4. Press browser Back → returns to "Mephiston Red" with Complementary still active
5. Press browser Back → returns to "Mephiston Red" with no scheme
6. Press browser Back → no paint selected

## Acceptance Criteria

- [ ] Selecting a paint pushes a history entry
- [ ] Changing color scheme pushes a history entry
- [ ] Changing brand filter pushes a history entry
- [ ] Browser back button restores the previous state
- [ ] Browser forward button re-applies the navigated state
- [ ] URL reflects current state (shareable links)
- [ ] Direct URL access restores the encoded state
- [ ] Page load with no URL params shows default (empty) state
- [ ] History works on mobile (swipe back gesture)

## State to Track in History

| State | URL Representation | Example |
|-------|-------------------|---------|
| `selectedPaint` | `?paint={id}` | `?paint=citadel-mephiston-red` |
| `colorScheme` | `&scheme={value}` | `&scheme=complementary` |
| `brandFilter` | `&brands={csv}` | `&brands=citadel,vallejo` |
| `searchQuery` | `&search={term}` | `&search=red` |

Future additions (no implementation needed now):
- Palette selection: `&palette={id}`
- View mode (grid/list): `&view=grid`

## Implementation Options

### Option A: URL Search Params with `next/navigation` + `window.history`

Use Next.js `useSearchParams()` to read URL state and `window.history.pushState()` / `replaceState()` to write it without triggering full navigation.

**How it works:**
1. Create a `useHistoryState()` custom hook that:
   - Reads initial state from `window.location.search` on mount
   - Exposes setter functions that call `window.history.pushState()` with serialized state
   - Listens to `popstate` events to restore state on back/forward
2. Replace direct `useState` calls in `page.tsx` for tracked state with the hook
3. Serialize state to URL search params (e.g., `?paint=citadel-mephiston-red&scheme=complementary`)

**Affected files:**
- New: `src/hooks/useHistoryState.ts`
- Modified: `src/app/page.tsx` (replace useState for tracked state, wire up hook)

**Pros:**
- Full control over when history entries are pushed vs replaced
- No Next.js router overhead — `pushState` is synchronous and doesn't trigger re-renders from the router
- URLs are shareable and bookmarkable
- Works with SSR/SSG since URL is just search params on a single page
- Simple mental model: push on meaningful user actions, ignore transient state (hover, zoom, pan)
- No additional dependencies

**Cons:**
- Manual serialization/deserialization of state to/from URL params
- Must handle edge cases: invalid params, paint IDs that don't exist, stale links
- `popstate` listener requires careful cleanup
- Must batch related state changes (e.g., selecting a scheme match = paint + scheme) into a single push

---

### Option B: Next.js `useRouter().push()` with Search Params

Use the App Router's `useRouter()` to navigate with query strings, and `useSearchParams()` to read them.

**How it works:**
1. On state change, call `router.push('/?paint=id&scheme=complementary')`
2. Read state from `useSearchParams()` in `page.tsx`
3. Derive component state from URL params instead of local `useState`

**Affected files:**
- Modified: `src/app/page.tsx` (read from searchParams, push via router)

**Pros:**
- Uses idiomatic Next.js APIs
- Automatic history management — `router.push()` creates history entries, `router.replace()` doesn't
- `useSearchParams()` triggers re-renders automatically when URL changes
- URLs are shareable and bookmarkable

**Cons:**
- `router.push()` triggers a soft navigation in App Router — this causes the page component to re-render from the server boundary, which can cause layout shifts or flicker on a fully client-side page
- Wraps the page in a `<Suspense>` boundary requirement (Next.js mandates this for `useSearchParams()`)
- Less control over batching — each `router.push()` is a separate navigation event
- Potential performance concerns: soft navigation re-renders the RSC tree even for a client component page
- May conflict with the current architecture where `page.tsx` is `"use client"` — mixing router navigation with client state can cause state desync

---

### Option C: `popstate` + In-Memory History Stack (No URL)

Maintain an internal history stack in a ref/state and call `window.history.pushState()` with opaque state objects (no URL change).

**How it works:**
1. On meaningful state changes, call `window.history.pushState(stateSnapshot, '')`
2. On `popstate`, read `event.state` and restore the snapshot
3. URLs stay as `/` — no query strings

**Affected files:**
- New: `src/hooks/useHistoryState.ts`
- Modified: `src/app/page.tsx`

**Pros:**
- Simplest implementation — no URL serialization needed
- Clean URLs (always `/`)
- Full control over what constitutes a history entry

**Cons:**
- No shareable URLs — users can't bookmark or share a specific state
- No deep linking — refreshing the page loses all state
- Opaque to the user — URL gives no indication of current state
- Loses a major benefit (shareability) that comes nearly free with URL params
- `history.state` has a size limit (~640KB in most browsers) which could matter if state grows

---

### Option D: URL Hash State (`#paint=id&scheme=complementary`)

Encode state in the URL hash fragment instead of search params.

**How it works:**
1. On state change, set `window.location.hash = serializeState()`
2. Listen to `hashchange` event to restore state
3. URLs look like `/#paint=citadel-mephiston-red&scheme=complementary`

**Affected files:**
- New: `src/hooks/useHashState.ts`
- Modified: `src/app/page.tsx`

**Pros:**
- Hash changes don't trigger server requests or Next.js navigation
- Shareable URLs
- Simple API — `hashchange` event is straightforward
- No `Suspense` boundary needed

**Cons:**
- Hash fragments are not sent to the server — no SSR benefit (though this is a fully client-side app, so irrelevant now)
- Less conventional for app state — hashes are traditionally for anchor links
- Slightly uglier URLs than search params
- If the app ever needs real hash-based anchor links (e.g., for documentation sections), this conflicts
- No native support in Next.js — must parse manually

---

## Recommendation: Option A — URL Search Params with `window.history`

**Option A is the best fit for this project.** Here's why:

1. **Shareable URLs are high value.** Miniature painters share color discoveries on Reddit, Discord, and hobby forums. A URL like `?paint=citadel-mephiston-red&scheme=complementary` is immediately useful for the community. This eliminates Options C.

2. **No Next.js router overhead.** Since `page.tsx` is entirely `"use client"`, using `router.push()` (Option B) introduces unnecessary soft navigation overhead and requires a `Suspense` boundary. `window.history.pushState()` is synchronous, lightweight, and doesn't interfere with React's rendering cycle.

3. **Search params over hash.** Search params (Option A) are more conventional for app state than hash fragments (Option D), work better with analytics tools, and keep the door open for future SSR if the app ever needs it.

4. **Batching control.** Option A gives explicit control over when to push vs. replace. When a user selects a scheme match (which changes both `selectedPaint` and `colorScheme`), we can batch that into a single history entry. Option B makes this harder since each `router.push()` is a separate event.

5. **No additional dependencies.** The implementation uses only browser APIs and React hooks.

## Implementation Plan

### Step 1: Create URL State Serialization Utilities

Create `src/utils/urlState.ts` with functions to serialize/deserialize app state to/from URL search params.

**Key functions:**
- `serializeState(state) → URLSearchParams` — converts tracked state to URL params
- `deserializeState(params) → PartialState` — parses URL params back to state objects
- `resolveState(partial, paints, groups) → ResolvedState` — validates deserialized state against actual data (e.g., paint ID exists)

**Serialization format:**
- `paint` → paint ID string (e.g., `citadel-mephiston-red`)
- `scheme` → color scheme string (`complementary`, `split`, `analogous`)
- `brands` → comma-separated brand IDs (`citadel,vallejo`)
- `search` → search query string
- Empty/default values are omitted from URL

### Step 2: Create `useHistoryState` Hook

Create `src/hooks/useHistoryState.ts` — the core hook that bridges URL state and React state.

**Responsibilities:**
- On mount: read URL search params → initialize state
- Expose `pushState(changes)` — serializes state to URL, calls `history.pushState()`
- Expose `replaceState(changes)` — same but uses `history.replaceState()` (for transient updates like search-as-you-type)
- Listen to `popstate` event → deserialize URL → update React state
- Debounce rapid successive changes (e.g., typing in search) into `replaceState` rather than flooding the history stack

**State tracked:**
```typescript
interface HistoryState {
  selectedPaintId: string | null
  colorScheme: ColorScheme
  brandFilter: Set<string>
  searchQuery: string
}
```

**Push vs Replace rules:**
| Action | Method | Rationale |
|--------|--------|-----------|
| Select paint (click wheel/match) | `pushState` | Meaningful navigation |
| Change color scheme | `pushState` | Meaningful filter change |
| Toggle brand filter | `pushState` | Meaningful filter change |
| Type in search | `replaceState` | Transient — don't create entry per keystroke |
| Submit/clear search | `pushState` | Final search action |
| Zoom/pan | Neither | View state, not app state |

### Step 3: Integrate into `page.tsx`

Refactor `src/app/page.tsx` to use the history hook:

1. Replace `useState` for `selectedPaint`, `selectedGroup`, `colorScheme`, `brandFilter`, and `searchQuery` with values from `useHistoryState`
2. Update all handler functions (`handleGroupClick`, `handleSelectPaintFromGroup`, `handleSelectSearchResult`, `handleBrandFilter`, `handleSchemeChange`) to call `pushState()` instead of direct `setState`
3. Resolve `selectedPaintId` from URL → `ProcessedPaint` object using the processed paints list
4. Resolve `selectedGroup` from the selected paint's group

**Key integration detail:** The hook returns IDs/primitives, but the component needs full objects (`ProcessedPaint`, `PaintGroup`). Add a `useMemo` that resolves the paint ID to the actual paint and group objects from the processed data.

### Step 4: Handle Edge Cases

- **Invalid paint ID in URL:** Show default empty state, optionally display a toast
- **Brand ID that doesn't exist:** Ignore it in the filter set
- **Multiple state changes in one action:** Batch into single `pushState` call (e.g., clicking a scheme match sets both paint and scheme)
- **Initial page load:** `deserializeState` from `window.location.search`, resolve against paint data
- **Browser refresh:** State fully restored from URL
- **Mobile back gesture:** Works automatically via `popstate`

### Affected Files

| File | Changes |
|------|---------|
| `src/utils/urlState.ts` | New — serialize/deserialize state to/from URL params |
| `src/hooks/useHistoryState.ts` | New — custom hook bridging URL and React state |
| `src/app/page.tsx` | Refactor tracked state to use history hook, update all handlers |

### Risks & Considerations

- **Paint ID stability:** Paint IDs are generated from `brand + name` in `processPaint()`. If paint data changes (renames, removals), old URLs break. This is acceptable — show empty state for unknown IDs.
- **State batching:** Clicking a scheme match changes both `selectedPaint` and potentially triggers scheme recalculation. Must ensure this produces a single history entry, not two.
- **Search debouncing:** Typing "mephiston" shouldn't create 9 history entries. Use `replaceState` during typing, `pushState` only on clear/blur/enter.
- **SSR hydration:** Since `page.tsx` is `"use client"`, `window` is available. But initial render may not match URL state. Use `useEffect` for URL reading to avoid hydration mismatch.
- **Future extensibility:** The serialization format should be easy to extend (just add new param keys). The hook interface should accept a config of tracked fields.
