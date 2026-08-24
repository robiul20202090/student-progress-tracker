/* Per-browser display setting for built-in workspace language. Student and teacher-entered content remains untouched. */
(() => {
  const key='spt-workspace-language-v1';
  const dict=new Map([
    ['শিক্ষার্থী প্রগতি','Student Progress'],['ব্যক্তিগত শিক্ষার্থী কর্মক্ষেত্র','Individual student workspace'],['ড্যাশবোর্ডে ফিরুন','Back to dashboard'],['স্থানীয়ভাবে সংরক্ষিত','Saved locally'],['সংরক্ষণ করা হচ্ছে…','Saving…'],['অভিভাবক রুম কোড','Guardian room code'],['রুম শেষ করুন','End room'],['রুম তৈরি করুন','Create room'],['সাপ্তাহিক রিপোর্ট','Weekly report'],['চেকলিস্ট','Checklist'],['সিলেবাস অগ্রগতি','Syllabus progress'],['পরীক্ষার ফলাফল','Exam results'],['সর্বশেষ আপডেট:','Last updated:'],['সাপ্তাহিক অগ্রগতি রিপোর্ট','Weekly progress report'],['সিলেবাস চেকলিস্ট','Syllabus checklist'],['সিলেবাস অগ্রগতি রিপোর্ট','Syllabus progress report'],['ফাঁকা শিট','Blank sheet'],['সম্পন্ন শিট','Completed sheet'],['নতুন মাস','New month'],['নতুন সপ্তাহ','New week'],['সক্রিয় রুটিন','Active routine'],['প্রয়োগ করুন','Apply'],['সম্পাদনা','Edit'],['অভিভাবক শেয়ারিং','Guardian sharing'],['অভিভাবককে পাঠান','Send to guardian'],['বাতিল','Cancel'],['পাঠান','Send'],['প্রিন্ট','Print'],['সমাপ্ত','Complete'],['খসড়া','Draft']
  ]);
  const english=()=>localStorage.getItem(key)==='en';
  const set=(next)=>{localStorage.setItem(key,next);location.reload()};
  const run=()=>{
    document.documentElement.lang=english()?'en':'bn';
    document.body.classList.toggle('lang-en',english());
    document.title=english()?'Student Progress':'শিক্ষার্থী প্রগতি';
    if(english()){
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      nodes.forEach(node=>{const raw=node.nodeValue||'',lead=raw.match(/^\s*/)?.[0]||'',tail=raw.match(/\s*$/)?.[0]||'',core=raw.trim();if(dict.has(core))node.nodeValue=`${lead}${dict.get(core)}${tail}`});
    }
    const host=document.querySelector('.workspace-header');if(host&&!host.querySelector('.workspace-language-switch')){const wrap=document.createElement('div');wrap.className='workspace-language-switch';wrap.innerHTML=`<button type="button" class="${english()?'':'active'}" data-ws-locale="bn">বাংলা</button><button type="button" class="${english()?'active':''}" data-ws-locale="en">EN</button>`;wrap.addEventListener('click',e=>{const b=e.target.closest('[data-ws-locale]');if(b)set(b.dataset.wsLocale)});host.querySelector('.header-topline')?.append(wrap)}
  };
  const observer=new MutationObserver(()=>{if(english())run()});
  document.addEventListener('DOMContentLoaded',()=>{run();observer.observe(document.body,{childList:true,subtree:true})});
})();
