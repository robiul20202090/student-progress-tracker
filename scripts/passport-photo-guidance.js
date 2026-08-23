/* Isolated test enhancement: clarify the recommended profile-photo framing once per form. */
(() => {
  const guidance = 'ঐচ্ছিক · সর্বোচ্চ 100 KB · পাসপোর্ট-সাইজ, মুখ স্পষ্ট দেখা যায় এমন ছবি দিন';
  const apply = () => {
    document.querySelectorAll('#studentForm input[name="photo"]').forEach((input) => {
      const note = input.closest('label')?.querySelector('small');
      if (!note || note.dataset.passportGuidance === 'done') return;
      note.textContent = guidance;
      note.dataset.passportGuidance = 'done';
    });
  };
  const observer = new MutationObserver(() => window.requestAnimationFrame(apply));
  observer.observe(document.body, { childList: true, subtree: true });
  apply();
})();
