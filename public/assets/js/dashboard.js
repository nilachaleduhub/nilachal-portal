// dashboard.js: Handles user dashboard logic

document.addEventListener('DOMContentLoaded', async () => {
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const profileAvatar = document.getElementById('profile-avatar');
  const logoutBtn = document.getElementById('logout-btn');
  const resultsTable = document.getElementById('results-table');
  const resultsTbody = document.getElementById('results-tbody');
  const noResultsDiv = document.getElementById('no-results');
  const viewProfileBtn = document.getElementById('view-profile-btn');
  const profileModal = document.getElementById('profile-modal');
  const closeProfileModal = document.getElementById('close-profile-modal');
  const modalProfileName = document.getElementById('modal-profile-name');
  const modalProfileEmail = document.getElementById('modal-profile-email');
  const modalProfilePhone = document.getElementById('modal-profile-phone');
  const modalProfileDate = document.getElementById('modal-profile-date');
  // My Library
  const myCoursesTab = document.getElementById('my-courses-tab');
  const myTestsTab = document.getElementById('my-tests-tab');
  const myCoursesSection = document.getElementById('my-courses-section');
  const myTestsSection = document.getElementById('my-tests-section');
  const myCoursesList = document.getElementById('my-courses-list');
  const myTestsList = document.getElementById('my-tests-list');
  const myCoursesEmpty = document.getElementById('my-courses-empty');
  const myTestsEmpty = document.getElementById('my-tests-empty');
  
  // Test series section
  const testSeriesSection = document.getElementById('test-series-section');

  // Validate session on page load (graceful - doesn't block if validation fails)
  async function validateSession() {
    const sessionToken = localStorage.getItem('sessionToken');
    const user = localStorage.getItem('user');
    
    // If no user at all, redirect to login
    if (!user) {
      localStorage.removeItem('sessionToken');
      window.location.href = 'login-register.html';
      return false;
    }
    
    // If no session token but user exists, allow access (backward compatibility)
    if (!sessionToken) {
      console.warn('No session token found, but user exists. Allowing access for backward compatibility.');
      return true;
    }

    try {
      const response = await fetch(`/api/validate-session?sessionToken=${encodeURIComponent(sessionToken)}`, {
        headers: {
          'X-Session-Token': sessionToken
        }
      });
      const data = await response.json();
      
      if (!data.success || !data.valid) {
        // Session invalid - but check if user still exists in localStorage
        // Only redirect if we're sure the session is truly invalid
        if (data.message && data.message.includes('not found')) {
          // Session was deleted (logged in from another device)
          localStorage.removeItem('user');
          localStorage.removeItem('sessionToken');
          alert('Your session has expired or you have logged in from another device. Please login again.');
          window.location.href = 'login-register.html';
          return false;
        }
        // Otherwise, allow access (might be network issue)
        console.warn('Session validation returned invalid, but allowing access:', data.message);
        return true;
      }
      
      // Session valid, update user data if needed
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return true;
    } catch (err) {
      console.error('Session validation error:', err);
      // On error, allow user to continue (network issues shouldn't block access)
      return true;
    }
  }

  // Validate session before proceeding (non-blocking)
  const sessionValid = await validateSession();
  if (!sessionValid) {
    return; // Redirect will happen in validateSession
  }

  // Get user from localStorage (set on login)
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {}

  if (!user || !user.id) {
    profileName.textContent = 'Not logged in';
    profileEmail.textContent = '';
    resultsTable.style.display = 'none';
    noResultsDiv.style.display = 'block';
    return;
  }
  const PURCHASE_CACHE_KEY = 'dashboardPurchaseCache';

  function normalizePurchases(purchases = []) {
    const result = { courses: [], categories: [], exams: [], tests: [] };
    const seen = new Set();

    purchases
      .filter(p => p && p.status === 'completed')
      .forEach(purchase => {
        const type = purchase.purchaseType;
        const purchaseId = purchase.purchaseId;
        if (!type || !purchaseId) return;

        const key = `${type}:${purchaseId}`;
        if (seen.has(key)) return;
        seen.add(key);

        const normalized = {
          id: purchaseId,
          name: purchase.purchaseName || '',
          categoryId: purchase.categoryId || null,
          userId: purchase.userId,
          userEmail: purchase.userEmail,
          userPhone: purchase.userPhone,
          purchaseType: type,
          courseValidity: purchase.courseValidity || null,
          validityValue: purchase.validityValue,
          validityUnit: purchase.validityUnit,
          purchasedAt: purchase.purchasedAt ? (typeof purchase.purchasedAt === 'string' ? purchase.purchasedAt : new Date(purchase.purchasedAt).toISOString()) : null,
          expiresAt: purchase.expiresAt ? (typeof purchase.expiresAt === 'string' ? purchase.expiresAt : new Date(purchase.expiresAt).toISOString()) : null
        };

        if (type === 'course') result.courses.push(normalized);
        else if (type === 'category') result.categories.push(normalized);
        else if (type === 'exam') result.exams.push(normalized);
        else if (type === 'test') result.tests.push(normalized);
      });

    return result;
  }

  function readCachedPurchases(userId) {
    if (!userId) return null;
    try {
      const cache = JSON.parse(localStorage.getItem(PURCHASE_CACHE_KEY) || '{}');
      return cache[userId] || null;
    } catch (err) {
      console.warn('Unable to read cached purchases', err);
      return null;
    }
  }

  function cachePurchases(userId, data) {
    if (!userId || !data) return;
    try {
      const cache = JSON.parse(localStorage.getItem(PURCHASE_CACHE_KEY) || '{}');
      cache[userId] = { ...data, cachedAt: Date.now() };
      localStorage.setItem(PURCHASE_CACHE_KEY, JSON.stringify(cache));
    } catch (err) {
      console.warn('Unable to cache purchases', err);
    }
  }

  async function fetchServerPurchases(userId) {
    const res = await fetch(`/api/purchases?userId=${encodeURIComponent(userId)}&includeExpired=true`, {
      headers: { 'Cache-Control': 'no-store' }
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.purchases)) {
      throw new Error(data.message || 'Unable to load purchases');
    }
    return data.purchases;
  }

  async function getPurchases() {
    const userId = user && (user.id || user._id || user.userId || user.email);
    if (!userId) return { courses: [], categories: [], exams: [], tests: [] };

    try {
      const serverPurchases = await fetchServerPurchases(userId);
      const normalized = normalizePurchases(serverPurchases);
      cachePurchases(userId, normalized);
      return normalized;
    } catch (err) {
      console.error('Falling back to cached purchases:', err);
      return readCachedPurchases(userId) || { courses: [], categories: [], exams: [], tests: [] };
    }
  }

  // Calculate expiry date from validity string and purchase date
  function calculateExpiryDate(validityStr, purchaseDateStr) {
    if (!validityStr || !purchaseDateStr) return null;
    
    try {
      const purchaseDate = new Date(purchaseDateStr);
      if (isNaN(purchaseDate.getTime())) return null;
      
      // Parse validity string (e.g., "6 months", "1 year", "30 days", "90 days")
      const validity = validityStr.toLowerCase().trim();
      const daysMatch = validity.match(/(\d+)\s*days?/);
      const monthsMatch = validity.match(/(\d+)\s*months?/);
      const yearsMatch = validity.match(/(\d+)\s*years?/);
      
      const expiryDate = new Date(purchaseDate);
      
      if (daysMatch) {
        const days = parseInt(daysMatch[1], 10);
        expiryDate.setDate(expiryDate.getDate() + days);
      } else if (monthsMatch) {
        const months = parseInt(monthsMatch[1], 10);
        expiryDate.setMonth(expiryDate.getMonth() + months);
      } else if (yearsMatch) {
        const years = parseInt(yearsMatch[1], 10);
        expiryDate.setFullYear(expiryDate.getFullYear() + years);
      } else {
        return null;
      }
      
      return expiryDate;
    } catch (err) {
      console.warn('Error calculating expiry date:', err);
      return null;
    }
  }

  // Format date for display
  function formatExpiryDate(date) {
    if (!date) return null;
    try {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (err) {
      return null;
    }
  }

  function renderMyCourses(items) {
    if (!myCoursesList || !myCoursesEmpty) return;
    if (!items || items.length === 0) {
      myCoursesList.innerHTML = '';
      myCoursesEmpty.style.display = 'block';
      return;
    }
    myCoursesEmpty.style.display = 'none';
    myCoursesList.innerHTML = '';
    items.forEach(c => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'background-color: white; padding: 1.5rem 1rem; border-radius: 15px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); transition: transform 0.3s ease, box-shadow 0.3s ease; display: flex; flex-direction: column; justify-content: space-between; word-wrap: break-word; overflow-wrap: break-word; height: 100%;';
      
      // Calculate expiry date
      const expiryDate = calculateExpiryDate(c.courseValidity, c.purchasedAt);
      const expiryDateStr = expiryDate ? formatExpiryDate(expiryDate) : null;
      const isExpired = expiryDate && expiryDate < new Date();
      
      card.innerHTML = `
        <h3 style="color: #0a1931; margin-bottom: 0.5rem; font-size: 1.3rem; font-weight: bold;">${c.name || 'Course'}</h3>
        <p style="color: #444; font-size: 0.95rem; margin-bottom: 0.5rem; line-height: 1.4; flex-grow: 1;">${c.description || 'Access your purchased course content and lessons.'}</p>
        ${expiryDateStr ? `
          <div style="margin-bottom: 1rem; padding: 0.5rem; background: ${isExpired ? '#fee2e2' : '#f0fdf4'}; border-radius: 6px; border-left: 3px solid ${isExpired ? '#ef4444' : '#10b981'};">
            <div style="font-size: 0.85rem; color: ${isExpired ? '#dc2626' : '#059669'}; font-weight: 600;">
              ${isExpired ? '⚠️ Expired' : '✓ Valid until'}: <span style="color: #374151;">${expiryDateStr}</span>
            </div>
          </div>
        ` : ''}
        ${isExpired ? `
          <div style="margin-bottom: 0.5rem; padding: 0.75rem; background: #fef3c7; border-radius: 6px; border: 1px solid #fbbf24;">
            <p style="font-size: 0.85rem; color: #92400e; margin-bottom: 0.5rem; font-weight: 600;">Do you want to renew it?</p>
            <div style="display: flex; gap: 0.5rem;">
              <button class="renew-yes-btn" data-item-id="${c.id}" data-item-type="course" data-category-id="${c.categoryId || ''}" style="flex: 1; background: #10b981; color: white; border: none; padding: 0.5rem; border-radius: 5px; font-weight: 600; cursor: pointer;">Yes</button>
              <button class="renew-no-btn" data-item-id="${c.id}" data-item-type="course" data-category-id="${c.categoryId || ''}" style="flex: 1; background: #6b7280; color: white; border: none; padding: 0.5rem; border-radius: 5px; font-weight: 600; cursor: pointer;">No</button>
            </div>
          </div>
        ` : ''}
        <a href="${c.url || `courses-lessons.html?catId=${encodeURIComponent(c.categoryId||'')}&courseId=${encodeURIComponent(c.id||'')}`}" 
           style="text-decoration: none; background-color: ${isExpired ? '#94a3b8' : '#00bfff'}; color: white; padding: 0.6rem 1rem; border-radius: 5px; font-weight: bold; transition: background 0.3s; text-align: center; display: block; ${isExpired ? 'pointer-events: none; cursor: not-allowed;' : ''}">
          ${isExpired ? 'Access Expired' : (c.url ? 'Open Course' : 'View Lessons')}
        </a>
      `;
      
      // Add event listeners for renewal buttons
      if (isExpired) {
        const renewYesBtn = card.querySelector('.renew-yes-btn');
        const renewNoBtn = card.querySelector('.renew-no-btn');
        if (renewYesBtn) {
          renewYesBtn.addEventListener('click', () => {
            const itemId = renewYesBtn.dataset.itemId;
            const itemType = renewYesBtn.dataset.itemType;
            const categoryId = renewYesBtn.dataset.categoryId;
            window.location.href = `buy-course-details.html?type=${itemType}&id=${itemId}${categoryId ? `&categoryId=${categoryId}` : ''}`;
          });
        }
        if (renewNoBtn) {
          renewNoBtn.addEventListener('click', () => {
            card.remove();
          });
        }
      }
      if (!isExpired) {
        card.addEventListener('mouseenter', () => {
          card.style.transform = 'translateY(-6px)';
          card.style.boxShadow = '0 16px 24px rgba(0, 123, 255, 0.18)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = 'translateY(0)';
          card.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
        });
      }
      myCoursesList.appendChild(card);
    });
  }

  function renderMyTests(categories, exams, tests) {
    if (!myTestsList || !myTestsEmpty) return;
    const allItems = [
      ...(categories || []).map(c => ({ ...c, itemType: 'category' })),
      ...(exams || []).map(e => ({ ...e, itemType: 'exam' })),
      ...(tests || []).map(t => ({ ...t, itemType: 'test' }))
    ];
    if (!allItems || allItems.length === 0) {
      myTestsList.innerHTML = '';
      myTestsEmpty.style.display = 'block';
      return;
    }
    myTestsEmpty.style.display = 'none';
    myTestsList.innerHTML = '';
    allItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'background-color: white; padding: 1.5rem 1rem; border-radius: 15px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); transition: transform 0.3s ease, box-shadow 0.3s ease; display: flex; flex-direction: column; justify-content: space-between; word-wrap: break-word; overflow-wrap: break-word; height: 100%;';
      
      const isCategory = item.itemType === 'category' || item.purchaseType === 'category' || item.type === 'category';
      const isExam = item.itemType === 'exam' || item.purchaseType === 'exam' || item.type === 'exam';
      const isTest = item.itemType === 'test' || item.purchaseType === 'test' || item.type === 'test';
      
      let itemType, linkUrl, linkText, badgeColor;
      if (isCategory) {
        itemType = 'Category';
        linkUrl = `category.html?cat=${encodeURIComponent(item.id || '')}`;
        linkText = 'View Exams';
        badgeColor = 'linear-gradient(135deg, #667eea, #764ba2)';
      } else if (isExam) {
        itemType = 'Exam';
        linkUrl = `exam.html?cat=${encodeURIComponent(item.categoryId || '')}&exam=${encodeURIComponent(item.id || '')}`;
        linkText = 'View Tests';
        badgeColor = 'linear-gradient(135deg, #667eea, #764ba2)';
      } else {
        itemType = 'Test';
        linkUrl = `instructions.html?testId=${encodeURIComponent(item.id || '')}`;
        linkText = 'Start Test';
        badgeColor = 'linear-gradient(135deg, #10b981, #059669)';
      }
      
      // Calculate expiry date
      const expiryDate = calculateExpiryDate(item.courseValidity, item.purchasedAt);
      const expiryDateStr = expiryDate ? formatExpiryDate(expiryDate) : null;
      const isExpired = expiryDate && expiryDate < new Date();
      
      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
          <span style="background: ${badgeColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">${itemType}</span>
        </div>
        <h3 style="color: #0a1931; margin-bottom: 0.5rem; font-size: 1.3rem; font-weight: bold;">${item.name || itemType}</h3>
        <p style="color: #444; font-size: 0.95rem; margin-bottom: 0.5rem; line-height: 1.4; flex-grow: 1;">${item.description || item.examName || `Access this ${itemType.toLowerCase()}.`}</p>
        ${expiryDateStr ? `
          <div style="margin-bottom: 1rem; padding: 0.5rem; background: ${isExpired ? '#fee2e2' : '#f0fdf4'}; border-radius: 6px; border-left: 3px solid ${isExpired ? '#ef4444' : '#10b981'};">
            <div style="font-size: 0.85rem; color: ${isExpired ? '#dc2626' : '#059669'}; font-weight: 600;">
              ${isExpired ? '⚠️ Expired' : '✓ Valid until'}: <span style="color: #374151;">${expiryDateStr}</span>
            </div>
          </div>
        ` : ''}
        ${isExpired ? `
          <div style="margin-bottom: 0.5rem; padding: 0.75rem; background: #fef3c7; border-radius: 6px; border: 1px solid #fbbf24;">
            <p style="font-size: 0.85rem; color: #92400e; margin-bottom: 0.5rem; font-weight: 600;">Do you want to renew it?</p>
            <div style="display: flex; gap: 0.5rem;">
              <button class="renew-yes-btn" data-item-id="${item.id}" data-item-type="${isCategory ? 'category' : isExam ? 'exam' : 'test'}" data-category-id="${item.categoryId || ''}" style="flex: 1; background: #10b981; color: white; border: none; padding: 0.5rem; border-radius: 5px; font-weight: 600; cursor: pointer;">Yes</button>
              <button class="renew-no-btn" data-item-id="${item.id}" data-item-type="${isCategory ? 'category' : isExam ? 'exam' : 'test'}" data-category-id="${item.categoryId || ''}" style="flex: 1; background: #6b7280; color: white; border: none; padding: 0.5rem; border-radius: 5px; font-weight: 600; cursor: pointer;">No</button>
            </div>
          </div>
        ` : ''}
        <a href="${linkUrl}" 
           style="text-decoration: none; background-color: ${isExpired ? '#94a3b8' : (isTest ? '#10b981' : '#00bfff')}; color: white; padding: 0.6rem 1rem; border-radius: 5px; font-weight: bold; transition: background 0.3s; text-align: center; display: block; ${isExpired ? 'pointer-events: none; cursor: not-allowed;' : ''}">
          ${isExpired ? 'Access Expired' : linkText}
        </a>
      `;
      
      // Add event listeners for renewal buttons
      if (isExpired) {
        const renewYesBtn = card.querySelector('.renew-yes-btn');
        const renewNoBtn = card.querySelector('.renew-no-btn');
        if (renewYesBtn) {
          renewYesBtn.addEventListener('click', () => {
            const itemId = renewYesBtn.dataset.itemId;
            const itemType = renewYesBtn.dataset.itemType;
            const categoryId = renewYesBtn.dataset.categoryId;
            window.location.href = `buy-course-details.html?type=${itemType}&id=${itemId}${categoryId ? `&categoryId=${categoryId}` : ''}`;
          });
        }
        if (renewNoBtn) {
          renewNoBtn.addEventListener('click', () => {
            card.remove();
          });
        }
      }
      if (!isExpired) {
        card.addEventListener('mouseenter', () => {
          card.style.transform = 'translateY(-6px)';
          card.style.boxShadow = '0 16px 24px rgba(0, 123, 255, 0.18)';
          const link = card.querySelector('a');
          if (link) {
            if (isTest) {
              link.style.backgroundColor = '#059669';
            } else {
              link.style.backgroundColor = '#0095cc';
            }
          }
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = 'translateY(0)';
          card.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
          const link = card.querySelector('a');
          if (link) {
            if (isTest) {
              link.style.backgroundColor = '#10b981';
            } else {
              link.style.backgroundColor = '#00bfff';
            }
          }
        });
      }
      myTestsList.appendChild(card);
    });
  }

  async function showMyCourses() {
    if (myCoursesSection && myTestsSection) {
      myCoursesSection.style.display = 'block';
      myTestsSection.style.display = 'none';
    }
    const { courses } = await getPurchases();
    // Filter to show only actual courses (not categories or exams)
    const actualCourses = courses.filter(c => {
      const purchaseType = c.purchaseType || c.type;
      return !purchaseType || purchaseType === 'course';
    });
    renderMyCourses(actualCourses);
  }

  async function showMyTests() {
    if (myCoursesSection && myTestsSection) {
      myCoursesSection.style.display = 'none';
      myTestsSection.style.display = 'block';
    }
    const { categories, exams, tests } = await getPurchases();
    // Debug: Log purchases to help identify issues
    console.log('My Tests - Categories:', categories);
    console.log('My Tests - Exams:', exams);
    console.log('My Tests - Tests:', tests);
    renderMyTests(categories || [], exams || [], tests || []);
  }

  if (myCoursesTab) myCoursesTab.addEventListener('click', showMyCourses);
  if (myTestsTab) myTestsTab.addEventListener('click', showMyTests);
  // Default tab: My Test (changed from My Course)
  showMyTests();

  profileName.textContent = user.name || 'User';
  profileEmail.textContent = user.email || '';
  // Avatar rendering helpers
  const avatarUploadInput = document.getElementById('avatar-upload-input');
  const changePhotoLabel = document.getElementById('change-photo-label');
  const modalProfilePhotoStatus = document.getElementById('modal-profile-photo-status');
  function renderAvatar() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem('user')); } catch {}
    const avatarUrl = (stored && stored.avatarUrl) ? stored.avatarUrl : (user && user.avatarUrl);
    if (avatarUrl) {
      profileAvatar.innerHTML = `<img src="${avatarUrl}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      if (modalProfilePhotoStatus) modalProfilePhotoStatus.textContent = 'Set';
    } else {
      profileAvatar.textContent = (user && user.name && user.name.length > 0) ? user.name[0].toUpperCase() : '👤';
      if (modalProfilePhotoStatus) modalProfilePhotoStatus.textContent = 'Not set';
    }
  }
  renderAvatar();
  if (avatarUploadInput) {
    avatarUploadInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const u = JSON.parse(localStorage.getItem('user')) || {};
          u.avatarUrl = reader.result;
          localStorage.setItem('user', JSON.stringify(u));
          user.avatarUrl = reader.result;
          renderAvatar();
        } catch {}
      };
      reader.readAsDataURL(file);
    });
  }
  // Change Photo should also remove when photo exists (confirm)
  if (changePhotoLabel) {
    changePhotoLabel.addEventListener('click', (e) => {
      // If an avatar is already set, offer to remove instead of uploading new
      let stored = null;
      try { stored = JSON.parse(localStorage.getItem('user')); } catch {}
      const hasAvatar = !!((stored && stored.avatarUrl) || (user && user.avatarUrl));
      if (hasAvatar) {
        const shouldRemove = confirm('Remove current photo? Click Cancel to upload a new one.');
        if (shouldRemove) {
          e.preventDefault(); // stop file dialog
          try {
            const u = JSON.parse(localStorage.getItem('user')) || {};
            delete u.avatarUrl;
            localStorage.setItem('user', JSON.stringify(u));
            delete user.avatarUrl;
            renderAvatar();
          } catch {}
        }
      }
    });
  }

  // Profile modal logic
  viewProfileBtn.addEventListener('click', () => {
    modalProfileName.textContent = user.name || '';
    modalProfileEmail.textContent = user.email || '';
    modalProfilePhone.textContent = user.phone || 'Not provided';
    modalProfileDate.textContent = user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A';
    profileModal.classList.add('show');
  });
  
  closeProfileModal.addEventListener('click', () => {
    profileModal.classList.remove('show');
  });

  // Close modal when clicking outside
  profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) {
      profileModal.classList.remove('show');
    }
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    const sessionToken = localStorage.getItem('sessionToken');
    
    // Call logout API to clear server session
    if (sessionToken) {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken
          },
          body: JSON.stringify({ sessionToken })
        });
      } catch (err) {
        console.warn('Logout API call failed:', err);
      }
    }
    
    // Clear local storage
    localStorage.removeItem('user');
    localStorage.removeItem('sessionToken');
    window.location.href = 'login-register.html';
  });

  // Fetch user results
  // First, if there's a local testResult (from a just-submitted test), try to sync it to server
  try {
    const localResultRaw = localStorage.getItem('testResult');
    if (localResultRaw) {
      const localResult = JSON.parse(localResultRaw);
      // Post to server
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: localResult.testId,
          userId: user.id || user._id || '',
          name: user.name || '',
          score: localResult.score,
          totalMarks: localResult.totalMarks,
          correct: localResult.correct,
          incorrect: localResult.incorrect,
          unattempted: localResult.unattempted,
          timeTaken: localResult.timeTaken,
          userAnswers: localResult.answers || localResult.userAnswers // Include user's answers if available
        })
      }).then(r => r.json()).then(resp => {
        // If synced successfully, remove local copy
        if (resp && resp.success) {
          try { localStorage.removeItem('testResult'); } catch (e) {}
        }
      }).catch(err => { console.warn('Sync to server failed', err); });
    }
  } catch (e) { console.warn('No local test result to sync', e); }
  try {
    const res = await fetch(`/api/results?userId=${encodeURIComponent(user.id)}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.results) && data.results.length > 0) {
      // Show test series section
      testSeriesSection.style.display = 'block';
      
      // Show results table
      resultsTable.style.display = '';
      noResultsDiv.style.display = 'none';
      resultsTbody.innerHTML = '';
      
      // Sort results by date (newest first)
      const sortedResults = data.results.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
      
      sortedResults.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.testName || r.testId || ''}</td>
          <td>
            <a href="result.html?testId=${r.testId || ''}&resultId=${r._id || ''}" class="analysis-btn">
              <i class="fas fa-chart-line"></i>
              Test Analysis
            </a>
          </td>
        `;
        resultsTbody.appendChild(tr);
      });
    } else {
      // Hide test series section and show no results
      testSeriesSection.style.display = 'none';
      resultsTable.style.display = 'none';
      noResultsDiv.style.display = 'block';
    }
  } catch (err) {
    console.error('Error loading results:', err);
    testSeriesSection.style.display = 'none';
    resultsTable.style.display = 'none';
    noResultsDiv.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Error Loading Results</h3>
      <p>There was a problem loading your test results. Please try again later.</p>
    `;
    noResultsDiv.style.display = 'block';
  }
});
