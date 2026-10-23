const dialog = document.getElementById('sidebar-dialog');
const openBtn = document.getElementById('menu-toggle');
const closeBtn = document.getElementById('menu-close');

openBtn.addEventListener('click', () => dialog.showModal());
closeBtn.addEventListener('click', () => dialog.close());

// Close if the user clicks the outer backdrop area
dialog.addEventListener('click', (e) => {
  const rect = dialog.getBoundingClientRect();
  const clickedInDialog = (
    rect.top <= e.clientY &&
    e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX &&
    e.clientX <= rect.left + rect.width
  );
  if (!clickedInDialog) dialog.close();
});