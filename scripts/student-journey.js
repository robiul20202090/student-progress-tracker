import {
  TaskStatus, getStudentPlan, listDailyLogs, listAssessments, addAssessment, saveStudentPlan,
} from './demo-service.js?v=4.5.0';

const STATUS_ORDER = [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.REVISION];

export function createStudentJourney(context) {
  const { state, root, txt, esc, date, metric, cardHeading, empty, open, close, frame, input, area, select, actions, toast, err, logModal } = context;
  const statusLabel = status => ({
    [TaskStatus.NOT_STARTED]: state.language === 'bn' ? 'শুরু হয়নি' : 'Not started',
    [TaskStatus.IN_PROGRESS]: state.language === 'bn' ? 'চলছে' : 'In progress',
    [TaskStatus.COMPLETED]: state.language === 'bn' ? 'সম্পন্ন' : 'Completed',
    [TaskStatus.REVISION]: state.language === 'bn' ? 'পুনরাবৃত্তি দরকার' : 'Needs revision',
  }[status] || status);
  const number = value => new Intl.NumberFormat(state.language === 'bn' ? 'bn-BD' : 'en-US', { maximumFractionDigits: 0 }).format(Number(value || 0));
  const nowDate = () => new Date().toISOString().slice(0, 10);
  const time = value => value?.toDate ? value.toDate().getTime() : new Date(value || 0).getTime() || 0;
  const ordered = (items, key = 'createdAt') => [...items].sort((a, b) => time(b[key]) - time(a[key]));
  const average = (items, key) => items.length ? Math.round((items.reduce((sum, item) => sum + Number(item[key] || 0), 0) / items.length) * 20) : 0;
  // Older student records may contain subject objects with different fields.
  // Keep every display and selector on a plain text label.
  const subjectName = subject => String(typeof subject === 'object' && subject !== null
    ? (subject.name || subject.label || subject.title || '') : (subject || '')).trim();
  const planRoadmap = (plan, student) => Array.isArray(plan?.roadmap) && plan.roadmap.length
    ? plan.roadmap.map(subject => ({ ...subject, name: subjectName(subject) }))
    : (student.subjects || []).map(subject => ({ id: subject?.id || subjectName(subject), name: subjectName(subject), chapters: [] })).filter(subject => subject.name);

  function progress(roadmap) {
    const tasks = roadmap.flatMap(subject => (subject.chapters || []).flatMap(chapter => chapter.tasks || []));
    const complete = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    return { complete, total: tasks.length, percent: tasks.length ? Math.round((complete / tasks.length) * 100) : 0 };
  }

  function miniChart(logs) {
    const weekly = ordered(logs, 'logDate').slice(0, 7).reverse();
    if (!weekly.length) return `<div class="journey-empty-chart"><strong>${state.language === 'bn' ? 'প্রথম দৈনিক নথি যোগ করুন' : 'Add the first daily log'}</strong><span>${state.language === 'bn' ? 'তখন এখানেই আসল সাপ্তাহিক ট্রেন্ড দেখা যাবে।' : 'Your real weekly trend will appear here.'}</span></div>`;
    return `<div class="journey-chart" aria-label="${esc(txt('progressInsights'))}">${weekly.map(log => {
      const score = Math.round(((Number(log.learning || 0) + Number(log.homeworkRating || 0) + Number(log.attention || 0)) / 15) * 100);
      return `<div class="journey-bar-group"><span class="journey-bar-value">${number(score)}%</span><div class="journey-bar" style="height:${Math.max(8, score)}%"></div><small>${esc(date(log.logDate || log.createdAt))}</small></div>`;
    }).join('')}</div>`;
  }

  function roadmapMarkup(roadmap, studentId) {
    const summary = progress(roadmap);
    const body = roadmap.length ? roadmap.map(subject => {
      const chapters = subject.chapters || [];
      return `<section class="roadmap-subject"><div class="roadmap-subject-head"><strong>${esc(subject.name)}</strong><span>${chapters.length} ${state.language === 'bn' ? 'অধ্যায়' : 'chapters'}</span></div>${chapters.length ? chapters.map(chapter => `<div class="roadmap-chapter"><div class="roadmap-chapter-title"><strong>${esc(chapter.title)}</strong><span>${(chapter.tasks || []).filter(task => task.status === TaskStatus.COMPLETED).length}/${(chapter.tasks || []).length}</span></div>${(chapter.tasks || []).length ? `<div class="task-list">${chapter.tasks.map(task => `<button class="roadmap-task ${esc(task.status || TaskStatus.NOT_STARTED)}" data-journey-action="cycle-task" data-student-id="${esc(studentId)}" data-subject-id="${esc(subject.id)}" data-chapter-id="${esc(chapter.id)}" data-task-id="${esc(task.id)}"><span class="task-dot"></span><span>${esc(task.title)}</span><small>${esc(statusLabel(task.status || TaskStatus.NOT_STARTED))}</small></button>`).join('')}</div>` : `<p class="muted-inline">${state.language === 'bn' ? 'এখনও কোনো কাজ যোগ করা হয়নি।' : 'No tasks added yet.'}</p>`}</div>`).join('') : `<p class="muted-inline">${state.language === 'bn' ? 'এই বিষয়ে অধ্যায় যোগ করুন।' : 'Add chapters for this subject.'}</p>`}</section>`;
    }).join('') : '';
    return `<article class="card journey-roadmap-card">${cardHeading(txt('roadmap'), `${number(summary.percent)}% ${state.language === 'bn' ? 'সম্পন্ন' : 'complete'}`, `<button class="btn btn-secondary" data-journey-action="roadmap" data-student-id="${esc(studentId)}">＋ ${state.language === 'bn' ? 'অধ্যায়/কাজ' : 'Chapter / task'}</button>`)}${summary.total ? `<div class="roadmap-progress"><div><span style="width:${summary.percent}%"></span></div><small>${number(summary.complete)}/${number(summary.total)} ${state.language === 'bn' ? 'কাজ সম্পন্ন' : 'tasks completed'}</small></div>` : ''}${body || empty(state.language === 'bn' ? 'বিষয়ভিত্তিক রোডম্যাপ তৈরি করুন' : 'Create a subject roadmap', state.language === 'bn' ? 'অধ্যায় ও কাজ যোগ করলে চেকলিস্ট এবং গ্রাফ তৈরি হবে।' : 'Add chapters and tasks to create the checklist and charts.')}</article>`;
  }

  function assessmentMarkup(assessments, studentId) {
    const list = ordered(assessments, 'assessmentDate');
    return `<article class="card">${cardHeading(txt('assessmentCentre'), state.language === 'bn' ? 'যেকোনো পরীক্ষা বা টেস্ট' : 'Any exam or test', `<button class="btn btn-primary" data-journey-action="assessment" data-student-id="${esc(studentId)}">＋ ${state.language === 'bn' ? 'মূল্যায়ন যোগ করুন' : 'Add assessment'}</button>`)}${list.length ? `<div class="assessment-list">${list.slice(0, 5).map(item => `<div class="assessment-row"><span class="assessment-score">${number(item.percentage)}%</span><div><strong>${esc(item.title)}</strong><span>${esc(item.subject || (state.language === 'bn' ? 'সকল বিষয়' : 'All subjects'))} · ${esc(item.type || '')} · ${esc(date(item.assessmentDate || item.createdAt))}</span></div><small>${number(item.obtainedMarks)}/${number(item.fullMarks)}</small></div>`).join('')}</div>` : empty(state.language === 'bn' ? 'এখনও কোনো মূল্যায়ন নেই' : 'No assessments yet', state.language === 'bn' ? 'ক্লাস টেস্ট, অধ্যায় টেস্ট, মডেল টেস্ট বা যেকোনো নিজস্ব পরীক্ষা যোগ করুন।' : 'Add a class test, chapter test, model test, or any custom assessment.')}</article>`;
  }

  function logMarkup(logs, studentId) {
    const list = ordered(logs, 'logDate');
    return `<article class="card">${cardHeading(txt('dailyLog'), state.language === 'bn' ? 'সাম্প্রতিক শেখা' : 'Recent learning', `<button class="btn btn-primary" data-journey-action="log" data-student-id="${esc(studentId)}">＋ ${txt('addLog')}</button>`)}${list.length ? `<div class="log-list">${list.slice(0, 6).map(log => `<article class="log-card"><div class="log-top"><strong>${esc(log.subject)} · ${esc(log.topic)}</strong><small>${esc(date(log.logDate || log.createdAt))}</small></div><div class="rating-pills"><span>↗ ${number(log.learning)}/5</span><span>✓ ${number(log.homeworkRating)}/5</span><span>◉ ${number(log.attention)}/5</span></div>${(log.homework || log.note) ? `<p>${esc(log.homework || log.note)}</p>` : ''}</article>`).join('')}</div><button class="text-button" data-journey-action="history" data-student-id="${esc(studentId)}">${state.language === 'bn' ? 'সম্পূর্ণ ইতিহাস দেখুন' : 'View complete history'} →</button>` : empty(state.language === 'bn' ? 'প্রথম দৈনিক নথি যোগ করুন' : 'Add the first daily log', state.language === 'bn' ? 'প্রতিটি নথিতে শেখা, হোমওয়ার্ক ও মনোযোগের রেটিং থাকবে।' : 'Each log records learning, homework, and attention ratings.')}</article>`;
  }

  function reflectionMarkup(plan, studentId) {
    const reflection = plan?.weeklyReflection || {};
    const has = reflection.strengths || reflection.difficulties || reflection.parentGuidance || reflection.nextWeekPlan;
    return `<article class="card">${cardHeading(txt('parentGuidance'), state.language === 'bn' ? 'সাপ্তাহিক প্রতিফলন' : 'Weekly reflection', `<button class="btn btn-secondary" data-journey-action="reflection" data-student-id="${esc(studentId)}">${state.language === 'bn' ? 'সম্পাদনা' : 'Edit'}</button>`)}${has ? `<div class="reflection-grid"><div><small>${state.language === 'bn' ? 'শক্তি' : 'Strengths'}</small><p>${esc(reflection.strengths || '—')}</p></div><div><small>${state.language === 'bn' ? 'যেখানে সহায়তা দরকার' : 'Needs support'}</small><p>${esc(reflection.difficulties || '—')}</p></div><div><small>${state.language === 'bn' ? 'অভিভাবকের জন্য নির্দেশনা' : 'Guidance for guardian'}</small><p>${esc(reflection.parentGuidance || '—')}</p></div><div><small>${state.language === 'bn' ? 'আগামী সপ্তাহ' : 'Next week'}</small><p>${esc(reflection.nextWeekPlan || '—')}</p></div></div>` : empty(state.language === 'bn' ? 'সাপ্তাহিক নির্দেশনা যোগ করুন' : 'Add weekly guidance', state.language === 'bn' ? 'শিক্ষকের সারসংক্ষেপ অভিভাবককে স্পষ্টভাবে সাহায্য করবে।' : 'A teacher summary gives guardians clear next steps.')}</article>`;
  }

  async function render() {
    const student = state.students.find(item => item.id === state.selectedStudent);
    if (!student) return;
    root.innerHTML = `<div class="page-loading">${state.language === 'bn' ? 'শেখার যাত্রা লোড হচ্ছে…' : 'Loading learning journey…'}</div>`;
    try {
      const [plan, logs, assessments] = await Promise.all([getStudentPlan(student.id), listDailyLogs(student.id), listAssessments(student.id)]);
      if (state.selectedStudent !== student.id) return;
      const roadmap = planRoadmap(plan, student);
      const roadmapProgress = progress(roadmap);
      const assessmentList = ordered(assessments, 'assessmentDate');
      const averageLearning = average(logs, 'learning');
      const averageHomework = average(logs, 'homeworkRating');
      const averageAttention = average(logs, 'attention');
      root.innerHTML = `<section class="student-hero"><span class="hero-avatar">${esc(student.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase())}</span><div class="hero-copy"><p class="eyebrow">${esc(student.grade || txt('students'))}</p><h2>${esc(student.name)}</h2><p>${esc((student.subjects || []).map(subjectName).filter(Boolean).join(' · ') || (state.language === 'bn' ? 'নিজস্ব শেখার পরিকল্পনা' : 'Custom learning plan'))}</p></div><div class="hero-actions"><button class="btn btn-secondary" data-action="back-workspace">← ${txt('students')}</button><button class="btn btn-secondary" data-action="student-room" data-id="${esc(student.id)}">${txt('createRoom')}</button><button class="btn btn-primary" data-journey-action="log" data-student-id="${esc(student.id)}">＋ ${txt('addDailyUpdate')}</button></div></section><section class="metric-grid journey-metrics">${metric('↗', txt('learningProgress'), `${number(averageLearning)}%`, state.language === 'bn' ? 'দৈনিক শেখার গড়' : 'Daily learning average')}${metric('✓', txt('homeworkCompletion'), `${number(averageHomework)}%`, state.language === 'bn' ? 'হোমওয়ার্কের গড়' : 'Homework average', 'teal')}${metric('◉', state.language === 'bn' ? 'মনোযোগ' : 'Attention', `${number(averageAttention)}%`, state.language === 'bn' ? 'অংশগ্রহণের গড়' : 'Participation average', 'orange')}${metric('★', txt('latestAssessment'), assessmentList[0] ? `${number(assessmentList[0].percentage)}%` : '—', assessmentList[0]?.title || (state.language === 'bn' ? 'এখনও কোনো পরীক্ষা নেই' : 'No assessment yet'), 'red')}</section><section class="student-insight-grid"><article class="card">${cardHeading(txt('progressInsights'), state.language === 'bn' ? 'সাম্প্রতিক ৭টি নথি' : 'Last 7 logs')}${miniChart(logs)}<div class="insight-caption">${state.language === 'bn' ? 'চার্টটি বাস্তব দৈনিক শেখা, হোমওয়ার্ক এবং মনোযোগের রেটিং থেকে তৈরি।' : 'This chart is created from real learning, homework, and attention ratings.'}</div></article><article class="card guardian-access-card">${cardHeading(txt('guardianManagement'), state.language === 'bn' ? 'অভিভাবক প্রবেশ' : 'Guardian access')}<strong class="room-code-display">${esc(student.roomCode || (state.language === 'bn' ? 'এখনও কোড তৈরি হয়নি' : 'No code yet'))}</strong><p>${state.language === 'bn' ? 'অভিভাবক আগে Google দিয়ে সাইন ইন করবেন, তারপর এই কোড দিয়ে অনুমতি চাইবেন।' : 'The guardian signs in with Google first, then uses this code to request permission.'}</p><button class="btn btn-secondary" data-action="student-room" data-id="${esc(student.id)}">${txt('createRoom')}</button></article></section><section class="journey-workspace">${logMarkup(logs, student.id)}${assessmentMarkup(assessments, student.id)}${roadmapMarkup(roadmap, student.id)}${reflectionMarkup(plan, student.id)}</section>`;
    } catch (error) { err(error); }
  }

  function assessmentModal(studentId) {
    const student = state.students.find(item => item.id === studentId); if (!student) return;
    const subjects = (student.subjects || []).map(item => ({ value: subjectName(item), label: subjectName(item) })).filter(item => item.value);
    open(frame(state.language === 'bn' ? 'মূল্যায়ন যোগ করুন' : 'Add assessment', state.language === 'bn' ? 'যেকোনো পরীক্ষা, টেস্ট বা নিজস্ব মূল্যায়নের ফল লিখুন।' : 'Record any exam, test, or custom assessment.', `<form id="assessmentForm"><div class="form-grid">${input(state.language === 'bn' ? 'মূল্যায়নের নাম' : 'Assessment title', 'title', '', 'required')}${input(state.language === 'bn' ? 'ধরন' : 'Type', 'type', '', `placeholder="${state.language === 'bn' ? 'যেমন: অধ্যায় টেস্ট' : 'e.g. Chapter test'}"`)}${select(txt('subject'), 'subject', [{ value: '', label: state.language === 'bn' ? 'সব/নিজস্ব' : 'All / custom' }, ...subjects])}${input(state.language === 'bn' ? 'প্রাপ্ত নম্বর' : 'Obtained marks', 'obtained', '', 'type="number" min="0" required')}${input(state.language === 'bn' ? 'পূর্ণমান' : 'Full marks', 'fullMarks', '100', 'type="number" min="1" required')}${input(state.language === 'bn' ? 'পাস নম্বর' : 'Pass marks', 'passMarks', '', 'type="number" min="0"')}${input(state.language === 'bn' ? 'তারিখ' : 'Date', 'assessmentDate', nowDate(), 'type="date"')}${area(state.language === 'bn' ? 'বিভাগ (ঐচ্ছিক)' : 'Sections (optional)', 'sections', '', `placeholder="${state.language === 'bn' ? 'লিখিত: 50\nMCQ: 25' : 'Written: 50\nMCQ: 25'}"`)}${area(state.language === 'bn' ? 'শিক্ষকের মতামত' : 'Teacher feedback', 'feedback')}${area(state.language === 'bn' ? 'পরবর্তী লক্ষ্য' : 'Next target', 'nextTarget')}</div>${actions()}</form>`), true);
    document.querySelector('#assessmentForm').onsubmit = async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const sections = String(form.get('sections') || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => { const [name, marks] = line.split(':'); return { name: name.trim(), fullMarks: Number(marks || 0) }; });
      try { await addAssessment(state.user.uid, studentId, { ...Object.fromEntries(form), sections }); close(); toast(state.language === 'bn' ? 'মূল্যায়ন সংরক্ষণ হয়েছে।' : 'Assessment saved.'); await render(); } catch (error) { err(error); }
    };
  }

  async function roadmapModal(studentId) {
    const student = state.students.find(item => item.id === studentId); if (!student) return;
    let plan; try { plan = await getStudentPlan(studentId); } catch (error) { err(error); return; }
    const roadmaps = planRoadmap(plan, student);
    const subjectItems = roadmaps.map(subject => ({ value: subject.id, label: subjectName(subject) })).filter(item => item.value && item.label);
    open(frame(state.language === 'bn' ? 'অধ্যায় ও কাজ যোগ করুন' : 'Add chapter and tasks', state.language === 'bn' ? 'একটি বিষয় বেছে অধ্যায় এবং কমা দিয়ে আলাদা করা কাজ যোগ করুন।' : 'Choose a subject, then add a chapter and comma-separated tasks.', `<form id="roadmapForm"><div class="form-grid">${select(txt('subject'), 'subjectId', subjectItems)}${input(state.language === 'bn' ? 'অধ্যায়ের নাম' : 'Chapter title', 'chapterTitle', '', 'required')}${area(state.language === 'bn' ? 'কাজের তালিকা' : 'Task list', 'tasks', '', `required placeholder="${state.language === 'bn' ? 'পাঠ পড়া, অনুশীলনী সম্পন্ন, পুনরাবৃত্তি' : 'Read lesson, complete exercise, revise'}"`)}</div>${actions()}</form>`));
    document.querySelector('#roadmapForm').onsubmit = async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget); const subject = roadmaps.find(item => item.id === form.get('subjectId')); const chapterTitle = String(form.get('chapterTitle') || '').trim();
      const tasks = String(form.get('tasks') || '').split(',').map(title => title.trim()).filter(Boolean).map((title, index) => ({ id: `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`, title, status: TaskStatus.NOT_STARTED }));
      if (!subject || !chapterTitle || !tasks.length) return;
      subject.chapters = [...(subject.chapters || []), { id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, title: chapterTitle, tasks }];
      try { await saveStudentPlan(state.user.uid, studentId, { roadmap: roadmaps }); close(); toast(state.language === 'bn' ? 'রোডম্যাপ আপডেট হয়েছে।' : 'Roadmap updated.'); await render(); } catch (error) { err(error); }
    };
  }

  async function reflectionModal(studentId) {
    const plan = await getStudentPlan(studentId); const reflection = plan?.weeklyReflection || {};
    open(frame(state.language === 'bn' ? 'সাপ্তাহিক প্রতিফলন' : 'Weekly reflection', state.language === 'bn' ? 'অভিভাবকের জন্য স্পষ্ট, সহায়ক সারসংক্ষেপ লিখুন।' : 'Write a clear, helpful summary for the guardian.', `<form id="reflectionForm"><div class="form-grid">${area(state.language === 'bn' ? 'শক্তি' : 'Strengths', 'strengths', reflection.strengths || '')}${area(state.language === 'bn' ? 'যেখানে সহায়তা দরকার' : 'Needs support', 'difficulties', reflection.difficulties || '')}${area(state.language === 'bn' ? 'অভিভাবকের জন্য নির্দেশনা' : 'Guidance for guardian', 'parentGuidance', reflection.parentGuidance || '')}${area(state.language === 'bn' ? 'আগামী সপ্তাহের পরিকল্পনা' : 'Next-week plan', 'nextWeekPlan', reflection.nextWeekPlan || '')}</div>${actions()}</form>`));
    document.querySelector('#reflectionForm').onsubmit = async event => { event.preventDefault(); try { await saveStudentPlan(state.user.uid, studentId, { weeklyReflection: Object.fromEntries(new FormData(event.currentTarget)) }); close(); toast(state.language === 'bn' ? 'সাপ্তাহিক সারসংক্ষেপ সংরক্ষণ হয়েছে।' : 'Weekly reflection saved.'); await render(); } catch (error) { err(error); } };
  }

  async function cycleTask(button) {
    const studentId = button.dataset.studentId; const plan = await getStudentPlan(studentId); const student = state.students.find(item => item.id === studentId); if (!plan || !student) return;
    const roadmap = planRoadmap(plan, student); const subject = roadmap.find(item => item.id === button.dataset.subjectId); const chapter = subject?.chapters?.find(item => item.id === button.dataset.chapterId); const task = chapter?.tasks?.find(item => item.id === button.dataset.taskId); if (!task) return;
    const current = STATUS_ORDER.indexOf(task.status || TaskStatus.NOT_STARTED); task.status = STATUS_ORDER[(current + 1) % STATUS_ORDER.length];
    try { await saveStudentPlan(state.user.uid, studentId, { roadmap }); await render(); } catch (error) { err(error); }
  }

  async function historyModal(studentId) {
    const [logs, assessments] = await Promise.all([listDailyLogs(studentId), listAssessments(studentId)]);
    open(frame(state.language === 'bn' ? 'সম্পূর্ণ ইতিহাস' : 'Complete history', state.language === 'bn' ? 'দৈনিক শেখা ও মূল্যায়নের সব রেকর্ড।' : 'All daily learning and assessment records.', `<div class="history-list"><h3>${txt('dailyLog')}</h3>${ordered(logs, 'logDate').map(item => `<div class="history-item"><strong>${esc(item.subject)} · ${esc(item.topic)}</strong><span>${esc(date(item.logDate || item.createdAt))} · ${number(item.learning)}/5</span></div>`).join('') || '<p>—</p>'}<h3>${txt('assessmentCentre')}</h3>${ordered(assessments, 'assessmentDate').map(item => `<div class="history-item"><strong>${esc(item.title)}</strong><span>${number(item.obtainedMarks)}/${number(item.fullMarks)} · ${number(item.percentage)}%</span></div>`).join('') || '<p>—</p>'}</div>`), true);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-journey-action]'); if (!button) return;
    const action = button.dataset.journeyAction; const studentId = button.dataset.studentId || state.selectedStudent;
    if (action === 'log') { logModal(studentId); return; }
    if (action === 'assessment') { assessmentModal(studentId); return; }
    if (action === 'roadmap') { roadmapModal(studentId); return; }
    if (action === 'reflection') { reflectionModal(studentId); return; }
    if (action === 'cycle-task') { cycleTask(button); return; }
    if (action === 'history') { historyModal(studentId); }
  });

  return { render };
}
