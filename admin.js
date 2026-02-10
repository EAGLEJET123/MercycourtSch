/* ========================= 
   ADMIN DASHBOARD - FIREBASE VERSION
   ========================= */

// Import Firebase functions
import { 
  getQuizPassword,
  setQuizPassword,
  getAdminCredentials,
  setAdminCredentials,
  getSchoolInfo,
  setSchoolInfo,
  getQuizzes,
  saveQuizzes,
  getStudents,
  addStudent,
  updateStudent,
  deleteStudentFromDB,
  getResults,
  deleteResultFromDB,
  clearAllResultsFromDB,
  getDefaultQuizzes
} from './firebase-config.js';

/* ========================= 
   STATE MANAGEMENT
   ========================= */

let currentAdmin = null;
let currentSection = 'overview';
let cachedStudents = [];
let cachedResults = [];
let cachedQuizzes = {};

/* ========================= 
   INITIALIZATION
   ========================= */

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateCurrentDate();
  console.log('✅ Admin dashboard loaded');
});

function updateCurrentDate() {
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
  }
}

/* ========================= 
   LOADING INDICATOR
   ========================= */

function showLoading(message = "Loading...") {
  let loader = document.getElementById('loadingOverlay');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'loadingOverlay';
    loader.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255,255,255,0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      ">
        <div style="
          width: 50px;
          height: 50px;
          border: 5px solid #e0e0e0;
          border-top: 5px solid #4c8bf5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <p style="margin-top: 15px; font-weight: bold; color: #333;" id="loadingText">${message}</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(loader);
  } else {
    document.getElementById('loadingText').textContent = message;
    loader.style.display = 'block';
  }
}

function hideLoading() {
  const loader = document.getElementById('loadingOverlay');
  if (loader) {
    loader.style.display = 'none';
  }
}

/* ========================= 
   EVENT LISTENERS SETUP
   ========================= */

function setupEventListeners() {
  // Admin Login
  document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      switchSection(section);
    });
  });

  // Modal close
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });

  // Students Section
  document.getElementById('addStudentBtn').addEventListener('click', openAddStudentModal);
  document.getElementById('studentSearch').addEventListener('input', filterStudents);
  document.getElementById('studentClassFilter').addEventListener('change', filterStudents);

  // Quiz Section
  document.getElementById('loadQuizBtn').addEventListener('click', loadQuizForEditing);
  document.getElementById('addQuizBtn').addEventListener('click', openAddQuestionModal);
  document.getElementById('saveQuizSettings').addEventListener('click', saveQuizSettings);

  // Results Section
  document.getElementById('resultSearch').addEventListener('input', filterResults);
  document.getElementById('resultClassFilter').addEventListener('change', filterResults);
  document.getElementById('resultTermFilter').addEventListener('change', filterResults);
  document.getElementById('exportResultsBtn').addEventListener('click', exportResultsCSV);
  document.getElementById('clearResultsBtn').addEventListener('click', clearAllResults);

  // Settings Section
  document.getElementById('changePasswordForm').addEventListener('submit', changeAdminPassword);
  document.getElementById('quizPasswordForm').addEventListener('submit', changeQuizPassword);
  document.getElementById('schoolInfoForm').addEventListener('submit', saveSchoolInfoForm);
  document.getElementById('backupDataBtn').addEventListener('click', backupData);
  document.getElementById('restoreDataInput').addEventListener('change', restoreData);
}

/* ========================= 
   ADMIN LOGIN / LOGOUT
   ========================= */

async function handleAdminLogin(e) {
  e.preventDefault();

  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;

  console.log('🔐 Login attempt:', username);

  showLoading("Verifying credentials...");

  try {
    // Try to get credentials from Firebase
    let storedCredentials;
    
    try {
      storedCredentials = await getAdminCredentials();
      console.log('✅ Firebase credentials retrieved');
    } catch (fbError) {
      console.warn('⚠️ Firebase error, using default credentials:', fbError);
      // Fallback to default credentials if Firebase fails
      storedCredentials = { username: "admin", password: "admin123" };
    }

    if (username === storedCredentials.username && password === storedCredentials.password) {
      currentAdmin = { username };
      hideLoading();
      console.log('✅ Login successful!');
      showDashboard();
    } else {
      hideLoading();
      console.log('❌ Invalid credentials');
      alert('❌ Invalid username or password!\n\nDefault: admin / admin123');
    }
  } catch (error) {
    hideLoading();
    console.error("❌ Login error:", error);
    
    // Emergency fallback - allow default login
    if (username === 'admin' && password === 'admin123') {
      console.log('⚠️ Using emergency fallback login');
      currentAdmin = { username: 'admin' };
      showDashboard();
    } else {
      alert('❌ Error connecting to database.\n\nTry: admin / admin123');
    }
  }
}

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    currentAdmin = null;
    document.getElementById('dashboardPage').style.display = 'none';
    document.getElementById('adminLoginPage').style.display = 'flex';
    document.getElementById('adminLoginForm').reset();
  }
}

