// Browser-only stand-in for the Tauri shell, for testing the page in a normal browser. Never shipped.
(() => {
  const K = 'mockfs', fs = JSON.parse(localStorage.getItem(K) || '{}');
  const keep = () => localStorage.setItem(K, JSON.stringify(fs));
  const norm = p => p.replace(/\/+/g, '/').replace(/\/$/, '');
  const fixtures = {
    '/fixtures/zoom-call.vtt': 'WEBVTT\n\n1\n00:00:02.000 --> 00:00:04.000\nAlex: So tell me about your mornings.\n\n2\n00:00:05.000 --> 00:00:09.000\nPriya: I open the laptop before coffee.\n\n3\n00:00:09.500 --> 00:00:12.000\nPriya: Which is a mistake, honestly.\n',
    '/fixtures/otter-export.txt': 'Alex  0:03\nWhat does a good week look like?\n\nJun  0:09\nFew meetings.\nLong blocks of quiet.\n\nAlex  0:20\nAnd a bad one?\n\nJun  0:24\nMeetings about meetings.\n',
    '/fixtures/messy.txt': 'Notes from the call\nQ: Where do you work?\nR: Mostly home.\nMy view is simple: home is fine.\nQ: Why?\n[0:40] R: It is quiet.\n',
  };
  Object.assign(fs, fixtures);
  const T = window.__TAURI__ = {
    core: {
      convertFileSrc: p => 'mock-asset://' + p,
      invoke: async (cmd, a) => {
        const p = a && a.path && norm(a.path);
        if (cmd === 'read_text') { if (!(p in fs)) throw 'No such file: ' + p; return fs[p]; }
        if (cmd === 'write_text') { fs[p] = a.text; keep(); return; }
        if (cmd === 'exists') return p in fs || Object.keys(fs).some(k => k.startsWith(p + '/'));
        if (cmd === 'make_dir') { fs[p + '/.dir'] = ''; keep(); return; }
        if (cmd === 'list_dir') { const out = new Map(); for (const k of Object.keys(fs)) if (k.startsWith(p + '/')) { const rest = k.slice(p.length + 1).split('/'); if (rest[0] !== '.dir') out.set(rest[0], rest.length > 1); } return [...out]; }
        if (cmd === 'docx_text') throw 'docx is read by the desktop app only';
        throw 'unknown command ' + cmd;
      },
    },
    dialog: {
      open: async o => o.directory ? (window.MOCK_DIR || '/mock/Project') : (window.MOCK_FILES || Object.keys(fixtures)),
      save: async o => '/mock/exports/' + o.defaultPath,
    },
    path: { appDataDir: async () => '/mock/appdata' },
  };
})();
// #sample: open the sample project on load, tour off (used by dev/shots.sh)
if (location.hash.startsWith('#sample')) {
  const pr = JSON.parse(localStorage.getItem('recode-prefs') || '{}'); pr.tour = true; pr.view = location.hash.split('-')[1] || 'code'; pr.theme = location.hash.split('-')[2] || 'auto';
  localStorage.setItem('recode-prefs', JSON.stringify(pr));
  addEventListener('load', () => setTimeout(() => { if (!localStorage.getItem('recode-project')) openSample(); }, 300));
}
