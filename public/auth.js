const state = { mode: 'login' };
const form = document.getElementById('auth-form');
const initialMode = new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'login';
const title = document.getElementById('auth-title');
const subtitle = document.getElementById('auth-subtitle');
const submitButton = document.getElementById('auth-submit');
const toggleLink = document.getElementById('toggle-link');
const secondaryLink = document.getElementById('secondary-link');
const messageBox = document.getElementById('auth-message');
const fullNameWrap = document.getElementById('fullName-wrap');
const usernameWrap = document.getElementById('username-wrap');
const confirmWrap = document.getElementById('confirm-wrap');
const rememberWrap = document.getElementById('remember-wrap');
const fullName = document.getElementById('fullName');
const username = document.getElementById('username');
const identifierLabel = document.getElementById('identifier-label');
const email = document.getElementById('email');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');
const rememberMe = document.getElementById('rememberMe');

function setMode(mode) {
  state.mode = mode;
  const isLogin = mode === 'login';
  fullNameWrap.hidden = isLogin;
  usernameWrap.hidden = isLogin;
  confirmWrap.hidden = isLogin;
  rememberWrap.style.display = isLogin ? 'flex' : 'none';
  identifierLabel.textContent = isLogin ? 'Username or Email' : 'Email';
  email.type = isLogin ? 'text' : 'email';
  email.name = isLogin ? 'identifier' : 'email';
  email.placeholder = isLogin ? 'username or you@example.com' : 'you@example.com';
  title.textContent = isLogin ? 'Welcome back' : 'Create your account';
  subtitle.textContent = isLogin ? 'Sign in to continue to Nexus AI.' : 'Join Nexus AI and unlock your workspace.';
  submitButton.textContent = isLogin ? 'Sign in' : 'Create account';
  toggleLink.textContent = isLogin ? 'Create account' : 'Sign in';
  secondaryLink.textContent = isLogin ? 'Forgot password?' : 'Back to sign in';
  messageBox.textContent = '';
  messageBox.className = 'auth-message';
}

function getFormPayload() {
  return {
    fullName: fullName.value.trim(),
    username: username.value.trim(),
    email: email.value.trim(),
    password: password.value,
    confirmPassword: confirmPassword.value,
    rememberMe: rememberMe.checked,
  };
}

function setMessage(message, type = 'error') {
  messageBox.textContent = message;
  messageBox.className = `auth-message ${type}`;
}

async function redirectIfAuthenticated() {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!response.ok) return false;
    const data = await response.json();
    if (data?.user) {
      window.location.replace('/dashboard');
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function submitAuth(event) {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = 'Please wait...';
  setMessage('');

  const payload = getFormPayload();
  if (state.mode === 'signup') {
    if (!payload.fullName || !payload.username || !payload.email || !payload.password) {
      setMessage('Please complete every required field.', 'error');
      submitButton.disabled = false;
      submitButton.textContent = 'Create account';
      return;
    }
    if (payload.password !== payload.confirmPassword) {
      setMessage('Passwords do not match.', 'error');
      submitButton.disabled = false;
      submitButton.textContent = 'Create account';
      return;
    }
  }

  try {
    const endpoint = state.mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(state.mode === 'signup' ? {
        fullName: payload.fullName,
        username: payload.username,
        email: payload.email,
        password: payload.password,
        rememberMe: payload.rememberMe,
      } : {
        identifier: payload.email,
        password: payload.password,
        rememberMe: payload.rememberMe,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    setMessage(state.mode === 'signup' ? 'Account created successfully.' : 'Signed in successfully.', 'success');
    window.location.assign('/dashboard');
  } catch (error) {
    setMessage(error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = state.mode === 'signup' ? 'Create account' : 'Sign in';
  }
}

toggleLink.addEventListener('click', (event) => {
  event.preventDefault();
  setMode(state.mode === 'login' ? 'signup' : 'login');
});

secondaryLink.addEventListener('click', (event) => {
  event.preventDefault();
  setMessage('Password reset flow is available via the API.', 'success');
});

form.addEventListener('submit', submitAuth);
(async () => {
  const alreadyAuthenticated = await redirectIfAuthenticated();
  if (!alreadyAuthenticated) {
    setMode(initialMode);
  }
})();
