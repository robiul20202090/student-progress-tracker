# Student Progress Tracker

A Bengali-first, local-first student progress workspace for teachers. The application is designed for practical classroom use: it should remain useful without an internet connection, keep teacher-entered Bengali data unchanged, and provide optional cloud synchronization and a controlled read-only Guardian view when the teacher chooses to use the online mode.

> **Current release focus:** stable batch workflows, monthly class sheets, bilingual schedule-time presentation, Guardian cloud sharing, privacy/trust guidance, and reliable PWA updates.

## What this project is

Student Progress Tracker is a static web application intended to be hosted on GitHub Pages. It combines a vanilla JavaScript dashboard with a compiled React/Vite student workspace. The dashboard manages the teacher’s students, batches, Guardian requests, local backup behavior, and navigation. The student workspace contains the detailed individual tools for weekly progress, routines, checklist progress, syllabus visualization, exams, print views, and read-only Guardian presentation.

The application follows a **local-first** model. The browser’s local storage is the immediate working copy, so a teacher can continue using the core workspace when the network is unavailable. An online teacher may connect Firebase to synchronize a protected cloud snapshot. Cloud synchronization is an optional capability; it is not intended to replace local backups.

## Main capabilities

| Area | Current behavior |
| --- | --- |
| Teacher dashboard | Bengali-first dashboard for students, batches, Guardian requests, backup reminders, language controls, and navigation. |
| Individual student workspace | Student identity, weekly progress report, routine, checklist, syllabus progress, exam records, print views, and teacher-entered notes. |
| Batch workspace | Batch identity, class level, multiple subjects, monthly class sheets, attendance, fees, student records, and batch summaries. |
| Batch creation | Dashboard and Batch-section buttons use the same full creation flow. The form supports class level, multiple subjects, one-to-seven teaching days, AM/PM time, and an optional note. |
| Monthly batch sheet | Calendar dates are grouped into five week sections. A displayed class date includes its weekday, and multiple subjects can remain on the same date. Local date keys avoid UTC timezone shifts at month boundaries. |
| Schedule time | Batch and individual routines use a 12-hour AM/PM input. Displayed times use readable periods such as `সকাল`, `দুপুর`, `বিকেল`, `সন্ধ্যা`, and `রাত`; English mode uses `Morning`, `Afternoon`, `Evening`, and `Night`. |
| Attendance and fees | Batch records support monthly attendance and fee status. Fee statuses include Paid, Due, Partially paid, and Not recorded. Partial amounts can be entered manually, with notes for the teacher. |
| Guardian access | A teacher can create a student-specific Guardian room or invitation. The Guardian sees a read-only snapshot of the selected student workspace and cannot add, edit, or remove teacher data. |
| Guardian warnings | Teacher-reviewed homework or attention notices can be propagated as warning cards to the selected Guardian view. These notices use a clear warning presentation. |
| Privacy and trust | The project includes Bengali-first privacy guidance, local/cloud explanation, teacher responsibility guidance, Guardian disclosure, retention/deletion/export guidance, and warnings about forwarding access links. |
| PWA behavior | The root service worker provides offline caching. Cache names and versioned script URLs must change when a release changes cached JavaScript or HTML. |

## Language policy

The interface is Bengali-first. English support is available for interface labels and selected schedule summaries. **Teacher-entered content is never automatically translated.** This includes student names, school names, subjects created by the teacher, topics, notes, homework descriptions, and other personal classroom text.

Dates, interface descriptions, buttons, headings, and schedule-period words may change when the user switches interface language. A time stored as a stable machine value is formatted for display according to the active language; switching language must not rewrite the underlying time.

## Repository structure

The following structure describes the GitHub Pages release. Some releases may contain additional small compatibility files, but the responsibilities remain the same.

```text
repository-root/
├── index.html
├── sw.js
├── styles/
│   ├── batch-workspace.css
│   ├── guardian-donut-fix.css
│   └── other shared style files
├── scripts/
│   ├── dashboard-v5.js
│   ├── batch-workspace.js
│   ├── locale.js
│   └── online-firebase.js
└── student-workspace/
    ├── index.html
    ├── manifest.json
    ├── sw.js
    ├── workspace-i18n.js
    └── assets/
        ├── compiled JavaScript bundle
        └── compiled CSS bundle
```

