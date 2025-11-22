// exam-pattern-syllabus.js - Handles exam pattern and syllabus page functionality

let allExamDetails = [];
let currentExamDetails = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Check if exam ID is in URL
  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get('examId');

  if (examId) {
    await loadExamDetails(examId);
    showExamDetailsView();
  } else {
    await loadExamList();
    showExamListView();
  }

  // Setup smooth scrolling for table of contents
  setupTableOfContents();
});

// Load exam list
async function loadExamList() {
  const grid = document.getElementById('exam-list-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-message">Loading exams...</div>';

  try {
    const response = await fetch('/api/exam-details');
    const result = await response.json();

    if (result.success && Array.isArray(result.examDetails) && result.examDetails.length > 0) {
      allExamDetails = result.examDetails;
      displayExamList(allExamDetails);
    } else {
      grid.innerHTML = '<div class="empty-message">No exam details available yet. Please check back later.</div>';
    }
  } catch (error) {
    console.error('Error loading exam list:', error);
    grid.innerHTML = '<div class="empty-message">Error loading exams. Please try again later.</div>';
  }
}

// Display exam list
function displayExamList(exams) {
  const grid = document.getElementById('exam-list-grid');
  if (!grid) return;

  if (exams.length === 0) {
    grid.innerHTML = '<div class="empty-message">No exam details available yet.</div>';
    return;
  }

  grid.innerHTML = '';
  
  exams.forEach(exam => {
    const card = document.createElement('div');
    card.className = 'exam-card';
    card.innerHTML = `
      <div class="exam-card-icon">
        <i class="fas fa-clipboard-list"></i>
      </div>
      <h3>${escapeHtml(exam.examNamedetails || exam.examName || 'Unnamed Exam')}</h3>
      <a href="exam-pattern-syllabus.html?examId=${encodeURIComponent(exam._id || exam.id)}" class="view-details-btn">
        <i class="fas fa-eye"></i> View Details
      </a>
    `;
    grid.appendChild(card);
  });
}

// Load exam details
async function loadExamDetails(examId) {
  try {
    const response = await fetch(`/api/exam-details/${examId}`);
    const result = await response.json();

    if (result.success && result.examDetail) {
      currentExamDetails = result.examDetail;
      displayExamDetails(currentExamDetails);
    } else {
      showError('Exam details not found');
    }
  } catch (error) {
    console.error('Error loading exam details:', error);
    showError('Error loading exam details. Please try again.');
  }
}

// Display exam details
function displayExamDetails(exam) {
  // 1. Exam Name
  const examNameTitle = document.getElementById('exam-name-title');
  if (examNameTitle) {
    examNameTitle.innerHTML = `<i class="fas fa-certificate"></i> ${escapeHtml(exam.examNamedetails || exam.examName || 'Exam')}`;
  }

  // 2. About Exam
  const aboutExamContent = document.getElementById('about-exam-content');
  if (aboutExamContent) {
    let html = '';
    if (exam.aboutExamText) {
      html += `<div class="text-content">${formatText(exam.aboutExamText)}</div>`;
    }
    if (exam.aboutExamImagePath) {
      html += `<img src="${exam.aboutExamImagePath}" alt="About Exam" />`;
    }
    aboutExamContent.innerHTML = html || '<div class="no-content">No information available</div>';
  }

  // 3. Links
  const linksContent = document.getElementById('links-content');
  if (linksContent) {
    if (exam.links && Array.isArray(exam.links) && exam.links.length > 0) {
      let tableHTML = '<table><thead><tr><th>Caption</th><th>Link</th></tr></thead><tbody>';
      exam.links.forEach(link => {
        tableHTML += `
          <tr>
            <td>${escapeHtml(link.caption || '')}</td>
            <td><a href="${escapeHtml(link.url || '#')}" target="_blank" rel="noopener noreferrer">Click here</a></td>
          </tr>
        `;
      });
      tableHTML += '</tbody></table>';
      linksContent.innerHTML = tableHTML;
    } else {
      linksContent.innerHTML = '<div class="no-content">No links available</div>';
    }
  }

  // 4. Exam Pattern
  const patternContent = document.getElementById('pattern-content');
  if (patternContent) {
    if (exam.patterns && Array.isArray(exam.patterns) && exam.patterns.length > 0) {
      let html = '';
      exam.patterns.forEach(pattern => {
        html += `<div class="pattern-item-display" style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 12px; border-left: 4px solid #8b5cf6;">`;
        html += `<h3 style="color: #0a1931; margin-bottom: 1rem; font-size: 1.3rem;">${escapeHtml(pattern.caption || 'Pattern')}</h3>`;
        
        if (pattern.type === 'text' && pattern.text) {
          html += `<div class="text-content">${formatText(pattern.text)}</div>`;
        } else if (pattern.type === 'picture' && pattern.imagePath) {
          // Ensure image path is correct and add proper styling
          const imagePath = pattern.imagePath.startsWith('/') ? pattern.imagePath : '/' + pattern.imagePath;
          html += `<div style="margin-top: 1rem;">
            <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(pattern.caption || 'Pattern Image')}" 
                 style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div style="display: none; padding: 1rem; background: #fee; border-radius: 8px; color: #c33;">
              Image failed to load. Path: ${escapeHtml(imagePath)}
            </div>
          </div>`;
        } else if (pattern.type === 'table' && pattern.table) {
          html += `<div class="table-wrapper">${pattern.table}</div>`;
        }
        
        html += `</div>`;
      });
      patternContent.innerHTML = html;
    } else {
      patternContent.innerHTML = '<div class="no-content">No exam pattern information available</div>';
    }
  }

  // 5. Syllabus
  const syllabusContent = document.getElementById('syllabus-content');
  if (syllabusContent) {
    let html = '';
    
    // Show main syllabus caption if available
    if (exam.examSyllabusCaption) {
      html += `<h3 style="color: #0a1931; margin-bottom: 1rem; font-size: 1.3rem;">${escapeHtml(exam.examSyllabusCaption)}</h3>`;
    }
    
    // Show multiple syllabus items
    if (exam.syllabuses && Array.isArray(exam.syllabuses) && exam.syllabuses.length > 0) {
      exam.syllabuses.forEach(syllabus => {
        html += `<div class="syllabus-item-display" style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 12px; border-left: 4px solid #8b5cf6;">`;
        html += `<h3 style="color: #0a1931; margin-bottom: 1rem; font-size: 1.3rem;">${escapeHtml(syllabus.caption || 'Syllabus')}</h3>`;
        
        if (syllabus.type === 'text' && syllabus.text) {
          html += `<div class="text-content">${formatText(syllabus.text)}</div>`;
        } else if (syllabus.type === 'picture' && syllabus.imagePath) {
          // Use the imagePath as-is since it's already normalized by the server
          let imagePath = syllabus.imagePath;
          // Ensure it starts with / if it's a relative path
          if (!imagePath.startsWith('http') && !imagePath.startsWith('/') && !imagePath.startsWith('data:') && !imagePath.startsWith('blob:')) {
            imagePath = '/' + imagePath;
          }
          html += `<div style="margin-top: 1rem;">
            <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(syllabus.caption || 'Syllabus Image')}" 
                 style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div style="display: none; padding: 1rem; background: #fee; border-radius: 8px; color: #c33;">
              Image failed to load. Path: ${escapeHtml(imagePath)}
            </div>
          </div>`;
        } else if (syllabus.type === 'table' && syllabus.table) {
          html += `<div class="table-wrapper">${syllabus.table}</div>`;
        }
        
        html += `</div>`;
      });
    } else {
      // Fallback to legacy fields for backward compatibility
      if (exam.examSyllabusText) {
        html += `<div class="text-content">${formatText(exam.examSyllabusText)}</div>`;
      }
      if (exam.examSyllabusImagePath) {
        html += `<img src="${exam.examSyllabusImagePath}" alt="Exam Syllabus" />`;
      }
      if (exam.syllabusTable) {
        html += `<div class="table-wrapper">${exam.syllabusTable}</div>`;
      }
    }
    
    syllabusContent.innerHTML = html || '<div class="no-content">No syllabus information available</div>';
  }

  // 6. Previous Year Cut Off
  const cutoffContent = document.getElementById('cutoff-content');
  if (cutoffContent) {
    let html = '';
    
    // Show multiple cutoff items
    if (exam.cutoffs && Array.isArray(exam.cutoffs) && exam.cutoffs.length > 0) {
      exam.cutoffs.forEach(cutoff => {
        html += `<div class="cutoff-item-display" style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 12px; border-left: 4px solid #8b5cf6;">`;
        html += `<h3 style="color: #0a1931; margin-bottom: 1rem; font-size: 1.3rem;">${escapeHtml(cutoff.caption || 'Cut Off')}</h3>`;
        
        if (cutoff.type === 'picture' && cutoff.imagePath) {
          // Use the imagePath as-is since it's already normalized by the server
          let imagePath = cutoff.imagePath;
          // Ensure it starts with / if it's a relative path
          if (!imagePath.startsWith('http') && !imagePath.startsWith('/') && !imagePath.startsWith('data:') && !imagePath.startsWith('blob:')) {
            imagePath = '/' + imagePath;
          }
          html += `<div style="margin-top: 1rem;">
            <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(cutoff.caption || 'Cut Off Image')}" 
                 style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div style="display: none; padding: 1rem; background: #fee; border-radius: 8px; color: #c33;">
              Image failed to load. Path: ${escapeHtml(imagePath)}
            </div>
          </div>`;
        } else if (cutoff.type === 'table' && cutoff.table) {
          html += `<div class="table-wrapper">${cutoff.table}</div>`;
        }
        
        html += `</div>`;
      });
    } else {
      // Fallback to legacy fields for backward compatibility
      if (exam.cutoffImagePath) {
        html += `<img src="${exam.cutoffImagePath}" alt="Previous Year Cut Off" />`;
      }
      if (exam.cutoffTable) {
        html += `<div class="table-wrapper">${exam.cutoffTable}</div>`;
      }
    }
    
    cutoffContent.innerHTML = html || '<div class="no-content">No cut off information available</div>';
  }
}

// Format text (preserve line breaks)
function formatText(text) {
  if (!text) return '';
  return text
    .replace(/\n/g, '<br>')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;br&gt;/g, '<br>');
}

