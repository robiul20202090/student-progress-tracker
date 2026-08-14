/*
 * Firebase configuration for the independent Student Progress Tracker project.
 * Firebase web configuration values identify this public web application; access
 * is protected by Firebase Authentication and the Firestore security rules.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyD7Qg8QLnIIhmSAyJUQUkDkgjvVH0nfXbo',
  authDomain: 'educational-progress--v3.firebaseapp.com',
  projectId: 'educational-progress--v3',
  storageBucket: 'educational-progress--v3.firebasestorage.app',
  messagingSenderId: '968211421497',
  appId: '1:968211421497:web:32e1665aeb6c09b09170e8',
};

// This account is the initial platform super-administrator.
export const superAdminEmail = 'robiul20202090@gmail.com';

export const firebaseConfigured = Object.values(firebaseConfig)
  .every(value => typeof value === 'string' && value.length > 0 && !value.startsWith('REPLACE_WITH_'));
