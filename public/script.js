const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messages = document.getElementById('messages');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const year = document.getElementById('year');
const particlesLayer = document.getElementById('particles');
const toastContainer = document.getElementById('toast-container');
const conversationSearch = document.getElementById('conversation-search');
const conversationList = document.getElementById('conversation-list');
const newChatButton = document.getElementById('new-chat');
const logoutButton = document.getElementById('logout-button');
const themeToggle = document.getElementById('theme-toggle');
const connectionStatus = document.getElementById('connection-status');
const thinkingIndicator = document.getElementById('thinking-indicator');
const activeChatTitle = document.getElementById('active-chat-title');
const chatSubtitle = document.getElementById('chat-subtitle');
const scrollToBottomButton = document.getElementById('scroll-to-bottom');
const sendButton = document.getElementById('send-button');
const charCounter = document.getElementById('char-counter');
const stopChatButton = document.getElementById('stop-chat');
const retryLastButton = document.getElementById('retry-last');
const exportTxt = document.getElementById('export-txt');
const exportMd = document.getElementById('export-md');
const composerToolsMenu = document.getElementById('composer-tools-menu');
const voicePanel = document.getElementById('voice-panel');
const imageInput = document.getElementById('image-input');
const fileInput = document.getElementById('file-input');
const attachmentList = document.getElementById('attachment-list');
const workspaceList = document.getElementById('workspace-list');
const workspacePanel = document.getElementById('workspace-panel');
const workspaceName = document.getElementById('workspace-active-title');
const workspaceDescription = document.getElementById('workspace-active-description');
const workspaceStarters = document.getElementById('workspace-starters');
const workspaceDrawerToggle = document.getElementById('workspace-drawer-toggle');
const workspaceDrawerOverlay = document.getElementById('workspace-drawer-overlay');
const modeSelector = document.getElementById('mode-selector');
const dropZone = document.getElementById('drop-zone');
const focusSearch = document.getElementById('focus-search');

const WORKSPACE_STORAGE_PREFIX = 'nexus-ai-chats-';
const LAST_WORKSPACE_KEY = 'nexus-ai-last-workspace';
const MODE_STORAGE_KEY = 'nexus-ai-mode';
const DEFAULT_MODE = 'balanced';
const AI_MODES = [
  { id: 'balanced', label: 'Balanced', icon: 'fa-solid fa-scale-balanced' },
  { id: 'fast', label: 'Fast', icon: 'fa-solid fa-bolt' },
  { id: 'precise', label: 'Precise', icon: 'fa-solid fa-bullseye' },
  { id: 'creative', label: 'Creative', icon: 'fa-solid fa-lightbulb' },
  { id: 'detailed', label: 'Detailed', icon: 'fa-solid fa-book-open' },
  { id: 'productivity', label: 'Productivity', icon: 'fa-solid fa-rocket' },
];

let workspaces = [];
let activeWorkspaceId = null;
let currentAiMode = DEFAULT_MODE;
const MAX_CHARACTERS = 5000;
const INITIAL_GREETING = 'Welcome to Nexus AI. Ask me for a strategy brief, a polished rewrite, or a clear plan for your next move.';

let chats = [];
let activeChatId = null;
let isRequestInFlight = false;
let currentAbortController = null;
let lastRequestId = 0;
let currentDraftMessage = '';
let composerAttachments = [];
let voiceSessionState = 'idle';

