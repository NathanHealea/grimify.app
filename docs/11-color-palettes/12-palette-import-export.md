# Palette Import & Export

**Epic:** Color Palettes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/palette-import-export`
**Merge into:** `v1/main`

## Summary

Let users move palettes between Grimify accounts (and in/out of the app entirely) by exporting a palette as a JSON document and importing one back. The export action lives on the palette detail view; import lives on the user's palettes index. Admins can perform the same operations against any user's account from the admin user detail page.

Export captures everything needed to recreate the palette on another account: name, description, visibility, group structure, ordered paint slots (with cross-brand paint references identified by enough fields to be re-resolved on import), and per-slot notes. Import validates the document against a versioned schema, attempts to resolve each paint reference against the importing user's reachable paints, and either creates the palette as a new row or rejects with a structured error explaining what could not be matched.

## Acceptance Criteria

### User flows

- [ ] An "Export" action on the palette detail view (`/palettes/[id]`) that triggers a JSON download / clipboard copy for the palette owner
- [ ] An "Import palette" entry point on the user's palette index (`/user/palettes`) that accepts a JSON payload via **both** a file picker and a paste-JSON textarea (tab-style toggle inside the dialog)
- [ ] Importing a valid payload creates a new palette owned by the current user and redirects to its edit page
- [ ] Imported palettes always start as `is_public = false` regardless of the source value (privacy-safe default)
- [ ] When the imported document references paints that the importing user does not have access to, the import surfaces a clear, per-paint reason (paint not found, brand not found, ambiguous match)
- [ ] The export and import actions are owner-only on the user side; non-owners see no action and the server actions reject anyone else
- [ ] The `schemaVersion` field on the payload is checked; unsupported versions are rejected with a human-readable error

### Admin flows

- [ ] On `/admin/users/[id]`, admins can navigate to a "Palettes" subpage that lists the target user's palettes (mirrors the existing `/admin/users/[id]/collection` pattern)
- [ ] From the admin palettes subpage, admins can export any palette belonging to that user
- [ ] From the admin palettes subpage, admins can import a palette **on behalf of that user** — the resulting palette row is owned by the target user, not the admin
- [ ] Admin import/export actions reject self-modification (admins use the user-facing flow on their own palettes); the actions also reject when the caller does not have the `admin` role
- [ ] Admin import **and** export are logged to a new `admin_audit_log` table; both actions require an admin-supplied free-text reason captured in the dialog and persisted on the audit row

### Cross-cutting

- [ ] All `replace_palette_paints` writes during import go through the existing RPC so positions stay coherent
- [ ] The cross-reference resolver lives at `src/modules/paints/utils/resolve-paint-references.ts` and is the single shared implementation used by both palette and recipe imports
- [ ] Exports are **not** signed or checksummed — users are explicitly allowed to edit the JSON outside the app
- [ ] `npm run build` and `npm run lint` pass with no errors

## JSON schema

Export and import share one document shape, identified by a `schemaVersion` discriminator. v1 is the only currently defined version.

### Top-level

| Field           | Type                       | Required | Description                                                                  |
| --------------- | -------------------------- | -------- | ---------------------------------------------------------------------------- |
| `schemaVersion` | `"grimify.palette.v1"`     | yes      | Discriminator. Future revisions bump this; importers reject unknown values.  |
| `kind`          | `"palette"`                | yes      | Sentinel that distinguishes this from a recipe export at a glance.            |
| `exportedAt`    | `string` (ISO timestamp)   | yes      | When the export was generated (server time).                                 |
| `source`        | `object`                   | yes      | Origin metadata; see below.                                                  |
| `palette`       | `object`                   | yes      | The palette payload; see below.                                              |

### `source` object

| Field             | Type     | Required | Description                                                                |
| ----------------- | -------- | -------- | -------------------------------------------------------------------------- |
| `app`             | `string` | yes      | Always `"grimify"`. Reserved for future cross-app interop.                 |
| `appVersion`      | `string` | yes      | The Grimify build version at export time (from `package.json`).            |
| `originPaletteId` | `string` | yes      | UUID of the source palette. Importers do **not** use this as the new id.  |

### `palette` object

| Field         | Type                       | Required | Description                                                          |
| ------------- | -------------------------- | -------- | -------------------------------------------------------------------- |
| `name`        | `string` (1–80 chars)      | yes      | Imports run this through `validatePaletteName`.                      |
| `description` | `string \| null` (≤1000)   | no       | Markdown description; runs through `validatePaletteDescription`.     |
| `isPublic`    | `boolean`                  | no       | Captured for completeness; importers always set `false` (see above). |
| `createdAt`   | `string` (ISO)             | no       | Informational only; importers ignore.                                |
| `updatedAt`   | `string` (ISO)             | no       | Informational only; importers ignore.                                |
| `groups`      | `PaletteGroupExport[]`     | yes      | Ordered list of groups; empty array is valid.                        |
| `paints`      | `PalettePaintExport[]`     | yes      | Ordered master list of paint slots; empty array is valid.            |

### `PaletteGroupExport`

| Field      | Type                  | Required | Description                                                                |
| ---------- | --------------------- | -------- | -------------------------------------------------------------------------- |
| `localId`  | `string`              | yes      | An export-local id (UUID-or-string) used to wire up `paints[].groupIds`.   |
| `name`     | `string` (1–100)      | yes      | Runs through `validateGroupName` on import.                                |
| `position` | `int >= 0`            | yes      | Ordering. Importers normalize to 0..N-1.                                   |

### `PalettePaintExport`

| Field         | Type                | Required | Description                                                                                                          |
| ------------- | ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `position`    | `int >= 0`          | yes      | Master-list ordering.                                                                                                |
| `note`        | `string \| null`    | no       | Per-slot note; ≤500 chars.                                                                                           |
| `paint`       | `PaintReference`    | yes      | The paint identity payload — see below.                                                                              |
| `groupIds`    | `string[]`          | no       | Zero or more `PaletteGroupExport.localId` values; once `11-paint-group-references.md` lands a paint may be in many. |

### `PaintReference`

The payload embeds enough fields to re-resolve the paint on import without depending on the source database's UUIDs. Importers attempt resolution in this order: (1) by `id`, (2) by `(brandName, productLineName, name)`, (3) by `(brandName, name, hex)`. The first successful match wins; otherwise the row is reported as unresolvable.

| Field             | Type             | Required | Description                                                                            |
| ----------------- | ---------------- | -------- | -------------------------------------------------------------------------------------- |
| `id`              | `string`         | yes      | Source-database paint UUID. Used as a fast-path on same-instance imports.              |
| `name`            | `string`         | yes      | Display name (e.g. `"Khorne Red"`).                                                    |
| `hex`             | `string`         | yes      | 6-character hex without `#` or with — importers normalize.                              |
| `brandName`       | `string`         | yes      | (e.g. `"Citadel"`).                                                                    |
| `productLineName` | `string`         | yes      | (e.g. `"Base"`, `"Layer"`).                                                             |
| `paintType`       | `string \| null` | no       | Free-form, mirrors `paints.paint_type`.                                                |
| `isMetallic`      | `boolean`        | no       | Mirrors `paints.is_metallic`.                                                          |

