/**
 * Fork addition: the preset × built-in tool table on this bundle's page.
 *
 * - Rows are the global tools whose owning package is a DSH built-in
 *   (`@deepseek-ai/*`). The tool registry records no owner, so the owner is
 *   read from where the tool's `execute` function was defined (V8 inspector,
 *   synchronous, in-process). A `defineTool()` wrapper is unwrapped to the
 *   author's own `execute`.
 * - Columns are the agent presets of the profile.
 * - Every change edits only `hideByPreset` in this plugin's own row through
 *   the config editor; the plugin then restarts and re-applies the lists to
 *   running agents.
 */
import { readFileSync } from "node:fs"
import { Session } from "node:inspector"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

export const BUILTIN_SCOPE = "@deepseek-ai/"
// defineTool() lives here; its execute wrapper calls the author's `userExecute`.
const WRAPPER_PACKAGE = "@deepseek-ai/dsh-tools"
const WRAPPED_NAME = "userExecute"
const ROUTE_PREFIX = "tool-deny."

/** Package name owning a file URL, found by walking up to the nearest named package.json. */
export function createPackageResolver(read = (path) => readFileSync(path, "utf8")) {
  const cache = new Map()
  return (url) => {
    if (typeof url !== "string" || !url.startsWith("file:")) return undefined
    let dir
    try {
      dir = dirname(fileURLToPath(url))
    } catch {
      return undefined
    }
    const visited = []
    let name
    for (;;) {
      if (cache.has(dir)) {
        name = cache.get(dir)
        break
      }
      visited.push(dir)
      try {
        const parsed = JSON.parse(read(join(dir, "package.json")))
        if (typeof parsed?.name === "string" && parsed.name) {
          name = parsed.name
          break
        }
      } catch {
        // no manifest here, keep walking
      }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    for (const d of visited) cache.set(d, name)
    return name
  }
}

function call(session, method, params) {
  let done = false
  let error
  let value
  session.post(method, params, (e, r) => {
    done = true
    error = e
    value = r
  })
  if (!done) throw new Error(`inspector ${method} did not complete synchronously`)
  if (error) throw error
  return value
}

/**
 * Locate functions in one synchronous inspector pass.
 * @returns per function `{ url, closure: { [name]: url } }` or undefined.
 */
export function locateFunctions(fns) {
  const session = new Session()
  session.connect()
  const urls = new Map()
  session.on("Debugger.scriptParsed", ({ params }) => urls.set(params.scriptId, params.url))
  const key = `__dshToolDenyProbe${process.pid}${Date.now()}`
  const group = "dsh-tool-deny"
  const props = (objectId) =>
    call(session, "Runtime.getProperties", { objectId, ownProperties: true, objectGroup: group })
  const locationOf = (internal) => {
    const loc = internal?.find((p) => p.name === "[[FunctionLocation]]")?.value?.value
    return loc ? urls.get(loc.scriptId) : undefined
  }
  try {
    call(session, "Debugger.enable")
    globalThis[key] = fns
    const { result } = call(session, "Runtime.evaluate", {
      expression: `globalThis[${JSON.stringify(key)}]`,
      objectGroup: group,
    })
    const items = props(result.objectId).result
    return fns.map((_, index) => {
      const item = items.find((p) => p.name === String(index))
      if (!item?.value?.objectId) return undefined
      const own = props(item.value.objectId)
      const closure = {}
      const scopes = own.internalProperties?.find((p) => p.name === "[[Scopes]]")
      if (scopes?.value?.objectId) {
        for (const scope of props(scopes.value.objectId).result) {
          if (!scope.value?.description?.startsWith("Closure") || !scope.value.objectId) continue
          for (const binding of props(scope.value.objectId).result) {
            if (binding.name !== WRAPPED_NAME || binding.value?.type !== "function") continue
            closure[binding.name] = locationOf(props(binding.value.objectId).internalProperties)
          }
        }
      }
      return { url: locationOf(own.internalProperties), closure }
    })
  } finally {
    delete globalThis[key]
    try {
      call(session, "Runtime.releaseObjectGroup", { objectGroup: group })
      call(session, "Debugger.disable")
    } catch {
      // disconnecting releases everything anyway
    }
    session.disconnect()
  }
}

/** Owning package of one located tool, looking through the defineTool() wrapper. */
export function ownerPackage(location, packageOf) {
  if (!location) return undefined
  const outer = packageOf(location.url)
  if (outer === WRAPPER_PACKAGE && location.closure?.[WRAPPED_NAME]) {
    return packageOf(location.closure[WRAPPED_NAME]) ?? outer
  }
  return outer
}

/** Rows of the table: global tools owned by a DSH built-in package, sorted. */
export function builtinTools(definitions, locate, packageOf) {
  const candidates = definitions.filter((d) => typeof d?.name === "string" && typeof d.execute === "function")
  const located = locate(candidates.map((d) => d.execute))
  const rows = []
  candidates.forEach((definition, index) => {
    const pkg = ownerPackage(located[index], packageOf)
    if (pkg?.startsWith(BUILTIN_SCOPE)) rows.push({ name: definition.name, package: pkg })
  })
  return rows.sort((a, b) => a.package.localeCompare(b.package) || a.name.localeCompare(b.name))
}

/** Next row config after hiding or showing one tool for one preset; only `hideByPreset` changes. */
export function toggleHidden(config, preset, tool, hidden) {
  const next = structuredClone(config ?? {})
  const map = { ...(next.hideByPreset ?? {}) }
  const list = (Array.isArray(map[preset]) ? map[preset] : []).filter((name) => name !== tool)
  if (hidden) list.push(tool)
  if (list.length > 0) map[preset] = list
  else delete map[preset]
  // Dropping hideByPreset would switch a row with root `hide`/`deny` into the
  // other mode, so keep an empty map there.
  if (Object.keys(map).length > 0 || next.hide !== undefined || next.deny !== undefined) next.hideByPreset = map
  else delete next.hideByPreset
  return next
}

class ManagementError extends Error {}

/** Register the table's RPC routes (`/api/tool-deny.<endpoint>`); a no-op without `connection`. */
export function manage(ctx, config) {
  const logger = ctx.logger
  const entry = ctx.fiber?.entry
  const packageOf = createPackageResolver()
  const ownerCache = new WeakMap()
  let saves = Promise.resolve()

  const locateCached = (fns) => {
    const missing = fns.filter((fn) => !ownerCache.has(fn))
    if (missing.length > 0) {
      const found = locateFunctions(missing)
      missing.forEach((fn, i) => ownerCache.set(fn, found[i]))
    }
    return fns.map((fn) => ownerCache.get(fn))
  }

  const presets = async () => {
    const registry = ctx.get("agentPresets")
    if (!registry) return []
    return (await registry.list())
      .filter((p) => !p.broken)
      .map((p) => ({ id: p.id, ...(p.name ? { name: p.name } : {}) }))
  }

  /**
   * Built-in tools as each preset's agents inherit them: global tools plus the
   * preset composition's own registrations, which `restrict()` on an agent can
   * hide. Reads a preset revision lease and releases it right away.
   */
  const tools = async (presetList) => {
    const registry = ctx.get("tools")
    if (!registry) throw new ManagementError("The tool registry is not available.")
    const presetRegistry = ctx.get("agentPresets")
    const byName = new Map()
    const add = (definitions, presetId) => {
      for (const row of builtinTools(definitions, locateCached, packageOf)) {
        const current = byName.get(row.name) ?? { ...row, presets: [] }
        if (presetId === undefined) current.global = true
        else if (!current.presets.includes(presetId)) current.presets.push(presetId)
        byName.set(row.name, current)
      }
    }
    add([...registry.definitions()], undefined)
    for (const preset of presetList) {
      if (!presetRegistry) break
      let lease
      try {
        lease = await presetRegistry.acquireScope(preset.id)
        add([...registry.definitions(lease.key)], preset.id)
      } catch (error) {
        logger?.warn?.(`dsh-tool-deny: cannot read tools of preset "${preset.id}": ${error?.message ?? error}`)
      } finally {
        await lease?.[Symbol.asyncDispose]?.()
      }
    }
    return [...byName.values()]
      .map(({ global, ...row }) => ({ ...row, presets: global ? presetList.map((p) => p.id) : row.presets }))
      .sort((a, b) => a.package.localeCompare(b.package) || a.name.localeCompare(b.name))
  }

  const handlers = {
    state: async () => {
      const presetList = await presets()
      return {
        presets: presetList,
        tools: await tools(presetList),
        hideByPreset: config.hideByPreset ?? {},
        editable: entry !== undefined && ctx.get("configEditor") !== undefined,
      }
    },
    setHidden: async (payload) => {
      const { preset, tool, hidden } = payload
      if (typeof preset !== "string" || typeof tool !== "string" || typeof hidden !== "boolean") {
        throw new ManagementError("preset, tool and hidden are required.")
      }
      const presetList = await presets()
      if (!presetList.some((p) => p.id === preset)) throw new ManagementError(`Unknown preset "${preset}".`)
      // Showing again is always allowed, so a stale entry can be cleaned up.
      if (hidden && !(await tools(presetList)).some((t) => t.name === tool && t.presets.includes(preset))) {
        throw new ManagementError(`"${tool}" is not a built-in tool of preset "${preset}".`)
      }
      const editor = ctx.get("configEditor")
      if (entry === undefined || editor === undefined) {
        throw new ManagementError("Configuration cannot be saved in this profile.")
      }
      const saved = saves.then(() => editor.edit(entry, (current) => toggleHidden(current, preset, tool, hidden)))
      saves = saved.catch(() => {})
      await saved
      return { preset, tool, hidden }
    },
  }

  const dispatch = async (endpoint, payload) => {
    const handler = handlers[endpoint]
    if (!handler) return { ok: false, error: { code: "tool-deny/unknown-endpoint", message: `unknown endpoint ${endpoint}`, details: {} } }
    try {
      return { ok: true, value: await handler(payload && typeof payload === "object" ? payload : {}) }
    } catch (error) {
      if (!(error instanceof ManagementError)) logger?.warn?.(`dsh-tool-deny: ${endpoint} failed: ${error?.stack ?? error}`)
      return { ok: false, error: { code: "tool-deny/error", message: error?.message ?? String(error), details: {} } }
    }
  }

  const respond = (rpcId, result) =>
    new Response(JSON.stringify({ type: "server-response", rpcId, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })

  ctx.inject(["connection"], (rpcCtx) => {
    for (const endpoint of Object.keys(handlers)) {
      const method = `${ROUTE_PREFIX}${endpoint}`
      rpcCtx.effect(
        () =>
          rpcCtx.connection.fetch.register({
            path: `/api/${method}`,
            methods: ["POST"],
            requestBody: "buffered",
            fetch: async (request) => {
              const type = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase()
              if (type !== "application/json") return new Response("content type must be application/json", { status: 415 })
              let body
              try {
                body = await request.json()
              } catch {
                return new Response("body is not JSON", { status: 400 })
              }
              const rpcId = typeof body?.rpcId === "string" && body.rpcId ? body.rpcId : "invalid-request"
              if (body?.type !== "client-request" || body.method !== method) {
                return respond(rpcId, { ok: false, error: { code: "gateway/bad-request", message: "invalid client-request message", details: { issues: [] } } })
              }
              return respond(rpcId, await dispatch(endpoint, body.payload))
            },
          }),
        `dsh-tool-deny: /api/${method} route`,
      )
    }
  })
}
