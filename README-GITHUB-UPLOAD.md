# Student Progress Tracker — Manual GitHub Pages Upload

This folder is a static GitHub Pages release package. Upload the **contents of this folder** to the root of the existing `student-progress-tracker` repository, preserving all nested folders such as `scripts`, `styles`, `assets`, `student-workspace`, and `firebase`.

The `index.html` file must remain in the repository root. Do not upload only the `student-workspace` folder, because the dashboard, batch workspace, avatar catalog, online extension, and Firebase configuration all begin at the root.

## Publish order

First, keep the existing live site untouched while you test this ZIP locally or in a separate branch if desired. When you decide to publish, replace the existing repository files with this package, then commit the change through GitHub’s web interface. In repository **Settings → Pages**, use the configured branch and the `/ (root)` folder. GitHub Pages will then serve the new root `index.html`.

## Firebase order

Before testing **Online teacher** sign-in, follow `firebase/FIREBASE-CONSOLE-GUIDE.md`. It contains the rules file to paste, expected Rules Playground results, Google Authentication setup, and domain authorization checks. The application remains usable in Guest/Offline mode without Firebase.

## Safety boundary

The package contains no real child-photo upload path. Students use an avatar ID and optimized bundled avatar assets. Guardian reports are limited to one student, are read-only, and exclude teacher-private notes, batch data, real photos, dashboard controls, and backup tools.
