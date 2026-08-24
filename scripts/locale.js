/* Bengali-first display layer for built-in dashboard and batch copy. Teacher-entered values are not translated. */
(() => {
  const KEY = 'spt-language-v1';
  const dictionary = new Map([
    ['শিক্ষার্থীর অগ্রগতি','Student Progress'],['সহজ শিক্ষক কর্মক্ষেত্র','Simple teacher workspace'],['ড্যাশবোর্ড','Dashboard'],['শিক্ষার্থী','Students'],['ব্যাচ','Batches'],['অভিভাবক','Guardians'],['ব্যাকআপ ও ডেটা','Backup & data'],['ব্যাকআপ সেটিংস','Backup settings'],['এখনই ব্যাকআপ নিন','Back up now'],['Guest / Offline','Guest / Offline'],['শিক্ষক কর্মক্ষেত্র','Teacher workspace'],['আজকের প্রয়োজনীয় জায়গাগুলো এক নজরে','Today at a glance'],['একজন শিক্ষার্থী খুলে সরাসরি সাপ্তাহিক রিপোর্ট, চেকলিস্ট, অগ্রগতি ও পরীক্ষা লিখুন।','Open a student to record weekly reports, checklists, progress and exams.'],['শিক্ষার্থী যোগ করুন','Add student'],['খুলুন →','Open →'],['＋ যোগ করুন','＋ Add'],['নাম, রুটিন, সাপ্তাহিক শিট, চেকলিস্ট ও পরীক্ষা','Names, routines, weekly sheets, checklists & exams'],['ব্যাচের পরিচয়, বিষয় ও সময়সূচি এক জায়গায়','Batch identity, subjects & schedule in one place'],['অনুরোধ ও শেয়ার করা রুম এখানে দেখুন','Review requests and shared rooms here'],['সাম্প্রতিক কাজ','Recent work'],['সর্বশেষ পরিবর্তন','Latest changes'],['শিক্ষার্থী দেখুন →','View students →'],['অপেক্ষমান অনুরোধ','Pending requests'],['সব দেখুন →','View all →'],['কোনো অপেক্ষমান অনুরোধ নেই','No pending requests'],['নতুন অনুরোধ এলে এখানে দেখা যাবে।','New requests will appear here.'],['এখনও কোনো কাজ নেই','No work recorded yet'],['প্রথম শিক্ষার্থী যোগ করলে সাম্প্রতিক কাজ এখানে দেখা যাবে।','Add a first student to see recent work here.'],['নাম দিয়ে খুঁজুন, তারপর কর্মক্ষেত্র খুলুন','Search by name, then open the workspace'],['প্রতিটি শিক্ষার্থীর সাপ্তাহিক শিট ও সিলেবাস আলাদাভাবে সংরক্ষিত থাকে।','Each student’s weekly sheet and syllabus are stored separately.'],['শিক্ষার্থীর নাম দিয়ে খুঁজুন','Search by student name'],['ব্যাচের মাসিক ক্লাস, উপস্থিতি ও ফি','Monthly classes, attendance & fees'],['ব্যাচ যোগ করুন','Add batch'],['ব্যাচের নাম দিয়ে খুঁজুন','Search batch by name'],['রুম, অনুরোধ ও শিক্ষক-নিয়ন্ত্রিত আপডেট','Rooms, requests & teacher-controlled updates'],['ফোনে পুশ নয়—প্রথম ধাপে অভিভাবক রুমের ভিতরের ফিড ও ব্যাজ ব্যবহার হবে।','No phone push in this phase—use the guardian room feed and badge.'],['লিঙ্গ','Gender'],['ছেলে','Male'],['মেয়ে','Female'],['শ্রেণি','Class'],['বিদ্যালয়ের নাম','School name'],['গ্রুপ','Group'],['শিক্ষকের নাম','Teacher name'],['শিক্ষকের নোট','Teacher note'],['বিষয় নির্বাচন','Select subjects'],['বিষয় বেছে নিন','Choose subject'],['যোগ করুন','Add'],['বাতিল','Cancel'],['বন্ধ','Close'],['অনুমোদন','Approve'],['অবতার বদলান','Change avatar'],['নির্বাচিত','Selected'],['বেছে নিন','Choose'],['ফাঁকা শিট','Blank sheet'],['সম্পন্ন শিট','Completed sheet'],['মাসিক সারসংক্ষেপ','Monthly summary'],['উপস্থিতি','Attendance'],['ফি','Fees'],['রুটিন','Routine'],['সংরক্ষণ করুন','Save'],['সম্পাদনা','Edit'],['প্রয়োগ করুন','Apply'],['মুছুন','Delete']
  ]);
  [
    ['ব্যাচ','Batches'],['＋ ব্যাচ যোগ করুন','＋ Add batch'],['ব্যাচের মাসিক ক্লাস, উপস্থিতি ও ফি','Monthly batch classes, attendance & fees'],['একটি ব্যাচে ১–৫টি বিষয়, সংক্ষিপ্ত মাসিক ক্লাস শিট এবং সহজ শিক্ষার্থী রেকর্ড।','Each batch supports 1–5 subjects, a compact monthly class sheet and simple learner records.'],['ব্যাচের নাম দিয়ে খুঁজুন','Search by batch name'],['এখনও কোনো ব্যাচ নেই','No batches yet'],['প্রথম ব্যাচ যোগ করে মাসিক ক্লাস শিট শুরু করুন।','Add a first batch to start the monthly class sheet.'],['অভিভাবক রুম','Guardian room'],['অভিভাবক HTML শেয়ার','Share guardian HTML']
  ].forEach(([bn,en])=>dictionary.set(bn,en));
  let locale = localStorage.getItem(KEY) === 'en' ? 'en' : 'bn';
  const replace = node => {
    if (locale !== 'en' || node.nodeType !== Node.TEXT_NODE) return;
    const text = node.nodeValue || '';
    const lead = text.match(/^\s*/)?.[0] || '';
    const tail = text.match(/\s*$/)?.[0] || '';
    const core = text.trim();
    if (dictionary.has(core)) node.nodeValue = `${lead}${dictionary.get(core)}${tail}`;
  };
  const translate = root => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'bn';
    document.body.classList.toggle('lang-en', locale === 'en');
    document.title = locale === 'en' ? 'Student Progress' : 'শিক্ষার্থীর অগ্রগতি';
    if (locale === 'en') {
      const walk = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
      const nodes=[]; while(walk.nextNode()) nodes.push(walk.currentNode); nodes.forEach(replace);
      document.querySelectorAll('[placeholder]').forEach(el => { const old=el.getAttribute('placeholder')||''; if(dictionary.has(old)) el.setAttribute('placeholder',dictionary.get(old)); });
    }
    document.querySelectorAll('[data-language-choice]').forEach(btn => btn.classList.toggle('active', btn.dataset.languageChoice===locale));
  };
  const control = () => {
    const mount = document.querySelector('#headerLanguageSlot');
    if (!mount || mount.querySelector('.language-choice-wrap')) return;
    const wrap=document.createElement('div'); wrap.className='language-choice-wrap';
    wrap.innerHTML='<button type="button" class="language-choice" data-language-choice="bn">বাংলা</button><button type="button" class="language-choice" data-language-choice="en">EN</button>';
    wrap.addEventListener('click', event => { const target=event.target.closest('[data-language-choice]'); if(!target)return; locale=target.dataset.languageChoice==='en'?'en':'bn'; localStorage.setItem(KEY,locale); location.reload(); });
    mount.append(wrap);
  };
  const refresh = () => { control(); translate(document.body); };
  window.SPTLocale = { get:()=>locale, set: value => { locale=value==='en'?'en':'bn';localStorage.setItem(KEY,locale);location.reload(); }, translate };
  window.addEventListener('spt-render', () => setTimeout(refresh,0));
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(refresh,0);
    const observer = new MutationObserver(records => {
      if (locale !== 'en') return;
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) replace(node);
        else if (node.nodeType === Node.ELEMENT_NODE) translate(node);
      }));
    });
    observer.observe(document.body, { childList:true, subtree:true });
  });
})();
