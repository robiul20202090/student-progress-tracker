document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="backup"]');
  if (!button || typeof window.__openDashboardBackup !== 'function') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.__openDashboardBackup();
}, true);