function showDashboard() {
  document.getElementById('adminLoginPage').style.display = 'none';
  document.getElementById('dashboardPage').style.display = 'flex';
  loadOverviewData();
}

/* ========================= 
   NAVIGATION
   ========================= */

function switchSection(sectionName) {
  currentSection = sectionName;

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionName);
  });

  // Update sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(`${sectionName}Section`).classList.add('active');

  // Update title
  const titles = {
    overview: 'Overview',
    students: 'Student Management',
    quizzes: 'Quiz Management',
    results: 'All Results',
    settings: 'Settings'
  };
  document.getElementById('sectionTitle').textContent = titles[sectionName];

  // Load section data
  switch (sectionName) {
    case 'overview':
      loadOverviewData();
      break;
    case 'students':
      loadStudents();
      break;
    case 'results':
      loadResults();
      break;
    case 'settings':
      loadSettingsData();
      break;
  }
}

/* ========================= 
   OVERVIEW SECTION
   ========================= */

async function loadOverviewData() {
  showLoading("Loading overview...");

  try {
    const [students, results, quizzes] = await Promise.all([
      getStudents(),
      getResults(),
      getQuizzes()
    ]);

    cachedStudents = students;
    cachedResults = results;
    cachedQuizzes = quizzes;

    // Count total quizzes
    let totalQuizzes = 0;
    for (const grade in quizzes) {
      for (const term in quizzes[grade]) {
        totalQuizzes++;
      }
    }

    // Calculate average score
    let avgScore = 0;
    if (results.length > 0) {
      const totalPercentage = results.reduce((sum, r) => sum + r.percentage, 0);
      avgScore = Math.round(totalPercentage / results.length);
    }

    // Update stats
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('totalQuizzes').textContent = totalQuizzes;
    document.getElementById('totalAttempts').textContent = results.length;
    document.getElementById('avgScore').textContent = avgScore + '%';

    // Load recent results
    loadRecentResults(results);

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error("Error loading overview:", error);
    alert('Error loading data. Please refresh the page.');
  }
}

function loadRecentResults(results) {
  const tbody = document.getElementById('recentResultsBody');

  // Get last 10 results
  const recentResults = results.slice(0, 10);

  if (recentResults.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">No results yet</td></tr>';
    return;
  }

  tbody.innerHTML = recentResults.map(r => `
    <tr>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.class)}</td>
      <td>${escapeHtml(r.examNo)}</td>
      <td>${escapeHtml(r.topic)}</td>
      <td class="${r.percentage >= 50 ? 'score-pass' : 'score-fail'}">${r.score}/${r.total}</td>
      <td>${formatDate(r.date)}</td>
    </tr>
  `).join('');
}

/* ========================= 
   STUDENTS SECTION
   ========================= */