function setCurrentYear() {
  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

function createParticles() {
  if (!particlesLayer) return;
  const count = 28;
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${8 + Math.random() * 8}s`;
    particle.style.animationDelay = `${Math.random() * 6}s`;
    particlesLayer.appendChild(particle);
  }
}

function revealOnScroll() {
  const items = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15 });

  items.forEach((item) => observer.observe(item));
}

function updateCharCounter() {
  if (!charCounter) return;
  const count = input.value.length;
  charCounter.textContent = `${count} / ${MAX_CHARACTERS}`;
  charCounter.classList.toggle('over-limit', count > MAX_CHARACTERS);
}

function showToast(message, type = 'info') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  toastContainer.appendChild(toast);
  window.setTimeout(() => toast.classList.add('visible'), 10);
  window.setTimeout(() => {
    toast.classList.remove('visible');
    window.setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function formatFileSize(bytes) {
  if (!bytes || Number.isNaN(bytes)) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getAttachmentIcon(kind, fileName) {
  if (kind === 'image') return '<i class="fa-solid fa-image"></i>';
  const lowerName = `${fileName || ''}`.toLowerCase();
  if (lowerName.endsWith('.pdf')) return '<i class="fa-solid fa-file-pdf"></i>';
  if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) return '<i class="fa-solid fa-file-word"></i>';
  if (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx')) return '<i class="fa-solid fa-file-excel"></i>';
  if (lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')) return '<i class="fa-solid fa-file-powerpoint"></i>';
  return '<i class="fa-solid fa-file-lines"></i>';
}

function renderAttachments() {
  if (!attachmentList) return;
  if (!composerAttachments.length) {
    attachmentList.innerHTML = '';
    attachmentList.hidden = true;
    return;
  }

  attachmentList.hidden = false;
  attachmentList.innerHTML = composerAttachments
    .map((attachment) => {
      const preview = attachment.kind === 'image' && attachment.previewUrl
        ? `<img src="${attachment.previewUrl}" alt="${attachment.file.name}" />`
        : `<div class="attachment-icon">${getAttachmentIcon(attachment.kind, attachment.file.name)}</div>`;
      return `
        <div class="attachment-chip">
          <div class="attachment-preview">${preview}</div>
          <div class="attachment-details">
            <span class="attachment-name">${attachment.file.name}</span>
            <span class="attachment-meta">${attachment.kind === 'image' ? 'Image' : 'File'} · ${formatFileSize(attachment.file.size)}</span>
            <div class="attachment-status">${attachment.status || 'Ready to send'}</div>
            <div class="attachment-progress-bar">
              <span class="attachment-progress" style="width:${attachment.progress || 100}%"></span>
            </div>
          </div>
          <button type="button" class="attachment-remove" data-id="${attachment.id}" aria-label="Remove attachment">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>`;
    })
    .join('');

  attachmentList.querySelectorAll('.attachment-remove').forEach((button) => {
    button.addEventListener('click', () => removeComposerAttachment(button.dataset.id));
  });
}

function removeComposerAttachment(id) {
  const attachment = composerAttachments.find((item) => item.id === id);
  if (attachment?.previewUrl) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
  composerAttachments = composerAttachments.filter((item) => item.id !== id);
  renderAttachments();
}

function addComposerAttachment(file, kind) {
  if (!file) return;
  const previewUrl = kind === 'image' ? URL.createObjectURL(file) : null;
  const attachment = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    previewUrl,
    file,
    status: 'Uploading…',
    progress: 0,
  };
  composerAttachments.push(attachment);
  renderAttachments();
  const progressInterval = window.setInterval(() => {
    attachment.progress = Math.min(100, attachment.progress + Math.floor(Math.random() * 24) + 12);
    if (attachment.progress >= 100) {
      attachment.progress = 100;
      attachment.status = 'Ready to send';
      window.clearInterval(progressInterval);
    }
    renderAttachments();
  }, 140);
}

function toggleComposerTools(forceState) {
  if (!composerToolsMenu) return;
  const shouldOpen = forceState ?? composerToolsMenu.hidden;
  composerToolsMenu.hidden = !shouldOpen;
}

function setVoicePanelState(nextState) {
  voiceSessionState = nextState;
  if (!voicePanel) return;
  voicePanel.hidden = nextState === 'idle' && !voicePanel.dataset.expanded;
  voicePanel.classList.toggle('active', nextState === 'record');
  const title = voicePanel?.querySelector('.voice-panel-title');
  const subtitle = voicePanel?.querySelector('.voice-panel-subtitle');
  if (title && subtitle) {
    if (nextState === 'record') {
      title.textContent = 'Recording';
      subtitle.textContent = 'Voice capture is active. Pause or stop whenever you are ready.';
    } else if (nextState === 'pause') {
      title.textContent = 'Paused';
      subtitle.textContent = 'Voice capture is paused. Resume or cancel at any time.';
    } else if (nextState === 'preview') {
      title.textContent = 'Preview';
      subtitle.textContent = 'Playback preview is ready for quick review before sending.';
    } else if (nextState === 'cancel') {
      title.textContent = 'Voice ready';
      subtitle.textContent = 'Voice capture was canceled. Your composer is ready again.';
    } else {
      title.textContent = 'Voice ready';
      subtitle.textContent = 'Record, pause, and review voice prompts from the same composer.';
    }
  }
}

function handleComposerToolAction(tool) {
  if (tool === 'image') {
    imageInput?.click();
    return;
  }
  if (tool === 'file') {
    fileInput?.click();
    return;
  }
  if (tool === 'voice') {
    if (voicePanel) {
      voicePanel.hidden = false;
      voicePanel.dataset.expanded = 'true';
      setVoicePanelState('idle');
    }
    return;
  }
  if (tool === 'more') {
    toggleComposerTools();
    return;
  }
  showToast('More tools are ready for future expansion.', 'info');
}

function handleComposerMenuAction(action) {
  toggleComposerTools(false);
  if (action === 'image') {
    imageInput?.click();
    return;
  }
  if (action === 'file') {
    fileInput?.click();
    return;
  }
  if (action === 'voice') {
    if (voicePanel) {
      voicePanel.hidden = false;
      voicePanel.dataset.expanded = 'true';
      setVoicePanelState('idle');
    }
    return;
  }
  showToast('This tool is ready for future expansion.', 'info');
}

function handleVoiceStateSelection(state) {
  if (!voicePanel) return;
  if (state === 'cancel') {
    setVoicePanelState('cancel');
    window.setTimeout(() => {
      voicePanel.hidden = true;
      voicePanel.removeAttribute('data-expanded');
      setVoicePanelState('idle');
    }, 600);
    return;
  }
  if (state === 'record') {
    setVoicePanelState('record');
    return;
  }
  if (state === 'pause') {
    setVoicePanelState('pause');
    return;
  }
  if (state === 'resume') {
    setVoicePanelState('record');
    return;
  }
  if (state === 'preview') {
    setVoicePanelState('preview');
    return;
  }
  if (state === 'stop') {
    setVoicePanelState('idle');
  }
}

function setTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  localStorage.setItem('nexus-ai-theme', theme);
  const icon = themeToggle?.querySelector('i');
  if (icon) {
    icon.className = theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
  setTheme(nextTheme);
}

function updateConnectionStatus() {
  if (!connectionStatus) return;
  const online = navigator.onLine;
  connectionStatus.textContent = online ? '● Online' : '● Offline';
  connectionStatus.classList.toggle('online', online);
  connectionStatus.classList.toggle('muted', !online);
  if (!online) {
    showToast('You are offline. Messages will be queued locally.', 'info');
  }
}

function setComposerState(isBusy) {
  if (!input || !sendButton || !stopChatButton) return;
  input.disabled = isBusy;
  sendButton.disabled = false;
  sendButton.classList.toggle('busy', isBusy);
  sendButton.innerHTML = isBusy
    ? '<i class="fa-solid fa-stop"></i><span class="sr-only">Stop generation</span>'
    : '<i class="fa-solid fa-paper-plane"></i><span class="sr-only">Send message</span>';
  sendButton.setAttribute('aria-label', isBusy ? 'Stop generation' : 'Send message');
  stopChatButton.hidden = !isBusy;
  retryLastButton.hidden = isBusy;
  if (!isBusy) {
    input.focus();
  }
}

function setAiMode(mode, notify = true) {
  if (!AI_MODES.some((entry) => entry.id === mode)) return;
  currentAiMode = mode;
  localStorage.setItem(MODE_STORAGE_KEY, mode);
  modeSelector?.querySelectorAll('.mode-pill').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
    button.setAttribute('aria-pressed', button.dataset.mode === mode);
  });
  if (notify) {
    showToast(`AI mode set to ${AI_MODES.find((item) => item.id === mode)?.label}.`, 'success');
  }
}

function renderModeSelector() {
  if (!modeSelector) return;
  const savedMode = localStorage.getItem(MODE_STORAGE_KEY) || DEFAULT_MODE;
  currentAiMode = AI_MODES.some((entry) => entry.id === savedMode) ? savedMode : DEFAULT_MODE;
  modeSelector.innerHTML = AI_MODES.map((mode) => `
    <button type="button" class="mode-pill" data-mode="${mode.id}" title="${mode.label}">
      <i class="${mode.icon}"></i>
      <span>${mode.label}</span>
    </button>
  `).join('');
  modeSelector.querySelectorAll('.mode-pill').forEach((button) => {
    button.addEventListener('click', () => setAiMode(button.dataset.mode));
  });
  setAiMode(currentAiMode, false);
}

function scrollToBottom(force = false) {
  if (!messages) return;
  if (force || messages.scrollTop + messages.clientHeight + 120 >= messages.scrollHeight) {
    messages.scrollTop = messages.scrollHeight;
  }
}

function setScrollButtonVisibility() {
  if (!scrollToBottomButton || !messages) return;
  const nearBottom = messages.scrollTop + messages.clientHeight + 120 >= messages.scrollHeight;
  scrollToBottomButton.classList.toggle('visible', !nearBottom);
}

function getWorkspaceStorageKey() {
  return `${WORKSPACE_STORAGE_PREFIX}${activeWorkspaceId}`;
}

async function persistWorkspaceSelection(workspaceId) {
  if (!workspaceId) return;
  localStorage.setItem(LAST_WORKSPACE_KEY, workspaceId);
  try {
    await fetch('/api/auth/settings', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace: workspaceId }),
    });
  } catch (error) {
    // Keep the local preference in sync even if the server update fails.
  }
}

function saveChats() {
  localStorage.setItem(getWorkspaceStorageKey(), JSON.stringify(chats));
}

function loadChats() {
  try {
    const raw = localStorage.getItem(getWorkspaceStorageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      chats = parsed.slice(-20);
    } else {
      chats = [];
    }
  } catch (error) {
    chats = [];
  }
}

function getActiveWorkspace() {
  return workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0] || null;
}

function renderWorkspacePanel() {
  if (!workspacePanel) return;
  const active = getActiveWorkspace();
  if (!active) {
    workspacePanel.hidden = true;
    return;
  }
  workspacePanel.hidden = false;
  workspaceName.textContent = active.title;
  workspaceDescription.textContent = active.description;
  workspacePanel.style.borderColor = active.accent;
  workspaceName.style.color = active.accent;

  if (workspaceStarters) {
    workspaceStarters.innerHTML = active.starterPrompts
      .map(
        (prompt) =>
          `<button type="button" class="workspace-starter" data-prompt="${encodeURIComponent(prompt)}">${prompt}</button>`
      )
      .join('');
    workspaceStarters.querySelectorAll('.workspace-starter').forEach((button) => {
      button.addEventListener('click', () => {
        input.value = decodeURIComponent(button.dataset.prompt || '');
        updateCharCounter();
        input.focus();
      });
    });
  }
}

function renderWorkspaceList() {
  if (!workspaceList) return;
  if (!workspaces.length) {
    workspaceList.innerHTML = '<div class="workspace-empty">No workspaces are available at this time.</div>';
    return;
  }
  workspaceList.innerHTML = '';
  workspaces.forEach((workspace) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `workspace-item ${workspace.id === activeWorkspaceId ? 'active' : ''}`;
    item.style.color = workspace.accent;
    item.innerHTML = `
      <div class="workspace-avatar" style="background:${workspace.accent};">${workspace.symbol}</div>
      <div class="workspace-info">
        <p class="workspace-name">${workspace.title}</p>
        <p class="workspace-description">${workspace.description}</p>
      </div>
    `;
    item.addEventListener('click', () => {
      if (workspace.id === activeWorkspaceId) return;
      setActiveWorkspace(workspace.id);
    });
    workspaceList.appendChild(item);
  });
}

async function setActiveWorkspace(workspaceId) {
  const target = workspaces.find((workspace) => workspace.id === workspaceId) || workspaces[0];
  if (!target) return;
  activeWorkspaceId = target.id;
  await persistWorkspaceSelection(activeWorkspaceId);
  renderWorkspaceList();
  renderWorkspacePanel();
  loadChats();
  if (chats.length === 0) {
    createChat('New chat');
  } else {
    activeChatId = chats[0].id;
    renderConversationList();
    renderActiveChat();
  }
}

function renderConversationList() {
  if (!conversationList) return;
  const query = conversationSearch?.value?.trim().toLowerCase() || '';
  const filtered = chats.filter((chat) => chat.title.toLowerCase().includes(query));
  conversationList.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'conversation-item';
    empty.innerHTML = '<span class="conversation-title">No conversations found</span>';
    conversationList.appendChild(empty);
    return;
  }

  filtered.forEach((chat) => {
    const item = document.createElement('li');
    item.className = `conversation-item ${chat.id === activeChatId ? 'active' : ''}`;
    item.dataset.id = chat.id;
    item.innerHTML = `
      <div>
        <div class="conversation-title">${chat.title}</div>
        <div class="conversation-meta">${new Date(chat.updatedAt).toLocaleDateString()}</div>
      </div>
      <div class="conversation-actions">
        <button class="icon-btn icon-btn-small" data-action="rename" aria-label="Rename conversation"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn icon-btn-small" data-action="delete" aria-label="Delete conversation"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    item.addEventListener('click', (event) => {
      if (event.target.closest('[data-action]')) return;
      activateChat(chat.id);
    });

    item.querySelector('[data-action="rename"]').addEventListener('click', (event) => {
      event.stopPropagation();
      renameChat(chat.id);
    });

    item.querySelector('[data-action="delete"]').addEventListener('click', (event) => {
      event.stopPropagation();
      deleteChat(chat.id);
    });

    conversationList.appendChild(item);
  });
}