| File or folder | Why it exists | What to check when something breaks |
| --- | --- | --- |
| `index.html` | Root application shell. It loads the dashboard scripts, styles, and cache-busting version strings. | Check script order, relative paths, and whether a changed script has a new query-string version. |
| `sw.js` | Root PWA service worker. It caches the application shell and removes old cache versions during activation. | Check `CACHE_NAME` and the `APP_SHELL` list after every release. |
| `styles/` | Visual styles for the dashboard, batch workspace, Guardian view, charts, forms, and responsive layouts. | Check the relevant page-specific stylesheet and confirm the file is included by `index.html` or the service worker. |
| `scripts/dashboard-v5.js` | Main dashboard state, student and batch navigation, local persistence, activity feed, backup controls, and Guardian request controls. | Check local-storage loading, event delegation, dashboard counts, and the action attribute used by a button. |
| `scripts/batch-workspace.js` | Batch creation, monthly class sheets, routine days, subjects, attendance, fees, summaries, and batch display formatting. | Check this file first for batch form, teaching-day, month/week, weekday, subject, or schedule-time problems. |
| `scripts/locale.js` | Interface-language support for the dashboard shell. | Check language keys and confirm teacher-entered values are not passed through translation. |
| `scripts/online-firebase.js` | Optional Firebase authentication, cloud snapshot synchronization, Guardian invitation handling, stable cloud/local comparison, and online status behavior. | Check Firebase configuration, auth state, Firestore reads/writes, capability-token handling, and the stable fingerprint comparison. |
| `student-workspace/` | The compiled individual student-teacher and Guardian workspace. It is a nested application with its own entry page, manifest, service worker, and generated assets. | Check `student-workspace/index.html` first, then its referenced bundle and nested service worker. Do not edit a generated bundle by hand when the source project is available. |
| `student-workspace/assets/` | Compiled React/Vite JavaScript and CSS used by the nested workspace. | Confirm the filename in `student-workspace/index.html` exactly matches the uploaded asset. A new build normally creates a new hash. |
| `firebase/` or `firebase/firestore.rules` when present | Optional repository copy of the canonical Firestore security rules. | Compare it with the Firebase Console before publishing. Rules are security-sensitive and are not changed for client-only presentation repairs. |

## Data and persistence model

The application keeps the immediate working state in browser storage. This supports offline use and makes routine entry responsive. A teacher should still export JSON backups regularly, because browser storage can be lost when site data is cleared, a browser profile is removed, or a device is replaced.

Online mode adds Firebase authentication and Firestore snapshot synchronization. The cloud copy is associated with the authenticated teacher account. The app must avoid replacing a valid local state with a blank cloud state during startup. When local and cloud copies genuinely differ, the teacher may be asked which copy to use. Equal data should not produce a repeated choice after refresh; stable fingerprints are used so property-order differences do not look like real data changes.

A JSON backup is a portability and recovery file. Treat it as sensitive because it may contain student names, school information, progress, notes, attendance, fees, and Guardian-related records. Do not upload backups to public repositories or share them in public issue reports.

## Guardian privacy model

Guardian sharing is intentionally limited. A Guardian invitation is student-specific, and the Guardian view is read-only. The Guardian may expand or collapse available report sections for viewing, but cannot edit, add, delete, or approve teacher data.

The Guardian should understand the following limitations:

1. A shared invitation or capability link should not be forwarded to another person.
2. A browser change, device change, or cleared browser data may require a new request and approval.
3. Online revocation prevents future access but cannot recall a report that someone already downloaded, copied, or photographed.
4. The displayed workspace is a teacher-controlled snapshot and is not an independent Guardian record.
5. The teacher is responsible for deciding whether they are allowed to record the student information and share the selected report.

The privacy notice in the project should remain Bengali-first and should explain local storage, optional cloud storage, Guardian access, deletion, export, and the practical limits of link-based access.

## Firebase and security boundary

The Firebase project used by the current online configuration is:

```text
educational-progress--v3
```

Firebase Rules are separate from the static frontend. The frontend can request data, but Firestore Rules must enforce teacher ownership and prevent unauthorized access. A client-side button, hidden field, or invitation page is not a security boundary.

The recent batch and time-format release changes only client-side forms, display formatting, local data structures, and cache delivery. **No Firebase Rules change is required for that release.** If a future feature changes Firestore paths, ownership checks, Guardian permissions, or stored cloud fields, update and test the canonical rules separately before release.

Never place private service-account keys in this repository. Firebase web configuration values are public application identifiers, but authentication, Firestore Rules, capability tokens, and any backend secrets still require careful handling.

## PWA and GitHub Pages release rules

GitHub Pages serves the static files. The root `index.html` is the entry point, and `sw.js` controls offline caching. Because service workers may continue serving older files, every release that changes cached JavaScript, HTML, or CSS should use both of the following safeguards:

- Change the relevant script or stylesheet query-string version in `index.html` and in the root `sw.js` app-shell list.
- Change the root `CACHE_NAME` in `sw.js` so the old cache is deleted during activation.

