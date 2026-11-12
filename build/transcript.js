/* ---------- transcript reader: turns any supported file into speakers, sections and turns, by rules only ----------
   The Re;Code format (docs/transcript-format.md):
     # Title                         optional
     ## Section name                 optional, starts a section
     [0:12] Speaker: what they said  timestamp optional (m:ss or h:mm:ss)
     a line with no speaker joins the turn above
   Also reads .vtt and .srt subtitles (Zoom, Teams, most transcription tools) and Otter-style "Name  0:05" exports. */
const TX = (() => {
  const TIME = String.raw`~?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?`;
  const KNOWN = /^(interviewer|interviewee|int|i|q|a|r|moderator|researcher|facilitator|participant|respondent)$/i;
  const ASKER = /^(interviewer|int|i|q|moderator|researcher|facilitator)$/i;

  const cleanTime = t => {           // "00:01:05.200" -> "1:05", "~0:12" -> "0:12"
    if (!t) return '';
    const p = t.replace('~', '').replace(/[.,]\d+$/, '').split(':').map(Number);
    let s = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
  };
  const secs = t => { if (!t) return null; const p = t.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };

  // one line -> {t, spk, text} if it looks like a turn start, else null
  const LINE = [
    new RegExp(String.raw`^\*{0,2}[\[(]?(${TIME})[\])]?\*{0,2}\s+([^:\[\]()]{1,40}?)\s*:\*{0,2}\s*(.*)$`), // [0:12] Sam: text
    new RegExp(String.raw`^\*{0,2}([^:\[\]()]{1,40}?)\s*[\[(](${TIME})[\])]\s*:\*{0,2}\s*(.*)$`),           // Sam (0:12): text
    /^\*{0,2}([^:\[\]()]{1,40}?)\s*:\*{0,2}\s+(.*)$/,                                                      // Sam: text
  ];
  function turnStart(line) {
    let m;
    if ((m = line.match(LINE[0]))) return { t: m[1], spk: m[2], text: m[3] };
    if ((m = line.match(LINE[1]))) return { t: m[2], spk: m[1], text: m[3] };
    if ((m = line.match(LINE[2]))) return { t: '', spk: m[1], text: m[2] };
    return null;
  }
  const nameOK = s => s && s.split(/\s+/).length <= 4 && !/^\d+$/.test(s) && !/[.?!,;"]$/.test(s) && !/^(https?|note|tip|eg|e\.g|ie|i\.e)$/i.test(s);

  /* ---- subtitle files: one turn per run of cues by the same speaker ---- */
  function fromSubtitles(text) {
    const out = [], warn = [];
    const blocks = text.replace(/^WEBVTT[^\n]*\n/, '').split(/\n\s*\n/);
    for (const b of blocks) {
      const lines = b.split('\n').map(l => l.trim()).filter(Boolean);
      const ti = lines.findIndex(l => l.includes('-->'));
      if (ti < 0) continue;                                   // NOTE, STYLE, or header blocks
      const start = cleanTime(lines[ti].split('-->')[0].trim());
      let body = lines.slice(ti + 1).join(' ');
      let spk = '';
      const v = body.match(/^<v(?:\.[^ >]+)?\s+([^>]+)>/);       // Teams: <v Name>text</v>
      if (v) spk = v[1].trim();
      body = body.replace(/<[^>]+>/g, '').trim();
      if (!spk) { const m = body.match(/^([^:]{1,40}?):\s+(.*)$/); if (m && nameOK(m[1])) { spk = m[1]; body = m[2]; } } // Zoom: Name: text
      if (!body) continue;
      const last = out.at(-1);
      if (last && last.spk === (spk || last.spk) && (spk || !last.named)) last.text += ' ' + body;
      else out.push({ t: start, spk: spk || 'Unknown', named: !!spk, text: body });
    }
    if (out.some(t => !t.named)) warn.push('Some captions had no speaker name, so they are marked "Unknown". Rename the speaker after import.');
    return { lines: out.map(t => `[${t.t}] ${t.spk}: ${t.text}`), warn };
  }

  /* ---- Otter style: "Name  0:05" on its own line, then the words ---- */
  const OTTER = new RegExp(String.raw`^(.{1,40}?)\s+(${TIME})\s*$`);
  function fromOtter(lines) {
    const out = [];
    for (const l of lines) {
      const m = l.match(OTTER);
      if (m && nameOK(m[1].trim())) out.push(`[${cleanTime(m[2])}] ${m[1].trim()}:`);
      else if (l.trim() && out.length) out[out.length - 1] += (out[out.length - 1].endsWith(':') ? ' ' : '\n') + l.trim();
      else if (l.trim()) out.push(l);
    }
    return out;
  }

  function read(raw, ext = '') {
    let text = String(raw).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    const warn = [];
    let lines;
    ext = ext.toLowerCase().replace(/^\./, '');
    if (ext === 'vtt' || ext === 'srt' || /^WEBVTT/.test(text) || /^\d+\n\d{2}:\d{2}:\d{2}[,.]\d{3} -->/.test(text.trim())) {
      const s = fromSubtitles(text); lines = s.lines; warn.push(...s.warn);
    } else {
      lines = text.split('\n');
      if (lines.filter(l => OTTER.test(l) && !turnStart(l)).length >= 2) lines = fromOtter(lines).join("\n").split("\n");
    }

    // pass 1: who looks like a speaker, and how often
    const seen = {};
    for (const l of lines) { const m = turnStart(l.trim()); if (m && nameOK(m.spk.trim())) seen[m.spk.trim()] = (seen[m.spk.trim()] || 0) + 1; }
    const fold = {};                                  // "sam" and "Sam" are one person: first spelling wins
    for (const n of Object.keys(seen)) { const k = n.toLowerCase(); if (!(k in fold)) fold[k] = n; else if (fold[k] !== n) warn.push(`"${n}" and "${fold[k]}" were treated as the same speaker.`); }

    // pass 2: build turns and sections
    let title = '', lastT = -1, loose = 0;
    const turns = [], sections = [], once = new Set();
    lines.forEach((line0, li) => {
      const line = line0.trim();
      if (!line || /^(-{3,}|\*{3,}|_{3,})$/.test(line)) return;
      const h = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
      if (h) {
        if (h[1].length === 1 && !title && !turns.length && !sections.length) title = h[2];
        else sections.push({ title: h[2].replace(/\*+/g, '').trim(), at: turns.length, line: li + 1 });
        return;
      }
      const m = turnStart(line);
      const spk = m && m.spk.trim();
      const real = m && nameOK(spk) && (m.t || seen[spk] >= 2 || KNOWN.test(spk) || fold[spk.toLowerCase()] !== spk);
      if (real) {
        const t = cleanTime(m.t), s = secs(t);
        if (s != null && s < lastT) warn.push(`Time goes backwards at line ${li + 1} (${t}).`);
        if (s != null) lastT = s;
        turns.push({ t, spk: fold[spk.toLowerCase()] || spk, text: m.text.trim(), line: li + 1 });
        return;
      }
      if (m && nameOK(spk) && !once.has(spk)) { once.add(spk); warn.push(`Line ${li + 1} starts with "${spk}:" but that name appears only once, so it was kept as text.`); }
      if (turns.length) { const tn = turns.at(-1); tn.text += (tn.text ? '\n' : '') + line; }
      else { turns.push({ t: '', spk: 'Unknown', text: line, line: li + 1 }); loose++; }
    });
    if (loose) warn.push('Text before the first speaker was kept under "Unknown".');
    const leftovers = turns.filter(t => !t.text.trim()).length;
    if (leftovers) warn.push(`${leftovers} turn${leftovers > 1 ? 's have' : ' has'} a speaker but no words.`);
    sections.forEach((s, i) => { if ((sections[i + 1]?.at ?? turns.length) === s.at) warn.push(`Section "${s.title}" has no turns.`); });
    const timed = turns.length > 0 && turns.filter(t => t.t).length >= turns.length / 2;
    if (timed && turns.some(t => !t.t)) warn.push(`${turns.filter(t => !t.t).length} turns have no timestamp.`);
    const speakers = {};
    turns.forEach(t => speakers[t.spk] = (speakers[t.spk] || 0) + 1);
    if (!turns.length) warn.push('No turns were found in this file.');
    else if (Object.keys(speakers).length === 1) warn.push('Only one speaker was found. Check the file uses "Name: text" lines.');
    return { title, turns, sections, speakers, timed, warnings: warn, interviewer: guessAsker(turns, speakers) };
  }

  function guessAsker(turns, speakers) {
    const names = Object.keys(speakers);
    const named = names.filter(n => ASKER.test(n));
    if (named.length) return named;
    let best = null, score = -1;
    for (const n of names) {          // the one who asks most questions per turn
      const ts = turns.filter(t => t.spk === n), q = ts.filter(t => /\?\s*$/.test(t.text)).length / (ts.length || 1);
      if (q > score) { score = q; best = n; }
    }
    return best && names.length > 1 ? [best] : [];
  }

  // parsed -> the Re;Code format, which is what a project stores
  function write(p) {
    const out = [];
    if (p.title) out.push('# ' + p.title, '');
    let si = 0;
    p.turns.forEach((t, i) => {
      while (si < p.sections.length && p.sections[si].at === i) out.push('', '## ' + p.sections[si++].title);
      out.push(`${t.t ? `[${t.t}] ` : ''}${t.spk}: ${t.text}`);
    });
    while (si < p.sections.length) out.push('', '## ' + p.sections[si++].title);
    return out.join('\n').trim() + '\n';
  }

  return { read, write, secs, cleanTime };
})();
if (typeof module !== 'undefined') module.exports = TX;
