# Authentication and release setup

## Current boundary

Google sign-in is implemented with Firebase Authentication. Firebase validates the Google sign-in and maintains the browser session. `firebase-config.js` contains only the public Firebase web-app configuration; Firebase API keys in a web app are identifiers, not secrets. Do not put a service-account key, private OAuth client secret, or other server credential in this folder.

This is a static site. Its HTML, JavaScript, camera processing, and Web Serial controls run on the visitor's device. The sign-in gate controls the normal page flow; it cannot hide downloaded source code or authorize confidential server data. There is no project backend or database. Keep sensitive data and privileged authorization on a backend, verify Firebase ID tokens there, and apply least-privilege rules before adding either.

## Finish Firebase setup

1. Firebase is linked to Google Cloud project `classroom-digital-brain`; the web app `Classroom Digital Brain Web` is registered. Google Analytics was left disabled.
2. The public client config is already in `firebase-config.js`. Do not put a service-account key or private OAuth client secret in the file.
3. Google sign-in is enabled in **Authentication → Sign-in method**.
4. `localhost` and `vivekdhakar006.github.io` are in **Authentication → Settings → Authorized domains**. If you add a custom domain, add its hostname here too; do not include a path or protocol.
5. Confirm the login works from both Live Server and the deployed HTTPS site. Sign in, sign out, refresh while signed in, and verify the account session is restored.

If the Google OAuth consent app is still in Testing, only its listed test users can sign in. For general public sign-in, complete Google Auth Platform branding and verification. Google requires a publicly accessible homepage and privacy policy on a domain you control and can verify. GitHub Pages' shared `github.io` domain is not an owned domain for verification; use a custom domain you own, publish the homepage and `privacy.html` there, and put those URLs in Google Auth Platform. Google may require an app review before public release.

## Before a public release

- Replace the placeholder values in `firebase-config.js` only after the Firebase web app exists.
- Keep Firebase Authentication's authorized-domain list limited to domains you use.
- Keep Google's requested scopes minimal (this app only needs Google sign-in).
- Publish the matching privacy policy and app homepage, then complete any Google verification required for the consent screen.
- Use HTTPS hosting. Do not distribute a `file://` URL.
- Revoke and rotate any private credentials immediately if one is ever committed. Firebase web config is not a private credential.
- Do not describe client-side sign-in as protection for hardware or data. If protected data or remote hardware control is added, put it behind a backend that verifies Firebase ID tokens and enforces server-side authorization.
