import { anthropic } from '@ai-sdk/anthropic'
import { Agent, stepCountIs } from '@convex-dev/agent'

import { components } from './_generated/api'
import { itemTools } from './agentTools'
import { BASE_INSTRUCTIONS } from './lib/instructions'

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5'

export function getModel() {
  return anthropic.chat(ANTHROPIC_MODEL)
}

export const chatAgent = new Agent(components.agent, {
  name: 'albo',
  languageModel: getModel(),
  // Per-message system prompt (route/org context) is layered on top at
  // stream time via `buildInstructions` in convex/chat.ts.
  instructions: BASE_INSTRUCTIONS,
  tools: itemTools,
  // Room for a multi-step loop: tool call → approval → resume → final answer.
  stopWhen: stepCountIs(10),
})
