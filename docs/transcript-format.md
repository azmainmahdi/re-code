# Transcript format

Re;Code reads speakers, sections and times by simple rules. No AI is involved.

```
# Sam (interview 3)
## Getting started
[0:05] Interviewer: How often do you work from cafés?
[0:11] Sam: Most weekdays.
It sounds odd, but silence makes me check my phone more.
```

| Line | Meaning |
|---|---|
| `# Title` | Optional name for the transcript. |
| `## Section` | Starts a section. Optional. Sections with the same name can be compared across people. |
| `Speaker: text` | Starts a turn. A time in front is optional: `[0:05]`, `0:05`, `(1:02:03)`. `Sam (0:05): text` also works. |
| any other line | Joins the turn above, so long answers can run over several paragraphs. |

Edge cases:
- A name must appear at least twice, or have a time, or be a common label (Interviewer, I, Q, R), to count as a speaker. Otherwise "My view is simple: no" stays text, and you are told.
- "sam" and "Sam" are one speaker. Text before the first speaker is kept under "Unknown".
- Time going backwards, empty sections and turns without words are listed before import.
- Subtitles (.vtt, .srt) from Zoom and Teams, Otter text exports ("Name  0:05" lines) and Word files are converted to this format on import.

You see what was found, who asks the questions, and any warnings before anything is added. You can rename speakers there.
