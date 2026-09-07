# ClickFix Awareness Lab

A polished, offline teaching platform for exploring the trust boundary in a ClickFix social engineering attempt. It pairs a fictional verification screen with a virtual clipboard, a guided in-page Run simulator, and a SOC investigation workspace.

**Open `index.html` in a modern desktop browser after extracting the entire folder.** The precompiled Tailwind CSS and all runtime assets are included. No installation, server, credentials, or Internet access is required for the lab itself. Research links open external reference pages only when selected.

## Demonstrate in three minutes

1. Start in **Simulation** with **Lab mode** enabled. Point out the four-stage pipeline and empty virtual clipboard.
2. Select **I'm not a robot**. Watch the loading state and the descriptive training marker appear in the dashboard.
3. Explain the red flag: the prompt asks for an action outside the browser. Use **Simulate Win + R**, **Simulate Ctrl + V**, and **Simulate Enter**, in that order. These are on-screen buttons; do not use Windows Run.
4. Select **Inspect detection evidence**. Review the illustrative process tree, three correlated synthetic events, and expandable event fields. Discuss what additional evidence would be needed to classify a real alert.
5. Return to **Simulation** and select **Reset session**. Enable **Simulate clipboard error**, start again, and demonstrate the explicit retry path.

Turn off **Lab mode** for a cleaner participant view; training labels remain visible. Use **Mobile** to narrow the participant viewport. Detector mode also has **Load sample evidence** for teaching without stepping through the sequence.

## What is implemented

- Dark instrument-panel layout, compiled Tailwind 4 utilities, clean system typography, responsive participant and analyst views.
- Fictional ClearCheck verification component, loading state, animated keyboard guide, and a contained Run-style panel.
- Explicit state transitions, live event stream, virtual clipboard byte count, payload metadata, cancel-safe reset, and recoverable staging errors.
- Detector view with a synthetic process tree, RunMRU/process/network evidence, ATT&CK links, mitigation context, and a Defender XDR hunting starter.
- Keyboard-operable tabs and controls, visible focus, status announcements, reduced-motion handling, and a no-JavaScript message.
- No runtime CDN, analytics, backend, real clipboard access, executable payload, HTA, VBScript, remote fetch, or EDR integration.

The program generates a descriptive marker beginning with `CLICKFIX_TRAINING`. `mshta.exe` is a **data label**. Neither the marker nor the redacted synthetic evidence is a working launcher command.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Accessible participant view and detector workspace |
| `styles.css` | Responsive components, layout, motion, and theme |
| `app.js` | UI controller, rendering, timers, and navigation |
| `lab-engine.js` | Pure state machine, inert markers, and synthetic evidence |
| `src/tailwind.css` | Tailwind source and scan targets |
| `assets/tailwind.css` | Precompiled local Tailwind stylesheet |
| `assets/favicon.svg` | Local lab icon |
| `tests/lab-engine.test.cjs` | Behavioral and safety-regression checks |
| `RESEARCH.md` | Source review, technical boundaries, and primary references |
| `THIRD_PARTY_NOTICES.md` | Tailwind license notice |

## Development

Node.js 20+ is needed only to rebuild CSS or run the included checks. After installing the pinned dependencies:

```sh
npm ci
npm run build:css
npm run check
npm test
```

`npm ci` needs access to the package registry or a populated local cache. Ordinary demonstration does not need Node.js. A lockfile is included for reproducibility. The Tailwind build follows the [official CLI workflow](https://tailwindcss.com/docs/installation/tailwind-cli).

The controller uses classic deferred scripts rather than browser modules so the extracted project can open directly from a local file. A restrictive Content Security Policy permits local scripts and styles, blocks objects, and disables runtime connections. It supplements the absence of dangerous capabilities; it is not a sandbox for arbitrary untrusted HTML or code.

## Validation and limits

The included checks exercise the state sequence, invalid/repeated transitions, recovery, independent sessions, immutable snapshots, marker validation, synthetic correlations, and the absence of prohibited runtime bridges. Local resource references, unique HTML IDs, JavaScript syntax, and Tailwind compilation are also checked during delivery.

This is a research prototype with production-style presentation, not a deployed security product. No live Windows execution, EDR query, tenant validation, or browser/device visual QA was performed in this environment. Use a brief rehearsal in the presentation browser to confirm rendering and keyboard navigation. The mobile selector changes the participant frame width; it is not an emulator.

All evidence is synthetic and explicitly labeled. Process labels, sample times, sample hostnames, documentation-only network addresses, and redacted command lines are teaching data. They are not observations from the viewer's machine. The detector does not claim a real EDR block or malware finding.

The original executable helpers are retired from this version. Their relevant behavior is documented in `RESEARCH.md` and represented by in-memory simulation transitions.
