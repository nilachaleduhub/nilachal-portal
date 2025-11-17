// result.js: Handles result calculation and display for mock test

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function loadTestAndAnswers() {
  const resultId = getQueryParam('resultId');
  const testId = getQueryParam('testId');
  
  // If resultId is provided, load from server
  if (resultId) {
    return loadResultFromServer(resultId);
  }
  
  // Otherwise, load from localStorage (existing behavior)
  const testData = localStorage.getItem('previewTest');
  const answerData = localStorage.getItem('mockTestAnswers');
  if (!testData || !answerData) return null;
  const test = JSON.parse(testData);
  const answers = JSON.parse(answerData);
  return { test, answers };
}

async function loadResultFromServer(resultId) {
  try {
    const response = await fetch(`/api/result/${resultId}`);
    const data = await response.json();
    
    if (!data.success || !data.result) {
      throw new Error('Result not found');
    }
    
    const result = data.result;
    
    // Load test data from server
    const testResponse = await fetch(`/api/tests/${result.testId}`);
    const testData = await testResponse.json();
    
    if (!testData.success || !testData.test) {
      throw new Error('Test not found');
    }
    
    const test = testData.test;
    
    // Convert result data to the format expected by renderResult
    const answers = {
      answers: result.userAnswers || [],
      savedAnswers: result.userAnswers || [],
      timeTaken: result.timeTaken || 0
    };
    
    return { test, answers, result };
  } catch (error) {
    console.error('Error loading result from server:', error);
    alert('Error loading test result. Please try again.');
    window.location.href = 'dashboard.html';
    return null;
  }
}

async function renderResult() {
  const data = await loadTestAndAnswers();
  if (!data) {
    alert('Result data not found.');
    window.location.href = 'index.html';
    return;
  }
  const { test, answers } = data;
  document.getElementById('test-title').textContent = test.testName || test.name || 'Test Result';
  let attempted = 0, correct = 0, wrong = 0, score = 0;
  const posMark = parseFloat(test.positiveMark || test.marksPerQuestion || 1);
  const negMark = parseFloat(test.negativeMark || test.negativeMarks || 0);
  const qList = document.getElementById('questions-list');
  qList.innerHTML = '';
  for (let i = 0; i < test.questions.length; i++) {
    const q = test.questions[i];
    const userAns = (answers && answers.answers) ? answers.answers[i] : undefined;
    const saved = (answers && answers.savedAnswers) ? answers.savedAnswers[i] : undefined;
    let status = 'unattempted';
    let qScore = 0;

    // Determine correct index robustly
    const correctIndex = (q.correctAnswer !== undefined && q.correctAnswer !== null) ? q.correctAnswer
      : (q.answer !== undefined && q.answer !== null) ? q.answer
      : (q.correct !== undefined && q.correct !== null) ? q.correct
      : null;

    // Consider an answer only if it was saved; if saved info is missing, fall back to any provided answer
    const consider = (saved !== undefined) ? !!saved : (userAns !== undefined && userAns !== null);
    if (consider) {
      attempted++;
      if (correctIndex !== null && userAns === correctIndex) {
        correct++;
        qScore = posMark;
        status = 'correct';
      } else {
        wrong++;
        qScore = -negMark;
        status = 'wrong';
      }
    }
    score += qScore;
    // Render question result
    const qDiv = document.createElement('div');
    qDiv.className = `question-result ${status}`;
    // Escape HTML and preserve line breaks for question text
    const escapedQuestion = String(q.question || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    // Escape HTML for options
    const escapedOptions = q.options.map((opt, idx) => {
      const escapedOpt = String(opt || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      let cls = '';
      if ((q.answer === idx || q.correct === idx)) cls = 'correct';
      if (userAns === idx && (q.answer !== idx && q.correct !== idx)) cls = 'wrong';
      if (userAns === idx) cls += ' selected';
      return `<li class="option-item ${cls}">${String.fromCharCode(65 + idx)}. ${escapedOpt}</li>`;
    }).join('');
    // Escape HTML for explanation
    const escapedExplanation = String(q.explanation || 'No explanation provided.')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    // Build image HTML if available
    let imageHTML = '';
    if (q.imageData && q.imageData.trim() !== '') {
      imageHTML = `<img src="${q.imageData}" alt="Question image" style="max-width: 100%; height: auto; margin: 12px 0; border-radius: 8px; border: 1px solid #e2e8f0;" />`;
    }
    
    // Build explanation image HTML if available
    let explanationImageHTML = '';
    if (q.explanationImage && q.explanationImage.trim() !== '') {
      explanationImageHTML = `<img src="${q.explanationImage}" alt="Explanation image" style="max-width: 100%; height: auto; margin: 8px 0; border-radius: 8px; border: 1px solid #e2e8f0;" />`;
    }
    
    // Build table HTML if available
    let tableHTML = '';
    if (q.tableData && q.tableData.trim() !== '') {
      tableHTML = `<div style="margin: 12px 0;">${q.tableData}</div>`;
    }
    
    qDiv.innerHTML = `
      <div class="question-title"><b>Q${i + 1}.</b> ${escapedQuestion}</div>
      ${imageHTML}
      ${tableHTML}
      <ul class="option-list">
        ${escapedOptions}
      </ul>
      <div><b>Your Answer:</b> ${userAns !== undefined && userAns !== null ? String.fromCharCode(65 + userAns) : '<span style="color:#64748b">Not Attempted</span>'}</div>
      <div><b>Correct Answer:</b> ${q.answer !== undefined ? String.fromCharCode(65 + q.answer) : (q.correct !== undefined ? String.fromCharCode(65 + q.correct) : '?')}</div>
      <div class="explanation"><b>Explanation:</b> ${escapedExplanation}${explanationImageHTML}</div>
    `;
    qList.appendChild(qDiv);
  }
  document.getElementById('attempted').textContent = attempted;
  document.getElementById('correct').textContent = correct;
  document.getElementById('wrong').textContent = wrong;
  document.getElementById('score').textContent = score;
}

document.addEventListener('DOMContentLoaded', () => {
  renderResult().catch(error => {
    console.error('Error rendering result:', error);
    alert('Error loading test result. Please try again.');
    window.location.href = 'dashboard.html';
  });
});
