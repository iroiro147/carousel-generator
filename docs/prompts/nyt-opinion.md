# NYT Opinion — Image Prompt Reference

> Theme ID: `nyt_opinion`
> Source: `api/variants/generate-one.ts` → `buildCoverPrompt()` case `'nyt_opinion'`

---

## Visual Identity

Bold saturated color fields. Lora serif headlines, Libre Franklin body. Broadsheet editorial aesthetic. Three entirely different visual registers (editorial cartoon, fine art, conceptual photography) — the only theme with branching prompt logic.

---

## Prompt Logic (Branching)

**This is the only theme where `illustration_mode` switches the entire prompt.**

```typescript
const mode = angle.illustration_mode ?? 'editorial_cartoon'

if (mode === 'editorial_cartoon') → Prompt A
if (mode === 'fine_art_expressive') → Prompt B
else → Prompt C (conceptual_photography default)
```

---

## Prompt A: Editorial Cartoon

**Triggered by:** `illustration_mode === 'editorial_cartoon'` (The Metaphor angle)

```
Flat vector editorial illustration of ${topicNoun} as a commentary — bold
saturated colors in a limited palette of 2-3 colors, clean confident outlines
with no gradients, flat color fills only, mid-century editorial illustration
aesthetic — Ben Shahn meets Push Pin Studios, centered scene composition,
white or light background, black outlines throughout, no photographic
elements, no gradients, no shadows — pure flat vector aesthetic
```

### Variables

| Variable | Source | Fallback |
|----------|--------|----------|
| `topicNoun` | First word >3 chars from `brief.topic` | `'object'` |

---

## Prompt B: Fine Art Expressive

**Triggered by:** `illustration_mode === 'fine_art_expressive'` (The Figure angle)

```
Drypoint etching of a figure contemplating ${topicNoun} — haunted emotional
register, heavy texture throughout from drypoint burr, figure partially
visible in shadow, muted palette dominated by warm ochre, atmospheric and
expressive rather than precise, somber mood, the mark-making is the emotional
content, museum-quality fine art print aesthetic
```

### Variables

| Variable | Source | Fallback |
|----------|--------|----------|
| `topicNoun` | First word >3 chars from `brief.topic` | `'object'` |

---

## Prompt C: Conceptual Photography (Default)

**Triggered by:** any other `illustration_mode` value, including `'conceptual_photography'` (The Scene angle)

```
Studio chiaroscuro photograph of ${topicNoun} as symbolic object — single
dramatic light source from upper left, isolated against pure black background,
strong specular highlight on edges, cinematic and slightly uncomfortable
register, photorealistic, high material quality surface detail
```

### Variables

| Variable | Source | Fallback |
|----------|--------|----------|
| `topicNoun` | First word >3 chars from `brief.topic` | `'object'` |

---

## 3 Angles

### 1. The Metaphor → Editorial Cartoon

| Field | Value |
|-------|-------|
| `angle_key` | `the_metaphor` |
| `angle_description` | The lateral read — the visual metaphor surprises, the headline completes it |
| `illustration_mode` | `editorial_cartoon` |
| `illustration_rule` | avoid_the_obvious — the metaphor must require one beat of thought, not zero |
| `rhetorical_register` | `intellectual_provocation` |

**Example prompt** (topic: "Passkeys"):
```
Flat vector editorial illustration of Passkeys as a commentary — bold
saturated colors in a limited palette of 2-3 colors, clean confident outlines
with no gradients, flat color fills only, mid-century editorial illustration
aesthetic — Ben Shahn meets Push Pin Studios, centered scene composition,
white or light background, black outlines throughout, no photographic
elements, no gradients, no shadows — pure flat vector aesthetic
```

**Headline structure:** `The [Unexpected Adj] of [Known Thing].`
**Headline example:** "The Invisible Cost of the Familiar OTP."

---

### 2. The Figure → Fine Art Expressive

| Field | Value |
|-------|-------|
| `angle_key` | `the_figure` |
| `angle_description` | The human face of the argument — emotional authority through the lived experience of the claim |
| `illustration_mode` | `fine_art_expressive` |
| `illustration_rule` | human_presence_required — figure, face, or hand as compositional center |
| `rhetorical_register` | `emotional_authority` |

**Example prompt** (topic: "Passkeys"):
```
Drypoint etching of a figure contemplating Passkeys — haunted emotional
register, heavy texture throughout from drypoint burr, figure partially
visible in shadow, muted palette dominated by warm ochre, atmospheric and
expressive rather than precise, somber mood, the mark-making is the emotional
content, museum-quality fine art print aesthetic
```

**Headline structure:** `What We Don't Understand About [X].`
**Headline example:** "What We Don't Understand About Password Fatigue."

---

### 3. The Scene → Conceptual Photography

| Field | Value |
|-------|-------|
| `angle_key` | `the_scene` |
| `angle_description` | The uncomfortable image — something slightly difficult to look at directly, which earns the argument's credibility |
| `illustration_mode` | `conceptual_photography` |
| `illustration_rule` | staged_dramatic — one object or scenario with strong material reality and chiaroscuro lighting |
| `rhetorical_register` | `gothic_authority` |

**Example prompt** (topic: "Passkeys"):
```
Studio chiaroscuro photograph of Passkeys as symbolic object — single
dramatic light source from upper left, isolated against pure black background,
strong specular highlight on edges, cinematic and slightly uncomfortable
register, photorealistic, high material quality surface detail
```

**Headline structure:** `[Question]? [Unexpected Answer].`
**Headline example:** "Is Your Checkout Secure? Probably Not in the Way You Think."

---

## Propagation Metadata

| Angle | creative_angle | quote_structure_preference | signature_color_register |
|-------|---------------|--------------------------|------------------------|
| The Metaphor | `intellectual_provocation` | counterintuitive, hard_fact | `counterintuitive_or_financial_authority` |
| The Figure | `emotional_authority` | process_as_experience, escalation | `human_cost_or_urgent_crisis` |
| The Scene | `gothic_authority` | hard_fact, counterintuitive | `security_trust_or_urgent_crisis` |

All angles share `quote_progression: "thesis_evidence_landing"`.

---

## Notes

- NYT Opinion has **no legacy `image_prompt_template`** in its theme JSON
- The 3 prompts produce radically different visual outputs (vector illustration vs. etching vs. photography)
- `topicNoun` is the ONLY user input that varies across prompts — no angle-specific field substitution beyond `illustration_mode` branching
