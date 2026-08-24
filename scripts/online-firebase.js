/* Online teacher sync and guardian portal: local-first data, teacher-approved device access, and no guardian edits. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, updateDoc, getDocs, query, where, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const config = { apiKey: 'AIzaSyD7Qg8QLnIIhmSAyJUQUkDkgjvVH0nfXbo', authDomain: 'educational-progress--v3.firebaseapp.com', projectId: 'educational-progress--v3', storageBucket: 'educational-progress--v3.firebasestorage.app', messagingSenderId: '968211421497', appId: '1:968211421497:web:32e1665aeb6c09b09170e8' };
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const ACCESS_INDEX_KEY = 'spt-guardian-access-index-v2';
const PORTAL_LANGUAGE_KEY = 'spt-guardian-locale-v2';
let user = null;
let syncTimer = null;
let stopTeacherSnapshot = null;
let stopGuardianRequest = null;
let cloudState = { kind: 'offline', message: '', errorCode: '' };

const safe = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const randomId = prefix => `${prefix}${crypto.getRandomValues(new Uint32Array(3)).join('').replace(/\D/g, '').slice(0, 24)}`;
const dashboard = () => window.SPTDashboard;
const toast = (message, kind = 'success') => dashboard()?.toast?.(message, kind);
const teacherLocale = () => window.SPTLocale?.get?.() || 'bn';
const workspaceKey = id => `scholastic-ledger.workspace.${id}.v1`;
const full = () => dashboard()?.fullExport?.() || null;
const t = (lang, key) => ({
  bn: {
    online: 'অনলাইন শিক্ষক', signin: 'Google দিয়ে সাইন-ইন', signout: 'সাইন-আউট', synced: 'ক্লাউড ব্যাকআপ প্রস্তুত', saving: 'ক্লাউডে সংরক্ষণ হচ্ছে…', failed: 'ক্লাউড সিঙ্ক ব্যর্থ হয়েছে',
    room: 'অভিভাবক রুম', create: 'রুম তৈরি করুন', share: 'অভিভাবক HTML শেয়ার', request: 'অনুমতি অনুরোধ', waiting: 'শিক্ষকের অনুমোদনের অপেক্ষায়',
    latest: 'সর্বশেষ হালনাগাদ', viewOnly: 'শুধু দেখার জন্য', children: 'আমার শিক্ষার্থীরা', back: 'আমার শিক্ষার্থীদের কাছে ফিরুন',
    weekly: 'সাপ্তাহিক রিপোর্ট', routine: 'রুটিন', checklist: 'চেকলিস্ট', progress: 'সিলেবাস অগ্রগতি', exams: 'পরীক্ষার ফলাফল', updates: 'সাম্প্রতিক জানানো',
    noAccess: 'এই মুহূর্তে কোনো সক্রিয় শিক্ষার্থী-অ্যাক্সেস নেই। প্রয়োজন হলে শিক্ষকের সঙ্গে যোগাযোগ করুন বা নতুন অনুরোধ পাঠান।',
    pending: 'অনুরোধ পাঠানো হয়েছে। শিক্ষক অনুমোদন দিলে এই ব্রাউজারে শিক্ষার্থীর অগ্রগতি দেখা যাবে।',
    rejected: 'এই মুহূর্তে কোনো সক্রিয় শিক্ষার্থী-অ্যাক্সেস নেই। প্রয়োজন হলে শিক্ষকের সঙ্গে যোগাযোগ করুন বা নতুন অনুরোধ পাঠান।',
    name: 'অভিভাবকের নাম', help: 'এই অনুমতি শুধু বর্তমান ব্রাউজার ও ডিভাইসের জন্য। ব্রাউজার/ডিভাইস বদলালে বা ব্রাউজারের ডেটা মুছলে আবার অনুমতি চাইতে হবে।',
    week: 'সপ্তাহ', month: 'মাস', openReport: 'সেই সাপ্তাহিক রিপোর্ট দেখুন', newUpdate: 'নতুন জানানো', older: 'পুরোনো জানানো', noData: 'এখনও কোনো তথ্য যোগ করা হয়নি।',
    privacy: 'এই তথ্যটি শুধু দেখার জন্য। কোনো তথ্য যোগ, পরিবর্তন, মুছা বা প্রিন্ট করার শিক্ষক-নিয়ন্ত্রণ এখানে নেই।',
    clear: 'নতুন কোনো সতর্কতা নেই', concern: 'অভিভাবকের জন্য সতর্কতা'
  },
  en: {
    online: 'Online teacher', signin: 'Sign in with Google', signout: 'Sign out', synced: 'Cloud backup ready', saving: 'Saving to cloud…', failed: 'Cloud sync failed',
    room: 'Guardian room', create: 'Create room', share: 'Share guardian HTML', request: 'Request access', waiting: 'Waiting for teacher approval',
    latest: 'Last updated', viewOnly: 'View only', children: 'My students', back: 'Back to my children',
    weekly: 'Weekly report', routine: 'Routine', checklist: 'Checklist', progress: 'Syllabus progress', exams: 'Exam results', updates: 'Recent updates',
    noAccess: 'There is no active student access on this device. Contact the teacher or submit a new request if needed.',
    pending: 'Your request was sent. This browser will show the student after teacher approval.',
    rejected: 'There is no active student access on this device. Contact the teacher or submit a new request if needed.',
    name: 'Guardian name', help: 'This permission belongs only to this browser and device. A new browser/device or cleared browser data requires another request.',
    week: 'Week', month: 'Month', openReport: 'Open that weekly report', newUpdate: 'new update', older: 'Older updates', noData: 'No record has been added yet.',
    privacy: 'This is view-only. It has no teacher controls to add, edit, delete, apply, or print data.',
    clear: 'There are no new alerts', concern: 'Guardian attention notice'
  }
}[lang][key] || key);
const dateText = (value, lang) => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'bn-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value || Date.now()));
const avatarUrl = student => student?.avatarId ? `assets/avatars/${student.avatarId}.webp` : '';
const concernLabels = (tags, lang) => {
  const labels = {
    'homework-not-done': ['হোমওয়ার্ক হয়নি', 'Homework not done'], 'homework-partial': ['হোমওয়ার্ক আংশিক', 'Homework partly done'],
    'attention-none': ['মনোযোগ নেই', 'No attention'], 'attention-partial': ['আংশিক মনোযোগ', 'Partial attention'],
    'progress-none': ['অগ্রগতি হয়নি', 'No progress'], 'progress-partial': ['আংশিক অগ্রগতি', 'Partial progress']
  };
  return (tags || []).filter(tag => tag !== 'homework-not-assigned').map(tag => labels[tag]?.[lang === 'en' ? 1 : 0] || tag);
};
const validConcern = entry => Boolean(entry?.notifyGuardian && concernLabels(entry.statuses || [], 'bn').length);
const scoreLabel = (score, lang) => {
  if (score === null || score === undefined || score === '') return '—';
  const numeric = Number(score);
  const words = lang === 'en' ? (numeric <= 1 ? 'Needs attention' : numeric <= 3 ? 'Fair' : 'Good') : (numeric <= 1 ? 'আরও মনোযোগ প্রয়োজন' : numeric <= 3 ? 'মোটামুটি' : 'ভালো');
  return `${numeric}/5 · ${words}`;
};
const readRoutines = () => { try { return JSON.parse(localStorage.getItem('scholastic-ledger.teacher-routines.v1') || '[]'); } catch { return []; } };

function deriveUpdates(workspace) {
  const updates = [];
  (workspace?.months || []).forEach(month => (month.weeks || []).forEach((weekKey, index) => {
    (workspace.weeks?.[weekKey] || []).filter(validConcern).forEach(entry => updates.push({
      id: `${month.id || month.name}:${weekKey}:${entry.id}`,
      monthId: month.id, monthName: month.name, weekKey, weekIndex: index, day: entry.day, subject: entry.subject,
      tags: (entry.statuses || []).filter(tag => tag !== 'homework-not-assigned'), note: entry.comment || ''
    }));
  }));
  return updates.reverse();
}

function publicSnapshot(studentId) {
  const backup = full();
  const student = backup?.dashboard?.students?.find(item => item.id === studentId);
  const workspace = backup?.workspaces?.[studentId];
  if (!student || !workspace) return null;
  const safeWorkspace = {
    activeRoutineId: workspace.activeRoutineId || '', activeMonthId: workspace.activeMonthId || '', months: workspace.months || [],
    weeks: Object.fromEntries(Object.entries(workspace.weeks || {}).map(([key, entries]) => [key, (entries || []).map(entry => ({ id: entry.id, day: entry.day, subject: entry.subject, topic: entry.topic, academic: entry.academic, homework: entry.homework, attention: entry.attention, statuses: entry.statuses || [] }))])),
    checklist: workspace.checklist || [],
    exams: (workspace.exams || []).map(exam => ({ id: exam.id, title: exam.title, date: exam.date, status: exam.status, subjects: (exam.subjects || []).map(subject => ({ id: subject.id, name: subject.name, obtained: subject.obtained, full: subject.full })) })),
    routines: readRoutines()
  };
  return {
    student: { id: student.id, name: student.name, grade: student.grade || '', school: student.school || '', group: student.group || '', subjects: student.subjects || [], avatarId: student.avatarId || '' },
    workspace: safeWorkspace, updates: deriveUpdates(safeWorkspace), updatedAt: new Date().toISOString()
  };
}

function contactFooter() { return '<footer class="guardian-contact-note">সর্বশেষ তথ্য শিক্ষকের সংরক্ষিত অনলাইন আপডেট থেকে দেখানো হচ্ছে।</footer>'; }
function nodeSummary(node) {
  const child = (node.children || []).reduce((sum, item) => { const next = nodeSummary(item); return { done: sum.done + next.done, total: sum.total + next.total }; }, { done: 0, total: 0 });
  const boxes = node.boxes || [];
  return { done: child.done + boxes.filter(box => box.done).length + (node.done ? 1 : 0), total: child.total + boxes.length + 1 };
}
function topicSummary(topic) {
  const child = (topic.subtopics || []).reduce((sum, item) => { const next = nodeSummary(item); return { done: sum.done + next.done, total: sum.total + next.total }; }, { done: 0, total: 0 });
  const boxes = topic.boxes || [];
  return { done: child.done + boxes.filter(box => box.done).length + (topic.done ? 1 : 0), total: child.total + boxes.length + 1 };
}
function checklistNode(node) {
  const summary = nodeSummary(node);
  return `<details class="guardian-check-node"><summary><span>${safe(node.name)}</span><b>${summary.done}/${summary.total}</b></summary><div class="guardian-box-row">${(node.boxes || []).map((box, index) => `<i class="${box.done ? 'done' : ''}">${box.done ? '✓' : index + 1}</i>`).join('') || '<em>—</em>'}</div>${(node.children || []).map(checklistNode).join('')}</details>`;
}
function checklistHtml(snapshot, lang) {
  const list = snapshot.workspace?.checklist || [];
  if (!list.length) return `<p class="guardian-empty">${t(lang, 'noData')}</p>`;
  return list.map(subject => {
    const totals = (subject.topics || []).reduce((sum, topic) => { const next = topicSummary(topic); return { done: sum.done + next.done, total: sum.total + next.total }; }, { done: 0, total: 0 });
    return `<details class="guardian-subject" open><summary><span>${safe(subject.name)}</span><b>${totals.done}/${totals.total}</b></summary>${(subject.topics || []).map(topic => { const summary = topicSummary(topic); return `<details class="guardian-topic"><summary><span>${safe(topic.name)}</span><b>${summary.done}/${summary.total}</b></summary><div class="guardian-box-row">${(topic.boxes || []).map((box, index) => `<i class="${box.done ? 'done' : ''}">${box.done ? '✓' : index + 1}</i>`).join('')}${(topic.boxes || []).length ? '' : '<em>—</em>'}</div>${(topic.subtopics || []).map(checklistNode).join('')}</details>`; }).join('')}</details>`;
  }).join('');
}
function progressHtml(snapshot, lang) {
  const list = snapshot.workspace?.checklist || [];
  if (!list.length) return `<p class="guardian-empty">${t(lang, 'noData')}</p>`;
  return list.map(subject => {
    const totals = (subject.topics || []).reduce((sum, topic) => { const next = topicSummary(topic); return { done: sum.done + next.done, total: sum.total + next.total }; }, { done: 0, total: 0 });
    const percent = totals.total ? Math.round(totals.done / totals.total * 100) : 0;
    return `<article class="guardian-progress-card"><div><strong>${safe(subject.name)}</strong><span>${totals.done}/${totals.total} · ${percent}%</span></div><i><b style="width:${percent}%"></b></i></article>`;
  }).join('');
}
function routineHtml(snapshot, lang) {
  const space = snapshot.workspace || {}, routine = (space.routines || []).find(item => item.id === space.activeRoutineId) || (space.routines || [])[0];
  if (!routine) return `<p class="guardian-empty">${t(lang, 'noData')}</p>`;
  return `<article class="guardian-routine-card"><h3>${safe(routine.name)}</h3><div class="guardian-routine-grid">${Object.entries(routine.days || {}).map(([day, subjects]) => `<div><b>${safe(day)}</b><span>${(subjects || []).map(safe).join(' · ') || '—'}</span></div>`).join('')}</div></article>`;
}
function examsHtml(snapshot, lang) {
  const exams = snapshot.workspace?.exams || [];
  if (!exams.length) return `<p class="guardian-empty">${t(lang, 'noData')}</p>`;
  return exams.map(exam => `<details class="guardian-sheet-card"><summary><span>${safe(exam.title)} · ${safe(exam.date || '')}</span><b>${safe(exam.status || '')}</b></summary><div class="guardian-table-scroll"><table><thead><tr><th>${lang === 'en' ? 'Subject' : 'বিষয়'}</th><th>${lang === 'en' ? 'Result' : 'ফলাফল'}</th></tr></thead><tbody>${(exam.subjects || []).map(subject => `<tr><td>${safe(subject.name)}</td><td>${safe(subject.obtained)}/${safe(subject.full)}</td></tr>`).join('')}</tbody></table></div></details>`).join('');
}
function weeklyHtml(snapshot, monthId, weekKey, lang) {
  const months = snapshot.workspace?.months || [], month = months.find(item => item.id === monthId) || months[months.length - 1], chosen = weekKey || month?.weeks?.[month.weeks.length - 1];
  const entries = snapshot.workspace?.weeks?.[chosen] || [], weekIndex = Math.max(0, month?.weeks?.indexOf(chosen) ?? 0);
  const scores = entries.flatMap(entry => [entry.academic, entry.homework, entry.attention]).filter(value => value !== null && value !== undefined && value !== '').map(Number);
  const average = scores.length ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10 : null;
  return `<section class="guardian-week-head"><div><p>${safe(month?.name || '')} · ${t(lang, 'week')} ${weekIndex + 1}</p><h3>${lang === 'en' ? 'Saved weekly learning record' : 'সংরক্ষিত সাপ্তাহিক শেখার রেকর্ড'}</h3></div>${average === null ? '' : `<span class="guardian-score-summary">${scoreLabel(average, lang)}</span>`}</section><div class="guardian-table-scroll"><table class="guardian-week-table"><thead><tr><th>${lang === 'en' ? 'Day' : 'দিন'}</th><th>${lang === 'en' ? 'Subject' : 'বিষয়'}</th><th>${lang === 'en' ? 'Topic' : 'আজকের টপিক'}</th><th>${lang === 'en' ? 'Academic' : 'একাডেমিক'}</th><th>${lang === 'en' ? 'Homework' : 'হোমওয়ার্ক'}</th><th>${lang === 'en' ? 'Attention' : 'মনোযোগ'}</th></tr></thead><tbody>${entries.map(entry => `<tr><td>${safe(entry.day)}</td><td>${safe(entry.subject)}</td><td>${safe(entry.topic || '—')}</td><td><span class="guardian-score tone-${Number(entry.academic) <= 1 ? 'red' : Number(entry.academic) <= 3 ? 'amber' : 'green'}">${safe(scoreLabel(entry.academic, lang))}</span></td><td><span class="guardian-score tone-${Number(entry.homework) <= 1 ? 'red' : Number(entry.homework) <= 3 ? 'amber' : 'green'}">${safe(scoreLabel(entry.homework, lang))}</span></td><td><span class="guardian-score tone-${Number(entry.attention) <= 1 ? 'red' : Number(entry.attention) <= 3 ? 'amber' : 'green'}">${safe(scoreLabel(entry.attention, lang))}</span></td></tr>`).join('') || `<tr><td colspan="6">${t(lang, 'noData')}</td></tr>`}</tbody></table></div>`;
}
function updateCards(snapshot, token, seen, lang) {
  const updates = snapshot.updates || [];
  if (!updates.length) return `<p class="guardian-update-clear">${t(lang, 'clear')}</p>`;
  return updates.map(update => `<article class="guardian-alert ${seen.includes(update.id) ? 'seen' : 'unseen'}" data-update-id="${safe(update.id)}" data-month="${safe(update.monthId)}" data-week="${safe(update.weekKey)}"><div><p>${safe(update.day)} · ${safe(update.subject)}</p><h3>${t(lang, 'concern')}</h3><div class="guardian-alert-tags">${concernLabels(update.tags, lang).map(label => `<span>${safe(label)}</span>`).join('')}</div>${update.note ? `<p class="guardian-alert-note">${safe(update.note)}</p>` : ''}</div><button type="button" data-open-week="${safe(update.id)}">${t(lang, 'openReport')}</button></article>`).join('');
}
function accessIndex() { try { return JSON.parse(localStorage.getItem(ACCESS_INDEX_KEY) || '[]'); } catch { return []; } }
function saveAccessIndex(items) { localStorage.setItem(ACCESS_INDEX_KEY, JSON.stringify(items)); }
function seenUpdates(token) { try { return JSON.parse(localStorage.getItem(`spt-guardian-seen-${token}`) || '[]'); } catch { return []; } }
function saveSeen(token, updates) { localStorage.setItem(`spt-guardian-seen-${token}`, JSON.stringify([...new Set(updates)])); }
function portalLocale() { return localStorage.getItem(PORTAL_LANGUAGE_KEY) === 'en' ? 'en' : 'bn'; }
function setPortalLocale(next) { localStorage.setItem(PORTAL_LANGUAGE_KEY, next); }

async function markUpdateSeen(token, updateId) {
  const current = seenUpdates(token); if (current.includes(updateId)) return;
  saveSeen(token, [...current, updateId]);
  try { await addDoc(collection(db, 'guardianViews', token, 'items'), { openedAt: serverTimestamp(), updateId }); } catch (error) { console.error(error); }
}
async function loadDeviceAccess() {
  const index = accessIndex(); const valid = [];
  for (const item of index) { try { const snap = await getDoc(doc(db, 'guardianAccess', item.token)); if (snap.exists()) valid.push({ ...item, record: snap.data() }); } catch (_) {} }
  if (valid.length !== index.length) saveAccessIndex(valid.map(({ inviteId, token }) => ({ inviteId, token })));
  return valid;
}
function portalShell() {
  document.querySelector('#app')?.replaceChildren(); document.querySelector('.guardian-portal')?.remove();
  const shell = document.createElement('main'); shell.className = 'guardian-portal'; document.body.append(shell); return shell;
}
async function renderGuardianHub() {
  const shell = portalShell(), lang = portalLocale(), access = await loadDeviceAccess();
  shell.innerHTML = `<section class="guardian-portal-card"><header class="guardian-portal-top"><div><p class="portal-kicker">${t(lang, 'viewOnly')}</p><h1>${t(lang, 'children')}</h1><p>${t(lang, 'privacy')}</p></div><div class="language-choice-wrap"><button class="language-choice ${lang === 'bn' ? 'active' : ''}" data-portal-language="bn">বাংলা</button><button class="language-choice ${lang === 'en' ? 'active' : ''}" data-portal-language="en">EN</button></div></header><section class="guardian-child-grid">${access.length ? access.map(({ token, record }) => { const student = record.snapshot?.student || {}, unseen = (record.snapshot?.updates || []).filter(update => !seenUpdates(token).includes(update.id)).length; return `<button class="guardian-child-card" data-open-child="${safe(token)}"><img src="${safe(avatarUrl(student))}" alt="" onerror="this.remove()"><div><p>${safe([student.school, student.grade, student.group].filter(Boolean).join(' · '))}</p><h2>${safe(student.name || '—')}</h2><div class="guardian-subject-tags">${(student.subjects || []).slice(0, 3).map(subject => `<span>${safe(subject)}</span>`).join('')}${(student.subjects || []).length > 3 ? `<span>+${student.subjects.length - 3}</span>` : ''}</div><small>${t(lang, 'latest')}: ${safe(dateText(record.updatedAt || record.snapshot?.updatedAt, lang))}</small></div>${unseen ? `<b class="guardian-unread-badge">${unseen} ${t(lang, 'newUpdate')}</b>` : ''}</button>`; }).join('') : `<p class="guardian-empty">${t(lang, 'noAccess')}</p>`}</section>${contactFooter()}</section>`;
  shell.querySelectorAll('[data-portal-language]').forEach(button => button.onclick = () => { setPortalLocale(button.dataset.portalLanguage); renderGuardianHub(); });
  shell.querySelectorAll('[data-open-child]').forEach(button => button.onclick = async () => { const entry = access.find(item => item.token === button.dataset.openChild); if (entry) renderGuardianWorkspace(entry.token, entry.record); });
}
function renderGuardianWorkspace(token, record) {
  const shell = document.querySelector('.guardian-portal'); if (!shell) return;
  const lang = portalLocale(), snapshot = record.snapshot || {}, months = snapshot.workspace?.months || [], selected = { month: snapshot.workspace?.activeMonthId || months[months.length - 1]?.id || '', week: '' };
  const initialMonth = months.find(item => item.id === selected.month) || months[months.length - 1]; selected.month = initialMonth?.id || ''; selected.week = initialMonth?.weeks?.[initialMonth.weeks.length - 1] || '';
  let view = 'weekly';
  const draw = () => {
    const student = snapshot.student || {}, month = months.find(item => item.id === selected.month) || months[0], seen = seenUpdates(token), updates = snapshot.updates || [];
    const panels = { weekly: weeklyHtml(snapshot, selected.month, selected.week, lang), routine: routineHtml(snapshot, lang), checklist: checklistHtml(snapshot, lang), progress: progressHtml(snapshot, lang), exams: examsHtml(snapshot, lang) };
    shell.innerHTML = `<section class="guardian-portal-card guardian-workspace"><header class="guardian-workspace-head"><button class="guardian-back" type="button" data-back-children>← ${t(lang, 'back')}</button><div class="guardian-portal-top"><div class="guardian-identity">${avatarUrl(student) ? `<img src="${safe(avatarUrl(student))}" alt="">` : ''}<div><p class="portal-kicker">${t(lang, 'viewOnly')}</p><h1>${safe(student.name || '—')}</h1><p>${safe([student.school, student.grade, student.group].filter(Boolean).join(' · '))}</p><small>${t(lang, 'latest')}: ${safe(dateText(record.updatedAt || snapshot.updatedAt, lang))}</small></div></div><div class="language-choice-wrap"><button class="language-choice ${lang === 'bn' ? 'active' : ''}" data-portal-language="bn">বাংলা</button><button class="language-choice ${lang === 'en' ? 'active' : ''}" data-portal-language="en">EN</button></div></div><p class="guardian-readonly-chip">${t(lang, 'privacy')}</p></header><section class="guardian-update-section"><header><div><p>${t(lang, 'updates')}</p><h2>${t(lang, 'concern')}</h2></div><small>${updates.filter(update => !seen.includes(update.id)).length} ${t(lang, 'newUpdate')}</small></header>${updateCards(snapshot, token, seen, lang)}</section><nav class="guardian-report-tabs" aria-label="Guardian report sections">${[['weekly', t(lang, 'weekly')], ['routine', t(lang, 'routine')], ['checklist', t(lang, 'checklist')], ['progress', t(lang, 'progress')], ['exams', t(lang, 'exams')]].map(([id, label]) => `<button class="${view === id ? 'active' : ''}" data-guardian-view="${id}">${label}</button>`).join('')}</nav><section class="guardian-workspace-panel">${view === 'weekly' ? `<div class="guardian-history-controls"><label>${t(lang, 'month')}<select data-guardian-month>${months.map(item => `<option value="${safe(item.id)}" ${item.id === month?.id ? 'selected' : ''}>${safe(item.name)}</option>`).join('')}</select></label><label>${t(lang, 'week')}<select data-guardian-week>${(month?.weeks || []).map((key, index) => `<option value="${safe(key)}" ${key === selected.week ? 'selected' : ''}>${t(lang, 'week')} ${index + 1}</option>`).join('')}</select></label></div>` : ''}${panels[view]}</section>${contactFooter()}</section>`;
    shell.querySelector('[data-back-children]').onclick = renderGuardianHub;
    shell.querySelectorAll('[data-portal-language]').forEach(button => button.onclick = () => { setPortalLocale(button.dataset.portalLanguage); renderGuardianWorkspace(token, record); });
    shell.querySelectorAll('[data-guardian-view]').forEach(button => button.onclick = () => { view = button.dataset.guardianView; draw(); });
    shell.querySelector('[data-guardian-month]')?.addEventListener('change', event => { selected.month = event.target.value; const found = months.find(item => item.id === selected.month); selected.week = found?.weeks?.[found.weeks.length - 1] || ''; draw(); });
    shell.querySelector('[data-guardian-week]')?.addEventListener('change', event => { selected.week = event.target.value; draw(); });
    shell.querySelectorAll('[data-open-week]').forEach(button => button.onclick = async () => { const update = updates.find(item => item.id === button.dataset.openWeek); if (!update) return; await markUpdateSeen(token, update.id); selected.month = update.monthId; selected.week = update.weekKey; view = 'weekly'; draw(); });
  };
  draw();
}
async function guardianPortal(inviteId) {
  const direct = accessIndex().find(item => item.inviteId === inviteId);
  if (direct) { try { const access = await getDoc(doc(db, 'guardianAccess', direct.token)); if (access.exists()) return renderGuardianHub(); } catch (_) {} }
  const shell = portalShell(), lang = portalLocale();
  shell.innerHTML = `<section class="guardian-portal-card"><header class="guardian-portal-top"><div><p class="portal-kicker">${t(lang, 'room')}</p><h1>${lang === 'en' ? 'Student guardian access' : 'শিক্ষার্থী অভিভাবক প্রবেশ'}</h1></div><div class="language-choice-wrap"><button class="language-choice ${lang === 'bn' ? 'active' : ''}" data-portal-language="bn">বাংলা</button><button class="language-choice ${lang === 'en' ? 'active' : ''}" data-portal-language="en">EN</button></div></header><div id="guardianPortalContent"></div>${contactFooter()}</section>`;
  shell.querySelectorAll('[data-portal-language]').forEach(button => button.onclick = () => { setPortalLocale(button.dataset.portalLanguage); guardianPortal(inviteId); });
  const outlet = shell.querySelector('#guardianPortalContent'); let invite;
  try { const snap = await getDoc(doc(db, 'guardianInvites', inviteId)); invite = snap.exists() ? snap.data() : null; } catch (error) { console.error(error); }
  if (!invite?.active) { outlet.innerHTML = `<p class="guardian-warning">${t(lang, 'noAccess')}</p>`; return; }
  const requestKey = `spt-guardian-request-${inviteId}`;
  const requestId = localStorage.getItem(requestKey);
  if (!requestId) {
    outlet.innerHTML = `<p>${lang === 'en' ? 'Request access to this read-only student workspace.' : 'এই শুধুমাত্র দেখার শিক্ষার্থী কর্মক্ষেত্রের অনুমতি চান।'}</p><p class="guardian-warning">${t(lang, 'help')}</p><label>${t(lang, 'name')}<input id="guardianName" maxlength="80" autocomplete="name"></label><label>${lang === 'en' ? 'Relationship (optional)' : 'সম্পর্ক (ঐচ্ছিক)'}<select id="guardianRelationship"><option value="">${lang === 'en' ? 'Not specified' : 'উল্লেখ নেই'}</option><option value="mother">${lang === 'en' ? 'Mother' : 'মা'}</option><option value="father">${lang === 'en' ? 'Father' : 'বাবা'}</option><option value="guardian">${lang === 'en' ? 'Guardian' : 'অভিভাবক'}</option><option value="other">${lang === 'en' ? 'Other' : 'অন্যান্য'}</option></select></label><button class="btn teal" id="guardianRequest">${t(lang, 'request')}</button>`;
    outlet.querySelector('#guardianRequest').onclick = async () => { const guardianName = outlet.querySelector('#guardianName').value.trim(), relationship = outlet.querySelector('#guardianRelationship').value; if (!guardianName) return; const ref = await addDoc(collection(db, 'guardianRequests', inviteId, 'items'), { guardianName, relationship, state: 'pending', requestedAt: serverTimestamp() }); localStorage.setItem(requestKey, ref.id); guardianPortal(inviteId); };
    return;
  }
  outlet.innerHTML = `<p class="guardian-warning">${t(lang, 'pending')}</p>`;
  stopGuardianRequest?.();
  stopGuardianRequest = onSnapshot(doc(db, 'guardianRequests', inviteId, 'items', requestId), async snap => {
    const request = snap.data(); if (!request) return;
    if (request.state === 'rejected' || request.state === 'revoked') { outlet.innerHTML = `<p class="guardian-warning">${t(lang, 'rejected')}</p>`; return; }
    if (request.state === 'approved' && request.accessToken) { const access = await getDoc(doc(db, 'guardianAccess', request.accessToken)); if (!access.exists()) return; const all = accessIndex().filter(item => item.inviteId !== inviteId); saveAccessIndex([...all, { inviteId, token: request.accessToken }]); stopGuardianRequest?.(); renderGuardianHub(); }
  });
}

async function pushGuardianSnapshots() {
  if (!user) return;
  const access = await getDocs(query(collection(db, 'guardianAccess'), where('ownerUid', '==', user.uid)));
  if (access.empty) return;
  const batch = writeBatch(db); access.docs.forEach(item => { const current = item.data(), snapshot = publicSnapshot(current.studentId); if (snapshot) batch.update(item.ref, { snapshot, updatedAt: serverTimestamp() }); }); await batch.commit();
}
async function approveGuardianRequest(inviteId, requestId) {
  if (!user) return;
  const inviteSnap = await getDoc(doc(db, 'guardianInvites', inviteId)), invite = inviteSnap.data();
  if (!invite || invite.ownerUid !== user.uid) return;
  const token = randomId('g'), batch = writeBatch(db), requestRef = doc(db, 'guardianRequests', inviteId, 'items', requestId);
  batch.set(doc(db, 'guardianAccess', token), { ownerUid: user.uid, studentId: invite.studentId, inviteId, requestId, snapshot: publicSnapshot(invite.studentId), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  batch.update(requestRef, { state: 'approved', accessToken: token, approvedAt: serverTimestamp() }); await batch.commit(); toast(teacherLocale() === 'en' ? 'Guardian request approved.' : 'অভিভাবকের অনুরোধ অনুমোদন হয়েছে।'); guardianManager();
}
async function rejectGuardianRequest(inviteId, requestId) { if (!user) return; await updateDoc(doc(db, 'guardianRequests', inviteId, 'items', requestId), { state: 'rejected', rejectedAt: serverTimestamp() }); guardianManager(); }
async function revokeGuardianAccess(inviteId, requestId, token) { if (!user) return; const batch = writeBatch(db); if (token) batch.delete(doc(db, 'guardianAccess', token)); batch.update(doc(db, 'guardianRequests', inviteId, 'items', requestId), { state: 'revoked', revokedAt: serverTimestamp(), accessToken: null }); await batch.commit(); guardianManager(); }
async function endGuardianRoom(inviteId, studentId) {
  if (!user || !confirm(teacherLocale() === 'en' ? 'End this guardian room and remove all approved devices?' : 'এই অভিভাবক রুম শেষ করে সব অনুমোদিত ডিভাইস বাতিল করবেন?')) return;
  const access = await getDocs(query(collection(db, 'guardianAccess'), where('ownerUid', '==', user.uid))), batch = writeBatch(db);
  batch.update(doc(db, 'guardianInvites', inviteId), { active: false, endedAt: serverTimestamp() }); access.docs.filter(item => item.data().inviteId === inviteId).forEach(item => batch.delete(item.ref)); await batch.commit();
  const state = dashboard()?.getState?.(), student = state?.students?.find(item => item.id === studentId); if (student) { student.room = null; dashboard().setState(state); } guardianManager();
}
async function guardianManager() {
  const target = document.querySelector('#appMain'); if (!target || !user || !target.classList.contains('view-guardians')) return;
  target.querySelector('#onlineGuardianManager')?.remove(); const state = dashboard()?.getState?.(), rooms = (state?.students || []).filter(student => student.room?.inviteId); if (!rooms.length) return;
  const panel = document.createElement('section'); panel.id = 'onlineGuardianManager'; panel.className = 'surface-panel online-guardian-manager'; target.append(panel);
  const chunks = [];
  for (const student of rooms) { const inviteId = student.room.inviteId; try { const requestSnap = await getDocs(collection(db, 'guardianRequests', inviteId, 'items')); const rows = requestSnap.docs.map(item => ({ id: item.id, ...item.data() })); chunks.push(`<article class="guardian-report-row"><strong>${safe(student.name)}</strong><small> · ${safe(student.room.code || '')}</small><div class="guardian-card-actions"><button class="mini-add" data-end-room="${safe(inviteId)}" data-student="${safe(student.id)}">রুম শেষ করুন</button></div>${rows.length ? rows.map(row => `<div class="request-row"><span>${safe((row.guardianName || '?').slice(0, 2))}</span><div><strong>${safe(row.guardianName || '—')}</strong><small>${safe([row.relationship, row.state || 'pending'].filter(Boolean).join(' · '))}</small></div>${row.state === 'pending' ? `<button class="mini-add" data-approve="${safe(inviteId)}" data-request="${safe(row.id)}">অনুমোদন</button><button class="mini-add" data-reject="${safe(inviteId)}" data-request="${safe(row.id)}">বাতিল</button>` : row.state === 'approved' ? `<button class="mini-add" data-revoke="${safe(inviteId)}" data-request="${safe(row.id)}" data-token="${safe(row.accessToken || '')}">ডিভাইস বাতিল</button>` : ''}</div>`).join('') : '<p class="guardian-empty">এখনও কোনো অভিভাবক অনুরোধ নেই।</p>'}</article>`); } catch (error) { console.error(error); } }
  panel.innerHTML = `<header><div><p>অনলাইন অভিভাবক অনুমতি</p><h2>শিক্ষার্থীভিত্তিক অনুমোদন</h2></div></header>${chunks.join('')}`;
  panel.querySelectorAll('[data-approve]').forEach(button => button.onclick = () => approveGuardianRequest(button.dataset.approve, button.dataset.request));
  panel.querySelectorAll('[data-reject]').forEach(button => button.onclick = () => rejectGuardianRequest(button.dataset.reject, button.dataset.request));
  panel.querySelectorAll('[data-revoke]').forEach(button => button.onclick = () => revokeGuardianAccess(button.dataset.revoke, button.dataset.request, button.dataset.token));
  panel.querySelectorAll('[data-end-room]').forEach(button => button.onclick = () => endGuardianRoom(button.dataset.endRoom, button.dataset.student));
}
function cloudCopy() { const lang = teacherLocale(), email = user?.email || ''; if (!user) return { title: lang === 'en' ? 'Sign in with Google' : 'Google দিয়ে সাইন-ইন', detail: lang === 'en' ? 'Local / offline' : 'স্থানীয় / অফলাইন' }; if (cloudState.kind === 'ok') return { title: lang === 'en' ? 'Cloud synced' : 'ক্লাউড সিঙ্ক হয়েছে', detail: email }; if (cloudState.kind === 'wait') return { title: lang === 'en' ? 'Saving to cloud…' : 'ক্লাউডে সংরক্ষণ হচ্ছে…', detail: email }; if (cloudState.errorCode === 'permission-denied') return { title: lang === 'en' ? 'Cloud permission problem' : 'ক্লাউড অনুমতি সমস্যা', detail: email }; return { title: lang === 'en' ? 'Cloud sync failed' : 'ক্লাউড সিঙ্ক হয়নি', detail: email }; }
function renderCloudControl() { const mount = document.querySelector('#headerCloudSlot'); if (!mount) return; const copy = cloudCopy(), kind = cloudState.kind; mount.innerHTML = `<button class="profile-chip cloud-status-button" type="button" data-online-auth title="${safe(copy.title)}"><span class="cloud-dot ${kind === 'offline' ? '' : kind}"></span><div><strong>${safe(copy.title)}</strong><small class="cloud-email">${safe(copy.detail)}</small></div></button>`; mount.querySelector('[data-online-auth]').onclick = () => user ? signOut(auth) : signIn(); }
function refreshGuardianRoomButtons() { const ready = Boolean(user && cloudState.kind === 'ok'); document.querySelectorAll('[data-guardian-room]').forEach(button => { button.disabled = !ready; button.textContent = ready ? t(teacherLocale(), 'room') : 'ক্লাউড সিঙ্ক প্রয়োজন'; button.title = ready ? '' : 'আগে Google সাইন-ইন ও ক্লাউড সিঙ্ক সম্পন্ন করুন'; }); }
function setStatus(kind, text = '', errorCode = '') { cloudState = { kind, message: text, errorCode }; document.querySelectorAll('.online-status').forEach(element => { element.className = `online-status ${kind}`; element.textContent = text || cloudCopy().title; }); renderCloudControl(); refreshGuardianRoomButtons(); }
function syncError(error) { const code = String(error?.code || '').replace(/^firestore\//, ''); return code === 'permission-denied' ? 'permission-denied' : code; }
async function push() { if (!user || !dashboard()) return; const payload = full(); if (!payload) return; try { await setDoc(doc(db, 'teachers', user.uid, 'snapshots', 'current'), { ownerUid: user.uid, savedAt: new Date().toISOString(), payload }); await pushGuardianSnapshots(); setStatus('ok', t(teacherLocale(), 'synced')); } catch (error) { console.error(error); const code = syncError(error); setStatus('err', t(teacherLocale(), 'failed'), code); toast(code === 'permission-denied' ? (teacherLocale() === 'en' ? 'Cloud permission was denied. Local data is still safe on this device.' : 'ক্লাউড অনুমতি পাওয়া যায়নি। স্থানীয় তথ্য এই ডিভাইসে নিরাপদে আছে।') : (teacherLocale() === 'en' ? 'Cloud sync failed. Local data is still available.' : 'ক্লাউড সিঙ্ক হয়নি। স্থানীয় তথ্য ব্যবহার করা যাবে।'), 'error'); } }
function queue() { if (!user) return; clearTimeout(syncTimer); setStatus('wait', t(teacherLocale(), 'saving')); syncTimer = setTimeout(push, 1200); }
async function syncOnLogin() { if (!user) return; const reference = doc(db, 'teachers', user.uid, 'snapshots', 'current'); setStatus('wait', t(teacherLocale(), 'saving')); try { const remoteSnap = await getDoc(reference); if (remoteSnap.exists() && remoteSnap.data()?.payload) { const remote = remoteSnap.data().payload, local = full(); if (local?.exportedAt && remote.exportedAt && remote.exportedAt > local.exportedAt && confirm(teacherLocale() === 'en' ? 'A newer cloud copy exists. Use it?' : 'একটি নতুন ক্লাউড কপি আছে। সেটি ব্যবহার করবেন?')) { dashboard().setState(remote.dashboard); Object.entries(remote.workspaces || {}).forEach(([id, data]) => localStorage.setItem(workspaceKey(id), JSON.stringify(data))); } else await push(); } else await push(); stopTeacherSnapshot?.(); stopTeacherSnapshot = onSnapshot(reference, () => {}, error => { console.error(error); setStatus('err', t(teacherLocale(), 'failed'), syncError(error)); }); if (cloudState.kind !== 'err') setStatus('ok', t(teacherLocale(), 'synced')); } catch (error) { console.error(error); const code = syncError(error); setStatus('err', t(teacherLocale(), 'failed'), code); toast(code === 'permission-denied' ? (teacherLocale() === 'en' ? 'Firebase denied this account’s cloud access. Check the published Firestore rules and project.' : 'Firebase এই অ্যাকাউন্টের ক্লাউড অনুমতি দেয়নি। Firestore Rules ও প্রকল্প যাচাই করুন।') : (teacherLocale() === 'en' ? 'Cloud sync could not start.' : 'ক্লাউড সিঙ্ক শুরু করা যায়নি।'), 'error'); } }
async function signIn() { try { setStatus('wait', t(teacherLocale(), 'saving')); await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { console.error(error); setStatus('err', t(teacherLocale(), 'failed'), syncError(error)); toast(teacherLocale() === 'en' ? 'Google sign-in could not be completed.' : 'Google সাইন-ইন সম্পন্ন করা যায়নি।', 'error'); } }
async function createRoom(studentId) {
  if (!user) return toast(teacherLocale() === 'en' ? 'Sign in and complete cloud sync first.' : 'আগে Google সাইন-ইন ও ক্লাউড সিঙ্ক সম্পন্ন করুন।', 'error');
  if (cloudState.kind !== 'ok') return toast(teacherLocale() === 'en' ? 'Guardian room will be available after cloud sync succeeds.' : 'ক্লাউড সিঙ্ক সফল হলে অভিভাবক রুম ব্যবহার করা যাবে।', 'error');
  const state = dashboard().getState(), student = state.students.find(item => item.id === studentId); if (!student) return;
  if (student.room?.inviteId) { const url = `${location.origin}${location.pathname}?guardianInvite=${encodeURIComponent(student.room.inviteId)}`; prompt(teacherLocale() === 'en' ? 'Share this guardian invitation link:' : 'এই ব্যক্তিগত অভিভাবক আমন্ত্রণ লিংকটি শেয়ার করুন:', url); return; }
  const inviteId = randomId('i'), code = String(Math.floor(100000 + Math.random() * 900000)); await setDoc(doc(db, 'guardianInvites', inviteId), { ownerUid: user.uid, studentId, active: true, createdAt: serverTimestamp(), code }); student.room = { inviteId, code, active: true, createdAt: Date.now() }; dashboard().setState(state); await push(); prompt(teacherLocale() === 'en' ? 'Share this guardian invitation link:' : 'এই ব্যক্তিগত অভিভাবক আমন্ত্রণ লিংকটি শেয়ার করুন:', `${location.origin}${location.pathname}?guardianInvite=${encodeURIComponent(inviteId)}`);
}
function offlineGuardianHtml(snapshot) {
  const lang = teacherLocale(), student = snapshot.student || {}, months = snapshot.workspace?.months || [];
  const month = months.find(item => item.id === snapshot.workspace?.activeMonthId) || months[months.length - 1];
  const weekKey = month?.weeks?.[month.weeks.length - 1] || '';
  const weekIndex = Math.max(0, month?.weeks?.indexOf(weekKey) ?? 0);
  const weekAlerts = (snapshot.updates || []).filter(update => update.monthId === month?.id && update.weekKey === weekKey);
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(student.name)} — ${lang === 'en' ? 'Guardian report' : 'অভিভাবক প্রতিবেদন'}</title><style>body{margin:0;background:#f7f3ea;color:#183e3e;font-family:Arial,'Hind Siliguri',sans-serif}.page{max-width:920px;margin:auto;padding:16px}.hero,.card{background:#fff;border:1px solid #dce8e3;border-radius:16px;padding:17px}.hero{background:linear-gradient(120deg,#fffdf8,#eef7f2)}.eyebrow{margin:0;color:#0f5b5a;font-size:12px;font-weight:800}.hero h1{margin:4px 0;font-family:Georgia,'Noto Serif Bengali',serif}.hero p{margin:4px 0;color:#58716d}.notice{margin:12px 0;padding:10px 12px;border-left:4px solid #0f5b5a;border-radius:8px;background:#eef7f4;font-size:13px;line-height:1.5}.privacy{border-left-color:#a66b16;background:#fff6df}.tabs{display:flex;gap:7px;flex-wrap:wrap;margin:14px 0}.tabs button{border:1px solid #bcd4ce;border-radius:999px;background:#fff;color:#0f5b5a;padding:8px 10px;font-weight:800}.tabs button.active{background:#0f5b5a;color:#fff}.panel{display:none}.panel.active{display:block}.guardian-table-scroll{overflow:auto}.guardian-week-table,table{width:100%;min-width:700px;border-collapse:collapse;font-size:13px}.guardian-week-table th,.guardian-week-table td,th,td{padding:8px;border-bottom:1px solid #e8eee9;text-align:left;vertical-align:top}.guardian-week-table th,th{color:#0f5b5a}.guardian-score{display:inline-block;padding:4px 6px;border-radius:7px;font-size:11px;font-weight:800}.tone-red{background:#fbe0dc;color:#a1322d}.tone-amber{background:#fff0cf;color:#946615}.tone-green{background:#e5f4e7;color:#25734a}.guardian-routine-card,.guardian-subject,.guardian-topic,.guardian-check-node,.guardian-sheet-card,.guardian-progress-card{margin:10px 0;padding:13px;border:1px solid #dce8e3;border-radius:13px;background:#fff}.guardian-routine-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.guardian-routine-grid div{padding:9px;background:#f0f7f4;border-radius:9px}.guardian-routine-grid b,.guardian-routine-grid span{display:block}.guardian-routine-grid span{margin-top:3px;color:#58716d;font-size:13px}.guardian-subject>summary,.guardian-topic>summary,.guardian-check-node>summary,.guardian-sheet-card>summary{display:flex;justify-content:space-between;gap:10px;cursor:pointer;font-weight:800}.guardian-check-node{margin-left:14px}.guardian-box-row{display:flex;gap:6px;flex-wrap:wrap;padding:10px 0}.guardian-box-row i{display:grid;place-items:center;width:30px;height:30px;border:1px solid #c8d7cc;border-radius:7px;color:#668078;font-style:normal;font-size:12px}.guardian-box-row i.done{background:#e6f5e7;border-color:#8dbb91;color:#187245;font-weight:900}.guardian-progress-card>div{display:flex;justify-content:space-between;gap:9px}.guardian-progress-card i{display:block;height:11px;margin-top:9px;border-radius:999px;background:#e7efea;overflow:hidden}.guardian-progress-card b{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#c94a43,#d59a28,#328b5a)}.guardian-alert{margin:10px 0;padding:13px;border:1px solid #e8aaaa;border-left:5px solid #bd3d3d;border-radius:12px;background:#fff5f4}.guardian-alert p{margin:0;color:#8e3934;font-size:12px;font-weight:800}.guardian-alert h3{margin:3px 0 8px;color:#7e2b2b;font-size:16px}.guardian-alert-tags{display:flex;gap:5px;flex-wrap:wrap}.guardian-alert-tags span{padding:4px 7px;border-radius:999px;background:#f8d8d4;color:#922f2c;font-size:12px;font-weight:700}.guardian-alert-note{margin-top:8px!important;color:#6f504d!important;font-weight:400!important}.guardian-empty{color:#58716d;padding:16px}.snapshot{margin-top:14px;color:#607a75;font-size:12px;text-align:center}@media(max-width:600px){.page{padding:10px}.hero,.card{padding:14px}.tabs{position:sticky;top:0;background:#f7f3ea;padding:8px 0;z-index:2}.tabs button{font-size:12px;padding:7px 9px}}</style></head><body><main class="page"><header class="hero"><p class="eyebrow">${t(lang, 'viewOnly')}</p><h1>${safe(student.name)}</h1><p>${safe([student.school, student.grade, student.group].filter(Boolean).join(' · '))}</p><p class="notice privacy">${lang === 'en' ? 'This is a teacher-created read-only workspace snapshot. It cannot be edited, added to, or reduced. Please do not forward it without permission.' : 'এটি শিক্ষকের কর্মক্ষেত্র থেকে তৈরি শুধু-দেখার স্ন্যাপশট। এতে কোনো তথ্য যোগ, পরিবর্তন বা মুছা যাবে না। অনুমতি ছাড়া অন্য কারও কাছে পাঠাবেন না।'}</p><p class="notice">${lang === 'en' ? `Report week: ${safe(month?.name || '—')} · Week ${weekIndex + 1}. Prepared: ${safe(dateText(snapshot.updatedAt, lang))}. Later teacher changes do not automatically update this file.` : `রিপোর্টের সপ্তাহ: ${safe(month?.name || '—')} · সপ্তাহ ${weekIndex + 1}। শিক্ষকের কর্মক্ষেত্র থেকে প্রস্তুত: ${safe(dateText(snapshot.updatedAt, lang))}। পরবর্তী পরিবর্তন এতে স্বয়ংক্রিয়ভাবে আসবে না।`}</p></header>${weekAlerts.length ? `<section class="card"><p class="eyebrow">${t(lang, 'updates')}</p>${weekAlerts.map(update => `<article class="guardian-alert"><p>${safe(update.day)} · ${safe(update.subject)}</p><h3>${t(lang, 'concern')}</h3><div class="guardian-alert-tags">${concernLabels(update.tags, lang).map(label => `<span>${safe(label)}</span>`).join('')}</div>${update.note ? `<p class="guardian-alert-note">${safe(update.note)}</p>` : ''}</article>`).join('')}</section>` : ''}<nav class="tabs"><button class="active" data-tab="weekly">${t(lang, 'weekly')}</button><button data-tab="routine">${t(lang, 'routine')}</button><button data-tab="checklist">${t(lang, 'checklist')}</button><button data-tab="progress">${t(lang, 'progress')}</button><button data-tab="exams">${t(lang, 'exams')}</button></nav><section class="panel active" data-panel="weekly">${weeklyHtml(snapshot, month?.id, weekKey, lang)}</section><section class="panel" data-panel="routine">${routineHtml(snapshot, lang)}</section><section class="panel" data-panel="checklist">${checklistHtml(snapshot, lang)}</section><section class="panel" data-panel="progress">${progressHtml(snapshot, lang)}</section><section class="panel" data-panel="exams">${examsHtml(snapshot, lang)}</section><p class="snapshot">${lang === 'en' ? 'Use the section buttons and expandable checklist headings to review this fixed report.' : 'বিভাগের বোতাম ও চেকলিস্টের বিস্তার/সংকোচন ব্যবহার করে এই স্থির প্রতিবেদন দেখুন।'}</p></main><script>document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('[data-panel]').forEach(x=>x.classList.toggle('active',x.dataset.panel===b.dataset.tab))}))<\/script></body></html>`;
}
function downloadGuardian(studentId) { const snapshot = publicSnapshot(studentId); if (!snapshot) return toast(teacherLocale() === 'en' ? 'No local workspace data is available for this student.' : 'এই শিক্ষার্থীর স্থানীয় কর্মক্ষেত্রের তথ্য পাওয়া যায়নি।', 'error'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([offlineGuardianHtml(snapshot)], { type: 'text/html' })); link.download = `guardian-report-${studentId}-${new Date().toISOString().slice(0, 10)}.html`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
function decorate() {
  renderCloudControl();
  document.querySelectorAll('[data-action="open-student"]').forEach(card => { const id = card.dataset.id, footer = card.querySelector('footer'); if (footer && !footer.querySelector('[data-guardian-html]')) { const controls = document.createElement('div'); const roomReady = Boolean(user && cloudState.kind === 'ok'); controls.className = 'guardian-card-actions'; controls.innerHTML = `<button class="mini-add" data-guardian-html="${id}">${t(teacherLocale(), 'share')}</button><button class="mini-add" data-guardian-room="${id}" ${roomReady ? '' : 'disabled title="আগে Google সাইন-ইন ও ক্লাউড সিঙ্ক সম্পন্ন করুন"'}>${roomReady ? t(teacherLocale(), 'room') : 'ক্লাউড সিঙ্ক প্রয়োজন'}</button>`; footer.append(controls); } });
  document.querySelectorAll('[data-guardian-html]').forEach(button => button.onclick = event => { event.stopPropagation(); downloadGuardian(button.dataset.guardianHtml); }); document.querySelectorAll('[data-guardian-room]').forEach(button => button.onclick = event => { event.stopPropagation(); createRoom(button.dataset.guardianRoom); });
}

onAuthStateChanged(auth, next => { user = next; if (!user) cloudState = { kind: 'offline', message: '', errorCode: '' }; setTimeout(() => { decorate(); if (user) syncOnLogin(); guardianManager(); }, 0); });
window.SPTOnline = { queue, signIn, downloadGuardian, createRoom, approveGuardianRequest, rejectGuardianRequest, revokeGuardianAccess, endGuardianRoom };
window.addEventListener('spt-render', () => setTimeout(() => { decorate(); guardianManager(); }, 0));
const inviteId = new URLSearchParams(location.search).get('guardianInvite'); if (inviteId) guardianPortal(inviteId);
