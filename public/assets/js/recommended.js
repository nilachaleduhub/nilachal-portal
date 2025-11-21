// recommended.js - Handles recommended tests and courses display on homepage

// Load expiry utils first
const expiryScript = document.createElement('script');
expiryScript.src = 'assets/js/expiry-utils.js';
document.head.appendChild(expiryScript);

const PURCHASE_CACHE_KEY = 'dashboardPurchaseCache';

function mapPurchasesForCache(purchases = []) {
  const normalized = { courses: [], tests: [] };
  purchases.filter(Boolean).forEach(purchase => {
    const base = {
      id: purchase.purchaseId,
      name: purchase.purchaseName || '',
      purchaseType: purchase.purchaseType,
      categoryId: purchase.categoryId || null,
      courseValidity: purchase.courseValidity || null,
      purchasedAt: purchase.purchasedAt ? (typeof purchase.purchasedAt === 'string' ? purchase.purchasedAt : new Date(purchase.purchasedAt).toISOString()) : null,
      expiresAt: purchase.expiresAt ? (typeof purchase.expiresAt === 'string' ? purchase.expiresAt : new Date(purchase.expiresAt).toISOString()) : null,
      status: purchase.status || 'completed'
    };
    if (purchase.purchaseType === 'test') {
      normalized.tests.push(base);
    } else {
      normalized.courses.push(base);
    }
  });
  return normalized;
}

async function ensurePurchaseCacheLoaded() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return;
  let user = null;
  try {
    user = JSON.parse(userStr);
  } catch (err) {
    console.warn('Unable to parse user object for recommendations', err);
    return;
  }
  const userId = user && (user.id || user._id || user.userId || user.email);
  if (!userId) return;

  window.__purchaseCachePromises = window.__purchaseCachePromises || {};
  window.__purchaseCache = window.__purchaseCache || {};

  if (window.__purchaseCache[userId]) return;
  if (window.__purchaseCachePromises[userId]) {
    await window.__purchaseCachePromises[userId];
    return;
  }

  window.__purchaseCachePromises[userId] = (async () => {
    try {
      const res = await fetch(`/api/purchases?userId=${encodeURIComponent(userId)}&includeExpired=true`, {
        headers: { 'Cache-Control': 'no-store' }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.purchases)) {
        const normalized = mapPurchasesForCache(data.purchases);
        if (typeof window.__setCachedPurchasesForUser === 'function') {
          window.__setCachedPurchasesForUser(userId, normalized);
        } else {
          window.__purchaseCache[userId] = normalized;
          try {
            const cache = JSON.parse(localStorage.getItem(PURCHASE_CACHE_KEY) || '{}');
            cache[userId] = normalized;
            localStorage.setItem(PURCHASE_CACHE_KEY, JSON.stringify(cache));
          } catch (err) {
            console.warn('Unable to persist purchase cache fallback', err);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to preload purchases for recommendations', err);
    } finally {
      delete window.__purchaseCachePromises[userId];
    }
  })();

  try {
    await window.__purchaseCachePromises[userId];
  } catch (err) {
    console.warn('Purchase cache preload promise rejected', err);
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

  await ensurePurchaseCacheLoaded();
  loadRecommendedTests();
});

async function loadRecommendedTests() {
  const container = document.getElementById('recommended-tests-grid');
  if (!container) return;

  try {
    await ensurePurchaseCacheLoaded();
    const allRecommendations = [];
    
    // 1. Fetch categories (which contain test series) - use public API
    let res = await fetch('/api/categories');
    let data = await res.json();
    
    // Fallback to admin API if public API fails
    if (!data.success || !Array.isArray(data.categories) || data.categories.length === 0) {
      try {
        res = await fetch('/api/admin/categories');
        data = await res.json();
      } catch (err) {
        console.warn('Admin API also failed, trying localStorage');
      }
    }
    
    // Final fallback: try localStorage
    if (!data.success || !Array.isArray(data.categories) || data.categories.length === 0) {
      try {
        const adminCategories = JSON.parse(localStorage.getItem('adminCategories') || '[]');
        if (Array.isArray(adminCategories) && adminCategories.length > 0) {
          data = { success: true, categories: adminCategories };
        }
      } catch (err) {
        console.warn('localStorage fallback failed');
      }
    }
    
    // Add categories to recommendations
    if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
      data.categories.slice(0, 3).forEach(category => {
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
    
    // 2. Fetch individual exams - use public API
    try {
      let examsRes = await fetch('/api/exams');
      let examsData = await examsRes.json();
      
      // Fallback to admin API if public API fails
      if (!examsData.success || !Array.isArray(examsData.exams) || examsData.exams.length === 0) {
        // Try to get exams from categories we already have
        if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
          const categoryIds = data.categories.map(cat => cat.id || cat._id).filter(Boolean);
          const examPromises = categoryIds.slice(0, 3).map(catId => 
            fetch(`/api/admin/exams/${catId}`).then(res => res.json()).catch(() => ({ success: false, exams: [] }))
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
      
      // Add exams to recommendations
      if (examsData.success && Array.isArray(examsData.exams) && examsData.exams.length > 0) {
        // Take first 3 exams
        examsData.exams.slice(0, 3).forEach(exam => {
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
      
      recommended.forEach(item => {
        const card = createRecommendationCard(item);
        container.appendChild(card);
      });
      
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
    await ensurePurchaseCacheLoaded();
    // Try to fetch course categories - use public API if available, fallback to admin
    let catRes;
    let catData;
    
    try {
      catRes = await fetch('/api/course-categories');
      catData = await catRes.json();
    } catch (err) {
      // Fallback to admin API
      try {
        catRes = await fetch('/api/admin/course-categories');
        catData = await catRes.json();
      } catch (adminErr) {
        console.warn('Both course category APIs failed');
        catData = { success: false };
      }
    }
    
    if (catData.success && Array.isArray(catData.categories) && catData.categories.length > 0) {
      // Get courses from first few categories
      const categories = catData.categories.slice(0, 3);
      const allCourses = [];
      
      for (const category of categories) {
        try {
          let courseRes;
          let courseData;
          
          try {
            courseRes = await fetch(`/api/admin/courses/${encodeURIComponent(category.id)}`);
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
            courseData.courses.slice(0, 2).forEach(course => {
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
        
        recommended.forEach(course => {
          const card = createRecommendationCard({
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
        });
        
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

function createRecommendationCard(item) {
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
  
  // Check if user has purchased and if it's expired
  const accessCheck = typeof checkPurchaseAccess !== 'undefined' ? checkPurchaseAccess(item.id, item.type, item.categoryId || null) : { hasAccess: false, isExpired: false };
  const hasAccess = accessCheck.hasAccess;
  const isExpired = accessCheck.isExpired;
  
  let buttonText, buttonLink;
  if (hasAccess && !isExpired) {
    if (item.type === 'category') {
      buttonText = 'View Tests';
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

