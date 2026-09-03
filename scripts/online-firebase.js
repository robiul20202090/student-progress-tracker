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
const GUARDIAN_LAST_INVITE_KEY = 'spt-guardian-last-invite-v1';
const SYNC_DIRTY_KEY = 'spt-cloud-local-dirty-v1';
const SYNC_FINGERPRINT_KEY = 'spt-cloud-last-fingerprint-v1';
let user = null;
let syncTimer = null;
let stopTeacherSnapshot = null;
let stopGuardianRequest = null;
let cloudState = { kind: 'offline', message: '', errorCode: '' };

const safe = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const displayBuiltIn = (value, lang) => { const raw = String(value ?? ''); if (lang !== 'en') return raw; return ({ 'বাংলা':'Bangla','বাংলা ১ম পত্র':'Bangla Paper 1','বাংলা ২য় পত্র':'Bangla Paper 2','ইংরেজি':'English','ইংরেজি ১ম পত্র':'English Paper 1','ইংরেজি ২য় পত্র':'English Paper 2','গণিত':'Mathematics','উচ্চতর গণিত':'Higher Mathematics','বিজ্ঞান':'Science','পদার্থবিজ্ঞান':'Physics','রসায়ন':'Chemistry','জীববিজ্ঞান':'Biology','তথ্য ও যোগাযোগ প্রযুক্তি':'Information & Communication Technology','কম্পিউটার':'Computer','বাংলাদেশ ও বিশ্বপরিচয়':'Bangladesh & Global Studies','ইতিহাস':'History','ভূগোল':'Geography','অর্থনীতি':'Economics','হিসাববিজ্ঞান':'Accounting','ব্যবসায় উদ্যোগ':'Business Entrepreneurship','কৃষিশিক্ষা':'Agricultural Studies','গার্হস্থ্য বিজ্ঞান':'Home Science','চারু ও কারুকলা':'Arts & Crafts','শারীরিক শিক্ষা':'Physical Education','আরবি ১ম পত্র':'Arabic Paper 1','আরবি ২য় পত্র':'Arabic Paper 2','কুরআন মাজীদ ও তাজভীদ':'Quran Majid & Tajweed','ইসলাম ও নৈতিক শিক্ষা':'Islam & Moral Education','হিন্দুধর্ম ও নৈতিক শিক্ষা':'Hindu Religion & Moral Education','বৌদ্ধধর্ম ও নৈতিক শিক্ষা':'Buddhist Religion & Moral Education','খ্রিস্টধর্ম ও নৈতিক শিক্ষা':'Christian Religion & Moral Education','পুনরালোচনা':'Revision','শনিবার':'Saturday','রবিবার':'Sunday','সোমবার':'Monday','মঙ্গলবার':'Tuesday','বুধবার':'Wednesday','বৃহস্পতিবার':'Thursday','শুক্রবার':'Friday','জানুয়ারি':'January','ফেব্রুয়ারি':'February','মার্চ':'March','এপ্রিল':'April','মে':'May','জুন':'June','জুলাই':'July','আগস্ট':'August','সেপ্টেম্বর':'September','অক্টোবর':'October','নভেম্বর':'November','ডিসেম্বর':'December' })[raw] || raw; };
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
const dateValue = value => { if (value?.toDate) return value.toDate(); if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1e6)); const candidate = new Date(value || Date.now()); return Number.isNaN(candidate.getTime()) ? new Date() : candidate; };
const dateText = (value, lang) => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'bn-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(dateValue(value));
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
    weeks: Object.fromEntries(Object.entries(workspace.weeks || {}).map(([key, entries]) => [key, (entries || []).map(entry => ({ id: entry.id, day: entry.day, subject: entry.subject, topic: entry.topic, academic: entry.academic, homework: entry.homework, attention: entry.attention, statuses: entry.statuses || [], notifyGuardian: Boolean(entry.notifyGuardian), comment: entry.comment || '' }))])),
    checklist: workspace.checklist || [],
    exams: (workspace.exams || []).map(exam => ({ id: exam.id, title: exam.title, date: exam.date, status: exam.status, subjects: (exam.subjects || []).map(subject => ({ id: subject.id, name: subject.name, obtained: subject.obtained, full: subject.full })) })),
    routines: readRoutines()
  };
  return {
    student: { id: student.id, name: student.name, grade: student.grade || '', school: student.school || '', group: student.group || '', subjects: student.subjects || [], avatarId: student.avatarId || '' },
    workspace: safeWorkspace, updates: deriveUpdates(safeWorkspace), updatedAt: new Date().toISOString()
  };
}

