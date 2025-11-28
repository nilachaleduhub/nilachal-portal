// recommended.js - Handles recommended tests and courses display on homepage

// Load expiry utils first
const expiryScript = document.createElement('script');
expiryScript.src = 'assets/js/expiry-utils.js';
document.head.appendChild(expiryScript);

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
      // Calculate expiry from validity string (use expiry-utils if available)
      if (typeof calculateExpiryDate === 'function') {
        const expiryDate = calculateExpiryDate(purchase.courseValidity, purchase.purchasedAt);
        if (expiryDate) {
          isExpired = expiryDate < new Date();
        }
      } else {
        // Fallback: simple expiry check
        const purchaseDate = new Date(purchase.purchasedAt);
        if (!isNaN(purchaseDate.getTime())) {
          // Try to parse validity string
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
    }

    return { hasAccess: !isExpired, isExpired };
  } catch (err) {
    console.warn('Error checking server purchase access:', err);
    return { hasAccess: false, isExpired: false };
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // Update active states
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`recommended-${targetTab}`).classList.add('active');
      
      // Load content if not already loaded
      if (targetTab === 'tests' && !window.testsLoaded) {
        loadRecommendedTests();
      } else if (targetTab === 'courses' && !window.coursesLoaded) {
        loadRecommendedCourses();
      }
    });
  });

  // Load recommended tests on page load
  loadRecommendedTests();
});

