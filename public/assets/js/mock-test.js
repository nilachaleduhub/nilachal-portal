// Mock Test - Regular and Section Tests (No Sectional Timing)
// This file handles normal tests and tests with sections but without sectional timing

let test = {};
let answers = [];
let savedAnswers = [];
let marked = [];
let viewedQuestions = [];
let timeLeft = 0;
let timerInterval = null;
let currentQuestion = 0;

// Section-specific variables (for non-sectional timing tests)
let sections = [];
let currentSection = 0;
let sectionQuestionIndexes = [];
let sectionCompleted = [];

// Load test data from server
async function loadTest() {
  try {
    const testId = new URLSearchParams(window.location.search).get('testId');
    if (!testId) {
      throw new Error('No test ID provided');
    }

    // Clear any previous progress for this test to ensure fresh start
    // This ensures that every new attempt starts with blank answers
    try {
      const storedProgress = localStorage.getItem('testProgress');
      if (storedProgress) {
        const progress = JSON.parse(storedProgress);
        // Clear if it matches this test ID (user is starting a new attempt)
        if (progress && progress.testId === testId) {
          localStorage.removeItem('testProgress');
        }
      }
    } catch (err) {
      // If testProgress doesn't exist or is invalid, that's fine - just continue
      // We'll ensure fresh state by initializing arrays below
    }

    const response = await fetch(`/api/tests/${testId}`);
    if (!response.ok) {
      throw new Error('Failed to load test');
    }
    
    const data = await response.json();
    if (!data.success || !data.test) {
      throw new Error('Invalid test data');
    }

    // Store the test data and initialize state
    test = data.test;
    document.getElementById('test-title').textContent = test.name || 'Mock Test';

    // Initialize sections if they exist (for non-sectional timing tests)
    if (test.sections && Array.isArray(test.sections) && test.sections.length > 0) {
      console.log('Test has sections (non-sectional timing):', test.sections);
      sections = test.sections;
      
      // Show section header
      document.getElementById('section-header').style.display = 'block';
      
      // Initialize section-specific arrays
      sectionCompleted = new Array(sections.length).fill(false);
      
      // Update current section display
      updateSectionDisplay();
      
      // Show section navigation for non-sectional timing tests
      createSectionNavigationButtons();
      // Show section navigation buttons by default
      const sectionNavButtons = document.getElementById('section-nav-buttons');
      if (sectionNavButtons) {
        sectionNavButtons.style.display = 'flex';
      }
    } else {
      console.log('Test has no sections - regular test');
      // Hide section-related elements for non-sectional tests
      document.getElementById('section-header').style.display = 'none';
      sections = [];
    }

    // Ensure questions array exists
    if (!Array.isArray(test.questions) || test.questions.length === 0) {
      throw new Error('No questions found in test');
    }

    // Initialize arrays
    answers = new Array(test.questions.length).fill(undefined);
    marked = new Array(test.questions.length).fill(false);
    savedAnswers = new Array(test.questions.length).fill(false);
    viewedQuestions = new Array(test.questions.length).fill(false);

    // Prepare section question indexes if sections exist
    if (sections.length > 0) {
      updateSectionQuestionIndexes();
      currentQuestion = 0;
    }
    
    // Render the first question and start timer
    renderSidebar();
    renderQuestion();
    startTimer();

  } catch (error) {
    console.error('Error loading test:', error);
    alert('Could not load test data. Please try again.');
    window.location.href = 'index.html';
  }
}

// Update the list of question indexes for the current section
function updateSectionQuestionIndexes() {
  if (!sections.length) {
    sectionQuestionIndexes = test.questions.map((_, idx) => idx);
    return;
  }
  sectionQuestionIndexes = test.questions
    .map((q, idx) => (q.sectionIndex === currentSection ? idx : null))
    .filter(idx => idx !== null);
}

// Update section display
function updateSectionDisplay() {
  if (!sections.length) return;
  
  // Update navigation button text for section-wise tests
  updateNavigationButtons();
}

// Update navigation button text and states
function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  if (!prevBtn || !nextBtn) return;
  
  // Simple navigation button text
  prevBtn.textContent = '← Previous';
  nextBtn.textContent = 'Next →';
}

