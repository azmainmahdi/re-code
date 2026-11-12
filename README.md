# Re;Code

Re;Code is a free desktop app for reflexive thematic analysis. It runs on Mac and Windows, and your transcripts stay on your computer.

> **Beta.** It works, but some edges are still rough and things will change. I'm aiming for a first full release in 2027.

![Re;Code: a transcript with codes beside their quotes](docs/transcript-day.png)

I made it while coding the interviews for my own study. NVivo, ATLAS.ti and MAXQDA cost money, and I wanted something free and modern that follows how reflexive thematic analysis goes: read first, code in rounds, then build themes.

## What you can do with it

Import transcripts from Word, plain text, Markdown, or subtitle files (.vtt, .srt) from Zoom, Teams and Otter. Re;Code works out the speakers and sections and shows you what it found before anything goes in.

Read a transcript first, then code it in rounds. Select some words to code them. Each code sits next to its quote, and round 1 and round 2 codes look different, so you can tell them apart later.

Sort codes into themes on a board, or move them around on a free canvas. For each theme you can see whose interviews fit it and whose go against it.

Pick a section of the interview, say "Getting started", and read everyone's answers side by side.

Keep a reflexive diary. Each entry is dated and tied to the transcript you had open.

If you have the recording, link it and click a timestamp to play from that point. Transcripts without timestamps work too.

Export coded quotes, themes and the diary as CSV.

There's a Day and a Night look, reading fonts that handle Bangla as well as Latin script, and keyboard shortcuts for most things.

![Codes, with their themes and who has them](docs/codes-day.png)
![Themes board](docs/themes-day.png)
![One section, compared across people, at night](docs/across-night.png)

## Where your data lives

A project is a folder on your computer. It holds your transcripts and a `project.json` file with your coding. There's no account and no server, and nothing is sent anywhere. It works offline, and you can tell your ethics board exactly where the data is kept.

## Install

Download the latest installer from [Releases](../../releases):

- Mac: `aarch64.dmg` for Apple Silicon (M1 and later), `x64.dmg` for Intel.
- Windows: the `.msi` or the `-setup.exe`.

The installers aren't signed yet, so your computer will warn you the first time you open the app.

- On a Mac, open the app once, then go to System Settings → Privacy & Security and click **Open Anyway**.
- On Windows, when you see "Windows protected your PC", click **More info**, then **Run anyway**.

To look around before importing anything, open the app and click **Try the sample**. It's a small made-up project about people who work from cafés.

## Transcript format

```
## Getting started
[0:05] Interviewer: How often do you work from cafés?
[0:11] Sam: Most weekdays.
```

A `## Name` line starts a section and `Speaker: text` starts a turn. The time in front is optional. The full rules, odd cases included, are in [docs/transcript-format.md](docs/transcript-format.md).

## Build from source

You need Node.js, Python 3 and [Rust](https://rustup.rs).

```
npm install
node tests/transcript.test.js
npm run build        # installers land in src-tauri/target/release/bundle
```

`sh dev/serve.sh` opens the page in a normal browser at http://127.0.0.1:8732, with a stand-in for the desktop shell.

## Planned

Coding together in real time, with end-to-end encryption. REFI-QDA import and export, so you can move a project to or from NVivo or ATLAS.ti. PDF import. An audit trail export. Hiding names from a list you type in. Exporting a thematic map. More languages.

## Re;Guide

[Re;Guide](https://github.com/azmainmahdi/re-guide) is the other half: it puts your interview guide on screen while you run the interview, keeps time for each section, and saves your notes and bookmarks.

## Licence

MIT. Fonts and icons keep their own licences, listed in [THIRD-PARTY.md](THIRD-PARTY.md).
