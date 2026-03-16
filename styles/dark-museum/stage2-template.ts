// ─── Dark Museum Stage 2 Prompt Builder ──────────────────────────────────────
// Ported from design-ai 2/demo/lib/promptBuilder.ts buildImagePrompt()
// Assembles the GPT-Image-1.5 prompt from the parsed visual decision.

import type { VisualDecision, Tokens } from '../../api/_lib/pipeline/types.js'

interface DarkMuseumArtifact {
  label: string
  description: string
  eraNuance: string
  materialType: string
  physicalCondition: 'PRISTINE' | 'WORN' | 'RUSTED' | 'BROKEN'
}

export function buildStage2Prompt(decision: VisualDecision, _tokens: Tokens): string {
  const artifacts = (decision.artifacts ?? []) as DarkMuseumArtifact[]
  const layoutStyle = (decision.layoutStyle as string) ?? 'Suspended'
  const positionFocus = (decision.positionFocus as string) ?? 'Bottom-Center'
  const lightingAccent = (decision.lightingAccent as string) ?? 'Cool white rim'

  const artifactDescriptions = artifacts.map((artifact) => {
    const { physicalCondition, description, materialType, eraNuance } = artifact
    return `a ${physicalCondition.toLowerCase()} ${description} made of ${materialType} (${eraNuance})`
  })

  let objectsString = ''
  if (artifactDescriptions.length === 0) {
    objectsString = 'a retro-analog artifact'
  } else if (artifactDescriptions.length === 1) {
    objectsString = artifactDescriptions[0]
  } else {
    const last = artifactDescriptions.pop()!
    objectsString = `${artifactDescriptions.join(', ')} and ${last}`
  }

  return `A hyper-realistic, ${objectsString}. The objects are ${layoutStyle} in a pure #000000 matte black void. Cinematic studio lighting with a ${lightingAccent} rim highlight to emphasize textures. 8k resolution, macro-photography detail, Octane Render style, high-contrast, volumetric shadows. Positioning: ${positionFocus} third of the frame. Massive negative space. --ar 2176:2716`
}