### Sample payload

```json
{
  "schemaVersion": "grimify.palette.v1",
  "kind": "palette",
  "exportedAt": "2026-05-09T18:42:11.000Z",
  "source": {
    "app": "grimify",
    "appVersion": "1.45.0",
    "originPaletteId": "9c2f0c54-1e7a-4f8e-9b3d-2d8f4a1f9c01"
  },
  "palette": {
    "name": "Blood Ravens — Tactical Squad",
    "description": "Heresy-era Blood Ravens. Edge highlights only — no glaze.",
    "isPublic": true,
    "createdAt": "2026-04-21T10:01:00.000Z",
    "updatedAt": "2026-05-08T22:14:00.000Z",
    "groups": [
      { "localId": "g1", "name": "Armour", "position": 0 },
      { "localId": "g2", "name": "Trim and details", "position": 1 }
    ],
    "paints": [
      {
        "position": 0,
        "note": "Basecoat",
        "groupIds": ["g1"],
        "paint": {
          "id": "1f33...",
          "name": "Khorne Red",
          "hex": "9a1b1b",
          "brandName": "Citadel",
          "productLineName": "Base",
          "paintType": "Acrylic",
          "isMetallic": false
        }
      },
      {
        "position": 1,
        "note": "First highlight",
        "groupIds": ["g1"],
        "paint": {
          "id": "8a44...",
          "name": "Wazdakka Red",
          "hex": "b53030",
          "brandName": "Citadel",
          "productLineName": "Layer",
          "paintType": "Acrylic",
          "isMetallic": false
        }
      },
      {
        "position": 2,
        "note": null,
        "groupIds": ["g2"],
        "paint": {
          "id": "2c91...",
          "name": "Retributor Armour",
          "hex": "b5894a",
          "brandName": "Citadel",
          "productLineName": "Base",
          "paintType": "Acrylic",
          "isMetallic": true
        }
      }
    ]
  }
}
```

