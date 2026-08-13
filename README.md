# শিক্ষা অগ্রগতি — Secure Student Progress Platform

**শিক্ষা অগ্রগতি** is a Bengali, static web application for teachers who manage both individual students and large teaching batches. It is a new, independent project and does not modify or depend on the earlier single-file website.

The site runs directly on GitHub Pages. It requires no Node.js, npm, React, build process, or application server. Firebase Authentication and Firestore provide sign-in and live data access.

## What Version 3 provides

| Capability | Description |
|---|---|
| Individual students | A signed-in teacher creates reusable student profiles and records private goals, scores, and notes. |
| Batches | A teacher creates a batch, selects its subjects, adds students individually or from a pasted list, and saves shared lessons with per-student attendance, scores, homework, and remarks. |
| Shared student profile | The same student can belong to both an individual plan and one or more batches without duplicate records. |
| Guardian permission | A guardian signs in with Google, enters the teacher’s 5-letter / 2-digit / 5-letter room code, and must be explicitly approved before seeing any child data. |
| Guardian privacy | An approved guardian sees only their own approved child or children. They cannot see the batch roster, other learners’ data, or raw batch sessions. |
| Anonymous comparison | When at least ten scores exist for a batch lesson, a guardian can see their child’s score beside an anonymous batch average. |
| Live presence | Teachers see the count of active approved guardian viewers for a student. |
| Administration | The configured super-administrator can manage platform accounts, administrator roles, blocks, and security audit events without reading student records. |
| PWA | The application includes an installable web-app manifest, branded icons, and a versioned offline application shell. |

## Active project structure

| Area | Location |
|---|---|
| Public application shell | `index.html` |
| Version 3 styles | `styles/v3.css` |
| Application logic | `scripts/platform.js` |
| Isolated Firebase configuration template | `scripts/firebase-config.js` |
| Firestore security policy | `firestore.rules` |
| PWA metadata | `manifest.json` |
| Offline application-shell cache | `sw.js` |
| Branded icons | `icon-192.png`, `icon-512.png` |
| Scope and design record | `V3_SCOPE.md`, `V3_ARCHITECTURE.md` |

## Local preview

Serve the project through HTTP. On macOS/Linux run `./start.sh`; on Windows run `start.bat`. Then open the printed local address.

Do **not** open `index.html` through `file://`. Firebase modules, Google sign-in, and PWA support require HTTP(S).

## Publish to a new public GitHub repository

1. Create an empty public repository named `student-progress-tracker`.
2. Upload the contents of this project to the repository root. Keep the `scripts` and `styles` directories exactly as they are.
3. In GitHub, open **Settings → Pages** and publish from the `main` branch at **/(root)**.
4. Open the resulting website once and reload it normally so the current service worker becomes active.

## Required isolated Firebase configuration

> Create a **new Firebase project** for this Version 3 platform. Do not reuse the Firebase project behind the earlier single-file website. This keeps the old website’s data and security rules untouched. Do not publish the live site until the new Firestore rules are deployed; the frontend is public by design, while Firestore rules enforce data privacy and permissions.

| Firebase area | Required action |
|---|---|
| New Firebase project | Create a new project and register a new Web App. |
| `scripts/firebase-config.js` | Copy the new Web App configuration into the marked placeholder values. Never paste the earlier website’s configuration into this file. |
| Authentication → Sign-in method | Enable Google sign-in. |
| Authentication → Authorized domains | Add the final GitHub Pages hostname, such as `yourname.github.io`. |
| Firestore Database | Create the database in production mode. |
| Firestore Database → Rules | Replace the new project’s rules with the complete contents of `firestore.rules`, then publish. |
| Firestore Database → Indexes | Create any composite index requested by the Firebase console if it appears during normal app use. |

The initial super-administrator is configured as `robiul20202090@gmail.com`. Change that email in both `scripts/firebase-config.js` and `firestore.rules` before publishing if it is not the intended account.

## Security model and limits

The project uses Google sign-in, owner-scoped documents, guardian approval records, non-listable room-code lookups, room-code rotation, teacher revocation, short-lived presence, and append-only audit events. Student reports are not readable by administrators unless the administrator is also that student’s owning teacher.

A room code is easy to say aloud, but it is **not itself access**. It can only start a signed-in guardian’s approval request. A teacher must approve the request before student data can be read. The teacher can generate a replacement code and remove all prior guardian approvals from the student’s Guardian tab.

No static website or direct APK can hide client-side code or replace backend authorization. Keep Firebase rules deployed, restrict the Firebase API key in Google Cloud Console to the intended web and Android applications where possible, do not share administrator accounts, and apply browser/Android updates promptly.

## Android APK distribution

The website/PWA is the primary release. A direct-install Android APK should wrap the **published HTTPS website** using a Trusted Web Activity (TWA), so it uses exactly the same secure application, Google sign-in, and Firebase data as the website.

Before producing a release APK, the project needs a final public website URL, an Android application ID, and a protected signing key. The Android signing key must be backed up securely; losing it prevents future updates to the same installed app. The `manifest.json` and 512px icon are already prepared for this path.

## Maintenance rule

Use this Version 3 repository as the source of truth. Do not copy the old single-file application into this project. After changing access control or Firebase paths, update `firestore.rules` in the same release and re-test teacher, guardian, and administrator access separately.
