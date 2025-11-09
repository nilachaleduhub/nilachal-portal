/**
 * exam-tests.js
 * Fetches tests for a given exam (based on ?cat=...&exam=...),
 * renders cards, and connects each to start-test.html.
 * Now includes purchase verification before allowing test attempts.
 */
(function() {
    /** Returns the string value of a query parameter. */
    function getQueryParam(name) {
      return new URLSearchParams(window.location.search).get(name);
    }

    /**
     * Calculate expiry date from validity string and purchase date
     */
    function calculateExpiryDate(validityStr, purchaseDateStr) {
      if (!validityStr || !purchaseDateStr) return null;
      
      try {
        const purchaseDate = new Date(purchaseDateStr);
        if (isNaN(purchaseDate.getTime())) return null;
        
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
        return null;
      }
    }

    /**
     * Check if a purchase is expired
     */
    function isPurchaseExpired(courseValidity, purchasedAt) {
      if (!courseValidity || !purchasedAt) return false; // No validity means no expiry
      const expiryDate = calculateExpiryDate(courseValidity, purchasedAt);
      if (!expiryDate) return false; // Can't calculate expiry, assume valid
      return expiryDate < new Date();
    }

    /**
     * Check if user has purchased a test, exam, or category
     * Returns true if user has access, false otherwise
     * Also checks if the purchase has expired
     */
    async function hasPurchasedAccess(testId, examId, categoryId) {
      try {
        // Get current user
        const userStr = localStorage.getItem('user');
        if (!userStr) return false;

        const user = JSON.parse(userStr);
        const userId = user.id || user._id || user.email;
        if (!userId) return false;

        // Get purchases from server
        let serverPurchases = [];
        try {
          const res = await fetch(`/api/purchases?userId=${encodeURIComponent(userId)}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.purchases)) {
            serverPurchases = data.purchases.filter(p => p.status === 'completed');
          }
        } catch (err) {
          console.warn('Error fetching purchases from server:', err);
        }

        // Get purchases from localStorage
        let localPurchases = { courses: [], tests: [] };
        try {
          const userPurchases = JSON.parse(localStorage.getItem('userPurchases') || '{}');
          const userPurchaseData = userPurchases[userId];
          if (userPurchaseData) {
            localPurchases = {
              courses: Array.isArray(userPurchaseData.courses) ? userPurchaseData.courses : [],
              tests: Array.isArray(userPurchaseData.tests) ? userPurchaseData.tests : []
            };
          }
        } catch (err) {
          console.warn('Error parsing localStorage purchases:', err);
        }

        // Check server purchases (need to fetch courseValidity from original items)
        // For now, we'll check localStorage for expiry info
        const hasServerAccess = serverPurchases.some(purchase => {
          let hasAccess = false;
          // Check if purchased the specific test
          if (purchase.purchaseType === 'test' && purchase.purchaseId === testId) {
            hasAccess = true;
          }
          // Check if purchased the exam (gives access to all tests in that exam)
          else if (purchase.purchaseType === 'exam' && purchase.purchaseId === examId) {
            hasAccess = true;
          }
          // Check if purchased the category (gives access to all tests in that category)
          else if (purchase.purchaseType === 'category' && purchase.purchaseId === categoryId) {
            hasAccess = true;
          }
          
          if (hasAccess) {
            // Check expiry from localStorage if available
            const localMatch = [...localPurchases.courses, ...localPurchases.tests].find(p => 
              (p.id || p.courseId || p.testId) === purchase.purchaseId
            );
            if (localMatch && isPurchaseExpired(localMatch.courseValidity, localMatch.purchasedAt)) {
              return false; // Expired
            }
            // If no validity info, assume valid (for backward compatibility)
            return true;
          }
          return false;
        });

        if (hasServerAccess) return true;

        // Check localStorage purchases with expiry validation
        const hasLocalTestAccess = localPurchases.tests.some(test => {
          const testPurchaseId = test.id || test.testId || test._id;
          if (testPurchaseId === testId) {
            // Check if expired
            if (isPurchaseExpired(test.courseValidity, test.purchasedAt)) {
              return false; // Expired
            }
            return true;
          }
          return false;
        });

        const hasLocalExamAccess = localPurchases.courses.some(course => {
          const courseId = course.id || course.courseId || course._id;
          // Check if purchased the exam
          if (courseId === examId) {
            // Check if expired
            if (isPurchaseExpired(course.courseValidity, course.purchasedAt)) {
              return false; // Expired
            }
            return true;
          }
          return false;
        });

        const hasLocalCategoryAccess = localPurchases.courses.some(course => {
          const courseId = course.id || course.courseId || course._id;
          const courseCategoryId = course.categoryId;
          // Check if purchased the category
          if (courseId === categoryId || courseCategoryId === categoryId) {
            // Check if expired
            if (isPurchaseExpired(course.courseValidity, course.purchasedAt)) {
              return false; // Expired
            }
            return true;
          }
          return false;
        });

        return hasLocalTestAccess || hasLocalExamAccess || hasLocalCategoryAccess;
      } catch (err) {
        console.error('Error checking purchase access:', err);
        return false;
      }
    }
  
    document.addEventListener('DOMContentLoaded', async () => {
      const categoryId = getQueryParam('cat');
      const examId     = getQueryParam('exam');
      const titleEl    = document.getElementById('exam-title');
      const container  = document.getElementById('test-container');
  
      if (!categoryId || !examId) {
        titleEl.innerText = 'Invalid Exam Selection';
        container.innerText = 'Category or exam missing in URL.';
        return;
      }
  
      // Load exams from file and admin data
      Promise.all([
        fetch(`assets/data/exams-${categoryId}.json`)
          .then(res => res.ok ? res.json() : [])
          .catch(() => []),
        Promise.resolve().then(() => {
          const adminExamData = localStorage.getItem(`examData_${categoryId}`);
          return adminExamData ? JSON.parse(adminExamData) : [];
        })
      ])
        .then(async ([fileExams, adminExams]) => {
          // Combine and remove duplicates
          const allExams = [...fileExams, ...adminExams];
          const uniqueExams = allExams.filter((exam, index, self) => 
            index === self.findIndex(e => e.id === exam.id)
          );
          
          const exam = uniqueExams.find(e => e.id === examId);
          if (!exam) throw new Error(`Exam "${examId}" not found in ${categoryId}`);

          titleEl.innerText = exam.name + ' – Available Tests';

          // Get tests from exam structure
          let tests = Array.isArray(exam.tests) ? exam.tests : [];
          console.log('Tests from exam structure:', tests);
          
          // Also get tests from separate test storage
          const separateTests = JSON.parse(localStorage.getItem(`testData_${categoryId}`) || '[]');
          console.log('All separate tests:', separateTests);
          const examTests = separateTests.filter(test => test.examId === examId);
          console.log('Tests for this exam from separate storage:', examTests);
          
          // Combine and remove duplicates
          const allTests = [...tests, ...examTests];
          const uniqueTests = allTests.filter((test, index, self) => 
            index === self.findIndex(t => t.id === test.id)
          );
          
          tests = uniqueTests;
          console.log('Final combined tests:', tests);

          if (tests.length === 0) {
            container.innerText = 'No tests available for this exam.';
            return;
          }

          // Check if user is logged in
          const userStr = localStorage.getItem('user');
          const isLoggedIn = !!userStr;

          // Render each test card
          for (const test of tests) {
            const card = document.createElement('div');
            card.className = 'card';
            
            // Check if user has purchased access
            const hasAccess = isLoggedIn ? await hasPurchasedAccess(test.id, examId, categoryId) : false;
            
            if (hasAccess) {
              // User has purchased, show "Start Test" button
              const params = new URLSearchParams();
              params.set('testId', test.id);
              if (typeof categoryId !== 'undefined' && categoryId) params.set('cat', categoryId);
              if (typeof examId !== 'undefined' && examId) params.set('exam', examId);
              const testUrl = 'instructions.html?' + params.toString();
              
              card.innerHTML = `
                <h3>${test.name}</h3>
                <a href="${testUrl}" style="text-decoration: none; background-color: #00bfff; color: white; padding: 0.6rem 1rem; border-radius: 5px; font-weight: bold; transition: background 0.3s; display: inline-block;">Start Test</a>
              `;
              
              const startLink = card.querySelector('a');
              startLink.addEventListener('mouseenter', () => {
                startLink.style.backgroundColor = '#0095cc';
              });
              startLink.addEventListener('mouseleave', () => {
                startLink.style.backgroundColor = '#00bfff';
              });
              
              startLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Test clicked:', test);

                // Save the full test object so instructions page can read it
                try {
                  localStorage.setItem('testData', JSON.stringify(test));
                  localStorage.setItem('testId', test.id);
                  // mark type for consumers
                  localStorage.setItem('testType', test.examId ? 'admin' : 'file');
                  // also persist current page category for robust lookup
                  if (typeof categoryId !== 'undefined' && categoryId) {
                    localStorage.setItem('testCategory', categoryId);
                  }
                } catch (err) {
                  console.warn('Could not persist test to localStorage', err);
                }

                // Navigate to the instructions page
                window.location.href = testUrl;
              });
            } else {
              // User hasn't purchased, show "Buy Now" button
              const buyButtonText = isLoggedIn ? 'Buy Now' : 'Login to Buy';
              card.innerHTML = `
                <h3>${test.name}</h3>
                <button class="btn card-btn" style="background-color: #00bfff; color: white; padding: 0.6rem 1rem; border-radius: 5px; font-weight: bold; border: none; cursor: pointer; transition: background 0.3s;">${buyButtonText}</button>
              `;
              
              const buyBtn = card.querySelector('button');
              buyBtn.addEventListener('mouseenter', () => {
                buyBtn.style.backgroundColor = '#0095cc';
              });
              buyBtn.addEventListener('mouseleave', () => {
                buyBtn.style.backgroundColor = '#00bfff';
              });
              
              buyBtn.addEventListener('click', () => {
                if (!isLoggedIn) {
                  alert('Please login to purchase this test.');
                  window.location.href = 'login-register.html';
                  return;
                }

                // Redirect to buy course details page
                // First try to buy the test, if not available, buy the exam or category
                const params = new URLSearchParams();
                
                // Try to find test in admin data to check if it can be purchased individually
                // For now, redirect to exam purchase page
                params.set('type', 'exam');
                params.set('id', examId);
                if (categoryId) params.set('categoryId', categoryId);
                
                window.location.href = `buy-course-details.html?${params.toString()}`;
              });
            }
            
            container.appendChild(card);
          }
        })
        .catch(err => {
          console.error('exam-tests.js error:', err);
          container.innerText = err.message;
        });
    });
  })();
  