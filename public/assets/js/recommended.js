// recommended.js - Handles recommended tests and courses display on homepage

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
    // Fetch categories (which contain test series)
    const res = await fetch('/api/admin/categories');
    const data = await res.json();
    
    if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
      // Take first 6 categories as recommendations
      const recommended = data.categories.slice(0, 6);
      container.innerHTML = '';
      
      recommended.forEach(category => {
        const card = createRecommendationCard({
          id: category.id,
          name: category.name,
          description: category.description || '',
          type: 'category',
          cost: category.courseCost || '',
          validity: category.courseValidity || '',
          link: `category.html?cat=${encodeURIComponent(category.id)}`
        });
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
    // Fetch course categories
    const catRes = await fetch('/api/admin/course-categories');
    const catData = await catRes.json();
    
    if (catData.success && Array.isArray(catData.categories) && catData.categories.length > 0) {
      // Get courses from first few categories
      const categories = catData.categories.slice(0, 3);
      const allCourses = [];
      
      for (const category of categories) {
        try {
          const courseRes = await fetch(`/api/admin/courses/${encodeURIComponent(category.id)}`);
          const courseData = await courseRes.json();
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
            id: course.id,
            name: course.name,
            description: course.description || '',
            type: 'course',
            cost: course.courseCost || '',
            validity: course.courseValidity || '',
            link: `courses-lessons.html?catId=${encodeURIComponent(course.categoryId)}&courseId=${encodeURIComponent(course.id)}`
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
  
  const badge = item.type === 'category' ? 'Mock Test Series' : 'Course';
  const icon = item.type === 'category' ? '🎯' : '📚';
  
  card.innerHTML = `
    <div class="recommended-card-badge">${icon} ${badge}</div>
    <h3 class="recommended-card-title">${item.name}</h3>
    <p class="recommended-card-desc">${item.description || 'Explore this content to enhance your preparation.'}</p>
    <div class="recommended-card-details">
      ${item.cost ? `<span class="recommended-detail"><strong>Price:</strong> ${item.cost}</span>` : ''}
      ${item.validity ? `<span class="recommended-detail"><strong>Validity:</strong> ${item.validity}</span>` : ''}
    </div>
    <a href="${item.link}" class="recommended-card-btn">
      ${item.type === 'category' ? 'View Tests' : 'View Course'}
      <span class="arrow">→</span>
    </a>
  `;
  
  return card;
}

