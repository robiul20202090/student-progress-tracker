import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, onSnapshot, writeBatch, serverTimestamp,
  enableIndexedDbPersistence, limit,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig, superAdminEmail, firebaseConfigured } from './firebase-config.js?v=4.4.0';

export const SCHEMA_VERSION = 4;
export const SUPER_ADMIN = (superAdminEmail || '').toLowerCase();
export const RoomAccessMode = Object.freeze({ APPROVAL: 'approval-required', IMMEDIATE: 'immediate-batch' });
export const TaskStatus = Object.freeze({ NOT_STARTED: 'not-started', IN_PROGRESS: 'in-progress', COMPLETED: 'completed', REVISION: 'needs-revision' });

const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

if (db && !globalThis.__sptFirestorePersistenceAttempted) {
  // Option A: Firestore keeps authorised workspace data and queued writes in
  // IndexedDB so a teacher can keep working after an initial online visit.
  // The page-level guard prevents duplicate module URLs from attempting to
  // start persistence twice; the synchronous and async catches also ensure
  // another tab or unavailable storage never blocks the normal online app.
  globalThis.__sptFirestorePersistenceAttempted = true;
  try {
    enableIndexedDbPersistence(db).catch(error => {
      console.warn('Offline workspace storage is unavailable; online mode remains available.', error?.code || error);
    });
  } catch (error) {
    console.warn('Offline workspace storage could not start; online mode remains available.', error?.code || error);
  }
}

export function subscribeConnectionState(listener) {
  const state = () => ({
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    // Firestore automatically sends locally queued writes once connectivity
    // returns. While the browser is offline this label is deliberately clear.
    status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',
  });
  const emit = () => listener(state());
  emit();
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);
  return () => {
    window.removeEventListener('online', emit);
    window.removeEventListener('offline', emit);
  };
}

const clean = value => String(value ?? '').trim();
const optional = value => clean(value) || null;
const normaliseArray = value => Array.isArray(value) ? value.filter(Boolean) : [];
const safeRoadmapSummary = roadmap => normaliseArray(roadmap).map(subject => {
  const chapters = normaliseArray(subject.chapters);
  const tasks = chapters.flatMap(chapter => normaliseArray(chapter.tasks));
  const completed = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
  return { name: clean(subject.name), chapterCount: chapters.length, taskCount: tasks.length, completedTaskCount: completed };
}).filter(subject => subject.name);
const nowEnvelope = (teacherUid, extra = {}) => ({
  schemaVersion: SCHEMA_VERSION,
  ...(teacherUid ? { teacherUid } : {}),
  ...extra,
  updatedAt: serverTimestamp(),
});

export function id(prefix = 'item') {
  return `${prefix}_${crypto.randomUUID ? crypto.randomUUID().replaceAll('-', '') : Math.random().toString(36).slice(2)} `
    .trim();
}

export function normaliseRoomCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{5})(.{2})(.{5}).*$/, '$1-$2-$3');
}

function randomByte() { const values = new Uint8Array(1); crypto.getRandomValues(values); return values[0]; }
function speakable() {
  const consonants = 'BCDFGHJKLMNPRSTVWZ'; const vowels = 'AEIOU';
  return `${consonants[randomByte() % consonants.length]}${vowels[randomByte() % vowels.length]}${consonants[randomByte() % consonants.length]}${vowels[randomByte() % vowels.length]}${consonants[randomByte() % consonants.length]}`;
}
export function newRoomCode() { return `${speakable()}-${String(randomByte() % 100).padStart(2, '0')}-${speakable()}`; }

export async function signInWithGoogle() {
  if (!auth) throw new Error('Firebase is not configured.');
  return signInWithPopup(auth, new GoogleAuthProvider());
}
export async function signOutUser() { if (auth) return signOut(auth); }
export function subscribeAuth(callback) {
  if (!auth) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, callback);
}

export async function ensureProfile(user) {
  if (!db || !user) throw new Error('No authenticated Firebase session.');
  const ref = doc(db, 'users', user.uid);
  const before = await getDoc(ref);
  const base = {
    uid: user.uid,
    name: clean(user.displayName) || 'Teacher',
    email: clean(user.email).toLowerCase(),
    photoURL: optional(user.photoURL),
    lastActiveAt: serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
  };
  if (!before.exists()) {
    await setDoc(ref, { ...base, status: 'active', createdAt: serverTimestamp(), preferredLanguage: 'bn' });
  } else {
    await updateDoc(ref, base);
  }
  // The directory intentionally contains account-management metadata only. It
  // never copies students, reports, or other child information.
  await setDoc(doc(db, 'userDirectory', user.uid), {
    uid: user.uid,
    name: base.name,
    email: base.email,
    photoURL: base.photoURL,
    lastActiveAt: serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
    ...(before.exists() ? {} : { createdAt: serverTimestamp() }),
  }, { merge: true });
  const after = await getDoc(ref);
  return after.data();
}

export async function getRoles(user) {
  const email = clean(user?.email).toLowerCase();
  if (email && email === SUPER_ADMIN) return { isAdmin: true, isSuperAdmin: true };
  if (!db || !user) return { isAdmin: false, isSuperAdmin: false };
  const role = await getDoc(doc(db, 'adminRoles', user.uid));
  return { isAdmin: role.exists() && role.data().isAdmin === true, isSuperAdmin: false };
}

export async function audit(actorUid, type, details = {}) {
  if (!db || !actorUid) return;
  await addDoc(collection(db, 'auditLogs'), {
    ...nowEnvelope(actorUid, { actorUid, type, details, createdAt: serverTimestamp() }),
  });
}

