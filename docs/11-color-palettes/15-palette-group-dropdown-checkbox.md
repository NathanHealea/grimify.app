# Palette Group Dropdown with Checkbox & Add Toast

**Epic:** Color Palettes
**Type:** Enhancement
**Status:** Done
**Branch:** `enhancement/palette-group-dropdown-checkbox`
**Merge into:** `main`

## Summary

Replace the inline chip/pill buttons in `PalettePaintGroupsToggle` with a compact dropdown that lists each group alongside a checkbox. When a paint is added to a group, fire a `toast.success` message. Removes the click adds also adds accessibility improvement — a dropdown with checked state is clearer than toggled pill buttons when a palette has many groups.

## Acceptance Criteria

- [x] The chip row is removed; a single dropdown trigger button takes its place
- [x] The dropdown lists all palette groups, each with a checkbox showing current membership
- [x] Clicking a checked item removes the paint from that group (optimistic, rolls back on error)
- [x] Clicking an unchecked item adds the paint to that group (optimistic, rolls back on error)
- [x] A `toast.success("Added to {group name}")` fires when an add succeeds (no error returned)
- [x] Error toasts continue to fire on failure (existing behaviour preserved)
- [x] Renders nothing when `groups` is empty (existing guard preserved)

## Implementation Plan

### Step 1 — Rewrite `PalettePaintGroupsToggle`

**File:** `src/modules/palettes/components/palette-paint-groups-toggle.tsx`

Replace the `<div className="flex flex-wrap gap-1">` chip render with a `DropdownMenu` from `@/components/ui/dropdown-menu`.

Structure:
```
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="btn btn-xs btn-outline">
      Groups <ChevronDown className="h-3 w-3" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start">
    {groups.map((g) => (
      <DropdownMenuCheckboxItem
        key={g.id}
        checked={optimisticIds.has(g.id)}
        onCheckedChange={() => handleToggle(g.id)}
      >
        {g.name}
      </DropdownMenuCheckboxItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

Add `toast.success(\`Added to ${g.name}\`)` inside `handleToggle` when `nowActive === true` and `result?.error` is absent:

```typescript
function handleToggle(groupId: string, groupName: string) {
  const nowActive = !optimisticIds.has(groupId)
  startTransition(async () => {
    setOptimisticIds({ groupId, active: nowActive })
    const result = nowActive
      ? await addPaintToGroup(paletteId, groupId, palettePaintId)
      : await removePaintFromGroup(paletteId, groupId, palettePaintId)
    if (result?.error) toast.error(result.error)
    else if (nowActive) toast.success(`Added to ${groupName}`)
  })
}
```

Update `onCheckedChange` (or the click handler) to pass `g.name` to `handleToggle`.

Add imports:
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuCheckboxItem` from `@/components/ui/dropdown-menu`
- `ChevronDown` from `lucide-react`

Update JSDoc to reflect the dropdown pattern.

### Step 2 — No other changes required

- `PalettePaintRow` props are unchanged — it still passes `groups` and `activeGroupIds`.
- `PaletteGroupedPaintList` is unchanged.
- Server actions (`addPaintToGroup`, `removePaintFromGroup`) are unchanged.
- No database changes needed.

### Affected Files

| File | Changes |
|------|---------|
| `src/modules/palettes/components/palette-paint-groups-toggle.tsx` | Replace chip UI with dropdown-checkbox; add success toast on add |

### Risks & Considerations

- `DropdownMenuCheckboxItem` is already exported from `src/components/ui/dropdown-menu.tsx` — no new UI primitives needed.
- The dropdown stays open between selections (Radix default), which is desirable for adding a paint to multiple groups in one open.
- Optimistic state updates inside a `useTransition` still work correctly with `DropdownMenuCheckboxItem` because `checked` is driven by `optimisticIds`, not local React state.
