(() => {
  const testSeriesCategoryContainer = document.getElementById('test-series-categories');
  const testSeriesExamsContainer = document.getElementById('test-series-exams');
  const courseIndividualContainer = document.getElementById('course-individual-container');

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
    uniqueCategories.forEach(category => {
      const categoryId = getEntityId(category);
      if (!categoryId) return;

      const details = [
        { label: 'Price', value: category.courseCost },
        { label: 'Validity', value: category.courseValidity }
      ];

      const navigateToDetails = () => {
        const params = new URLSearchParams();
        params.set('type', 'category');
        params.set('id', categoryId);
        window.location.href = `buy-course-details.html?${params.toString()}`;
      };

      const card = createCard({
        title: category.name || 'Untitled Category',
        description: category.description || '',
        details,
        onCardClick: navigateToDetails,
        button: { onClick: navigateToDetails, label: 'Buy Now' },
        type: 'category',
        hasDiscount: category.hasDiscount || false,
        discountPercent: category.discountPercent || 0,
        discountCode: category.discountCode || '',
        discountMessage: category.discountMessage || ''
      });
      testSeriesCategoryContainer.appendChild(card);
    });

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
    uniqueExams.forEach(exam => {
      const examId = getEntityId(exam);
      if (!examId) return;

      const details = [
        { label: 'Price', value: exam.courseCost },
        { label: 'Validity', value: exam.courseValidity }
      ];

      const navigateToDetails = () => {
        const params = new URLSearchParams();
        params.set('type', 'exam');
        params.set('id', examId);
        if (exam.categoryId) params.set('categoryId', exam.categoryId);
        window.location.href = `buy-course-details.html?${params.toString()}`;
      };

      const card = createCard({
        title: exam.name || 'Untitled Exam',
        description: exam.description || '',
        details,
        onCardClick: navigateToDetails,
        button: { onClick: navigateToDetails, label: 'Buy Now' },
        type: 'exam',
        hasDiscount: exam.hasDiscount || false,
        discountPercent: exam.discountPercent || 0,
        discountCode: exam.discountCode || '',
        discountMessage: exam.discountMessage || ''
      });
      testSeriesExamsContainer.appendChild(card);
    });
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
    uniqueCourses.forEach(course => {
      const courseId = getEntityId(course);
      if (!courseId) return;

      const details = [
        { label: 'Price', value: course.courseCost },
        { label: 'Validity', value: course.courseValidity }
      ];

      const navigateToDetails = () => {
        const params = new URLSearchParams();
        params.set('type', 'course');
        params.set('id', courseId);
        if (course.categoryId) params.set('categoryId', course.categoryId);
        window.location.href = `buy-course-details.html?${params.toString()}`;
      };

      const card = createCard({
        title: course.name || 'Untitled Course',
        description: course.description || '',
        details,
        onCardClick: navigateToDetails,
        button: { onClick: navigateToDetails, label: 'Buy Now' },
        type: 'course',
        hasDiscount: course.hasDiscount || false,
        discountPercent: course.discountPercent || 0,
        discountCode: course.discountCode || '',
        discountMessage: course.discountMessage || ''
      });
      courseIndividualContainer.appendChild(card);
    });
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

