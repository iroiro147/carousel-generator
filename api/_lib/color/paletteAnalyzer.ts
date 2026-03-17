// ─── Palette Analyzer ─────────────────────────────────────────────────────────
// Steps 1-5 of the NYT color derivation pipeline.
// Single Gemini 2.5 Flash vision call: sends cover image + topic + claim,
// receives structured XML with selected hue, derivation path, and sentiment.
//
// This is NOT in providers/ — it's a color pipeline step, not an image generator.

import { GoogleGenAI } from '@google/genai'

let ai: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error('GOOGLE_API_KEY is not set (needed for color analysis)')
    ai = new GoogleGenAI({ apiKey })
  }
  return ai
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type DerivationPath =
  | 'chromatic_primary'     // Step 2+3 passed → dominant hue used
  | 'chromatic_secondary'   // Step 4 → secondary/accent hue used
  | 'material_neutral'      // Step 5 → neutral extracted from substrate
  | 'fallback'              // Vision call failed entirely

export type ArticleSentiment =
  | 'confrontational'   // satirical, aggressive → WIDE alternation
  | 'standard'          // typical editorial → MEDIUM alternation
  | 'contemplative'     // sensitive, reflective → NARROW alternation
  | 'advocacy'          // call-to-action, rallying → MINIMAL alternation

