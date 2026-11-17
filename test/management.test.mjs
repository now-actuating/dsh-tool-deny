import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { pathToFileURL } from "node:url"
import {
  builtinTools,
  createPackageResolver,
  locateFunctions,
  ownerPackage,
  toggleHidden,
} from "../lib/management.js"

/** Write a package with one module exporting a tool-like definition, return the module. */
async function fakePackage(root, name, source) {
  const dir = join(root, ...name.split("/"))
  mkdirSync(join(dir, "lib"), { recursive: true })
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name, type: "module" }))
  writeFileSync(join(dir, "lib", "index.js"), source)
  return import(pathToFileURL(join(dir, "lib", "index.js")).href)
}

test("toggleHidden adds and removes one tool and keeps other keys", () => {
  const base = { hideSections: ["x"], hideByPreset: { minimal: ["bash"] } }
  const hidden = toggleHidden(base, "standard", "read", true)
  assert.deepEqual(hidden, { hideSections: ["x"], hideByPreset: { minimal: ["bash"], standard: ["read"] } })
  assert.deepEqual(base.hideByPreset, { minimal: ["bash"] }, "input is not mutated")
  assert.deepEqual(toggleHidden(hidden, "standard", "read", true), hidden, "idempotent")
  assert.deepEqual(toggleHidden(hidden, "standard", "read", false), base)
  assert.deepEqual(toggleHidden(base, "minimal", "bash", false), { hideSections: ["x"] })
})

test("toggleHidden keeps an empty map when the row also sets hide or deny", () => {
  assert.deepEqual(toggleHidden({ deny: ["a"], hideByPreset: { p: ["t"] } }, "p", "t", false), { deny: ["a"], hideByPreset: {} })
})

test("package resolver walks up to the nearest named manifest", () => {
  const root = mkdtempSync(join(tmpdir(), "tool-deny-pkg-"))
  mkdirSync(join(root, "a", "lib", "deep"), { recursive: true })
  writeFileSync(join(root, "a", "package.json"), JSON.stringify({ name: "@deepseek-ai/a" }))
  writeFileSync(join(root, "a", "lib", "package.json"), JSON.stringify({ type: "module" }))
  const resolve = createPackageResolver()
  assert.equal(resolve(pathToFileURL(join(root, "a", "lib", "deep", "x.js")).href), "@deepseek-ai/a")
  assert.equal(resolve("node:fs"), undefined)
  assert.equal(resolve(undefined), undefined)
})

test("locates the real defineTool wrapper back to the author's package", async (t) => {
  const { defineTool } = await import(
    pathToFileURL(join(process.env.DSH_RUNTIME ?? "/nonexistent", "node_modules/@deepseek-ai/dsh-tools/lib/index.js")).href
  ).catch(() => ({}))
  if (!defineTool) return t.skip("DSH_RUNTIME not set")
  const root = mkdtempSync(join(tmpdir(), "tool-deny-own-"))
  globalThis.__defineTool = defineTool
  const builtin = await fakePackage(root, "@deepseek-ai/dsh-tool-fake",
    "export const tool = globalThis.__defineTool({ name: 'fake', description: 'd', parameters: {}, output: { schema: { type: 'string' }, render: () => [] }, execute: async () => 'x' })")
  const third = await fakePackage(root, "third-party",
    "export const tool = globalThis.__defineTool({ name: 'other', description: 'd', parameters: {}, output: { schema: { type: 'string' }, render: () => [] }, execute: async () => 'x' })")
  const rows = builtinTools([builtin.tool, third.tool], locateFunctions, createPackageResolver())
  assert.deepEqual(rows, [{ name: "fake", package: "@deepseek-ai/dsh-tool-fake" }])
})

test("locates plain execute functions and filters to @deepseek-ai packages", async () => {
  const root = mkdtempSync(join(tmpdir(), "tool-deny-plain-"))
  const a = await fakePackage(root, "@deepseek-ai/dsh-b", "export const tool = { name: 'zeta', async execute() {} }")
  const b = await fakePackage(root, "@deepseek-ai/dsh-a", "export const tool = { name: 'alpha', async execute() {} }")
  const c = await fakePackage(root, "@someone/dsh-x", "export const tool = { name: 'mcp_x', async execute() {} }")
  const rows = builtinTools([a.tool, b.tool, c.tool, { name: "broken" }], locateFunctions, createPackageResolver())
  assert.deepEqual(rows, [
    { name: "alpha", package: "@deepseek-ai/dsh-a" },
    { name: "zeta", package: "@deepseek-ai/dsh-b" },
  ])
})

test("ownerPackage falls back to the wrapper package without an inner location", () => {
  const packageOf = (url) => ({ w: "@deepseek-ai/dsh-tools", i: "pkg" })[url]
  assert.equal(ownerPackage({ url: "w", closure: { userExecute: "i" } }, packageOf), "pkg")
  assert.equal(ownerPackage({ url: "w", closure: {} }, packageOf), "@deepseek-ai/dsh-tools")
  assert.equal(ownerPackage(undefined, packageOf), undefined)
})

test("locateFunctions leaves no global probe behind", () => {
  const before = Object.keys(globalThis).filter((k) => k.startsWith("__dshToolDeny"))
  locateFunctions([() => {}])
  assert.deepEqual(Object.keys(globalThis).filter((k) => k.startsWith("__dshToolDeny")), before)
})
