# Manual Deployment Guide — শিক্ষা অগ্রগতি Version 3

**Prepared by Manus AI**

This guide publishes the completed Version 3 platform to the new repository, **`robiul20202090/student-progress-tracker`**. It is a completely independent deployment. **Do not edit, delete, or reuse anything from the old single-file website or its Firebase project.**

> The ZIP file is only a delivery package. Extract it first; do **not** upload the ZIP itself to GitHub Pages.

## 1. What is in the package

The extracted folder contains the plain HTML, CSS, JavaScript, PWA files, Firebase rule file, icons, and this guide. There are no build tools, no React project, no npm dependencies, no Firebase credentials, and no Git metadata.

| Location | Purpose | Upload to GitHub? |
|---|---|---:|
| `index.html` | Application entry page | Yes |
| `scripts/platform.js` | Entire Version 3 application logic | Yes |
| `scripts/firebase-config.js` | Firebase configuration template; must be completed | Yes |
| `styles/v3.css` | Responsive visual design | Yes |
| `firestore.rules` | Security policy for the **new** Firebase project | Yes |
| `manifest.json`, `sw.js`, icons | Installable PWA and offline shell | Yes |
| `README.md` | Product and maintenance documentation | Yes |
| `firebase.json`, `.nojekyll`, `.gitignore` | Deployment/configuration support files | Yes |
| `start.sh`, `start.bat` | Optional local preview helpers | Optional, but recommended |

Keep the `scripts` and `styles` folders exactly as shown. In particular, `scripts/platform.js`, `scripts/firebase-config.js`, and `styles/v3.css` must not be moved beside `index.html`.

## 2. Upload the Version 3 files to GitHub

First download `student-progress-tracker-v3-github-upload.zip` and extract it. Open the extracted folder. You should immediately see `index.html`, `scripts`, and `styles`; that confirms you are at the correct level.

Open the new repository: <https://github.com/robiul20202090/student-progress-tracker>. Because this repository is empty, use **Add file → Upload files** (or the repository’s **uploading an existing file** link). GitHub supports committing uploaded existing files through its browser interface.[1]

Drag **all items inside** the extracted folder to GitHub’s upload area. Do not drag the ZIP file, and do not create an additional parent folder such as `student-progress-tracker-v3-upload` in the repository. After the upload preview appears, confirm this exact structure before committing.

```text
student-progress-tracker/
├── index.html
├── manifest.json
├── sw.js
├── firestore.rules
├── scripts/
│   ├── firebase-config.js
│   └── platform.js
└── styles/
    └── v3.css
```

Use the commit message **`Publish Version 3 student progress platform`** and click **Commit changes**. If the browser upload screen does not retain the two folders, upload the root files first, then drag the `scripts` folder and `styles` folder separately. The directory paths above are required.

## 3. Create a new isolated Firebase project

Go to <https://console.firebase.google.com/> and select **Add project**. Give it a distinct name, such as `Education Progress Platform V3`. This must be a **new** Firebase project. Do not select, rename, connect, or alter the Firebase project used by the previous website.

When the new project is ready, add a Web App by choosing the web icon (`</>`). Register the app, then copy the displayed JavaScript configuration values. In the GitHub repository, open `scripts/firebase-config.js`, choose the edit pencil, and replace every `REPLACE_WITH_NEW_...` value with the matching value from the **new** Web App configuration. Keep the property names and quotation marks intact.

```javascript
export const firebaseConfig = {
  apiKey: 'paste the new apiKey here',
  authDomain: 'paste the new authDomain here',
  projectId: 'paste the new projectId here',
  storageBucket: 'paste the new storageBucket here',
  messagingSenderId: 'paste the new messagingSenderId here',
  appId: 'paste the new appId here'
};
```

Only the values on the right should change. Leave the final line unchanged unless the intended platform owner is not `robiul20202090@gmail.com`:

```javascript
export const superAdminEmail = 'robiul20202090@gmail.com';
```