function createChat(title = 'New chat') {
  const chat = {
    id: crypto.randomUUID(),
    title,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  chats.unshift(chat);
  activeChatId = chat.id;
  saveChats();
  renderConversationList();
  renderActiveChat();
  return chat;
}

function getActiveChat() {
  return chats.find((chat) => chat.id === activeChatId) || chats[0] || null;
}

function activateChat(chatId) {
  activeChatId = chatId;
  renderConversationList();
  renderActiveChat();
}

function renameChat(chatId) {
  const chat = chats.find((item) => item.id === chatId);
  if (!chat) return;
  const nextTitle = window.prompt('Rename conversation', chat.title);
  if (!nextTitle || !nextTitle.trim()) return;
  chat.title = nextTitle.trim();
  chat.updatedAt = Date.now();
  saveChats();
  renderConversationList();
  renderActiveChat();
}

function deleteChat(chatId) {
  chats = chats.filter((item) => item.id !== chatId);
  if (activeChatId === chatId) {
    activeChatId = chats[0]?.id || null;
  }
  saveChats();
  renderConversationList();
  if (activeChatId) {
    renderActiveChat();
  } else {
    createChat('New chat');
  }
}

function renderActiveChat() {
  const chat = getActiveChat();
  if (!chat) {
    createChat('New chat');
    return;
  }
  activeChatTitle.textContent = chat.title;
  chatSubtitle.textContent = chat.messages.length ? `${chat.messages.length} messages` : 'Your secure AI assistant workspace';
  messages.innerHTML = '';
  if (chat.messages.length === 0) {
    messages.innerHTML = `
      <div class="empty-state">
        <div>
          <i class="fa-solid fa-comments"></i>
          <h4>Start a new conversation</h4>
          <p>${INITIAL_GREETING}</p>
        </div>
      </div>
    `;
    scrollToBottom(true);
    return;
  }
  chat.messages.forEach((message, index) => {
    createMessageRow(message.role, message.content, { appendTo: messages, timestamp: message.timestamp, messageIndex: index });
  });
  scrollToBottom(true);
}

function renderMarkdown(text) {
  const normalizedText = `${text || ''}`;
  if (typeof window.marked?.parse === 'function') {
    const rawHtml = window.marked.parse(normalizedText, {
      breaks: true,
      gfm: true,
      headerIds: false,
      mangle: false,
    });
    const safeHtml = window.DOMPurify?.sanitize ? window.DOMPurify.sanitize(rawHtml) : rawHtml;
    if (window.hljs?.highlightAll) {
      window.hljs.highlightAll();
    }
    return safeHtml;
  }
  return `<p>${normalizedText.replace(/\n/g, '<br>')}</p>`;
}

function createMessageRow(role, content, options = {}) {
  const row = document.createElement('div');
  row.className = `message-row ${role}`;
  row.dataset.role = role;
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.innerHTML = role === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = renderMarkdown(content);

  if (role === 'assistant') {
    const actions = document.createElement('div');
    actions.className = 'bubble-actions';

    const copyButton = document.createElement('button');
    copyButton.className = 'bubble-action-btn';
    copyButton.type = 'button';
    copyButton.setAttribute('aria-label', 'Copy response');
    copyButton.title = 'Copy';
    copyButton.innerHTML = '<i class="fa-regular fa-copy"></i>';
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(content);
        copyButton.classList.add('copied');
        copyButton.innerHTML = '<i class="fa-solid fa-check"></i>';
        copyButton.setAttribute('aria-label', 'Copied');
        copyButton.title = 'Copied';
        window.setTimeout(() => {
          copyButton.classList.remove('copied');
          copyButton.innerHTML = '<i class="fa-regular fa-copy"></i>';
          copyButton.setAttribute('aria-label', 'Copy response');
          copyButton.title = 'Copy';
        }, 1800);
      } catch (error) {
        copyButton.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        window.setTimeout(() => {
          copyButton.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 1400);
      }
    });

    const regenerateButton = document.createElement('button');
    regenerateButton.className = 'bubble-action-btn';
    regenerateButton.type = 'button';
    regenerateButton.setAttribute('aria-label', 'Regenerate response');
    regenerateButton.title = 'Regenerate';
    regenerateButton.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
    regenerateButton.addEventListener('click', () => {
      retryLastResponse();
    });

    const likeButton = document.createElement('button');
    likeButton.className = 'bubble-action-btn';
    likeButton.type = 'button';
    likeButton.setAttribute('aria-label', 'Like response');
    likeButton.title = 'Like';
    likeButton.innerHTML = '<i class="fa-regular fa-thumbs-up"></i>';
    likeButton.addEventListener('click', () => {
      likeButton.classList.toggle('active');
      dislikeButton.classList.remove('active');
      showToast('Feedback saved', 'success');
    });

    const dislikeButton = document.createElement('button');
    dislikeButton.className = 'bubble-action-btn';
    dislikeButton.type = 'button';
    dislikeButton.setAttribute('aria-label', 'Dislike response');
    dislikeButton.title = 'Dislike';
    dislikeButton.innerHTML = '<i class="fa-regular fa-thumbs-down"></i>';
    dislikeButton.addEventListener('click', () => {
      dislikeButton.classList.toggle('active');
      likeButton.classList.remove('active');
      showToast('Feedback saved', 'success');
    });

    actions.appendChild(copyButton);
    actions.appendChild(regenerateButton);
    actions.appendChild(likeButton);
    actions.appendChild(dislikeButton);
    bubble.appendChild(actions);
  }

  if (role === 'user' && options.messageIndex !== undefined) {
    const actions = document.createElement('div');
    actions.className = 'bubble-actions';
    const editButton = document.createElement('button');
    editButton.className = 'bubble-action-btn compact';
    editButton.type = 'button';
    editButton.setAttribute('aria-label', 'Edit message');
    editButton.title = 'Edit';
    editButton.innerHTML = '<i class="fa-solid fa-pen"></i>';
    editButton.addEventListener('click', () => {
      const nextValue = window.prompt('Edit your message', content);
      if (!nextValue || !nextValue.trim()) return;
      const chat = getActiveChat();
      if (!chat) return;
      chat.messages[options.messageIndex].content = nextValue.trim();
      chat.updatedAt = Date.now();
      saveChats();
      renderActiveChat();
      showToast('Message updated', 'success');
    });
    const resendButton = document.createElement('button');
    resendButton.className = 'bubble-action-btn compact';
    resendButton.type = 'button';
    resendButton.setAttribute('aria-label', 'Resend message');
    resendButton.title = 'Resend';
    resendButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    resendButton.addEventListener('click', () => {
      const chat = getActiveChat();
      if (!chat) return;
      const updatedMessage = chat.messages[options.messageIndex].content;
      chat.messages = chat.messages.filter((_, index) => index !== options.messageIndex);
      saveChats();
      renderActiveChat();
      sendMessage(updatedMessage, false);
    });
    actions.appendChild(editButton);
    actions.appendChild(resendButton);
    bubble.appendChild(actions);
  }

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.textContent = options.timestamp ? new Date(options.timestamp).toLocaleString() : new Date().toLocaleString();
  bubble.appendChild(meta);

  if (role === 'user') {
    row.appendChild(bubble);
    row.appendChild(avatar);
  } else {
    row.appendChild(avatar);
    row.appendChild(bubble);
  }

  if (options.appendTo) {
    options.appendTo.appendChild(row);
  }

  return row;
}

function addTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'message-row assistant';
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.innerHTML = '<i class="fa-solid fa-robot"></i>';
  const bubble = document.createElement('div');
  bubble.className = 'bubble typing-indicator';
  bubble.setAttribute('aria-label', 'Nexus AI is typing');
  bubble.innerHTML = `
    <div class="typing-shell" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
    <div class="typing-label">Thinking…</div>
  `;
  row.appendChild(avatar);
  row.appendChild(bubble);
  messages.appendChild(row);
  scrollToBottom(true);
  return row;
}

function removeTypingIndicator() {
  const typing = messages.querySelector('.typing-indicator');
  if (typing) {
    typing.closest('.message-row').remove();
  }
}

function streamAssistantReply(content, messageIndex) {
  const chat = getActiveChat();
  if (!chat) return;

  const bubble = messages.lastElementChild?.querySelector('.bubble');
  if (!bubble) return;

  const safeContent = `${content}`;
  let index = 0;
  const interval = window.setInterval(() => {
    if (index >= safeContent.length) {
      window.clearInterval(interval);
      chat.messages[messageIndex].content = safeContent;
      chat.updatedAt = Date.now();
      saveChats();
      renderConversationList();
      return;
    }

    const partial = safeContent.slice(0, index + 1);
    bubble.innerHTML = renderMarkdown(partial);
    index += 1;
    scrollToBottom(true);
  }, 18);
}

