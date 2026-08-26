/* Bengali-first display layer for built-in dashboard and batch copy. Teacher-entered values are not translated. */
(() => {
  const KEY = 'spt-language-v1';
  const dictionary = new Map([
    ['শিক্ষার্থীর অগ্রগতি','Student Progress'],['সহজ শিক্ষক কর্মক্ষেত্র','Simple teacher workspace'],['ড্যাশবোর্ড','Dashboard'],['শিক্ষার্থী','Students'],['ব্যাচ','Batches'],['অভিভাবক','Guardians'],['ব্যাকআপ ও ডেটা','Backup & data'],['ব্যাকআপ সেটিংস','Backup settings'],['এখনই ব্যাকআপ নিন','Back up now'],['Guest / Offline','Guest / Offline'],['শিক্ষক কর্মক্ষেত্র','Teacher workspace'],['আজকের প্রয়োজনীয় জায়গাগুলো এক নজরে','Today at a glance'],['একজন শিক্ষার্থী খুলে সরাসরি সাপ্তাহিক রিপোর্ট, চেকলিস্ট, অগ্রগতি ও পরীক্ষা লিখুন।','Open a student to record weekly reports, checklists, progress and exams.'],['শিক্ষার্থী যোগ করুন','Add student'],['খুলুন →','Open →'],['＋ যোগ করুন','＋ Add'],['নাম, রুটিন, সাপ্তাহিক শিট, চেকলিস্ট ও পরীক্ষা','Names, routines, weekly sheets, checklists & exams'],['ব্যাচের পরিচয়, বিষয় ও সময়সূচি এক জায়গায়','Batch identity, subjects & schedule in one place'],['অনুরোধ ও শেয়ার করা রুম এখানে দেখুন','Review requests and shared rooms here'],['সাম্প্রতিক কাজ','Recent work'],['সর্বশেষ পরিবর্তন','Latest changes'],['শিক্ষার্থী দেখুন →','View students →'],['অপেক্ষমান অনুরোধ','Pending requests'],['সব দেখুন →','View all →'],['কোনো অপেক্ষমান অনুরোধ নেই','No pending requests'],['নতুন অনুরোধ এলে এখানে দেখা যাবে।','New requests will appear here.'],['এখনও কোনো কাজ নেই','No work recorded yet'],['প্রথম শিক্ষার্থী যোগ করলে সাম্প্রতিক কাজ এখানে দেখা যাবে।','Add a first student to see recent work here.'],['নাম দিয়ে খুঁজুন, তারপর কর্মক্ষেত্র খুলুন','Search by name, then open the workspace'],['প্রতিটি শিক্ষার্থীর সাপ্তাহিক শিট ও সিলেবাস আলাদাভাবে সংরক্ষিত থাকে।','Each student’s weekly sheet and syllabus are stored separately.'],['শিক্ষার্থীর নাম দিয়ে খুঁজুন','Search by student name'],['ব্যাচের মাসিক ক্লাস, উপস্থিতি ও ফি','Monthly classes, attendance & fees'],['ব্যাচ যোগ করুন','Add batch'],['ব্যাচের নাম দিয়ে খুঁজুন','Search batch by name'],['রুম, অনুরোধ ও শিক্ষক-নিয়ন্ত্রিত আপডেট','Rooms, requests & teacher-controlled updates'],['ফোনে পুশ নয়—প্রথম ধাপে অভিভাবক রুমের ভিতরের ফিড ও ব্যাজ ব্যবহার হবে।','No phone push in this phase—use the guardian room feed and badge.'],['লিঙ্গ','Gender'],['ছেলে','Male'],['মেয়ে','Female'],['শ্রেণি','Class'],['বিদ্যালয়ের নাম','School name'],['গ্রুপ','Group'],['শিক্ষকের নাম','Teacher name'],['শিক্ষকের নোট','Teacher note'],['বিষয় নির্বাচন','Select subjects'],['বিষয় বেছে নিন','Choose subject'],['যোগ করুন','Add'],['বাতিল','Cancel'],['বন্ধ','Close'],['অনুমোদন','Approve'],['অবতার বদলান','Change avatar'],['নির্বাচিত','Selected'],['বেছে নিন','Choose'],['ফাঁকা শিট','Blank sheet'],['সম্পন্ন শিট','Completed sheet'],['মাসিক সারসংক্ষেপ','Monthly summary'],['উপস্থিতি','Attendance'],['ফি','Fees'],['রুটিন','Routine'],['সংরক্ষণ করুন','Save'],['সম্পাদনা','Edit'],['প্রয়োগ করুন','Apply'],['মুছুন','Delete']
  ]);
  [
    ['ব্যাচ','Batches'],['＋ ব্যাচ যোগ করুন','＋ Add batch'],['ব্যাচের মাসিক ক্লাস, উপস্থিতি ও ফি','Monthly batch classes, attendance & fees'],['একটি ব্যাচে ১–৫টি বিষয়, সংক্ষিপ্ত মাসিক ক্লাস শিট এবং সহজ শিক্ষার্থী রেকর্ড।','Each batch supports 1–5 subjects, a compact monthly class sheet and simple learner records.'],['ব্যাচের নাম দিয়ে খুঁজুন','Search by batch name'],['এখনও কোনো ব্যাচ নেই','No batches yet'],['প্রথম ব্যাচ যোগ করে মাসিক ক্লাস শিট শুরু করুন।','Add a first batch to start the monthly class sheet.'],['অভিভাবক রুম','Guardian room'],['অভিভাবক HTML শেয়ার','Share guardian HTML']
  ].forEach(([bn,en])=>dictionary.set(bn,en));
  [
    ['ব্যাচ কর্মক্ষেত্র','Batch workspace'],['ব্যাচে ফিরুন','Back to batches'],['শ্রেণি উল্লেখ করা হয়নি','Class not specified'],['বিষয় নেই','No subjects'],['সময়সূচি যোগ করা হয়নি','Schedule not added'],['মাসিক ক্লাস শিট','Monthly class sheet'],['শিক্ষার্থী ও উপস্থিতি','Learners & attendance'],['মাসিক ফি','Monthly fee'],['মাসিক সারসংক্ষেপ','Monthly summary'],['মাস নির্বাচন','Select month'],['সক্রিয় রুটিন','Active routine'],['ফাঁকা শিট প্রিন্ট','Print blank sheet'],['সম্পন্ন শিট প্রিন্ট','Print completed sheet'],['মাসিক ক্লাস রেকর্ড','Monthly class record'],['এই মাসে প্রয়োগ:','Applied this month:'],['কাগজ কম লাগবে? প্রয়োজন হলে PDF কম পৃষ্ঠায় সাজাতে পারেন। শেয়ার বা আপলোডের আগে শিক্ষার্থী তথ্য যাচাই করুন।','Need fewer pages? You may arrange the PDF into fewer pages if needed. Check learner information before sharing or uploading.'],['এই মাসে রুটিনের কোনো ক্লাস নেই','No scheduled class this month'],['রুটিন থেকে ক্লাসের দিন ও বিষয় যোগ করুন।','Add class days and subjects from the routine.'],['উপস্থিতি নিন','Record attendance'],['বিষয়','Subject'],['আজকের টপিক','Today’s topic'],['গ্রুপ হোমওয়ার্ক','Group homework'],['পরের ক্লাস','Next class'],['টপিক লিখুন','Write topic'],['হোমওয়ার্ক','Homework'],['পরের কাজ','Next task'],['পূর্ণ শিক্ষার্থী','Full student'],['শুধু ব্যাচে','Batch only'],['শুধু ব্যাচে নাম যোগ করুন','Add batch-only learner'],['খুলুন','Open'],['সরান','Remove'],['জন শিক্ষার্থী','learners'],['একই তালিকায় রাখা যায়।','can be kept in one list.'],['ড্যাশবোর্ড থেকে যোগ করুন','Add from dashboard'],['নাম যোগ করুন','Add name'],['অনেক নাম একসাথে','Add many names at once'],['শিক্ষার্থীর নাম খুঁজুন','Search learner name'],['এখনও কোনো শিক্ষার্থী নেই','No learners yet'],['নাম লিখে অথবা ড্যাশবোর্ড থেকে শিক্ষার্থী যোগ করুন।','Add a name or select a learner from the dashboard.'],['ফি মাস','Fee month'],['প্রত্যাশিত মাসিক ফি','Expected monthly fee'],['যেমন: 1000','e.g. 1000'],['একবার লিখলে সব শিক্ষার্থীর জন্য দেখা যাবে।','Set it once to show it for every learner.'],['এই মাসে প্রাপ্ত','Received this month'],['প্রত্যাশিত','Expected'],['পরিশোধিত','Paid'],['আংশিক','Partially paid'],['বাকি','Due'],['রেকর্ড হয়নি','Not recorded'],['ফি রেকর্ডের জন্য শিক্ষার্থী যোগ করুন','Add learners to begin fee records'],['নির্ধারণ করা হয়নি','Not set'],['পেমেন্টের তারিখ এখনও রেকর্ড হয়নি','Payment date has not been recorded yet'],['প্রাপ্ত টাকা','Received amount'],['ব্যক্তিগত নোট (ঐচ্ছিক)','Private note (optional)'],['শুধু শিক্ষক-ব্যবহারের ব্যক্তিগত রেকর্ড; এখানে কোনো টাকা গ্রহণ করা হয় না।','Private teacher record only; no money is collected here.'],['উপস্থিতি চার্ট','Attendance chart'],['শিক্ষার্থীভিত্তিক মাসিক উপস্থিতি','Monthly attendance by learner'],['এই মাসে এখনও উপস্থিতি নেওয়া হয়নি','No attendance recorded this month'],['উপস্থিত','Present'],['দেরি','Late'],['অনুপস্থিত','Absent'],['শুধু যে ক্লাসগুলোর উপস্থিতি নেওয়া হয়েছে, সেগুলোই দেখা যাচ্ছে।','Only classes with recorded attendance are shown.'],['আগে শিক্ষার্থী ও উপস্থিতি রেকর্ড যোগ করুন।','Add learners and attendance records first.'],['ফি চার্ট','Fee chart'],['প্রত্যাশিত ও প্রাপ্ত টাকা','Expected and received fees'],['প্রাপ্ত','Received'],['নতুন ব্যাচ','New batch'],['ব্যাচের পরিচয় দিয়ে শুরু করুন','Start with the batch details'],['ব্যাচের নাম','Batch name'],['শ্রেণি নির্বাচন (ঐচ্ছিক)','Select class (optional)'],['সর্বোচ্চ পাঁচটি বিষয় নির্বাচন করুন।','Select up to five subjects.'],['কমপক্ষে একটি বিষয় নির্বাচন করুন','Select at least one subject'],['নিজের বিষয় লিখুন','Enter custom subject'],['ক্লাসের দিন','Class days'],['একটি ব্যাচে সর্বোচ্চ চারটি দিন নির্বাচন করুন।','Choose up to four class days for a batch.'],['ক্লাসের সময়','Class time'],['ব্যাচ তৈরি করুন','Create batch'],['ব্যাচ সম্পাদনা','Edit batch'],['ব্যাচের তথ্য সংরক্ষণ হয়েছে।','Batch details saved.'],['রুটিন সংরক্ষণ','Save routine'],['নতুন রুটিন','New routine'],['রুটিনের নাম','Routine name'],['বিষয় যোগ করুন','Add subject'],['নিজের বিষয়','Custom subject'],['প্রতি লাইনে একটি নাম','One name per line'],['নামগুলো যোগ করুন','Add names'],['ড্যাশবোর্ডে এখনো কোনো শিক্ষার্থী নেই। চাইলে শুধু ব্যাচে নাম যোগ করুন।','There are no dashboard learners yet. You can add a batch-only learner instead.'],['নির্বাচিতদের যোগ করুন','Add selected learners'],['আজ সবাই উপস্থিত','Everyone present today'],['উপস্থিতি সংরক্ষণ','Save attendance']
  ].forEach(([bn,en])=>dictionary.set(bn,en));
  const dataLabels = new Map([
    ['বাংলা','Bangla'],['বাংলা ১ম পত্র','Bangla Paper 1'],['বাংলা ২য় পত্র','Bangla Paper 2'],['বাংলা ২য় পত্র','Bangla Paper 2'],['ইংরেজি','English'],['ইংরেজি ১ম পত্র','English Paper 1'],['ইংরেজি ২য় পত্র','English Paper 2'],['ইংরেজি ২য় পত্র','English Paper 2'],['গণিত','Mathematics'],['উচ্চতর গণিত','Higher Mathematics'],['বিজ্ঞান','Science'],['পদার্থবিজ্ঞান','Physics'],['রসায়ন','Chemistry'],['রসায়ন','Chemistry'],['জীববিজ্ঞান','Biology'],['তথ্য ও যোগাযোগ প্রযুক্তি','Information & Communication Technology'],['কম্পিউটার','Computer'],['বাংলাদেশ ও বিশ্বপরিচয়','Bangladesh & Global Studies'],['বাংলাদেশ ও বিশ্বপরিচয়','Bangladesh & Global Studies'],['ইতিহাস','History'],['ভূগোল','Geography'],['অর্থনীতি','Economics'],['হিসাববিজ্ঞান','Accounting'],['ব্যবসায় উদ্যোগ','Business Entrepreneurship'],['কৃষিশিক্ষা','Agricultural Studies'],['গার্হস্থ্য বিজ্ঞান','Home Science'],['চারু ও কারুকলা','Arts & Crafts'],['শারীরিক শিক্ষা','Physical Education'],['আরবি','Arabic'],['আরবি ১ম পত্র','Arabic Paper 1'],['আরবি ২য় পত্র','Arabic Paper 2'],['আরবি ২য় পত্র','Arabic Paper 2'],['কুরআন মাজীদ ও তাজভীদ','Quran Majid & Tajweed'],['ইসলাম ও নৈতিক শিক্ষা','Islam & Moral Education'],['হিন্দুধর্ম ও নৈতিক শিক্ষা','Hindu Religion & Moral Education'],['বৌদ্ধধর্ম ও নৈতিক শিক্ষা','Buddhist Religion & Moral Education'],['খ্রিস্টধর্ম ও নৈতিক শিক্ষা','Christian Religion & Moral Education'],['পুনরালোচনা','Revision'],
    ['শনিবার','Saturday'],['রবিবার','Sunday'],['সোমবার','Monday'],['মঙ্গলবার','Tuesday'],['বুধবার','Wednesday'],['বৃহস্পতিবার','Thursday'],['শুক্রবার','Friday'],['জানুয়ারি','January'],['ফেব্রুয়ারি','February'],['মার্চ','March'],['এপ্রিল','April'],['মে','May'],['জুন','June'],['জুলাই','July'],['আগস্ট','August'],['সেপ্টেম্বর','September'],['অক্টোবর','October'],['নভেম্বর','November'],['ডিসেম্বর','December'],
    ['হোমওয়ার্ক হয়নি','Homework not done'],['হোমওয়ার্ক আংশিক','Homework partly done'],['হোমওয়ার্ক দেওয়া হয়নি','Homework not assigned'],['মনোযোগ নেই','No attention'],['আংশিক মনোযোগ','Partial attention'],['অগ্রগতি হয়নি','No progress'],['আংশিক অগ্রগতি','Partial progress'],['নতুন অনুমতির অনুরোধ','New access request'],['শিক্ষকের নাম','Teacher name'],['Guest শিক্ষক','Guest teacher'],['আরও বিকল্প','More options'],['＋ শিক্ষার্থী যোগ করুন','＋ Add student'],['সহায়তা বা মতামতের জন্য:','For help or feedback:'],['ক্লাউড সংযুক্ত নয়','Cloud not connected'],['Google দিয়ে সাইন-ইন','Sign in with Google'],['ক্লাউড সিঙ্ক হয়েছে','Cloud synced'],['ক্লাউড সিঙ্ক হয়নি','Cloud sync failed'],['ক্লাউডে সংরক্ষণ হচ্ছে…','Saving to cloud…']
  ]);
  let locale = localStorage.getItem(KEY) === 'en' ? 'en' : 'bn';
  const replace = node => {
    if (locale !== 'en' || node.nodeType !== Node.TEXT_NODE) return;
    const text = node.nodeValue || '';
    const lead = text.match(/^\s*/)?.[0] || '';
    const tail = text.match(/\s*$/)?.[0] || '';
    const core = text.trim();
    const translated = dictionary.get(core) || dataLabels.get(core);
    const pending = core.match(/^(\d+) টি অনুরোধ অপেক্ষায়$/);
    const learners = core.match(/^(\d+) জন শিক্ষার্থী$/);
    const feeCount = core.match(/^(পরিশোধিত|আংশিক|বাকি|রেকর্ড হয়নি) (\d+)$/);
    const expectedFee = core.match(/^প্রত্যাশিত ৳(.+)$/);
    const week = core.match(/^সপ্তাহ (\d+)$/);
    if (translated) node.nodeValue = `${lead}${translated}${tail}`;
    else if (pending) node.nodeValue = `${lead}${pending[1]} pending request${pending[1] === '1' ? '' : 's'}${tail}`;
    else if (learners) node.nodeValue = `${lead}${learners[1]} learner${learners[1] === '1' ? '' : 's'}${tail}`;
    else if (feeCount) node.nodeValue = `${lead}${({পরিশোধিত:'Paid',আংশিক:'Partially paid',বাকি:'Due','রেকর্ড হয়নি':'Not recorded'}[feeCount[1]])} ${feeCount[2]}${tail}`;
    else if (expectedFee) node.nodeValue = `${lead}Expected ৳${expectedFee[1]}${tail}`;
    else if (week) node.nodeValue = `${lead}Week ${week[1]}${tail}`;
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
    wrap.addEventListener('click', event => { const target=event.target.closest('[data-language-choice]'); if(!target)return; locale=target.dataset.languageChoice==='en'?'en':'bn'; localStorage.setItem(KEY,locale); localStorage.setItem('spt-workspace-language-v1',locale); location.reload(); });
    mount.append(wrap);
  };
  const refresh = () => { control(); translate(document.body); };
  window.SPTLocale = { get:()=>locale, set: value => { locale=value==='en'?'en':'bn';localStorage.setItem(KEY,locale);localStorage.setItem('spt-workspace-language-v1',locale);location.reload(); }, translate };
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