// Create section navigation buttons for non-sectional timing tests
function createSectionNavigationButtons() {
  if (!sections.length) return;
  
  const sectionButtonsContainer = document.getElementById('section-nav-buttons');
  if (!sectionButtonsContainer) return;
  
  sectionButtonsContainer.innerHTML = '';
  
  sections.forEach((section, index) => {
    const button = document.createElement('button');
    button.className = 'section-nav-btn';
    button.textContent = section.name || `Section ${index + 1}`;
    button.style.cssText = `
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s ease;
      border: 2px solid #e2e8f0;
      background: white;
      color: #374151;
      cursor: pointer;
      ${index === currentSection ? 'background: #3b82f6; color: white; border-color: #3b82f6;' : ''}
    `;
    
    button.addEventListener('click', () => {
      if (index !== currentSection) {
        currentSection = index;
        currentQuestion = 0;
        updateSectionQuestionIndexes();
        updateSectionDisplay();
        renderSidebar();
        renderQuestion();
        updateSectionNavigationButtons();
      }
    });
    
    sectionButtonsContainer.appendChild(button);
  });
}

// Update section navigation button states
function updateSectionNavigationButtons() {
  const sectionButtons = document.querySelectorAll('.section-nav-btn');
  sectionButtons.forEach((button, index) => {
    if (index === currentSection) {
      button.style.background = '#3b82f6';
      button.style.color = 'white';
      button.style.borderColor = '#3b82f6';
    } else {
      button.style.background = '';
      button.style.color = '';
      button.style.borderColor = '';
    }
  });
}

function renderSidebar() {
  const nav = document.getElementById('question-nav');
  nav.innerHTML = '';
  
  // Mark current question as viewed
  viewedQuestions[currentQuestion] = true;
  
  // If no sections, show all questions as before
  const qIndexes = sections.length > 0 ? sectionQuestionIndexes : test.questions.map((_, idx) => idx);
  for (let i = 0; i < qIndexes.length; i++) {
    const qIdx = qIndexes[i];
    const btn = document.createElement('button');
    btn.className = 'q-btn';
    
    // If question has been viewed but not answered
    if (viewedQuestions[qIdx] && !savedAnswers[qIdx] && !marked[qIdx]) {
      btn.classList.add('viewed');
    }
    // If question has been attempted and saved
    if (savedAnswers[qIdx]) {
      btn.classList.remove('viewed');
      btn.classList.add('answered');
    }
    // If question is marked for review
    if (marked[qIdx]) {
      btn.classList.remove('viewed', 'answered');
      btn.classList.add('marked');
    }
    // Default state - plain color for completely unattempted questions
    if (!viewedQuestions[qIdx] && !savedAnswers[qIdx] && !marked[qIdx]) {
      btn.classList.remove('viewed', 'answered', 'marked');
    }
    
    btn.textContent = i + 1;
    btn.onclick = () => { 
      currentQuestion = i; 
      renderQuestion(); 
    };
    nav.appendChild(btn);
  }
  
  document.getElementById('answered-count').textContent = savedAnswers.filter(s => s).length;
}

