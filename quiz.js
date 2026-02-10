/* ========================= 
   QUIZ APP - FIREBASE VERSION
   ========================= */

// Import Firebase functions
import { 
  getQuizPassword, 
  getQuizzes, 
  addResult 
} from './firebase-config.js';

/* ========================= 
   STATE & ELEMENTS
   ========================= */

const pages = {
  login: document.getElementById('loginPage'),
  prep: document.getElementById('prepPage'),
  quiz: document.getElementById('quizPage'),
  result: document.getElementById('resultPage')
};

const el = {
  // login
  loginForm: document.getElementById('loginForm'),
  pName: document.getElementById('pName'),
  pClass: document.getElementById('pClass'),
  pTerm: document.getElementById('pTerm'),
  pExam: document.getElementById('pExam'),
  pPass: document.getElementById('pPass'),
  // prep
  uName: document.getElementById('uName'),
  uClass: document.getElementById('uClass'),
  uExam: document.getElementById('uExam'),
  startQuizBtn: document.getElementById('startQuizBtn'),
  backToLoginBtn: document.getElementById('backToLoginBtn'),
  // quiz
  topicTitle: document.getElementById('topicTitle'),
  countBadge: document.getElementById('countBadge'),
  timeLeft: document.getElementById('timeLeft'),
  progressBar: document.getElementById('progressBar'),
  qnums: document.getElementById('qnums'),
  questionContainer: document.getElementById('questionContainer'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  submitBtn: document.getElementById('submitBtn'),
  // result
  rName: document.getElementById('rName'),
  rClass: document.getElementById('rClass'),
  rExam: document.getElementById('rExam'),
  rTopic: document.getElementById('rTopic'),
  rDate: document.getElementById('rDate'),
  rScore: document.getElementById('rScore'),
  printBtn: document.getElementById('printBtn'),
  restartBtn: document.getElementById('restartBtn')
};

const state = {
  user: { name: "", class: "", examNo: "", term: "" },
  quiz: null,
  currentIndex: 0,
  answers: [],
  timeLeft: 0,
  timerId: null
};

/* ========================= 
   PAGE SWITCH HELPER
   ========================= */

function show(page) {
  for (const p in pages) {
    pages[p].style.display = (p === page) ? 'block' : 'none';
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
   LOGIN FLOW
   ========================= */

el.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = el.pName.value.trim();
  const cls = el.pClass.value.trim();
  const term = el.pTerm.value.trim();
  const exam = el.pExam.value.trim();
  const pass = el.pPass.value;

  // Validation
  if (!name || !cls || !term || !exam || !pass) {
    alert("Please fill all fields.");
    return;
  }

  showLoading("Verifying credentials...");

  try {
    // ✅ Get password from Firebase
    const ACCESS_PASSWORD = await getQuizPassword();

    if (pass !== ACCESS_PASSWORD) {
      hideLoading();
      alert("Incorrect password. Please check with your school.");
      return;
    }

    showLoading("Loading quiz...");

    // ✅ Get quizzes from Firebase
    const QUIZZES = await getQuizzes();

    if (!QUIZZES[cls] || !QUIZZES[cls][term]) {
      hideLoading();
      alert("No quiz found for the selected class and term.");
      return;
    }

    // Check if quiz has questions
    if (QUIZZES[cls][term].questions.length === 0) {
      hideLoading();
      alert("This quiz has no questions yet. Please contact your teacher.");
      return;
    }

    // Save user state
    state.user = {
      name,
      class: cls,
      term: term,
      displayClass: cls + " (" + term + " Term)",
      examNo: exam
    };

    // Copy quiz data
    state.quiz = JSON.parse(JSON.stringify(QUIZZES[cls][term]));
    state.currentIndex = 0;
    state.answers = Array(state.quiz.questions.length).fill(null);
    state.timeLeft = state.quiz.durationSeconds;

    // Update prep page text
    el.uName.textContent = name;
    el.uClass.textContent = cls + " — " + term + " Term";
    el.uExam.textContent = exam;

    hideLoading();
    show('prep');

  } catch (error) {
    hideLoading();
    console.error("Login error:", error);
    alert("Error connecting to database. Please check your internet connection.");
  }
});

/* ========================= 
   PREP → QUIZ
   ========================= */

el.backToLoginBtn.addEventListener('click', () => show('login'));

el.startQuizBtn.addEventListener('click', () => {
  // Initialize quiz header
  el.topicTitle.textContent = `Topic: ${state.quiz.topic}`;
  el.countBadge.textContent = `0/${state.quiz.questions.length}`;
  el.progressBar.style.width = '0%';

  renderQnums();
  renderQuestion();
  updateProgress();
  startTimer();

  show('quiz');
});

/* ========================= 
   QUIZ RENDERING
   ========================= */

function renderQnums() {
  el.qnums.innerHTML = '';
  state.quiz.questions.forEach((q, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'qnum';
    b.textContent = idx + 1;
    b.addEventListener('click', () => {
      state.currentIndex = idx;
      renderQuestion();
      updateProgress();
    });
    el.qnums.appendChild(b);
  });
}

function renderQuestion() {
  const q = state.quiz.questions[state.currentIndex];
  const saved = state.answers[state.currentIndex];

  const wrapper = document.createElement('div');
  wrapper.className = 'question';

  const title = document.createElement('h3');
  title.className = 'q-title';
  title.textContent = `Q${state.currentIndex + 1}. ${q.text}`;
  wrapper.appendChild(title);

  // Support for question images
  if (q.image) {
    const img = document.createElement('img');
    img.src = q.image;
    img.alt = "Question Image";
    img.style.maxWidth = "220px";
    img.style.display = "block";
    img.style.margin = "10px 0";
    img.style.borderRadius = "8px";
    img.style.border = "2px solid #ddd";
    wrapper.appendChild(img);
  }

  const choices = document.createElement('div');
  choices.className = 'choices';

  q.options.forEach((opt, idx) => {
    const label = document.createElement('label');
    label.className = 'choice';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `q${q.id}`;
    input.value = idx;
    input.checked = saved === idx;
    input.addEventListener('change', () => {
      state.answers[state.currentIndex] = idx;
      updateProgress();
    });

    const span = document.createElement('span');
    span.textContent = opt;

    label.appendChild(input);
    label.appendChild(span);
    choices.appendChild(label);
  });

  wrapper.appendChild(choices);
  el.questionContainer.innerHTML = '';
  el.questionContainer.appendChild(wrapper);

  // Update button states
  el.prevBtn.disabled = state.currentIndex === 0;
  el.nextBtn.disabled = state.currentIndex === state.quiz.questions.length - 1;

  // Update active question number
  [...el.qnums.children].forEach((btn, i) => {
    btn.classList.toggle('active', i === state.currentIndex);
  });
}

function updateProgress() {
  const answered = state.answers.filter(v => v !== null).length;
  const total = state.quiz.questions.length;

  el.countBadge.textContent = `${answered}/${total}`;
  el.progressBar.style.width = `${Math.round((answered / total) * 100)}%`;

  [...el.qnums.children].forEach((btn, i) => {
    btn.classList.toggle('answered', state.answers[i] !== null);
    btn.classList.toggle('active', i === state.currentIndex);
  });
}

// Navigation buttons
el.prevBtn.addEventListener('click', () => {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderQuestion();
    updateProgress();
  }
});