### Forward-compatibility strategy

- `schemaVersion` is a closed string literal, not an integer. Bumping creates a new variant (`grimify.palette.v2`) — importers ship a per-version parser.
- New optional fields can be added within an existing version without breaking older importers; they are read leniently and ignored when unrecognized.
- Removing or repurposing a field requires a new `schemaVersion`.
- Older clients hitting a newer `schemaVersion` reject with a structured error: `"This export is from a newer version of Grimify (vX). Update before importing."` Newer clients reading older versions translate the document via per-version migrators inside the import service.
- The exporter always emits the latest version supported by the running build.

### Validation rules

The import validator enforces, in order:

1. JSON parses cleanly.
2. `schemaVersion === "grimify.palette.v1"` and `kind === "palette"`.
3. `palette.name` passes `validatePaletteName`.
4. `palette.description` passes `validatePaletteDescription` (or is null/absent).
5. Every group's `name` passes `validateGroupName` and `position` is a non-negative integer; `localId` values are unique within `groups`.
6. Every paint slot's `position` is a non-negative integer; `note` is null or ≤500 chars; `paint` has the required fields; `groupIds` reference existing `groups[].localId` values.
7. No duplicate `paint.id` (or, when ids are missing, no duplicate `(brandName, productLineName, name)`) within the master list — matches the duplicate-prevention rule from `06-prevent-duplicate-paint-add.md`.

### Conflict and error handling on import

| Condition                                                          | Behavior                                                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Schema version unsupported                                         | Reject the entire import with `code: 'unsupported_version'` and the version string.            |
| JSON malformed or required field missing                           | Reject with `code: 'invalid_payload'` and a list of validator errors keyed by JSON path.        |
| Duplicate palette name on the importing user                       | Append `" (imported)"`, then `" (imported 2)"`, etc. — never silently overwrite.               |
| One or more paint references cannot be resolved                    | Default policy: **reject** with `code: 'unresolved_paints'` and the offending entries listed.   |
| Some paint references resolve and some do not                      | Same as above — atomic; user opts in to lossy import via a "Import what you can" toggle.        |
| Group name fails validation                                        | Reject with `code: 'invalid_group_name'` and the offending `localId`.                          |
| `paint.hex` and the resolved paint's `hex` differ                  | Allow; the resolved paint wins. Surface a non-blocking warning in the import summary.           |
| Caller is not authenticated (or admin caller without role)         | Reject with `code: 'unauthorized'`.                                                            |

The recommended approach for unresolved paints is **fail closed by default** with an explicit "Import what you can" opt-in. This avoids creating a palette that silently drops paints; if the user accepts a lossy import, the import service skips unresolvable rows and reports them in the success response so the UI can show "Imported N of M paints".

### Cross-reference handling

The choice for paints is **embedded payload + resolve by lookup on import**. Rationale:

- Source UUIDs (`paint.id`) are not stable across environments (or after a brand-line cleanup migration). Hard-failing the import on UUID mismatch would make every cross-environment import brittle.
- Embedding the brand/product-line/name fields lets the importer resolve against the importing user's database without depending on the source UUID surviving.
- The fallback chain (id → triple → hex+name) handles same-instance imports (id hits), cross-environment imports (triple hits), and minor renames (hex+name hits) without further config.

For groups, the export uses `localId` strings that are scoped to the document only — the importer creates fresh group rows under the new palette and rewires `paints[].groupIds` accordingly. Group ids are never expected to be reusable across palettes.

