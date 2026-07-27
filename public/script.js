const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messages = document.getElementById('messages');

function addMessage(text, role) {
  const bubble = document.createElement('div');
  bubble.className = `message ${role}`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const message = input.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  input.value = '';
  addMessage('Thinking…', 'bot');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    const lastMessage = messages.lastElementChild;
    if (lastMessage) {
      lastMessage.remove();
    }

    if (!response.ok) {
      addMessage(data.error || 'Something went wrong.', 'bot');
      return;
    }

    addMessage(data.reply || 'No response returned.', 'bot');
  } catch (error) {
    const lastMessage = messages.lastElementChild;
    if (lastMessage) {
      lastMessage.remove();
    }
    addMessage('Unable to reach the server right now.', 'bot');
  }
});
