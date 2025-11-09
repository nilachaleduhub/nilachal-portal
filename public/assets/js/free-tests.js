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

    data.tests.forEach(test => {
      const card = document.createElement('div');
      card.className = 'card';

      const title = document.createElement('h3');
      title.textContent = test.name || 'Free Test';
      card.appendChild(title);

      const detailsContainer = document.createElement('div');
      detailsContainer.className = 'card-details';

      const detailConfigs = [
        { label: 'Exam', value: test.examName || '' },
        { label: 'Category', value: test.categoryName || '' },
        { label: 'Time', value: formatTime(test.timeLimit) },
        { label: 'Questions', value: typeof test.numQuestions === 'number' ? test.numQuestions : '' },
        { label: 'Marking', value: buildMarkingSummary(test) }
      ];

      detailConfigs.forEach(item => {
        const pill = createDetailPill(item.label, item.value);
        if (pill) detailsContainer.appendChild(pill);
      });

      if (detailsContainer.childElementCount > 0) {
        card.appendChild(detailsContainer);
      }

      if (test.description) {
        const desc = document.createElement('p');
        desc.textContent = test.description;
        card.appendChild(desc);
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'buy-btn';
      button.textContent = user ? 'Attempt Now' : 'Login to Attempt';
      if (!user) {
        button.classList.add('disabled');
      }

      button.disabled = !user;

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
    });
  } catch (err) {
    console.error('Unable to load free tests:', err);
    container.innerHTML = '<p class="empty-state">Unable to load free tests right now. Please try again later.</p>';
  }
};

document.addEventListener('DOMContentLoaded', loadFreeTests);