export interface PaletteAnalysisResult {
  /** The selected hue as HSL — H: 0-360, S: 0-100, L: 0-100 */
  selected_hue_h: number
  selected_hue_s: number
  selected_hue_l: number
  /** Hex representation of the selected hue */
  selected_hue_hex: string
  /** How the hue was derived */
  derivation_path: DerivationPath
  /** Article sentiment classification for Step 7 alternation range */
  sentiment: ArticleSentiment
  /** Whether this is a neutral (low saturation) result */
  is_neutral: boolean
  /** Brief reasoning from the model */
  reasoning: string
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a color derivation engine for an NYT Opinion-style editorial carousel system.

You will receive:
1. A cover illustration image (base64 JPEG)
2. The article topic
3. The article's core claim/thesis

Your job is to analyze the cover illustration and select a SINGLE hue that will become the accent color for the text slides. You must follow the 5-step pipeline below EXACTLY.

## PIPELINE

STEP 1 — EXTRACT PALETTE
Extract 5-6 colors from the cover illustration. Include: dominant color, secondary hues, shadow tones, highlight tones, and any single-point accent colors (glowing screen, bright sprout, etc.).

STEP 2 — VIABILITY FILTER
For each extracted hue, test: does this hue survive at pastel values (70-85% lightness, 15-35% saturation)?

PASS: Blues, greens, purples, teals, warm pinks — retain chromatic identity at pastel.
FAIL: Yellows → become beige (reads as accidental/dirty).
FAIL: Oranges → become peach/tan (reads as skin-tone, not editorial).
PARTIAL: Reds → become pink (depends on Step 3).

If NO hue passes → go to Step 5.

STEP 3 — EDITORIAL TONE FILTER
For each hue that passed Step 2, test: does the pastel version match the article's emotional register?

The question: "If I showed someone a solid rectangle of this color and asked them what kind of article it belongs to, would their answer match?"

PASS: Sky blue + health policy = clinical, serious ✓
PASS: Lavender + tech regulation = thoughtful ✓
PASS: Electric green + organ donation = vital, hopeful ✓
FAIL: Pink + war spending = trivializes ✗
FAIL: Bright pastel + severe illness = tonally deaf ✗

If a hue passes both → it becomes the accent. Use derivation_path="chromatic_primary".

STEP 4 — SECONDARY HUE CHECK
If the dominant hue failed, check secondary/accent hues in the illustration.
Example: Gold dominant (fails viability) but lavender in shadows (passes both) → lavender.
Example: Dark/black dominant but blue phone glow (passes both) → blue.

If a secondary passes → derivation_path="chromatic_secondary".

STEP 5 — MATERIAL NEUTRAL FALLBACK
Extract the dominant material/substrate color from the illustration:
- Paper/parchment → warm off-white/cream
- Receipt paper → light warm gray
- Canvas → warm beige
- Stone/concrete → cool gray

Tint this neutral with the GHOST of the dominant chromatic hue from Step 1.
The tint should be so subtle it reads as "warm" or "cool" rather than a named color.

derivation_path="material_neutral".

## SENTIMENT CLASSIFICATION
Also classify the article's emotional register based on topic + claim:
- "confrontational" — satirical, aggressive, provocative
- "standard" — typical editorial analysis
- "contemplative" — sensitive, reflective, personal
- "advocacy" — call-to-action, rallying, urgent

## OUTPUT FORMAT
Respond with ONLY this XML (no prose before or after):

<color_analysis>
  <extracted_palette>
    <color hex="#XXXXXX" name="descriptive name" role="dominant|secondary|accent|shadow|highlight" />
    <!-- 5-6 colors -->
  </extracted_palette>
  <viability_results>
    <hue hex="#XXXXXX" pastel_hex="#XXXXXX" passes="true|false" reason="brief reason" />
    <!-- one per extracted chromatic hue -->
  </viability_results>
  <editorial_tone_results>
    <hue hex="#XXXXXX" passes="true|false" reason="brief reason" />
    <!-- only for hues that passed viability -->
  </editorial_tone_results>
  <selected_hue hex="#XXXXXX" h="0-360" s="0-100" l="0-100" />
  <derivation_path>chromatic_primary|chromatic_secondary|material_neutral</derivation_path>
  <is_neutral>true|false</is_neutral>
  <sentiment>confrontational|standard|contemplative|advocacy</sentiment>
  <reasoning>1-2 sentence explanation of why this hue was selected</reasoning>
</color_analysis>`

// ─── Parser ───────────────────────────────────────────────────────────────────

function extractTagContent(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const match = xml.match(regex)
  return match?.[1]?.trim() ?? ''
}

function extractAttribute(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i')
  const match = xml.match(regex)
  return match?.[1]?.trim() ?? ''
}

function parseAnalysisXml(xml: string): PaletteAnalysisResult {
  const hex = extractAttribute(xml, 'selected_hue', 'hex') || '#C2185B'
  const h = parseFloat(extractAttribute(xml, 'selected_hue', 'h')) || 0
  const s = parseFloat(extractAttribute(xml, 'selected_hue', 's')) || 0
  const l = parseFloat(extractAttribute(xml, 'selected_hue', 'l')) || 50

  const pathRaw = extractTagContent(xml, 'derivation_path')
  const validPaths = ['chromatic_primary', 'chromatic_secondary', 'material_neutral'] as const
  const derivationPath: DerivationPath =
    (validPaths as readonly string[]).includes(pathRaw)
      ? (pathRaw as DerivationPath)
      : 'chromatic_primary'

  const isNeutralRaw = extractTagContent(xml, 'is_neutral')
  const isNeutral = isNeutralRaw === 'true'

  const sentimentRaw = extractTagContent(xml, 'sentiment')
  const validSentiments = ['confrontational', 'standard', 'contemplative', 'advocacy'] as const
  const sentiment: ArticleSentiment =
    (validSentiments as readonly string[]).includes(sentimentRaw)
      ? (sentimentRaw as ArticleSentiment)
      : 'standard'

  const reasoning = extractTagContent(xml, 'reasoning') || 'No reasoning provided'

  return {
    selected_hue_h: h,
    selected_hue_s: s,
    selected_hue_l: l,
    selected_hue_hex: hex,
    derivation_path: derivationPath,
    sentiment,
    is_neutral: isNeutral,
    reasoning,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export interface AnalyzePaletteParams {
  /** Base64-encoded JPEG cover image (no data:image prefix) */
  imageBase64: string
  /** Article topic */
  topic: string
  /** Article claim/thesis */
  claim: string
}

/**
 * Analyzes cover illustration via Gemini 2.5 Flash vision to select a hue
 * following the 5-step NYT color derivation pipeline.
 *
 * Timeout: caller should enforce 10s. If this fails, caller falls back to tokens.
 */
export async function analyzePalette(params: AnalyzePaletteParams): Promise<PaletteAnalysisResult> {
  const { imageBase64, topic, claim } = params

  // Strip data URI prefix if present
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')

  const userPrompt = `Topic: ${topic}

Core claim: ${claim}

Analyze the attached cover illustration and derive the accent color following the 5-step pipeline.`

  const response = await getClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          { text: userPrompt },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  })

  const text = response.text ?? ''

  if (!text.includes('<color_analysis>')) {
    throw new Error('Color analysis returned non-XML response')
  }

  return parseAnalysisXml(text)
}
