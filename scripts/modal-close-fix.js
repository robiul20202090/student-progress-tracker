/* Isolated test safeguard: direct modal-close handling for every close and cancel control. */
(() => {
  const closeModal = () => {
    const dialog = document.querySelector('#appModal');
    const body = document.querySelector('#modalBody');
    if (dialog?.open) dialog.close();
    if (body) body.replaceChildren();
  };
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('#appModal [data-close], #appModal .close-button');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeModal();
  }, true);
})();