export async function activity(teacherUid, type, details = {}) {
  if (!db || !teacherUid) return;
  await addDoc(collection(db, 'teacherActivity', teacherUid, 'items'), {
    ...nowEnvelope(teacherUid, { type, details, createdAt: serverTimestamp() }),
  });
}

export function subscribeTeacherWorkspace(teacherUid, handlers) {
  if (!db || !teacherUid) return () => {};
  const unsubs = [];
  unsubs.push(onSnapshot(query(collection(db, 'students'), where('teacherUid', '==', teacherUid), limit(200)), snap => {
    handlers.students?.(snap.docs.map(item => ({ id: item.id, ...item.data() }))); 
  }, handlers.error));
  unsubs.push(onSnapshot(query(collection(db, 'batches'), where('teacherUid', '==', teacherUid), limit(100)), snap => {
    handlers.batches?.(snap.docs.map(item => ({ id: item.id, ...item.data() })));
  }, handlers.error));
  unsubs.push(onSnapshot(query(collection(db, 'guardianRequests', teacherUid, 'requests'), limit(100)), snap => {
    handlers.requests?.(snap.docs.map(item => ({ id: item.id, ...item.data() })));
  }, handlers.error));
  unsubs.push(onSnapshot(query(collection(db, 'teacherActivity', teacherUid, 'items'), limit(30)), snap => {
    handlers.activity?.(snap.docs.map(item => ({ id: item.id, ...item.data() })));
  }, handlers.error));
  unsubs.push(onSnapshot(query(collection(db, 'teacherTasks', teacherUid, 'items'), limit(200)), snap => {
    handlers.tasks?.(snap.docs.map(item => ({ id: item.id, ...item.data() })));
  }, handlers.error));
  return () => unsubs.forEach(stop => { try { stop(); } catch (_) {} });
}

export async function createTeacherTask(teacherUid, payload = {}) {
  if (!db || !teacherUid) throw new Error('A teacher account is required.');
  const title = clean(payload.title);
  if (!title) throw new Error('Task title is required.');
  const taskId = id('task');
  const record = {
    ...nowEnvelope(teacherUid, {
      title,
      kind: payload.kind === 'batch' ? 'batch' : 'student',
      targetId: clean(payload.targetId),
      targetName: clean(payload.targetName),
      dueDate: optional(payload.dueDate),
      status: payload.status === 'done' ? 'done' : 'due',
    }),
  };
  await setDoc(doc(db, 'teacherTasks', teacherUid, 'items', taskId), record);
  await activity(teacherUid, 'teacher-task-created', { taskId, title, kind: record.kind, targetId: record.targetId });
  return { id: taskId, ...record };
}

export async function updateTeacherTask(teacherUid, taskId, patch = {}) {
  if (!db || !teacherUid || !taskId) return;
  const allowed = {};
  if (Object.prototype.hasOwnProperty.call(patch, 'title')) allowed.title = clean(patch.title);
  if (Object.prototype.hasOwnProperty.call(patch, 'dueDate')) allowed.dueDate = optional(patch.dueDate);
  if (Object.prototype.hasOwnProperty.call(patch, 'status')) allowed.status = patch.status === 'done' ? 'done' : 'due';
  if (!Object.keys(allowed).length) return;
  await updateDoc(doc(db, 'teacherTasks', teacherUid, 'items', taskId), { ...allowed, updatedAt: serverTimestamp() });
  await activity(teacherUid, 'teacher-task-updated', { taskId, status: allowed.status || 'due' });
}

