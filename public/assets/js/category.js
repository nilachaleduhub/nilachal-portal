async function loadCategories() {
    const container = document.getElementById("category-container");
    if (!container) return;
    
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
          const fileCategories = await res.json();
          if (Array.isArray(fileCategories)) {
            categories = fileCategories;
          }
        }
      } catch (err) {
        console.warn('Unable to load categories from file:', err);
      }
    }
    
    // Last fallback: localStorage (for backward compatibility)
    if (categories.length === 0) {
      try {
        const adminCategories = JSON.parse(localStorage.getItem('adminCategories') || '[]');
        const mainCategories = JSON.parse(localStorage.getItem('mainCategories') || '[]');
        categories = [...adminCategories, ...mainCategories];
      } catch (err) {
        console.warn('Unable to read categories from localStorage:', err);
      }
    }
    
    // Remove duplicates based on category ID
    const uniqueCategories = categories.filter((category, index, self) => 
      category && category.id && index === self.findIndex(c => c && c.id === category.id)
    );
    
    if (uniqueCategories.length === 0) {
      container.innerHTML = '<p class="empty-state">No categories available yet.</p>';
      return;
    }
    
    container.innerHTML = '';
    
    // Check if we're on test-series.html page (mock tests page)
    const isTestSeriesPage = window.location.pathname.includes('test-series.html');
    
    uniqueCategories.forEach(category => {
      const card = document.createElement("div");
      card.className = "card";
      
      // On test-series page, always show "View Exams" (no Buy Now for categories)
      if (isTestSeriesPage) {
        // Set flag in sessionStorage to indicate we're coming from mock tests page
        sessionStorage.setItem('fromMockTests', 'true');
        card.innerHTML = `
          <h3>${category.name || 'Untitled Category'}</h3>
          <p>${category.description || ''}</p>
          <a href="category.html?cat=${category.id}">View Exams</a>
        `;
      } else {
        // On other pages, check if user has ever purchased (but allow viewing even if expired)
        const accessCheck = typeof checkPurchaseAccess !== 'undefined' ? checkPurchaseAccess(category.id, 'category', category.id) : { hasAccess: false, isExpired: false };
        const hasAccess = accessCheck.hasAccess;
        
        // Always allow viewing categories/exams (even if expired) so users can see what's inside
        // Only show Buy Now if user never purchased
        if (hasAccess) {
          // User has purchased (even if expired), allow viewing
          card.innerHTML = `
            <h3>${category.name || 'Untitled Category'}</h3>
            <p>${category.description || ''}</p>
            <a href="category.html?cat=${category.id}">View Exams</a>
          `;
        } else {
          // User never purchased, show Buy Now
          card.innerHTML = `
            <h3>${category.name || 'Untitled Category'}</h3>
            <p>${category.description || ''}</p>
            <button class="buy-btn" style="background-color: #00bfff; color: white; padding: 0.6rem 1rem; border-radius: 5px; font-weight: bold; border: none; cursor: pointer; width: 100%;">Buy Now</button>
          `;
          const buyBtn = card.querySelector('button');
          buyBtn.addEventListener('click', () => {
            window.location.href = `buy-course-details.html?type=category&id=${category.id}`;
          });
        }
      }
      
      container.appendChild(card);
    });
  }

async function loadExams() {
    const container = document.getElementById("exam-container");
    if (!container) return;
    
    const exams = [];
    
    // Primary source: Load from database API (admin panel mock management)
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
              categoryId: exam.categoryId
            });
          });
        }
      }
    } catch (err) {
      console.warn('Unable to load exams from API:', err);
    }
    
    // Fallback: Load from localStorage (for backward compatibility)
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
                categoryId: exam.categoryId
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
    
    // Remove duplicates
    const uniqueExams = exams.filter((exam, index, self) => 
      exam && exam.id && index === self.findIndex(e => e && e.id === exam.id)
    );
    
    if (uniqueExams.length === 0) {
      container.innerHTML = '<p class="empty-state">No exams available yet.</p>';
      return;
    }
    
    container.innerHTML = '';
    
    // Check if we're on test-series.html page (mock tests page)
    const isTestSeriesPage = window.location.pathname.includes('test-series.html');
    
    uniqueExams.forEach(exam => {
      const card = document.createElement("div");
      card.className = "card";
      const categoryId = exam.categoryId || '';
      
      // On test-series page, always show "View Tests" (no Buy Now for exams)
      if (isTestSeriesPage) {
        card.innerHTML = `
          <h3>${exam.name || 'Untitled Exam'}</h3>
          <p>${exam.description || ''}</p>
          <a href="exam.html?cat=${categoryId}&exam=${exam.id}">View Tests</a>
        `;
      } else {
        // On other pages, check if user has ever purchased (but allow viewing even if expired)
        const accessCheck = typeof checkPurchaseAccess !== 'undefined' ? checkPurchaseAccess(exam.id, 'exam', categoryId) : { hasAccess: false, isExpired: false };
        const hasAccess = accessCheck.hasAccess;
        
        // Always allow viewing categories/exams (even if expired) so users can see what's inside
        // Only show Buy Now if user never purchased
        if (hasAccess) {
          // User has purchased (even if expired), allow viewing
          card.innerHTML = `
            <h3>${exam.name || 'Untitled Exam'}</h3>
            <p>${exam.description || ''}</p>
            <a href="exam.html?cat=${categoryId}&exam=${exam.id}">View Tests</a>
          `;
        } else {
          // User never purchased, show Buy Now
          card.innerHTML = `
            <h3>${exam.name || 'Untitled Exam'}</h3>
            <p>${exam.description || ''}</p>
            <button class="buy-btn" style="background-color: #00bfff; color: white; padding: 0.6rem 1rem; border-radius: 5px; font-weight: bold; border: none; cursor: pointer; width: 100%;">Buy Now</button>
          `;
          const buyBtn = card.querySelector('button');
          buyBtn.addEventListener('click', () => {
            window.location.href = `buy-course-details.html?type=exam&id=${exam.id}&categoryId=${categoryId}`;
          });
        }
      }
      
      container.appendChild(card);
    });
  }
  
  // Load expiry utils first, then load data
  const expiryScript = document.createElement('script');
  expiryScript.src = 'assets/js/expiry-utils.js';
  document.head.appendChild(expiryScript);

  expiryScript.onload = async () => {
    await loadCategories();
    await loadExams();
  };

  // Fallback if script already loaded
  if (typeof checkPurchaseAccess !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
      await loadCategories();
      await loadExams();
    });
  } else {
    document.addEventListener('DOMContentLoaded', async () => {
      await loadCategories();
      await loadExams();
    });
  }
  