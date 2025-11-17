// search.js - Global search functionality for tests, courses, exams, and categories

let searchTimeout = null;
let allSearchData = {
  tests: [],
  courses: [],
  exams: [],
  categories: [],
  examDetails: []
};

// Initialize search functionality
document.addEventListener('DOMContentLoaded', async () => {
  const searchBoxes = document.querySelectorAll('.search-box');
  
  if (searchBoxes.length === 0) return;

  // Load all searchable data
  await loadAllSearchData();

  // Add search functionality to all search boxes
  searchBoxes.forEach(searchBox => {
    // Create search results container
    const searchContainer = createSearchResultsContainer(searchBox);
    
    // Add event listeners
    searchBox.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          performSearch(query, searchContainer);
        }, 300);
      } else {
        hideSearchResults(searchContainer);
      }
    });

    searchBox.addEventListener('focus', (e) => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        performSearch(query, searchContainer);
      }
    });

    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchBox.contains(e.target) && !searchContainer.contains(e.target)) {
        hideSearchResults(searchContainer);
      }
    });
  });
});

// Load all searchable data
async function loadAllSearchData() {
  try {
    // Load tests
    const testsRes = await fetch('/api/tests/free');
    if (testsRes.ok) {
      const testsData = await testsRes.json();
      if (testsData.success && Array.isArray(testsData.tests)) {
        allSearchData.tests = testsData.tests;
      }
    }
  } catch (err) {
    console.warn('Error loading tests for search:', err);
  }

  try {
    // Load exams
    const examsRes = await fetch('/api/exams');
    if (examsRes.ok) {
      const examsData = await examsRes.json();
      if (examsData.success && Array.isArray(examsData.exams)) {
        allSearchData.exams = examsData.exams;
      }
    }
  } catch (err) {
    console.warn('Error loading exams for search:', err);
  }

  try {
    // Load categories
    const categoriesRes = await fetch('/api/categories');
    if (categoriesRes.ok) {
      const categoriesData = await categoriesRes.json();
      if (categoriesData.success && Array.isArray(categoriesData.categories)) {
        allSearchData.categories = categoriesData.categories;
      }
    }
  } catch (err) {
    console.warn('Error loading categories for search:', err);
  }

  try {
    // Load courses from all categories
    const categoriesRes = await fetch('/api/categories');
    if (categoriesRes.ok) {
      const categoriesData = await categoriesRes.json();
      if (categoriesData.success && Array.isArray(categoriesData.categories)) {
        const categoryIds = categoriesData.categories.map(cat => cat.id || cat._id).filter(Boolean);
        const coursePromises = categoryIds.map(catId => 
          fetch(`/api/courses/${catId}`).then(res => res.json()).catch(() => ({ success: false, courses: [] }))
        );
        const courseResults = await Promise.all(coursePromises);
        allSearchData.courses = courseResults
          .filter(result => result.success && Array.isArray(result.courses))
          .flatMap(result => result.courses);
      }
    }
  } catch (err) {
    console.warn('Error loading courses for search:', err);
  }

  try {
    // Load exam details (for exam pattern and syllabus page)
    const examDetailsRes = await fetch('/api/exam-details');
    if (examDetailsRes.ok) {
      const examDetailsData = await examDetailsRes.json();
      if (examDetailsData.success && Array.isArray(examDetailsData.examDetails)) {
        allSearchData.examDetails = examDetailsData.examDetails;
      }
    }
  } catch (err) {
    console.warn('Error loading exam details for search:', err);
  }
}