el.nextBtn.addEventListener('click', () => {
  if (state.currentIndex < state.quiz.questions.length - 1) {
    state.currentIndex++;
    renderQuestion();
    updateProgress();
  }
});

/* ========================= 
   TIMER
   ========================= */

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function startTimer() {
  clearInterval(state.timerId);
  el.timeLeft.textContent = formatTime(state.timeLeft);

  state.timerId = setInterval(() => {
    state.timeLeft--;
    el.timeLeft.textContent = formatTime(Math.max(0, state.timeLeft));

    // Warning when 1 minute left
    if (state.timeLeft === 60) {
      el.timeLeft.style.color = 'red';
      alert('⚠️ Only 1 minute remaining!');
    }

    if (state.timeLeft <= 0) {
      clearInterval(state.timerId);
      submitQuiz(true);
    }
  }, 1000);
}

/* ========================= 
   SUBMIT QUIZ
   ========================= */

function computeScore() {
  let score = 0;
  state.quiz.questions.forEach((q, i) => {
    if (state.answers[i] === q.answerIndex) score++;
  });
  return score;
}

async function submitQuiz(auto = false) {
  clearInterval(state.timerId);

  const unanswered = state.answers.filter(x => x === null).length;

  if (!auto && unanswered > 0) {
    const ok = confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`);
    if (!ok) {
      startTimer(); // Resume timer if user cancels
      return;
    }
  }

  showLoading("Submitting quiz...");

  const score = computeScore();
  const total = state.quiz.questions.length;
  const percentage = Math.round((score / total) * 100);

  // ✅ Create result object for saving
  const resultData = {
    name: state.user.name,
    class: state.user.displayClass,
    examNo: state.user.examNo,
    topic: state.quiz.topic,
    score: score,
    total: total,
    percentage: percentage,
    answers: state.quiz.questions.map((q, i) => ({
      questionId: q.id,
      questionText: q.text,
      selectedAnswer: state.answers[i],
      correctAnswer: q.answerIndex,
      correct: state.answers[i] === q.answerIndex
    }))
  };

  try {
    // ✅ Save result to Firebase
    await addResult(resultData);
  } catch (error) {
    console.error("Error saving result:", error);
    // Continue anyway - show result to student
  }

  hideLoading();

  // Populate result page
  el.rName.textContent = state.user.name;
  el.rClass.textContent = state.user.displayClass;
  el.rExam.textContent = state.user.examNo;
  el.rTopic.textContent = state.quiz.topic;
  el.rDate.textContent = new Date().toLocaleString();
  el.rScore.textContent = `${score} / ${total} (${percentage}%)`;

  // Add logo/brand at top of result
  const resultPage = document.getElementById('resultPage');
  let brand = document.getElementById('resultBrand');
  if (!brand) {
    brand = document.createElement('div');
    brand.id = 'resultBrand';
    brand.innerHTML = `<img src="mercy.jpg" alt="School Logo" style="max-height:80px; margin-bottom:15px; display:block; margin-left:auto; margin-right:auto;">`;
    resultPage.insertBefore(brand, resultPage.firstChild);
  }

  // Add answer review section
  let detailsContainer = document.getElementById('answerDetails');
  if (!detailsContainer) {
    detailsContainer = document.createElement('div');
    detailsContainer.id = 'answerDetails';
    resultPage.appendChild(detailsContainer);
  }

  detailsContainer.innerHTML = '<h3 style="margin-top: 20px; font-family: Bubblegum Sans, cursive;">📝 Answer Review</h3>';

  state.quiz.questions.forEach((q, i) => {
    const chosenIndex = state.answers[i];
    const chosenText = chosenIndex !== null ? q.options[chosenIndex] : "Not answered";
    const correctText = q.options[q.answerIndex];
    const isCorrect = chosenIndex === q.answerIndex;

    const item = document.createElement('div');
    item.style.marginBottom = "15px";
    item.style.padding = "12px";
    item.style.background = isCorrect ? "#e8f5e9" : "#ffebee";
    item.style.borderRadius = "8px";
    item.style.borderLeft = `4px solid ${isCorrect ? '#26c281' : '#ff6b6b'}`;

    item.innerHTML = `
      <p style="margin: 0 0 8px; font-weight: bold;">Q${i + 1}: ${q.text}</p>
      <p style="margin: 0 0 4px;">
        <span style="color: ${isCorrect ? 'green' : 'red'};">👉 Your answer:</span> 
        <strong>${chosenText}</strong>
        ${isCorrect ? '✅' : '❌'}
      </p>
      ${!isCorrect ? `<p style="margin: 0; color: green;">✅ Correct answer: <strong>${correctText}</strong></p>` : ''}
    `;

    detailsContainer.appendChild(item);
  });

  // Add summary
  const summary = document.createElement('div');
  summary.style.marginTop = "20px";
  summary.style.padding = "15px";
  summary.style.background = percentage >= 50 ? "#e8f5e9" : "#fff3e0";
  summary.style.borderRadius = "10px";
  summary.style.textAlign = "center";

  let message = "";
  if (percentage >= 80) {
    message = "🌟 Excellent work! You're a superstar!";
  } else if (percentage >= 60) {
    message = "👍 Good job! Keep it up!";
  } else if (percentage >= 50) {
    message = "😊 Nice try! You passed!";
  } else {
    message = "📚 Keep studying! You can do better next time!";
  }

  summary.innerHTML = `<h3 style="margin: 0; color: ${percentage >= 50 ? '#26c281' : '#ff6b6b'};">${message}</h3>`;
  detailsContainer.appendChild(summary);

  show('result');
}

el.submitBtn.addEventListener('click', () => submitQuiz(false));

/* ========================= 
   RESULT PAGE ACTIONS
   ========================= */

el.printBtn.addEventListener('click', () => window.print());

el.restartBtn.addEventListener('click', () => {
  // Clear answer details for next quiz
  const detailsContainer = document.getElementById('answerDetails');
  if (detailsContainer) {
    detailsContainer.innerHTML = '';
  }

  // Reset timer color
  el.timeLeft.style.color = 'orange';

  show('login');
  el.loginForm.reset();
});

/* ========================= 
   CONSOLE LOG FOR DEBUGGING
   ========================= */

console.log('✅ Quiz app loaded successfully');