function sanitizeMessage(message) {
  const text = `${message || ''}`.trim();
  return text.slice(0, MAX_CHARACTERS);
}

function validateMessage(message) {
  const trimmed = sanitizeMessage(message);
  if (!trimmed) {
    showToast('Please enter a message before sending.', 'error');
    return null;
  }
  if (trimmed.length > MAX_CHARACTERS) {
    showToast(`Messages must be ${MAX_CHARACTERS} characters or fewer.`, 'error');
    return null;
  }
  return trimmed;
}

function persistActiveChat() {
  const chat = getActiveChat();
  if (!chat) return;
  chat.updatedAt = Date.now();
  saveChats();
  renderConversationList();
}

function appendMessage(role, content) {
  const chat = getActiveChat();
  if (!chat) return;
  chat.messages.push({ role, content, timestamp: Date.now() });
  chat.updatedAt = Date.now();
  persistActiveChat();
  renderActiveChat();
}

function updateLastAssistantMessage(content) {
  const chat = getActiveChat();
  if (!chat || chat.messages.length === 0) return;
  const last = chat.messages[chat.messages.length - 1];
  if (last.role === 'assistant') {
    last.content = content;
    last.timestamp = Date.now();
    chat.updatedAt = Date.now();
    saveChats();
    renderActiveChat();
  }
}

