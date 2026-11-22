# dsh-tool-deny

DeepSeek Harness plugin that hides or refuses tools per agent. See `README.md` for options.

- `index.js` is the plugin. `test/fake-model.mjs` is the fake model for dsh testing, covered by `npm test`.
- Run `npm test` and `node --check index.js` after changes.
- Test real dsh behavior only in a throwaway `DSH_HOME`, never a live instance or home directory.
- Fork (now-actuating): `cordis.patch.yml` inserts one root row `dsh-tool-deny` with an empty config for the management table (`lib/management.js`, `client/client.js`). Keep that config empty; hide lists belong in each user's own profile patch.
- Fork versioning: upstream SemVer + `+mod.N`; provenance in `package.json` `dsh.versioning`. Merge upstream changes, keep the fork additions.
- Update `README.md` when options or behavior change, and mirror it in `README.zh.md` so the English and Chinese READMEs stay in sync.
- If `AGENTS.local.md` exists, follow it for local setup and full test steps.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for now-actuating/dsh-tool-deny. See `docs/agents/issue-tracker.md`.

### Triage labels

The default five triage labels (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` and `docs/adr/`. See `docs/agents/domain.md`.
