# Integrated Dashboard + New Student Workspace

This package replaces the dashboard’s student launch with the **new student workspace**. It is an integration package only; it does **not** change the legacy `Student-progress` repository.

## What This Package Does

When a teacher clicks a student card, the dashboard opens this path in the same tab:

```text
student-workspace/?student=STUDENT_ID&name=...&grade=...&school=...&teacher=...&photo=...&back=...
```

The new workspace receives the selected student identity and return link directly from the dashboard. It includes the weekly report, month/week structure, routine controls, printable checklist and syllabus-progress reports, exam sessions, guardian-room controls, status tags, and local autosave.

The simplified dashboard adds a visible `ব্যাকআপ ও ডেটা` panel, full local export/import safeguards, and app-open backup reminders. The approved official logo is included at both the dashboard root and `student-workspace/brand-logo.png`.

## Manual GitHub Upload Steps

1. Open the existing **`student-progress-tracker`** GitHub repository.
2. Download or keep a copy of the current repository before replacing files.
3. Upload **all contents of this package folder** to the repository root. Upload the contents, not the outer folder itself.
4. Confirm that the repository root now contains `index.html`, `styles/`, `scripts/`, `student-workspace/`, `manifest.json`, `sw.js`, and `icon.svg`.
5. Commit the uploaded files.
6. **Important:** Upload `student-workspace/` only once. Inside it, upload the two exact files under `student-workspace/assets/` shown in this package. Do not create `student-workspace/student-workspace/`.
7. Wait for GitHub Pages to finish rebuilding, then hard-refresh the website once so the previous dashboard cache is replaced.
8. Open a student from the dashboard. The address should now contain `/student-workspace/` and the student identity should appear at the top of the new workspace.

## Important Boundaries

| Item | Status |
|---|---|
| Existing dashboard authentication, students, batches, and guardian requests | Kept in the dashboard package. |
| New student workspace | Added under `student-workspace/` in the same dashboard repository. |
| Legacy `Student-progress` repository | Leave unchanged for now. |
| Old single-HTML workspace records | Intentionally not migrated; this replacement begins with a new local workspace record for each dashboard student ID. |
| New workspace offline data | Saved locally in the browser under the selected student ID. |
| Cloud backup for the new workspace data | Planned as a later sync layer; this package does not write the new workspace records into Firestore yet. |
| Phase 1 guardian-update preview | Built as a teacher-controlled local-first feed record. A true cross-device guardian feed still requires the separate Firebase data-path diagnostic before it is enabled. |

## First Test Checklist

1. Open a student card and confirm the top of the workspace shows the right name, class, school, and teacher.
2. Enter one weekly topic and score, refresh the page, and confirm the same student still has the record.
3. Open a second student and confirm their workspace starts as a separate record.
4. Click `← ড্যাশবোর্ডে ফিরুন` and confirm it returns to the dashboard.
5. Test the checklist hierarchy: subject → topic → up to ten non-subject levels → compact boxes. Every non-subject level has its own completion control.
6. Use `চেকলিস্ট প্রিন্ট` and `অগ্রগতি রিপোর্ট প্রিন্ট`; confirm each opens a printable report and shows the paper-saving guidance below its button.
7. In the weekly `অবস্থা` column, confirm tags are hidden until the teacher taps `অবস্থা যোগ করুন`; tap again to remove a selected tag. Confirm no guardian update is sent until `অভিভাবককে জানান` is checked and the teacher confirms the preview.
8. Create and save an exam with two subjects.

## If an Older Dashboard Is Still Visible

The browser may still have the prior service-worker cache. Hard-refresh once. On mobile, close and reopen the tab after GitHub Pages finishes deploying. The corrected package uses dashboard cache version `student-progress-directory-v5-0-0` and workspace cache version `scholastic-ledger-workspace-v10` under `student-workspace/`. If the weekly table still contains a `মন্তব্য` text field rather than an `অবস্থা` button, the new package is not yet active.