The nested `student-workspace/` application has its own entry page and service worker. When its source is rebuilt, the generated hashed asset must be uploaded and the nested `index.html` must point to that exact filename.

## Manual GitHub upload workflow

This project is intentionally released manually. The maintainer receives a ZIP containing only the necessary replacement files, then uploads them to the existing GitHub repository while preserving their paths.

Before uploading, download a JSON backup from the working app and keep the current repository state available. Extract the ZIP locally and compare its folder structure with the repository. Upload `index.html` and `sw.js` to the root when they are included. Upload files under `scripts/`, `styles/`, and `student-workspace/` into folders with exactly those names. GitHub will replace files with the same path; it will not automatically understand a ZIP as a folder hierarchy if files are uploaded individually.

After committing, wait for GitHub Pages to rebuild. Then close and reopen the installed PWA or perform a hard refresh. Test the changed feature in a clean browser profile as well as the normal browser. Do not publish a Firebase Rules change unless the release package explicitly includes a rules update.

## Recommended release checklist

| Check | Expected result |
| --- | --- |
| Root page opens | Dashboard loads without a blank screen or console error. |
| Offline reload | Previously cached app opens after network is unavailable. |
| Student flow | A student can be opened and the individual workspace loads with its avatar and saved records. |
| Batch creation | Dashboard and Batch-section buttons open the same full form. |
| Batch schedule | One through seven days can be selected, multiple subjects can share a date, and the time uses AM/PM. |
| Month boundary | July 31 remains in July, August 1 remains in August, and both show the correct weekday. |
| Time language | Bengali and English display readable period words without changing the stored time or teacher-entered text. |
| Refresh persistence | A newly created batch remains after refresh and appears in the dashboard count. |
| Guardian view | The selected student opens read-only, warnings appear when sent, and no edit controls are available to the Guardian. |
| Cloud restore | A signed-in teacher can restore a valid cloud snapshot without blank-state overwrite. |
| Conflict prompt | A genuine local/cloud difference can be resolved, but an unchanged dataset does not repeatedly prompt after refresh. |
| Privacy notice | The privacy page and Guardian disclosure are reachable and understandable before sharing. |
| Backup | JSON export completes and the downloaded file is kept privately. |

## Troubleshooting map

If the dashboard is blank, inspect the browser console first, then check `index.html` script order and the paths under `scripts/`. If only batch screens fail, inspect `scripts/batch-workspace.js` and `styles/batch-workspace.css`. If the individual workspace is blank, open `student-workspace/index.html` and verify the generated asset filename, `workspace-i18n.js`, and the nested service worker.

If the cloud indicator is red or black, check authentication state, the Firebase project identifier, authorized domains, Firestore Rules, and browser network errors. If cloud restore shows no data, confirm that the teacher signed into the same account that created the snapshot and that the startup logic is not treating a missing document as an empty replacement. If the conflict dialog repeats with unchanged data, check stable fingerprint generation rather than changing Firebase Rules.

If the old interface remains after an upload, the browser or PWA is probably serving an old cache. Confirm the root cache name and versioned URLs, then hard-refresh or close and reopen the installed app. Keep the JSON backup before clearing site data.

## Development principles

The project favors clear, reversible changes over large rewrites. Bengali-first wording, local-first operation, read-only Guardian access, no real student photos, stable data preservation, and manual release control are core decisions. New features should preserve these decisions unless a later planning phase explicitly changes them.

The project must not fabricate customer reviews, ratings, testimonials, or other user-generated evidence. Demonstration data should be clearly identified as demonstration data and should never be presented as a real family’s record.

## Future roadmap

The next major packaging step under consideration is a Trusted Web Activity (TWA) wrapper for Android. It is a future roadmap item, not part of the current static GitHub Pages release. The likely sequence is to gather real user feedback first, then verify the PWA’s installability, HTTPS behavior, manifest, service-worker reliability, Digital Asset Links, and Android wrapper behavior before considering an APK or Play Store release.

The TWA phase should not weaken the local-first workflow or Guardian privacy model. Any Android packaging work should be planned and tested separately from ordinary GitHub file repairs.

## References

The implementation-specific descriptions above document this repository’s current design. The following external references explain the platform concepts used by the project:

1. [MDN Web Docs — Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
2. [MDN Web Docs — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
3. [Firebase Documentation — Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
4. [GitHub Docs — GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages)
5. [web.dev — Trusted Web Activities](https://developer.chrome.com/docs/android/trusted-web-activity)

---

**Document status:** Updated for the current batch, Guardian cloud, privacy/trust, PWA cache, and bilingual schedule-time release line.

**Maintainer note:** Keep this README in the repository root and update its release-status paragraph whenever a future package changes the architecture or security model.

**Author:** Manus AI
