const appRoot = document.getElementById('app');

async function startDesktop(user) {
  const system = new WiseApplicationSystem({ root: appRoot });

  try {
    await system.run(user);

    if (user.themeId && system.themes.some((theme) => theme.id === user.themeId)) {
      system.setActiveTheme(user.themeId);
    }
    if (user.backgroundImage !== undefined) {
      system.setBackgroundImage(user.backgroundImage);
    }
  } catch (err) {
    appRoot.innerHTML = `<div style="padding: 24px; color: #b91c1c; font-family: sans-serif;">${err.message}</div>`;
  }
}

async function boot() {
  const token = localStorage.getItem('was_token');

  if (token) {
    try {
      const response = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const { user } = await response.json();
        if (user) {
          localStorage.setItem('was_user', JSON.stringify(user));
          startDesktop(user);
          return;
        }
      }
    } catch (error) {
      console.warn('[WAS] Session check failed:', error.message);
    }

    localStorage.removeItem('was_token');
    localStorage.removeItem('was_user');
  }

  renderAuthScreen(appRoot, { onAuthenticated: startDesktop });
}

boot();
