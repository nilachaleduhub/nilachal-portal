// Mock Test - Sectional Timing Version
// This file handles tests with sections and sectional timing

let test = {};
let answers = [];
let savedAnswers = [];
let marked = [];
let viewedQuestions = [];
let timeLeft = 0;
let timerInterval = null;
let currentQuestion = 0;

// Section-specific variables
let sections = [];
let currentSection = 0;
let sectionQuestionIndexes = [];
let sectionTimeLeft = [];
let sectionTimers = {};
let sectionCompleted = [];

// Load test data from server
async function loadTest() {
  try {
    const testId = new URLSearchParams(window.location.search).get('testId');
    if (!testId) {
      throw new Error('No test ID provided');
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
    
    // Hide the main timer for sectional timing tests
    const mainTimer = document.getElementById('timer');
    if (mainTimer) {
      mainTimer.style.display = 'none';
    }

    // Initialize sections (required for sectional timing tests)
    if (!test.sections || !Array.isArray(test.sections) || test.sections.length === 0) {
      throw new Error('This test requires sections for sectional timing');
    }

    console.log('Loading sectional timing test with sections:', test.sections);
    sections = test.sections;
    
    // Show section header
    document.getElementById('section-header').style.display = 'block';
    
    // Initialize section-specific arrays
    sectionCompleted = new Array(sections.length).fill(false);
    sectionTimers = {};
    sectionTimeLeft = sections.map(section => (section.timeLimit || 30) * 60);
    
    console.log('Section time limits:', sections.map(s => s.timeLimit));
    console.log('Section time left (seconds):', sectionTimeLeft);
    
    // Update current section display
    updateSectionDisplay();
    
    // Start section timer for first section
    startSectionTimer();

    // Ensure questions array exists
    if (!Array.isArray(test.questions) || test.questions.length === 0) {
      throw new Error('No questions found in test');
    }

    // Initialize arrays
    answers = new Array(test.questions.length).fill(undefined);
    marked = new Array(test.questions.length).fill(false);
    savedAnswers = new Array(test.questions.length).fill(false);
    viewedQuestions = new Array(test.questions.length).fill(false);

    // Prepare section question indexes
    updateSectionQuestionIndexes();
    currentQuestion = 0;

    // Render the first question and start timer
    renderSidebar();
    renderQuestion();
    
    // For sectional timing tests, we don't need the main timer
    // The section timer will handle the countdown
    // startTimer(); // Disabled for sectional timing tests

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
  
  // Update all sections display
  const allSectionsEl = document.getElementById('all-sections-display');
  if (allSectionsEl && sections.length > 0) {
    const sectionsText = sections.map((section, index) => {
      const sectionName = section.name || `Section ${index + 1}`;
      const isCurrent = index === currentSection;
      const isCompleted = sectionCompleted[index];
      
      if (isCurrent) {
        return `<span style="color: #1e40af; font-weight: 800;">${sectionName}</span>`;
      } else if (isCompleted) {
        return `<span style="color: #22c55e; font-weight: 600;">${sectionName}</span>`;
      } else {
        return `<span style="color: #64748b; font-weight: 600;">${sectionName}</span>`;
      }
    }).join(' ');
    allSectionsEl.innerHTML = sectionsText;
  }
  
  // Update navigation button text
  updateNavigationButtons();
}

// Update navigation button text and states
function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  if (!prevBtn || !nextBtn) return;
  
  // Simple navigation button text for sectional timing tests
  prevBtn.textContent = '← Previous';
  nextBtn.textContent = 'Next →';
}

// Start section timer
function startSectionTimer() {
  if (!sections.length) return;
  
  const sectionTimerEl = document.getElementById('section-timer');
  if (!sectionTimerEl) return;
  
  const updateSectionTimer = () => {
    const min = Math.floor(sectionTimeLeft[currentSection] / 60);
    const sec = sectionTimeLeft[currentSection] % 60;
    sectionTimerEl.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    
    console.log(`Section ${currentSection + 1} timer: ${min}:${sec.toString().padStart(2, '0')}`);
    
    if (sectionTimeLeft[currentSection] <= 0) {
      // Auto-submit section when time runs out
      submitSection();
    }
  };
  
  updateSectionTimer();
  const sectionTimerInterval = setInterval(() => {
    sectionTimeLeft[currentSection]--;
    updateSectionTimer();
  }, 1000);
  
  // Store interval ID for cleanup
  sectionTimers[currentSection] = sectionTimerInterval;
}

// Submit current section
function submitSection() {
  if (!sections.length) return;
  
  // Mark current section as completed
  sectionCompleted[currentSection] = true;
  
  // Clear section timer
  if (sectionTimers[currentSection]) {
    clearInterval(sectionTimers[currentSection]);
    sectionTimers[currentSection] = null;
  }
  
  // Move to next section or submit test
  if (currentSection < sections.length - 1) {
    currentSection++;
    currentQuestion = 0;
    updateSectionQuestionIndexes();
    updateSectionDisplay();
    renderSidebar();
    renderQuestion();
    
    // Start timer for next section
    startSectionTimer();
  } else {
    // All sections completed, submit the test
    submitTest();
  }
}

function renderSidebar() {
  const nav = document.getElementById('question-nav');
  nav.innerHTML = '';
  
  // Mark current question as viewed (use global question index)
  const currentGlobalQIdx = sectionQuestionIndexes[currentQuestion];
  if (typeof currentGlobalQIdx === 'number') {
    viewedQuestions[currentGlobalQIdx] = true;
  }
  
  // Show questions for current section only
  for (let i = 0; i < sectionQuestionIndexes.length; i++) {
    const qIdx = sectionQuestionIndexes[i];
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
  
  // Count answered in the current section only
  let answeredInSection = 0;
  for (let i = 0; i < sectionQuestionIndexes.length; i++) {
    const idx = sectionQuestionIndexes[i];
    if (savedAnswers[idx]) answeredInSection++;
  }
  document.getElementById('answered-count').textContent = answeredInSection;
}

function renderQuestion() {
  renderSidebar();
  
  // Get question index for current section
  const qIdx = sectionQuestionIndexes[currentQuestion];
  const q = test.questions[qIdx];
  const block = document.getElementById('question-block');
  
  // Clear and rebuild question display
  block.innerHTML = '';
  
  // Question text
  const qText = document.createElement('div');
  qText.className = 'question-text';
  // Escape HTML and preserve line breaks
  const escapedQuestion = String(q.question || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  qText.innerHTML = `<b>Q${(currentQuestion + 1)}.</b> ${escapedQuestion}`;
  block.appendChild(qText);
  
  // Question image (if available)
  // Check for imageData in multiple possible formats
  const imageData = q.imageData || q.image || q.img || '';
  if (imageData && typeof imageData === 'string' && imageData.trim() !== '' && imageData !== 'undefined' && !imageData.startsWith('undefined')) {
    const qImage = document.createElement('img');
    qImage.src = imageData;
    qImage.style.maxWidth = '100%';
    qImage.style.height = 'auto';
    qImage.style.marginTop = '12px';
    qImage.style.marginBottom = '12px';
    qImage.style.borderRadius = '8px';
    qImage.style.border = '1px solid #e2e8f0';
    qImage.style.display = 'block';
    qImage.alt = 'Question image';
    qImage.onerror = function() {
      console.error('Failed to load question image:', imageData);
      this.style.display = 'none';
    };
    block.appendChild(qImage);
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
  
  block.appendChild(options);
  
  // Update navigation buttons
  updateNavigationButtons();
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
  
  // Clear all section timers
  Object.values(sectionTimers).forEach(timer => {
    if (timer) clearInterval(timer);
  });
  
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
  // Compute per-section time taken if sectional timing is enabled
  let sectionTimeTaken = [];
  try {
    if (Array.isArray(sections) && sections.length > 0 && test.sectionalTiming) {
      sectionTimeTaken = sections.map((s, i) => {
        const totalSec = (parseInt(s.timeLimit || 30) * 60) || 0;
        const remaining = typeof sectionTimeLeft[i] === 'number' ? sectionTimeLeft[i] : totalSec;
        const spent = Math.max(0, totalSec - remaining);
        return spent;
      });
    }
  } catch (e) { sectionTimeTaken = []; }

  localStorage.setItem('mockTestAnswers', JSON.stringify({
    testId: test._id || test.id || '',
    answers,
    savedAnswers,
    marked,
    timeTaken: (parseInt(test.timeLimit || 30) * 60) - timeLeft,
    sectionTimeTaken
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

  localStorage.setItem('previewTest', JSON.stringify(test)); // Store test for results page
  
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
    const sectionSubmitBtn = document.getElementById('section-submit');

    // Previous button - navigate within current section only
    prevBtn.addEventListener('click', () => {
        if (currentQuestion > 0) {
            currentQuestion--;
            renderQuestion();
        }
    });

    // Next button - navigate within current section only
    nextBtn.addEventListener('click', () => {
        if (currentQuestion < sectionQuestionIndexes.length - 1) {
            currentQuestion++;
            renderQuestion();
        }
    });

    // Mark for review button
    markBtn.addEventListener('click', () => {
        // Get the actual question index
        const qIdx = sectionQuestionIndexes[currentQuestion];
        
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
        const qIdx = sectionQuestionIndexes[currentQuestion];
        
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

    // Section submit button event listener
    if (sectionSubmitBtn) {
        sectionSubmitBtn.addEventListener('click', () => {
            if (sections.length > 0) {
                const msg = `Are you sure you want to submit the current section? You cannot return to this section once submitted.`;
                if (confirm(msg)) {
                    submitSection();
                }
            }
        });
    }

    // Save and next button
    saveBtn.addEventListener('click', () => {
        // Get the actual question index
        const qIdx = sectionQuestionIndexes[currentQuestion];
        
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
        if (currentQuestion < sectionQuestionIndexes.length - 1) {
            currentQuestion++;
            renderQuestion();
        }
    });

    // Load and start the test
    await loadTest();

    // Try to restore previous progress
    try {
        const progress = JSON.parse(localStorage.getItem('testProgress'));
        if (progress && progress.testId === (test._id || test.id)) {
            answers = progress.answers;
            savedAnswers = progress.savedAnswers;
            marked = progress.marked;
            currentQuestion = progress.currentQuestion;
            timeLeft = progress.timeLeft;
            renderSidebar();
            renderQuestion();
        }
    } catch (err) {
        console.warn('Could not restore progress', err);
    }
});
