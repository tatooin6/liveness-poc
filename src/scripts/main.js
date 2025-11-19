const button = document.getElementById('actionButton');
const app = document.getElementById('app');

if (button && app) {
  button.addEventListener('click', () => {
    const notice = document.createElement('p');
    notice.textContent = 'Interaction handled at ' + new Date().toLocaleTimeString();
    app.appendChild(notice);
  });
}