function contactFooter(lang = portalLocale()) { return `<footer class="guardian-contact-note">${lang === 'en' ? 'The latest information is shown from the teacher’s saved online update.' : 'সর্বশেষ তথ্য শিক্ষকের সংরক্ষিত অনলাইন আপডেট থেকে দেখানো হচ্ছে।'}</footer>`; }
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
    return `<details class="guardian-subject" open><summary><span>${safe(displayBuiltIn(subject.name, lang))}</span><b>${totals.done}/${totals.total}</b></summary>${(subject.topics || []).map(topic => { const summary = topicSummary(topic); return `<details class="guardian-topic"><summary><span>${safe(topic.name)}</span><b>${summary.done}/${summary.total}</b></summary><div class="guardian-box-row">${(topic.boxes || []).map((box, index) => `<i class="${box.done ? 'done' : ''}">${box.done ? '✓' : index + 1}</i>`).join('')}${(topic.boxes || []).length ? '' : '<em>—</em>'}</div>${(topic.subtopics || []).map(checklistNode).join('')}</details>`; }).join('')}</details>`;
  }).join('');
}
function progressHtml(snapshot, lang) {
  const list = snapshot.workspace?.checklist || [];
  if (!list.length) return `<p class="guardian-empty">${t(lang, 'noData')}</p>`;
  const subjects = list.map(subject => {
    const totals = (subject.topics || []).reduce((sum, topic) => { const next = topicSummary(topic); return { done: sum.done + next.done, total: sum.total + next.total }; }, { done: 0, total: 0 });
    const percent = totals.total ? Math.round(totals.done / totals.total * 100) : 0;
    return { subject, totals, percent };
  });
  const all = subjects.reduce((sum, item) => ({ done: sum.done + item.totals.done, total: sum.total + item.totals.total }), { done: 0, total: 0 });
  const overall = all.total ? Math.round(all.done / all.total * 100) : 0;
  const donut = (percent, title, detail, overallCard=false) => { const tone = percent <= 33 ? '#c94a43' : percent <= 66 ? '#d59a28' : '#328b5a'; return `<article class="guardian-donut-card ${overallCard ? 'overall' : ''}"><div class="guardian-donut" style="--completion:${percent * 3.6}deg;--chart-color:${tone}" role="img" aria-label="${safe(`${title}: ${percent}%`)}"><strong>${percent}%</strong></div><div><h3>${safe(title)}</h3><p>${safe(detail)}</p></div></article>`; };
  const overallTitle = lang === 'en' ? 'Overall syllabus completion' : 'সার্বিক সিলেবাস সম্পন্নতা';
  return `<section class="guardian-progress-overall">${donut(overall, overallTitle, `${all.done}/${all.total} · ${Math.round(overall / 20 * 10) / 10}/5`, true)}</section><section class="guardian-subject-donuts">${subjects.map(item => donut(item.percent, displayBuiltIn(item.subject.name, lang), `${item.totals.done}/${item.totals.total} · ${Math.round(item.percent / 20 * 10) / 10}/5`)).join('')}</section>`;
}
function routineHtml(snapshot, lang) {
  const space = snapshot.workspace || {}, routine = (space.routines || []).find(item => item.id === space.activeRoutineId) || (space.routines || [])[0];
  if (!routine) return `<p class="guardian-empty">${t(lang, 'noData')}</p>`;
  return `<article class="guardian-routine-card"><h3>${safe(routine.name)}</h3><div class="guardian-routine-grid">${Object.entries(routine.days || {}).map(([day, subjects]) => `<div><b>${safe(displayBuiltIn(day, lang))}</b><span>${(subjects || []).map(subject => safe(displayBuiltIn(subject, lang))).join(' · ') || '—'}</span></div>`).join('')}</div></article>`;
}
function examsHtml(snapshot, lang) {
  const exams = snapshot.workspace?.exams || [];
  if (!exams.length) return `<p class="guardian-empty">${t(lang, 'noData')}</p>`;
  return exams.map(exam => `<details class="guardian-sheet-card"><summary><span>${safe(exam.title)} · ${safe(exam.date || '')}</span><b>${safe(exam.status || '')}</b></summary><div class="guardian-table-scroll"><table><thead><tr><th>${lang === 'en' ? 'Subject' : 'বিষয়'}</th><th>${lang === 'en' ? 'Result' : 'ফলাফল'}</th></tr></thead><tbody>${(exam.subjects || []).map(subject => `<tr><td>${safe(displayBuiltIn(subject.name, lang))}</td><td>${safe(subject.obtained)}/${safe(subject.full)}</td></tr>`).join('')}</tbody></table></div></details>`).join('');
}
function weeklyHtml(snapshot, monthId, weekKey, lang) {
  const months = snapshot.workspace?.months || [], month = months.find(item => item.id === monthId) || months[months.length - 1], chosen = weekKey || month?.weeks?.[month.weeks.length - 1];
  const entries = snapshot.workspace?.weeks?.[chosen] || [], weekIndex = Math.max(0, month?.weeks?.indexOf(chosen) ?? 0);
  const scores = entries.flatMap(entry => [entry.academic, entry.homework, entry.attention]).filter(value => value !== null && value !== undefined && value !== '').map(Number);
  const average = scores.length ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10 : null;
  return `<section class="guardian-week-head"><div><p>${safe(displayBuiltIn(month?.name || '', lang))} · ${t(lang, 'week')} ${weekIndex + 1}</p><h3>${lang === 'en' ? 'Saved weekly learning record' : 'সংরক্ষিত সাপ্তাহিক শেখার রেকর্ড'}</h3></div>${average === null ? '' : `<span class="guardian-score-summary">${scoreLabel(average, lang)}</span>`}</section><div class="guardian-table-scroll"><table class="guardian-week-table"><thead><tr><th>${lang === 'en' ? 'Day' : 'দিন'}</th><th>${lang === 'en' ? 'Subject' : 'বিষয়'}</th><th>${lang === 'en' ? 'Topic' : 'আজকের টপিক'}</th><th>${lang === 'en' ? 'Academic' : 'একাডেমিক'}</th><th>${lang === 'en' ? 'Homework' : 'হোমওয়ার্ক'}</th><th>${lang === 'en' ? 'Attention' : 'মনোযোগ'}</th></tr></thead><tbody>${entries.map(entry => `<tr><td>${safe(displayBuiltIn(entry.day, lang))}</td><td>${safe(displayBuiltIn(entry.subject, lang))}</td><td>${safe(entry.topic || '—')}</td><td><span class="guardian-score tone-${Number(entry.academic) <= 1 ? 'red' : Number(entry.academic) <= 3 ? 'amber' : 'green'}">${safe(scoreLabel(entry.academic, lang))}</span></td><td><span class="guardian-score tone-${Number(entry.homework) <= 1 ? 'red' : Number(entry.homework) <= 3 ? 'amber' : 'green'}">${safe(scoreLabel(entry.homework, lang))}</span></td><td><span class="guardian-score tone-${Number(entry.attention) <= 1 ? 'red' : Number(entry.attention) <= 3 ? 'amber' : 'green'}">${safe(scoreLabel(entry.attention, lang))}</span></td></tr>`).join('') || `<tr><td colspan="6">${t(lang, 'noData')}</td></tr>`}</tbody></table></div>`;
}
function updateCards(snapshot, token, seen, lang) {
  const updates = snapshot.updates || [];
  if (!updates.length) return `<p class="guardian-update-clear">${t(lang, 'clear')}</p>`;
  return updates.map(update => `<article class="guardian-alert ${seen.includes(update.id) ? 'seen' : 'unseen'}" data-update-id="${safe(update.id)}" data-month="${safe(update.monthId)}" data-week="${safe(update.weekKey)}"><div><p>${safe(displayBuiltIn(update.day, lang))} · ${safe(displayBuiltIn(update.subject, lang))}</p><h3>${t(lang, 'concern')}</h3><div class="guardian-alert-tags">${concernLabels(update.tags, lang).map(label => `<span>${safe(label)}</span>`).join('')}</div>${update.note ? `<p class="guardian-alert-note">${safe(update.note)}</p>` : ''}</div><button type="button" data-open-week="${safe(update.id)}">${t(lang, 'openReport')}</button></article>`).join('');
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
  const appRoot = document.querySelector('#app'); if (appRoot) { const startup = document.createElement('section'); startup.id = 'startup'; startup.hidden = true; appRoot.replaceChildren(startup); } document.querySelector('.guardian-portal')?.remove();
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
    shell.innerHTML = `<section class="guardian-portal-card guardian-workspace"><header class="guardian-workspace-head"><button class="guardian-back" type="button" data-back-children>← ${t(lang, 'back')}</button><div class="guardian-portal-top"><div class="guardian-identity">${avatarUrl(student) ? `<img src="${safe(avatarUrl(student))}" alt="">` : ''}<div><p class="portal-kicker">${t(lang, 'viewOnly')}</p><h1>${safe(student.name || '—')}</h1><p>${safe([student.school, student.grade, student.group].filter(Boolean).join(' · '))}</p><small>${t(lang, 'latest')}: ${safe(dateText(record.updatedAt || snapshot.updatedAt, lang))}</small></div></div><div class="language-choice-wrap"><button class="language-choice ${lang === 'bn' ? 'active' : ''}" data-portal-language="bn">বাংলা</button><button class="language-choice ${lang === 'en' ? 'active' : ''}" data-portal-language="en">EN</button></div></div><p class="guardian-readonly-chip">${t(lang, 'privacy')}</p></header><section class="guardian-update-section"><header><div><p>${t(lang, 'updates')}</p><h2>${t(lang, 'concern')}</h2></div><small>${updates.filter(update => !seen.includes(update.id)).length} ${t(lang, 'newUpdate')}</small></header>${updateCards(snapshot, token, seen, lang)}</section><nav class="guardian-report-tabs" aria-label="Guardian report sections">${[['weekly', t(lang, 'weekly')], ['routine', t(lang, 'routine')], ['checklist', t(lang, 'checklist')], ['progress', t(lang, 'progress')], ['exams', t(lang, 'exams')]].map(([id, label]) => `<button class="${view === id ? 'active' : ''}" data-guardian-view="${id}">${label}</button>`).join('')}</nav><section class="guardian-workspace-panel">${view === 'weekly' ? `<div class="guardian-history-controls"><label>${t(lang, 'month')}<select data-guardian-month>${months.map(item => `<option value="${safe(item.id)}" ${item.id === month?.id ? 'selected' : ''}>${safe(displayBuiltIn(item.name, lang))}</option>`).join('')}</select></label><label>${t(lang, 'week')}<select data-guardian-week>${(month?.weeks || []).map((key, index) => `<option value="${safe(key)}" ${key === selected.week ? 'selected' : ''}>${t(lang, 'week')} ${index + 1}</option>`).join('')}</select></label></div>` : ''}${panels[view]}</section>${contactFooter(lang)}</section>`;
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
  localStorage.setItem(GUARDIAN_LAST_INVITE_KEY, inviteId);
  const direct = accessIndex().find(item => item.inviteId === inviteId);
  if (direct) { try { const access = await getDoc(doc(db, 'guardianAccess', direct.token)); if (access.exists() && access.data()?.inviteId === inviteId) return renderGuardianWorkspace(direct.token, access.data()); } catch (_) {} }
  const shell = portalShell(), lang = portalLocale();
  shell.innerHTML = `<section class="guardian-portal-card"><header class="guardian-portal-top"><div><p class="portal-kicker">${t(lang, 'room')}</p><h1>${lang === 'en' ? 'Student guardian access' : 'শিক্ষার্থী অভিভাবক প্রবেশ'}</h1></div><div class="language-choice-wrap"><button class="language-choice ${lang === 'bn' ? 'active' : ''}" data-portal-language="bn">বাংলা</button><button class="language-choice ${lang === 'en' ? 'active' : ''}" data-portal-language="en">EN</button></div></header><div id="guardianPortalContent"></div>${contactFooter()}</section>`;
  shell.querySelectorAll('[data-portal-language]').forEach(button => button.onclick = () => { setPortalLocale(button.dataset.portalLanguage); guardianPortal(inviteId); });
  const outlet = shell.querySelector('#guardianPortalContent'); let invite;
  try { const snap = await getDoc(doc(db, 'guardianInvites', inviteId)); invite = snap.exists() ? snap.data() : null; } catch (error) { console.error(error); }
  if (!invite?.active) { localStorage.removeItem(GUARDIAN_LAST_INVITE_KEY); outlet.innerHTML = `<p class="guardian-warning">${t(lang, 'noAccess')}</p>`; return; }
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
    if (request.state === 'approved' && request.accessToken) { const access = await getDoc(doc(db, 'guardianAccess', request.accessToken)); if (!access.exists()) return; const all = accessIndex().filter(item => item.inviteId !== inviteId); saveAccessIndex([...all, { inviteId, token: request.accessToken }]); stopGuardianRequest?.(); renderGuardianWorkspace(request.accessToken, access.data()); }
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
  const target = document.querySelector('#appMain'); if (!target || !user) return;
  target.querySelector('#onlineGuardianManager')?.remove(); const state = dashboard()?.getState?.(), rooms = (state?.students || []).filter(student => student.room?.inviteId); if (!rooms.length) return;
  const panel = document.createElement('section'); panel.id = 'onlineGuardianManager'; panel.className = 'surface-panel online-guardian-manager'; const chunks = [], pending = [];
  for (const student of rooms) { const inviteId = student.room.inviteId; try { const requestSnap = await getDocs(collection(db, 'guardianRequests', inviteId, 'items')); const rows = requestSnap.docs.map(item => ({ id: item.id, ...item.data() })); pending.push(...rows.filter(row => row.state === 'pending').map(row => ({ ...row, studentName: student.name }))); chunks.push(`<article class="guardian-report-row"><strong>${safe(student.name)}</strong><small> · ${safe(student.room.code || '')}</small><div class="guardian-card-actions"><button class="mini-add" data-end-room="${safe(inviteId)}" data-student="${safe(student.id)}">রুম শেষ করুন</button></div>${rows.length ? rows.map(row => `<div class="request-row"><span>${safe((row.guardianName || '?').slice(0, 2))}</span><div><strong>${safe(row.guardianName || '—')}</strong><small>${safe([row.relationship, row.state || 'pending'].filter(Boolean).join(' · '))}</small></div>${row.state === 'pending' ? `<button class="mini-add" data-approve="${safe(inviteId)}" data-request="${safe(row.id)}">অনুমোদন</button><button class="mini-add" data-reject="${safe(inviteId)}" data-request="${safe(row.id)}">বাতিল</button>` : row.state === 'approved' ? `<button class="mini-add" data-revoke="${safe(inviteId)}" data-request="${safe(row.id)}" data-token="${safe(row.accessToken || '')}">ডিভাইস বাতিল</button>` : ''}</div>`).join('') : '<p class="guardian-empty">এখনও কোনো অভিভাবক অনুরোধ নেই।</p>'}</article>`); } catch (error) { console.error(error); } }
  if (target.classList.contains('view-dashboard')) { const card = target.querySelector('.launch-card.ochre .launch-top strong'); if (card) card.textContent = String(pending.length); const summary = target.querySelector('.dashboard-columns > .surface-panel:last-child'); if (summary) summary.innerHTML = `<header><div><p>অভিভাবক</p><h2>অপেক্ষমান অনুরোধ</h2></div><button class="text-button" data-view="guardians">সব দেখুন →</button></header>${pending.length ? `<div class="request-list">${pending.slice(0, 3).map(row => `<article class="request-row"><span>${safe((row.guardianName || '?').slice(0, 2))}</span><div><strong>${safe(row.guardianName || '—')}</strong><small>${safe(row.studentName || '')}</small></div></article>`).join('')}</div>` : '<div class="empty-state"><strong>কোনো অপেক্ষমান অনুরোধ নেই</strong><p>নতুন অনুরোধ এলে এখানে দেখা যাবে।</p></div>'}`; }
  if (!target.classList.contains('view-guardians')) return;
  panel.innerHTML = `<header><div><p>অনলাইন অভিভাবক অনুমতি</p><h2>শিক্ষার্থীভিত্তিক অনুমোদন</h2></div></header>${chunks.join('')}`; target.querySelector('.dashboard-contact')?.before(panel);
  panel.querySelectorAll('[data-approve]').forEach(button => button.onclick = () => approveGuardianRequest(button.dataset.approve, button.dataset.request));
  panel.querySelectorAll('[data-reject]').forEach(button => button.onclick = () => rejectGuardianRequest(button.dataset.reject, button.dataset.request));
  panel.querySelectorAll('[data-revoke]').forEach(button => button.onclick = () => revokeGuardianAccess(button.dataset.revoke, button.dataset.request, button.dataset.token));
  panel.querySelectorAll('[data-end-room]').forEach(button => button.onclick = () => endGuardianRoom(button.dataset.endRoom, button.dataset.student));
}
function cloudCopy() { const lang = teacherLocale(), email = user?.email || ''; if (!user) return { title: lang === 'en' ? 'Cloud not connected' : 'ক্লাউড সংযুক্ত নয়', detail: lang === 'en' ? 'Sign in with Google' : 'Google দিয়ে সাইন-ইন' }; if (cloudState.kind === 'ok') return { title: lang === 'en' ? 'Cloud synced' : 'ক্লাউড সিঙ্ক হয়েছে', detail: email }; if (cloudState.kind === 'wait') return { title: lang === 'en' ? 'Saving to cloud…' : 'ক্লাউডে সংরক্ষণ হচ্ছে…', detail: email }; if (cloudState.errorCode === 'permission-denied') return { title: lang === 'en' ? 'Cloud permission problem' : 'ক্লাউড অনুমতি সমস্যা', detail: email || (lang === 'en' ? 'Local data remains available' : 'স্থানীয় তথ্য ব্যবহার করা যাবে') }; return { title: lang === 'en' ? 'Cloud sync failed' : 'ক্লাউড সিঙ্ক হয়নি', detail: email || (lang === 'en' ? 'Local data remains available' : 'স্থানীয় তথ্য ব্যবহার করা যাবে') }; }
function renderCloudControl() { const mount = document.querySelector('#headerCloudSlot'); if (!mount) return; const copy = cloudCopy(), kind = cloudState.kind, icon = `<span class="cloud-icon-status ${kind}" aria-hidden="true"><svg viewBox="0 0 48 36" focusable="false"><path d="M14.5 29.5h20.3a8.2 8.2 0 0 0 1.2-16.3A12.5 12.5 0 0 0 12.2 16a6.8 6.8 0 0 0 2.3 13.5Z"/></svg><i class="cloud-dot"></i></span>`; mount.innerHTML = `<button class="profile-chip cloud-status-button cloud-status-${kind}" type="button" data-online-auth title="${safe(copy.title)}" aria-label="${safe(`${copy.title}. ${copy.detail}`)}">${icon}<div class="cloud-status-copy"><strong>${safe(copy.title)}</strong><small class="cloud-email">${safe(copy.detail)}</small></div></button>`; mount.querySelector('[data-online-auth]').onclick = () => user ? signOut(auth) : signIn(); }
function refreshGuardianRoomButtons() { const ready = Boolean(user && cloudState.kind === 'ok'); document.querySelectorAll('[data-guardian-room]').forEach(button => { button.disabled = !ready; button.textContent = ready ? t(teacherLocale(), 'room') : 'ক্লাউড সিঙ্ক প্রয়োজন'; button.title = ready ? '' : 'আগে Google সাইন-ইন ও ক্লাউড সিঙ্ক সম্পন্ন করুন'; }); }
function setStatus(kind, text = '', errorCode = '') { cloudState = { kind, message: text, errorCode }; document.querySelectorAll('.online-status').forEach(element => { element.className = `online-status ${kind}`; element.textContent = text || cloudCopy().title; }); renderCloudControl(); refreshGuardianRoomButtons(); }
function syncError(error) { const code = String(error?.code || '').replace(/^firestore\//, ''); return code === 'permission-denied' ? 'permission-denied' : code; }
const stableData = value => {
  if (Array.isArray(value)) return value.map(stableData);
  if (value && typeof value === 'object') return Object.keys(value).sort().reduce((out, key) => { if (key !== 'exportedAt') out[key] = stableData(value[key]); return out; }, {});
  return value;
};
const fingerprint = value => JSON.stringify(stableData(value || {}));
const markLocalDirty = () => localStorage.setItem(SYNC_DIRTY_KEY, '1');
const clearLocalDirty = () => localStorage.removeItem(SYNC_DIRTY_KEY);
const localIsDirty = () => localStorage.getItem(SYNC_DIRTY_KEY) === '1';
const downloadLocalBackup = () => {
  const payload = full();
  if (!payload) return false;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  link.download = `student-progress-local-before-cloud-replace-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  return true;
};
const applyCloudPayload = remote => {
  dashboard().setState(remote.dashboard);
  Object.entries(remote.workspaces || {}).forEach(([id, data]) => localStorage.setItem(workspaceKey(id), JSON.stringify(data)));
  localStorage.setItem(SYNC_FINGERPRINT_KEY, fingerprint(remote));
  clearLocalDirty();
};
async function push() { if (!user || !dashboard()) return; const payload = full(); if (!payload) return; try { await setDoc(doc(db, 'teachers', user.uid, 'snapshots', 'current'), { ownerUid: user.uid, savedAt: new Date().toISOString(), payload }); await pushGuardianSnapshots(); localStorage.setItem(SYNC_FINGERPRINT_KEY, fingerprint(payload)); clearLocalDirty(); setStatus('ok', t(teacherLocale(), 'synced')); } catch (error) { console.error(error); markLocalDirty(); const code = syncError(error); setStatus('err', t(teacherLocale(), 'failed'), code); toast(code === 'permission-denied' ? (teacherLocale() === 'en' ? 'Cloud permission was denied. Local data is still safe on this device.' : 'ক্লাউড অনুমতি পাওয়া যায়নি। স্থানীয় তথ্য এই ডিভাইসে নিরাপদে আছে।') : (teacherLocale() === 'en' ? 'Cloud sync failed. Local data is still available.' : 'ক্লাউড সিঙ্ক হয়নি। স্থানীয় তথ্য ব্যবহার করা যাবে।'), 'error'); } }
function queue() { markLocalDirty(); if (!user) return; clearTimeout(syncTimer); setStatus('wait', t(teacherLocale(), 'saving')); syncTimer = setTimeout(push, 1200); }
const hasTeacherData = payload => Boolean((payload?.dashboard?.students || []).length || (payload?.dashboard?.batches || []).length || Object.keys(payload?.workspaces || {}).length);
async function syncOnLogin() {
  if (!user) return;
  const reference = doc(db, 'teachers', user.uid, 'snapshots', 'current');
  setStatus('wait', t(teacherLocale(), 'saving'));
  try {
    const remoteSnap = await getDoc(reference);
    const local = full();
    const remote = remoteSnap.exists() ? remoteSnap.data()?.payload : null;
    if (remote && hasTeacherData(remote) && local && hasTeacherData(local)) {
      const localFingerprint = fingerprint(local);
      const remoteFingerprint = fingerprint(remote);
      if (localFingerprint === remoteFingerprint) {
        localStorage.setItem(SYNC_FINGERPRINT_KEY, localFingerprint);
        clearLocalDirty();
      } else if (localIsDirty()) {
        await push();
      } else {
        const useCloud = confirm(teacherLocale() === 'en'
          ? 'New cloud data is available. Press OK only to replace this device data with the cloud copy. Cancel keeps this device data.'
          : 'নতুন ক্লাউড তথ্য এসেছে। এই ডিভাইসের তথ্য ক্লাউড কপি দিয়ে বদলাতে শুধু ঠিক আছে চাপুন। বাতিল করলে এই ডিভাইসের তথ্য থাকবে।');
        if (useCloud) {
          downloadLocalBackup();
          applyCloudPayload(remote);
        }
      }
    } else if (remote && hasTeacherData(remote) && (!local || !hasTeacherData(local))) {
      applyCloudPayload(remote);
      toast(teacherLocale() === 'en' ? 'Cloud backup restored to this browser.' : 'ক্লাউড ব্যাকআপ এই ব্রাউজারে পুনরুদ্ধার হয়েছে।');
    } else if ((!remote || !hasTeacherData(remote)) && local && hasTeacherData(local)) {
      await push();
    }
    stopTeacherSnapshot?.();
    stopTeacherSnapshot = onSnapshot(reference, () => {}, error => { console.error(error); setStatus('err', t(teacherLocale(), 'failed'), syncError(error)); });
    if (cloudState.kind !== 'err') setStatus('ok', t(teacherLocale(), 'synced'));
  } catch (error) {
    console.error(error);
    const code = syncError(error);
    setStatus('err', t(teacherLocale(), 'failed'), code);
    toast(code === 'permission-denied' ? (teacherLocale() === 'en' ? 'Firebase denied this account’s cloud access. Check the published Firestore rules and project.' : 'Firebase এই অ্যাকাউন্টের ক্লাউড অনুমতি দেয়নি। Firestore Rules ও প্রকল্প যাচাই করুন।') : (teacherLocale() === 'en' ? 'Cloud sync could not start.' : 'ক্লাউড সিঙ্ক শুরু করা যায়নি।'), 'error');
  }
}onAuthStateChanged(auth, next => { user = next; if (!user) cloudState = { kind: 'offline', message: '', errorCode: '' }; setTimeout(() => { decorate(); if (user) syncOnLogin(); else resumeGuardian(); guardianManager(); }, 0); });
window.SPTOnline = { queue, signIn, downloadGuardian, createRoom, approveGuardianRequest, rejectGuardianRequest, revokeGuardianAccess, endGuardianRoom };
window.addEventListener('spt-render', () => setTimeout(() => { decorate(); guardianManager(); }, 0));
window.addEventListener('spt-workspace-saved', () => queue());
const inviteId = new URLSearchParams(location.search).get('guardianInvite');
const resumeGuardian = async () => {
  if (user || inviteId) return;
  const rememberedInvite = localStorage.getItem(GUARDIAN_LAST_INVITE_KEY);
  if (rememberedInvite) return guardianPortal(rememberedInvite);
  const access = await loadDeviceAccess();
  if (access.length === 1) renderGuardianWorkspace(access[0].token, access[0].record);
  else if (access.length > 1) renderGuardianHub();
};
if (inviteId) guardianPortal(inviteId);
