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

  const createCard = ({ title, description, details = [], onCardClick, button }) => {
    const card = document.createElement('div');
    card.className = 'card';

    if (typeof onCardClick === 'function') {
      const handleActivate = () => onCardClick();
      card.classList.add('card-clickable');
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      if (title) {
        card.setAttribute('aria-label', `View details for ${title}`);
      }
      card.addEventListener('click', handleActivate);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleActivate();
        }
      });
    }

    const heading = document.createElement('h3');
    heading.textContent = title || 'Untitled';
    card.appendChild(heading);

    if (Array.isArray(details) && details.some(item => item && hasValue(item.value))) {
      const detailsContainer = document.createElement('div');
      detailsContainer.className = 'card-details';

      details.forEach(item => {
        if (!item || !hasValue(item.value)) return;
        const badge = document.createElement('span');
        badge.className = 'card-detail';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'card-detail-label';
        labelSpan.textContent = `${item.label}`;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'card-detail-value';
        valueSpan.textContent = formatValue(item.value);

        badge.appendChild(labelSpan);
        badge.appendChild(document.createTextNode(': '));
        badge.appendChild(valueSpan);
        detailsContainer.appendChild(badge);
      });

      if (detailsContainer.childElementCount > 0) {
        card.appendChild(detailsContainer);
      }
    }

    if (description) {
      const descEl = document.createElement('p');
      descEl.textContent = description;
      card.appendChild(descEl);
    }

    if (button !== null) {
      const config = button || {};
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = config.className || 'buy-btn';
      btn.textContent = config.label || 'Buy Now';
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (typeof config.onClick === 'function') {
          config.onClick(event);
        } else if (typeof onCardClick === 'function') {
          onCardClick();
        }
      });
      card.appendChild(btn);
    }

    return card;
  };

  const loadTestSeriesCategories = async () => {
    if (!testSeriesCategoryContainer) return [];

    let categories = [];
    let serverCategories = [];

    try {
      const res = await fetch('assets/data/categories.json');
      if (res.ok) {
        categories = await res.json();
      }
    } catch (err) {
      console.warn('Unable to load categories from file:', err);
    }

    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.categories)) {
          serverCategories = data.categories;
        }
      }
    } catch (err) {
      console.warn('Unable to load categories from API:', err);
    }

    try {
      const storedAdmin = JSON.parse(localStorage.getItem('adminCategories') || '[]');
      const storedMain = JSON.parse(localStorage.getItem('mainCategories') || '[]');
      categories = [...categories, ...serverCategories, ...storedAdmin, ...storedMain];
    } catch (err) {
      console.warn('Unable to read categories from localStorage:', err);
      categories = [...categories, ...serverCategories];
    }

    if (categories.length === 0 && serverCategories.length > 0) {
      categories = [...serverCategories];
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
        button: { onClick: navigateToDetails }
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
              categoryId: exam.categoryId
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
        button: { onClick: navigateToDetails }
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
                categoryName: category.name
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
        button: { onClick: navigateToDetails }
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

