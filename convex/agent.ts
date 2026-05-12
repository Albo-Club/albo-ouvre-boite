import { anthropic } from '@ai-sdk/anthropic'
import { Agent, stepCountIs } from '@convex-dev/agent'

import { components } from './_generated/api'
import { itemTools } from './agentTools'

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5'

export function getModel() {
  return anthropic.chat(ANTHROPIC_MODEL)
}

export const chatAgent = new Agent(components.agent, {
  name: 'albo',
  languageModel: getModel(),
  instructions:
    "You are albo's helpful in-app assistant. Answer concisely. " +
    "You can act on the user's organization through tools (list/create/" +
    'update/delete items). Always confirm destructive actions (delete) by ' +
    'restating the target before calling the tool. ' +
    'If a user asks something you cannot answer from context or do via ' +
    'tools, say so and suggest what they might do next.',
  tools: itemTools,
  stopWhen: stepCountIs(5),
})
