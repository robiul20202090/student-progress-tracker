/* Offline-first entry and PWA controller for the isolated correction build. */
(() => {
  const MODE_KEY = 'spt-teacher-entry-mode-v1';
  const entry = () => localStorage.getItem(MODE_KEY) || '';
  const byId = id => document.getElementById(id);
  const removeGate = () => {
    byId('teacherEntryGate')?.remove();
    document.body.classList.remove('entry-gated');
  };
  const openOnline = () => {
    const run = () => {
      if (window.SPTOnline?.signIn) {
        localStorage.setItem(MODE_KEY, 'online');
        removeGate();
        window.SPTOnline.signIn();
      } else setTimeout(run, 80);
    };
    run();
  };
  const showGate = (forced = false) => {
    if (!forced && entry()) return;
    byId('teacherEntryGate')?.remove();
    document.body.classList.add('entry-gated');
    const gate = document.createElement('section');
    gate.id = 'teacherEntryGate';
    gate.className = 'teacher-entry-gate';
    gate.innerHTML = `<div class="entry-card"><img src="brand-logo.png" alt=""><p class="entry-kicker">শিক্ষার্থীর অগ্রগতি</p><h1>কীভাবে ব্যবহার করবেন?</h1><p class="entry-copy">ইন্টারনেট থাকুক বা না থাকুক, শিক্ষক নিজের ডিভাইসে কাজ চালিয়ে যেতে পারবেন।</p><div class="entry-choice-grid"><button class="entry-choice offline" type="button" data-entry="offline"><strong>অফলাইন শিক্ষক</strong><span>ইন্টারনেট ছাড়াই স্থানীয়ভাবে কাজ করুন</span></button><button class="entry-choice online" type="button" data-entry="online"><strong>অনলাইন শিক্ষক</strong><span>Google সাইন-ইন ও ক্লাউড ব্যাকআপ ব্যবহার করুন</span></button></div><button class="entry-close" type="button" data-entry="close">${forced ? 'বর্তমান মোডে ফিরে যান' : 'পরে সিদ্ধান্ত নেব'}</button></div>`;
    document.body.append(gate);
    gate.querySelector('[data-entry="offline"]').onclick = () => {
      gate.querySelector('.entry-card').innerHTML = `<img src="brand-logo.png" alt=""><p class="entry-kicker">অফলাইন শিক্ষক</p><h1>ডেটা আপনার ডিভাইসে থাকবে</h1><p class="entry-copy warning-copy">ইন্টারনেট ছাড়াই সব স্থানীয় কাজ করা যাবে। তবে ব্রাউজারের ডেটা মুছে গেলে বা ডিভাইস হারালে তথ্য হারাতে পারেন। নিয়মিত সম্পূর্ণ JSON ব্যাকআপ ডাউনলোড করে নিরাপদ স্থানে রাখুন।</p><button class="entry-confirm-offline" type="button">ঝুঁকি বুঝেছি — অফলাইনে চালিয়ে যান</button><button class="entry-close" type="button">ফিরে যান</button>`;
      gate.querySelector('.entry-confirm-offline').onclick = () => { localStorage.setItem(MODE_KEY, 'offline'); removeGate(); };
      gate.querySelector('.entry-close').onclick = () => showGate(true);
    };
    gate.querySelector('[data-entry="online"]').onclick = () => {
      gate.querySelector('.entry-card').innerHTML = `<img src="brand-logo.png" alt=""><p class="entry-kicker">অনলাইন শিক্ষক</p><h1>Google দিয়ে সাইন-ইন করুন</h1><p class="entry-copy">আপনার স্থানীয় কাজ চলবে, আর ইন্টারনেট পেলে ক্লাউড ব্যাকআপ ও অনুমোদিত অভিভাবক রুম ব্যবহার করতে পারবেন।</p><button class="entry-confirm-online" type="button">Google দিয়ে সাইন-ইন</button><button class="entry-close" type="button">ফিরে যান</button>`;
      gate.querySelector('.entry-confirm-online').onclick = openOnline;
      gate.querySelector('.entry-close').onclick = () => showGate(true);
    };
    gate.querySelector('[data-entry="close"]')?.addEventListener('click', removeGate);
  };
  const addHeaderActions = () => {
    const actions = document.querySelector('.header-actions');
    if (!actions || actions.querySelector('[data-entry-mode]')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'profile-chip mode-switch'; button.dataset.entryMode = '1';
    button.innerHTML = `<span>◌</span><div><strong>${entry() === 'online' ? 'অনলাইন শিক্ষক' : 'অফলাইন শিক্ষক'}</strong><small>মোড পরিবর্তন</small></div>`;
    button.onclick = () => showGate(true);
    actions.append(button);
  };
  const addInstallHelp = () => {
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredPrompt = event; addHeaderActions(); });
    window.addEventListener('appinstalled', () => { deferredPrompt = null; });
    window.addEventListener('spt-render', () => {
      addHeaderActions();
      const actions = document.querySelector('.header-actions');
      if (!actions || actions.querySelector('[data-install-app]')) return;
      const install = document.createElement('button');
      install.type = 'button'; install.className = 'profile-chip install-app'; install.dataset.installApp = '1';
      install.innerHTML = '<span>↓</span><div><strong>অ্যাপ ইনস্টল</strong><small>হোম স্ক্রিনে রাখুন</small></div>';
      install.onclick = async () => {
        if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; install.remove(); }
        else alert('Chrome বা Edge মেনু খুলে “Install app” অথবা “Add to Home screen” বেছে নিন। ইনস্টল হলে ইন্টারনেট ছাড়া অ্যাপটি খুলবে।');
      };
      actions.append(install);
    });
  };
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  addInstallHelp();
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => showGate(false), 0));
})();