async function loadStudents() {
  showLoading("Loading students...");

  try {
    cachedStudents = await getStudents();
    renderStudentsTable(cachedStudents);
    hideLoading();
  } catch (error) {
    hideLoading();
    console.error("Error loading students:", error);
  }
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('studentsBody');

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="no-data">No students registered</td></tr>';
    return;
  }

  tbody.innerHTML = students.map((s) => `
    <tr>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.class)}</td>
      <td>${escapeHtml(s.examNo)}</td>
      <td>${formatDate(s.dateAdded)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="editStudentModal('${s.id}')">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteStudentHandler('${s.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function filterStudents() {
  const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
  const classFilter = document.getElementById('studentClassFilter').value;

  const filtered = cachedStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm) ||
      s.examNo.toLowerCase().includes(searchTerm);
    const matchesClass = !classFilter || s.class === classFilter;
    return matchesSearch && matchesClass;
  });

  renderStudentsTable(filtered);
}

function openAddStudentModal() {
  document.getElementById('modalTitle').textContent = 'Add New Student';
  document.getElementById('modalBody').innerHTML = `
    <form id="studentForm">
      <div class="form-group">
        <label>Student Name</label>
        <input type="text" id="studentName" placeholder="Enter full name" required>
      </div>
      <div class="form-group">
        <label>Class</label>
        <select id="studentClass" required>
          <option value="">Select Class</option>
          <option value="Grade 1">Grade 1</option>
          <option value="Grade 2">Grade 2</option>
          <option value="Grade 3">Grade 3</option>
          <option value="Grade 4">Grade 4</option>
          <option value="Grade 5">Grade 5</option>
        </select>
      </div>
      <div class="form-group">
        <label>Exam Number</label>
        <input type="text" id="studentExamNo" placeholder="e.g., MMS-2025-001" required>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Student</button>
      </div>
    </form>
  `;

  document.getElementById('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addStudentHandler();
  });

  openModal();
}

async function addStudentHandler() {
  const name = document.getElementById('studentName').value.trim();
  const studentClass = document.getElementById('studentClass').value;
  const examNo = document.getElementById('studentExamNo').value.trim();

  if (!name || !studentClass || !examNo) {
    alert('Please fill all fields!');
    return;
  }

  // Check for duplicate exam number
  if (cachedStudents.some(s => s.examNo.toLowerCase() === examNo.toLowerCase())) {
    alert('A student with this exam number already exists!');
    return;
  }

  showLoading("Adding student...");

  try {
    await addStudent({ name, class: studentClass, examNo });
    closeModal();
    await loadStudents();
    alert('✅ Student added successfully!');
  } catch (error) {
    hideLoading();
    console.error("Error adding student:", error);
    alert('Error adding student. Please try again.');
  }
}

// Make functions globally available
window.editStudentModal = async function(studentId) {
  const student = cachedStudents.find(s => s.id === studentId);
  if (!student) return;

  document.getElementById('modalTitle').textContent = 'Edit Student';
  document.getElementById('modalBody').innerHTML = `
    <form id="editStudentForm">
      <div class="form-group">
        <label>Student Name</label>
        <input type="text" id="editStudentName" value="${escapeHtml(student.name)}" required>
      </div>
      <div class="form-group">
        <label>Class</label>
        <select id="editStudentClass" required>
          <option value="Grade 1" ${student.class === 'Grade 1' ? 'selected' : ''}>Grade 1</option>
          <option value="Grade 2" ${student.class === 'Grade 2' ? 'selected' : ''}>Grade 2</option>
          <option value="Grade 3" ${student.class === 'Grade 3' ? 'selected' : ''}>Grade 3</option>
          <option value="Grade 4" ${student.class === 'Grade 4' ? 'selected' : ''}>Grade 4</option>
          <option value="Grade 5" ${student.class === 'Grade 5' ? 'selected' : ''}>Grade 5</option>
        </select>
      </div>
      <div class="form-group">
        <label>Exam Number</label>
        <input type="text" id="editStudentExamNo" value="${escapeHtml(student.examNo)}" required>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  `;

  document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateStudentHandler(studentId);
  });

  openModal();
};

async function updateStudentHandler(studentId) {
  const data = {
    name: document.getElementById('editStudentName').value.trim(),
    class: document.getElementById('editStudentClass').value,
    examNo: document.getElementById('editStudentExamNo').value.trim()
  };

  showLoading("Updating student...");

  try {
    await updateStudent(studentId, data);
    closeModal();
    await loadStudents();
    alert('✅ Student updated successfully!');
  } catch (error) {
    hideLoading();
    console.error("Error updating student:", error);
    alert('Error updating student. Please try again.');
  }
}

window.deleteStudentHandler = async function(studentId) {
  if (!confirm('Are you sure you want to delete this student?')) return;

  showLoading("Deleting student...");

  try {
    await deleteStudentFromDB(studentId);
    await loadStudents();
    alert('✅ Student deleted!');
  } catch (error) {
    hideLoading();
    console.error("Error deleting student:", error);
    alert('Error deleting student. Please try again.');
  }
};

/* ========================= 
   QUIZZES SECTION
   ========================= */

let currentQuizClass = '';
let currentQuizTerm = '';

async function loadQuizForEditing() {
  const selectedClass = document.getElementById('quizClassSelect').value;
  const selectedTerm = document.getElementById('quizTermSelect').value;

  if (!selectedClass || !selectedTerm) {
    alert('Please select both Class and Term!');
    return;
  }

  currentQuizClass = selectedClass;
  currentQuizTerm = selectedTerm;

  showLoading("Loading quiz...");

  try {
    let quizzes = await getQuizzes();
    cachedQuizzes = quizzes;

    if (!quizzes[selectedClass] || !quizzes[selectedClass][selectedTerm]) {
      // Create new quiz for this class/term
      if (!quizzes[selectedClass]) {
        quizzes[selectedClass] = {};
      }
      quizzes[selectedClass][selectedTerm] = {
        topic: `${selectedClass} — ${selectedTerm} Term`,
        durationSeconds: 25 * 60,
        questions: []
      };
      await saveQuizzes(quizzes);
      cachedQuizzes = quizzes;
    }

    const quiz = quizzes[selectedClass][selectedTerm];

    // Show quiz details
    document.getElementById('quizDetails').style.display = 'block';
    document.getElementById('quizTopic').value = quiz.topic;
    document.getElementById('quizDuration').value = Math.floor(quiz.durationSeconds / 60);
    document.getElementById('questionCount').textContent = quiz.questions.length;

    renderQuestions(quiz.questions);

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error("Error loading quiz:", error);
    alert('Error loading quiz. Please try again.');
  }
}

function renderQuestions(questions) {
  const container = document.getElementById('questionsContainer');

  if (questions.length === 0) {
    container.innerHTML = '<p class="no-data">No questions yet. Click "Add Question" to create one.</p>';
    return;
  }

  container.innerHTML = questions.map((q, index) => `
    <div class="question-card">
      <div class="question-card-header">
        <h4>Q${index + 1}. ${escapeHtml(q.text)}</h4>
        <div class="question-card-actions">
          <button class="btn btn-sm btn-secondary" onclick="editQuestionModal(${index})">✏️ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteQuestionHandler(${index})">🗑️</button>
        </div>
      </div>
      ${q.image ? `
        <div class="question-image">
          <img src="${escapeHtml(q.image)}" alt="Question Image" style="max-width: 200px; border-radius: 8px; margin: 10px 0; border: 2px solid #e0e0e0;">
        </div>
      ` : ''}
      <div class="question-options">
        ${q.options.map((opt, i) => `
          <div class="question-option ${i === q.answerIndex ? 'correct' : ''}">
            <span class="option-letter">${String.fromCharCode(65 + i)}</span>
            <span>${escapeHtml(opt)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

async function saveQuizSettings() {
  if (!currentQuizClass || !currentQuizTerm) {
    alert('Please select Class and Term first!');
    return;
  }

  const topic = document.getElementById('quizTopic').value.trim();
  const duration = parseInt(document.getElementById('quizDuration').value) || 25;

  showLoading("Saving settings...");

  try {
    cachedQuizzes[currentQuizClass][currentQuizTerm].topic = topic;
    cachedQuizzes[currentQuizClass][currentQuizTerm].durationSeconds = duration * 60;

    await saveQuizzes(cachedQuizzes);
    hideLoading();
    alert('✅ Quiz settings saved!');
  } catch (error) {
    hideLoading();
    console.error("Error saving settings:", error);
    alert('Error saving settings. Please try again.');
  }
}

function openAddQuestionModal() {
  if (!currentQuizClass || !currentQuizTerm) {
    alert('Please select Class and Term first, then click "Load Quiz"!');
    return;
  }

  document.getElementById('modalTitle').textContent = 'Add New Question';
  document.getElementById('modalBody').innerHTML = `
    <form id="questionForm">
      <div class="form-group">
        <label>Question Text</label>
        <textarea id="questionText" rows="3" placeholder="Enter your question here..." required></textarea>
      </div>
      <div class="form-group">
        <label>Question Image (Optional)</label>
        <div class="file-upload-container">
          <input type="file" id="questionImageFile" accept="image/*" style="display: none;">
          <input type="hidden" id="questionImageData">
          <button type="button" class="btn btn-secondary" id="uploadImageBtn">
            📁 Choose Image File
          </button>
          <span id="fileName" class="file-name">No file selected</span>
          <button type="button" class="btn btn-sm btn-danger" id="removeImageBtn" style="display: none;">
            ✕ Remove
          </button>
        </div>
        <div class="image-preview-container">
          <img id="imagePreview" src="" alt="Preview" style="display: none; max-width: 200px; margin-top: 10px; border-radius: 8px; border: 2px solid #ddd;">
        </div>
        <small class="muted">Supported formats: JPG, PNG, GIF (Max 2MB)</small>
      </div>
      <div class="form-group">
        <label>Options (Select the correct answer)</label>
        <div class="options-container">
          <div class="option-input-group">
            <span class="option-label">A.</span>
            <input type="text" id="optionA" placeholder="Option A" required>
            <input type="radio" name="correctAnswer" value="0" required>
          </div>
          <div class="option-input-group">
            <span class="option-label">B.</span>
            <input type="text" id="optionB" placeholder="Option B" required>
            <input type="radio" name="correctAnswer" value="1">
          </div>
          <div class="option-input-group">
            <span class="option-label">C.</span>
            <input type="text" id="optionC" placeholder="Option C" required>
            <input type="radio" name="correctAnswer" value="2">
          </div>
          <div class="option-input-group">
            <span class="option-label">D.</span>
            <input type="text" id="optionD" placeholder="Option D" required>
            <input type="radio" name="correctAnswer" value="3">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Question</button>
      </div>
    </form>
  `;

  // File upload button click
  document.getElementById('uploadImageBtn').addEventListener('click', () => {
    document.getElementById('questionImageFile').click();
  });

  // File selected handler
  document.getElementById('questionImageFile').addEventListener('change', (e) => {
    handleImageUpload(e, 'imagePreview', 'questionImageData', 'fileName', 'removeImageBtn');
  });

  // Remove image button
  document.getElementById('removeImageBtn').addEventListener('click', () => {
    clearImageUpload('imagePreview', 'questionImageData', 'fileName', 'removeImageBtn', 'questionImageFile');
  });

  document.getElementById('questionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addQuestionHandler();
  });

  openModal();
}

async function addQuestionHandler() {
  const text = document.getElementById('questionText').value.trim();
  const imageData = document.getElementById('questionImageData').value;
  const optionA = document.getElementById('optionA').value.trim();
  const optionB = document.getElementById('optionB').value.trim();
  const optionC = document.getElementById('optionC').value.trim();
  const optionD = document.getElementById('optionD').value.trim();
  const correctAnswer = document.querySelector('input[name="correctAnswer"]:checked');

  if (!text || !optionA || !optionB || !optionC || !optionD) {
    alert('Please fill in all fields!');
    return;
  }

  if (!correctAnswer) {
    alert('Please select the correct answer!');
    return;
  }

  showLoading("Adding question...");

  try {
    const questions = cachedQuizzes[currentQuizClass][currentQuizTerm].questions;
    const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;

    const newQuestion = {
      id: newId,
      text,
      options: [optionA, optionB, optionC, optionD],
      answerIndex: parseInt(correctAnswer.value)
    };

    if (imageData) {
      newQuestion.image = imageData;
    }

    questions.push(newQuestion);
    await saveQuizzes(cachedQuizzes);

    closeModal();
    document.getElementById('questionCount').textContent = questions.length;
    renderQuestions(questions);
    hideLoading();
    alert('✅ Question added successfully!');
  } catch (error) {
    hideLoading();
    console.error("Error adding question:", error);
    alert('Error adding question. Please try again.');
  }
}

window.editQuestionModal = function(index) {
  const question = cachedQuizzes[currentQuizClass][currentQuizTerm].questions[index];
  const hasImage = question.image ? true : false;

  document.getElementById('modalTitle').textContent = 'Edit Question';
  document.getElementById('modalBody').innerHTML = `
    <form id="editQuestionForm">
      <div class="form-group">
        <label>Question Text</label>
        <textarea id="editQuestionText" rows="3" required>${escapeHtml(question.text)}</textarea>
      </div>
      <div class="form-group">
        <label>Question Image (Optional)</label>
        <div class="file-upload-container">
          <input type="file" id="editQuestionImageFile" accept="image/*" style="display: none;">
          <input type="hidden" id="editQuestionImageData" value="${question.image || ''}">
          <button type="button" class="btn btn-secondary" id="editUploadImageBtn">
            📁 ${hasImage ? 'Change Image' : 'Choose Image File'}
          </button>
          <span id="editFileName" class="file-name">${hasImage ? 'Image uploaded' : 'No file selected'}</span>
          <button type="button" class="btn btn-sm btn-danger" id="editRemoveImageBtn" style="${hasImage ? '' : 'display: none;'}">
            ✕ Remove
          </button>
        </div>
        <div class="image-preview-container">
          <img id="editImagePreview" src="${question.image || ''}" alt="Preview" style="${hasImage ? '' : 'display: none;'} max-width: 200px; margin-top: 10px; border-radius: 8px; border: 2px solid #ddd;">
        </div>
        <small class="muted">Supported formats: JPG, PNG, GIF (Max 2MB)</small>
      </div>
      <div class="form-group">
        <label>Options (Select the correct answer)</label>
        <div class="options-container">
          <div class="option-input-group">
            <span class="option-label">A.</span>
            <input type="text" id="editOptionA" value="${escapeHtml(question.options[0])}" required>
            <input type="radio" name="editCorrectAnswer" value="0" ${question.answerIndex === 0 ? 'checked' : ''}>
          </div>
          <div class="option-input-group">
            <span class="option-label">B.</span>
            <input type="text" id="editOptionB" value="${escapeHtml(question.options[1])}" required>
            <input type="radio" name="editCorrectAnswer" value="1" ${question.answerIndex === 1 ? 'checked' : ''}>
          </div>
          <div class="option-input-group">
            <span class="option-label">C.</span>
            <input type="text" id="editOptionC" value="${escapeHtml(question.options[2])}" required>
            <input type="radio" name="editCorrectAnswer" value="2" ${question.answerIndex === 2 ? 'checked' : ''}>
          </div>
          <div class="option-input-group">
            <span class="option-label">D.</span>
            <input type="text" id="editOptionD" value="${escapeHtml(question.options[3])}" required>
            <input type="radio" name="editCorrectAnswer" value="3" ${question.answerIndex === 3 ? 'checked' : ''}>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  `;

  // File upload button click
  document.getElementById('editUploadImageBtn').addEventListener('click', () => {
    document.getElementById('editQuestionImageFile').click();
  });

  // File selected handler
  document.getElementById('editQuestionImageFile').addEventListener('change', (e) => {
    handleImageUpload(e, 'editImagePreview', 'editQuestionImageData', 'editFileName', 'editRemoveImageBtn');
  });

  // Remove image button
  document.getElementById('editRemoveImageBtn').addEventListener('click', () => {
    clearImageUpload('editImagePreview', 'editQuestionImageData', 'editFileName', 'editRemoveImageBtn', 'editQuestionImageFile');
  });

  document.getElementById('editQuestionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateQuestionHandler(index);
  });

  openModal();
};

async function updateQuestionHandler(index) {
  const question = cachedQuizzes[currentQuizClass][currentQuizTerm].questions[index];
  const imageData = document.getElementById('editQuestionImageData').value;

  question.text = document.getElementById('editQuestionText').value.trim();
  question.options = [
    document.getElementById('editOptionA').value.trim(),
    document.getElementById('editOptionB').value.trim(),
    document.getElementById('editOptionC').value.trim(),
    document.getElementById('editOptionD').value.trim()
  ];
  question.answerIndex = parseInt(document.querySelector('input[name="editCorrectAnswer"]:checked').value);

  if (imageData) {
    question.image = imageData;
  } else {
    delete question.image;
  }

  showLoading("Updating question...");

  try {
    await saveQuizzes(cachedQuizzes);
    closeModal();
    renderQuestions(cachedQuizzes[currentQuizClass][currentQuizTerm].questions);
    hideLoading();
    alert('✅ Question updated successfully!');
  } catch (error) {
    hideLoading();
    console.error("Error updating question:", error);
    alert('Error updating question. Please try again.');
  }
}

window.deleteQuestionHandler = async function(index) {
  if (!confirm('Are you sure you want to delete this question?')) return;

  showLoading("Deleting question...");

  try {
    cachedQuizzes[currentQuizClass][currentQuizTerm].questions.splice(index, 1);
    await saveQuizzes(cachedQuizzes);

    document.getElementById('questionCount').textContent = cachedQuizzes[currentQuizClass][currentQuizTerm].questions.length;
    renderQuestions(cachedQuizzes[currentQuizClass][currentQuizTerm].questions);
    hideLoading();
    alert('✅ Question deleted!');
  } catch (error) {
    hideLoading();
    console.error("Error deleting question:", error);
    alert('Error deleting question. Please try again.');
  }
};

/* ========================= 
   RESULTS SECTION
   ========================= */

async function loadResults() {
  showLoading("Loading results...");

  try {
    cachedResults = await getResults();
    renderResultsTable(cachedResults);
    hideLoading();
  } catch (error) {
    hideLoading();
    console.error("Error loading results:", error);
  }
}

function renderResultsTable(results) {
  const tbody = document.getElementById('resultsBody');

  if (results.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="no-data">No results yet</td></tr>';
    return;
  }

  tbody.innerHTML = results.map((r) => `
    <tr>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.class)}</td>
      <td>${escapeHtml(r.examNo)}</td>
      <td>${escapeHtml(r.topic)}</td>
      <td>${r.score}/${r.total}</td>
      <td class="${r.percentage >= 50 ? 'score-pass' : 'score-fail'}">${r.percentage}%</td>
      <td>${formatDate(r.date)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="viewResultDetails('${r.id}')">👁️ View</button>
        <button class="btn btn-sm btn-danger" onclick="deleteResultHandler('${r.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function filterResults() {
  const searchTerm = document.getElementById('resultSearch').value.toLowerCase();
  const classFilter = document.getElementById('resultClassFilter').value;
  const termFilter = document.getElementById('resultTermFilter').value;

  const filtered = cachedResults.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm) ||
      r.examNo.toLowerCase().includes(searchTerm);
    const matchesClass = !classFilter || r.class.includes(classFilter);
    const matchesTerm = !termFilter || r.class.includes(termFilter);
    return matchesSearch && matchesClass && matchesTerm;
  });

  renderResultsTable(filtered);
}

