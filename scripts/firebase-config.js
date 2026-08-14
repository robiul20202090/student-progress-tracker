/*
 * Version 3 isolated Firebase configuration.
 *
 * Create a NEW Firebase Web App for this project, then replace every
 * REPLACE_WITH_* value below with that new app's configuration values.
 * Do not paste configuration from the earlier single-file tracker here.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyD7Qg8QLnIIhmSAyJUQUkDkgjvVH0nfXbo',
  authDomain: 'educational-progress--v3.firebaseapp.com',
  projectId: 'educational-progress--v3',
  storageBucket: 'educational-progress--v3.firebasestorage.app',
  messagingSenderId: '968211421497',
  appId: '1:968211421497:web:32e1665aeb6c09b09170e8'
};


// This account is the first platform super-administrator. Change it before
// publishing only if a different account should own the new project.
export const superAdminEmail = 'robiul20202090@gmail.com';

export const firebaseConfigured = Object.values(firebaseConfig)
  .every(value => typeof value === 'string' && value.length > 0 && !value.startsWith('REPLACE_WITH_'));
