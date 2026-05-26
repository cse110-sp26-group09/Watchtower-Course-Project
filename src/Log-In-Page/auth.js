/**
 * WatchTower Auth — Client-side Validation & UI Interactions
 *
 * This file is PURE FRONTEND. No backend calls are made.
 * All forms use `action=""` as a placeholder — swap with a
 * fetch() call to your API endpoint when backend is ready.
 *
 * Shared across: login.html, signup.html, forgot-password.html
 * Each section only runs if its form element exists on the page.
 */
(() => {

  // ─── PASSWORD VISIBILITY TOGGLE ──────────────────────────
  // Toggles between password/text input type and swaps the eye icon.
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      btn.classList.toggle('revealed', hidden);
      btn.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
    });
  });

  // ─── VALIDATION HELPERS ──────────────────────────────────

  /** Basic email format check */
  const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  /**
   * Sets a field wrapper to error, valid, or neutral state.
   * CSS classes .has-error / .is-valid control border color and error text visibility.
   */
  function setFieldState(fieldId, state, message) {
    const wrapper = document.getElementById(fieldId);
    if (!wrapper) return;
    wrapper.classList.remove('has-error', 'is-valid');
    if (state === 'error') wrapper.classList.add('has-error');
    if (state === 'valid') wrapper.classList.add('is-valid');
    const errorEl = wrapper.querySelector('.field-error');
    if (errorEl) errorEl.textContent = state === 'error' ? message : '';
  }

  /** Reset a single field to neutral (no error, no valid) */
  function clearField(fieldId) {
    setFieldState(fieldId, '', '');
  }

  /** Reset all fields on the page to neutral */
  function clearAllFields() {
    document.querySelectorAll('.field').forEach(f => {
      f.classList.remove('has-error', 'is-valid');
      const err = f.querySelector('.field-error');
      if (err) err.textContent = '';
    });
    // Also clear terms checkbox error if present
    document.querySelectorAll('.terms-check + .field-error').forEach(el => {
      el.textContent = '';
      el.classList.remove('visible');
    });
  }

  /** Show a status banner (info/success/error) at the top of the card */
  function showBanner(type, message) {
    const banner = document.getElementById('status-banner');
    if (!banner) return;
    banner.className = 'status-banner ' + type;
    banner.textContent = message;
  }

  /** Hide the status banner */
  function hideBanner() {
    const banner = document.getElementById('status-banner');
    if (!banner) return;
    banner.className = 'status-banner';
    banner.textContent = '';
  }

  // ─── INLINE BLUR VALIDATION ──────────────────────────────
  // Validates a field when the user tabs/clicks away from it.
  // Shows error or valid state in real time (before submit).
  function addBlurValidation(inputId, fieldId, validate) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('blur', () => {
      const val = input.value.trim();
      // Don't show error for empty fields on blur — only on submit
      if (!val) { clearField(fieldId); return; }
      const err = validate(val);
      setFieldState(fieldId, err ? 'error' : 'valid', err || '');
    });
    // Hide any status banner when user starts editing again
    input.addEventListener('focus', () => hideBanner());
  }


  // ═══════════════════════════════════════════════════════════
  // LOGIN PAGE
  // Only runs if #login-form exists (login.html)
  // ═══════════════════════════════════════════════════════════
  const loginForm = document.getElementById('login-form');

  if (loginForm) {
    // Blur validators
    addBlurValidation('email', 'field-email', v =>
      !isValidEmail(v) ? 'Enter a valid email address.' : null
    );
    addBlurValidation('password', 'field-password', v =>
      !v ? 'Password is required.' : null
    );

    // Submit handler
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      clearAllFields();
      hideBanner();

      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      let valid = true;

      if (!email) {
        setFieldState('field-email', 'error', 'Email is required.');
        valid = false;
      } else if (!isValidEmail(email)) {
        setFieldState('field-email', 'error', 'Enter a valid email address.');
        valid = false;
      }

      if (!password) {
        setFieldState('field-password', 'error', 'Password is required.');
        valid = false;
      }

      // Focus the first invalid field so user knows where to fix
      if (!valid) {
        const first = loginForm.querySelector('.has-error input');
        if (first) first.focus();
        return;
      }

      // TODO: Replace with fetch() to your auth endpoint
      showBanner('info', 'Backend not connected yet. Validation passed — ready for integration.');
    });
  }


  // ═══════════════════════════════════════════════════════════
  // SIGNUP PAGE
  // Only runs if #signup-form exists (signup.html)
  // ═══════════════════════════════════════════════════════════
  const signupForm = document.getElementById('signup-form');

  if (signupForm) {

    // Blur validators for each field
    addBlurValidation('display-name', 'field-display-name', v =>
      v.length < 2 ? 'Name must be at least 2 characters.' : null
    );
    addBlurValidation('email', 'field-email', v =>
      !isValidEmail(v) ? 'Enter a valid email address.' : null
    );
    addBlurValidation('password', 'field-password', v =>
      v.length < 8 ? 'Must be at least 8 characters.' : null
    );
    addBlurValidation('confirm-password', 'field-confirm', v => {
      const pw = document.getElementById('password').value;
      if (!v) return null;
      return v !== pw ? 'Passwords do not match.' : null;
    });

    // ── Password strength meter ──
    // Listens on keystrokes and updates the colored bar + label.
    // Levels: weak (red), fair (amber), strong (green)
    const pwInput = document.getElementById('password');
    const pwBlock = document.getElementById('pw-strength');
    const pwFill  = document.getElementById('pw-fill');
    const pwLabel = document.getElementById('pw-label');

    if (pwInput && pwBlock) {
      pwInput.addEventListener('input', () => {
        const v = pwInput.value;
        if (!v) { pwBlock.hidden = true; return; }
        pwBlock.hidden = false;

        const hasUpper  = /[A-Z]/.test(v);
        const hasLower  = /[a-z]/.test(v);
        const hasDigit  = /[0-9]/.test(v);
        const hasSymbol = /[^A-Za-z0-9]/.test(v);
        const long      = v.length >= 8;

        let level = 'weak';
        if (long && hasUpper && hasLower && hasDigit) level = 'fair';
        if (long && hasUpper && hasLower && hasDigit && hasSymbol && v.length >= 10) level = 'strong';

        pwFill.className  = 'pw-fill ' + level;
        pwLabel.className = 'pw-label ' + level;
        pwLabel.textContent = level.charAt(0).toUpperCase() + level.slice(1);
      });
    }

    // Submit handler
    signupForm.addEventListener('submit', e => {
      e.preventDefault();
      clearAllFields();
      hideBanner();

      const name     = document.getElementById('display-name').value.trim();
      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirm  = document.getElementById('confirm-password').value;
      const terms    = document.getElementById('accept-terms');
      const termsErr = document.getElementById('terms-error');
      let valid = true;

      if (!name) {
        setFieldState('field-display-name', 'error', 'Display name is required.');
        valid = false;
      } else if (name.length < 2) {
        setFieldState('field-display-name', 'error', 'Name must be at least 2 characters.');
        valid = false;
      }

      if (!email) {
        setFieldState('field-email', 'error', 'Email is required.');
        valid = false;
      } else if (!isValidEmail(email)) {
        setFieldState('field-email', 'error', 'Enter a valid email address.');
        valid = false;
      }

      if (!password) {
        setFieldState('field-password', 'error', 'Password is required.');
        valid = false;
      } else if (password.length < 8) {
        setFieldState('field-password', 'error', 'Must be at least 8 characters.');
        valid = false;
      }

      if (!confirm) {
        setFieldState('field-confirm', 'error', 'Please confirm your password.');
        valid = false;
      } else if (password !== confirm) {
        setFieldState('field-confirm', 'error', 'Passwords do not match.');
        valid = false;
      }

      // Terms checkbox validation
      if (terms && !terms.checked) {
        if (termsErr) {
          termsErr.textContent = 'You must accept the terms to continue.';
          termsErr.classList.add('visible');
        }
        valid = false;
      }

      if (!valid) {
        const first = signupForm.querySelector('.has-error input');
        if (first) first.focus();
        return;
      }

      // TODO: Replace with fetch() to your signup endpoint
      showBanner('info', 'Backend not connected yet. Validation passed — ready for integration.');
    });
  }


  // ═══════════════════════════════════════════════════════════
  // FORGOT PASSWORD PAGE
  // Only runs if #forgot-form exists (forgot-password.html)
  // ═══════════════════════════════════════════════════════════
  const forgotForm = document.getElementById('forgot-form');

  if (forgotForm) {
    addBlurValidation('email', 'field-email', v =>
      !isValidEmail(v) ? 'Enter a valid email address.' : null
    );

    forgotForm.addEventListener('submit', e => {
      e.preventDefault();
      clearAllFields();
      hideBanner();

      const email = document.getElementById('email').value.trim();

      if (!email) {
        setFieldState('field-email', 'error', 'Email is required.');
        return;
      }
      if (!isValidEmail(email)) {
        setFieldState('field-email', 'error', 'Enter a valid email address.');
        return;
      }

      // TODO: Replace with fetch() to your password reset endpoint
      showBanner('info', 'Backend not connected yet. Validation passed — ready for integration.');
    });
  }

})();
