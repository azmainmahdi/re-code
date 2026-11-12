// Run: node tests/transcript.test.js
const assert = require('assert');
const TX = require('../build/transcript.js');

// Re;Code format: title, sections, timestamps, a continuation line, a one-off colon line
let p = TX.read(`# Cafés
## Getting started
[0:05] Interviewer: How often?
[0:11] Sam: Most weekdays.
It sounds odd: silence distracts me.
## Choosing
[1:02] Interviewer: How do you pick?
[1:06] Sam: Plugs first.`);
assert.equal(p.title, 'Cafés');
assert.deepEqual(p.sections.map(s => [s.title, s.at]), [['Getting started', 0], ['Choosing', 2]]);
assert.equal(p.turns.length, 4);
assert.equal(p.turns[1].text, 'Most weekdays.\nIt sounds odd: silence distracts me.');
assert.ok(p.timed);
assert.deepEqual(p.interviewer, ['Interviewer']);
assert.equal(TX.read(TX.write(p)).turns.length, 4, 'write() round-trips');

// no timestamps, case variants, text before first speaker, time going backwards
p = TX.read(`Preamble line
Noor: one
interviewer: two?
Interviewer: three?
Noor: four`);
assert.equal(p.timed, false);
assert.equal(p.turns[0].spk, 'Unknown');
assert.equal(p.turns.filter(t => t.spk === 'interviewer').length, 2);
assert.ok(p.warnings.some(w => w.includes('same speaker')));
assert.ok(TX.read('[1:00] A: x\n[0:30] B: y').warnings.some(w => w.includes('backwards')));

// old bold form, hour timestamps and "Name (0:05): text"
p = TX.read('**[1:02:03] Lee:** hello\n**[~1:02:09] Kim:** hi\nRina (0:05): yes\nRina (0:09): ok');
assert.deepEqual(p.turns.map(t => [t.t, t.spk]), [['1:02:03', 'Lee'], ['1:02:09', 'Kim'], ['0:05', 'Rina'], ['0:09', 'Rina']]);

// VTT from Zoom (Name: text) and Teams (<v Name>), merged per speaker
p = TX.read(`WEBVTT

1
00:00:01.000 --> 00:00:03.000
Sam: Hello there

2
00:00:03.500 --> 00:00:05.000
Sam: and welcome

3
00:01:05.000 --> 00:01:07.000
<v Noor Ahmed>Thanks</v>`, 'vtt');
assert.deepEqual(p.turns.map(t => [t.t, t.spk, t.text]), [['0:01', 'Sam', 'Hello there and welcome'], ['1:05', 'Noor Ahmed', 'Thanks']]);

// SRT with no speakers
p = TX.read('1\n00:00:01,000 --> 00:00:02,000\nhello\n\n2\n00:00:02,500 --> 00:00:04,000\nworld', 'srt');
assert.equal(p.turns[0].spk, 'Unknown');
assert.ok(p.warnings.length);

// Otter export
p = TX.read('Sam  0:05\nHello there.\n\nNoor  0:12\nHi.\nSecond line.');
assert.deepEqual(p.turns.map(t => [t.t, t.spk, t.text]), [['0:05', 'Sam', 'Hello there.'], ['0:12', 'Noor', 'Hi.\nSecond line.']]);

// empty section and empty file
assert.ok(TX.read('## A\n## B\nX: y\nX: z').warnings.some(w => w.includes('"A" has no turns')));
assert.ok(TX.read('').warnings.some(w => w.includes('No turns')));
console.log('transcript tests passed');
