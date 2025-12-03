// dashboard.js: Handles user dashboard logic

document.addEventListener('DOMContentLoaded', async () => {
  // Check if we just completed a purchase - if so, wait a bit longer before fetching
  const urlParams = new URLSearchParams(window.location.search);
  const purchaseComplete = urlParams.get('purchaseComplete') === 'true';
  if (purchaseComplete) {
    // Wait a bit longer if purchase was just completed to ensure database write is visible
    await new Promise(resolve => setTimeout(resolve, 500));
  }
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
  // My Library: Read purchases from server (source of truth) and enrich with localStorage data
  async function getPurchases(retryCount = 0) {
    const userId = user && (user.id || user._id || user.userId || user.email);
    if (!userId) return { courses: [], categories: [], exams: [], tests: [] };

    let serverPurchases = [];
    try {
      // Force fresh fetch by adding cache-busting timestamp parameter
      const cacheBuster = Date.now();
      const res = await fetch(`/api/purchases?userId=${encodeURIComponent(userId)}&includeExpired=true&_t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.purchases)) {
        serverPurchases = data.purchases;
      }
      
      // If server returns empty, retry with exponential backoff
      // This handles race conditions where purchase was just saved but not yet queryable
      if (serverPurchases.length === 0 && retryCount < 3) {
        const delay = Math.min(500 * Math.pow(2, retryCount), 2000); // 500ms, 1000ms, 2000ms
        console.log(`No purchases found on attempt ${retryCount + 1}, retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return getPurchases(retryCount + 1); // Retry with incremented count
      }
    } catch (err) {
      console.warn('Error fetching purchases from server:', err);
      // If fetch fails, retry with exponential backoff
      if (retryCount < 3) {
        const delay = Math.min(500 * Math.pow(2, retryCount), 2000); // 500ms, 1000ms, 2000ms
        console.log(`Purchase fetch failed on attempt ${retryCount + 1}, retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return getPurchases(retryCount + 1); // Retry with incremented count
      }
    }

    let store = null;
    try {
      store = JSON.parse(localStorage.getItem('userPurchases'));
    } catch (err) {
      console.warn('Unable to parse userPurchases from localStorage', err);
    }

    // Respect previously dismissed renewals before building item lists
    let dismissedPurchases = [];
    try {
      const dismissed = localStorage.getItem('dismissedPurchases');
      if (dismissed) {
        dismissedPurchases = JSON.parse(dismissed);
      }
    } catch (err) {
      console.warn('Unable to parse dismissedPurchases from localStorage', err);
      dismissedPurchases = [];
    }
    if (Array.isArray(dismissedPurchases) && dismissedPurchases.length > 0) {
      const dismissedSet = new Set(dismissedPurchases);
      serverPurchases = serverPurchases.filter(p => {
        const purchaseKey = `${p.purchaseType}_${p.purchaseId}`;
        return !dismissedSet.has(purchaseKey);
      });
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
        purchasedAt: p.purchasedAt ? (typeof p.purchasedAt === 'string' ? p.purchasedAt : p.purchasedAt.toISOString()) : null,
        courseValidity: p.courseValidity || null,
        validityValue: p.validityValue || null,
        validityUnit: p.validityUnit || null,
        expiresAt: p.expiresAt ? (typeof p.expiresAt === 'string' ? p.expiresAt : (p.expiresAt.toISOString ? p.expiresAt.toISOString() : null)) : null
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
        purchasedAt: p.purchasedAt ? (typeof p.purchasedAt === 'string' ? p.purchasedAt : p.purchasedAt.toISOString()) : null,
        courseValidity: p.courseValidity || null,
        validityValue: p.validityValue || null,
        validityUnit: p.validityUnit || null,
        expiresAt: p.expiresAt ? (typeof p.expiresAt === 'string' ? p.expiresAt : (p.expiresAt.toISOString ? p.expiresAt.toISOString() : null)) : null
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
        purchasedAt: p.purchasedAt ? (typeof p.purchasedAt === 'string' ? p.purchasedAt : p.purchasedAt.toISOString()) : null,
        courseValidity: p.courseValidity || null,
        validityValue: p.validityValue || null,
        validityUnit: p.validityUnit || null,
        expiresAt: p.expiresAt ? (typeof p.expiresAt === 'string' ? p.expiresAt : (p.expiresAt.toISOString ? p.expiresAt.toISOString() : null)) : null
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
        purchasedAt: p.purchasedAt ? (typeof p.purchasedAt === 'string' ? p.purchasedAt : p.purchasedAt.toISOString()) : null,
        courseValidity: p.courseValidity || null,
        validityValue: p.validityValue || null,
        validityUnit: p.validityUnit || null,
        expiresAt: p.expiresAt ? (typeof p.expiresAt === 'string' ? p.expiresAt : (p.expiresAt.toISOString ? p.expiresAt.toISOString() : null)) : null
      }));

    // Always prioritize server purchases - localStorage is only used for enrichment
    // Only return empty if we've exhausted retries and have no server purchases and no localStorage
    if (serverPurchases.length === 0 && !store) {
      // If we haven't retried yet, the retry logic above should have handled it
      // This is a final check after retries
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

    // Extract localStorage purchases (for enrichment only - server is source of truth)
    let localCourses = [];
    let localCategories = [];
    let localExams = [];
    let localTests = [];

    if (Array.isArray(store)) {
      // If localStorage is an array, extract purchases from it
      localCourses = filterByUser(store.filter(entry => entry && String(entry.type || '').toLowerCase() === 'course'));
      localCategories = filterByUser(store.filter(entry => entry && String(entry.type || '').toLowerCase() === 'category'));
      localExams = filterByUser(store.filter(entry => entry && String(entry.type || '').toLowerCase() === 'exam'));
      localTests = filterByUser(store.filter(entry => entry && String(entry.type || '').toLowerCase() === 'test'));
    } else if (typeof store === 'object' && store !== null) {
      // Extract localStorage purchases if store is an object (for enrichment only)
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
        localCourses = uniqueById([...localCourses, ...actualCourses]);
        localCategories = uniqueById([...localCategories, ...categories]);
        localExams = uniqueById([...localExams, ...exams]);
        localTests = uniqueById([...localTests, ...tests]);
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

      // Merge all localStorage data
      localCourses = uniqueById([...localCourses, ...courses, ...userCoursesFromItems]);
      localCategories = uniqueById([...localCategories, ...categories, ...userCategoriesFromItems]);
      localExams = uniqueById([...localExams, ...exams, ...userExamsFromItems]);
      localTests = uniqueById([...localTests, ...tests, ...userTestsFromItems]);
    }

    // Enrich server purchases with localStorage data (for validity dates, etc.)
    // Server purchases are the source of truth, localStorage is only for enrichment
    const enrichWithLocalData = (serverItems, localItems) => {
      return serverItems.map(serverItem => {
        const localItem = localItems.find(l => {
          const lId = l.id || l.courseId || l.testId || l._id;
          const sId = serverItem.id || serverItem.courseId || serverItem.testId || serverItem._id;
          return lId === sId;
        });
        if (localItem) {
          // Enrich server data with localStorage validity info (for renewals)
          if (localItem.courseValidity) {
            serverItem.courseValidity = localItem.courseValidity;
          }
          if (localItem.purchasedAt) {
            serverItem.purchasedAt = localItem.purchasedAt;
          }
          if (localItem.expiresAt) {
            serverItem.expiresAt = localItem.expiresAt;
          }
          if (localItem.validityValue !== undefined) {
            serverItem.validityValue = localItem.validityValue;
          }
          if (localItem.validityUnit) {
            serverItem.validityUnit = localItem.validityUnit;
          }
        }
        return serverItem;
      });
    };

    // Always prioritize server purchases - merge with localStorage for enrichment
    const enrichedServerCourses = enrichWithLocalData(serverCourses, localCourses);
    const enrichedServerCategories = enrichWithLocalData(serverCategories, localCategories);
    const enrichedServerExams = enrichWithLocalData(serverExams, localExams);
    const enrichedServerTests = enrichWithLocalData(serverTests, localTests);

    // Server purchases are the source of truth - only add localStorage items that aren't already in server
    const addMissingLocalItems = (serverItems, localItems) => {
      const serverIds = new Set(serverItems.map(s => String(s.id || s.courseId || s.testId || s._id || '')));
      const missingLocalItems = localItems.filter(l => {
        const lId = String(l.id || l.courseId || l.testId || l._id || '');
        return lId && !serverIds.has(lId);
      });
      return [...serverItems, ...missingLocalItems];
    };

    const allCourses = uniqueById(addMissingLocalItems(enrichedServerCourses, localCourses));
    const allCategories = uniqueById(addMissingLocalItems(enrichedServerCategories, localCategories));
    const allExams = uniqueById(addMissingLocalItems(enrichedServerExams, localExams));
    const allTests = uniqueById(addMissingLocalItems(enrichedServerTests, localTests));

    // Always return server purchases (enriched with localStorage data)
    return { 
      courses: allCourses, 
      categories: allCategories,
      exams: allExams,
      tests: allTests
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
      
      // Get expiry date - prioritize server-provided expiresAt, fallback to calculation
      let expiryDate = null;
      if (c.expiresAt) {
        // Use server-provided expiresAt directly
        expiryDate = typeof c.expiresAt === 'string' ? new Date(c.expiresAt) : c.expiresAt;
        if (isNaN(expiryDate.getTime())) expiryDate = null;
      }
      // Fallback to calculation if expiresAt not available
      if (!expiryDate && c.courseValidity && c.purchasedAt) {
        expiryDate = calculateExpiryDate(c.courseValidity, c.purchasedAt);
      }
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
          renewNoBtn.addEventListener('click', async () => {
            const itemId = renewNoBtn.dataset.itemId;
            const itemType = renewNoBtn.dataset.itemType;
            
            try {
              // Add to dismissed purchases list (works for both server and localStorage purchases)
              let dismissedPurchases = [];
              try {
                const dismissed = localStorage.getItem('dismissedPurchases');
                if (dismissed) {
                  dismissedPurchases = JSON.parse(dismissed);
                }
              } catch (e) {
                dismissedPurchases = [];
              }
              
              // Create a unique key for this purchase
              const purchaseKey = `${itemType}_${itemId}`;
              if (!dismissedPurchases.includes(purchaseKey)) {
                dismissedPurchases.push(purchaseKey);
                localStorage.setItem('dismissedPurchases', JSON.stringify(dismissedPurchases));
              }
              
              // Also remove from localStorage purchases if it exists there
              const userId = user && (user.id || user._id || user.userId || user.email);
              if (userId) {
                let userPurchases = null;
                try {
                  userPurchases = JSON.parse(localStorage.getItem('userPurchases') || '{}');
                } catch (e) {
                  userPurchases = {};
                }
                
                if (userPurchases[userId]) {
                  // Remove from courses array (for courses, categories, exams)
                  if (itemType === 'course' || itemType === 'category' || itemType === 'exam') {
                    userPurchases[userId].courses = (userPurchases[userId].courses || []).filter(p => {
                      const pId = p.id || p.courseId || p.testId || p._id;
                      const pType = p.purchaseType || p.type;
                      return !(pId === itemId && pType === itemType);
                    });
                  }
                  // Remove from tests array
                  else if (itemType === 'test') {
                    userPurchases[userId].tests = (userPurchases[userId].tests || []).filter(p => {
                      const pId = p.id || p.courseId || p.testId || p._id;
                      const pType = p.purchaseType || p.type;
                      return !(pId === itemId && pType === itemType);
                    });
                  }
                  
                  localStorage.setItem('userPurchases', JSON.stringify(userPurchases));
                }
              }
              
              // Refresh the dashboard display
              await showMyCourses();
            } catch (e) {
              console.error('Error dismissing purchase:', e);
            }
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
    let dismissedPurchases = [];
    try {
      const storedDismissed = localStorage.getItem('dismissedPurchases');
      if (storedDismissed) {
        dismissedPurchases = JSON.parse(storedDismissed) || [];
      }
    } catch (e) {
      dismissedPurchases = [];
    }
    const dismissedSet = new Set(dismissedPurchases);
    myTestsList.innerHTML = '';
    allItems.forEach(item => {
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
      const normalizedType = isCategory ? 'category' : isExam ? 'exam' : 'test';
      const purchaseId = item.id || '';
      const purchaseKey = `${normalizedType}_${purchaseId}`;

      // Get expiry date - prioritize server-provided expiresAt, fallback to calculation
      let expiryDate = null;
      if (item.expiresAt) {
        // Use server-provided expiresAt directly
        expiryDate = typeof item.expiresAt === 'string' ? new Date(item.expiresAt) : item.expiresAt;
        if (isNaN(expiryDate.getTime())) expiryDate = null;
      }
      // Fallback to calculation if expiresAt not available
      if (!expiryDate && item.courseValidity && item.purchasedAt) {
        expiryDate = calculateExpiryDate(item.courseValidity, item.purchasedAt);
      }
      const expiryDateStr = expiryDate ? formatExpiryDate(expiryDate) : null;
      const isExpired = expiryDate && expiryDate < new Date();
      
      if (isExpired && dismissedSet.has(purchaseKey)) {
        return;
      }

      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'background-color: white; padding: 1.5rem 1rem; border-radius: 15px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); transition: transform 0.3s ease, box-shadow 0.3s ease; display: flex; flex-direction: column; justify-content: space-between; word-wrap: break-word; overflow-wrap: break-word; height: 100%;';
      
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
            dismissedSet.add(purchaseKey);
            try {
              localStorage.setItem('dismissedPurchases', JSON.stringify(Array.from(dismissedSet)));
            } catch (e) {
              console.error('Failed to store dismissed purchases', e);
            }
            card.style.display = 'none';
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
  
  // Force refresh purchases when page becomes visible (user switches back to tab)
  // This ensures fresh data if user made a purchase in another tab/window
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Page became visible - refresh the currently active tab
      if (myTestsSection && myTestsSection.style.display !== 'none') {
        showMyTests();
      } else if (myCoursesSection && myCoursesSection.style.display !== 'none') {
        showMyCourses();
      }
    }
  });
  
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
