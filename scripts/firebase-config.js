/*
 * Version 3 isolated Firebase configuration.
 *
 * Create a NEW Firebase Web App for this project, then replace every
 * REPLACE_WITH_* value below with that new app's configuration values.
 * Do not paste configuration from the earlier single-file tracker here.
 */
export const firebaseConfig = {
  apiKey: 'REPLACE_WITH_NEW_FIREBASE_API_KEY',
  authDomain: 'REPLACE_WITH_NEW_PROJECT.firebaseapp.com',
  projectId: 'REPLACE_WITH_NEW_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_NEW_PROJECT.firebasestorage.app',
  messagingSenderId: 'REPLACE_WITH_NEW_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_NEW_WEB_APP_ID'
};

// This account is the first platform super-administrator. Change it before
// publishing only if a different account should own the new project.
export const superAdminEmail = 'robiul20202090@gmail.com';

export const firebaseConfigured = Object.values(firebaseConfig)
  .every(value => typeof value === 'string' && value.length > 0 && !value.startsWith('REPLACE_WITH_'));