async function sendMessage(message, shouldRegenerate = false) {
  const trimmed = validateMessage(message);
  if (!trimmed) return;
  if (!activeChatId) {
    createChat('New chat');
  }
  if (isRequestInFlight) {
    showToast('A response is already being generated. Please wait a moment.', 'info');
    return;
  }

  const chat = getActiveChat();
  if (!shouldRegenerate) {
    chat.messages.push({ role: 'user', content: trimmed, timestamp: Date.now() });
    chat.updatedAt = Date.now();
    saveChats();
    renderActiveChat();
  }

  isRequestInFlight = true;
  setComposerState(true);
  thinkingIndicator.hidden = false;
  addTypingIndicator();
  currentAbortController = new AbortController();

  const requestId = ++lastRequestId;

  try {
    const payload = {
      message: trimmed,
      history: chat.messages.slice(-20),
      workspace: activeWorkspaceId,
      mode: currentAiMode,
    };
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: currentAbortController.signal,
    });

    if (requestId !== lastRequestId) return;

    const data = await response.json();
    removeTypingIndicator();

    if (!response.ok) {
      const errorMessage = data.error || 'Something went wrong. Please try again.';
      chat.messages.push({ role: 'assistant', content: errorMessage, timestamp: Date.now() });
      chat.updatedAt = Date.now();
      saveChats();
      renderActiveChat();
      showToast(errorMessage, 'error');
      return;
    }

    const reply = data.reply || 'No response returned.';
    chat.messages.push({ role: 'assistant', content: '', timestamp: Date.now() });
    chat.updatedAt = Date.now();
    saveChats();
    renderActiveChat();
    const messageIndex = chat.messages.length - 1;
    streamAssistantReply(reply, messageIndex);
    showToast('Response received', 'success');
  } catch (error) {
    removeTypingIndicator();
    if (error.name === 'AbortError') {
      showToast('Request cancelled', 'info');
      return;
    }
    chat.messages.push({ role: 'assistant', content: 'The server is momentarily unavailable. Please try again in a moment.', timestamp: Date.now() });
    chat.updatedAt = Date.now();
    saveChats();
    renderActiveChat();
    showToast('Network error. Please try again.', 'error');
  } finally {
    if (requestId === lastRequestId) {
      isRequestInFlight = false;
      setComposerState(false);
      thinkingIndicator.hidden = true;
      currentAbortController = null;
      scrollToBottom(true);
    }
  }
}