// Create search results container
function createSearchResultsContainer(searchBox) {
  const container = document.createElement('div');
  container.className = 'search-results-container';
  container.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    max-height: 400px;
    overflow-y: auto;
    z-index: 1001;
    margin-top: 4px;
    display: none;
  `;

  const searchParent = searchBox.closest('.search-login') || searchBox.parentElement;
  searchParent.style.position = 'relative';
  searchParent.appendChild(container);

  return container;
}

// Perform search
function performSearch(query, container) {
  const results = {
    tests: searchItems(allSearchData.tests, query, 'name', 'description'),
    courses: searchItems(allSearchData.courses, query, 'name', 'description'),
    exams: searchItems(allSearchData.exams, query, 'name', 'description'),
    categories: searchItems(allSearchData.categories, query, 'name', 'description'),
    examDetails: searchExamDetails(allSearchData.examDetails, query)
  };

  displaySearchResults(results, container, query);
}

// Search exam details (searches exam name, about exam text, syllabus text, and pattern captions)
function searchExamDetails(examDetails, query) {
  if (!Array.isArray(examDetails) || !query) return [];
  
  const lowerQuery = query.toLowerCase();
  return examDetails.filter(exam => {
    // Search in exam name
    if (exam.examName && String(exam.examName).toLowerCase().includes(lowerQuery)) return true;
    // Search in about exam text
    if (exam.aboutExamText && String(exam.aboutExamText).toLowerCase().includes(lowerQuery)) return true;
    // Search in syllabus text
    if (exam.examSyllabusText && String(exam.examSyllabusText).toLowerCase().includes(lowerQuery)) return true;
    // Search in pattern captions
    if (exam.patterns && Array.isArray(exam.patterns)) {
      if (exam.patterns.some(p => p.caption && String(p.caption).toLowerCase().includes(lowerQuery))) return true;
      if (exam.patterns.some(p => p.text && String(p.text).toLowerCase().includes(lowerQuery))) return true;
    }
    return false;
  }).slice(0, 5);
}

// Search items
function searchItems(items, query, ...fields) {
  if (!Array.isArray(items) || !query) return [];
  
  const lowerQuery = query.toLowerCase();
  return items.filter(item => {
    return fields.some(field => {
      const value = item[field];
      return value && String(value).toLowerCase().includes(lowerQuery);
    });
  }).slice(0, 5); // Limit to 5 results per category
}

// Display search results
function displaySearchResults(results, container, query) {
  const totalResults = results.tests.length + results.courses.length + 
                       results.exams.length + results.categories.length + results.examDetails.length;

  if (totalResults === 0) {
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #64748b;">
        <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
        <p>No results found for "${query}"</p>
      </div>
    `;
    container.style.display = 'block';
    return;
  }

  let html = '';

  // Tests
  if (results.tests.length > 0) {
    html += `<div class="search-section">
      <div class="search-section-header">
        <i class="fas fa-file-alt"></i> Tests (${results.tests.length})
      </div>`;
    results.tests.forEach(test => {
      const link = `instructions.html?testId=${encodeURIComponent(test.id || test._id)}`;
      html += createSearchResultItem(test.name, test.description || '', link, 'test');
    });
    html += `</div>`;
  }

  // Courses
  if (results.courses.length > 0) {
    html += `<div class="search-section">
      <div class="search-section-header">
        <i class="fas fa-book"></i> Courses (${results.courses.length})
      </div>`;
    results.courses.forEach(course => {
      const catId = course.categoryId || '';
      const courseId = course.id || course._id || '';
      const link = `courses-lessons.html?catId=${encodeURIComponent(catId)}&courseId=${encodeURIComponent(courseId)}`;
      html += createSearchResultItem(course.name, course.description || '', link, 'course');
    });
    html += `</div>`;
  }

  // Exams
  if (results.exams.length > 0) {
    html += `<div class="search-section">
      <div class="search-section-header">
        <i class="fas fa-clipboard-list"></i> Exams (${results.exams.length})
      </div>`;
    results.exams.forEach(exam => {
      const link = `exam.html?cat=${encodeURIComponent(exam.categoryId || '')}&exam=${encodeURIComponent(exam.id || exam._id)}`;
      html += createSearchResultItem(exam.name, exam.description || '', link, 'exam');
    });
    html += `</div>`;
  }

  // Categories
  if (results.categories.length > 0) {
    html += `<div class="search-section">
      <div class="search-section-header">
        <i class="fas fa-folder"></i> Categories (${results.categories.length})
      </div>`;
    results.categories.forEach(category => {
      const link = `category.html?cat=${encodeURIComponent(category.id || category._id)}`;
      html += createSearchResultItem(category.name, category.description || '', link, 'category');
    });
    html += `</div>`;
  }

  // Exam Pattern and Syllabus
  if (results.examDetails.length > 0) {
    html += `<div class="search-section">
      <div class="search-section-header">
        <i class="fas fa-clipboard-list"></i> Exam Pattern & Syllabus (${results.examDetails.length})
      </div>`;
    results.examDetails.forEach(exam => {
      const link = `exam-pattern-syllabus.html?examId=${encodeURIComponent(exam._id || exam.id)}`;
      html += createSearchResultItem(exam.examName || 'Unnamed Exam', 'View exam pattern, syllabus, and cut-off details', link, 'exam');
    });
    html += `</div>`;
  }

  container.innerHTML = html;
  container.style.display = 'block';
  addSearchResultStyles();
}

