# Classroom Digital Brain — Codex Showcase

A standalone MITS Gwalior smart-classroom showcase built with plain HTML, CSS, JavaScript, and the existing Three.js scene. The presentation layer uses CSS/JavaScript motion and does not require React, npm, or a build step.

## Run from VS Code

1. Open the `Classroom.codex` folder in VS Code.
2. Open `index.html` and choose **Open with Live Server** (or click **Go Live**).
3. Complete the Firebase setup in `SECURITY.md`, then sign in with Google to enter the classroom. Allow camera access only when you want local person detection; **Simulate arrival** works without a camera.

The pinned Three.js, TensorFlow.js, COCO-SSD, Firebase Authentication, and Google Fonts scripts load from CDNs, so sign-in and the first launch need internet access. Camera and Web Serial require localhost or HTTPS. Web Serial works in desktop Chrome or Edge.

## What's in this edition

- A new animated portrait splash with the supplied Vivek PNG and a large name backdrop. Its entry button reveals the original MITS landing page, so the existing login choices and classroom walk-through remain in place.
- The header's **Vivek intro** button returns to the portrait splash from the original landing page or dashboard; **Front page** still returns to the original MITS landing page.
- The original landing page retains staged text reveal, layered ambient star drift, subtle Matrix code rain, the MITS / IoT pass, sound control, and the animated walk-in to the classroom.
- Five selectable palettes: Dusk, Ocean, Dune, Silk, and Aurora. The Dusk/Ocean 3D quick switch and palette dots update the CSS UI and Three.js atmospheric lighting together; the selection is saved locally.
- A dashboard whose cards reveal as they enter view, with a live 3D room, camera detection, energy estimates, room controls, and an automation log.
- Uiverse-inspired control styling: square Automatic/Manual control, tactile 3D Light/Fan/AC switches, animated walk-in arrow, orbital status-card treatment, and the MITS ticket card.
- An animated hourglass with an indeterminate progress line. It closes after the first actual Three.js room frame. A separate indeterminate bar appears while the camera model is loading; no fake percent is shown.
- The Three.js renderer keeps the original high-detail device pixel ratio and soft room shadows. Actual frame rate depends on the GPU and display; 4K output at high frame rates needs a capable graphics processor.
- Existing classroom automation, Web Serial protocol, occupancy simulation controls, editable wattages and tariff, Firebase-managed Google sign-in, and installable PWA support.

## Showcase pass details

The intro card displays Vivek Dhakar, Nov 25, 2026, Madhav Institute Of Technology & Science, Internet Of Things, Roll No 75, and barcode text `BTIO26O1075`.

## Hardware and data notes

- ESP32 uses 115200 baud; Arduino uses 9600 baud. Firmware telemetry is read as `TEMP:28.4` and `MOTION:1` or `MOTION:0`.
- Outgoing relay commands are `LIGHT_ON`, `LIGHT_OFF`, `FAN_ON`, `FAN_OFF`, `AC_ON`, and `AC_OFF`, one per line.
- Energy and cost savings are estimates based on configured wattages and tariff, not readings from a physical meter.
- Detection runs locally in the browser; the page does not upload webcam frames.
- Firebase project `classroom-digital-brain` and web app `Classroom Digital Brain Web` are registered. Google sign-in is enabled, and `localhost` plus `vivekdhakar006.github.io` are Firebase Authentication authorized domains. Its public config is in `firebase-config.js`. Never put a service-account key or private OAuth client secret in this folder.
- The Google sign-in gate requires a Firebase-authenticated, email-verified account. The dashboard, camera, and serial controls still run entirely in the visitor's browser; this static site has no backend or private server data to protect, so this gate does not make local hardware controls or client code tamper-proof. Add server-side authorization (for example, verified Firebase ID tokens with callable functions) before storing protected data or granting privileged actions.
- The privacy page is at `privacy.html`. Google OAuth production verification and public release still need a verified custom domain, public homepage/privacy URLs on that domain, completed branding, and a Google review if required. The current GitHub Pages domain is shared and cannot be verified as an owned domain.
- Follow `SECURITY.md` to finish Firebase setup and prepare the Google OAuth app for public use.
- AC commands assume firmware support for `AC_ON` and `AC_OFF`.

## File map

- `index.html` — intro, pass card, dashboard, controls, and CDN script tags.
- `style.css` — original project styles and responsive layout.
- `studio.css` — isolated theme, Uiverse-inspired controls/cards/loaders, and motion layer.
- `profile-intro.css` and `assets/vivek-portrait.png` — the first-page portrait reveal and its local image asset.
- `script.js` — Three.js classroom, walkthrough, camera, automation, theme sync, Web Serial, and simulation logic.
- `manifest.json`, `sw.js`, `icon.svg` — installable PWA shell.

Credit comments for adapted Uiverse elements are kept beside their markup and at the top of `studio.css`.
