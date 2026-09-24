function renderAuthScreen(root, { onAuthenticated }) {
  let mode = 'login';

  function field(labelText, type, name) {
    const wrap = document.createElement('label');
    wrap.className = 'auth-field';

    const span = document.createElement('span');
    span.textContent = labelText;

    const input = document.createElement('input');
    input.type = type;
    input.name = name;
    input.required = true;
    input.autocomplete = type === 'password' ? 'current-password' : 'off';

    wrap.appendChild(span);
    wrap.appendChild(input);
    return wrap;
  }

  function render() {
    root.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'auth-screen';

    const card = document.createElement('div');
    card.className = 'auth-card';

    const title = document.createElement('h1');
    title.className = 'auth-title';
    title.textContent = mode === 'login' ? 'Masuk ke Wiseape' : 'Daftar Akun Wiseape';
    card.appendChild(title);

    const errorBox = document.createElement('div');
    errorBox.className = 'auth-error';
    card.appendChild(errorBox);

    const infoBox = document.createElement('div');
    infoBox.className = 'auth-info';
    card.appendChild(infoBox);

    const form = document.createElement('form');
    form.className = 'auth-form';

    if (mode === 'register') {
      form.appendChild(field('Nama', 'text', 'name'));
    }
    form.appendChild(field('Email', 'email', 'email'));
    form.appendChild(field('Password', 'password', 'password'));
    if (mode === 'register') {
      form.appendChild(field('Konfirmasi Password', 'password', 'confirmPassword'));
    }

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'auth-submit';
    submit.textContent = mode === 'login' ? 'Masuk' : 'Daftar';
    form.appendChild(submit);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.textContent = '';
      infoBox.textContent = '';
      submit.disabled = true;
      submit.textContent = mode === 'login' ? 'Masuk...' : 'Mendaftar...';

      const payload = Object.fromEntries(new FormData(form).entries());

      try {
        const response = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Terjadi kesalahan, silakan coba lagi.');
        }

        if (result.token) {
          localStorage.setItem('was_token', result.token);
          localStorage.setItem('was_user', JSON.stringify(result.user));
          onAuthenticated(result.user);
          return;
        }

        if (mode === 'register') {
          mode = 'login';
          render();
          document.querySelector('.auth-info').textContent = result.message || 'Registrasi berhasil. Menunggu persetujuan admin.';
          return;
        }

        throw new Error('Login gagal, silakan coba lagi.');
      } catch (error) {
        errorBox.textContent = error.message;
        submit.disabled = false;
        submit.textContent = mode === 'login' ? 'Masuk' : 'Daftar';
      }
    });

    card.appendChild(form);

    const switchLine = document.createElement('p');
    switchLine.className = 'auth-switch';

    const switchLink = document.createElement('a');
    switchLink.href = '#';
    switchLink.textContent = mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk';
    switchLink.addEventListener('click', (event) => {
      event.preventDefault();
      mode = mode === 'login' ? 'register' : 'login';
      render();
    });

    switchLine.appendChild(switchLink);
    card.appendChild(switchLine);

    screen.appendChild(card);
    root.appendChild(screen);
  }

  render();
}
