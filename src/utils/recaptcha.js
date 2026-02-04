// reCAPTCHA Enterprise utility
const RECAPTCHA_SITE_KEY = '6LfhWFksAAAAAAs_AmZgON4Z7cHOpp72kMmBx2eo';

let isLoaded = false;
let isLoading = false;

/**
 * Load reCAPTCHA script dynamically
 * @returns {Promise<void>}
 */
export const loadRecaptcha = () => {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (isLoaded && window.grecaptcha?.enterprise) {
      resolve();
      return;
    }

    // Already loading
    if (isLoading) {
      const checkLoaded = setInterval(() => {
        if (isLoaded && window.grecaptcha?.enterprise) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);
      return;
    }

    isLoading = true;

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isLoaded = true;
      isLoading = false;
      // Show the badge when loaded on auth pages
      showRecaptchaBadge();
      resolve();
    };

    script.onerror = (error) => {
      isLoading = false;
      console.error('Failed to load reCAPTCHA script:', error);
      reject(error);
    };

    document.head.appendChild(script);
  });
};

/**
 * Show reCAPTCHA badge
 */
export const showRecaptchaBadge = () => {
  const badge = document.querySelector('.grecaptcha-badge');
  if (badge) {
    badge.style.visibility = 'visible';
    badge.style.opacity = '1';
  }
};

/**
 * Hide reCAPTCHA badge
 */
export const hideRecaptchaBadge = () => {
  const badge = document.querySelector('.grecaptcha-badge');
  if (badge) {
    badge.style.visibility = 'hidden';
    badge.style.opacity = '0';
  }
};

/**
 * Execute reCAPTCHA Enterprise and get a token
 * @param {string} action - The action name (e.g., 'LOGIN', 'REGISTER')
 * @returns {Promise<string>} - The reCAPTCHA token
 */
export const executeRecaptcha = async (action) => {
  // Ensure script is loaded
  if (!isLoaded) {
    try {
      await loadRecaptcha();
    } catch (error) {
      console.warn('reCAPTCHA failed to load, skipping verification');
      return null;
    }
  }

  return new Promise((resolve, reject) => {
    if (!window.grecaptcha || !window.grecaptcha.enterprise) {
      console.warn('reCAPTCHA not loaded, skipping verification');
      resolve(null);
      return;
    }

    window.grecaptcha.enterprise.ready(async () => {
      try {
        const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action });
        resolve(token);
      } catch (error) {
        console.error('reCAPTCHA execution failed:', error);
        reject(error);
      }
    });
  });
};

export default executeRecaptcha;