function renderQuestion() {
  renderSidebar();
  
  // Determine which question to show
  let qIdx;
  if (sections.length > 0) {
    qIdx = sectionQuestionIndexes[currentQuestion];
  } else {
    qIdx = currentQuestion;
  }
  
  const q = test.questions[qIdx];
  const block = document.getElementById('question-block');
  
  // Clear and rebuild question display
  block.innerHTML = '';
  
  // Create question card wrapper
  const questionCard = document.createElement('div');
  questionCard.className = 'question-card';
  
  // Question text (render rich text from admin)
  const qText = document.createElement('div');
  qText.className = 'question-text';
  const rawQuestion = typeof q.question === 'string' ? q.question : '';
  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(rawQuestion.trim());
  const displayQuestion = hasHtmlTags
    ? rawQuestion
    : String(rawQuestion || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
  qText.innerHTML = `
    <span class="q-number"><b>Q${(currentQuestion + 1)}.</b></span>
    <span class="q-text-content">${displayQuestion}</span>
  `;
  questionCard.appendChild(qText);
  
  // Question image (if available)
  // Check for imageData in multiple possible formats
  const imageData = q.imageData || q.image || q.img || '';
  if (imageData && typeof imageData === 'string' && imageData.trim() !== '' && imageData !== 'undefined' && !imageData.startsWith('undefined')) {
    const qImage = document.createElement('img');
    qImage.src = imageData;
    qImage.style.marginTop = '12px';
    qImage.style.marginBottom = '12px';
    qImage.style.borderRadius = '8px';
    qImage.style.border = '1px solid #e2e8f0';
    qImage.style.display = 'block';
    qImage.alt = 'Question image';
    
    // Apply custom dimensions if provided (convert cm to pixels: 1cm ≈ 37.8px at 96 DPI)
    const cmToPx = 37.7952755906; // Conversion factor: 1cm = 37.7952755906px at 96 DPI
    if (q.imageWidth && typeof q.imageWidth === 'number' && q.imageWidth > 0) {
      const widthPx = q.imageWidth * cmToPx;
      qImage.style.width = widthPx + 'px';
      qImage.style.maxWidth = widthPx + 'px'; // Set maxWidth to same value to enforce custom size
      qImage.style.minWidth = '0'; // Allow shrinking if container is smaller
    } else {
      qImage.style.maxWidth = '100%';
      qImage.style.width = 'auto';
    }
    
    if (q.imageHeight && typeof q.imageHeight === 'number' && q.imageHeight > 0) {
      const heightPx = q.imageHeight * cmToPx;
      qImage.style.height = heightPx + 'px';
      qImage.style.maxHeight = heightPx + 'px'; // Set maxHeight to same value to enforce custom size
      qImage.style.minHeight = '0'; // Allow shrinking if container is smaller
      qImage.style.objectFit = 'contain'; // Maintain aspect ratio
    } else {
      qImage.style.height = 'auto';
      qImage.style.maxHeight = 'none';
    }
    
    qImage.onerror = function() {
      console.error('Failed to load question image:', imageData);
      this.style.display = 'none';
    };
    questionCard.appendChild(qImage);
  }
  
  // Question table (if available)
  const tableData = q.tableData || '';
  if (tableData && typeof tableData === 'string' && tableData.trim() !== '' && tableData !== 'undefined' && !tableData.startsWith('undefined')) {
    const qTable = document.createElement('div');
    qTable.style.marginTop = '12px';
    qTable.style.marginBottom = '12px';
    qTable.style.display = 'inline-block';
    qTable.style.width = 'auto';
    qTable.innerHTML = tableData;
    // Auto-resize table cells based on content
    const table = qTable.querySelector('table');
    if (table) {
      table.style.width = 'auto';
      table.style.borderCollapse = 'collapse';
      table.style.tableLayout = 'auto';
      table.style.maxWidth = '100%';
      const cells = table.querySelectorAll('td');
      cells.forEach(td => {
        td.style.verticalAlign = 'top';
        td.style.wordWrap = 'break-word';
        td.style.whiteSpace = 'pre-wrap';
        td.style.height = 'auto';
        td.style.minHeight = 'auto';
        td.style.width = 'auto';
        td.style.maxWidth = 'none';
        // Force browser to recalculate height based on content
        td.style.display = 'table-cell';
      });
      // After a brief delay, ensure all cells have proper height
      setTimeout(() => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(tr => {
          let maxHeight = 0;
          const rowCells = tr.querySelectorAll('td');
          rowCells.forEach(td => {
            const cellHeight = td.scrollHeight || td.offsetHeight;
            maxHeight = Math.max(maxHeight, cellHeight);
          });
          // Set all cells in row to same height if needed
          if (maxHeight > 30) {
            rowCells.forEach(td => {
              td.style.minHeight = maxHeight + 'px';
            });
          }
        });
      }, 50);
    }
    questionCard.appendChild(qTable);
  }
  
  // Options list
  const options = document.createElement('ul');
  options.className = 'options-list';
  
  // Ensure options array exists
  if (Array.isArray(q.options)) {
    q.options.forEach((opt, idx) => {
      const li = document.createElement('li');
      li.className = 'option-item';
      const label = document.createElement('label');
      label.className = 'option-label' + (answers[qIdx] === idx ? ' selected' : '');
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'option';
      radio.value = idx;
      radio.checked = answers[qIdx] === idx;
      radio.onchange = () => { 
        answers[qIdx] = idx;
        renderQuestion(); 
      };
      
      label.appendChild(radio);
      label.appendChild(document.createTextNode(opt));
      li.appendChild(label);
      options.appendChild(li);
    });
  }
  
  questionCard.appendChild(options);
  
  // Append question card to block
  block.appendChild(questionCard);
  
  // Update navigation buttons for section-wise tests
  if (sections.length > 0) {
    updateNavigationButtons();
  }
}

function updateTimer() {
  const timer = document.getElementById('timer');
  const min = Math.floor(timeLeft / 60);
  const sec = timeLeft % 60;
  timer.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    submitTest();
  }
}

