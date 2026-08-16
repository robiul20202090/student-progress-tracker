import * as live from './data-service.js?v=4.8.0';

const DEMO_FLAG = 'spt-guest-mode-v1';
const DEMO_STATE_KEY = 'spt-guest-state-v1';
const DEMO_UID = 'guest-demo-teacher';
const DEMO_GUARDIAN_UID = 'guest-demo-guardian';
const DEMO_NOW = () => new Date().toISOString();
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const uid = (prefix = 'demo') => `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
const asDate = value => value?.toDate ? value.toDate() : new Date(value || 0);
const stamp = value => asDate(value).getTime() || 0;

export const SCHEMA_VERSION = live.SCHEMA_VERSION;
export const SUPER_ADMIN = live.SUPER_ADMIN;
export const RoomAccessMode = live.RoomAccessMode;
export const TaskStatus = live.TaskStatus;
export const auth = live.auth;
export const db = live.db;

export function isGuestMode() {
  try { return localStorage.getItem(DEMO_FLAG) === '1'; } catch (_) { return false; }
}

export function enableGuestMode() {
  try { localStorage.setItem(DEMO_FLAG, '1'); } catch (_) {}
}

export function disableGuestMode() {
  try { localStorage.removeItem(DEMO_FLAG); localStorage.removeItem(DEMO_STATE_KEY); } catch (_) {}
}

const defaultState = () => {
  const studentId = 'demo_student_amina';
  const batchId = 'demo_batch_sunrise';
  const plan = {
    id: studentId,
    studentId,
    teacherUid: DEMO_UID,
    roadmap: [
      { subject: 'গণিত', units: [{ title: 'ভগ্নাংশ', tasks: [{ title: 'ভগ্নাংশের ধারণা', status: 'completed' }, { title: 'যোগ ও বিয়োগ', status: 'in-progress' }] }] },
      { subject: 'বাংলা', units: [{ title: 'পাঠ বুঝে পড়া', tasks: [{ title: 'গল্পের মূলভাব', status: 'not-started' }] }] }
    ],
    weeklyReflection: { parentGuidance: 'প্রতিদিন ২০ মিনিট অনুশীলন করুন।', strengths: 'নিয়মিত অংশগ্রহণ', difficultyAreas: 'ভগ্নাংশের যোগ', nextWeekPlan: 'ভগ্নাংশের অনুশীলন শেষ করা' },
    updatedAt: DEMO_NOW()
  };
  const today = new Date();
  const day = offset => { const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
  return {
    schemaVersion: 1,
    students: [
      { id: studentId, teacherUid: DEMO_UID, name: 'আমিনা রহমান', grade: '৩য় শ্রেণি', subjects: ['গণিত', 'বাংলা'], batchIds: [batchId], guardianCount: 1, createdAt: day(-20), updatedAt: DEMO_NOW() },
      { id: 'demo_student_rahim', teacherUid: DEMO_UID, name: 'রহিম ইসলাম', grade: '৪র্থ শ্রেণি', subjects: ['ইংরেজি'], batchIds: [batchId], guardianCount: 0, createdAt: day(-14), updatedAt: DEMO_NOW() }
    ],
    batches: [{ id: batchId, teacherUid: DEMO_UID, name: 'সানরাইজ ব্যাচ', grade: '৩য়–৪র্থ শ্রেণি', description: 'সাপ্তাহিক গণিত ও বাংলা ক্লাস', memberIds: [studentId, 'demo_student_rahim'], accessMode: RoomAccessMode.APPROVAL, roomCode: 'DEMO-01-SUNRI', createdAt: day(-18), updatedAt: DEMO_NOW() }],
    rooms: { 'DEMO-01-SUNRI': { code: 'DEMO-01-SUNRI', type: 'batch', batchId, batchName: 'সানরাইজ ব্যাচ', roomName: 'সানরাইজ ব্যাচ', description: 'সাপ্তাহিক গণিত ও বাংলা ক্লাস', teacherUid: DEMO_UID, teacherName: 'ডেমো শিক্ষক', accessMode: RoomAccessMode.APPROVAL, createdAt: DEMO_NOW() } },
    plans: { [studentId]: plan },
    logs: {
      [studentId]: [
        { id: 'demo_log_1', studentId, teacherUid: DEMO_UID, subject: 'গণিত', topic: 'ভগ্নাংশ', learning: 4, homework: 'পৃষ্ঠা ১২–১৩', participation: 'ভালো', note: 'বোঝার চেষ্টা করেছে', logDate: day(-1), createdAt: day(-1) },
        { id: 'demo_log_2', studentId, teacherUid: DEMO_UID, subject: 'বাংলা', topic: 'গল্পের মূলভাব', learning: 5, homework: 'গল্পটি পড়ে আসবে', participation: 'চমৎকার', note: 'সক্রিয় ছিল', logDate: day(-2), createdAt: day(-2) },
        { id: 'demo_log_3', studentId, teacherUid: DEMO_UID, subject: 'গণিত', topic: 'সংখ্যা', learning: 3, homework: 'অনুশীলনী ৫', participation: 'আংশিক', note: '', logDate: day(-4), createdAt: day(-4) }
      ],
      'demo_student_rahim': []
    },
    assessments: { [studentId]: [{ id: 'demo_exam_1', studentId, teacherUid: DEMO_UID, title: 'মাসিক গণিত পরীক্ষা', subject: 'গণিত', marks: 80, totalMarks: 100, percentage: 80, feedback: 'ভালো অগ্রগতি', examDate: day(-3), createdAt: day(-3) }] },
    sessions: { [batchId]: [{ id: 'demo_session_1', batchId, teacherUid: DEMO_UID, date: day(-2), subjects: ['গণিত'], topics: 'ভগ্নাংশের ধারণা', homework: 'পৃষ্ঠা ১২–১৩', attendance: { [studentId]: 'present', demo_student_rahim: 'present' }, createdAt: day(-2) }] },
    requests: [],
    tasks: [{ id: 'demo_task_1', teacherUid: DEMO_UID, title: 'ভগ্নাংশের অনুশীলন দেখুন', description: 'আমিনার খাতা দেখে পরবর্তী লক্ষ্য ঠিক করুন', targetType: 'student', targetId: studentId, targetName: 'আমিনা রহমান', dueDate: day(1), status: 'not-started', createdAt: day(-1), updatedAt: DEMO_NOW() }],
    notifications: {},
    approvals: [],
    accounts: [
      { uid: DEMO_UID, email: 'demo.teacher@local.test', name: 'ডেমো শিক্ষক', status: 'active', isAdmin: true, isSuperAdmin: true, lastActiveAt: DEMO_NOW() },
      { uid: DEMO_GUARDIAN_UID, email: 'demo.guardian@local.test', name: 'ডেমো অভিভাবক', status: 'active', isAdmin: false, isSuperAdmin: false, lastActiveAt: DEMO_NOW() }
    ],
    audit: [{ id: 'demo_audit_1', actorUid: DEMO_UID, type: 'guest-mode-started', details: { note: 'Temporary local demonstration data' }, createdAt: DEMO_NOW() }],
    curriculum: [{ id: 'demo_curriculum', title: 'ডেমো প্রাথমিক পাঠক্রম', version: '2026-demo', status: 'published', updatedAt: DEMO_NOW() }],
    books: {},
    chapters: {},
    templates: [{ id: 'demo_template', title: 'সাপ্তাহিক মূল্যায়ন', ownerUid: DEMO_UID, scope: 'teacher', status: 'active', fields: ['marks', 'feedback'] }]
  };
};

let state = null;
const listeners = new Set();
function load() {
  if (state) return state;
  try { state = JSON.parse(localStorage.getItem(DEMO_STATE_KEY) || 'null'); } catch (_) { state = null; }
  if (!state || state.schemaVersion !== 1) state = defaultState();
  state.rooms ||= {};
  state.students ||= [];
  state.students.forEach(student => {
    const active = Object.values(state.rooms).find(room => room?.type === 'student' && room.studentId === student.id && room.status !== 'terminated');
    student.roomCode = active?.code || null;
  });
  return state;
}
function save() {
  try { localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(state)); } catch (_) {}
}
function notify() {
  save();
  const snapshot = load();
  listeners.forEach(handlers => {
    try {
      handlers.students?.(clone(snapshot.students));
      handlers.batches?.(clone(snapshot.batches));
      handlers.requests?.(clone(snapshot.requests));
      handlers.activity?.(clone(activityItems()));
      handlers.tasks?.(clone(snapshot.tasks));
    } catch (error) { handlers.error?.(error); }
  });
  window.dispatchEvent(new CustomEvent('spt-demo-changed'));
}
function ensure() { return load(); }
function ownStudent(studentId) { return ensure().students.find(item => item.id === studentId); }
function ownBatch(batchId) { return ensure().batches.find(item => item.id === batchId); }
function activityItems() {
  const s = ensure();
  return [...s.students.flatMap(student => (s.logs[student.id] || []).map(item => ({ ...item, type: 'daily-log', studentName: student.name }))), ...s.batches.flatMap(batch => (s.sessions[batch.id] || []).map(item => ({ ...item, type: 'batch-session', batchName: batch.name })))]
    .sort((a, b) => stamp(b.createdAt || b.logDate || b.date) - stamp(a.createdAt || a.logDate || a.date));
}
function updateAccount(uidValue, patch) { const account = ensure().accounts.find(item => item.uid === uidValue); if (account) Object.assign(account, patch, { lastActiveAt: DEMO_NOW() }); }

export function subscribeConnectionState(listener) {
  if (!isGuestMode()) return live.subscribeConnectionState(listener);
  const push = () => listener({ online: navigator.onLine !== false, demo: true });
  window.addEventListener('online', push); window.addEventListener('offline', push); push();
  return () => { window.removeEventListener('online', push); window.removeEventListener('offline', push); };
}

export async function signInWithGoogle() { return live.signInWithGoogle(); }
export async function signOutUser() {
  if (isGuestMode()) { disableGuestMode(); location.reload(); return; }
  return live.signOutUser();
}
export function subscribeAuth(callback) {
  if (!isGuestMode()) return live.subscribeAuth(callback);
  queueMicrotask(() => callback({ ...demoUser }));
  return () => {};
}
const demoUser = { uid: DEMO_UID, displayName: 'ডেমো শিক্ষক', email: 'demo.teacher@local.test', photoURL: '' };
export async function ensureProfile(user) {
  if (!isGuestMode()) return live.ensureProfile(user);
  const s = ensure(); updateAccount(user.uid, { lastActiveAt: DEMO_NOW() }); save();
  return { uid: DEMO_UID, email: demoUser.email, name: 'ডেমো শিক্ষক', role: 'teacher', status: 'active', schemaVersion: s.schemaVersion };
}
export async function getRoles(user) {
  if (!isGuestMode()) return live.getRoles(user);
  return { isAdmin: true, isSuperAdmin: true, isTeacher: true, isGuardian: true };
}
export async function audit(actorUid, type, details = {}) { if (!isGuestMode()) return live.audit(actorUid, type, details); ensure().audit.unshift({ id: uid('audit'), actorUid, type, details, createdAt: DEMO_NOW() }); save(); return true; }
export async function activity(teacherUid, type, details = {}) { if (!isGuestMode()) return live.activity(teacherUid, type, details); ensure().audit.unshift({ id: uid('activity'), actorUid: teacherUid, type, details, createdAt: DEMO_NOW() }); notify(); return true; }

export function subscribeTeacherWorkspace(teacherUid, handlers = {}) {
  if (!isGuestMode()) return live.subscribeTeacherWorkspace(teacherUid, handlers);
  const push = () => { const s = ensure(); handlers.students?.(clone(s.students)); handlers.batches?.(clone(s.batches)); handlers.requests?.(clone(s.requests)); handlers.activity?.(clone(activityItems())); handlers.tasks?.(clone(s.tasks)); };
  listeners.add(handlers); push();
  const onChange = () => push(); window.addEventListener('spt-demo-changed', onChange);
  return () => { listeners.delete(handlers); window.removeEventListener('spt-demo-changed', onChange); };
}

export async function createTeacherTask(teacherUid, payload = {}) {
  if (!isGuestMode()) return live.createTeacherTask(teacherUid, payload);
  const s = ensure(); const target = payload.targetId ? ownStudent(payload.targetId) || ownBatch(payload.targetId) : null;
  const task = { id: uid('task'), teacherUid, title: String(payload.title || 'নতুন কাজ'), description: String(payload.description || ''), targetType: payload.targetType || 'student', targetId: payload.targetId || '', targetName: payload.targetName || target?.name || '', dueDate: payload.dueDate || new Date().toISOString().slice(0, 10), status: payload.status || 'not-started', createdAt: DEMO_NOW(), updatedAt: DEMO_NOW() };
  s.tasks.unshift(task); notify(); return clone(task);
}
export async function updateTeacherTask(teacherUid, taskId, patch = {}) {
  if (!isGuestMode()) return live.updateTeacherTask(teacherUid, taskId, patch);
  const task = ensure().tasks.find(item => item.id === taskId); if (!task) return null; Object.assign(task, patch, { updatedAt: DEMO_NOW() }); notify(); return clone(task);
}

export async function listTeacherStudents(teacherUid) { return isGuestMode() ? clone(ensure().students) : live.listTeacherStudents(teacherUid); }
export async function createStudent(teacherUid, payload = {}) {
  if (!isGuestMode()) return live.createStudent(teacherUid, payload);
  const student = { id: uid('student'), teacherUid, name: String(payload.name || 'নতুন শিক্ষার্থী'), grade: payload.grade || '', subjects: payload.subjects || [], batchIds: payload.batchIds || [], guardianCount: 0, createdAt: DEMO_NOW(), updatedAt: DEMO_NOW(), ...payload };
  ensure().students.unshift(student); ensure().logs[student.id] = []; ensure().assessments[student.id] = []; ensure().plans[student.id] = { id: student.id, studentId: student.id, teacherUid, roadmap: [], weeklyReflection: {}, updatedAt: DEMO_NOW() }; notify(); return clone(student);
}
export async function updateStudent(teacherUid, studentId, patch = {}) { if (!isGuestMode()) return live.updateStudent(teacherUid, studentId, patch); const student = ownStudent(studentId); if (!student) return null; Object.assign(student, patch, { updatedAt: DEMO_NOW() }); notify(); return clone(student); }
export async function getStudentPlan(studentId) { return isGuestMode() ? clone(ensure().plans[studentId] || { id: studentId, studentId, teacherUid: DEMO_UID, roadmap: [], weeklyReflection: {} }) : live.getStudentPlan(studentId); }
export async function saveStudentPlan(teacherUid, studentId, patch = {}) { if (!isGuestMode()) return live.saveStudentPlan(teacherUid, studentId, patch); const s = ensure(); s.plans[studentId] = { ...(s.plans[studentId] || { id: studentId, studentId, teacherUid }), ...clone(patch), updatedAt: DEMO_NOW() }; notify(); return clone(s.plans[studentId]); }
export async function addDailyLog(teacherUid, studentId, payload = {}) { if (!isGuestMode()) return live.addDailyLog(teacherUid, studentId, payload); const item = { id: uid('log'), studentId, teacherUid, ...clone(payload), createdAt: DEMO_NOW(), updatedAt: DEMO_NOW() }; ensure().logs[studentId] ||= []; ensure().logs[studentId].unshift(item); notify(); return clone(item); }
export async function listDailyLogs(studentId) { return isGuestMode() ? clone(ensure().logs[studentId] || []) : live.listDailyLogs(studentId); }
export async function addAssessment(teacherUid, studentId, payload = {}) { if (!isGuestMode()) return live.addAssessment(teacherUid, studentId, payload); const total = Number(payload.totalMarks || payload.total || 0); const marks = Number(payload.marks || 0); const item = { id: uid('assessment'), studentId, teacherUid, ...clone(payload), percentage: total ? Math.round(marks / total * 100) : Number(payload.percentage || 0), createdAt: DEMO_NOW(), updatedAt: DEMO_NOW() }; ensure().assessments[studentId] ||= []; ensure().assessments[studentId].unshift(item); notify(); return clone(item); }
export async function listAssessments(studentId) { return isGuestMode() ? clone(ensure().assessments[studentId] || []) : live.listAssessments(studentId); }

export async function createBatchRoom(teacherUid, student, teacherName = 'ডেমো শিক্ষক') {
  if (!isGuestMode()) return live.createBatchRoom(teacherUid, student, teacherName);
  const store = ensure();
  const current = store.students.find(item => item.id === student?.id);
  if (!current) return '';
  const active = Object.values(store.rooms).find(room => room?.type === 'student' && room.studentId === current.id && room.status !== 'terminated');
  if (active) { current.roomCode = active.code; save(); return active.code; }
  const code = `DEMO-${String(Math.floor(Math.random() * 90) + 10)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  current.roomCode = code;
  current.updatedAt = DEMO_NOW();
  store.rooms[code] = { code, type: 'student', studentId: current.id, roomName: current.name, teacherUid, teacherName, description: 'ডেমো শিক্ষার্থী রুম', accessMode: RoomAccessMode.APPROVAL, createdAt: DEMO_NOW() };
  save();
  notify(); return code;
}
export async function terminateStudentRoom(teacherUid, student) {
  if (!isGuestMode()) return live.terminateStudentRoom(teacherUid, student);
  const store = ensure();
  const current = store.students.find(item => item.id === student?.id);
  const code = student?.roomCode || current?.roomCode || Object.keys(store.rooms).find(key => {
    const room = store.rooms[key];
    return room?.type === 'student' && room?.studentId === student?.id && room?.status !== 'terminated';
  });
  Object.values(store.rooms).forEach(room => {
    if (room?.type === 'student' && room.studentId === student?.id && room.status !== 'terminated') room.status = 'terminated';
  });
  if (current) current.roomCode = null;
  notify();
}
export async function createBatch(teacherUid, payload = {}, teacherName = 'ডেমো শিক্ষক') {
  if (!isGuestMode()) return live.createBatch(teacherUid, payload, teacherName);
  const batch = { id: uid('batch'), teacherUid, memberIds: [], accessMode: RoomAccessMode.APPROVAL, roomCode: '', createdAt: DEMO_NOW(), updatedAt: DEMO_NOW(), ...clone(payload) };
  ensure().batches.unshift(batch); ensure().sessions[batch.id] = []; notify(); return clone(batch);
}
export async function updateBatch(teacherUid, batchId, patch = {}) { if (!isGuestMode()) return live.updateBatch(teacherUid, batchId, patch); const batch = ownBatch(batchId); if (!batch) return null; Object.assign(batch, patch, { updatedAt: DEMO_NOW() }); notify(); return clone(batch); }
export async function ensureBatchRoom(teacherUid, batch) {
  if (!isGuestMode()) return live.ensureBatchRoom(teacherUid, batch);
  const s = ensure(); const current = s.batches.find(item => item.id === batch.id); if (!current) return ''; if (current.roomCode && s.rooms[current.roomCode]) return current.roomCode;
  const code = `DEMO-${String(Math.floor(Math.random() * 90) + 10)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  current.roomCode = code; current.updatedAt = DEMO_NOW(); s.rooms[code] = { code, type: 'batch', batchId: current.id, batchName: current.name, roomName: current.name, description: current.description || 'ডেমো ব্যাচ রুম', teacherUid, teacherName: 'ডেমো শিক্ষক', accessMode: current.accessMode || RoomAccessMode.APPROVAL, createdAt: DEMO_NOW() }; notify(); return code;
}
export async function recordBatchSession(teacherUid, batchId, payload = {}, members = []) { if (!isGuestMode()) return live.recordBatchSession(teacherUid, batchId, payload, members); const item = { id: uid('session'), batchId, teacherUid, ...clone(payload), members, createdAt: DEMO_NOW() }; ensure().sessions[batchId] ||= []; ensure().sessions[batchId].unshift(item); notify(); return clone(item); }
export async function listBatchSessions(batchId) { return isGuestMode() ? clone(ensure().sessions[batchId] || []) : live.listBatchSessions(batchId); }
export async function lookupRoom(code) { if (!isGuestMode()) return live.lookupRoom(code); const normalized = String(code || '').trim().toUpperCase(); return clone(ensure().rooms[normalized] || null); }

export async function createGuardianRequest(guardian, room, childName = '') { if (!isGuestMode()) return live.createGuardianRequest(guardian, room, childName); const request = { id: uid('request'), guardianUid: guardian.uid || DEMO_GUARDIAN_UID, guardianEmail: guardian.email || 'demo.guardian@local.test', teacherUid: room.teacherUid, roomCode: room.code, roomType: room.type, batchId: room.batchId || '', studentId: room.studentId || '', childName, status: 'pending', createdAt: DEMO_NOW() }; ensure().requests.unshift(request); notify(); return clone(request); }
export async function requestGuardianChildLink(guardian, batchId, childName = '') { if (!isGuestMode()) return live.requestGuardianChildLink(guardian, batchId, childName); const batch = ownBatch(batchId); const request = { id: uid('request'), guardianUid: guardian.uid || DEMO_GUARDIAN_UID, guardianEmail: guardian.email || 'demo.guardian@local.test', teacherUid: batch?.teacherUid || DEMO_UID, roomType: 'batch', batchId, childName, status: 'pending', createdAt: DEMO_NOW() }; ensure().requests.unshift(request); notify(); return clone(request); }
export async function approveGuardianRequest(teacherUid, request, linkedStudentId = '', linkedStudentName = '') { if (!isGuestMode()) return live.approveGuardianRequest(teacherUid, request, linkedStudentId, linkedStudentName); const item = ensure().requests.find(x => x.id === request.id); if (item) Object.assign(item, { status: 'approved', studentId: linkedStudentId || item.studentId, studentName: linkedStudentName || item.childName }); ensure().approvals.push({ guardianUid: request.guardianUid, studentId: linkedStudentId || request.studentId, studentName: linkedStudentName || request.childName, teacherUid }); notify(); return clone(item || request); }
export async function rejectGuardianRequest(teacherUid, request) { if (!isGuestMode()) return live.rejectGuardianRequest(teacherUid, request); const item = ensure().requests.find(x => x.id === request.id); if (item) Object.assign(item, { status: 'rejected', updatedAt: DEMO_NOW() }); notify(); return clone(item || request); }
export async function revokeGuardian(teacherUid, guardianUid, studentId) { if (!isGuestMode()) return live.revokeGuardian(teacherUid, guardianUid, studentId); ensure().approvals = ensure().approvals.filter(x => !(x.guardianUid === guardianUid && x.studentId === studentId)); notify(); return true; }
export async function guardianApprovals(guardianUid) { return isGuestMode() ? clone(ensure().approvals.filter(x => x.guardianUid === guardianUid)) : live.guardianApprovals(guardianUid); }
export async function guardianBatchAccess(guardianUid) { return isGuestMode() ? [] : live.guardianBatchAccess(guardianUid); }
export async function guardianStudentReport(studentId) { if (!isGuestMode()) return live.guardianStudentReport(studentId); const student = ownStudent(studentId); return student ? { student: clone(student), plan: clone(ensure().plans[studentId]), logs: clone(ensure().logs[studentId] || []), assessments: clone(ensure().assessments[studentId] || []) } : null; }
export async function guardianBatchReport(guardianUid, batchId) { if (!isGuestMode()) return live.guardianBatchReport(guardianUid, batchId); const batch = ownBatch(batchId); return batch ? { batch: clone(batch), sessions: clone(ensure().sessions[batchId] || []) } : null; }
export async function createOrUpdatePresence(studentId, guardianUid) { if (!isGuestMode()) return live.createOrUpdatePresence(studentId, guardianUid); return { studentId, guardianUid, lastSeen: DEMO_NOW() }; }
export async function getStudentPresenceCount(studentId) { return isGuestMode() ? 1 : live.getStudentPresenceCount(studentId); }

export async function guardianNotifications(guardianUid) { return isGuestMode() ? clone(ensure().notifications[guardianUid] || []) : live.guardianNotifications(guardianUid); }
export async function markGuardianNotificationRead(guardianUid, notificationId) { if (!isGuestMode()) return live.markGuardianNotificationRead(guardianUid, notificationId); const item = (ensure().notifications[guardianUid] || []).find(x => x.id === notificationId); if (item) item.readAt = DEMO_NOW(); notify(); return clone(item); }
export async function queueGuardianNotification(...args) { if (!isGuestMode()) return live.queueGuardianNotification?.(...args); return true; }

export async function listAdminAccounts() { return isGuestMode() ? clone(ensure().accounts) : live.listAdminAccounts(); }
export async function listAdminAudit() { return isGuestMode() ? clone(ensure().audit) : live.listAdminAudit(); }
export async function setAccountBlocked(actorUid, account, blocked, reason = '') { if (!isGuestMode()) return live.setAccountBlocked(actorUid, account, blocked, reason); const item = ensure().accounts.find(x => x.uid === account.uid); if (item) Object.assign(item, { status: blocked ? 'blocked' : 'active', blockReason: reason, updatedAt: DEMO_NOW() }); await audit(actorUid, blocked ? 'account-blocked' : 'account-unblocked', { targetUid: account.uid }); notify(); return clone(item || account); }
export async function setAdministratorRole(actorUid, account, isAdmin) { if (!isGuestMode()) return live.setAdministratorRole(actorUid, account, isAdmin); const item = ensure().accounts.find(x => x.uid === account.uid); if (item) item.isAdmin = Boolean(isAdmin); await audit(actorUid, isAdmin ? 'admin-granted' : 'admin-removed', { targetUid: account.uid }); notify(); return clone(item || account); }

export async function listCurriculumVersions(includeUnpublished = false) { return isGuestMode() ? clone(ensure().curriculum.filter(x => includeUnpublished || x.status === 'published')) : live.listCurriculumVersions(includeUnpublished); }
export async function saveCurriculumVersion(actorUid, payload) { if (!isGuestMode()) return live.saveCurriculumVersion(actorUid, payload); const item = { id: payload.id || uid('curriculum'), ...clone(payload), updatedAt: DEMO_NOW() }; ensure().curriculum = [item, ...ensure().curriculum.filter(x => x.id !== item.id)]; notify(); return clone(item); }
export async function listCurriculumBooks(versionId) { return isGuestMode() ? clone(ensure().books[versionId] || []) : live.listCurriculumBooks(versionId); }
export async function listCurriculumChapters(versionId, bookId) { return isGuestMode() ? clone(ensure().chapters[`${versionId}_${bookId}`] || []) : live.listCurriculumChapters(versionId, bookId); }
export async function saveCurriculumBook(actorUid, versionId, payload) { if (!isGuestMode()) return live.saveCurriculumBook(actorUid, versionId, payload); const item = { id: payload.id || uid('book'), ...clone(payload) }; ensure().books[versionId] ||= []; ensure().books[versionId] = [item, ...ensure().books[versionId].filter(x => x.id !== item.id)]; notify(); return clone(item); }
export async function saveCurriculumChapter(actorUid, versionId, bookId, payload) { if (!isGuestMode()) return live.saveCurriculumChapter(actorUid, versionId, bookId, payload); const key = `${versionId}_${bookId}`; const item = { id: payload.id || uid('chapter'), ...clone(payload) }; ensure().chapters[key] ||= []; ensure().chapters[key] = [item, ...ensure().chapters[key].filter(x => x.id !== item.id)]; notify(); return clone(item); }
export async function setCurriculumVersionStatus(actorUid, versionId, status) { if (!isGuestMode()) return live.setCurriculumVersionStatus(actorUid, versionId, status); const item = ensure().curriculum.find(x => x.id === versionId); if (item) item.status = status; notify(); return clone(item); }
export async function listAssessmentTemplates(ownerUid = '') { return isGuestMode() ? clone(ensure().templates.filter(x => !ownerUid || x.ownerUid === ownerUid || x.scope === 'global')) : live.listAssessmentTemplates(ownerUid); }
export async function saveAssessmentTemplate(actorUid, payload) { if (!isGuestMode()) return live.saveAssessmentTemplate(actorUid, payload); const item = { id: payload.id || uid('template'), ownerUid: actorUid, scope: 'teacher', ...clone(payload), updatedAt: DEMO_NOW() }; ensure().templates = [item, ...ensure().templates.filter(x => x.id !== item.id)]; notify(); return clone(item); }
export async function exportTeacherData(teacherUid) { if (!isGuestMode()) return live.exportTeacherData(teacherUid); return clone(ensure()); }

export function resetGuestData() {
  if (!isGuestMode()) return;
  state = defaultState(); save(); notify();
}

export const newRoomCode = live.newRoomCode;
export const normaliseRoomCode = live.normaliseRoomCode;
export const id = live.id;
export const listStudentGuardians = live.listStudentGuardians;
export const listStudentPlans = live.listStudentPlans;
export const setLanguage = live.setLanguage;
