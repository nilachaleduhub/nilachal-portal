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
     * Check if a test has all required questions added
     * Returns true if all questions are added, false otherwise
     */
    async function hasAllQuestionsAdded(test) {
      try {
        // Calculate required question count
        let requiredCount = 0;
        
        if (test.hasSections && Array.isArray(test.sections) && test.sections.length > 0) {
          // If test has sections, sum up the numQuestions from each section
          requiredCount = test.sections.reduce((sum, section) => {
            return sum + (typeof section.numQuestions === 'number' ? section.numQuestions : 0);
          }, 0);
        } else if (typeof test.numQuestions === 'number' && test.numQuestions > 0) {
          // Use numQuestions if available
          requiredCount = test.numQuestions;
        } else {
          // If no required count is specified, assume test is complete if it has any questions
          // This handles legacy tests that might not have numQuestions set
          return true;
        }

        // If required count is 0, test is not ready
        if (requiredCount === 0) {
          return false;
        }

        // Get actual question count
        let actualCount = 0;

        // First, try to get from embedded questions if available
        if (Array.isArray(test.questions) && test.questions.length > 0) {
          actualCount = test.questions.length;
        } else {
          // Fetch from API to get the actual question count
          try {
            const res = await fetch(`/api/tests/${encodeURIComponent(test.id)}`);
            if (res.ok) {
              const testData = await res.json();
              if (testData.success && testData.test) {
                if (Array.isArray(testData.test.questions)) {
                  actualCount = testData.test.questions.length;
                }
              }
            }
          } catch (err) {
            console.warn('Error fetching test questions count:', err);
            // If we can't fetch, assume incomplete to be safe
            return false;
          }
        }

        // Check if all questions are added
        return actualCount >= requiredCount;
      } catch (err) {
        console.error('Error checking if test has all questions:', err);
        // On error, assume incomplete to be safe
        return false;
      }
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

        // Combine all purchases for easier checking
        const allPurchases = [...localPurchases.courses, ...localPurchases.tests];
        
        // Check server purchases first
        const hasServerAccess = serverPurchases.some(purchase => {
          // Check if purchased the specific test
          if (purchase.purchaseType === 'test' && purchase.purchaseId === testId) {
            // Check expiry from localStorage
            const localMatch = allPurchases.find(p => 
              (p.id || p.courseId || p.testId || p._id) === purchase.purchaseId && 
              (p.purchaseType === 'test' || p.type === 'test')
            );
            if (localMatch && isPurchaseExpired(localMatch.courseValidity, localMatch.purchasedAt)) {
              return false; // Expired
            }
            return true;
          }
          // Check if purchased the exam (gives access to all tests in that exam)
          if (purchase.purchaseType === 'exam' && purchase.purchaseId === examId) {
            // Check expiry from localStorage
            const localMatch = allPurchases.find(p => 
              (p.id || p.courseId || p.testId || p._id) === purchase.purchaseId && 
              (p.purchaseType === 'exam' || p.type === 'exam')
            );
            if (localMatch && isPurchaseExpired(localMatch.courseValidity, localMatch.purchasedAt)) {
              return false; // Expired
            }
            return true;
          }
          // Check if purchased the category (gives access to all tests in that category)
          if (purchase.purchaseType === 'category' && purchase.purchaseId === categoryId) {
            // Check expiry from localStorage
            const localMatch = allPurchases.find(p => 
              ((p.id || p.courseId || p.testId || p._id) === purchase.purchaseId && 
               (p.purchaseType === 'category' || p.type === 'category')) ||
              (p.categoryId === categoryId && (p.purchaseType === 'category' || p.type === 'category'))
            );
            if (localMatch && isPurchaseExpired(localMatch.courseValidity, localMatch.purchasedAt)) {
              return false; // Expired
            }
            return true;
          }
          return false;
        });

        if (hasServerAccess) return true;

        // Check localStorage purchases with strict matching and expiry validation
        // 1. Check if test itself is purchased
        const hasLocalTestAccess = localPurchases.tests.some(test => {
          const testPurchaseId = test.id || test.testId || test._id;
          const testPurchaseType = test.purchaseType || test.type;
          // Must match test ID and be a test purchase
          if (testPurchaseId === testId && (testPurchaseType === 'test' || !testPurchaseType)) {
            // Check if expired
            if (isPurchaseExpired(test.courseValidity, test.purchasedAt)) {
              return false; // Expired
            }
            return true;
          }
          return false;
        });

        if (hasLocalTestAccess) return true;

        // 2. Check if exam is purchased (gives access to all tests in that exam)
        const hasLocalExamAccess = localPurchases.courses.some(course => {
          const courseId = course.id || course.courseId || course._id;
          const coursePurchaseType = course.purchaseType || course.type;
          // Must match exam ID and be an exam purchase
          if (courseId === examId && (coursePurchaseType === 'exam' || coursePurchaseType === 'category')) {
            // Check if expired
            if (isPurchaseExpired(course.courseValidity, course.purchasedAt)) {
              return false; // Expired
            }
            return true;
          }
          return false;
        });

        if (hasLocalExamAccess) return true;

        // 3. Check if category is purchased (gives access to all tests in that category)
        const hasLocalCategoryAccess = localPurchases.courses.some(course => {
          const courseId = course.id || course.courseId || course._id;
          const courseCategoryId = course.categoryId;
          const coursePurchaseType = course.purchaseType || course.type;
          // Must match category ID and be a category purchase
          if ((courseId === categoryId || courseCategoryId === categoryId) && 
              (coursePurchaseType === 'category')) {
            // Check if expired
            if (isPurchaseExpired(course.courseValidity, course.purchasedAt)) {
              return false; // Expired
            }
            return true;
          }
          return false;
        });

        return hasLocalCategoryAccess;
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

      try {
        const collectedExams = [];

        // 1. Legacy static file (if present)
        try {
          const res = await fetch(`assets/data/exams-${categoryId}.json`);
          if (res.ok) {
            const fileExams = await res.json();
            if (Array.isArray(fileExams)) collectedExams.push(...fileExams);
          }
        } catch (err) {
          console.warn('Unable to load legacy exams file:', err);
        }

        // 2. LocalStorage admin data
        try {
          const adminExamData = localStorage.getItem(`examData_${categoryId}`);
          if (adminExamData) {
            const parsed = JSON.parse(adminExamData);
            if (Array.isArray(parsed)) collectedExams.push(...parsed);
          }
        } catch (err) {
          console.warn('Unable to parse admin exams from localStorage:', err);
        }

        // 3. Live API
        try {
          const apiRes = await fetch('/api/exams');
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData.success && Array.isArray(apiData.exams)) {
              apiData.exams
                .filter(exam => exam && exam.categoryId === categoryId)
                .forEach(exam => {
                  collectedExams.push({
                    ...exam,
                    id: exam.id || exam._id,
                    name: exam.name,
                    description: exam.description || '',
                    categoryId: exam.categoryId
                  });
                });
            }
          } else {
            console.warn('Failed to fetch exams from API:', apiRes.status);
          }
        } catch (err) {
          console.warn('Error fetching exams from API:', err);
        }

        const uniqueExams = collectedExams.filter((exam, index, self) =>
          exam && exam.id && index === self.findIndex(e => e && e.id === exam.id)
        );

        const exam = uniqueExams.find(e => e.id === examId);
        if (!exam) throw new Error(`Exam "${examId}" not found in ${categoryId}`);

        titleEl.innerText = `${exam.name} – Available Tests`;

        // Collect tests from multiple sources
        const collectedTests = [];

        // a) Tests embedded inside the exam object
        if (Array.isArray(exam.tests)) {
          collectedTests.push(...exam.tests);
        }

        // b) Tests stored in localStorage (backward compatibility)
        try {
          const separateTests = JSON.parse(localStorage.getItem(`testData_${categoryId}`) || '[]');
          if (Array.isArray(separateTests)) {
            separateTests
              .filter(test => test && test.examId === examId)
              .forEach(test => collectedTests.push(test));
          }
        } catch (err) {
          console.warn('Unable to load tests from localStorage:', err);
        }

        // c) Live API for tests
        try {
          const testRes = await fetch(`/api/exams/${encodeURIComponent(examId)}/tests`);
          if (testRes.ok) {
            const testData = await testRes.json();
            if (testData.success && Array.isArray(testData.tests)) {
              testData.tests.forEach(test => {
                collectedTests.push({
                  ...test,
                  id: test.id || test._id,
                  examId: test.examId || examId,
                  categoryId: test.categoryId || categoryId
                });
              });
            }
          } else {
            console.warn('Failed to fetch tests from API:', testRes.status);
          }
        } catch (err) {
          console.warn('Error fetching tests from API:', err);
        }

        const uniqueTests = collectedTests.filter((test, index, self) =>
          test && test.id && index === self.findIndex(t => t && t.id === test.id)
        );

        if (uniqueTests.length === 0) {
          container.innerText = 'No tests available for this exam.';
          return;
        }

        const tests = uniqueTests;
        // Check if user is logged in
        const userStr = localStorage.getItem('user');
        const isLoggedIn = !!userStr;

        // Render each test card
        for (const test of tests) {
          const card = document.createElement('div');
          card.className = 'card';
          
          // Check if test has all questions added
          const allQuestionsAdded = await hasAllQuestionsAdded(test);
          
          // If questions are not complete, show "Coming Soon" regardless of purchase status
          if (!allQuestionsAdded) {
            card.innerHTML = `
              <h3>${test.name}</h3>
              <button class="btn card-btn" style="background-color: #94a3b8; color: white; padding: 0.6rem 1rem; border-radius: 5px; font-weight: bold; border: none; cursor: not-allowed; opacity: 0.8;" disabled>Coming Soon</button>
            `;
            container.appendChild(card);
            continue;
          }
          
          // Check if user has purchased access
          let hasAccess = isLoggedIn ? await hasPurchasedAccess(test.id, examId, categoryId) : false;
          
          // Check if purchase is expired
          let isExpired = false;
          if (hasAccess) {
            try {
              const userStrLocal = localStorage.getItem('user');
              if (userStrLocal) {
                const user = JSON.parse(userStrLocal);
                const userId = user.id || user._id || user.email;
                const userPurchases = JSON.parse(localStorage.getItem('userPurchases') || '{}');
                const userPurchaseData = userPurchases[userId];
                
                if (userPurchaseData) {
                  const allPurchases = [...(userPurchaseData.courses || []), ...(userPurchaseData.tests || [])];
                  const purchase = allPurchases.find(p => {
                    const purchaseId = p.id || p.courseId || p.testId || p._id;
                    return purchaseId === test.id || purchaseId === examId || purchaseId === categoryId;
                  });
                  
                  if (purchase && isPurchaseExpired(purchase.courseValidity, purchase.purchasedAt)) {
                    isExpired = true;
                    hasAccess = false;
                  }
                }
              }
            } catch (err) {
              console.warn('Error checking expiry:', err);
            }
          }
          
          if (hasAccess && !isExpired) {
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

              try {
                localStorage.setItem('testData', JSON.stringify(test));
                localStorage.setItem('testId', test.id);
                localStorage.setItem('testType', test.examId ? 'admin' : 'file');
                if (typeof categoryId !== 'undefined' && categoryId) {
                  localStorage.setItem('testCategory', categoryId);
                }
              } catch (err) {
                console.warn('Could not persist test to localStorage', err);
              }

              window.location.href = testUrl;
            });
          } else {
            const buyButtonText = isLoggedIn ? 'Buy Now' : 'Login to Buy';
            card.innerHTML = `
              <h3>${test.name}</h3>
              ${isExpired ? '<p style="color: #dc2626; font-size: 0.9rem; margin-bottom: 0.5rem;">⚠️ Your access has expired</p>' : ''}
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

              const params = new URLSearchParams();
              params.set('type', 'exam');
              params.set('id', examId);
              if (categoryId) params.set('categoryId', categoryId);
              
              window.location.href = `buy-course-details.html?${params.toString()}`;
            });
          }
          
          container.appendChild(card);
        }
      } catch (err) {
        console.error('exam-tests.js error:', err);
        container.innerText = err.message || 'Failed to load tests.';
      }
    });
  })();
  