For brands and product lines, the importer **does not create them**. If the brand/product-line/paint trio can't be matched against an existing `paints` row, the slot is unresolved. The Grimify paint catalog is curated; importing should never silently introduce new catalog rows.

## Authorization

| Caller                | Allowed                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| Anonymous             | None.                                                                                            |
| Authenticated user    | Export their own palettes; import into their own account.                                         |
| Authenticated user    | Cannot export other users' palettes (even public ones — the export action lives behind ownership; public users can already copy a public palette via the upcoming "Fork palette" feature, out of scope here). |
| Admin role            | Export or import on any non-admin user's account; rejects self-modification (admins use the user-facing flow on their own palettes), matching `add-paint-to-collection.ts`. |

Server actions are the authoritative check. UI gating only hides controls; it does not protect data.

## Admin audit log

This feature ships the project's first admin-action audit surface. Every admin export **and** every admin import writes a row to a new `admin_audit_log` table.

### Why a free-text reason is required

Admin import/export is the only place in the app where one user reads or writes another user's content. Capturing intent at action time — in the admin's own words — gives the team a durable record of *why* the action happened, not just *that* it happened. Use cases:

- **Support escalation** — "User reported a corrupted palette; exporting to inspect."
- **Account migration** — "User requested transfer from old workspace; importing on their behalf."
- **Compliance / dispute resolution** — six months later, the row explains the action without needing to reconstruct context from chat logs.

The reason is **required** at the action level: the admin dialog will not submit without a non-empty value (≥ 8 characters after trim). The server action re-validates and rejects empty/whitespace reasons.

### Table schema

```sql
CREATE TABLE public.admin_audit_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action_kind         text NOT NULL,                    -- e.g. 'palette.export', 'palette.import'
  resource_id         uuid,                             -- e.g. the palette id (export) or new palette id (import)
  reason              text NOT NULL CHECK (length(btrim(reason)) >= 8),
  payload_size_bytes  int,                              -- export size or import payload size, for capacity tracking
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_log_target_user_idx ON public.admin_audit_log (target_user_id, created_at DESC);
CREATE INDEX admin_audit_log_actor_user_idx  ON public.admin_audit_log (actor_user_id, created_at DESC);
CREATE INDEX admin_audit_log_action_kind_idx ON public.admin_audit_log (action_kind, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all audit rows"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can write audit rows"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    'admin' = ANY(public.get_user_roles(auth.uid()))
    AND actor_user_id = auth.uid()
  );

-- No UPDATE/DELETE policies — audit rows are append-only.
```

### Captured `action_kind` values (this feature)

| Value              | Written by                              |
| ------------------ | --------------------------------------- |
| `palette.export`   | `adminExportPalette` server action      |
| `palette.import`   | `adminImportPalette` server action      |

Recipe equivalents (`recipe.export`, `recipe.import`, plus the bulk variants) are documented in the sibling recipe feature doc.

### Where it's written

A single helper, `adminAuditService.writeAuditEntry(...)`, lives at `src/modules/admin/services/admin-audit-service.ts`. Each admin server action calls it after the underlying mutation/read succeeds, inside the same request lifecycle. If the audit insert fails, the action returns an error and the caller sees a non-success result — admin actions never silently skip the audit row.

### Forward path with Epic 8

Epic 8 (User Management) may ship its own admin-action surface. When that lands, reconcile by either: (a) keeping `admin_audit_log` as the single audit table and feeding Epic 8's UI from it, or (b) extending the schema with whatever Epic 8 requires. Reason field, action_kind, and the (actor, target, resource_id) triple should generalize cleanly.

## Routes

| Route                                       | Description                                                          | Auth              |
| ------------------------------------------- | -------------------------------------------------------------------- | ----------------- |
| `/palettes/[id]` (modify)                   | Adds an "Export" action to the detail view (owner only).             | conditional       |
| `/user/palettes` (modify)                   | Adds an "Import palette" entry point.                                 | required          |
| `/user/palettes/import` (new, optional)     | Dedicated import page if we go beyond a dialog — see Open Questions. | required          |
| `/admin/users/[id]/palettes` (new)          | Admin list of a target user's palettes; per-row export and import controls. | admin role |

