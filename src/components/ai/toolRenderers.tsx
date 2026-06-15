import type { ComponentType } from 'react'

/**
 * Optional rich renderers for tool outputs. The AI panel already renders a
 * generic collapsible (input + JSON output) for every tool call via
 * `ai-elements/tool.tsx`. A renderer registered here lets a specific tool
 * draw a nicer result (a table, cards, deep links…) BELOW that block once the
 * call completes with `state === 'output-available'`.
 *
 * This skeleton ships none — `getToolRenderer` returns null, so the generic
 * view is always used. To add one, key it by tool name and return a component
 * that takes the tool `output` and is DEFENSIVE about its shape (return null
 * on anything unexpected — the tool's return contract can drift). Example:
 *
 *   const renderers: Record<string, ToolRenderer> = {
 *     listItems: ({ output }) => {
 *       if (!Array.isArray(output)) return null
 *       return (
 *         <ul className="text-sm">
 *           {output.map((it) => (
 *             <li key={(it as { _id: string })._id}>
 *               {(it as { title: string }).title}
 *             </li>
 *           ))}
 *         </ul>
 *       )
 *     },
 *   }
 *   export function getToolRenderer(name: string) {
 *     return renderers[name] ?? null
 *   }
 */

export type ToolRenderer = ComponentType<{ output: unknown }>

export function getToolRenderer(_toolName: string): ToolRenderer | null {
  return null
}
