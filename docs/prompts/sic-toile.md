# SIC Enlightenment Toile — Image Prompt Reference

> Theme ID: `sic_toile`
> Source: `api/variants/generate-one.ts` → `buildCoverPrompt()` case `'sic_toile'`

---

## Visual Identity

Warm cream (#F5F0E8) background. Single-color copper-plate engraving rendered entirely in indigo (#2A2ECD). Fine hatching, cross-hatching, and stippling — no color fills, no gradients. 18th-century French engraving aesthetic (Encyclopedie Diderot plates). Full narrative scenes with architectural settings and multiple figures. Playfair Display UPPERCASE headlines.

---

## Prompt Template

```
Single-color copper-plate engraving illustration of a
${angle.scene_domain ?? 'commerce exchange'} scene related to ${topicNoun}
— rendered entirely in indigo (#2A2ECD) on white/transparent ground, fine
parallel hatching for mid-tone areas, cross-hatching for deep shadows,
stippling for soft textures, clean confident contour lines, 18th-century
French engraving aesthetic — Encyclopedie Diderot plates register, full
narrative scene with ground plane and architectural setting,
${angle.scene_preference ?? 'seven or more figures'}, elaborate but legible
at carousel scale, no color other than this single indigo — no fills, no
gradients, pure line and mark work
```

### Variables

| Variable | Source | Fallback |
|----------|--------|----------|
| `topicNoun` | First word >3 chars from `brief.topic` | `'object'` |
| `angle.scene_domain` | Angle definition | `'commerce exchange'` |
| `angle.scene_preference` | Angle definition | `'seven or more figures'` |

---

## 3 Angles

### 1. The Commerce Hall

| Field | Value |
|-------|-------|
| `angle_key` | `the_commerce_hall` |
| `angle_description` | Activity as the proof of scale — the busiest scene, the most populated environment |
| `scene_domain` | `commerce_exchange` |
| `scene_preference` | `most_populated — counting house or quayside, seven or more figures` |
| `cartouche_style` | `oval_foliage` |
| `rhetorical_register` | `merchant_tradition` |

**Example prompt** (topic: "Passkeys"):
```
Single-color copper-plate engraving illustration of a commerce_exchange scene
related to Passkeys — rendered entirely in indigo (#2A2ECD) on
white/transparent ground, fine parallel hatching for mid-tone areas,
cross-hatching for deep shadows, stippling for soft textures, clean confident
contour lines, 18th-century French engraving aesthetic — Encyclopedie Diderot
plates register, full narrative scene with ground plane and architectural
setting, most_populated — counting house or quayside, seven or more figures,
elaborate but legible at carousel scale, no color other than this single
indigo — no fills, no gradients, pure line and mark work
```

**Headline structure:** `[Activity]. [Historical claim.]`
**Headline example:** "Commerce. The oldest infrastructure."

---

### 2. The Institution

| Field | Value |
|-------|-------|
| `angle_key` | `the_institution` |
| `angle_description` | The founding moment as proof of permanence — the charter, the table, the document signed |
| `scene_domain` | `governance_institution` |
| `scene_preference` | `charter_signing — document prominent, eight or more figures` |
| `cartouche_style` | `rectangular_foliate` |
| `rhetorical_register` | `institutional_charter` |

**Example prompt** (topic: "Passkeys"):
```
Single-color copper-plate engraving illustration of a governance_institution
scene related to Passkeys — rendered entirely in indigo (#2A2ECD) on
white/transparent ground, fine parallel hatching for mid-tone areas,
cross-hatching for deep shadows, stippling for soft textures, clean confident
contour lines, 18th-century French engraving aesthetic — Encyclopedie Diderot
plates register, full narrative scene with ground plane and architectural
setting, charter_signing — document prominent, eight or more figures,
elaborate but legible at carousel scale, no color other than this single
indigo — no fills, no gradients, pure line and mark work
```

**Headline structure:** `Built to [purpose]. As [comparator] were.`
**Headline example:** "Built to endure. As the great clearing houses were."

---

### 3. The Navigation

| Field | Value |
|-------|-------|
| `angle_key` | `the_navigation` |
| `angle_description` | The discovery register — Juspay as the navigator charting new payment corridors |
| `scene_domain` | `cartography_navigation` |
| `scene_preference` | `surveying_or_navigator — open horizon visible` |
| `cartouche_style` | `cartouche_cartographic` |
| `rhetorical_register` | `discovery_register` |

**Example prompt** (topic: "Passkeys"):
```
Single-color copper-plate engraving illustration of a
cartography_navigation scene related to Passkeys — rendered entirely in
indigo (#2A2ECD) on white/transparent ground, fine parallel hatching for
mid-tone areas, cross-hatching for deep shadows, stippling for soft textures,
clean confident contour lines, 18th-century French engraving aesthetic —
Encyclopedie Diderot plates register, full narrative scene with ground plane
and architectural setting, surveying_or_navigator — open horizon visible,
elaborate but legible at carousel scale, no color other than this single
indigo — no fills, no gradients, pure line and mark work
```

**Headline structure:** `The [routes/territory] are being [drawn/mapped] now.`
**Headline example:** "The routes are being drawn now."

---

## Propagation Metadata

| Angle | creative_angle | narrative_frame | scene_domain_arc |
|-------|---------------|----------------|-----------------|
| The Commerce Hall | `merchant_tradition` | `juspay_as_continuation` | commerce_exchange → capital_treasury → governance_institution → architecture_infrastructure → knowledge_scholarship |
| The Institution | `institutional_charter` | `juspay_as_constituted_body` | governance_institution → capital_treasury → commerce_exchange → knowledge_scholarship → architecture_infrastructure |
| The Navigation | `discovery_register` | `juspay_as_navigator` | cartography_navigation → commerce_exchange → architecture_infrastructure → natural_philosophy → governance_institution |

---

## Legacy Template (Reference Only)

From `app/src/themes/sic_toile.json`:
```
Single-color copper-plate engraving illustration of {name} in {state}
condition, rendered entirely in indigo (#2A2ECD) on transparent/white ground
— NO color other than this single indigo, fine parallel hatching for
mid-tones, cross-hatching for deep shadow areas, stippling for soft texture,
clean confident contour lines, 18th-century French or English engraving
aesthetic — Encyclopedie Diderot / Audubon Birds of America / Piranesi
Vedute register, full narrative scene with ground plane and environmental
detail, {figures_instruction}, elaborate but legible at carousel scale, no
photography, no gradients, no fills — pure line and mark work only
```

---

## Notes

- All 3 angles produce the same structural prompt — they only differ in `scene_domain` and `scene_preference`
- The scene_preference values are notably descriptive (e.g., "most_populated — counting house or quayside, seven or more figures") — they read as instructions to the image model, not just tags
- `topicNoun` is injected as "related to {topicNoun}" rather than as the primary subject — the scene domain IS the primary subject