## Module additions

The work spans the existing `palettes` domain module, the existing `paints` module (which gains the shared cross-reference resolver), and the existing `admin` module. No new module is needed.

```
src/modules/palettes/
├── actions/
│   ├── export-palette.ts                    NEW — owner export
│   └── import-palette.ts                    NEW — owner import
├── components/
│   ├── palette-export-button.tsx            NEW — detail-view trigger
│   ├── palette-import-dialog.tsx            NEW — file picker + paste-JSON (tabbed)
│   └── palette-import-result.tsx            NEW — success/error/partial result rendering
├── services/
│   └── (modify) palette-service.ts          add `exportPaletteToPayload`, `importPaletteFromPayload`
├── types/
│   ├── palette-export-payload.ts            NEW — TypeScript shape mirroring the JSON schema
│   ├── palette-import-result.ts             NEW — discriminated success/partial/failure result
│   └── palette-export-paint-reference.ts    NEW — single PaintReference shape
├── utils/
│   └── normalize-import-name.ts             NEW — appends " (imported)" / " (imported N)"
└── validation.ts                            modify — add `validateImportPayload`,
                                                       `PALETTE_SCHEMA_VERSION` constant
```

```
src/modules/paints/
└── utils/
    └── resolve-paint-references.ts          NEW — shared id → triple → hex+name lookup chain;
                                                    consumed by both palette and recipe importers
```

```
src/modules/admin/
├── actions/
│   ├── admin-export-palette.ts              NEW — admin export of any user's palette
│   └── admin-import-palette.ts              NEW — admin import on behalf of a target user
├── components/
│   ├── admin-palette-list-table.tsx         NEW — table of a user's palettes with row actions
│   ├── admin-palette-export-button.tsx      NEW — same affordance as user, scoped to admin
│   └── admin-palette-import-dialog.tsx      NEW — admin variant; targets a specific userId, requires reason
└── services/
    ├── palette-service.ts                   NEW — admin-scoped reads (getUserPalettes, getPaletteForAdmin)
    └── admin-audit-service.ts               NEW — `writeAuditEntry({ actorUserId, targetUserId, actionKind,
                                                                       resourceId, reason, payloadSizeBytes })`
```

DB migrations introduced by this feature (see Implementation Plan):

- `supabase/migrations/{ts}_admin_palette_policies.sql` — admin RLS policies for `palettes`, `palette_paints`, `palette_groups`, `palette_group_paints`.
- `supabase/migrations/{ts}_admin_audit_log.sql` — the `admin_audit_log` table and its policies (see "Admin audit log" section above).

The user-facing service-layer functions (`exportPaletteToPayload`, `importPaletteFromPayload`) live in the palettes module; the admin module's actions wrap those by passing `targetUserId` instead of `auth.uid()` and writing an audit row. The serialization/deserialization logic exists in exactly one place.

## Implementation Plan

### Step 1 — Types

Add three files under `src/modules/palettes/types/`:

- `palette-export-payload.ts` — `PaletteExportPayload`, `PaletteExportPaint`, `PaletteExportGroup` mirroring the JSON schema. Include a `PALETTE_SCHEMA_VERSION = 'grimify.palette.v1'` constant in `validation.ts` (constants live with their validators per the existing `validation.ts` pattern).
- `palette-export-paint-reference.ts` — `PaletteExportPaintReference` (the embedded paint identity).
- `palette-import-result.ts` — discriminated union: `{ kind: 'success'; palette: Palette; warnings: ImportWarning[] } | { kind: 'partial'; palette: Palette; unresolved: UnresolvedPaint[]; warnings: ImportWarning[] } | { kind: 'error'; code: ImportErrorCode; details: ImportErrorDetail[] }`.

### Step 2 — Validation

Extend `src/modules/palettes/validation.ts`:

