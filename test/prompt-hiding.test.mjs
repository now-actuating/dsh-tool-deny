import assert from "node:assert/strict"
import { test } from "node:test"
import { apply } from "../index.js"
import { toggleHidden } from "../lib/management.js"

// Model the public scoped registry contracts: scoped sections shadow globals,
// duplicate names throw, and empty sections are omitted from rendered text.
function harness(presets = ["standard", "minimal"]) {
  const globalSections = new Map([["tool:workflow", "WORKFLOW INSTRUCTIONS"], ["notes", "NOTES"]])
  const listeners = new Map()
  const effects = []
  const warnings = []
  const agents = presets.map((preset, index) => {
    const sections = new Map()
    const denied = new Set()
    const ctx = {
      tools: { restrict({ deny }) {
        if (deny.some((name) => !["workflow", "read"].includes(name))) throw new Error("unknown tool")
        for (const name of deny) denied.add(name)
        return () => { for (const name of deny) denied.delete(name) }
      } },
      systemPrompt: { section({ name, text }) {
        assert.equal(sections.has(name), false, `duplicate scoped section ${name}`)
        sections.set(name, text)
        return () => sections.delete(name)
      } },
    }
    return { id: String(index), preset, ctx, sections, denied }
  })
  const ctx = {
    logger: { warn: (message) => warnings.push(message) },
    agents: { list: () => agents, get: (id) => agents.find((agent) => agent.id === id) },
    agentPresets: { composedPreset: (ctx) => agents.find((agent) => agent.ctx === ctx).preset },
    inject: (_, callback) => callback(ctx),
    on: (name, callback) => {
      const callbacks = listeners.get(name) ?? new Set()
      callbacks.add(callback)
      listeners.set(name, callbacks)
      effects.push(() => callbacks.delete(callback))
    },
    effect: (callback) => effects.push(callback()),
  }
  return {
    ctx, agents, warnings,
    emit: (name, ...args) => { for (const callback of listeners.get(name) ?? []) callback(...args) },
    unload: () => { for (const dispose of effects.splice(0).reverse()) dispose() },
    prompt: (agent) => [...new Map([...globalSections, ...agent.sections]).values()].filter(Boolean).join("\n\n"),
  }
}

test("hideByPreset removes workflow and instructions only for the named preset", () => {
  const h = harness()
  apply(h.ctx, { hideByPreset: { standard: ["workflow"] } })
  assert.equal(h.agents[0].denied.has("workflow"), true)
  assert.equal(h.prompt(h.agents[0]), "NOTES")
  assert.equal(h.agents[1].denied.has("workflow"), false)
  assert.equal(h.prompt(h.agents[1]), "WORKFLOW INSTRUCTIONS\n\nNOTES")
})

test("showing a tool through the unchanged table config restores tool and instructions", () => {
  const h = harness()
  const config = { hideByPreset: { standard: ["workflow"] } }
  apply(h.ctx, config)
  h.unload() // The config editor restarts the plugin after saving.
  apply(h.ctx, toggleHidden(config, "standard", "workflow", false))
  assert.equal(h.agents[0].denied.size, 0)
  assert.equal(h.agents[0].sections.size, 0)
  assert.equal(h.prompt(h.agents[0]), "WORKFLOW INSTRUCTIONS\n\nNOTES")
})

test("a tool without instructions adds no rendered prompt content; unknown tools are skipped", () => {
  const h = harness()
  apply(h.ctx, { hideByPreset: { standard: ["read", "unknown"] } })
  assert.equal(h.agents[0].denied.has("read"), true)
  assert.equal(h.prompt(h.agents[0]), h.prompt(h.agents[1]))
  assert.equal(h.agents[0].sections.has("tool:unknown"), false)
  assert.equal(h.warnings.length, 1)
})

test("hideSections coexists with automatic names and repeated tool names", () => {
  const h = harness()
  apply(h.ctx, { hideByPreset: { standard: ["workflow", "workflow"] }, hideSections: ["tool:workflow", "notes", "notes"] })
  assert.equal(h.prompt(h.agents[0]), "")
  assert.equal(h.agents[0].sections.size, 2)
  assert.equal(h.prompt(h.agents[1]), "WORKFLOW INSTRUCTIONS\n\nNOTES")
  h.unload()
  assert.equal(h.agents[0].sections.size, 0)
})

test("created agents, preset switches, disposal and plugin reload share the same policy", () => {
  const h = harness(["minimal", "standard", "standard"])
  apply(h.ctx, { hideByPreset: { standard: ["workflow"] } })
  const [switched, child, created] = h.agents
  h.emit("agent/created", { agent: created })
  for (const agent of [child, created]) assert.equal(h.prompt(agent), "NOTES")
  switched.preset = "standard"
  h.emit("agent-preset/selected", switched.id)
  assert.equal(h.prompt(switched), "NOTES")
  switched.preset = "minimal"
  h.emit("agent-preset/selected", switched.id)
  assert.equal(switched.denied.size, 0)
  assert.equal(h.prompt(switched), "WORKFLOW INSTRUCTIONS\n\nNOTES")
  h.emit("agent/disposed", { agent: child })
  assert.equal(child.sections.size, 0)
  assert.equal(child.denied.size, 0)
  h.unload()
  assert.equal(created.sections.size, 0)
})

test("preset-local hide also suppresses instructions, while deny does not", () => {
  const h = harness()
  const agent = h.agents[0]
  const guards = []
  agent.ctx.tools.guard = (guard) => guards.push(guard)
  apply(agent.ctx, { hide: ["workflow"] })
  assert.equal(h.prompt(agent), "NOTES")
  const other = h.agents[1]
  other.ctx.tools.guard = (guard) => guards.push(guard)
  apply(other.ctx, { deny: ["workflow"] })
  assert.equal(h.prompt(other), "WORKFLOW INSTRUCTIONS\n\nNOTES")
  assert.match(guards[0]({ name: "workflow" }), /not available/)
})