async function loadRecommendedTests() {
  const container = document.getElementById('recommended-tests-grid');
  if (!container) return;

  try {
    const allRecommendations = [];
    
    // 1. Fetch categories (which contain test series) - use public API with cache-busting
    let res = await fetch('/api/categories?' + new Date().getTime(), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    let data = await res.json();
    
    // Fallback to admin API if public API fails
    if (!data.success || !Array.isArray(data.categories) || data.categories.length === 0) {
      try {
        res = await fetch('/api/admin/categories?' + new Date().getTime(), {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        data = await res.json();
      } catch (err) {
        console.warn('Admin API also failed:', err);
      }
    }
    
    // Add categories to recommendations (show newest first)
    if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
      // Reverse to show newest items first, then take first 3
      const sortedCategories = [...data.categories].reverse();
      sortedCategories.slice(0, 3).forEach(category => {
        allRecommendations.push({
          id: category.id || category._id,
          name: category.name,
          description: category.description || '',
          type: 'category',
          cost: category.courseCost || '',
          validity: category.courseValidity || '',
          link: `category.html?cat=${encodeURIComponent(category.id || category._id)}`,
          categoryId: category.id || category._id,
          hasDiscount: category.hasDiscount || false,
          discountPercent: category.discountPercent || 0,
          discountCode: category.discountCode || '',
          discountMessage: category.discountMessage || ''
        });
      });
    }
    
    // 2. Fetch individual exams - use public API with cache-busting
    try {
      let examsRes = await fetch('/api/exams?' + new Date().getTime(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      let examsData = await examsRes.json();
      
      // Fallback to admin API if public API fails
      if (!examsData.success || !Array.isArray(examsData.exams) || examsData.exams.length === 0) {
        // Try to get exams from categories we already have
        if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
          const categoryIds = data.categories.map(cat => cat.id || cat._id).filter(Boolean);
          const examPromises = categoryIds.slice(0, 3).map(catId => 
            fetch(`/api/admin/exams/${catId}?` + new Date().getTime(), {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            }).then(res => res.json()).catch(() => ({ success: false, exams: [] }))
          );
          const examResults = await Promise.all(examPromises);
          const allExams = examResults
            .filter(result => result.success && Array.isArray(result.exams))
            .flatMap(result => result.exams);
          
          if (allExams.length > 0) {
            examsData = { success: true, exams: allExams };
          }
        }
      }
      
      // Add exams to recommendations (show newest first)
      if (examsData.success && Array.isArray(examsData.exams) && examsData.exams.length > 0) {
        // Reverse to show newest items first, then take first 3
        const sortedExams = [...examsData.exams].reverse();
        sortedExams.slice(0, 3).forEach(exam => {
          allRecommendations.push({
            id: exam.id || exam._id,
            name: exam.name,
            description: exam.description || '',
            type: 'exam',
            cost: exam.courseCost || '',
            validity: exam.courseValidity || '',
            link: `exam.html?cat=${encodeURIComponent(exam.categoryId || '')}&exam=${encodeURIComponent(exam.id || exam._id)}`,
            categoryId: exam.categoryId || null,
            hasDiscount: exam.hasDiscount || false,
            discountPercent: exam.discountPercent || 0,
            discountCode: exam.discountCode || '',
            discountMessage: exam.discountMessage || ''
          });
        });
      }
    } catch (err) {
      console.warn('Error loading exams for recommendations:', err);
    }
    
    // Display recommendations (mix of categories and exams, up to 6 total)
    if (allRecommendations.length > 0) {
      const recommended = allRecommendations.slice(0, 6);
      container.innerHTML = '';
      
      // Create cards asynchronously to check server purchases
      for (const item of recommended) {
        const card = await createRecommendationCard(item);
        container.appendChild(card);
      }
      
      window.testsLoaded = true;
    } else {
      container.innerHTML = '<div class="empty-state">No recommended tests available at the moment.</div>';
    }
  } catch (err) {
    console.error('Error loading recommended tests:', err);
    container.innerHTML = '<div class="empty-state">Unable to load recommended tests. Please try again later.</div>';
  }
}

async function loadRecommendedCourses() {
  const container = document.getElementById('recommended-courses-grid');
  if (!container) return;

  try {
    // Try to fetch course categories - use public API if available, fallback to admin
    let catRes;
    let catData;
    
    try {
      catRes = await fetch('/api/course-categories?' + new Date().getTime(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      catData = await catRes.json();
    } catch (err) {
      // Fallback to admin API
      try {
        catRes = await fetch('/api/admin/course-categories?' + new Date().getTime(), {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        catData = await catRes.json();
      } catch (adminErr) {
        console.warn('Both course category APIs failed');
        catData = { success: false };
      }
    }
    
    if (catData.success && Array.isArray(catData.categories) && catData.categories.length > 0) {
      // Get courses from newest categories first
      const sortedCategories = [...catData.categories].reverse();
      const categories = sortedCategories.slice(0, 3);
      const allCourses = [];
      
      for (const category of categories) {
        try {
          let courseRes;
          let courseData;
          
          try {
            courseRes = await fetch(`/api/admin/courses/${encodeURIComponent(category.id)}?` + new Date().getTime(), {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });
            if (!courseRes.ok) {
              console.warn(`Admin courses API returned ${courseRes.status} for category ${category.id}`);
              continue;
            }
            courseData = await courseRes.json();
          } catch (adminErr) {
            console.warn(`Error loading courses for category ${category.id}:`, adminErr);
            continue;
          }
          
          if (courseData.success && Array.isArray(courseData.courses)) {
            // Show newest courses first
            const sortedCourses = [...courseData.courses].reverse();
            sortedCourses.slice(0, 2).forEach(course => {
              allCourses.push({
                ...course,
                categoryId: category.id,
                categoryName: category.name
              });
            });
          }
        } catch (err) {
          console.warn(`Error loading courses for category ${category.id}:`, err);
        }
      }
      
      if (allCourses.length > 0) {
        // Take first 6 courses
        const recommended = allCourses.slice(0, 6);
        container.innerHTML = '';
        
        // Create cards asynchronously to check server purchases
        for (const course of recommended) {
          const card = await createRecommendationCard({
            id: course.id || course._id,
            name: course.name,
            description: course.description || '',
            type: 'course',
            cost: course.courseCost || '',
            validity: course.courseValidity || '',
            link: `courses-lessons.html?catId=${encodeURIComponent(course.categoryId)}&courseId=${encodeURIComponent(course.id || course._id)}`,
            categoryId: course.categoryId,
            hasDiscount: course.hasDiscount || false,
            discountPercent: course.discountPercent || 0,
            discountCode: course.discountCode || '',
            discountMessage: course.discountMessage || ''
          });
          container.appendChild(card);
        }
        
        window.coursesLoaded = true;
      } else {
        container.innerHTML = '<div class="empty-state">No recommended courses available at the moment.</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state">No recommended courses available at the moment.</div>';
    }
  } catch (err) {
    console.error('Error loading recommended courses:', err);
    container.innerHTML = '<div class="empty-state">Unable to load recommended courses. Please try again later.</div>';
  }
}

async function createRecommendationCard(item) {
  const card = document.createElement('div');
  card.className = 'recommended-card';
  
  let badge, icon;
  if (item.type === 'category') {
    badge = 'Mock Test Series';
    icon = '🎯';
  } else if (item.type === 'exam') {
    badge = 'Exam';
    icon = '📝';
  } else {
    badge = 'Course';
    icon = '📚';
  }
  
  // Check if user has purchased from server (not localStorage)
  const accessCheck = await checkServerPurchaseAccess(item.id, item.type, item.categoryId || null);
  const hasAccess = accessCheck.hasAccess;
  const isExpired = accessCheck.isExpired;
  
  let buttonText, buttonLink;
  if (hasAccess && !isExpired) {
    if (item.type === 'category') {
      buttonText = 'View Exams';
      buttonLink = item.link;
    } else if (item.type === 'exam') {
      buttonText = 'View Tests';
      buttonLink = item.link;
    } else {
      buttonText = 'View Course';
      buttonLink = item.link;
    }
  } else {
    buttonText = 'Buy Now';
    buttonLink = `buy-course-details.html?type=${item.type}&id=${item.id}${item.categoryId ? `&categoryId=${item.categoryId}` : ''}`;
  }
  
  // Build discount message if available
  let discountInfo = '';
  if (item.hasDiscount && item.discountPercent > 0 && item.discountCode) {
    const discountText = item.discountMessage || `Get ${item.discountPercent}% discount using code ${item.discountCode}`;
    discountInfo = `<div class="recommended-discount" style="margin-top: 0.5rem; padding: 0.5rem; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 6px; border-left: 3px solid #f59e0b; font-size: 0.85rem; color: #92400e; font-weight: 600;">
      🎉 ${discountText}
    </div>`;
  }
  
  card.innerHTML = `
    <div class="recommended-card-badge">${icon} ${badge}</div>
    <h3 class="recommended-card-title">${item.name}</h3>
    <p class="recommended-card-desc">${item.description || 'Explore this content to enhance your preparation.'}</p>
    <div class="recommended-card-details">
      ${item.cost ? `<span class="recommended-detail"><strong>Price:</strong> ${item.cost}</span>` : ''}
      ${item.validity ? `<span class="recommended-detail"><strong>Validity:</strong> ${item.validity}</span>` : ''}
    </div>
    ${discountInfo}
    <a href="${buttonLink}" class="recommended-card-btn">
      ${buttonText}
      <span class="arrow">→</span>
    </a>
  `;
  
  return card;
}