function retryLastResponse() {
  const chat = getActiveChat();
  if (!chat || !chat.messages.length) return;
  const lastUser = [...chat.messages].reverse().find((entry) => entry.role === 'user');
  if (!lastUser) return;
  const lastAssistant = [...chat.messages].reverse().find((entry) => entry.role === 'assistant');
  if (lastAssistant) {
    chat.messages = chat.messages.filter((entry) => entry !== lastAssistant);
  }
  sendMessage(lastUser.content, true);
}

function stopGeneration() {
  if (currentAbortController) {
    currentAbortController.abort();
    showToast('Generation stopped', 'info');
  }
}

function exportConversation(format = 'txt') {
  const chat = getActiveChat();
  if (!chat) return;
  const content = chat.messages
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
    .join('\n\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${chat.title}.${format === 'md' ? 'md' : 'txt'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Conversation exported', 'success');
}

function setupFaqAccordion() {
  document.querySelectorAll('.faq-item').forEach((item) => {
    const button = item.querySelector('.faq-question');
    button.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach((faq) => {
        faq.classList.remove('open');
        faq.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

function setupNavigation() {
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

function setupComposerEnhancements() {
  document.querySelectorAll('.tool-btn').forEach((button) => {
    button.addEventListener('click', () => handleComposerToolAction(button.dataset.tool));
  });

  document.querySelectorAll('.tool-menu-item').forEach((button) => {
    button.addEventListener('click', () => handleComposerMenuAction(button.dataset.action));
  });

  document.querySelectorAll('.voice-action').forEach((button) => {
    button.addEventListener('click', () => handleVoiceStateSelection(button.dataset.voiceState));
  });

  imageInput?.addEventListener('change', (event) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => addComposerAttachment(file, 'image'));
    event.target.value = '';
  });

  fileInput?.addEventListener('change', (event) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => addComposerAttachment(file, 'file'));
    event.target.value = '';
  });

  if (dropZone) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropZone.classList.add('dragging');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (eventName === 'drop') {
          const files = Array.from(event.dataTransfer.files || []);
          if (files.length) {
            files.forEach((file) => addComposerAttachment(file, file.type.startsWith('image/') ? 'image' : 'file'));
          }
        }
        dropZone.classList.remove('dragging');
      });
    });
  }

  document.addEventListener('click', (event) => {
    if (!composerToolsMenu) return;
    const clickedInsideMenu = composerToolsMenu.contains(event.target);
    const clickedToolButton = event.target.closest('.tool-btn-more');
    if (!clickedInsideMenu && !clickedToolButton) {
      toggleComposerTools(false);
    }
  });
}