- `PALETTE_SCHEMA_VERSION` constant.
- `validateImportPayload(input: unknown): { payload?: PaletteExportPayload; errors?: ValidationError[] }` — JSON-shape validator (no Zod; the project's existing pattern is hand-rolled `validateX` functions returning `string | null` or an errors map). Reuses `validatePaletteName`, `validatePaletteDescription`, `validateGroupName`.

### Step 3 — Service layer (palettes module)

Extend `src/modules/palettes/services/palette-service.ts` with three methods:

- `exportPaletteToPayload(paletteId)` — calls `getPaletteById`, joins enough paint metadata to build each `PaintReference`, returns a `PaletteExportPayload`. Throws on permission denial (the existing RLS policies do the gating).
- `importPaletteFromPayload({ userId, payload, allowPartial })` — orchestrates: validate payload → resolve every paint reference → if all resolved (or `allowPartial`): create palette via `createPalette`, create groups via `createPaletteGroup` (capturing the localId → real id mapping), then build the `setPalettePaints` rows from the resolved paint list and call it. Returns a `PaletteImportResult`.
- `getUserPalettes(userId)` — admin-facing helper that lists any user's palettes regardless of `auth.uid()`. Lives here so it shares the existing query shape; admin RLS policies (added in Step 5) make it callable with the standard server client when the caller has the `admin` role.

Add `src/modules/paints/utils/resolve-paint-references.ts` — the **shared** resolver consumed by both the palette and the recipe importer. The `paint-service.ts` module already exposes a paint search; this helper composes those queries into the id → triple → hex+name fallback chain and runs them in batch, returning `Map<refKey, ResolvedPaint | { reason: 'not_found' | 'ambiguous'; tried: string[] }>`. Per-recipe / per-palette resolution stays at two queries (id batch + triple batch) regardless of size.

### Step 4 — Server actions (palettes module)

Two new files under `src/modules/palettes/actions/`. Both follow the existing pattern: `'use server'`, auth check, ownership check, service call, revalidate, return result.

- `export-palette.ts`:

  ```ts
  export async function exportPalette(
    paletteId: string,
  ): Promise<{ payload?: PaletteExportPayload; error?: string }>
  ```

  Loads the palette, confirms ownership (or that the palette is public — see Open Questions), returns the payload. Does **not** trigger a download itself; the client component that calls it handles `Blob` + `<a download>`. **Rationale for this download mechanism:** the payload is small (well under 50 KB for v1), there is no public URL surface that an attacker could probe, and the auth check stays inside the server action — no separate route handler to keep in sync.

- `import-palette.ts`:

  ```ts
  export async function importPalette(
    rawPayload: string,
    options: { allowPartial?: boolean },
  ): Promise<PaletteImportResult>
  ```

  Validates, imports, revalidates `/user/palettes`, redirects to `/user/palettes/${newId}/edit` on full success.

### Step 5 — Admin RLS policies and actions

Add a migration `supabase/migrations/{ts}_admin_palette_policies.sql` (mirrors `20260424000000_admin_user_paints_policies.sql`):

```sql
CREATE POLICY "Admins can read all palettes"
  ON public.palettes FOR SELECT TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can insert into any palette"
  ON public.palettes FOR INSERT TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- and the matching SELECT/INSERT/UPDATE/DELETE policies for
-- palette_paints, palette_groups, palette_group_paints derived
-- through their parent palette in the same way the user policies do.
```

Add admin actions:

- `src/modules/admin/actions/admin-export-palette.ts` — `adminExportPalette(targetUserId, paletteId, { reason })`. Confirms caller is `admin`, rejects self (per existing `add-paint-to-collection.ts` pattern), confirms the palette belongs to `targetUserId`, validates the reason (≥ 8 non-whitespace chars), calls `paletteService.exportPaletteToPayload`, then writes an audit row via `adminAuditService.writeAuditEntry({ actorUserId, targetUserId, actionKind: 'palette.export', resourceId: paletteId, reason, payloadSizeBytes })`. Audit insert failure causes the action to return an error.
- `src/modules/admin/actions/admin-import-palette.ts` — `adminImportPalette(targetUserId, rawPayload, { reason, allowPartial })`. Same auth + reason validation, then calls `paletteService.importPaletteFromPayload({ userId: targetUserId, ... })`, then writes an audit row with `actionKind: 'palette.import'` and `resourceId` = the newly-created palette id. Revalidates `/admin/users/${targetUserId}/palettes`.

Add `src/modules/admin/services/palette-service.ts` for any admin-only reads (e.g. `listPalettesForUser(targetUserId)` — returns the same shape as the user-side list).

Add `src/modules/admin/services/admin-audit-service.ts` exporting `writeAuditEntry(input)`. Internally it inserts into `admin_audit_log` with `actor_user_id = auth.uid()` (the admin RLS policy from the audit-log migration enforces this match). The service is the **only** code path that writes to `admin_audit_log`; both palette and recipe admin actions use it.

Add a second migration `supabase/migrations/{ts}_admin_audit_log.sql` containing the table + indices + RLS policies from the "Admin audit log" section. Sequencing: ship the audit-log migration **before** the admin-palette-policies migration in the same PR so the admin actions can write audit rows from their first invocation.

### Step 6 — Components

User-side:

- `palette-export-button.tsx` — small button that calls `exportPalette`, builds a `Blob`, triggers a download (`palette-${slug(name)}.json`). Also exposes "Copy JSON to clipboard" via `navigator.clipboard.writeText` as a secondary action — palette JSON is small enough to paste into chat tools, and clipboard is the natural companion to file download.
- `palette-import-dialog.tsx` — modal with a tab-style toggle between **File** (file picker accepting `.json`) and **Paste** (textarea). Both paths submit through the same `importPalette` action. Renders inline validation errors and conflict reports via `palette-import-result.tsx`. On full success, the dialog closes and redirects.
- `palette-import-result.tsx` — pure presentational component; renders the discriminated `PaletteImportResult`.

Admin-side:

- `admin-palette-list-table.tsx` — table of the target user's palettes with per-row Export and per-row "View" links into the user-facing detail (admins read the existing detail page).
- `admin-palette-export-button.tsx` — wraps `adminExportPalette` with the same blob-download flow. Opens a small "Reason" prompt before invoking the action (the action rejects empty reasons, but UX-wise the prompt makes the requirement explicit before the download starts).
- `admin-palette-import-dialog.tsx` — same File/Paste UI as the user dialog plus a **required** "Reason for this admin action" textarea (≥ 8 chars, surfaced inline if missing). Bound to `adminImportPalette` with `targetUserId` and the captured reason.

### Step 7 — Routes

- Modify `src/app/palettes/[id]/page.tsx` to render `<PaletteExportButton paletteId={...} />` next to the existing "Edit" affordance when `isOwner`.
- Modify `src/app/user/palettes/page.tsx` to render an "Import palette" button that opens the import dialog. Match the styling of the existing "New palette" button.
- New page `src/app/admin/users/[id]/palettes/page.tsx` (server component): loads the target user's palettes via the admin service, renders `<AdminPaletteListTable>` plus an `<AdminPaletteImportDialog>`. Mirrors `/admin/users/[id]/collection/page.tsx` exactly.
- Modify `src/app/admin/users/[id]/page.tsx` to add a "View palettes" link, mirroring the existing "View collection" link.

### Step 8 — Build and verify

`npm run build` and `npm run lint` pass. Manual QA:

- Export a palette as the owner; reopen the JSON file and confirm shape.
- Import the exported file as a different user — palette appears, groups and orderings preserved, paint references resolved.
- Try importing a payload with an unknown brand → reject with the unresolved-paints error and the offending names listed.
- Toggle "Import what you can" → import succeeds with `kind: 'partial'` and the unresolvable rows listed.
- As admin, export and import for a target user; confirm the resulting palette is owned by `targetUserId`, not by the admin caller.
- As a non-admin, hit the admin actions directly — server rejects.

## Risks & Considerations

- **Curated paint catalog**: Imports never create new `paints`/`brands`/`product_lines` rows. If the source environment has paints the destination does not, the import either rejects or silently omits — both are surfaced explicitly to the user.
- **Schema version drift**: Adding fields within v1 is safe; renaming or removing is not. When v2 ships, keep a per-version parser path so v1 documents continue to import.
- **Group cross-references**: Once `11-paint-group-references.md` lands, a paint can belong to multiple groups; the schema's `groupIds: string[]` already accommodates this. Until that feature ships, the importer treats `groupIds` as a length-0-or-1 array and surfaces a warning if length > 1 in a v1 payload coming from a future schema.
- **Privacy on import**: `isPublic` from the source is **always** overridden to `false`. Re-publishing imported palettes is a deliberate user action.
- **Admin self-modification**: Admins must not import/export through the admin flow on their own palettes — the user flow exists for that. Server actions reject self-modification, mirroring `add-paint-to-collection.ts`.
- **Audit trail for admin actions**: This feature ships the project's first `admin_audit_log` table (see "Admin audit log" section). The table is intentionally narrow — actor, target, action_kind, resource_id, free-text reason, payload size, timestamp — so it can absorb future admin actions without schema churn. When Epic 8 (User Management) lands its admin surface, reconcile by either keeping `admin_audit_log` as the single audit surface or extending it; the (actor, target, action_kind, resource_id, reason) shape should generalize cleanly.
- **No tamper-resistance**: Exports are not signed or checksummed by design — users may legitimately edit the JSON outside the app (correcting a typo, removing a paint, sharing a redacted version). Importing a hand-edited document is a supported flow, not an attack to defend against.
- **File size**: Palettes top out around 30 paints with simple group structure; exported JSON is comfortably under 50 KB. No streaming or chunking needed.
- **PII in exports**: Exports include `originPaletteId` (a UUID) and the source app version. They do **not** include user ids, emails, or any owner metadata. Safe to share.
- **Round-trip identity**: Exporting a palette and re-importing it as the same user does not deduplicate — it creates a new palette with `" (imported)"` appended. This is the correct default; "merge into existing palette" is a separate, future feature.

## Resolved Decisions

These were Open Questions during initial drafting; product has now resolved them.

- **Download mechanism** — Server action returns the JSON document as a string; the client component triggers `Blob` + `<a download>` (and a secondary "Copy JSON" via `navigator.clipboard.writeText`). Chosen for security and performance: payloads are small (well under 50 KB), there's no public download URL surface, and the auth check stays inside the server action — no separate route handler to keep in sync. Re-evaluate if payloads grow past ~5 MB in a future schema version.
- **Import source** — Both a file picker and a paste-JSON textarea, exposed via a tab-style toggle inside the same dialog.
- **Signing / checksumming** — No. Users are explicitly allowed to edit the exported JSON outside the app — fixing typos, redacting fields before sharing, hand-merging two palettes. Tamper-resistance would conflict with that affordance.
- **Audit log for admin actions** — Yes. Both `adminExportPalette` and `adminImportPalette` write a row to a new `admin_audit_log` table; the admin dialog requires a free-text reason (≥ 8 chars) that is persisted on the row. See the "Admin audit log" section for the table schema, why a free-text reason is required, and the forward path with Epic 8.
- **Cross-reference resolver location** — Shared. The id → triple → hex+name resolver lives at `src/modules/paints/utils/resolve-paint-references.ts` and is consumed by both the palette importer (this feature) and the recipe importer.

## Open Questions

These remain open for v1 and should be resolved before `/implement` starts.

- **Dedicated import page vs. dialog** — Is `/user/palettes/import` worth its own page, or should it always be a modal launched from `/user/palettes`? Recommendation: dialog. Consistent with the existing palette index UX and avoids a near-empty route.
- **Public palette export** — Can any signed-in user export a *public* palette they don't own (so they can re-import as their own)? Or is export strictly owner-only? Recommendation: owner-only for v1; "Fork public palette" is the right shape for non-owner duplication and is a separate feature.
- **Partial-import default** — Should "Import what you can" be the default behavior or an opt-in? Recommendation: opt-in. Silently dropping referenced paints is too easy to miss otherwise.
- **Rate limiting on imports** — Imports do up to N paint lookups per call; do we need a per-user rate limit? Recommendation: defer until abuse is observed; current paint counts are small.

## Notes

- This feature ships behind the existing `is_public` privacy model — no new tables on the user-facing side. The only DB change is the additive admin RLS policies in Step 5, which mirror the pattern from `20260424000000_admin_user_paints_policies.sql`.
- The import service composes the existing palette write surface (`createPalette`, `createPaletteGroup`, `setPalettePaints`) so any future change to those write paths automatically applies to imported palettes.
- A "Fork public palette" feature is a natural follow-up: it could reuse `exportPaletteToPayload` server-side and call `importPaletteFromPayload` for the calling user without ever exposing JSON to the client.
