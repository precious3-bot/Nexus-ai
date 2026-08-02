export const createIconButton = ({ icon, label, tooltip = '', small = false, disabled = false }) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `icon-btn ${small ? 'icon-btn-small' : ''}`;
  button.setAttribute('aria-label', label);
  if (tooltip) {
    button.title = tooltip;
  }
  button.disabled = disabled;
  button.innerHTML = `<i class="${icon}" aria-hidden="true"></i>`;
  return button;
};
