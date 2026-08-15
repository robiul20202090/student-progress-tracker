import {
  TaskStatus, getStudentPlan, listDailyLogs, listAssessments, addAssessment, saveStudentPlan,
} from './demo-service.js?v=4.5.0';

const STATUS_ORDER = [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.REVISION];

export function createStudentJourney(context) {
  const { state, root, txt, esc, date, cardHeading, empty, open, close, frame, input, area, select, actions, toast, err, logModal } = context;
  const bn = () => state.language === 'bn';
  const number = value => new Intl.NumberFormat(bn() ? 'bn-BD' : 'en-US', { maximumFractionDigits: 0 }).format(Number(value || 0));
  const nowDate = () => new Date().toISOString().slice(0, 10);
  const time = value => value?.toDate ? value.toDate().getTime() : new Date(value || 0).getTime() || 0;
  const ordered = (items, key = 'createdAt') => [...items].sort((a, b) => time(b[key]) - time(a[key]));
  const subjectName = subject => String(typeof subject === 'object' && subject !== null
    ? (subject.name || subject.label || subject.title || '') : (subject || '')).trim();
  const statusLabel = status => ({
    [TaskStatus.NOT_STARTED]: bn() ? 'শুরু হয়নি' : 'Not started',
    [TaskStatus.IN_PROGRESS]: bn() ? 'চলছে' : 'In progress',
    [TaskStatus.COMPLETED]: bn() ? 'সম্পন্ন' : 'Completed',
    [TaskStatus.REVISION]: bn() ? 'পুনরাবৃত্তি দরকার' : 'Needs revision',
  }[status] || status);
  const planRoadmap = (plan, student) => Array.isArray(plan?.roadmap) && plan.roadmap.length
    ? plan.roadmap.map(subject => ({ ...subject, name: subjectName(subject) }))
    : (student.subjects || []).map(subject => ({ id: subject?.id || subjectName(subject), name: subjectName(subject), chapters: [] })).filter(subject => subject.name);

  const dayNames = bn()
    ? ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার']
    : ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const dayShort = bn() ? ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি'] : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  let activeTab = 'schedule';
  let currentSheet = null;
  let currentStudentId = null;
  let saveTimer = null;

  function progress(roadmap) {
    const tasks = roadmap.flatMap(subject => (subject.chapters || []).flatMap(chapter => chapter.tasks || []));
    const complete = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    return { complete, total: tasks.length, percent: tasks.length ? Math.round((complete / tasks.length) * 100) : 0 };
  }

  function studentSubjects(student, roadmap = []) {
    const direct = (student.subjects || []).map(subjectName).filter(Boolean);
    const fromRoadmap = roadmap.map(subject => subjectName(subject)).filter(Boolean);
    const values = [...new Set([...direct, ...fromRoadmap])];
    return values.length ? values : (bn() ? ['বাংলা', 'ইংরেজি', 'গণিত'] : ['Bangla', 'English', 'Mathematics']);
  }

  function defaultSubjects(student, dayIndex, subjects) {
    const count = Math.min(3, subjects.length);
    return Array.from({ length: count }, (_, offset) => ({
      name: subjects[(dayIndex + offset) % subjects.length], topic: '', progress: null, homework: null, attention: null, remark: '',
    }));
  }

  function newWeek(student, name, workdays, subjects) {
    return {
      id: `week_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name || (bn() ? 'সপ্তাহ ১' : 'Week 1'), start: '', end: '', classesHeld: '',
      rows: dayNames.slice(0, workdays).map((day, index) => ({ day, subjects: defaultSubjects(student, index, subjects) })),
      notes: { strengths: '', difficulties: '', plan: '' },
    };
  }

  function normalizeSheet(plan, student, roadmap) {
    const subjects = studentSubjects(student, roadmap);
    const source = plan?.weeklySheet && typeof plan.weeklySheet === 'object' ? JSON.parse(JSON.stringify(plan.weeklySheet)) : {};
    const workdays = Number(source.workdays) === 4 ? 4 : 6;
    const weeks = Array.isArray(source.weeks) && source.weeks.length ? source.weeks : [newWeek(student, '', workdays, subjects)];
    weeks.forEach((week, weekIndex) => {
      week.id ||= `week_${Date.now()}_${weekIndex}`;
      week.name ||= bn() ? `সপ্তাহ ${weekIndex + 1}` : `Week ${weekIndex + 1}`;
      week.rows = Array.isArray(week.rows) ? week.rows : [];
      for (let index = 0; index < workdays; index += 1) {
        if (!week.rows[index]) week.rows[index] = { day: dayNames[index], subjects: defaultSubjects(student, index, subjects) };
        week.rows[index].day = dayNames[index];
        week.rows[index].subjects = Array.isArray(week.rows[index].subjects) && week.rows[index].subjects.length
          ? week.rows[index].subjects.map(item => ({ name: subjectName(item), topic: item.topic || '', progress: item.progress ?? null, homework: item.homework ?? null, attention: item.attention ?? null, remark: item.remark || '' }))
          : defaultSubjects(student, index, subjects);
      }
      week.rows = week.rows.slice(0, workdays);
      week.notes ||= { strengths: '', difficulties: '', plan: '' };
    });
    const activeWeekId = weeks.some(week => week.id === source.activeWeekId) ? source.activeWeekId : weeks[0].id;
    return { version: 1, workdays, weeks, activeWeekId };
  }

  function activeWeek() {
    return currentSheet?.weeks?.find(week => week.id === currentSheet.activeWeekId) || currentSheet?.weeks?.[0];
  }

  function saveSheetSoon() {
    if (!currentSheet || !currentStudentId) return;
    clearTimeout(saveTimer);
    const status = document.querySelector('[data-sheet-status]');
    if (status) status.textContent = bn() ? 'সংরক্ষণ হচ্ছে…' : 'Saving…';
    saveTimer = setTimeout(async () => {
      try {
        await saveStudentPlan(state.user.uid, currentStudentId, { weeklySheet: currentSheet });
        const saved = document.querySelector('[data-sheet-status]');
        if (saved) saved.textContent = bn() ? 'সর্বশেষ পরিবর্তন সংরক্ষিত' : 'Latest changes saved';
      } catch (error) { err(error); }
    }, 250);
  }

  function score(value) {
    return value === null || value === undefined || value === '' ? null : Math.max(0, Math.min(5, Number(value)));
  }

  function updateSheetField(field) {
    const week = currentSheet?.weeks?.find(item => item.id === field.dataset.weekId);
    const row = week?.rows?.[Number(field.dataset.dayIndex)];
    const subject = row?.subjects?.[Number(field.dataset.subjectIndex)];
    if (!subject) return;
    const key = field.dataset.key;
    subject[key] = ['progress', 'homework', 'attention'].includes(key) ? score(field.value) : field.value;
    const wrapper = field.closest('.weekly-sheet-shell');
    const fill = wrapper?.querySelector(`[data-fill-week="${field.dataset.weekId}"][data-fill-day="${field.dataset.dayIndex}"][data-fill-subject="${field.dataset.subjectIndex}"][data-fill-key="${key}"]`);
    if (fill) fill.style.width = subject[key] === null ? '0%' : `${(subject[key] / 5) * 100}%`;
    updateWeekSummaryDOM(week);
    saveSheetSoon();
  }

  function updateWeekSummaryDOM(week) {
    if (!week) return;
    const values = [];
    week.rows.forEach(row => row.subjects.forEach(subject => ['progress', 'homework', 'attention'].forEach(key => { if (subject[key] !== null && subject[key] !== undefined) values.push(Number(subject[key])); })));
    const avg = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 20) : 0;
    const filled = week.rows.reduce((sum, row) => sum + row.subjects.filter(subject => subject.topic || subject.progress !== null || subject.homework !== null || subject.attention !== null).length, 0);
    const avgNode = document.querySelector('[data-week-average]');
    const filledNode = document.querySelector('[data-week-filled]');
    if (avgNode) avgNode.textContent = `${number(avg)}%`;
    if (filledNode) filledNode.textContent = number(filled);
    const status = document.querySelector('[data-sheet-status]');
    if (status && !status.textContent.includes('সংরক্ষণ') && !status.textContent.includes('Saving')) status.textContent = bn() ? 'পরিবর্তন হয়েছে…' : 'Changed…';
  }

  function scheduleChart(week) {
    return `<div class="weekly-day-chart">${week.rows.map((row, index) => {
      const values = row.subjects.flatMap(subject => [subject.progress, subject.homework, subject.attention]).filter(value => value !== null && value !== undefined).map(Number);
      const avg = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 20) : 0;
      return `<div class="weekly-day-bar"><strong>${number(avg)}%</strong><span style="height:${Math.max(6, avg)}%;background:${avg >= 70 ? '#14966f' : avg >= 40 ? '#d28a2c' : '#d24c43'}"></span><small>${esc(dayShort[index])}</small></div>`;
    }).join('')}</div>`;
  }

  function weeklySheetMarkup(student) {
    const week = activeWeek();
    if (!week) return empty(bn() ? 'সপ্তাহ তৈরি করুন' : 'Create a week', '');
    const weekTabs = currentSheet.weeks.map(item => `<button type="button" class="weekly-tab ${item.id === week.id ? 'active' : ''}" data-sheet-action="switch-week" data-week-id="${esc(item.id)}">${esc(item.name)}</button>`).join('');
    const rows = week.rows.map((row, dayIndex) => row.subjects.map((subject, subjectIndex) => {
      const cell = (key, type = 'text', placeholder = '') => {
        const value = subject[key] ?? '';
        const fill = ['progress', 'homework', 'attention'].includes(key) ? `<div class="weekly-score-track"><span data-fill-week="${esc(week.id)}" data-fill-day="${dayIndex}" data-fill-subject="${subjectIndex}" data-fill-key="${key}" style="width:${value === null || value === '' ? 0 : (Number(value) / 5) * 100}%"></span></div>` : '';
        return `<div class="weekly-cell-input">${type === 'number' ? `<input inputmode="numeric" type="number" min="0" max="5" step="1" value="${value ?? ''}" placeholder="0–5" data-sheet-field data-week-id="${esc(week.id)}" data-day-index="${dayIndex}" data-subject-index="${subjectIndex}" data-key="${key}" aria-label="${esc(key)}">` : `<input type="text" value="${esc(value)}" placeholder="${esc(placeholder)}" data-sheet-field data-week-id="${esc(week.id)}" data-day-index="${dayIndex}" data-subject-index="${subjectIndex}" data-key="${key}">`}${fill}</div>`;
      };
      return `<tr><td class="weekly-day">${subjectIndex === 0 ? esc(row.day) : ''}</td><td class="weekly-subject">${esc(subject.name)}</td><td>${cell('topic', 'text', bn() ? 'আজকের টপিক' : "Today's topic")}</td><td>${cell('progress', 'number')}</td><td>${cell('homework', 'number')}</td><td>${cell('attention', 'number')}</td><td>${cell('remark', 'text', bn() ? 'সংক্ষিপ্ত মন্তব্য' : 'Short note')}</td></tr>`;
    }).join('')).join('');
    return `<section class="weekly-sheet-shell"><div class="weekly-sheet-toolbar"><div class="weekly-tab-row"><span class="weekly-toolbar-label">${bn() ? 'সপ্তাহ' : 'Week'}</span>${weekTabs}<button type="button" class="btn btn-secondary btn-small" data-sheet-action="add-week">＋ ${bn() ? 'নতুন সপ্তাহ' : 'New week'}</button></div><div class="weekly-toolbar-actions"><label>${bn() ? 'কাজের দিন' : 'Working days'} <select data-sheet-action="workdays"><option value="6" ${currentSheet.workdays === 6 ? 'selected' : ''}>6</option><option value="4" ${currentSheet.workdays === 4 ? 'selected' : ''}>4</option></select></label><button type="button" class="btn btn-secondary btn-small" data-sheet-action="print">${bn() ? 'প্রিন্ট / PDF' : 'Print / PDF'}</button></div></div><div class="weekly-sheet-meta"><label>${bn() ? 'সপ্তাহের শুরু' : 'Week start'}<input type="date" value="${esc(week.start || '')}" data-week-meta="start" data-week-id="${esc(week.id)}"></label><label>${bn() ? 'সপ্তাহের শেষ' : 'Week end'}<input type="date" value="${esc(week.end || '')}" data-week-meta="end" data-week-id="${esc(week.id)}"></label><label>${bn() ? 'কতটি ক্লাস হয়েছে' : 'Classes held'}<input type="number" min="0" value="${esc(week.classesHeld || '')}" data-week-meta="classesHeld" data-week-id="${esc(week.id)}"></label></div><p class="weekly-help">${bn() ? 'আজকের দিনের সারিতে বিষয়, টপিক এবং ০–৫ নম্বর লিখুন। নিচের রঙিন বার আপনাকে দ্রুত বুঝতে সাহায্য করবে।' : 'In today’s row, enter the subject topic and 0–5 scores. The colored bars give an immediate result.'}</p><div class="weekly-table-scroll"><table class="weekly-entry-table"><thead><tr><th>${bn() ? 'দিন' : 'Day'}</th><th>${txt('subject')}</th><th>${bn() ? 'টপিক' : 'Topic'}</th><th>${bn() ? 'পড়াশোনা' : 'Learning'}</th><th>${bn() ? 'হোমওয়ার্ক' : 'Homework'}</th><th>${bn() ? 'মনোযোগ' : 'Attention'}</th><th>${bn() ? 'মন্তব্য' : 'Remark'}</th></tr></thead><tbody>${rows}</tbody></table></div><div class="weekly-summary-row"><div class="weekly-summary-card"><strong data-week-average>0%</strong><span>${bn() ? 'সপ্তাহের গড়' : 'Weekly average'}</span></div><div class="weekly-summary-card"><strong data-week-filled>0</strong><span>${bn() ? 'ভরা বিষয় সারি' : 'Filled subject rows'}</span></div><div class="weekly-summary-card weekly-chart-card"><div class="weekly-summary-chart">${scheduleChart(week)}</div><span>${bn() ? 'দিনভিত্তিক অগ্রগতি' : 'Daily progress'}</span></div></div><div class="weekly-notes"><label>${bn() ? 'এই সপ্তাহের শক্তি' : 'Strengths'}<textarea data-week-note="strengths" data-week-id="${esc(week.id)}">${esc(week.notes?.strengths || '')}</textarea></label><label>${bn() ? 'যেখানে সহায়তা দরকার' : 'Needs support'}<textarea data-week-note="difficulties" data-week-id="${esc(week.id)}">${esc(week.notes?.difficulties || '')}</textarea></label><label>${bn() ? 'আগামী সপ্তাহের পরিকল্পনা' : 'Next week plan'}<textarea data-week-note="plan" data-week-id="${esc(week.id)}">${esc(week.notes?.plan || '')}</textarea></label></div></section>`;
  }

  function checklistChartMarkup(roadmap) {
    const rows = roadmap.map(subject => {
      const tasks = (subject.chapters || []).flatMap(chapter => chapter.tasks || []);
      const complete = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
      const percent = tasks.length ? Math.round(complete / tasks.length * 100) : 0;
      return `<div class="checklist-chart-row"><div><strong>${esc(subject.name)}</strong><span>${tasks.length ? `${number(complete)}/${number(tasks.length)}` : (bn() ? 'কাজ নেই' : 'No tasks')}</span></div><div class="checklist-chart-track"><span style="width:${percent}%"></span></div><b>${number(percent)}%</b></div>`;
    }).join('');
    const summary = progress(roadmap);
    return `<article class="card checklist-insight-card">${cardHeading(bn() ? 'চেকলিস্ট অগ্রগতি' : 'Checklist progress', `${number(summary.percent)}% ${bn() ? 'সম্পন্ন' : 'complete'}`)}<p class="section-explanation">${bn() ? 'চেকবক্স সম্পন্ন করলে বিষয়ভিত্তিক অগ্রগতি এখানে দেখা যাবে।' : 'Complete checklist tasks to see subject-level progress here.'}</p>${rows || empty(bn() ? 'এখনও কোনো চেকলিস্ট নেই' : 'No checklist yet', bn() ? 'চেকলিস্ট ট্যাবে অধ্যায় ও কাজ যোগ করুন।' : 'Add chapters and tasks in the checklist tab.')}</article>`;
  }

  function roadmapMarkup(roadmap, studentId) {
    const summary = progress(roadmap);
    const body = roadmap.length ? roadmap.map(subject => {
      const chapters = subject.chapters || [];
      return `<section class="roadmap-subject"><div class="roadmap-subject-head"><strong>${esc(subject.name)}</strong><span>${chapters.length} ${bn() ? 'অধ্যায়' : 'chapters'}</span></div>${chapters.length ? chapters.map(chapter => `<div class="roadmap-chapter"><div class="roadmap-chapter-title"><strong>${esc(chapter.title)}</strong><span>${(chapter.tasks || []).filter(task => task.status === TaskStatus.COMPLETED).length}/${(chapter.tasks || []).length}</span></div>${(chapter.tasks || []).length ? `<div class="task-list">${chapter.tasks.map(task => `<button class="roadmap-task ${esc(task.status || TaskStatus.NOT_STARTED)}" data-journey-action="cycle-task" data-student-id="${esc(studentId)}" data-subject-id="${esc(subject.id)}" data-chapter-id="${esc(chapter.id)}" data-task-id="${esc(task.id)}"><span class="task-dot"></span><span>${esc(task.title)}</span><small>${esc(statusLabel(task.status || TaskStatus.NOT_STARTED))}</small></button>`).join('')}</div>` : `<p class="muted-inline">${bn() ? 'এখনও কোনো কাজ যোগ করা হয়নি।' : 'No tasks added yet.'}</p>`}</div>`).join('') : `<p class="muted-inline">${bn() ? 'এই বিষয়ে অধ্যায় যোগ করুন।' : 'Add chapters for this subject.'}</p>`}</section>`;
    }).join('') : '';
    return `<article class="card journey-roadmap-card">${cardHeading(bn() ? 'চেকলিস্ট' : 'Checklist', `${number(summary.percent)}% ${bn() ? 'সম্পন্ন' : 'complete'}`, `<button class="btn btn-primary" data-journey-action="roadmap" data-student-id="${esc(studentId)}">＋ ${bn() ? 'অধ্যায়/কাজ যোগ করুন' : 'Add chapter / task'}</button>`)}${summary.total ? `<div class="roadmap-progress"><div><span style="width:${summary.percent}%"></span></div><small>${number(summary.complete)}/${number(summary.total)} ${bn() ? 'কাজ সম্পন্ন' : 'tasks completed'}</small></div>` : ''}${body || empty(bn() ? 'বিষয়ভিত্তিক চেকলিস্ট তৈরি করুন' : 'Create a subject checklist', bn() ? 'অধ্যায় ও কাজ যোগ করলে চেকবক্স এবং গ্রাফ তৈরি হবে।' : 'Add chapters and tasks to create checkboxes and charts.')}</article>`;
  }

  function assessmentMarkup(assessments, studentId) {
    const list = ordered(assessments, 'assessmentDate');
    return `<article class="card">${cardHeading(bn() ? 'পরীক্ষা ও মূল্যায়ন' : 'Exams and assessments', bn() ? 'পরীক্ষার ফল ও লক্ষ্য' : 'Results and targets', `<button class="btn btn-primary" data-journey-action="assessment" data-student-id="${esc(studentId)}">＋ ${bn() ? 'মূল্যায়ন যোগ করুন' : 'Add assessment'}</button>`)}${list.length ? `<div class="assessment-list">${list.slice(0, 8).map(item => `<div class="assessment-row"><span class="assessment-score">${number(item.percentage)}%</span><div><strong>${esc(item.title)}</strong><span>${esc(item.subject || (bn() ? 'সকল বিষয়' : 'All subjects'))} · ${esc(item.type || '')} · ${esc(date(item.assessmentDate || item.createdAt))}</span></div><small>${number(item.obtainedMarks ?? item.marks)}/${number(item.fullMarks ?? item.total)}</small></div>`).join('')}</div>` : empty(bn() ? 'এখনও কোনো মূল্যায়ন নেই' : 'No assessments yet', bn() ? 'ক্লাস টেস্ট, অধ্যায় টেস্ট বা যেকোনো পরীক্ষা যোগ করুন।' : 'Add a class test, chapter test, or any custom assessment.')}</article>`;
  }

  function logMarkup(logs, studentId) {
    const list = ordered(logs, 'logDate');
    return `<article class="card">${cardHeading(bn() ? 'পুরনো দৈনিক নথি' : 'Daily records', bn() ? 'সাম্প্রতিক শেখা' : 'Recent learning', `<button class="btn btn-secondary" data-journey-action="log" data-student-id="${esc(studentId)}">＋ ${txt('addLog')}</button>`)}${list.length ? `<div class="log-list">${list.slice(0, 6).map(log => `<article class="log-card"><div class="log-top"><strong>${esc(log.subject)} · ${esc(log.topic)}</strong><small>${esc(date(log.logDate || log.createdAt))}</small></div><div class="rating-pills"><span>↗ ${number(log.learning)}/5</span><span>✓ ${number(log.homeworkRating)}/5</span><span>◉ ${number(log.attention)}/5</span></div>${(log.homework || log.note) ? `<p>${esc(log.homework || log.note)}</p>` : ''}</article>`).join('')}</div><button class="text-button" data-journey-action="history" data-student-id="${esc(studentId)}">${bn() ? 'সম্পূর্ণ ইতিহাস দেখুন' : 'View complete history'} →</button>` : empty(bn() ? 'কোনো পুরনো নথি নেই' : 'No older records', bn() ? 'চাইলে আলাদা দৈনিক নথিও যোগ করতে পারেন।' : 'You can still add a separate daily record.')}</article>`;
  }

  function reflectionMarkup(plan, studentId) {
    const reflection = plan?.weeklyReflection || {};
    const has = reflection.strengths || reflection.difficulties || reflection.parentGuidance || reflection.nextWeekPlan;
    return `<article class="card">${cardHeading(bn() ? 'সাপ্তাহিক নির্দেশনা' : 'Weekly guidance', bn() ? 'অভিভাবকের জন্য সারসংক্ষেপ' : 'Summary for guardian', `<button class="btn btn-secondary" data-journey-action="reflection" data-student-id="${esc(studentId)}">${bn() ? 'সম্পাদনা' : 'Edit'}</button>`)}${has ? `<div class="reflection-grid"><div><small>${bn() ? 'শক্তি' : 'Strengths'}</small><p>${esc(reflection.strengths || '—')}</p></div><div><small>${bn() ? 'যেখানে সহায়তা দরকার' : 'Needs support'}</small><p>${esc(reflection.difficulties || '—')}</p></div><div><small>${bn() ? 'অভিভাবকের জন্য নির্দেশনা' : 'Guidance'}</small><p>${esc(reflection.parentGuidance || '—')}</p></div><div><small>${bn() ? 'আগামী সপ্তাহ' : 'Next week'}</small><p>${esc(reflection.nextWeekPlan || '—')}</p></div></div>` : empty(bn() ? 'সাপ্তাহিক নির্দেশনা যোগ করুন' : 'Add weekly guidance', bn() ? 'শিক্ষকের সারসংক্ষেপ অভিভাবককে পরবর্তী পদক্ষেপ বুঝতে সাহায্য করবে।' : 'A teacher summary gives guardians clear next steps.')}</article>`;
  }

  function renderTabContent(plan, logs, assessments, roadmap, student) {
    const tab = document.querySelector('[data-student-tab-content]');
    if (!tab) return;
    if (activeTab === 'schedule') tab.innerHTML = `${weeklySheetMarkup(student)}<div class="student-secondary-grid">${logMarkup(logs, student.id)}${reflectionMarkup(plan, student.id)}</div>`;
    if (activeTab === 'checklist') tab.innerHTML = roadmapMarkup(roadmap, student.id);
    if (activeTab === 'checklist-chart') tab.innerHTML = checklistChartMarkup(roadmap);
    if (activeTab === 'exams') tab.innerHTML = assessmentMarkup(assessments, student.id);
    updateWeekSummaryDOM(activeWeek());
  }

  async function render() {
    const student = state.students.find(item => item.id === state.selectedStudent);
    if (!student) return;
    root.innerHTML = `<div class="page-loading">${bn() ? 'শিক্ষার্থীর সাপ্তাহিক প্যানেল লোড হচ্ছে…' : 'Loading student weekly panel…'}</div>`;
    try {
      const [plan, logs, assessments] = await Promise.all([getStudentPlan(student.id), listDailyLogs(student.id), listAssessments(student.id)]);
      if (state.selectedStudent !== student.id) return;
      const roadmap = planRoadmap(plan, student);
      currentStudentId = student.id;
      currentSheet = normalizeSheet(plan, student, roadmap);
      const initials = student.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
      root.innerHTML = `<section class="student-weekly-hero"><span class="student-weekly-avatar">${esc(initials)}</span><div class="student-weekly-title"><p class="eyebrow">${esc(student.grade || txt('students'))}</p><h2>${esc(student.name)}</h2><p>${esc(student.school || student.description || (bn() ? 'ব্যক্তিগত শিক্ষার্থী প্যানেল' : 'Individual student panel'))}</p></div><div class="student-weekly-actions"><button class="btn btn-secondary" data-action="back-workspace">← ${txt('students')}</button><button class="btn btn-secondary" data-action="student-room" data-id="${esc(student.id)}">${txt('createRoom')}</button><button class="btn btn-primary" data-journey-action="log" data-student-id="${esc(student.id)}">＋ ${txt('addDailyUpdate')}</button></div></section><div class="student-weekly-intro"><strong>${bn() ? 'আজ কী করবেন?' : 'What to do today'}</strong><span>${bn() ? 'আজকের সারিতে বিষয়, টপিক এবং ০–৫ নম্বর লিখুন। পরে সপ্তাহের কাগজটি প্রিন্ট করতে পারবেন।' : 'Fill today’s subject, topic, and 0–5 scores. You can print the weekly sheet later.'}</span><small data-sheet-status>${bn() ? 'সর্বশেষ পরিবর্তন সংরক্ষিত' : 'Latest changes saved'}</small></div><nav class="student-workspace-tabs" aria-label="Student workspace sections"><button type="button" class="${activeTab === 'schedule' ? 'active' : ''}" data-student-tab="schedule">${bn() ? 'সাপ্তাহিক শিট' : 'Weekly sheet'}</button><button type="button" class="${activeTab === 'checklist' ? 'active' : ''}" data-student-tab="checklist">${bn() ? 'চেকলিস্ট' : 'Checklist'}</button><button type="button" class="${activeTab === 'checklist-chart' ? 'active' : ''}" data-student-tab="checklist-chart">${bn() ? 'চেকলিস্ট গ্রাফ' : 'Checklist chart'}</button><button type="button" class="${activeTab === 'exams' ? 'active' : ''}" data-student-tab="exams">${bn() ? 'পরীক্ষা' : 'Exams'}</button></nav><div data-student-tab-content></div>`;
      renderTabContent(plan, logs, assessments, roadmap, student);
    } catch (error) { err(error); }
  }

  function assessmentModal(studentId) {
    const student = state.students.find(item => item.id === studentId); if (!student) return;
    const subjects = studentSubjects(student).map(item => ({ value: item, label: item }));
    open(frame(bn() ? 'মূল্যায়ন যোগ করুন' : 'Add assessment', bn() ? 'পরীক্ষা, টেস্ট বা মডেল টেস্টের ফল লিখুন।' : 'Record an exam, test, or model test.', `<form id="assessmentForm"><div class="form-grid">${input(bn() ? 'মূল্যায়নের নাম' : 'Assessment title', 'title', '', 'required')}${input(bn() ? 'ধরন' : 'Type', 'type', '', `placeholder="${bn() ? 'যেমন: অধ্যায় টেস্ট' : 'e.g. Chapter test'}"`)}${select(txt('subject'), 'subject', [{ value: '', label: bn() ? 'সব বিষয়' : 'All subjects' }, ...subjects])}${input(bn() ? 'প্রাপ্ত নম্বর' : 'Obtained marks', 'obtainedMarks', '', 'type="number" min="0" required')}${input(bn() ? 'পূর্ণমান' : 'Full marks', 'fullMarks', '100', 'type="number" min="1" required')}${input(bn() ? 'পাস নম্বর' : 'Pass marks', 'passMarks', '', 'type="number" min="0"')}${input(bn() ? 'তারিখ' : 'Date', 'assessmentDate', nowDate(), 'type="date"')}${area(bn() ? 'বিভাগ (ঐচ্ছিক)' : 'Sections (optional)', 'sections', '', `placeholder="${bn() ? 'লিখিত: ৫০\nMCQ: ২৫' : 'Written: 50\nMCQ: 25'}"`)}${area(bn() ? 'শিক্ষকের মতামত' : 'Teacher feedback', 'feedback')}${area(bn() ? 'পরবর্তী লক্ষ্য' : 'Next target', 'nextTarget')}</div>${actions()}</form>`), true);
    document.querySelector('#assessmentForm').onsubmit = async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget); const raw = Object.fromEntries(form); const obtained = Number(raw.obtainedMarks || 0); const full = Number(raw.fullMarks || 0);
      const sections = String(raw.sections || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => { const [name, marks] = line.split(':'); return { name: name.trim(), fullMarks: Number(marks || 0) }; });
      try { await addAssessment(state.user.uid, studentId, { ...raw, obtainedMarks: obtained, fullMarks: full, marks: obtained, total: full, sections }); close(); toast(bn() ? 'মূল্যায়ন সংরক্ষণ হয়েছে।' : 'Assessment saved.'); await render(); } catch (error) { err(error); }
    };
  }

  async function roadmapModal(studentId) {
    const student = state.students.find(item => item.id === studentId); if (!student) return;
    let plan; try { plan = await getStudentPlan(studentId); } catch (error) { err(error); return; }
    const roadmaps = planRoadmap(plan, student);
    const subjectItems = roadmaps.map(subject => ({ value: subject.id, label: subjectName(subject) })).filter(item => item.value && item.label);
    open(frame(bn() ? 'অধ্যায় ও কাজ যোগ করুন' : 'Add chapter and tasks', bn() ? 'একটি বিষয় বেছে অধ্যায় এবং কমা দিয়ে আলাদা করা কাজ যোগ করুন।' : 'Choose a subject, then add a chapter and comma-separated tasks.', `<form id="roadmapForm"><div class="form-grid">${select(txt('subject'), 'subjectId', subjectItems)}${input(bn() ? 'অধ্যায়ের নাম' : 'Chapter title', 'chapterTitle', '', 'required')}${area(bn() ? 'কাজের তালিকা' : 'Task list', 'tasks', '', `required placeholder="${bn() ? 'পাঠ পড়া, অনুশীলনী সম্পন্ন, পুনরাবৃত্তি' : 'Read lesson, complete exercise, revise'}"`)}</div>${actions()}</form>`));
    document.querySelector('#roadmapForm').onsubmit = async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget); const subject = roadmaps.find(item => item.id === form.get('subjectId')); const chapterTitle = String(form.get('chapterTitle') || '').trim();
      const tasks = String(form.get('tasks') || '').split(',').map(title => title.trim()).filter(Boolean).map((title, index) => ({ id: `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`, title, status: TaskStatus.NOT_STARTED }));
      if (!subject || !chapterTitle || !tasks.length) return;
      subject.chapters = [...(subject.chapters || []), { id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, title: chapterTitle, tasks }];
      try { await saveStudentPlan(state.user.uid, studentId, { roadmap: roadmaps }); close(); toast(bn() ? 'চেকলিস্ট আপডেট হয়েছে।' : 'Checklist updated.'); await render(); } catch (error) { err(error); }
    };
  }

  async function reflectionModal(studentId) {
    const plan = await getStudentPlan(studentId); const reflection = plan?.weeklyReflection || {};
    open(frame(bn() ? 'সাপ্তাহিক প্রতিফলন' : 'Weekly reflection', bn() ? 'অভিভাবকের জন্য স্পষ্ট, সহায়ক সারসংক্ষেপ লিখুন।' : 'Write a clear, helpful summary for the guardian.', `<form id="reflectionForm"><div class="form-grid">${area(bn() ? 'শক্তি' : 'Strengths', 'strengths', reflection.strengths || '')}${area(bn() ? 'যেখানে সহায়তা দরকার' : 'Needs support', 'difficulties', reflection.difficulties || '')}${area(bn() ? 'অভিভাবকের জন্য নির্দেশনা' : 'Guidance for guardian', 'parentGuidance', reflection.parentGuidance || '')}${area(bn() ? 'আগামী সপ্তাহের পরিকল্পনা' : 'Next-week plan', 'nextWeekPlan', reflection.nextWeekPlan || '')}</div>${actions()}</form>`));
    document.querySelector('#reflectionForm').onsubmit = async event => { event.preventDefault(); const form = new FormData(event.currentTarget); try { await saveStudentPlan(state.user.uid, studentId, { weeklyReflection: Object.fromEntries(form) }); close(); toast(bn() ? 'সাপ্তাহিক সারসংক্ষেপ সংরক্ষণ হয়েছে।' : 'Weekly reflection saved.'); await render(); } catch (error) { err(error); } };
  }

  async function cycleTask(button) {
    const studentId = button.dataset.studentId; const plan = await getStudentPlan(studentId); const student = state.students.find(item => item.id === studentId); if (!plan || !student) return;
    const roadmap = planRoadmap(plan, student); const subject = roadmap.find(item => item.id === button.dataset.subjectId); const chapter = subject?.chapters?.find(item => item.id === button.dataset.chapterId); const task = chapter?.tasks?.find(item => item.id === button.dataset.taskId); if (!task) return;
    const current = STATUS_ORDER.indexOf(task.status || TaskStatus.NOT_STARTED); task.status = STATUS_ORDER[(current + 1) % STATUS_ORDER.length];
    try { await saveStudentPlan(state.user.uid, studentId, { roadmap }); toast(bn() ? 'চেকলিস্ট স্ট্যাটাস বদলেছে।' : 'Checklist status changed.'); await render(); } catch (error) { err(error); }
  }

  async function historyModal(studentId) {
    const [logs, assessments] = await Promise.all([listDailyLogs(studentId), listAssessments(studentId)]);
    open(frame(bn() ? 'সম্পূর্ণ ইতিহাস' : 'Complete history', bn() ? 'দৈনিক শেখা ও মূল্যায়নের সব রেকর্ড।' : 'All daily learning and assessment records.', `<div class="history-list"><h3>${txt('dailyLog')}</h3>${ordered(logs, 'logDate').map(item => `<div class="history-item"><strong>${esc(item.subject)} · ${esc(item.topic)}</strong><span>${esc(date(item.logDate || item.createdAt))} · ${number(item.learning)}/5</span></div>`).join('') || '<p>—</p>'}<h3>${bn() ? 'পরীক্ষা' : 'Assessments'}</h3>${ordered(assessments, 'assessmentDate').map(item => `<div class="history-item"><strong>${esc(item.title)}</strong><span>${number(item.obtainedMarks ?? item.marks)}/${number(item.fullMarks ?? item.total)} · ${number(item.percentage)}%</span></div>`).join('') || '<p>—</p>'}</div>`), true);
  }

  document.addEventListener('click', event => {
    const tab = event.target.closest('[data-student-tab]');
    if (tab) { activeTab = tab.dataset.studentTab; render(); return; }
    const action = event.target.closest('[data-sheet-action]');
    if (action) {
      const value = action.dataset.sheetAction;
      if (value === 'switch-week') { currentSheet.activeWeekId = action.dataset.weekId; saveSheetSoon(); render(); return; }
      if (value === 'add-week') { const next = newWeek(state.students.find(item => item.id === currentStudentId), '', currentSheet.workdays, studentSubjects(state.students.find(item => item.id === currentStudentId))); currentSheet.weeks.push(next); currentSheet.activeWeekId = next.id; saveSheetSoon(); render(); return; }
      if (value === 'print') { window.print(); return; }
    }
    const journey = event.target.closest('[data-journey-action]'); if (!journey) return;
    const journeyAction = journey.dataset.journeyAction; const studentId = journey.dataset.studentId || state.selectedStudent;
    if (journeyAction === 'log') { logModal(studentId); return; }
    if (journeyAction === 'assessment') { assessmentModal(studentId); return; }
    if (journeyAction === 'roadmap') { roadmapModal(studentId); return; }
    if (journeyAction === 'reflection') { reflectionModal(studentId); return; }
    if (journeyAction === 'cycle-task') { cycleTask(journey); return; }
    if (journeyAction === 'history') { historyModal(studentId); }
  });

  document.addEventListener('input', event => {
    const field = event.target.closest('[data-sheet-field]');
    if (field) updateSheetField(field);
    const meta = event.target.closest('[data-week-meta]');
    if (meta) { const week = currentSheet?.weeks?.find(item => item.id === meta.dataset.weekId); if (week) { week[meta.dataset.weekMeta] = meta.value; saveSheetSoon(); } }
    const note = event.target.closest('[data-week-note]');
    if (note) { const week = currentSheet?.weeks?.find(item => item.id === note.dataset.weekId); if (week) { week.notes ||= {}; week.notes[note.dataset.weekNote] = note.value; saveSheetSoon(); } }
  });

  document.addEventListener('change', event => {
    const workdays = event.target.closest('select[data-sheet-action="workdays"]');
    if (workdays) {
      currentSheet.workdays = Number(workdays.value) === 4 ? 4 : 6;
      const student = state.students.find(item => item.id === currentStudentId);
      currentSheet.weeks.forEach(week => {
        while (week.rows.length < currentSheet.workdays) week.rows.push({ day: dayNames[week.rows.length], subjects: defaultSubjects(student, week.rows.length, studentSubjects(student)) });
        week.rows = week.rows.slice(0, currentSheet.workdays);
      });
      const sheetToSave = JSON.parse(JSON.stringify(currentSheet));
      saveStudentPlan(state.user.uid, currentStudentId, { weeklySheet: sheetToSave })
        .then(() => render())
        .catch(error => err(error));
      return;
    }
    const meta = event.target.closest('[data-week-meta]');
    if (meta) { meta.dispatchEvent(new Event('input', { bubbles: true })); }
  });

  return { render };
}