function handleSubmit(event) {
  event.preventDefault();
  if (isRequestInFlight) {
    stopGeneration();
    return;
  }
  const message = input.value;
  const trimmed = validateMessage(message);
  if (!trimmed) return;
  sendMessage(trimmed);
  input.value = '';
  input.style.height = 'auto';
  updateCharCounter();
}

function handleInput() {
  currentDraftMessage = input.value;
  updateCharCounter();
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
}

function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSubmit(event);
  }
}

function handleKeyboardShortcuts(event) {
  if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    input.focus();
  }
  if (event.key === 'Escape') {
    stopGeneration();
  }
}

async function handleLogout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
    if (!response.ok) {
      throw new Error('Unable to sign out right now.');
    }
    window.location.replace('/');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Service worker registration failed', error));
  });
}

async function checkAuth() {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!response.ok) {
      if (window.location.pathname !== '/') {
        window.location.replace('/');
      }
      return null;
    }
    const data = await response.json();
    if (!data?.user) {
      if (window.location.pathname !== '/') {
        window.location.replace('/');
      }
      return null;
    }
    return data.user;
  } catch (error) {
    if (window.location.pathname !== '/') {
      window.location.replace('/');
    }
    return null;
  }
}

async function fetchWorkspaceMetadata() {
  try {
    const response = await fetch('/api/workspaces', { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error('Unable to load workspace configuration.');
    }
    const data = await response.json();
    if (Array.isArray(data?.workspaces)) {
      workspaces = data.workspaces;
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function hydrateApp() {
  const savedTheme = localStorage.getItem('nexus-ai-theme') || 'dark';
  setTheme(savedTheme);
  const user = await checkAuth();
  if (!user) return;
  await fetchWorkspaceMetadata();
  renderModeSelector();
  const savedWorkspace = localStorage.getItem(LAST_WORKSPACE_KEY);
  const preferredWorkspace = user?.settings?.workspace || savedWorkspace || workspaces[0]?.id;
  const initialWorkspace = workspaces.find((workspace) => workspace.id === preferredWorkspace)?.id || workspaces[0]?.id;
  activeWorkspaceId = initialWorkspace;
  await setActiveWorkspace(activeWorkspaceId);
  updateConnectionStatus();
  updateCharCounter();
}

form.addEventListener('submit', handleSubmit);
input.addEventListener('input', handleInput);
input.addEventListener('keydown', handleKeydown);
document.addEventListener('keydown', handleKeyboardShortcuts);
newChatButton.addEventListener('click', () => createChat('New chat'));
logoutButton?.addEventListener('click', handleLogout);
themeToggle.addEventListener('click', toggleTheme);
conversationSearch.addEventListener('input', renderConversationList);
  focusSearch?.addEventListener('click', () => conversationSearch?.focus());

function openWorkspaceDrawer() {
  const sidebar = document.querySelector('.conversation-sidebar');
  if (!sidebar) return;
  sidebar.classList.add('open');
  workspaceDrawerOverlay?.classList.add('visible');
}

function closeWorkspaceDrawer() {
  const sidebar = document.querySelector('.conversation-sidebar');
  if (!sidebar) return;
  sidebar.classList.remove('open');
  workspaceDrawerOverlay?.classList.remove('visible');
}

function toggleWorkspaceDrawer() {
  const sidebar = document.querySelector('.conversation-sidebar');
  if (!sidebar) return;
  if (sidebar.classList.contains('open')) {
    closeWorkspaceDrawer();
  } else {
    openWorkspaceDrawer();
  }
}

workspaceDrawerToggle?.addEventListener('click', toggleWorkspaceDrawer);
workspaceDrawerOverlay?.addEventListener('click', closeWorkspaceDrawer);

setCurrentYear();
createParticles();
revealOnScroll();
setupFaqAccordion();
setupNavigation();
setupComposerEnhancements();
registerServiceWorker();
hydrateApp();
setComposerState(false);
