// Fork addition: "Built-in tools by preset" table on this bundle's page in Plugins.
window.__ModuleLoader__.load({
  id: 'dsh-tool-deny',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useCallback } = React;

    const DICT = {
      en: {
        summary: 'Hide built-in tools per agent preset.',
        title: 'Built-in tools by preset',
        intro: 'Green: the preset sees the tool. Red: it is hidden through hideByPreset. Click a dot to change it. Changes apply to new and running sessions of that preset.',
        refresh: 'Refresh',
        loading: 'Loading…',
        tool: 'Tool',
        noPresets: 'No agent presets were found.',
        noTools: 'No built-in tools were found.',
        readOnly: 'This profile cannot save configuration, so the table is read-only.',
        hideTitle: 'Hide tool',
        showTitle: 'Show tool',
        hideMsg: 'Hide {tool} from the {preset} preset?',
        showMsg: 'Show {tool} to the {preset} preset again?',
        hide: 'Hide',
        show: 'Show',
        cancel: 'Cancel',
        working: 'Saving…',
        shown: 'Shown',
        notInPreset: 'Not in this preset',
        hidden: 'Hidden',
        cellLabel: '{tool} in {preset}: {state}',
        savedHide: 'Hid {tool} from {preset}.',
        savedShow: 'Showed {tool} to {preset}.',
        requestFailed: 'Request failed.',
        dismiss: 'Dismiss',
        extra: 'Also hidden, not a built-in tool: {names}',
      },
      ko: {
        summary: '에이전트 프리셋별로 내장 도구를 숨깁니다.',
        title: '프리셋별 내장 도구',
        intro: '초록색은 프리셋에서 도구를 사용할 수 있는 상태, 빨간색은 hideByPreset으로 숨긴 상태입니다. 점을 클릭하면 바꿀 수 있으며, 해당 프리셋의 새 세션과 실행 중인 세션에 적용됩니다.',
        refresh: '새로고침',
        loading: '불러오는 중…',
        tool: '도구',
        noPresets: '에이전트 프리셋이 없습니다.',
        noTools: '내장 도구가 없습니다.',
        readOnly: '이 프로필은 설정을 저장할 수 없어 표를 읽기 전용으로 표시합니다.',
        hideTitle: '도구 숨기기',
        showTitle: '도구 표시',
        hideMsg: '{preset} 프리셋에서 {tool}을(를) 숨길까요?',
        showMsg: '{preset} 프리셋에 {tool}을(를) 다시 표시할까요?',
        hide: '숨기기',
        show: '표시',
        cancel: '취소',
        working: '저장 중…',
        shown: '표시됨',
        notInPreset: '이 프리셋에 없음',
        hidden: '숨김',
        cellLabel: '{preset}의 {tool}: {state}',
        savedHide: '{preset}에서 {tool}을(를) 숨겼습니다.',
        savedShow: '{preset}에 {tool}을(를) 다시 표시했습니다.',
        requestFailed: '요청에 실패했습니다.',
        dismiss: '닫기',
        extra: '내장 도구가 아닌 항목도 숨겨져 있습니다: {names}',
      },
      zh: {
        summary: '按智能体预设隐藏内置工具。',
        title: '按预设管理内置工具',
        intro: '绿色：预设可见该工具。红色：已通过 hideByPreset 隐藏。点击圆点即可切换，变更作用于该预设的新会话和运行中的会话。',
        refresh: '刷新',
        loading: '加载中…',
        tool: '工具',
        noPresets: '未找到智能体预设。',
        noTools: '未找到内置工具。',
        readOnly: '此配置无法保存设置，表格为只读。',
        hideTitle: '隐藏工具',
        showTitle: '显示工具',
        hideMsg: '要在 {preset} 预设中隐藏 {tool} 吗？',
        showMsg: '要在 {preset} 预设中重新显示 {tool} 吗？',
        hide: '隐藏',
        show: '显示',
        cancel: '取消',
        working: '保存中…',
        shown: '可见',
        notInPreset: '此预设中没有',
        hidden: '已隐藏',
        cellLabel: '{preset} 中的 {tool}：{state}',
        savedHide: '已在 {preset} 中隐藏 {tool}。',
        savedShow: '已在 {preset} 中显示 {tool}。',
        requestFailed: '请求失败。',
        dismiss: '关闭',
        extra: '另有非内置工具被隐藏：{names}',
      },
    };

    function fallbackLang() {
      let lang = '';
      try { lang = String((typeof navigator !== 'undefined' && navigator.language) || '').toLowerCase(); } catch (e) { lang = ''; }
      if (lang.indexOf('ko') === 0) return 'ko';
      if (lang.indexOf('zh') === 0) return 'zh';
      return 'en';
    }

    function interpolate(str, vars) {
      if (!vars) return str;
      return str.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) && vars[k] != null ? String(vars[k]) : m));
    }

    function makeT(bound) {
      return (key, vars) => {
        let s = null;
        if (typeof bound === 'function') {
          try {
            const v = bound(key);
            if (typeof v === 'string' && v && v !== key) s = v;
          } catch (e) { s = null; }
        }
        if (s === null) {
          const d = DICT[fallbackLang()] || DICT.en;
          s = d[key] != null ? d[key] : (DICT.en[key] != null ? DICT.en[key] : key);
        }
        return interpolate(s, vars);
      };
    }

    const CSS = `
.dtd-root{width:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;padding:4px 0 16px;color:var(--dsw-alias-label-primary,#1d1d1f);font:var(--dsw-font-s-14,400 14px/20px system-ui,sans-serif);}
.dtd-root button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:2px;}
.dtd-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.dtd-title{font:var(--dsw-font-s-strong-14,600 14px/20px system-ui,sans-serif);}
.dtd-intro{margin-top:2px;font:var(--dsw-font-xs-13,400 13px/18px system-ui,sans-serif);color:var(--dsw-alias-label-secondary,#6b6b6b);}
.dtd-btn{height:30px;padding:0 12px;border-radius:8px;border:0.5px solid var(--dsw-alias-border-l2,#d0d0d0);background:transparent;color:var(--dsw-alias-label-primary,#1d1d1f);font:inherit;cursor:pointer;white-space:nowrap;flex:none;}
.dtd-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#f2f2f2);}
.dtd-btn:disabled{opacity:.5;cursor:default;}
.dtd-btn-primary{background:var(--dsw-alias-brand-primary,#4d6bfe);border-color:transparent;color:var(--dsw-alias-bg-layer-1,#fff);}
.dtd-btn-primary:hover:not(:disabled){background:var(--dsw-alias-brand-primary,#4d6bfe);filter:brightness(1.08);}
.dtd-wrap{overflow:auto;max-height:70vh;border:0.5px solid var(--dsw-alias-border-l1,#e5e5e5);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);}
.dtd-table{border-collapse:separate;border-spacing:0;width:100%;font-size:13px;}
.dtd-table th,.dtd-table td{padding:6px 10px;border-bottom:0.5px solid var(--dsw-alias-border-l1,#e5e5e5);white-space:nowrap;}
.dtd-table thead th{position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-layer-2,#f2f2f7);font-weight:500;font-size:12px;color:var(--dsw-alias-label-secondary,#6b6b6b);text-align:center;}
.dtd-table th.dtd-rowhead{position:sticky;left:0;z-index:1;background:var(--dsw-alias-bg-layer-1,#fff);text-align:left;font-weight:400;}
.dtd-table thead th.dtd-rowhead{z-index:3;background:var(--dsw-alias-bg-layer-2,#f2f2f7);}
.dtd-name{font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace);color:var(--dsw-alias-label-primary,#1d1d1f);}
.dtd-pkg{display:block;font-size:11px;line-height:14px;color:var(--dsw-alias-label-tertiary,#999);}
.dtd-table td{text-align:center;}
.dtd-table tbody tr:hover th.dtd-rowhead,.dtd-table tbody tr:hover td{background:var(--dsw-alias-interactive-bg-hover,#f2f2f2);}
.dtd-dot{width:28px;height:28px;border:none;border-radius:50%;background:transparent;padding:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;}
.dtd-dot:disabled{cursor:default;opacity:.6;}
.dtd-dot::after{content:"";width:12px;height:12px;border-radius:50%;background:currentColor;}
.dtd-dot:hover:not(:disabled)::after{width:14px;height:14px;}
.dtd-na{color:var(--dsw-alias-label-tertiary,#999);}
.dtd-on{color:var(--dsw-alias-state-success-primary,#1e9e5a);}
.dtd-off{color:var(--dsw-alias-state-error-primary,#d93025);}
.dtd-banner{padding:8px 12px;border-radius:8px;font-size:13px;line-height:18px;border:0.5px solid var(--dsw-alias-border-l2,#d0d0d0);background:var(--dsw-alias-bg-layer-2,#f2f2f7);display:flex;gap:8px;align-items:flex-start;}
.dtd-banner-err{color:var(--dsw-alias-state-error-primary,#d93025);border-color:var(--dsw-alias-state-error-primary,#d93025);}
.dtd-banner span{flex:1;min-width:0;word-break:break-word;}
.dtd-x{background:none;border:none;padding:0 4px;cursor:pointer;color:inherit;font-size:16px;line-height:18px;}
.dtd-empty{padding:16px;text-align:center;color:var(--dsw-alias-label-tertiary,#999);font-size:13px;border:0.5px dashed var(--dsw-alias-border-l2,#d0d0d0);border-radius:12px;}
.dtd-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;}
.dtd-modal{width:100%;max-width:440px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1d1d1f);border:0.5px solid var(--dsw-alias-border-l1,#e5e5e5);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px;outline:none;box-shadow:0 8px 32px rgba(0,0,0,.18);font:var(--dsw-font-s-14,400 14px/20px system-ui,sans-serif);}
.dtd-modal-title{font-size:16px;line-height:22px;font-weight:600;}
.dtd-modal p{margin:0;word-break:break-word;}
.dtd-actions{display:flex;justify-content:flex-end;gap:8px;}
`;

    function Banner(p) {
      return h('div', { className: 'dtd-banner' + (p.error ? ' dtd-banner-err' : ''), role: p.error ? 'alert' : 'status' },
        h('span', null, p.text),
        p.onClose ? h('button', { type: 'button', className: 'dtd-x', 'aria-label': p.t('dismiss'), onClick: p.onClose }, '×') : null);
    }

    function ConfirmDialog(p) {
      const t = p.t;
      const cardRef = useRef(null);
      const confirmRef = useRef(null);
      useEffect(() => { (confirmRef.current || cardRef.current)?.focus(); }, []);
      const onKeyDown = (e) => {
        if (e.key === 'Escape' && !p.working) { e.stopPropagation(); p.onCancel(); }
        if (e.key === 'Tab') {
          const items = cardRef.current ? [...cardRef.current.querySelectorAll('button:not(:disabled)')] : [];
          if (items.length === 0) return;
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      };
      const hiding = p.target.hidden;
      return h('div', { className: 'dtd-overlay', onKeyDown: onKeyDown, onClick: (e) => { if (e.target === e.currentTarget && !p.working) p.onCancel(); } },
        h('div', { className: 'dtd-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dtd-dlg-title', 'aria-describedby': 'dtd-dlg-msg', ref: cardRef, tabIndex: -1 },
          h('div', { className: 'dtd-modal-title', id: 'dtd-dlg-title' }, hiding ? t('hideTitle') : t('showTitle')),
          h('p', { id: 'dtd-dlg-msg' }, t(hiding ? 'hideMsg' : 'showMsg', { tool: p.target.tool, preset: p.target.presetLabel })),
          p.error ? h(Banner, { t: t, error: true, text: p.error }) : null,
          h('div', { className: 'dtd-actions' },
            h('button', { type: 'button', className: 'dtd-btn', onClick: p.onCancel, disabled: p.working }, t('cancel')),
            h('button', { type: 'button', className: 'dtd-btn dtd-btn-primary', ref: confirmRef, onClick: p.onConfirm, disabled: p.working },
              p.working ? t('working') : (hiding ? t('hide') : t('show'))))));
    }

    function Table(p) {
      const t = p.t;
      const [state, setState] = useState(null);
      const [loadError, setLoadError] = useState(null);
      const [loading, setLoading] = useState(false);
      const [notice, setNotice] = useState(null);
      const [target, setTarget] = useState(null);
      const [working, setWorking] = useState(false);
      const [dlgError, setDlgError] = useState(null);
      const mounted = useRef(true);
      useEffect(() => () => { mounted.current = false; }, []);

      const load = useCallback(async () => {
        setLoading(true);
        try {
          const value = await p.rpc('state');
          if (!mounted.current) return;
          setState(value);
          setLoadError(null);
        } catch (e) {
          if (mounted.current) setLoadError(e.message || t('requestFailed'));
        } finally {
          if (mounted.current) setLoading(false);
        }
      }, [p.rpc]);
      useEffect(() => { load(); }, [load]);

      const confirm = async () => {
        const target0 = target;
        setWorking(true);
        setDlgError(null);
        try {
          await p.rpc('setHidden', { preset: target0.preset, tool: target0.tool, hidden: target0.hidden });
          if (!mounted.current) return;
          setTarget(null);
          setNotice(t(target0.hidden ? 'savedHide' : 'savedShow', { tool: target0.tool, preset: target0.presetLabel }));
          // The plugin restarts after the save; its routes come back with it.
          for (let i = 0; i < 5 && mounted.current; i++) {
            try { const value = await p.rpc('state'); if (mounted.current) setState(value); break; }
            catch (e) { await new Promise((r) => setTimeout(r, 300)); }
          }
        } catch (e) {
          if (mounted.current) setDlgError(e.message || t('requestFailed'));
        } finally {
          if (mounted.current) setWorking(false);
        }
      };

      let body;
      if (!state) {
        body = loadError ? null : h('div', { className: 'dtd-empty' }, t('loading'));
      } else if (state.presets.length === 0) {
        body = h('div', { className: 'dtd-empty' }, t('noPresets'));
      } else if (state.tools.length === 0) {
        body = h('div', { className: 'dtd-empty' }, t('noTools'));
      } else {
        const hiddenMap = state.hideByPreset || {};
        const isHidden = (preset, tool) => Array.isArray(hiddenMap[preset]) && hiddenMap[preset].indexOf(tool) !== -1;
        const label = (preset) => preset.name || preset.id;
        const builtin = new Set(state.tools.map((x) => x.name));
        const extra = [...new Set(Object.values(hiddenMap).flat().filter((n) => typeof n === 'string' && !builtin.has(n)))];
        body = h(React.Fragment, null,
          h('div', { className: 'dtd-wrap' },
            h('table', { className: 'dtd-table' },
              h('thead', null, h('tr', null,
                h('th', { className: 'dtd-rowhead', scope: 'col' }, t('tool')),
                ...state.presets.map((preset) => h('th', { key: preset.id, scope: 'col', title: preset.id }, label(preset))))),
              h('tbody', null, ...state.tools.map((tool) => h('tr', { key: tool.name },
                h('th', { className: 'dtd-rowhead', scope: 'row' },
                  h('span', { className: 'dtd-name' }, tool.name),
                  h('span', { className: 'dtd-pkg' }, tool.package)),
                ...state.presets.map((preset) => {
                  const hidden = isHidden(preset.id, tool.name);
                  if (!hidden && Array.isArray(tool.presets) && tool.presets.indexOf(preset.id) === -1) {
                    return h('td', { key: preset.id },
                      h('span', { className: 'dtd-na', title: t('notInPreset'), 'aria-label': t('cellLabel', { tool: tool.name, preset: label(preset), state: t('notInPreset') }) }, '–'));
                  }
                  const stateText = hidden ? t('hidden') : t('shown');
                  return h('td', { key: preset.id },
                    h('button', {
                      type: 'button',
                      className: 'dtd-dot ' + (hidden ? 'dtd-off' : 'dtd-on'),
                      'aria-label': t('cellLabel', { tool: tool.name, preset: label(preset), state: stateText }),
                      title: stateText,
                      disabled: !state.editable || working,
                      onClick: () => { setDlgError(null); setTarget({ preset: preset.id, presetLabel: label(preset), tool: tool.name, hidden: !hidden }); },
                    }));
                })))))),
          extra.length ? h('div', { className: 'dtd-intro' }, t('extra', { names: extra.join(', ') })) : null);
      }

      return h('div', { className: 'dtd-root' },
        h('div', { className: 'dtd-head' },
          h('div', null,
            h('div', { className: 'dtd-title' }, t('title')),
            h('div', { className: 'dtd-intro' }, t('intro'))),
          h('button', { type: 'button', className: 'dtd-btn', disabled: loading || working, onClick: load }, loading ? t('loading') : t('refresh'))),
        state && !state.editable ? h(Banner, { t: t, text: t('readOnly') }) : null,
        notice ? h(Banner, { t: t, text: notice, onClose: () => setNotice(null) }) : null,
        loadError ? h(Banner, { t: t, error: true, text: loadError }) : null,
        body,
        target ? h(ConfirmDialog, { t: t, target: target, working: working, error: dlgError, onCancel: () => setTarget(null), onConfirm: confirm }) : null);
    }

    return {
      inject: ['slots', 'connection', 'locale'],
      apply(ctx) {
        try { ctx.effect(() => ctx.locale.register('dsh-tool-deny', DICT)); } catch (e) { /* optional */ }
        const bound = typeof ctx.locale?.bind === 'function' ? ctx.locale.bind('dsh-tool-deny') : null;
        const t = makeT(bound);
        const rpc = async (endpoint, payload = {}) => {
          const r = await ctx.connection.rpc.call('/api', 'tool-deny.' + endpoint, payload);
          if (r && r.ok) return r.value;
          throw new Error((r && r.error && r.error.message) || t('requestFailed'));
        };
        ctx.effect(() => {
          const el = document.createElement('style');
          el.textContent = CSS;
          document.head.appendChild(el);
          return () => el.remove();
        });
        ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
          name: 'plugins.bundle.config',
          key: 'dsh-tool-deny',
        }, (props) => (props && props.view === 'summary') ? t('summary') : h(Table, { rpc: rpc, t: t })));
      },
    };
  },
});