export async function listTeacherStudents(teacherUid) {
  const result = await getDocs(query(collection(db, 'students'), where('teacherUid', '==', teacherUid), limit(300)));
  return result.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function createStudent(teacherUid, payload) {
  const name = clean(payload.name);
  if (!name) throw new Error('Student name is required.');
  const studentId = id('student');
  const subjects = normaliseArray(payload.subjects).map(subject => ({ id: id('subject'), name: clean(subject.name || subject), order: Number(subject.order || 0) })).filter(subject => subject.name);
  const student = {
    ...nowEnvelope(teacherUid, {
      name,
      grade: clean(payload.grade),
      note: clean(payload.note),
      subjects,
      batchIds: [],
      roomCode: null,
      roomDescription: clean(payload.roomDescription),
      planMode: payload.planMode === 'template' ? 'template' : 'custom',
      templateSnapshot: payload.templateSnapshot || null,
      createdAt: serverTimestamp(),
      status: 'active',
    }),
  };
  const plan = {
    ...nowEnvelope(teacherUid, {
      studentId,
      activeGoals: [],
      weeklyReflection: { strengths: '', difficulties: '', parentGuidance: '', nextWeekPlan: '' },
      roadmap: subjects.map(subject => ({ ...subject, books: [], chapters: [] })),
      guardianSummary: { goal: '', updatedAt: null },
      createdAt: serverTimestamp(),
    }),
  };
  const batch = writeBatch(db);
  batch.set(doc(db, 'students', studentId), student);
  batch.set(doc(db, 'studentPlans', studentId), plan);
  // Guardians never read students or plans directly. This is the deliberately safe projection.
  batch.set(doc(db, 'guardianReports', studentId), {
    ...nowEnvelope(teacherUid, {
      studentId, name, grade: student.grade, roomDescription: student.roomDescription,
      guardianSummary: { goal: '', updatedAt: null }, roadmapSummary: safeRoadmapSummary(plan.roadmap),
      createdAt: serverTimestamp(),
    }),
  });
  await batch.commit();
  await Promise.all([audit(teacherUid, 'student_created', { studentId, name }), activity(teacherUid, 'student-created', { studentId, name })]);
  return { id: studentId, ...student };
}

export async function updateStudent(teacherUid, studentId, patch) {
  const allowed = {
    name: clean(patch.name), grade: clean(patch.grade), note: clean(patch.note),
    subjects: normaliseArray(patch.subjects), roomDescription: clean(patch.roomDescription),
  };
  Object.keys(allowed).forEach(key => { if (allowed[key] === undefined) delete allowed[key]; });
  await updateDoc(doc(db, 'students', studentId), { ...allowed, ...nowEnvelope(teacherUid) });
  await setDoc(doc(db, 'guardianReports', studentId), {
    ...nowEnvelope(teacherUid, { studentId, name: allowed.name, grade: allowed.grade, roomDescription: allowed.roomDescription }),
  }, { merge: true });
  await activity(teacherUid, 'student-updated', { studentId });
}

export async function getStudentPlan(studentId) {
  const snapshot = await getDoc(doc(db, 'studentPlans', studentId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function saveStudentPlan(teacherUid, studentId, patch) {
  const ref = doc(db, 'studentPlans', studentId);
  await setDoc(ref, { ...nowEnvelope(teacherUid, { studentId }), ...patch }, { merge: true });
  const reflection = patch.weeklyReflection || {};
  const safeSummary = patch.guardianSummary || {};
  await setDoc(doc(db, 'guardianReports', studentId), {
    ...nowEnvelope(teacherUid, {
      studentId,
      ...(patch.roadmap ? { roadmapSummary: safeRoadmapSummary(patch.roadmap) } : {}),
      ...(patch.guardianSummary ? { guardianSummary: { goal: clean(safeSummary.goal), updatedAt: serverTimestamp() } } : {}),
      ...(patch.weeklyReflection ? { parentGuidance: clean(reflection.parentGuidance), nextWeekPlan: clean(reflection.nextWeekPlan) } : {}),
    }),
  }, { merge: true });
  await queueGuardianNotification(teacherUid, studentId, { type: 'learning-plan', label: patch.guardianSummary?.goal || patch.weeklyReflection?.nextWeekPlan || 'Learning plan updated' });
  await activity(teacherUid, 'student-plan-updated', { studentId });
}

async function queueGuardianNotification(teacherUid, studentId, notice = {}) {
  // Resolve approvals server-side through the teacher-only reverse index, then
  // write a minimal pointer. Notifications never duplicate private teacher notes.
  try {
    const guardians = await listStudentGuardians(studentId);
    if (!guardians.length) return;
    // The guardian report already contains the only name approved for this
    // guardian-facing projection. Reuse it rather than copying teacher notes.
    const report = await getDoc(doc(db, 'guardianReports', studentId));
    const studentName = clean(report.exists() ? report.data().name : '');
    const operation = writeBatch(db);
    guardians.forEach(guardian => {
      const notificationId = id('notice');
      operation.set(doc(db, 'guardianNotifications', guardian.guardianUid, 'items', notificationId), {
        ...nowEnvelope(teacherUid, {
          notificationId,
          guardianUid: guardian.guardianUid,
          studentId,
          studentName,
          type: clean(notice.type) || 'student-update',
          targetId: clean(notice.targetId),
          subject: clean(notice.subject),
          // This is deliberately restricted to a safe navigation hint; private
          // notes and scores remain in their protected projection documents.
          label: clean(notice.label).slice(0, 140),
          readAt: null,
          createdAt: serverTimestamp(),
        }),
      });
    });
    await operation.commit();
  } catch (error) {
    // The learning record is already durable. A notification delivery problem
    // must not report a failed lesson, assessment, or plan save to the teacher.
    console.warn('Guardian notification was not queued.', error?.code || error);
  }
}

export async function addDailyLog(teacherUid, studentId, payload) {
  const subject = clean(payload.subject);
  const topic = clean(payload.topic);
  if (!subject || !topic) throw new Error('Subject and lesson topic are required.');
  const logId = id('log');
  const record = {
    ...nowEnvelope(teacherUid, {
      studentId, subject, topic, homework: clean(payload.homework), note: clean(payload.note),
      learning: Math.max(0, Math.min(5, Number(payload.learning || 0))),
      homeworkRating: Math.max(0, Math.min(5, Number(payload.homeworkRating || 0))),
      attention: Math.max(0, Math.min(5, Number(payload.attention || 0))),
      logDate: payload.logDate || new Date().toISOString().slice(0, 10),
      createdAt: serverTimestamp(),
    }),
  };
  const guardianRecord = {
    ...nowEnvelope(teacherUid, {
      studentId, subject, topic, homework: record.homework, learning: record.learning,
      homeworkRating: record.homeworkRating, attention: record.attention, logDate: record.logDate, createdAt: serverTimestamp(),
    }),
  };
  const operation = writeBatch(db);
  operation.set(doc(db, 'studentPlans', studentId, 'dailyLogs', logId), record);
  operation.set(doc(db, 'guardianReports', studentId, 'dailyLogs', logId), guardianRecord);
  await operation.commit();
  await queueGuardianNotification(teacherUid, studentId, { type: 'daily-log', targetId: logId, subject, label: topic });
  await Promise.all([activity(teacherUid, 'daily-log-added', { studentId, subject, topic, logId }), audit(teacherUid, 'daily_log_created', { studentId, logId })]);
  return { id: logId, ...record };
}

export async function listDailyLogs(studentId) {
  const result = await getDocs(query(collection(db, 'studentPlans', studentId, 'dailyLogs'), limit(250)));
  return result.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function addAssessment(teacherUid, studentId, payload) {
  const title = clean(payload.title);
  if (!title) throw new Error('Assessment title is required.');
  const assessmentId = id('assessment');
  const obtained = Number(payload.obtained ?? 0); const full = Math.max(1, Number(payload.fullMarks ?? 100));
  const record = {
    ...nowEnvelope(teacherUid, {
      studentId, title, type: clean(payload.type) || 'Custom assessment', subject: clean(payload.subject),
      fullMarks: full, passMarks: Math.max(0, Number(payload.passMarks ?? 0)), obtainedMarks: Math.max(0, obtained),
      percentage: Math.round((Math.max(0, obtained) / full) * 1000) / 10,
      feedback: clean(payload.feedback), nextTarget: clean(payload.nextTarget), sections: normaliseArray(payload.sections),
      assessmentDate: payload.assessmentDate || new Date().toISOString().slice(0, 10),
      templateSnapshot: payload.templateSnapshot || null, createdAt: serverTimestamp(),
    }),
  };
  const guardianRecord = {
    ...nowEnvelope(teacherUid, {
      studentId, title: record.title, type: record.type, subject: record.subject, fullMarks: record.fullMarks,
      passMarks: record.passMarks, obtainedMarks: record.obtainedMarks, percentage: record.percentage,
      feedback: record.feedback, nextTarget: record.nextTarget, sections: record.sections, assessmentDate: record.assessmentDate, createdAt: serverTimestamp(),
    }),
  };
  const operation = writeBatch(db);
  operation.set(doc(db, 'studentPlans', studentId, 'assessments', assessmentId), record);
  operation.set(doc(db, 'guardianReports', studentId, 'assessments', assessmentId), guardianRecord);
  await operation.commit();
  await queueGuardianNotification(teacherUid, studentId, { type: 'assessment', targetId: assessmentId, subject: record.subject, label: record.title });
  await Promise.all([activity(teacherUid, 'assessment-added', { studentId, title, assessmentId }), audit(teacherUid, 'assessment_created', { studentId, assessmentId })]);
  return { id: assessmentId, ...record };
}

export async function listAssessments(studentId) {
  const result = await getDocs(query(collection(db, 'studentPlans', studentId, 'assessments'), limit(150)));
  return result.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function createBatchRoom(teacherUid, student, teacherName) {
  if (student.roomCode) return student.roomCode;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = newRoomCode();
    const ref = doc(db, 'roomCodes', code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;
    await writeBatch(db).set(ref, {
      ...nowEnvelope(teacherUid, {
        code, type: 'student', studentId: student.id, roomName: student.name,
        teacherName: clean(teacherName) || 'Teacher', description: clean(student.roomDescription),
        accessMode: RoomAccessMode.APPROVAL, createdAt: serverTimestamp(),
      }),
    }).update(doc(db, 'students', student.id), { roomCode: code, ...nowEnvelope(teacherUid) }).commit();
    return code;
  }
  throw new Error('Could not create a unique room code.');
}

export async function createBatch(teacherUid, payload, teacherName) {
  const name = clean(payload.name);
  if (!name) throw new Error('Batch name is required.');
  const batchId = id('batch');
  const memberIds = normaliseArray(payload.memberIds);
  const record = {
    ...nowEnvelope(teacherUid, {
      name, grade: clean(payload.grade), description: clean(payload.description), teacherName: clean(teacherName) || 'Teacher',
      accessMode: payload.accessMode === RoomAccessMode.IMMEDIATE ? RoomAccessMode.IMMEDIATE : RoomAccessMode.APPROVAL,
      subjects: normaliseArray(payload.subjects).map(subject => clean(subject)).filter(Boolean), memberIds,
      sharedRoadmap: payload.sharedRoadmap || [], planMode: payload.planMode === 'template' ? 'template' : 'custom', templateSnapshot: payload.templateSnapshot || null,
      roomCode: null, notice: '', createdAt: serverTimestamp(), status: 'active',
    }),
  };
  const transaction = writeBatch(db);
  transaction.set(doc(db, 'batches', batchId), record);
  transaction.set(doc(db, 'batchSharedReports', batchId), {
    ...nowEnvelope(teacherUid, {
      batchId, name: record.name, grade: record.grade, description: record.description,
      teacherName: record.teacherName, subjects: record.subjects, sharedRoadmap: record.sharedRoadmap,
      notice: record.notice, createdAt: serverTimestamp(),
    }),
  });
  memberIds.forEach(studentId => transaction.update(doc(db, 'students', studentId), { batchIds: [...new Set([...(payload.studentBatchIds?.[studentId] || []), batchId])], ...nowEnvelope(teacherUid) }));
  await transaction.commit();
  await Promise.all([activity(teacherUid, 'batch-created', { batchId, name }), audit(teacherUid, 'batch_created', { batchId, name })]);
  return { id: batchId, ...record };
}

export async function updateBatch(teacherUid, batchId, patch) {
  await updateDoc(doc(db, 'batches', batchId), { ...patch, ...nowEnvelope(teacherUid) });
  const shared = {};
  ['name', 'grade', 'description', 'notice', 'subjects', 'sharedRoadmap'].forEach(key => {
    if (Object.prototype.hasOwnProperty.call(patch, key)) shared[key] = patch[key];
  });
  if (Object.keys(shared).length) await setDoc(doc(db, 'batchSharedReports', batchId), { ...nowEnvelope(teacherUid, { batchId, ...shared }) }, { merge: true });
  await activity(teacherUid, 'batch-updated', { batchId });
}

export async function ensureBatchRoom(teacherUid, batch) {
  if (batch.roomCode) return batch.roomCode;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = newRoomCode(); const ref = doc(db, 'roomCodes', code); const exists = await getDoc(ref);
    if (exists.exists()) continue;
    await writeBatch(db).set(ref, {
      ...nowEnvelope(teacherUid, {
        code, type: 'batch', batchId: batch.id, roomName: batch.name, teacherName: batch.teacherName || 'Teacher', description: batch.description || '',
        accessMode: batch.accessMode || RoomAccessMode.APPROVAL, createdAt: serverTimestamp(),
      }),
    }).update(doc(db, 'batches', batch.id), { roomCode: code, ...nowEnvelope(teacherUid) }).commit();
    return code;
  }
  throw new Error('Could not create a unique room code.');
}

export async function recordBatchSession(teacherUid, batchId, payload, members = []) {
  const sessionId = id('session');
  const roster = normaliseArray(payload.roster).map(entry => ({
    studentId: entry.studentId, attendance: entry.attendance || 'present', homework: entry.homework || 'not-recorded', privateNote: clean(entry.privateNote),
  }));
  const session = {
    ...nowEnvelope(teacherUid, {
      batchId, date: payload.date || new Date().toISOString().slice(0, 10), subjects: normaliseArray(payload.subjects).map(clean).filter(Boolean),
      topics: clean(payload.topics), homework: clean(payload.homework), nextPlan: clean(payload.nextPlan), notice: clean(payload.notice), resources: clean(payload.resources),
      createdAt: serverTimestamp(),
    }),
  };
  // Store the class session atomically first. Per-student projections are committed
  // separately so a 40-student batch stays within Firestore's rules access-call limits.
  const sessionWrite = writeBatch(db);
  sessionWrite.set(doc(db, 'batches', batchId, 'sessions', sessionId), session);
  sessionWrite.set(doc(db, 'batchSharedReports', batchId, 'sessions', sessionId), session);
  roster.forEach(entry => {
    sessionWrite.set(doc(db, 'batches', batchId, 'sessions', sessionId, 'entries', entry.studentId), {
      ...nowEnvelope(teacherUid, { studentId: entry.studentId, batchId, sessionId, attendance: entry.attendance, homework: entry.homework, privateNote: entry.privateNote, createdAt: serverTimestamp() }),
    });
  });
  await sessionWrite.commit();
  await Promise.all(roster.map(async entry => {
    const privateEntry = { ...nowEnvelope(teacherUid, { studentId: entry.studentId, batchId, sessionId, attendance: entry.attendance, homework: entry.homework, privateNote: entry.privateNote, createdAt: serverTimestamp() }) };
    const guardianActivity = { ...nowEnvelope(teacherUid, { studentId: entry.studentId, batchId, sessionId, source: 'batch-session', date: session.date, attendance: entry.attendance, homework: entry.homework, createdAt: serverTimestamp() }) };
    const projectionWrite = writeBatch(db);
    projectionWrite.set(doc(db, 'studentActivity', entry.studentId, 'items', `batch_${batchId}_${sessionId}`), { ...privateEntry, source: 'batch-session', date: session.date });
    projectionWrite.set(doc(db, 'guardianReports', entry.studentId, 'activity', `batch_${batchId}_${sessionId}`), guardianActivity);
    await projectionWrite.commit();
  }));
  await Promise.all([activity(teacherUid, 'batch-session-recorded', { batchId, sessionId, memberCount: members.length }), audit(teacherUid, 'batch_session_created', { batchId, sessionId })]);
  return { id: sessionId, ...session };
}

export async function listBatchSessions(batchId) {
  const result = await getDocs(query(collection(db, 'batches', batchId, 'sessions'), limit(100)));
  return result.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function lookupRoom(code) {
  const snapshot = await getDoc(doc(db, 'roomCodes', normaliseRoomCode(code)));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function createGuardianRequest(guardian, room, childName = '') {
  const guardianUid = guardian.uid;
  const requestedChildName = clean(childName);
  const isImmediateBatch = room.type === 'batch' && room.accessMode === RoomAccessMode.IMMEDIATE;
  if (isImmediateBatch && !requestedChildName) {
    await setDoc(doc(db, 'batchGuestAccess', guardianUid, 'batches', room.batchId), {
      ...nowEnvelope(room.teacherUid, {
        guardianUid, batchId: room.batchId, teacherUid: room.teacherUid, roomCode: room.id,
        roomName: room.roomName, access: 'shared-batch', grantedAt: serverTimestamp(), createdAt: serverTimestamp(),
      }),
    });
    await audit(guardianUid, 'guardian_batch_immediate_access', { guardianUid, batchId: room.batchId, teacherUid: room.teacherUid });
    return { status: 'immediate', batchId: room.batchId, roomName: room.roomName };
  }
  if (room.type === 'batch' && !requestedChildName) throw new Error('Please enter the child name for a private report request.');
  const requestId = room.type === 'student' ? `${guardianUid}_${room.id}` : `${guardianUid}_${room.id}_child`;
  const target = room.type === 'student'
    ? { studentId: room.studentId, requestType: 'student-room' }
    : { batchId: room.batchId, childName: requestedChildName, requestType: isImmediateBatch ? 'child-link' : 'batch-room-and-child-link' };
  await setDoc(doc(db, 'guardianRequests', room.teacherUid, 'requests', requestId), {
    ...nowEnvelope(room.teacherUid, {
      requestId, guardianUid, guardianName: clean(guardian.displayName) || 'Guardian', guardianEmail: clean(guardian.email).toLowerCase(),
      roomCode: room.id, roomType: room.type, roomName: room.roomName, status: 'pending', ...target,
      requestedAt: serverTimestamp(), createdAt: serverTimestamp(),
    }),
  }, { merge: true });
  await audit(guardianUid, 'guardian_request_created', { guardianUid, teacherUid: room.teacherUid, roomCode: room.id, ...target });
  return { status: 'pending', requestId };
}

export async function requestGuardianChildLink(guardian, batchId, childName) {
  const requestedChildName = clean(childName);
  if (!requestedChildName) throw new Error('Please enter the child name.');
  const access = await getDoc(doc(db, 'batchGuestAccess', guardian.uid, 'batches', batchId));
  if (!access.exists()) throw new Error('Shared batch access is not available. Enter the room code again.');
  const details = access.data();
  const teacherUid = details.teacherUid || details.updatedBy;
  if (!teacherUid) throw new Error('The room access record is incomplete. Enter the room code again.');
  const requestId = `${guardian.uid}_${batchId}_child`;
  await setDoc(doc(db, 'guardianRequests', teacherUid, 'requests', requestId), {
    ...nowEnvelope(teacherUid, {
      requestId, guardianUid: guardian.uid, guardianName: clean(guardian.displayName) || 'Guardian', guardianEmail: clean(guardian.email).toLowerCase(),
      batchId, childName: requestedChildName, roomCode: details.roomCode || '', roomType: 'batch', roomName: details.roomName || 'Batch',
      requestType: 'child-link', status: 'pending', requestedAt: serverTimestamp(), createdAt: serverTimestamp(),
    }),
  }, { merge: true });
  await audit(guardian.uid, 'guardian_child_link_requested', { guardianUid: guardian.uid, teacherUid, batchId });
  return { status: 'pending', requestId };
}

export async function approveGuardianRequest(teacherUid, request, linkedStudentId = '', linkedStudentName = '') {
  const studentId = request.studentId || linkedStudentId;
  const studentName = clean(linkedStudentName || request.studentName);
  if (!studentId) throw new Error('Choose the guardian’s child before approving the private report.');
  const operation = writeBatch(db);
  operation.set(doc(db, 'guardianApprovals', request.guardianUid, 'students', studentId), {
    ...nowEnvelope(teacherUid, { guardianUid: request.guardianUid, studentId, studentName, teacherUid, roomCode: request.roomCode, guardianName: request.guardianName, guardianEmail: request.guardianEmail, approvedAt: serverTimestamp(), createdAt: serverTimestamp() }),
  });
  operation.set(doc(db, 'studentGuardians', studentId, 'guardians', request.guardianUid), {
    ...nowEnvelope(teacherUid, { guardianUid: request.guardianUid, studentId, studentName, approvedAt: serverTimestamp(), createdAt: serverTimestamp() }),
  });
  if (request.batchId) {
    operation.set(doc(db, 'batchGuestAccess', request.guardianUid, 'batches', request.batchId), {
      ...nowEnvelope(teacherUid, { guardianUid: request.guardianUid, batchId: request.batchId, teacherUid, roomCode: request.roomCode || '', roomName: request.roomName || 'Batch', access: 'shared-batch', grantedAt: serverTimestamp(), createdAt: serverTimestamp() }),
    }, { merge: true });
  }
  operation.update(doc(db, 'guardianRequests', teacherUid, 'requests', request.id), { status: 'approved', linkedStudentId: studentId, approvedAt: serverTimestamp(), ...nowEnvelope(teacherUid) });
  await operation.commit();
  await Promise.all([audit(teacherUid, 'guardian_approved', { guardianUid: request.guardianUid, studentId }), activity(teacherUid, 'guardian-approved', { guardianName: request.guardianName })]);
}

export async function guardianBatchReport(guardianUid, batchId) {
  const access = await getDoc(doc(db, 'batchGuestAccess', guardianUid, 'batches', batchId));
  if (!access.exists()) return null;
  const [batchSnap, sessionSnap] = await Promise.all([
    getDoc(doc(db, 'batchSharedReports', batchId)),
    getDocs(query(collection(db, 'batchSharedReports', batchId, 'sessions'), limit(30))),
  ]);
  if (!batchSnap.exists()) return null;
  const batch = batchSnap.data();
  return {
    batch: { id: batchSnap.id, name: batch.name, grade: batch.grade, description: batch.description, notice: batch.notice, subjects: batch.subjects || [], sharedRoadmap: batch.sharedRoadmap || [] },
    sessions: sessionSnap.docs.map(item => ({ id: item.id, ...item.data() })),
  };
}

export async function rejectGuardianRequest(teacherUid, request) {
  await updateDoc(doc(db, 'guardianRequests', teacherUid, 'requests', request.id), { status: 'rejected', rejectedAt: serverTimestamp(), ...nowEnvelope(teacherUid) });
  await audit(teacherUid, 'guardian_rejected', { guardianUid: request.guardianUid, requestId: request.id });
}

export async function revokeGuardian(teacherUid, guardianUid, studentId) {
  const operation = writeBatch(db);
  operation.delete(doc(db, 'guardianApprovals', guardianUid, 'students', studentId));
  operation.delete(doc(db, 'studentGuardians', studentId, 'guardians', guardianUid));
  await operation.commit();
  await Promise.all([audit(teacherUid, 'guardian_revoked', { guardianUid, studentId }), activity(teacherUid, 'guardian-revoked', { studentId })]);
}

export async function guardianApprovals(guardianUid) {
  const result = await getDocs(query(collection(db, 'guardianApprovals', guardianUid, 'students'), limit(100)));
  return result.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function guardianNotifications(guardianUid) {
  const result = await getDocs(query(collection(db, 'guardianNotifications', guardianUid, 'items'), limit(100)));
  return result.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function markGuardianNotificationRead(guardianUid, notificationId) {
  await updateDoc(doc(db, 'guardianNotifications', guardianUid, 'items', notificationId), {
    readAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function guardianBatchAccess(guardianUid) {
  const result = await getDocs(query(collection(db, 'batchGuestAccess', guardianUid, 'batches'), limit(100)));
  return result.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function listStudentGuardians(studentId) {
  const result = await getDocs(query(collection(db, 'studentGuardians', studentId, 'guardians'), limit(100)));
  return result.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function guardianStudentReport(studentId) {
  const [report, logs, assessments, activityItems] = await Promise.all([
    getDoc(doc(db, 'guardianReports', studentId)),
    getDocs(query(collection(db, 'guardianReports', studentId, 'dailyLogs'), limit(60))),
    getDocs(query(collection(db, 'guardianReports', studentId, 'assessments'), limit(30))),
    getDocs(query(collection(db, 'guardianReports', studentId, 'activity'), limit(60))),
  ]);
  if (!report.exists()) return null;
  const safe = report.data();
  return {
    student: { id: report.id, name: safe.name, grade: safe.grade, roomDescription: safe.roomDescription },
    plan: { guardianSummary: safe.guardianSummary || {}, weeklyReflection: { parentGuidance: safe.parentGuidance || '', nextWeekPlan: safe.nextWeekPlan || '' }, roadmapSummary: safe.roadmapSummary || [] },
    logs: logs.docs.map(item => ({ id: item.id, ...item.data() })), assessments: assessments.docs.map(item => ({ id: item.id, ...item.data() })),
    activity: activityItems.docs.map(item => ({ id: item.id, ...item.data() })),
  };
}

export async function createOrUpdatePresence(studentId, guardianUid) {
  // Presence is deliberately minimal: it proves that an approved guardian is
  // viewing a report without exposing report contents or teacher-private data.
  await setDoc(doc(db, 'presence', studentId, 'viewers', guardianUid), {
    schemaVersion: SCHEMA_VERSION,
    studentId,
    guardianUid,
    lastSeen: serverTimestamp(),
    expiresAt: Date.now() + 180000,
  }, { merge: true });
}

export async function getStudentPresenceCount(studentId) {
  const viewers = await getDocs(query(collection(db, 'presence', studentId, 'viewers'), limit(100)));
  const now = Date.now();
  return viewers.docs.filter(item => (item.data().expiresAt || 0) > now).length;
}

export async function listAdminAccounts() {
  // This directory is intentionally account-only. Joining the role and block
  // indexes gives the super-admin operational status without querying student,
  // guardian, plan, report, or lesson data.
  const [directory, roles, blocked] = await Promise.all([
    getDocs(query(collection(db, 'userDirectory'), limit(500))),
    getDocs(query(collection(db, 'adminRoles'), limit(500))),
    getDocs(query(collection(db, 'blockedUsers'), limit(500))),
  ]);
  const administratorIds = new Set(roles.docs.filter(item => item.data().isAdmin === true).map(item => item.id));
  const blockedById = new Map(blocked.docs.map(item => [item.id, item.data()]));
  return directory.docs.map(item => ({
    id: item.id,
    ...item.data(),
    isAdmin: administratorIds.has(item.id),
    isBlocked: blockedById.has(item.id),
    blockReason: blockedById.get(item.id)?.reason || '',
  }));
}

export async function listAdminAudit() {
  const result = await getDocs(query(collection(db, 'auditLogs'), limit(100)));
  return result.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function setAccountBlocked(actorUid, account, blocked, reason = '') {
  const uid = clean(account?.uid || account?.id);
  if (!uid) throw new Error('Account identifier is required.');
  if (uid === actorUid) throw new Error('The super-admin account cannot block itself.');
  if (blocked) {
    await writeBatch(db)
      .set(doc(db, 'blockedUsers', uid), { uid, blockedByUid: actorUid, reason: clean(reason), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), schemaVersion: SCHEMA_VERSION })
      .update(doc(db, 'users', uid), { status: 'blocked', updatedAt: serverTimestamp() })
      .commit();
  } else {
    await writeBatch(db)
      .delete(doc(db, 'blockedUsers', uid))
      .update(doc(db, 'users', uid), { status: 'active', updatedAt: serverTimestamp() })
      .commit();
  }
  await audit(actorUid, blocked ? 'account_blocked' : 'account_unblocked', { targetUid: uid, reason: clean(reason) });
}

export async function setAdministratorRole(actorUid, account, isAdmin) {
  const uid = clean(account?.uid || account?.id);
  if (!uid || uid === actorUid) throw new Error('Choose a different account to change administrator access.');
  const ref = doc(db, 'adminRoles', uid);
  if (isAdmin) await setDoc(ref, { uid, isAdmin: true, assignedByUid: actorUid, updatedAt: serverTimestamp(), schemaVersion: SCHEMA_VERSION }, { merge: true });
  else await deleteDoc(ref);
  await audit(actorUid, isAdmin ? 'administrator_granted' : 'administrator_removed', { targetUid: uid });
}

export async function listCurriculumVersions(includeUnpublished = false) {
  const source = includeUnpublished
    ? query(collection(db, 'curriculumVersions'), limit(100))
    : query(collection(db, 'curriculumVersions'), where('status', '==', 'published'), limit(100));
  const result = await getDocs(source);
  return result.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function saveCurriculumVersion(actorUid, payload) {
  const versionId = payload.id || id('curriculum');
  const record = {
    ...nowEnvelope(actorUid, {
      programmeId: clean(payload.programmeId), name: clean(payload.name), academicYear: clean(payload.academicYear),
      status: payload.status || 'draft', sourceUrl: clean(payload.sourceUrl), notes: clean(payload.notes),
      createdByUid: actorUid, createdAt: payload.createdAt || serverTimestamp(), archived: payload.status === 'archived',
    }),
  };
  await setDoc(doc(db, 'curriculumVersions', versionId), record, { merge: true });
  await audit(actorUid, 'curriculum_version_saved', { versionId, status: record.status });
  return { id: versionId, ...record };
}

export async function listCurriculumBooks(versionId) {
  const result = await getDocs(query(collection(db, 'curriculumVersions', versionId, 'books'), limit(300)));
  return result.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.title || '').localeCompare(String(b.title || '')));
}

export async function listCurriculumChapters(versionId, bookId) {
  const result = await getDocs(query(collection(db, 'curriculumVersions', versionId, 'books', bookId, 'chapters'), limit(500)));
  return result.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.title || '').localeCompare(String(b.title || '')));
}

export async function saveCurriculumBook(actorUid, versionId, payload) {
  const bookId = payload.id || id('book');
  const legacyChapters = normaliseArray(payload.chapters).map((chapter, index) => ({
    id: chapter.id || id('chapter'), title: clean(chapter.title || chapter), order: Number(chapter.order ?? index + 1),
  })).filter(chapter => chapter.title);
  const record = {
    ...nowEnvelope(actorUid, {
      versionId, classLabel: clean(payload.classLabel), subject: clean(payload.subject), title: clean(payload.title),
      order: Number(payload.order || 0), status: payload.status || 'published', chapterCount: Number(payload.chapterCount ?? legacyChapters.length),
      createdAt: payload.createdAt || serverTimestamp(),
    }),
  };
  const operation = writeBatch(db);
  operation.set(doc(db, 'curriculumVersions', versionId, 'books', bookId), record, { merge: true });
  // Legacy text input is converted to separate chapter records. Existing chapters are never deleted automatically.
  legacyChapters.forEach(chapter => operation.set(doc(db, 'curriculumVersions', versionId, 'books', bookId, 'chapters', chapter.id), {
    ...nowEnvelope(actorUid, { versionId, bookId, title: chapter.title, order: chapter.order, status: 'published', createdAt: serverTimestamp() }),
  }, { merge: true }));
  await operation.commit();
  await audit(actorUid, 'curriculum_book_saved', { versionId, bookId });
  return { id: bookId, ...record };
}

export async function saveCurriculumChapter(actorUid, versionId, bookId, payload) {
  const chapterId = payload.id || id('chapter');
  const record = {
    ...nowEnvelope(actorUid, {
      versionId, bookId, title: clean(payload.title), order: Number(payload.order || 0), status: payload.status || 'published',
      objective: clean(payload.objective), suggestedTasks: normaliseArray(payload.suggestedTasks).map(clean).filter(Boolean),
      createdAt: payload.createdAt || serverTimestamp(),
    }),
  };
  await setDoc(doc(db, 'curriculumVersions', versionId, 'books', bookId, 'chapters', chapterId), record, { merge: true });
  await audit(actorUid, 'curriculum_chapter_saved', { versionId, bookId, chapterId });
  return { id: chapterId, ...record };
}

export async function setCurriculumVersionStatus(actorUid, versionId, status) {
  if (!['draft', 'published', 'archived'].includes(status)) throw new Error('Invalid curriculum version status.');
  await updateDoc(doc(db, 'curriculumVersions', versionId), {
    status, archived: status === 'archived', publishedAt: status === 'published' ? serverTimestamp() : null, ...nowEnvelope(actorUid),
  });
  await audit(actorUid, `curriculum_version_${status}`, { versionId });
}

export async function listAssessmentTemplates(ownerUid = '') {
  if (!ownerUid) {
    const result = await getDocs(query(collection(db, 'assessmentTemplates'), limit(200)));
    return result.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }
  const [globalResult, ownResult] = await Promise.all([
    getDocs(query(collection(db, 'assessmentTemplates'), where('scope', '==', 'global'), where('status', '==', 'published'), limit(200))),
    getDocs(query(collection(db, 'assessmentTemplates'), where('ownerUid', '==', ownerUid), limit(200))),
  ]);
  const unique = new Map();
  [...globalResult.docs, ...ownResult.docs].forEach(item => unique.set(item.id, { id: item.id, ...item.data() }));
  return [...unique.values()].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export async function saveAssessmentTemplate(actorUid, payload) {
  const templateId = payload.id || id('assessment');
  const record = {
    ...nowEnvelope(actorUid, {
      ownerUid: actorUid, name: clean(payload.name), scope: payload.scope === 'global' ? 'global' : 'teacher',
      programmeId: clean(payload.programmeId), classLabel: clean(payload.classLabel),
      sections: normaliseArray(payload.sections).map((section, index) => ({
        id: section.id || id('section'), name: clean(section.name || section), fullMarks: Number(section.fullMarks || 0), order: Number(section.order ?? index + 1),
      })).filter(section => section.name),
      status: payload.status || 'draft', createdAt: payload.createdAt || serverTimestamp(),
    }),
  };
  await setDoc(doc(db, 'assessmentTemplates', templateId), record, { merge: true });
  await audit(actorUid, 'assessment_template_saved', { templateId, scope: record.scope });
  return { id: templateId, ...record };
}

export async function exportTeacherData(teacherUid) {
  const [students, batches, requests, activityItems] = await Promise.all([
    listTeacherStudents(teacherUid),
    getDocs(query(collection(db, 'batches'), where('teacherUid', '==', teacherUid), limit(300))),
    getDocs(query(collection(db, 'guardianRequests', teacherUid, 'requests'), limit(300))),
    getDocs(query(collection(db, 'teacherActivity', teacherUid, 'items'), limit(300))),
  ]);
  const studentDetails = await Promise.all(students.map(async student => ({
    ...student,
    plan: await getStudentPlan(student.id),
    dailyLogs: await listDailyLogs(student.id),
    assessments: await listAssessments(student.id),
  })));
  return {
    exportVersion: 1, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), teacherUid,
    students: studentDetails, batches: batches.docs.map(item => ({ id: item.id, ...item.data() })),
    guardianRequests: requests.docs.map(item => ({ id: item.id, ...item.data() })),
    activity: activityItems.docs.map(item => ({ id: item.id, ...item.data() })),
  };
}
