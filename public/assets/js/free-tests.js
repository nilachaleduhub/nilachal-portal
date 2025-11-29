const getUser = () => {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.warn('Unable to parse stored user', err);
    return null;
  }
};

const createDetailPill = (label, value) => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const pill = document.createElement('span');
  pill.className = 'card-detail';

  const labelSpan = document.createElement('span');
  labelSpan.className = 'card-detail-label';
  labelSpan.textContent = label;

  const valueSpan = document.createElement('span');
  valueSpan.className = 'card-detail-value';
  valueSpan.textContent = String(value);

  pill.appendChild(labelSpan);
  pill.appendChild(document.createTextNode(': '));
  pill.appendChild(valueSpan);
  return pill;
};

const formatTime = (timeLimit = '') => {
  if (!timeLimit) return '';
  return timeLimit;
};

const buildMarkingSummary = (test = {}) => {
  const pos = test.positiveMark;
  const neg = test.negativeMark;
  if (!pos && !neg) return '';
  if (pos && neg) return `${pos}/${neg}`;
  return pos || neg || '';
};

const getTestId = (test = {}) => test.id || test._id || '';

/**
 * Check if a test has all required questions added
 * Returns true if all questions are added, false otherwise
 */
async function hasAllQuestionsAdded(test) {
  try {
    // Calculate required question count
    let requiredCount = 0;
    
    if (test.hasSections && Array.isArray(test.sections) && test.sections.length > 0) {
      // If test has sections, sum up the numQuestions from each section
      requiredCount = test.sections.reduce((sum, section) => {
        return sum + (typeof section.numQuestions === 'number' ? section.numQuestions : 0);
      }, 0);
    } else if (typeof test.numQuestions === 'number' && test.numQuestions > 0) {
      // Use numQuestions if available
      requiredCount = test.numQuestions;
    } else {
      // If no required count is specified, assume test is complete if it has any questions
      // This handles legacy tests that might not have numQuestions set
      return true;
    }

    // If required count is 0, test is not ready
    if (requiredCount === 0) {
      return false;
    }

    // Get actual question count
    let actualCount = 0;

    // First, try to get from embedded questions if available
    if (Array.isArray(test.questions) && test.questions.length > 0) {
      actualCount = test.questions.length;
    } else {
      // Fetch from API to get the actual question count
      try {
        const res = await fetch(`/api/tests/${encodeURIComponent(test.id)}`);
        if (res.ok) {
          const testData = await res.json();
          if (testData.success && testData.test) {
            if (Array.isArray(testData.test.questions)) {
              actualCount = testData.test.questions.length;
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching test questions count:', err);
        // If we can't fetch, assume incomplete to be safe
        return false;
      }
    }

    // Check if all questions are added
    return actualCount >= requiredCount;
  } catch (err) {
    console.error('Error checking if test has all questions:', err);
    // On error, assume incomplete to be safe
    return false;
  }
}

const loadFreeTests = async () => {
  const container = document.getElementById('free-tests-container');
  const loginNotice = document.getElementById('free-tests-login-notice');

  if (!container) return;

  const user = getUser();
  if (loginNotice) {
    loginNotice.style.display = user ? 'none' : 'flex';
  }

  container.innerHTML = '<p class="empty-state">Loading free tests...</p>';

  try {
    const res = await fetch('/api/tests/free');
    if (!res.ok) throw new Error('Request failed');
    const data = await res.json();
    if (!(data.success && Array.isArray(data.tests))) {
      container.innerHTML = '<p class="empty-state">No free tests available right now.</p>';
      return;
    }

    if (data.tests.length === 0) {
      container.innerHTML = '<p class="empty-state">No free tests available right now.</p>';
      return;
    }

    container.innerHTML = '';

    // Process tests sequentially to check question completeness
    for (const test of data.tests) {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); transition: transform 0.3s ease, box-shadow 0.3s ease; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 1rem;';
      
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
      });

      const title = document.createElement('h3');
      title.textContent = test.name || 'Free Test';
      title.style.cssText = 'color: #0a1931; font-size: 1.3rem; font-weight: 700; margin: 0; line-height: 1.3;';
      card.appendChild(title);

      // Check if test has all questions added
      const allQuestionsAdded = await hasAllQuestionsAdded(test);

      // If questions are not complete, show "Coming Soon" regardless of login status
      if (!allQuestionsAdded) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'buy-btn';
        button.textContent = 'Coming Soon';
        button.style.cssText = 'background: #94a3b8; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; border: none; cursor: not-allowed; transition: all 0.3s ease; margin-top: auto; font-size: 1rem; opacity: 0.8;';
        button.disabled = true;
        card.appendChild(button);
        container.appendChild(card);
        continue;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'buy-btn';
      button.textContent = user ? 'Attempt Now' : 'Login to Attempt';
      button.style.cssText = 'background: linear-gradient(135deg, #00bfff, #0095cc); color: white; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; transition: all 0.3s ease; margin-top: auto; font-size: 1rem;';
      
      if (!user) {
        button.classList.add('disabled');
        button.style.opacity = '0.7';
      }

      button.disabled = !user;

      button.addEventListener('mouseenter', () => {
        if (user) {
          button.style.transform = 'translateY(-2px)';
          button.style.boxShadow = '0 4px 12px rgba(0, 191, 255, 0.4)';
        }
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = 'none';
      });

      button.addEventListener('click', () => {
        if (!user) {
          window.location.href = 'login-register.html';
          return;
        }

        const testId = getTestId(test);
        if (!testId) return;

        // Save test data for instructions page (similar to paid tests flow)
        try {
          localStorage.setItem('testData', JSON.stringify(test));
          localStorage.setItem('testId', testId);
          localStorage.setItem('testType', 'admin'); // Free tests are from admin
          if (test.categoryId) {
            localStorage.setItem('testCategory', test.categoryId);
          }
        } catch (err) {
          console.warn('Could not persist test to localStorage', err);
        }

        // Navigate to instructions page first (same flow as paid tests)
        const params = new URLSearchParams();
        params.set('testId', testId);
        if (test.categoryId) params.set('cat', test.categoryId);
        window.location.href = `instructions.html?${params.toString()}`;
      });

      card.appendChild(button);
      container.appendChild(card);
    }
  } catch (err) {
    console.error('Unable to load free tests:', err);
    container.innerHTML = '<p class="empty-state">Unable to load free tests right now. Please try again later.</p>';
  }
};

document.addEventListener('DOMContentLoaded', loadFreeTests);

