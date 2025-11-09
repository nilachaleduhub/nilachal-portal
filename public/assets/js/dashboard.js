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
  // My Library: Read purchases from server and localStorage
  async function getPurchases() {
    const userId = user && (user.id || user._id || user.userId || user.email);
    if (!userId) return { courses: [], categories: [], exams: [], tests: [] };

    let serverPurchases = [];
    try {
      const res = await fetch(`/api/purchases?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.purchases)) {
        serverPurchases = data.purchases;
      }
    } catch (err) {
      console.warn('Error fetching purchases from server:', err);
    }

    let store = null;
    try {
      store = JSON.parse(localStorage.getItem('userPurchases'));
    } catch (err) {
      console.warn('Unable to parse userPurchases from localStorage', err);
    }

    // Convert server purchases to dashboard format
    // Separate courses, categories, and exams
    const serverCourses = serverPurchases
      .filter(p => p.purchaseType === 'course' && p.status === 'completed')
      .map(p => ({
        id: p.purchaseId,
        name: p.purchaseName || '',
        categoryId: p.categoryId || null,
        userId: p.userId,
        userEmail: p.userEmail,
        userPhone: p.userPhone,
        purchaseType: p.purchaseType,
        purchasedAt: p.purchasedAt ? (typeof p.purchasedAt === 'string' ? p.purchasedAt : p.purchasedAt.toISOString()) : null
      }));

    // Categories and exams go to "My Test" section
    const serverCategories = serverPurchases
      .filter(p => p.purchaseType === 'category' && p.status === 'completed')
      .map(p => ({
        id: p.purchaseId,
        name: p.purchaseName || '',
        categoryId: p.categoryId || null,
        userId: p.userId,
        userEmail: p.userEmail,
        userPhone: p.userPhone,
        purchaseType: p.purchaseType,
        purchasedAt: p.purchasedAt ? (typeof p.purchasedAt === 'string' ? p.purchasedAt : p.purchasedAt.toISOString()) : null
      }));

    const serverExams = serverPurchases
      .filter(p => p.purchaseType === 'exam' && p.status === 'completed')
      .map(p => ({
        id: p.purchaseId,
        name: p.purchaseName || '',
        categoryId: p.categoryId || null,
        userId: p.userId,
        userEmail: p.userEmail,
        userPhone: p.userPhone,
        purchaseType: p.purchaseType,
        purchasedAt: p.purchasedAt ? (typeof p.purchasedAt === 'string' ? p.purchasedAt : p.purchasedAt.toISOString()) : null
      }));

    const serverTests = serverPurchases
      .filter(p => p.purchaseType === 'test' && p.status === 'completed')
      .map(p => ({
        id: p.purchaseId,
        name: p.purchaseName || '',
        categoryId: p.categoryId || null,
        userId: p.userId,
        userEmail: p.userEmail,
        userPhone: p.userPhone,
        purchasedAt: p.purchasedAt ? (typeof p.purchasedAt === 'string' ? p.purchasedAt : p.purchasedAt.toISOString()) : null
      }));

    if (!store && serverPurchases.length === 0) {
      return { courses: [], categories: [], exams: [], tests: [] };
    }

    const ensureArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
    const uniqueById = (items) => {
      const map = new Map();
      ensureArray(items).forEach(item => {
        if (!item || typeof item !== 'object') return;
        const key = item.id || item.courseId || item.testId || item._id;
        const mapKey = key ? String(key) : `${item.type || 'item'}_${map.size}`;
        if (!map.has(mapKey)) {
          map.set(mapKey, item);
        }
      });
      return Array.from(map.values());
    };

    const filterByUser = (items) => ensureArray(items).filter(item => {
      if (!item || typeof item !== 'object') return false;
      const ownerId = item.userId || item.ownerId || item.userID || item.user_id || item.user;
      if (ownerId) return String(ownerId) === String(userId);

      const ownerEmail = item.userEmail || item.email;
      if (ownerEmail && user.email) {
        return String(ownerEmail).toLowerCase() === String(user.email).toLowerCase();
      }

      const ownerPhone = item.userPhone || item.phone;
      if (ownerPhone && user.phone) {
        return String(ownerPhone) === String(user.phone);
      }

      const userIds = Array.isArray(item.userIds) ? item.userIds
        : Array.isArray(item.allowedUsers) ? item.allowedUsers
        : Array.isArray(item.users) ? item.users
        : null;
      if (userIds) {
        return userIds.map(String).includes(String(userId));
      }
      return false;
    });

    if (Array.isArray(store)) {
      const courses = filterByUser(store.filter(entry => entry && String(entry.type || '').toLowerCase() === 'course'));
      const categories = filterByUser(store.filter(entry => entry && String(entry.type || '').toLowerCase() === 'category'));
      const exams = filterByUser(store.filter(entry => entry && String(entry.type || '').toLowerCase() === 'exam'));
      const tests = filterByUser(store.filter(entry => entry && String(entry.type || '').toLowerCase() === 'test'));
      return { 
        courses: uniqueById(courses), 
        categories: uniqueById(categories),
        exams: uniqueById(exams),
        tests: uniqueById(tests)
      };
    }

    if (typeof store === 'object' && store !== null) {
      const candidateKeys = [String(userId)];
      if (user.email) candidateKeys.push(String(user.email).toLowerCase());
      if (user.phone) candidateKeys.push(String(user.phone));

      let bucket = null;
      for (const key of candidateKeys) {
        if (Object.prototype.hasOwnProperty.call(store, key)) {
          bucket = store[key];
          break;
        }
        const matchedKey = Object.keys(store).find(storeKey => String(storeKey).toLowerCase() === String(key).toLowerCase());
        if (matchedKey) {
          bucket = store[matchedKey];
          break;
        }
      }

      if (bucket && typeof bucket === 'object') {
        const courses = ensureArray(bucket.courses || bucket.course);
        const tests = ensureArray(bucket.tests || bucket.test);
        // Separate categories and exams from courses
        const categories = courses.filter(c => c.purchaseType === 'category' || c.type === 'category');
        const exams = courses.filter(c => c.purchaseType === 'exam' || c.type === 'exam');
        const actualCourses = courses.filter(c => {
          const purchaseType = c.purchaseType || c.type;
          return !purchaseType || purchaseType === 'course';
        });
        return { 
          courses: uniqueById(actualCourses), 
          categories: uniqueById(categories),
          exams: uniqueById(exams),
          tests: uniqueById(tests)
        };
      }

      const items = ensureArray(store.items);
      const userScopedItems = items.length > 0 ? filterByUser(items) : [];
      const userCoursesFromItems = userScopedItems.filter(item => String(item.type || '').toLowerCase() === 'course');
      const userCategoriesFromItems = userScopedItems.filter(item => String(item.type || '').toLowerCase() === 'category');
      const userExamsFromItems = userScopedItems.filter(item => String(item.type || '').toLowerCase() === 'exam');
      const userTestsFromItems = userScopedItems.filter(item => String(item.type || '').toLowerCase() === 'test');

      let courses = filterByUser(store.courses || store.coursePurchases);
      let tests = filterByUser(store.tests || store.testPurchases);

      // Separate categories and exams from courses
      const categories = courses.filter(c => c.purchaseType === 'category' || c.type === 'category');
      const exams = courses.filter(c => c.purchaseType === 'exam' || c.type === 'exam');
      courses = courses.filter(c => {
        const purchaseType = c.purchaseType || c.type;
        return !purchaseType || purchaseType === 'course';
      });

      // Also check userExamsFromItems and userCategoriesFromItems
      const allLocalCategories = uniqueById([...categories, ...userCategoriesFromItems]);
      const allLocalExams = uniqueById([...exams, ...userExamsFromItems]);

      if (courses.length === 0 && userCoursesFromItems.length > 0) courses = userCoursesFromItems;
      else if (userCoursesFromItems.length > 0) courses = uniqueById([...courses, ...userCoursesFromItems]);

      if (tests.length === 0 && userTestsFromItems.length > 0) tests = userTestsFromItems;
      else if (userTestsFromItems.length > 0) tests = uniqueById([...tests, ...userTestsFromItems]);

      // Merge with server purchases and enrich with courseValidity from localStorage if available
      const enrichWithLocalData = (serverItems, localItems) => {
        return serverItems.map(serverItem => {
          const localItem = localItems.find(l => (l.id || l.courseId || l.testId) === serverItem.id);
          if (localItem && localItem.courseValidity && !serverItem.courseValidity) {
            serverItem.courseValidity = localItem.courseValidity;
          }
          if (localItem && localItem.purchasedAt && !serverItem.purchasedAt) {
            serverItem.purchasedAt = localItem.purchasedAt;
          }
          return serverItem;
        });
      };

      const enrichedServerCourses = enrichWithLocalData(serverCourses, courses);
      const enrichedServerCategories = enrichWithLocalData(serverCategories, allLocalCategories);
      const enrichedServerExams = enrichWithLocalData(serverExams, allLocalExams);
      const enrichedServerTests = enrichWithLocalData(serverTests, tests);

      const allCourses = uniqueById([...courses, ...enrichedServerCourses]);
      const allCategories = uniqueById([...allLocalCategories, ...enrichedServerCategories]);
      const allExams = uniqueById([...allLocalExams, ...enrichedServerExams]);
      const allTests = uniqueById([...tests, ...enrichedServerTests]);

      return { 
        courses: allCourses, 
        categories: allCategories,
        exams: allExams,
        tests: allTests
      };
    }

    // If no localStorage data, return server purchases
    return { 
      courses: uniqueById(serverCourses), 
      categories: uniqueById(serverCategories),
      exams: uniqueById(serverExams),
      tests: uniqueById(serverTests)
    };
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
        <a href="${c.url || `courses-lessons.html?catId=${encodeURIComponent(c.categoryId||'')}&courseId=${encodeURIComponent(c.id||'')}`}" 
           style="text-decoration: none; background-color: ${isExpired ? '#94a3b8' : '#00bfff'}; color: white; padding: 0.6rem 1rem; border-radius: 5px; font-weight: bold; transition: background 0.3s; text-align: center; display: block; ${isExpired ? 'pointer-events: none; cursor: not-allowed;' : ''}">
          ${isExpired ? 'Access Expired' : (c.url ? 'Open Course' : 'View Lessons')}
        </a>
      `;
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
        <a href="${linkUrl}" 
           style="text-decoration: none; background-color: ${isExpired ? '#94a3b8' : (isTest ? '#10b981' : '#00bfff')}; color: white; padding: 0.6rem 1rem; border-radius: 5px; font-weight: bold; transition: background 0.3s; text-align: center; display: block; ${isExpired ? 'pointer-events: none; cursor: not-allowed;' : ''}">
          ${isExpired ? 'Access Expired' : linkText}
        </a>
      `;
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
  // Default tab: My Course
  showMyCourses();

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
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user');
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