function startTimer() {
  timeLeft = parseInt(test.timeLimit || 30) * 60;
  updateTimer();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimer();
  }, 1000);
}

function submitTest() {
  clearInterval(timerInterval);
  
  // Calculate results
  let attempted = 0, correct = 0, incorrect = 0, score = 0;
  const positiveMark = parseFloat(test.positiveMark || 1);
  const negativeMark = parseFloat(test.negativeMark || 0);

  // Only count answers that the user explicitly saved (savedAnswers)
  for (let idx = 0; idx < test.questions.length; idx++) {
    const question = test.questions[idx];
    const ans = answers[idx];
    // Determine the correct answer index robustly (handle 0 values)
    const correctIndex = (question.correctAnswer !== undefined && question.correctAnswer !== null) ? question.correctAnswer
      : (question.answer !== undefined && question.answer !== null) ? question.answer
      : (question.correct !== undefined && question.correct !== null) ? question.correct
      : null;

    if (savedAnswers && savedAnswers[idx]) {
      // Only consider saved answers as attempted
      if (ans !== undefined && ans !== null) {
        attempted++;
        if (correctIndex !== null && ans === correctIndex) {
          correct++;
          score += positiveMark;
        } else {
          incorrect++;
          score -= negativeMark;
        }
      }
    }
  }

  // Save test data for result page (include savedAnswers so results count saved answers only)
  localStorage.setItem('mockTestAnswers', JSON.stringify({
    testId: test._id || test.id || '',
    answers,
    savedAnswers,
    marked,
    timeTaken: (parseInt(test.timeLimit || 30) * 60) - timeLeft
  }));
  
  // Save result data
  localStorage.setItem('testResult', JSON.stringify({
    testId: test._id || test.id || '',
    score: score,
    totalMarks: test.questions.length * positiveMark,
    correct,
    incorrect,
    unattempted: test.questions.length - attempted,
    timeTaken: formatTime((parseInt(test.timeLimit || 30) * 60) - timeLeft),
    answers,
    savedAnswers
  }));

  // Store a lightweight version of the test for the results page.
  // This avoids QuotaExceededError for very large tests (many questions / images).
  try {
    const lightTest = {
      _id: test._id || test.id || '',
      id: test.id,
      testName: test.testName,
      name: test.name,
      positiveMark: test.positiveMark,
      negativeMark: test.negativeMark,
      marksPerQuestion: test.marksPerQuestion,
      negativeMarks: test.negativeMarks,
      sections: Array.isArray(test.sections) ? test.sections : [],
      sectionalTiming: !!test.sectionalTiming,
      // Strip heavy fields (images, big blobs) from each question while keeping
      // text, options and answers needed by the result page.
      questions: Array.isArray(test.questions) ? test.questions.map(q => ({
        question: q.question,
        options: q.options,
        answer: q.answer,
        correct: q.correct,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        tableData: q.tableData,
        sectionIndex: q.sectionIndex
      })) : []
    };
    localStorage.setItem('previewTest', JSON.stringify(lightTest));
  } catch (err) {
    console.warn('Could not store previewTest in localStorage (possibly quota exceeded)', err);
  }
  
  // Try to send result to server if user is logged in
  try {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      // POST result to server (don't block navigation)
      fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: test._id || test.id || '',
          testName: test.name || test.testName || '',
          userId: user.id || user._id || '',
          userName: user.name || '',
          name: user.email || '',
          score,
          totalMarks: test.questions.length * positiveMark,
          correct,
          incorrect,
          unattempted: test.questions.length - attempted,
          timeTaken: formatTime((parseInt(test.timeLimit || 30) * 60) - timeLeft),
          userAnswers: answers // Include user's answers for analysis
        })
      }).catch(err => console.warn('Could not sync result to server', err));
    }
  } catch (e) { console.warn('No user to sync result with'); }

  window.location.href = `result.html?testId=${test._id || test.id || ''}`;
}

