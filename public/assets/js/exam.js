// Utility to get query parameter
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

const categoryId = getQueryParam('cat');
const examContainer = document.getElementById("exam-container");
const categoryTitle = document.getElementById("category-title");

// Map category id to title (for display)
const categoryNames = {
  "banking": "Banking Exams",
  "state": "State Government Exams",
  "ssc": "SSC & Railways"
};

categoryTitle.textContent = categoryNames[categoryId] || "Exams";

// Load exam list
async function loadExams() {
  try {
    // Load from file first
    const res = await fetch(`assets/data/exams-${categoryId}.json`);
    const fileExams = await res.json();
    
    // Load admin-created exams from localStorage
    const adminExamData = localStorage.getItem(`examData_${categoryId}`);
    let adminExams = [];
    if (adminExamData) {
      adminExams = JSON.parse(adminExamData);
    }
    
    // Combine file exams and admin exams
    const allExams = [...fileExams, ...adminExams];
    
    // Remove duplicates based on exam ID
    const uniqueExams = allExams.filter((exam, index, self) => 
      index === self.findIndex(e => e.id === exam.id)
    );

    uniqueExams.forEach(exam => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
  <h3>${exam.name}</h3>
  <p>${exam.description || ''}</p>
  <a href="exam.html?cat=${categoryId}&exam=${exam.id}">View Tests</a>
`;

      examContainer.appendChild(card);
    });
  } catch (err) {
    // If file doesn't exist, try to load only admin exams
    const adminExamData = localStorage.getItem(`examData_${categoryId}`);
    if (adminExamData) {
      const adminExams = JSON.parse(adminExamData);
      adminExams.forEach(exam => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
  <h3>${exam.name}</h3>
  <p>${exam.description || ''}</p>
  <a href="exam.html?cat=${categoryId}&exam=${exam.id}">View Tests</a>
`;

        examContainer.appendChild(card);
      });
    } else {
      examContainer.innerHTML = `<p style="color:red;">Exams not found for category "${categoryId}".</p>`;
    }
  }
}

loadExams();