// Show exam list view
function showExamListView() {
  const listView = document.getElementById('exam-list-view');
  const detailsView = document.getElementById('exam-details-view');
  const tocSidebar = document.getElementById('toc-sidebar');
  const mainContent = document.querySelector('.exam-pattern-main');
  
  if (listView) listView.style.display = 'block';
  if (detailsView) detailsView.style.display = 'none';
  if (tocSidebar) tocSidebar.style.display = 'none';
  if (mainContent) mainContent.classList.remove('with-sidebar');
}

// Show exam details view
function showExamDetailsView() {
  const listView = document.getElementById('exam-list-view');
  const detailsView = document.getElementById('exam-details-view');
  const tocSidebar = document.getElementById('toc-sidebar');
  const mainContent = document.querySelector('.exam-pattern-main');
  
  if (listView) listView.style.display = 'none';
  if (detailsView) detailsView.style.display = 'block';
  if (tocSidebar) tocSidebar.style.display = 'block';
  if (mainContent) mainContent.classList.add('with-sidebar');
}

// Show exam list (for back button)
function showExamList() {
  window.location.href = 'exam-pattern-syllabus.html';
}

// Setup table of contents navigation
function setupTableOfContents() {
  const tocLinks = document.querySelectorAll('.toc-link');
  const sections = document.querySelectorAll('.content-section');

  // Smooth scroll on click
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Update active state
        tocLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });

  // Update active link on scroll
  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        tocLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(section => {
    observer.observe(section);
  });
}

// Show error message
function showError(message) {
  const detailsView = document.getElementById('exam-details-view');
  if (detailsView) {
    detailsView.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h2 style="color: #e53e3e; margin-bottom: 1rem;">Error</h2>
        <p style="color: #64748b; margin-bottom: 2rem;">${escapeHtml(message)}</p>
        <button class="back-to-list-btn" onclick="showExamList()">
          <i class="fas fa-arrow-left"></i> Back to Exam List
        </button>
      </div>
    `;
    showExamDetailsView();
  }
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

