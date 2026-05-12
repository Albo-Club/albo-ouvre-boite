import { anthropic } from '@ai-sdk/anthropic'
import { Agent } from '@convex-dev/agent'

import { components } from './_generated/api'

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'

export function getModel() {
  return anthropic.chat(ANTHROPIC_MODEL)
}

export const chatAgent = new Agent(components.agent, {
  name: 'albo',
  languageModel: getModel(),
  instructions:
    "You are albo's helpful in-app assistant. Answer concisely. " +
    'If a user asks something you cannot answer from context, say so and ' +
    'suggest what they might do next.',
})
