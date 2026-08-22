# Integrated Dashboard + New Student Workspace

This package replaces the dashboard’s student launch with the **new student workspace**. It is an integration package only; it does **not** change the legacy `Student-progress` repository.

## What This Package Does

When a teacher clicks a student card, the dashboard opens this path in the same tab:

```text
student-workspace/?student=STUDENT_ID&name=...&grade=...&school=...&teacher=...&photo=...&back=...
```

The new workspace receives the selected student identity and return link directly from the dashboard. It includes the weekly report, month/week structure, routine controls, checklist, syllabus progress report, exam sessions, guardian-room controls, and local autosave.

## Manual GitHub Upload Steps

1. Open the existing **`student-progress-tracker`** GitHub repository.
2. Download or keep a copy of the current repository before replacing files.
3. Upload **all contents of this package folder** to the repository root. Upload the contents, not the outer folder itself.
4. Confirm that the repository root now contains `index.html`, `styles/`, `scripts/`, `student-workspace/`, `manifest.json`, `sw.js`, and `icon.svg`.
5. Commit the uploaded files.
6. Wait for GitHub Pages to finish rebuilding, then hard-refresh the website once so the previous dashboard cache is replaced.
7. Open a student from the dashboard. The address should now contain `/student-workspace/` and the student identity should appear at the top of the new workspace.

## Important Boundaries

| Item | Status |
|---|---|
| Existing dashboard authentication, students, batches, and guardian requests | Kept in the dashboard package. |
| New student workspace | Added under `student-workspace/` in the same dashboard repository. |
| Legacy `Student-progress` repository | Leave unchanged for now. |
| Old single-HTML workspace records | Intentionally not migrated; this replacement begins with a new local workspace record for each dashboard student ID. |
| New workspace offline data | Saved locally in the browser under the selected student ID. |
| Cloud backup for the new workspace data | Planned as a later sync layer; this package does not write the new workspace records into Firestore yet. |

## First Test Checklist

1. Open a student card and confirm the top of the workspace shows the right name, class, school, and teacher.
2. Enter one weekly topic and score, refresh the page, and confirm the same student still has the record.
3. Open a second student and confirm their workspace starts as a separate record.
4. Click `← ড্যাশবোর্ডে ফিরুন` and confirm it returns to the dashboard.
5. Test the checklist hierarchy: subject → topic → subtopic → compact boxes.
6. Create and save an exam with two subjects.

## If an Older Dashboard Is Still Visible

The browser may still have the prior service-worker cache. Hard-refresh once. On mobile, close and reopen the tab after GitHub Pages finishes deploying. The new package uses dashboard cache version `student-progress-directory-v5-0-0` and a separate workspace cache under `student-workspace/`.