Commit the configuration edit with a clear message such as **`Configure new Firebase web app`**. A Firebase web configuration identifies the web app; the protection of student data comes from Firebase Authentication and Firestore Security Rules, which every mobile/web Firestore request is evaluated against.[2]

## 4. Enable Google sign-in and authorize the website

In the **new** Firebase project, go to **Authentication → Sign-in method**, select **Google**, enable it, choose a support email if prompted, and save. Firebase’s official web setup requires enabling the Google provider before users can use Google sign-in.[3]

Then open **Authentication → Settings → Authorized domains**, select **Add domain**, and add this hostname exactly:

```text
robiul20202090.github.io
```

Enter only the hostname—no `https://` and no `/student-progress-tracker/` path. Add a custom domain there as well if one is used later.

## 5. Create Firestore and deploy the supplied rules

In the same **new** Firebase project, open **Firestore Database** and create the default database in **production mode**. Then open the **Rules** tab, delete the starter rules, and paste the complete contents of this package’s `firestore.rules` file. Click **Publish**.

Do **not** copy the old website’s rules into the new project. The supplied Version 3 rules enforce teacher ownership, guardian approval, room-code controls, administrator boundaries, and audit-log constraints. Firestore rules can be published from the console’s Rules tab; the Firebase documentation also explains that web-client requests are evaluated against those rules.[2]

> Do not publish a permissive rule such as `allow read, write: if true;`. That would expose the database to anyone on the internet.

The first platform super-administrator is **`robiul20202090@gmail.com`**, as configured in both `scripts/firebase-config.js` and `firestore.rules`. Sign in with that Google account after deployment to use the admin area.

## 6. Turn on GitHub Pages

Return to <https://github.com/robiul20202090/student-progress-tracker>. Open **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, choose branch **`main`**, choose folder **`/(root)`**, and save. GitHub Pages supports publishing from the root of a selected branch; updates to that source are then published to the site.[4]

The expected live address is:

```text
https://robiul20202090.github.io/student-progress-tracker/
```

After the Pages status reports that the site is live, visit that address and reload once. If an earlier cached page appears after a future update, use a hard refresh or clear the site data; `sw.js` manages the PWA’s offline application shell.

## 7. Essential post-deployment check

Complete this short check before inviting teachers or guardians.

| Check | Expected result |
|---|---|
| Open the Pages URL | The Bengali Version 3 sign-in page loads without a 404 error. |
| Select Google sign-in | Google authentication opens; no `auth/unauthorized-domain` error appears. |
| Sign in as `robiul20202090@gmail.com` | The platform recognizes the account as the super-administrator. |
| Create one test teacher/student/room | Data saves successfully only while signed in. |
| Use a different Google account as guardian | The guardian has to request access and cannot view student data until the teacher approves. |
| Sign out and reload | Private student records are not shown to an unauthenticated visitor. |

If Google sign-in reports **unauthorized domain**, revisit Firebase Authentication’s Authorized domains and check that `robiul20202090.github.io` was entered exactly. If Firestore reports **permission denied** immediately after rules are published, allow a short propagation period and confirm that the rules were pasted into the **new** project, not the old one.

## 8. Android APK comes after the website works

The PWA is ready now. The direct-install Android APK has intentionally not been created yet: it will be a Trusted Web Activity (TWA) wrapper around the confirmed HTTPS Pages address, so the APK and website use the same secure Firebase deployment. Once the live URL above works and the checks pass, provide that URL to continue with the APK packaging step.

## References

[1]: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository "GitHub Docs: Adding a file to a repository"
[2]: https://firebase.google.com/docs/firestore/security/get-started "Firebase: Get started with Cloud Firestore Security Rules"
[3]: https://firebase.google.com/docs/auth/web/google-signin "Firebase: Authenticate Using Google with JavaScript"
[4]: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site "GitHub Docs: Configuring a publishing source for a GitHub Pages site"
