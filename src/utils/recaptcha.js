// reCAPTCHA Enterprise utility
const RECAPTCHA_SITE_KEY = '6LfhWFksAAAAAAs_AmZgON4Z7cHOpp72kMmBx2eo';

/**
 * Execute reCAPTCHA Enterprise and get a token
 * @param {string} action - The action name (e.g., 'LOGIN', 'REGISTER')
 * @returns {Promise<string>} - The reCAPTCHA token
 */
export const executeRecaptcha = async (action) => {
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
