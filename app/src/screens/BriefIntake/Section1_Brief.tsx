import { useState } from 'react'
import type { GoalKey } from '../../types/brief'
import FormField from './components/FormField'
import CardSelect from './components/CardSelect'

const GOAL_OPTIONS: Array<{ key: GoalKey; label: string; sublabel: string }> = [
  { key: 'shift_belief', label: 'Shift belief', sublabel: 'Change how someone thinks about something' },
  { key: 'build_authority', label: 'Build authority', sublabel: 'Establish credibility and expertise' },
  { key: 'educate_explain', label: 'Educate / Explain', sublabel: 'Help someone understand how something works' },
  { key: 'product_awareness', label: 'Show the product', sublabel: 'Make the value proposition visible' },
  { key: 'emotional_connection', label: 'Create connection', sublabel: 'Recognition, empathy, human truth' },
  { key: 'strategic_narrative', label: 'Strategic narrative', sublabel: 'Position the company in a larger story' },
  { key: 'direct_response', label: 'Drive action', sublabel: 'Get someone to do something specific' },
]

interface Section1Props {
  topic: string
  goal: GoalKey | null
  claim: string
  onTopicChange: (v: string) => void
  onGoalChange: (v: GoalKey) => void
  onClaimChange: (v: string) => void
}

export default function Section1_Brief({
  topic, goal, claim,
  onTopicChange, onGoalChange, onClaimChange,
}: Section1Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validateTopic() {
    if (topic.length > 0 && topic.length < 8) {
      setErrors(e => ({ ...e, topic: "Tell us a bit more about the topic — at least a full sentence." }))
    } else {
      setErrors(e => { const { topic: _, ...rest } = e; return rest })
    }
  }

  function validateClaim() {
    if (claim.length > 0 && claim.length < 20) {
      setErrors(e => ({ ...e, claim: "What's the main point? Give us something to work with." }))
    } else {
      setErrors(e => { const { claim: _, ...rest } = e; return rest })
    }
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-6 flex flex-col gap-5">
      <h2 className="text-base font-semibold text-zinc-900">The Brief</h2>

      <FormField
        label="What's this carousel about?"
        sublabel="One sentence. The topic, not the argument."
        error={errors.topic}
      >
        <div className="relative">
          <input
            type="text"
            value={topic}
            maxLength={160}
            placeholder="Why passkey authentication is replacing OTPs across Indian fintech"
            onChange={e => onTopicChange(e.target.value)}
            onBlur={validateTopic}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
          />
          {topic.length >= 120 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">
              {topic.length}/160
            </span>
          )}
        </div>
      </FormField>

      <FormField
        label="What should this carousel do?"
        error={errors.goal}
      >
        <CardSelect<GoalKey>
          options={GOAL_OPTIONS}
          value={goal}
          onChange={onGoalChange}
          name="goal"
        />
      </FormField>

      <FormField
        label="What's the one thing you want the reader to take away?"
        sublabel="The central claim, uncomfortable truth, or key insight. One or two sentences."
        error={errors.claim}
      >
        <div className="relative">
          <textarea
            value={claim}
            maxLength={320}
            rows={3}
            placeholder="OTPs create the illusion of security while being trivially easy to phish. Passkeys are the only authentication method that's both faster and actually secure — but no one is saying this plainly."
            onChange={e => onClaimChange(e.target.value)}
            onBlur={validateClaim}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition resize-none"
          />
          {claim.length >= 240 && (
            <span className="absolute right-2 bottom-2 text-[11px] text-muted">
              {claim.length}/320
            </span>
          )}
        </div>
      </FormField>
    </div>
  )
}