window.viewResultDetails = function(resultId) {
  const result = cachedResults.find(r => r.id === resultId);
  if (!result) return;

  document.getElementById('modalTitle').textContent = 'Result Details';
  document.getElementById('modalBody').innerHTML = `
    <div class="result-details">
      <div class="form-group">
        <label>Student Name</label>
        <p><strong>${escapeHtml(result.name)}</strong></p>
      </div>
      <div class="form-group">
        <label>Class</label>
        <p>${escapeHtml(result.class)}</p>
      </div>
      <div class="form-group">
        <label>Exam Number</label>
        <p>${escapeHtml(result.examNo)}</p>
      </div>
      <div class="form-group">
        <label>Topic</label>
        <p>${escapeHtml(result.topic)}</p>
      </div>
      <div class="form-group">
        <label>Score</label>
        <p class="${result.percentage >= 50 ? 'score-pass' : 'score-fail'}" style="font-size: 24px;">
          ${result.score} / ${result.total} (${result.percentage}%)
        </p>
      </div>
      <div class="form-group">
        <label>Date Taken</label>
        <p>${formatDate(result.date)}</p>
      </div>
      ${result.answers ? `
        <div class="form-group">
          <label>Answer Details</label>
          <div style="max-height: 300px; overflow-y: auto;">
            ${result.answers.map((a, i) => `
              <div style="padding: 8px; margin: 5px 0; background: ${a.correct ? '#e8f5e9' : '#ffebee'}; border-radius: 5px;">
                <strong>Q${i + 1}:</strong> ${a.correct ? '✅ Correct' : '❌ Wrong'}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;

  openModal();
};

window.deleteResultHandler = async function(resultId) {
  if (!confirm('Are you sure you want to delete this result?')) return;

  showLoading("Deleting result...");

  try {
    await deleteResultFromDB(resultId);
    await loadResults();
    alert('✅ Result deleted!');
  } catch (error) {
    hideLoading();
    console.error("Error deleting result:", error);
    alert('Error deleting result. Please try again.');
  }
};

function exportResultsCSV() {
  if (cachedResults.length === 0) {
    alert('No results to export!');
    return;
  }

  const headers = ['Name', 'Class', 'Exam No', 'Topic', 'Score', 'Total', 'Percentage', 'Date'];
  const rows = cachedResults.map(r => [
    r.name,
    r.class,
    r.examNo,
    r.topic,
    r.score,
    r.total,
    r.percentage + '%',
    formatDate(r.date)
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  downloadFile(csvContent, 'quiz_results.csv', 'text/csv');
  alert('✅ Results exported successfully!');
}

async function clearAllResults() {
  if (!confirm('⚠️ Are you sure you want to delete ALL results? This cannot be undone!')) return;
  if (!confirm('⚠️ This is your FINAL warning. All results will be permanently deleted!')) return;

  showLoading("Clearing all results...");

  try {
    await clearAllResultsFromDB();
    await loadResults();
    await loadOverviewData();
    alert('✅ All results cleared!');
  } catch (error) {
    hideLoading();
    console.error("Error clearing results:", error);
    alert('Error clearing results. Please try again.');
  }
}

/* ========================= 
   SETTINGS SECTION
   ========================= */

async function loadSettingsData() {
  showLoading("Loading settings...");

  try {
    const [quizPassword, schoolInfo] = await Promise.all([
      getQuizPassword(),
      getSchoolInfo()
    ]);

    document.getElementById('currentQuizPassword').value = quizPassword;
    document.getElementById('schoolName').value = schoolInfo.name || 'MercyCourt Montessori School';
    document.getElementById('schoolAddress').value = schoolInfo.address || '';

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error("Error loading settings:", error);
  }
}

async function changeAdminPassword(e) {
  e.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  showLoading("Verifying...");

  try {
    const storedCredentials = await getAdminCredentials();

    if (currentPassword !== storedCredentials.password) {
      hideLoading();
      alert('❌ Current password is incorrect!');
      return;
    }

    if (newPassword.length < 6) {
      hideLoading();
      alert('❌ New password must be at least 6 characters!');
      return;
    }

    if (newPassword !== confirmPassword) {
      hideLoading();
      alert('❌ New passwords do not match!');
      return;
    }

    await setAdminCredentials(storedCredentials.username, newPassword);

    document.getElementById('changePasswordForm').reset();
    hideLoading();
    alert('✅ Admin password changed successfully!');
  } catch (error) {
    hideLoading();
    console.error("Error changing password:", error);
    alert('Error changing password. Please try again.');
  }
}

async function changeQuizPassword(e) {
  e.preventDefault();

  const newPassword = document.getElementById('newQuizPassword').value.trim();

  if (!newPassword) {
    alert('Please enter a new password!');
    return;
  }

  if (newPassword.length < 4) {
    alert('Password must be at least 4 characters!');
    return;
  }

  showLoading("Updating password...");

  try {
    await setQuizPassword(newPassword);
    document.getElementById('currentQuizPassword').value = newPassword;
    document.getElementById('newQuizPassword').value = '';
    hideLoading();
    alert('✅ Quiz password updated successfully!\n\nNew password: ' + newPassword);
  } catch (error) {
    hideLoading();
    console.error("Error changing quiz password:", error);
    alert('Error updating password. Please try again.');
  }
}

async function saveSchoolInfoForm(e) {
  e.preventDefault();

  const name = document.getElementById('schoolName').value.trim();
  const address = document.getElementById('schoolAddress').value.trim();

  showLoading("Saving...");

  try {
    await setSchoolInfo(name, address);
    hideLoading();
    alert('✅ School information saved!');
  } catch (error) {
    hideLoading();
    console.error("Error saving school info:", error);
    alert('Error saving information. Please try again.');
  }
}

async function backupData() {
  showLoading("Creating backup...");

  try {
    const [students, results, quizzes, quizPassword, schoolInfo] = await Promise.all([
      getStudents(),
      getResults(),
      getQuizzes(),
      getQuizPassword(),
      getSchoolInfo()
    ]);

    const backup = {
      version: '2.0-firebase',
      date: new Date().toISOString(),
      data: {
        students,
        results,
        quizzes,
        quizPassword,
        schoolInfo
      }
    };

    const jsonContent = JSON.stringify(backup, null, 2);
    const fileName = `quiz_backup_${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(jsonContent, fileName, 'application/json');

    hideLoading();
    alert('✅ Backup created successfully!');
  } catch (error) {
    hideLoading();
    console.error("Error creating backup:", error);
    alert('Error creating backup. Please try again.');
  }
}

async function restoreData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(event) {
    try {
      const backup = JSON.parse(event.target.result);

      if (!backup.data) {
        throw new Error('Invalid backup file format');
      }

      if (!confirm('⚠️ This will replace all current data. Are you sure?')) return;

      showLoading("Restoring data...");

      // Note: For a full restore, you would need to implement batch writes
      // This is a simplified version
      if (backup.data.quizzes) await saveQuizzes(backup.data.quizzes);
      if (backup.data.quizPassword) await setQuizPassword(backup.data.quizPassword);
      if (backup.data.schoolInfo) await setSchoolInfo(backup.data.schoolInfo.name, backup.data.schoolInfo.address);

      hideLoading();
      alert('✅ Data restored successfully! Note: Students and results need to be added manually.');
      location.reload();

    } catch (error) {
      hideLoading();
      alert('❌ Error reading backup file: ' + error.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ========================= 
   IMAGE UPLOAD FUNCTIONS
   ========================= */

function handleImageUpload(event, previewId, dataId, fileNameId, removeBtnId) {
  const file = event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('❌ Please select an image file (JPG, PNG, GIF)');
    return;
  }

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    alert('❌ Image is too large! Maximum size is 2MB.');
    return;
  }

  const reader = new FileReader();

  reader.onload = function(e) {
    const imageData = e.target.result;

    const preview = document.getElementById(previewId);
    preview.src = imageData;
    preview.style.display = 'block';

    document.getElementById(dataId).value = imageData;
    document.getElementById(fileNameId).textContent = file.name;
    document.getElementById(fileNameId).classList.add('has-file');
    document.getElementById(removeBtnId).style.display = 'inline-block';
  };

  reader.onerror = function() {
    alert('❌ Error reading file. Please try again.');
  };

  reader.readAsDataURL(file);
}

function clearImageUpload(previewId, dataId, fileNameId, removeBtnId, fileInputId) {
  const preview = document.getElementById(previewId);
  preview.src = '';
  preview.style.display = 'none';

  document.getElementById(dataId).value = '';
  document.getElementById(fileNameId).textContent = 'No file selected';
  document.getElementById(fileNameId).classList.remove('has-file');
  document.getElementById(removeBtnId).style.display = 'none';
  document.getElementById(fileInputId).value = '';
}

/* ========================= 
   MODAL FUNCTIONS
   ========================= */

function openModal() {
  document.getElementById('modal').classList.add('active');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

// Make closeModal globally available
window.closeModal = closeModal;

/* ========================= 
   UTILITY FUNCTIONS
   ========================= */

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function downloadFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ========================= 
   CONSOLE LOG FOR DEBUGGING
   ========================= */

console.log('✅ Admin dashboard JavaScript loaded');