// Format time in MM:SS format
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Set up navigation buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const clearBtn = document.getElementById('clear-btn');
    const markBtn = document.getElementById('mark-btn');
    const submitBtn = document.getElementById('submit-btn');
    const saveBtn = document.getElementById('save-btn');

    // Previous button
    prevBtn.addEventListener('click', () => {
        if (sections.length > 0) {
            // For section-wise tests, navigate within current section only
            if (currentQuestion > 0) {
                currentQuestion--;
                renderQuestion();
            }
        } else {
            // For non-section tests, normal navigation
            if (currentQuestion > 0) {
                currentQuestion--;
                renderQuestion();
            }
        }
    });

    // Next button
    nextBtn.addEventListener('click', () => {
        if (sections.length > 0) {
            // For section-wise tests, navigate within current section only
            if (currentQuestion < sectionQuestionIndexes.length - 1) {
                currentQuestion++;
                renderQuestion();
            }
        } else {
            // For non-section tests, normal navigation
            if (currentQuestion < test.questions.length - 1) {
                currentQuestion++;
                renderQuestion();
            }
        }
    });

    // Mark for review button
    markBtn.addEventListener('click', () => {
        // Get the actual question index
        let qIdx;
        if (sections.length > 0) {
            qIdx = sectionQuestionIndexes[currentQuestion];
        } else {
            qIdx = currentQuestion;
        }
        
        marked[qIdx] = !marked[qIdx];
        // Persist mark state in progress
        try {
            const progress = JSON.parse(localStorage.getItem('testProgress')) || {};
            progress.testId = test._id || test.id || '';
            progress.answers = answers;
            progress.savedAnswers = savedAnswers;
            progress.marked = marked;
            progress.currentQuestion = currentQuestion;
            progress.timeLeft = timeLeft;
            localStorage.setItem('testProgress', JSON.stringify(progress));
        } catch (err) { console.warn('Could not save mark state', err); }
        renderSidebar();
        renderQuestion();
    });

    // Clear button
    clearBtn.addEventListener('click', () => {
        // Get the actual question index
        let qIdx;
        if (sections.length > 0) {
            qIdx = sectionQuestionIndexes[currentQuestion];
        } else {
            qIdx = currentQuestion;
        }
        
        // Clear current selection and saved state for the current question
        answers[qIdx] = undefined;
        savedAnswers[qIdx] = false;
        // Persist changes
        try {
            const progress = JSON.parse(localStorage.getItem('testProgress')) || {};
            progress.testId = test._id || test.id || '';
            progress.answers = answers;
            progress.savedAnswers = savedAnswers;
            progress.marked = marked;
            progress.currentQuestion = currentQuestion;
            progress.timeLeft = timeLeft;
            localStorage.setItem('testProgress', JSON.stringify(progress));
        } catch (err) { console.warn('Could not persist clear action', err); }
        renderSidebar();
        renderQuestion();
    });

    // Submit test button
    submitBtn.addEventListener('click', () => {
        // Count attempted and unattempted questions
        let attempted = 0;
        let unattempted = 0;
        for (let i = 0; i < savedAnswers.length; i++) {
            if (savedAnswers[i]) {
                attempted++;
            } else {
                unattempted++;
            }
        }
        const msg = `Are you sure you want to submit this test?\n\nAttempted Questions: ${attempted}\nUnattempted Questions: ${unattempted}`;
        if (confirm(msg)) {
            submitTest();
        }
    });

    // Save and next button
    saveBtn.addEventListener('click', () => {
        // Get the actual question index
        let qIdx;
        if (sections.length > 0) {
            qIdx = sectionQuestionIndexes[currentQuestion];
        } else {
            qIdx = currentQuestion;
        }
        
        if (answers[qIdx] === undefined) {
            alert('Please select an answer before saving.');
            return;
        }
        savedAnswers[qIdx] = true;
        
        // Update the question number button to green
        const questionButtons = document.querySelectorAll('.q-btn');
        if (questionButtons[currentQuestion]) {
            questionButtons[currentQuestion].style.backgroundColor = '#10b981';
            questionButtons[currentQuestion].style.color = '#fff';
        }

        // Save current progress to localStorage
        try {
            localStorage.setItem('testProgress', JSON.stringify({
                testId: test._id || test.id || '',
                answers,
                savedAnswers,
                marked,
                currentQuestion,
                timeLeft
            }));
        } catch (err) {
            console.warn('Could not save progress', err);
        }
        
        // After saving, move to next question if possible
        if (sections.length > 0) {
            if (currentQuestion < sectionQuestionIndexes.length - 1) {
                currentQuestion++;
                renderQuestion();
            }
        } else {
            if (currentQuestion < test.questions.length - 1) {
                currentQuestion++;
                renderQuestion();
            }
        }
    });

    // Load and start the test
    await loadTest();

    // Note: Previous progress restoration has been removed to ensure fresh start on each attempt
    // The test now always starts with blank answers, even if the user previously attempted it
});