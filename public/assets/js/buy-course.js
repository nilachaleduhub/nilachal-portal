(() => {
  const testSeriesCategoryContainer = document.getElementById('test-series-categories');
  const testSeriesExamsContainer = document.getElementById('test-series-exams');
  const courseIndividualContainer = document.getElementById('course-individual-container');

  // Cache for user purchases from server
  let userPurchasesCache = null;
  let purchasesCacheTime = null;
  const CACHE_DURATION = 60000; // 1 minute cache

  // Function to invalidate cache (call after purchase)
  function invalidatePurchaseCache() {
    userPurchasesCache = null;
    purchasesCacheTime = null;
  }

  // Make it globally accessible for other scripts
  window.invalidatePurchaseCache = invalidatePurchaseCache;

  // Fetch user purchases from server
  async function fetchUserPurchases() {
    // Check cache first
    const now = Date.now();
    if (userPurchasesCache && purchasesCacheTime && (now - purchasesCacheTime) < CACHE_DURATION) {
      return userPurchasesCache;
    }

    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        userPurchasesCache = [];
        purchasesCacheTime = now;
        return [];
      }

      const user = JSON.parse(userStr);
      const userId = user.id || user._id || user.userId || user.email;
      if (!userId) {
        userPurchasesCache = [];
        purchasesCacheTime = now;
        return [];
      }

      // Fetch purchases from server
      const res = await fetch(`/api/purchases?userId=${encodeURIComponent(userId)}&includeExpired=true`);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.purchases)) {
        userPurchasesCache = data.purchases;
        purchasesCacheTime = now;
        return data.purchases;
      }
      
      userPurchasesCache = [];
      purchasesCacheTime = now;
      return [];
    } catch (err) {
      console.warn('Error fetching user purchases:', err);
      userPurchasesCache = [];
      purchasesCacheTime = now;
      return [];
    }
  }

  // Check if user has purchased an item (server-based)
  async function checkServerPurchaseAccess(itemId, itemType, categoryId = null) {
    try {
      const purchases = await fetchUserPurchases();
      if (!purchases || purchases.length === 0) {
        return { hasAccess: false, isExpired: false };
      }

      // Find matching purchase
      const purchase = purchases.find(p => {
        if (p.status !== 'completed') return false;
        
        const purchaseId = p.purchaseId;
        const purchaseType = p.purchaseType;
        
        // Direct match
        if (purchaseId === itemId && purchaseType === itemType) {
          return true;
        }
        
        // Category access for exams/tests
        if ((itemType === 'exam' || itemType === 'test') && categoryId && 
            p.categoryId === categoryId && purchaseType === 'category') {
          return true;
        }
        
        // Exam access for tests
        if (itemType === 'test' && categoryId && 
            p.categoryId === categoryId && purchaseType === 'exam') {
          return true;
        }
        
        return false;
      });

      if (!purchase) {
        return { hasAccess: false, isExpired: false };
      }

      // Check if expired
      let isExpired = false;
      if (purchase.expiresAt) {
        const expiryDate = purchase.expiresAt instanceof Date 
          ? purchase.expiresAt 
          : new Date(purchase.expiresAt);
        isExpired = expiryDate < new Date();
      } else if (purchase.courseValidity && purchase.purchasedAt) {
        // Calculate expiry from validity string
        const purchaseDate = new Date(purchase.purchasedAt);
        if (!isNaN(purchaseDate.getTime())) {
          const validity = purchase.courseValidity.toLowerCase().trim();
          const daysMatch = validity.match(/(\d+)\s*days?/);
          const monthsMatch = validity.match(/(\d+)\s*months?/);
          const yearsMatch = validity.match(/(\d+)\s*years?/);
          
          const expiryDate = new Date(purchaseDate);
          if (daysMatch) {
            expiryDate.setDate(expiryDate.getDate() + parseInt(daysMatch[1], 10));
          } else if (monthsMatch) {
            expiryDate.setMonth(expiryDate.getMonth() + parseInt(monthsMatch[1], 10));
          } else if (yearsMatch) {
            expiryDate.setFullYear(expiryDate.getFullYear() + parseInt(yearsMatch[1], 10));
          }
          
          isExpired = expiryDate < new Date();
        }
      }

      return { hasAccess: !isExpired, isExpired };
    } catch (err) {
      console.warn('Error checking server purchase access:', err);
      return { hasAccess: false, isExpired: false };
    }
  }

  const getEntityId = (item = {}) => {
    if (!item) return null;
    return item.id || item._id || null;
  };

  const uniqueById = (items = []) => {
    const map = new Map();
    items.forEach(item => {
      const key = getEntityId(item);
      if (!item || !key) return;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  };

  const renderEmptyState = (container, message) => {
    if (!container) return;
    container.innerHTML = `<p class="empty-state">${message}</p>`;
  };

  const hasValue = (value) => {
    if (value === 0) return true;
    return value !== undefined && value !== null && String(value).trim() !== '';
  };

  const formatValue = (value) => String(value).trim();

  const createCard = ({ title, description, details = [], onCardClick, button, type = 'course', hasDiscount = false, discountPercent = 0, discountCode = '', discountMessage = '' }) => {
    const card = document.createElement('div');
    card.className = 'recommended-card';

    // Determine badge and icon based on type
    let badge, icon;
    if (type === 'category') {
      badge = 'Mock Test Series';
      icon = '🎯';
    } else if (type === 'exam') {
      badge = 'Exam';
      icon = '📝';
    } else {
      badge = 'Course';
      icon = '📚';
    }

    // Build details HTML exactly like recommendation page
    let detailsHTML = '';
    if (Array.isArray(details) && details.some(item => item && hasValue(item.value))) {
      const detailItems = [];
      details.forEach(item => {
        if (!item || !hasValue(item.value)) return;
        const label = item.label || '';
        const value = formatValue(item.value);
        detailItems.push(`<span class="recommended-detail"><strong>${label}:</strong> ${value}</span>`);
      });
      if (detailItems.length > 0) {
        detailsHTML = `<div class="recommended-card-details">${detailItems.join('')}</div>`;
      }
    }

    // Build discount message if available (exactly like recommendation page)
    let discountInfo = '';
    if (hasDiscount && discountPercent > 0 && discountCode) {
      const discountText = discountMessage || `Get ${discountPercent}% discount using code ${discountCode}`;
      discountInfo = `<div class="recommended-discount" style="margin-top: 0.5rem; padding: 0.5rem; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 6px; border-left: 3px solid #f59e0b; font-size: 0.85rem; color: #92400e; font-weight: 600;">
        🎉 ${discountText}
      </div>`;
    }

    // Build button HTML
    const buttonText = (button && button.label) ? button.label : 'Buy Now';
    const buttonHTML = `<a href="#" class="recommended-card-btn">
      ${buttonText}
      <span class="arrow">→</span>
    </a>`;

    // Build card HTML exactly like recommendation page
    card.innerHTML = `
      <div class="recommended-card-badge">${icon} ${badge}</div>
      <h3 class="recommended-card-title">${title || 'Untitled'}</h3>
      <p class="recommended-card-desc">${description || 'Explore this content to enhance your preparation.'}</p>
      ${detailsHTML}
      ${discountInfo}
      ${buttonHTML}
    `;

    // Add click handler to button
    const btn = card.querySelector('.recommended-card-btn');
    if (btn) {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof button === 'object' && typeof button.onClick === 'function') {
          button.onClick(event);
        } else if (typeof onCardClick === 'function') {
          onCardClick();
        }
      });
    }

    return card;
  };

  const loadTestSeriesCategories = async () => {
    if (!testSeriesCategoryContainer) return [];

    let categories = [];

    // Primary source: Load from database API (admin panel mock management)
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.categories)) {
          categories = data.categories;
        }
      }
    } catch (err) {
      console.warn('Unable to load categories from API:', err);
    }

    // Fallback: Try admin API endpoint
    if (categories.length === 0) {
      try {
        const res = await fetch('/api/admin/categories');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.categories)) {
            categories = data.categories;
          }
        }
      } catch (err) {
        console.warn('Unable to load categories from admin API:', err);
      }
    }

    // Additional fallback: Load from file (for backward compatibility)
    if (categories.length === 0) {
      try {
        const res = await fetch('assets/data/categories.json');
        if (res.ok) {
          const fileData = await res.json();
          if (Array.isArray(fileData)) {
            categories = fileData;
          }
        }
      } catch (err) {
        console.warn('Unable to load categories from file:', err);
      }
    }

    // Last fallback: localStorage (for backward compatibility)
    if (categories.length === 0) {
      try {
        const storedAdmin = JSON.parse(localStorage.getItem('adminCategories') || '[]');
        const storedMain = JSON.parse(localStorage.getItem('mainCategories') || '[]');
        categories = [...storedAdmin, ...storedMain];
      } catch (err) {
        console.warn('Unable to read categories from localStorage:', err);
      }
    }

    const uniqueCategories = uniqueById(categories);

    if (uniqueCategories.length === 0) {
      renderEmptyState(testSeriesCategoryContainer, 'No categories available yet.');
      return [];
    }

    testSeriesCategoryContainer.innerHTML = '';
    
    // Check purchase status for all categories
    for (const category of uniqueCategories) {
      const categoryId = getEntityId(category);
      if (!categoryId) continue;

      const details = [
        { label: 'Price', value: category.courseCost },
        { label: 'Validity', value: category.courseValidity }
      ];

      // Check if user has purchased this category
      const accessCheck = await checkServerPurchaseAccess(categoryId, 'category', categoryId);
      const hasAccess = accessCheck.hasAccess;
      const isExpired = accessCheck.isExpired;

      let buttonLabel, navigateAction;
      if (hasAccess && !isExpired) {
        // User has purchased - show "View Exams"
        buttonLabel = 'View Exams';
        navigateAction = () => {
          window.location.href = `category.html?cat=${encodeURIComponent(categoryId)}`;
        };
      } else {
        // User hasn't purchased - show "Buy Now"
        buttonLabel = 'Buy Now';
        navigateAction = () => {
          const params = new URLSearchParams();
          params.set('type', 'category');
          params.set('id', categoryId);
          window.location.href = `buy-course-details.html?${params.toString()}`;
        };
      }

      const card = createCard({
        title: category.name || 'Untitled Category',
        description: category.description || '',
        details,
        onCardClick: navigateAction,
        button: { onClick: navigateAction, label: buttonLabel },
        type: 'category',
        hasDiscount: category.hasDiscount || false,
        discountPercent: category.discountPercent || 0,
        discountCode: category.discountCode || '',
        discountMessage: category.discountMessage || ''
      });
      testSeriesCategoryContainer.appendChild(card);
    }

    return uniqueCategories;
  };

  const loadTestSeriesExams = async () => {
    if (!testSeriesExamsContainer) return;

    const exams = [];

    try {
      const res = await fetch('/api/exams');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.exams)) {
          data.exams.forEach(exam => {
            exams.push({
              id: exam.id || exam._id,
              name: exam.name,
              description: exam.description || '',
              courseCost: exam.courseCost,
              courseValidity: exam.courseValidity,
              courseDetails: exam.courseDetails,
              categoryId: exam.categoryId,
              hasDiscount: exam.hasDiscount || false,
              discountPercent: exam.discountPercent || 0,
              discountCode: exam.discountCode || '',
              discountMessage: exam.discountMessage || ''
            });
          });
        }
      }
    } catch (err) {
      console.warn('Unable to load exams from API:', err);
    }

    if (exams.length === 0) {
      try {
        const keys = Object.keys(localStorage || {}).filter(key => key.startsWith('examData_'));
        keys.forEach(key => {
          try {
            const storedExams = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(storedExams)) {
              storedExams.forEach(exam => exams.push({
                id: exam.id,
                name: exam.name,
                description: exam.description || '',
                courseCost: exam.courseCost,
                courseValidity: exam.courseValidity,
                courseDetails: exam.courseDetails,
                categoryId: exam.categoryId,
                hasDiscount: exam.hasDiscount || false,
                discountPercent: exam.discountPercent || 0,
                discountCode: exam.discountCode || '',
                discountMessage: exam.discountMessage || ''
              }));
            }
          } catch (parseErr) {
            console.warn('Unable to parse stored exams:', parseErr);
          }
        });
      } catch (storageErr) {
        console.warn('Unable to read exams from localStorage:', storageErr);
      }
    }

    const uniqueExams = uniqueById(exams);

    if (uniqueExams.length === 0) {
      renderEmptyState(testSeriesExamsContainer, 'No exams available yet.');
      return;
    }

    testSeriesExamsContainer.innerHTML = '';
    
    // Check purchase status for all exams
    for (const exam of uniqueExams) {
      const examId = getEntityId(exam);
      if (!examId) continue;

      const details = [
        { label: 'Price', value: exam.courseCost },
        { label: 'Validity', value: exam.courseValidity }
      ];

      // Check if user has purchased this exam
      const accessCheck = await checkServerPurchaseAccess(examId, 'exam', exam.categoryId || null);
      const hasAccess = accessCheck.hasAccess;
      const isExpired = accessCheck.isExpired;

      let buttonLabel, navigateAction;
      if (hasAccess && !isExpired) {
        // User has purchased - show "View Tests"
        buttonLabel = 'View Tests';
        navigateAction = () => {
          const categoryId = exam.categoryId || '';
          window.location.href = `exam.html?cat=${categoryId}&exam=${examId}`;
        };
      } else {
        // User hasn't purchased - show "Buy Now"
        buttonLabel = 'Buy Now';
        navigateAction = () => {
          const params = new URLSearchParams();
          params.set('type', 'exam');
          params.set('id', examId);
          if (exam.categoryId) params.set('categoryId', exam.categoryId);
          window.location.href = `buy-course-details.html?${params.toString()}`;
        };
      }

      const card = createCard({
        title: exam.name || 'Untitled Exam',
        description: exam.description || '',
        details,
        onCardClick: navigateAction,
        button: { onClick: navigateAction, label: buttonLabel },
        type: 'exam',
        hasDiscount: exam.hasDiscount || false,
        discountPercent: exam.discountPercent || 0,
        discountCode: exam.discountCode || '',
        discountMessage: exam.discountMessage || ''
      });
      testSeriesExamsContainer.appendChild(card);
    }
  };

  const loadCourseCategories = async () => {
    try {
      const res = await fetch('/api/admin/course-categories');
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        return data.categories;
      }
      return [];
    } catch (err) {
      console.warn('Error loading course categories:', err);
      return [];
    }
  };

  const loadIndividualCourses = async (categories) => {
    if (!courseIndividualContainer) return;

    const allCourses = [];

    if (Array.isArray(categories) && categories.length > 0) {
      for (const category of categories) {
        const categoryId = category && category.id;
        if (!categoryId) continue;
        try {
          const res = await fetch(`/api/admin/courses/${categoryId}`);
          if (!res.ok) continue;
          const data = await res.json();
          if (data.success && Array.isArray(data.courses)) {
            data.courses.forEach(course => {
              const descriptionParts = [];
              if (course.description) descriptionParts.push(course.description);
              if (course.courseDetails) descriptionParts.push(course.courseDetails);
              if (category.name) descriptionParts.push(`Category: ${category.name}`);

              allCourses.push({
                id: course.id || course._id,
                name: course.name,
                description: descriptionParts.join(' • '),
                courseCost: course.courseCost,
                courseValidity: course.courseValidity,
                courseDetails: course.courseDetails,
                categoryId,
                categoryName: category.name,
                hasDiscount: course.hasDiscount || false,
                discountPercent: course.discountPercent || 0,
                discountCode: course.discountCode || '',
                discountMessage: course.discountMessage || ''
              });
            });
          }
        } catch (err) {
          console.warn(`Unable to load courses for category ${categoryId}:`, err);
        }
      }
    }

    if (allCourses.length === 0) {
      renderEmptyState(courseIndividualContainer, 'No individual courses available yet.');
      return;
    }

    const uniqueCourses = uniqueById(allCourses);
    courseIndividualContainer.innerHTML = '';
    
    // Check purchase status for all courses
    for (const course of uniqueCourses) {
      const courseId = getEntityId(course);
      if (!courseId) continue;

      const details = [
        { label: 'Price', value: course.courseCost },
        { label: 'Validity', value: course.courseValidity }
      ];

      // Check if user has purchased this course
      const accessCheck = await checkServerPurchaseAccess(courseId, 'course', course.categoryId || null);
      const hasAccess = accessCheck.hasAccess;
      const isExpired = accessCheck.isExpired;

      let buttonLabel, navigateAction;
      if (hasAccess && !isExpired) {
        // User has purchased - show "View Course"
        buttonLabel = 'View Course';
        navigateAction = () => {
          window.location.href = `courses-lessons.html?catId=${encodeURIComponent(course.categoryId || '')}&courseId=${encodeURIComponent(courseId)}`;
        };
      } else {
        // User hasn't purchased - show "Buy Now"
        buttonLabel = 'Buy Now';
        navigateAction = () => {
          const params = new URLSearchParams();
          params.set('type', 'course');
          params.set('id', courseId);
          if (course.categoryId) params.set('categoryId', course.categoryId);
          window.location.href = `buy-course-details.html?${params.toString()}`;
        };
      }

      const card = createCard({
        title: course.name || 'Untitled Course',
        description: course.description || '',
        details,
        onCardClick: navigateAction,
        button: { onClick: navigateAction, label: buttonLabel },
        type: 'course',
        hasDiscount: course.hasDiscount || false,
        discountPercent: course.discountPercent || 0,
        discountCode: course.discountCode || '',
        discountMessage: course.discountMessage || ''
      });
      courseIndividualContainer.appendChild(card);
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    await loadTestSeriesCategories();
    const courseCategories = await loadCourseCategories();

    await Promise.all([
      loadTestSeriesExams(),
      loadIndividualCourses(courseCategories)
    ]);
  });
})();