// Create search result item
function createSearchResultItem(title, description, link, type) {
  const iconMap = {
    test: 'fa-file-alt',
    course: 'fa-book',
    exam: 'fa-clipboard-list',
    category: 'fa-folder'
  };
  
  return `
    <a href="${link}" class="search-result-item" data-type="${type}">
      <div class="search-result-icon">
        <i class="fas ${iconMap[type] || 'fa-circle'}"></i>
      </div>
      <div class="search-result-content">
        <div class="search-result-title">${escapeHtml(title)}</div>
        ${description ? `<div class="search-result-desc">${escapeHtml(description.substring(0, 60))}${description.length > 60 ? '...' : ''}</div>` : ''}
      </div>
      <div class="search-result-arrow">
        <i class="fas fa-chevron-right"></i>
      </div>
    </a>
  `;
}

// Hide search results
function hideSearchResults(container) {
  if (container) {
    container.style.display = 'none';
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Add search result styles
function addSearchResultStyles() {
  if (document.getElementById('search-results-styles')) return;

  const style = document.createElement('style');
  style.id = 'search-results-styles';
  style.textContent = `
    .search-results-container {
      font-family: 'Segoe UI', sans-serif;
    }
    .search-section {
      border-bottom: 1px solid #e2e8f0;
    }
    .search-section:last-child {
      border-bottom: none;
    }
    .search-section-header {
      padding: 12px 16px;
      background: #f8fafc;
      font-weight: 600;
      color: #0a1931;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .search-section-header i {
      color: #00bfff;
    }
    .search-result-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      text-decoration: none;
      color: #1f2937;
      transition: background 0.2s ease;
      border-bottom: 1px solid #f1f5f9;
    }
    .search-result-item:last-child {
      border-bottom: none;
    }
    .search-result-item:hover {
      background: #f8fafc;
    }
    .search-result-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #00bfff;
      font-size: 1.1rem;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .search-result-content {
      flex: 1;
      min-width: 0;
    }
    .search-result-title {
      font-weight: 600;
      color: #0a1931;
      margin-bottom: 4px;
      font-size: 0.95rem;
    }
    .search-result-desc {
      color: #64748b;
      font-size: 0.85rem;
      line-height: 1.4;
    }
    .search-result-arrow {
      color: #cbd5e0;
      margin-left: 12px;
      flex-shrink: 0;
    }
    .search-result-item:hover .search-result-arrow {
      color: #00bfff;
      transform: translateX(4px);
    }
    @media (max-width: 768px) {
      .search-results-container {
        max-height: 300px;
      }
      .search-result-item {
        padding: 10px 12px;
      }
      .search-result-icon {
        width: 36px;
        height: 36px;
        font-size: 1rem;
      }
    }
  `;
  document.head.appendChild(style);
}




