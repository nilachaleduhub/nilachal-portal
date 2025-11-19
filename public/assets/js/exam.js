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
  const collectedExams = [];

  // 1. Attempt to load legacy static file (old workflow)
  try {
    const res = await fetch(`assets/data/exams-${categoryId}.json`);
    if (res.ok) {
      const fileExams = await res.json();
      if (Array.isArray(fileExams)) {
        collectedExams.push(...fileExams);
      }
    }
  } catch (err) {
    console.warn('Unable to load legacy exams file:', err);
  }

  // 2. Load admin-created exams from localStorage (backward compatibility)
  try {
    const adminExamData = localStorage.getItem(`examData_${categoryId}`);
    if (adminExamData) {
      const parsed = JSON.parse(adminExamData);
      if (Array.isArray(parsed)) {
        collectedExams.push(...parsed);
      }
    }
  } catch (storageErr) {
    console.warn('Unable to read exams from localStorage:', storageErr);
  }

  // 3. Always call the API so new categories/exams load reliably
  try {
    const apiRes = await fetch('/api/exams');
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (apiData.success && Array.isArray(apiData.exams)) {
        apiData.exams
          .filter(exam => exam && exam.categoryId === categoryId)
          .forEach(exam => {
            collectedExams.push({
              id: exam.id || exam._id,
              name: exam.name,
              description: exam.description || '',
              categoryId: exam.categoryId
            });
          });
      }
    } else {
      console.warn('Failed to load exams from API:', apiRes.status);
    }
  } catch (err) {
    console.warn('Error loading exams from API:', err);
  }

  // Remove duplicates based on exam ID
  const uniqueExams = collectedExams.filter((exam, index, self) =>
    exam && exam.id && index === self.findIndex(e => e && e.id === exam.id)
  );

  if (uniqueExams.length === 0) {
    examContainer.innerHTML = `<p style="color:red;">Exams not found for category "${categoryId}".</p>`;
    return;
  }

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
