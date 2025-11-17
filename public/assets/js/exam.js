// Utility to get query parameter
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

const categoryId = getQueryParam('cat');
const examContainer = document.getElementById("exam-container");
const categoryTitle = document.getElementById("category-title");

// Map category id to title (for display)
const categoryNames = {
  "banking": "Banking Exams",
  "state": "State Government Exams",
  "ssc": "SSC & Railways"
};

categoryTitle.textContent = categoryNames[categoryId] || "Exams";

// Load exam list
async function loadExams() {
  try {
    // Load from file first
    const res = await fetch(`assets/data/exams-${categoryId}.json`);
    const fileExams = await res.json();
    
    // Load admin-created exams from localStorage
    const adminExamData = localStorage.getItem(`examData_${categoryId}`);
    let adminExams = [];
    if (adminExamData) {
      adminExams = JSON.parse(adminExamData);
    }
    
    // Also load from API
    try {
      const apiRes = await fetch('/api/exams');
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData.success && Array.isArray(apiData.exams)) {
          const categoryExams = apiData.exams.filter(e => e.categoryId === categoryId);
          adminExams = [...adminExams, ...categoryExams];
        }
      }
    } catch (err) {
      console.warn('Error loading exams from API:', err);
    }
    
    // Combine file exams and admin exams
    const allExams = [...fileExams, ...adminExams];
    
    // Remove duplicates based on exam ID
    const uniqueExams = allExams.filter((exam, index, self) => 
      index === self.findIndex(e => e.id === exam.id)
    );

    // Check if we're in the mock tests page flow (from test-series.html)
    const isFromMockTests = document.referrer.includes('test-series.html') || 
                            sessionStorage.getItem('fromMockTests') === 'true';
    
    uniqueExams.forEach(exam => {
      const card = document.createElement("div");
      card.className = "card";
      
      // On mock tests page flow, always show "View Tests" for exams
      if (isFromMockTests) {
        card.innerHTML = `
  <h3>${exam.name}</h3>
  <p>${exam.description || ''}</p>
  <a href="exam.html?cat=${categoryId}&exam=${exam.id}">View Tests</a>
`;
      } else {
        // Check if user has ever purchased (but allow viewing even if expired)
        const accessCheck = typeof checkPurchaseAccess !== 'undefined' ? checkPurchaseAccess(exam.id, 'exam', categoryId) : { hasAccess: false, isExpired: false };
        const hasAccess = accessCheck.hasAccess;
        
        // Always allow viewing categories/exams (even if expired) so users can see what's inside
        // Only show Buy Now if user never purchased
        if (hasAccess) {
          // User has purchased (even if expired), allow viewing
          card.innerHTML = `
  <h3>${exam.name}</h3>
  <p>${exam.description || ''}</p>
  <a href="exam.html?cat=${categoryId}&exam=${exam.id}">View Tests</a>
`;
        } else {
          // User never purchased, show Buy Now
          card.innerHTML = `
  <h3>${exam.name}</h3>
  <p>${exam.description || ''}</p>
  <button class="buy-btn" style="background-color: #00bfff; color: white; padding: 0.6rem 1rem; border-radius: 5px; font-weight: bold; border: none; cursor: pointer; width: 100%;">Buy Now</button>
`;
          const buyBtn = card.querySelector('button');
          buyBtn.addEventListener('click', () => {
            window.location.href = `buy-course-details.html?type=exam&id=${exam.id}&categoryId=${categoryId}`;
          });
        }
      }
      
      examContainer.appendChild(card);
    });
  } catch (err) {
    // If file doesn't exist, try to load only admin exams
    const adminExamData = localStorage.getItem(`examData_${categoryId}`);
    if (adminExamData) {
      const adminExams = JSON.parse(adminExamData);
      adminExams.forEach(exam => {
        const card = document.createElement("div");
        card.className = "card";
        
        // Check if we're in the mock tests page flow
        const isFromMockTests = document.referrer.includes('test-series.html') || 
                                sessionStorage.getItem('fromMockTests') === 'true';
        
        // On mock tests page flow, always show "View Tests" for exams
        if (isFromMockTests) {
          card.innerHTML = `
  <h3>${exam.name}</h3>
  <p>${exam.description || ''}</p>
  <a href="exam.html?cat=${categoryId}&exam=${exam.id}">View Tests</a>
`;
        } else {
          // Check if user has ever purchased (but allow viewing even if expired)
          const accessCheck = typeof checkPurchaseAccess !== 'undefined' ? checkPurchaseAccess(exam.id, 'exam', categoryId) : { hasAccess: false, isExpired: false };
          const hasAccess = accessCheck.hasAccess;
          
          // Always allow viewing categories/exams (even if expired) so users can see what's inside
          // Only show Buy Now if user never purchased
          if (hasAccess) {
            // User has purchased (even if expired), allow viewing
            card.innerHTML = `
  <h3>${exam.name}</h3>
  <p>${exam.description || ''}</p>
  <a href="exam.html?cat=${categoryId}&exam=${exam.id}">View Tests</a>
`;
          } else {
            // User never purchased, show Buy Now
            card.innerHTML = `
  <h3>${exam.name}</h3>
  <p>${exam.description || ''}</p>
  <button class="buy-btn" style="background-color: #00bfff; color: white; padding: 0.6rem 1rem; border-radius: 5px; font-weight: bold; border: none; cursor: pointer; width: 100%;">Buy Now</button>
`;
            const buyBtn = card.querySelector('button');
            buyBtn.addEventListener('click', () => {
              window.location.href = `buy-course-details.html?type=exam&id=${exam.id}&categoryId=${categoryId}`;
            });
          }
        }
        
        examContainer.appendChild(card);
      });
    } else {
      examContainer.innerHTML = `<p style="color:red;">Exams not found for category "${categoryId}".</p>`;
    }
  }
}

// Load expiry utils first, then load exams
const expiryScript = document.createElement('script');
expiryScript.src = 'assets/js/expiry-utils.js';
document.head.appendChild(expiryScript);

expiryScript.onload = () => {
  loadExams();
};

// Fallback if script already loaded
if (typeof checkPurchaseAccess !== 'undefined') {
  loadExams();
}
