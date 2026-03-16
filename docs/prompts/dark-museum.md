# Dark Museum — Image Prompt Reference

> Theme ID: `dark_museum`
> Source: `api/variants/generate-one.ts` → `buildCoverPrompt()` case `'dark_museum'`

---

## Visual Identity

Near-black (#0A0A0A) canvas. Photorealistic 3D-rendered objects under a single museum spotlight. Precision-machined metal and glass. Editorial luxury aesthetic. Playfair Display Black headlines, gold accent (#C4A44A).

---

## Prompt Template

```
${topicNoun} rendered as a luxury museum specimen — precision-machined metal
and glass, ${angle.object_state_preference ?? 'gleaming'} state, suspended
in absolute darkness with a single overhead spotlight creating a precise cone
of warm light (3200K), deep shadow falling directly below, micro-scratches
visible on surface, photorealistic 3D render, studio product photography
quality, no background elements, object positioned center-canvas, object
fills 70% of frame, ultra-high detail, 8K render quality, composition mode:
${angle.composition_mode}
```

### Variables

| Variable | Source | Fallback |
|----------|--------|----------|
| `topicNoun` | First word >3 chars from `brief.topic` | `'object'` |
| `angle.object_state_preference` | Angle definition | `'gleaming'` |
| `angle.composition_mode` | Angle definition | (none — always present) |

---

## 3 Angles

### 1. The Specimen

| Field | Value |
|-------|-------|
| `angle_key` | `the_specimen` |
| `angle_description` | Technical authority through the object itself — the most precise thing in the domain |
| `composition_mode` | `specimen` |
| `object_state_preference` | `gleaming` |
| `object_selection_rule` | most_technically_precise — select the instrument or mechanism object from the matched domain, not the metaphorical or abstract object |
| `rhetorical_register` | `technical_authority` |

**Example prompt** (topic: "Passkeys"):
```
Passkeys rendered as a luxury museum specimen — precision-machined metal and
glass, gleaming state, suspended in absolute darkness with a single overhead
spotlight creating a precise cone of warm light (3200K), deep shadow falling
directly below, micro-scratches visible on surface, photorealistic 3D render,
studio product photography quality, no background elements, object positioned
center-canvas, object fills 70% of frame, ultra-high detail, 8K render
quality, composition mode: specimen
```

**Headline structure:** `[Object name]. [Single declarative claim.]`
**Headline example:** "Passkeys. The end of the stolen credential."

---

### 2. The Contrast

| Field | Value |
|-------|-------|
| `angle_key` | `the_contrast` |
| `angle_description` | Before/after contrast as the argument — the old object and the new, side by side |
| `composition_mode` | `duo` |
| `object_state_preference` | `degraded_left_gleaming_right` |
| `object_selection_rule` | paired_objects — one from legacy/failure domain in degraded state, one from solution domain in pristine state |
| `rhetorical_register` | `comparative_argument` |

**Example prompt** (topic: "Passkeys"):
```
Passkeys rendered as a luxury museum specimen — precision-machined metal and
glass, degraded_left_gleaming_right state, suspended in absolute darkness
with a single overhead spotlight creating a precise cone of warm light (3200K),
deep shadow falling directly below, micro-scratches visible on surface,
photorealistic 3D render, studio product photography quality, no background
elements, object positioned center-canvas, object fills 70% of frame,
ultra-high detail, 8K render quality, composition mode: duo
```

**Headline structure:** `[Old state]. [New state].`
**Headline example:** "OTPs corrode. Passkeys don't."

---

### 3. The Consequence

| Field | Value |
|-------|-------|
| `angle_key` | `the_consequence` |
| `angle_description` | Scale and reach — the argument is inevitability, not mechanism |
| `composition_mode` | `cascade` |
| `object_state_preference` | `activated` |
| `object_selection_rule` | outcome_object — select the object that represents the result or deployment at scale, not the technical mechanism |
| `rhetorical_register` | `scale_inevitability` |

**Example prompt** (topic: "Passkeys"):
```
Passkeys rendered as a luxury museum specimen — precision-machined metal and
glass, activated state, suspended in absolute darkness with a single overhead
spotlight creating a precise cone of warm light (3200K), deep shadow falling
directly below, micro-scratches visible on surface, photorealistic 3D render,
studio product photography quality, no background elements, object positioned
center-canvas, object fills 70% of frame, ultra-high detail, 8K render
quality, composition mode: cascade
```

**Headline structure:** `[Scope]. [Scope]. [Scope].`
**Headline example:** "Every checkout. Every device. Every market."

---

## Propagation Metadata

Each angle carries `propagation_metadata` that flows into body slide generation (not cover):

| Angle | creative_angle | narrative_frame | body_slide_tone |
|-------|---------------|----------------|----------------|
| The Specimen | `technical_authority` | `examination_reveals_truth` | `methodical_escalation` |
| The Contrast | `comparative_argument` | `before_after_at_every_level` | `alternating_contrast` |
| The Consequence | `scale_inevitability` | `the_argument_is_quantity` | `building_to_scale` |

---

## Legacy Template (Reference Only)

From `app/src/themes/dark_museum.json`:
```
Photorealistic 3D render of {name}, {state} state, dramatic single-source
museum spotlight lighting from upper-left, dark background ({bg}), high-detail
{material} textures, slight 3/4 view with subtle downward camera angle, no
ground plane, floating in space, subtle ambient occlusion, volumetric light
haze, 8K detail, studio photography quality
```
This template uses `{name}`, `{state}`, `{bg}`, `{material}` placeholders — a different system not used in production.
