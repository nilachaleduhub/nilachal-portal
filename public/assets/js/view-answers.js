// view-answers.js: Handles the View Answers page with question-by-question analysis

let test = null;
let userAnswers = [];
let result = null;
let currentQuestionIndex = 0;
let questionStatuses = []; // 'correct', 'wrong', 'unattempted'

// Get query parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Load result and test data from server
async function loadResultData() {
    const resultId = getQueryParam('resultId');
    const testId = getQueryParam('testId');
    
    try {
        // If resultId is provided, load from server
        if (resultId) {
            const resultRes = await fetch(`/api/result/${resultId}`);
            const resultData = await resultRes.json();
            
            if (!resultData.success || !resultData.result) {
                throw new Error('Result not found');
            }
            
            result = resultData.result;
            
            // Load test data from server
            const testRes = await fetch(`/api/tests/${result.testId}`);
            const testData = await testRes.json();
            
            if (!testData.success || !testData.test) {
                throw new Error('Test not found');
            }
            
            test = testData.test;
            userAnswers = result.userAnswers || [];
            
            return { test, userAnswers, result };
        } 
        // If only testId is provided, try multiple sources
        else if (testId) {
            // First, try to find resultId from server (if user is logged in)
            let foundResultId = null;
            try {
                const userRaw = localStorage.getItem('user');
                if (userRaw) {
                    const user = JSON.parse(userRaw);
                    const userId = user.id || user._id;
                    if (userId) {
                        // Try to fetch the most recent result for this test and user
                        const resultsRes = await fetch(`/api/results?userId=${userId}`);
                        const resultsData = await resultsRes.json();
                        if (resultsData.success && Array.isArray(resultsData.results)) {
                            // Find the most recent result for this test
                            const matchingResult = resultsData.results.find(r => 
                                (r.testId === testId || r.testId === test?._id || r.testId === test?.id)
                            );
                            if (matchingResult && matchingResult._id) {
                                foundResultId = matchingResult._id;
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('Could not fetch result from server, using localStorage:', err);
            }
            
            // If we found a resultId, load from server (same as resultId path above)
            if (foundResultId) {
                const resultRes = await fetch(`/api/result/${foundResultId}`);
                const resultData = await resultRes.json();
                
                if (resultData.success && resultData.result) {
                    result = resultData.result;
                    
                    // Load test data from server
                    const testRes = await fetch(`/api/tests/${result.testId}`);
                    const testData = await testRes.json();
                    
                    if (testData.success && testData.test) {
                        test = testData.test;
                        userAnswers = result.userAnswers || [];
                        
                        return { test, userAnswers, result };
                    }
                }
            }
            
            // Fallback: Load test from server and answers from localStorage
            const testRes = await fetch(`/api/tests/${testId}`);
            const testData = await testRes.json();
            
            if (!testData.success || !testData.test) {
                throw new Error('Test not found');
            }
            
            test = testData.test;
            
            // Try to get answers from localStorage
            const answerData = localStorage.getItem('mockTestAnswers');
            const resultData = localStorage.getItem('testResult');
            
            if (answerData) {
                const parsed = JSON.parse(answerData);
                // Use answers array, but respect savedAnswers if available
                userAnswers = parsed.answers || [];
                
                // If savedAnswers exists, only consider those as attempted
                // This matches the logic used in submitTest()
                if (parsed.savedAnswers && Array.isArray(parsed.savedAnswers)) {
                    // Filter userAnswers to only include saved answers
                    const filteredAnswers = [];
                    for (let i = 0; i < userAnswers.length; i++) {
                        if (parsed.savedAnswers[i]) {
                            filteredAnswers[i] = userAnswers[i];
                        } else {
                            filteredAnswers[i] = undefined; // Mark as unattempted
                        }
                    }
                    userAnswers = filteredAnswers;
                }
            } else if (resultData) {
                // Fallback: try to get from testResult
                const parsed = JSON.parse(resultData);
                userAnswers = parsed.answers || [];
            } else {
                throw new Error('Answer data not found in localStorage. Please try accessing from dashboard.');
            }
            
            return { test, userAnswers, result: null };
        } else {
            throw new Error('No resultId or testId provided');
        }
    } catch (error) {
        console.error('Error loading result data:', error);
        throw error;
    }
}

// Determine question status and calculate statistics
function calculateQuestionStatuses() {
    questionStatuses = [];
    
    if (!test || !test.questions) return;
    
    for (let i = 0; i < test.questions.length; i++) {
        const q = test.questions[i];
        const userAns = userAnswers[i];
        
        // Determine correct answer index
        const correctIndex = (q.correctAnswer !== undefined && q.correctAnswer !== null) ? q.correctAnswer
            : (q.answer !== undefined && q.answer !== null) ? q.answer
            : (q.correct !== undefined && q.correct !== null) ? q.correct
            : null;
        
        // Determine status
        if (userAns === undefined || userAns === null) {
            questionStatuses.push('unattempted');
        } else if (correctIndex !== null && userAns === correctIndex) {
            questionStatuses.push('correct');
        } else {
            questionStatuses.push('wrong');
        }
    }
}

// Render question palette
function renderPalette() {
    const paletteGrid = document.getElementById('palette-grid');
    if (!paletteGrid || !test || !test.questions) return;
    
    paletteGrid.innerHTML = '';
    
    test.questions.forEach((q, index) => {
        const item = document.createElement('div');
        item.className = `palette-item ${questionStatuses[index] || 'unattempted'} ${index === currentQuestionIndex ? 'active' : ''}`;
        item.textContent = index + 1;
        item.addEventListener('click', () => {
            navigateToQuestion(index);
        });
        paletteGrid.appendChild(item);
    });
    
    document.getElementById('palette-container').style.display = 'block';
}

// Navigate to a specific question
function navigateToQuestion(index) {
    if (index < 0 || index >= (test?.questions?.length || 0)) return;
    
    currentQuestionIndex = index;
    renderQuestion();
    renderPalette();
    
    // Scroll to top of question card
    const questionCard = document.querySelector('.question-card');
    if (questionCard) {
        questionCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Update navigation buttons
    updateNavigationButtons();
}

// Update navigation buttons state
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
        prevBtn.disabled = currentQuestionIndex === 0;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentQuestionIndex === (test?.questions?.length || 0) - 1;
    }
}

// Decode HTML entities (handles multiple encodings)
function decodeHTML(str) {
    if (typeof str !== 'string') return '';
    
    let decoded = str;
    for (let j = 0; j < 3; j++) {
        const next = decoded
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
        if (next === decoded) break;
        decoded = next;
    }
    
    return decoded;
}

// Check if string contains HTML tags
function hasHTMLTags(str) {
    return /<\/?[a-z][\s\S]*>/i.test((str || '').trim());
}

// Escape HTML if needed
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

// Render a single question
function renderQuestion() {
    const container = document.getElementById('questions-container');
    if (!container || !test || !test.questions || currentQuestionIndex >= test.questions.length) return;
    
    const q = test.questions[currentQuestionIndex];
    const userAns = userAnswers[currentQuestionIndex];
    
    // Determine correct answer index
    const correctIndex = (q.correctAnswer !== undefined && q.correctAnswer !== null) ? q.correctAnswer
        : (q.answer !== undefined && q.answer !== null) ? q.answer
        : (q.correct !== undefined && q.correct !== null) ? q.correct
        : null;
    
    const status = questionStatuses[currentQuestionIndex] || 'unattempted';
    
    // Render question HTML
    const rawQuestion = typeof q.question === 'string' ? q.question : '';
    let decodedQuestion = decodeHTML(rawQuestion);
    const hasQuestionHtmlTags = hasHTMLTags(decodedQuestion);
    const displayQuestion = hasQuestionHtmlTags ? decodedQuestion : escapeHTML(decodedQuestion);
    
    // Question image
    let imageHTML = '';
    if (q.imageData && q.imageData.trim() !== '') {
        imageHTML = `<img src="${q.imageData}" alt="Question image" class="question-image" />`;
    }
    
    // Question table
    let tableHTML = '';
    if (q.tableData && q.tableData.trim() !== '') {
        tableHTML = `<div class="question-table">${q.tableData}</div>`;
    }
    
    // Options - Updated logic based on requirements
    const optionsHTML = (q.options || []).map((opt, idx) => {
        const escapedOpt = escapeHTML(String(opt || ''));
        let classes = ['option-item'];
        let labelClass = '';
        let icon = '';
        
        const isCorrect = correctIndex === idx;
        const isUserAnswer = userAns === idx;
        const isUnattempted = userAns === undefined || userAns === null;
        
        // Logic for highlighting:
        // 1. If unattempted: only show correct option with green + "Unattempted" label
        // 2. If user marked correct: show green
        // 3. If user marked wrong: show red for user's answer AND green for correct answer
        
        if (isUnattempted) {
            // Unattempted: only show correct option with green + "Unattempted" label
            if (isCorrect) {
                classes.push('correct');
                classes.push('unattempted-mark');
                labelClass = 'correct';
                icon = '✓';
            }
        } else {
            // User attempted
            if (isCorrect && isUserAnswer) {
                // User marked correct option
                classes.push('correct');
                classes.push('user-selected');
                labelClass = 'correct';
                icon = '✓';
            } else if (isCorrect && !isUserAnswer) {
                // Correct option but user didn't select it (wrong answer case)
                classes.push('correct');
                labelClass = 'correct';
                icon = '✓';
            } else if (!isCorrect && isUserAnswer) {
                // User marked wrong option
                classes.push('wrong');
                classes.push('user-selected');
                labelClass = 'wrong';
                icon = '✕';
            }
        }
        
        return `
            <li class="${classes.join(' ')}">
                <span class="option-label ${labelClass}">${String.fromCharCode(65 + idx)}.</span>
                <span class="option-text">${escapedOpt}</span>
                ${icon ? `<span style="margin-left: 8px; font-weight: 700; font-size: 1rem;">${icon}</span>` : ''}
            </li>
        `;
    }).join('');
    
    // Explanation
    const explanation = q.explanation || 'No explanation provided.';
    let decodedExplanation = decodeHTML(explanation);
    const hasExplanationHtmlTags = hasHTMLTags(decodedExplanation);
    const explanationHTML = hasExplanationHtmlTags ? decodedExplanation : escapeHTML(decodedExplanation);
    
    // Explanation image
    let explanationImageHTML = '';
    if (q.explanationImage && q.explanationImage.trim() !== '') {
        const cmToPx = 37.7952755906;
        let explanationImageStyle = 'max-width: 100%; height: auto; margin: 12px 0; border-radius: 8px; border: 1px solid var(--border-color); display: block;';
        
        if (q.explanationImageWidth && typeof q.explanationImageWidth === 'number' && q.explanationImageWidth > 0) {
            const widthPx = q.explanationImageWidth * cmToPx;
            explanationImageStyle += `width: ${widthPx}px; max-width: ${widthPx}px; min-width: 0;`;
        } else {
            explanationImageStyle += 'max-width: 100%; width: auto;';
        }
        
        if (q.explanationImageHeight && typeof q.explanationImageHeight === 'number' && q.explanationImageHeight > 0) {
            const heightPx = q.explanationImageHeight * cmToPx;
            explanationImageStyle += `height: ${heightPx}px; max-height: ${heightPx}px; min-height: 0; object-fit: contain;`;
        } else {
            explanationImageStyle += 'height: auto; max-height: none;';
        }
        
        explanationImageHTML = `<img src="${q.explanationImage}" alt="Explanation image" class="explanation-image" style="${explanationImageStyle}" />`;
    }
    
    // Status icon (✅ for correct, ❌ for wrong)
    let statusIcon = '';
    if (status === 'correct') {
        statusIcon = '<span class="question-status-icon correct">✓</span>';
    } else if (status === 'wrong') {
        statusIcon = '<span class="question-status-icon wrong">✕</span>';
    }
    
    // Build full HTML
    container.innerHTML = `
        <div class="question-card" id="question-card-${currentQuestionIndex}">
            <div class="question-header">
                <span class="question-label">
                    ${statusIcon}
                    Q${currentQuestionIndex + 1}.
                </span>
                <div class="question-content">${displayQuestion}</div>
            </div>
            ${imageHTML}
            ${tableHTML}
            <ul class="options-list">
                ${optionsHTML}
            </ul>
            <div class="explanation-section">
                <div class="explanation-title">Explanation:</div>
                <div class="explanation-content">${explanationHTML}</div>
                ${explanationImageHTML}
            </div>
        </div>
    `;
    
    container.style.display = 'block';
    document.getElementById('navigation').style.display = 'flex';
}

// Initialize the page
async function init() {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').style.display = 'none';
        
        const data = await loadResultData();
        test = data.test;
        userAnswers = data.userAnswers || [];
        result = data.result;
        
        // Set test title
        if (test) {
            document.getElementById('test-title').textContent = `Results: ${test.testName || test.name || 'Test'}`;
        }
        
        // Calculate question statuses
        calculateQuestionStatuses();
        
        // Set back button URL
        const backBtn = document.getElementById('back-to-result');
        if (backBtn && result && result._id) {
            backBtn.href = `result.html?resultId=${result._id}`;
            backBtn.style.display = 'inline-flex';
        } else {
            // Try to get resultId from URL params or localStorage
            const resultId = getQueryParam('resultId');
            if (resultId) {
                backBtn.href = `result.html?resultId=${resultId}`;
                backBtn.style.display = 'inline-flex';
            }
        }
        
        // Render initial question
        if (test && test.questions && test.questions.length > 0) {
            renderQuestion();
            renderPalette();
            updateNavigationButtons();
        } else {
            throw new Error('No questions found in test');
        }
        
        document.getElementById('loading').style.display = 'none';
        
    } catch (error) {
        console.error('Error initializing view answers:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = error.message || 'Error loading answers. Please try again.';
    }
}

// Navigation button handlers
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // Previous button
    document.getElementById('prev-btn')?.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            navigateToQuestion(currentQuestionIndex - 1);
        }
    });
    
    // Next button
    document.getElementById('next-btn')?.addEventListener('click', () => {
        if (test && currentQuestionIndex < test.questions.length - 1) {
            navigateToQuestion(currentQuestionIndex + 1);
        }
    });
});

