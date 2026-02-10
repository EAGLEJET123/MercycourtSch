/* ========================= 
   FIREBASE CONFIGURATION
   ========================= */

// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; 


// 🔥 REPLACE THIS WITH YOUR FIREBASE CONFIG FROM STEP 3
const firebaseConfig = {
    apiKey: "AIzaSyCJenqhfnlhszqfpGkmu_PUFMA-ThDLdic",
    authDomain: "school-quiz-app-7400f.firebaseapp.com",
    projectId: "school-quiz-app-7400f",
    storageBucket: "school-quiz-app-7400f.firebasestorage.app",
    messagingSenderId: "494722874998",
    appId: "1:494722874998:web:d6e354064a875de4a22957",
    measurementId: "G-NW9TEYBE19"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ========================= 
   DATABASE FUNCTIONS
   ========================= */

// Collection names
const COLLECTIONS = {
  settings: "settings",
  quizzes: "quizzes",
  students: "students",
  results: "results"
};

/* ========================= 
   SETTINGS (Password, School Info)
   ========================= */

// Get quiz password
async function getQuizPassword() {
  try {
    const docRef = doc(db, COLLECTIONS.settings, "quizPassword");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().password;
    } else {
      // Set default password if not exists
      await setDoc(docRef, { password: "SCHOOL-2025" });
      return "SCHOOL-2025";
    }
  } catch (error) {
    console.error("Error getting password:", error);
    return "SCHOOL-2025"; // Fallback
  }
}

// Set quiz password
async function setQuizPassword(password) {
  try {
    const docRef = doc(db, COLLECTIONS.settings, "quizPassword");
    await setDoc(docRef, { password: password });
    return true;
  } catch (error) {
    console.error("Error setting password:", error);
    return false;
  }
}

// Get admin credentials
async function getAdminCredentials() {
  try {
    const docRef = doc(db, COLLECTIONS.settings, "adminCredentials");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Set default credentials if not exists
      const defaultCreds = { username: "admin", password: "admin123" };
      try {
        await setDoc(docRef, defaultCreds);
      } catch (e) {
        console.log("Could not save default credentials to Firebase, using local defaults");
      }
      return defaultCreds;
    }
  } catch (error) {
    console.error("Error getting admin credentials:", error);
    // Return default credentials as fallback
    return { username: "admin", password: "admin123" };
  }
}

// Set admin credentials
async function setAdminCredentials(username, password) {
  try {
    const docRef = doc(db, COLLECTIONS.settings, "adminCredentials");
    await setDoc(docRef, { username, password });
    return true;
  } catch (error) {
    console.error("Error setting admin credentials:", error);
    return false;
  }
}

// Get school info
async function getSchoolInfo() {
  try {
    const docRef = doc(db, COLLECTIONS.settings, "schoolInfo");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return { name: "MercyCourt Montessori School", address: "" };
    }
  } catch (error) {
    console.error("Error getting school info:", error);
    return { name: "MercyCourt Montessori School", address: "" };
  }
}

// Set school info
async function setSchoolInfo(name, address) {
  try {
    const docRef = doc(db, COLLECTIONS.settings, "schoolInfo");
    await setDoc(docRef, { name, address });
    return true;
  } catch (error) {
    console.error("Error setting school info:", error);
    return false;
  }
}

/* ========================= 
   QUIZZES
   ========================= */

// Get all quizzes
async function getQuizzes() {
  try {
    const docRef = doc(db, COLLECTIONS.quizzes, "allQuizzes");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().data;
    } else {
      // Return default quizzes and save them
      const defaultQuizzes = getDefaultQuizzes();
      await setDoc(docRef, { data: defaultQuizzes });
      return defaultQuizzes;
    }
  } catch (error) {
    console.error("Error getting quizzes:", error);
    return getDefaultQuizzes(); // Fallback
  }
}

// Save all quizzes
async function saveQuizzes(quizzes) {
  try {
    const docRef = doc(db, COLLECTIONS.quizzes, "allQuizzes");
    await setDoc(docRef, { data: quizzes });
    return true;
  } catch (error) {
    console.error("Error saving quizzes:", error);
    return false;
  }
}

// Get quiz for specific class and term
async function getQuiz(className, term) {
  try {
    const quizzes = await getQuizzes();
    if (quizzes[className] && quizzes[className][term]) {
      return quizzes[className][term];
    }
    return null;
  } catch (error) {
    console.error("Error getting quiz:", error);
    return null;
  }
}

/* ========================= 
   STUDENTS
   ========================= */

// Get all students
async function getStudents() {
  try {
    const studentsRef = collection(db, COLLECTIONS.students);
    const querySnapshot = await getDocs(studentsRef);
    
    const students = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    
    return students;
  } catch (error) {
    console.error("Error getting students:", error);
    return [];
  }
}

// Add student
async function addStudent(student) {
  try {
    const studentsRef = collection(db, COLLECTIONS.students);
    const docRef = await addDoc(studentsRef, {
      ...student,
      dateAdded: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding student:", error);
    return null;
  }
}

// Update student
async function updateStudent(studentId, data) {
  try {
    const studentRef = doc(db, COLLECTIONS.students, studentId);
    await updateDoc(studentRef, data);
    return true;
  } catch (error) {
    console.error("Error updating student:", error);
    return false;
  }
}

// Delete student
async function deleteStudentFromDB(studentId) {
  try {
    const studentRef = doc(db, COLLECTIONS.students, studentId);
    await deleteDoc(studentRef);
    return true;
  } catch (error) {
    console.error("Error deleting student:", error);
    return false;
  }
}

/* ========================= 
   RESULTS
   ========================= */

// Get all results
async function getResults() {
  try {
    const resultsRef = collection(db, COLLECTIONS.results);
    const q = query(resultsRef, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    
    const results = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    return results;
  } catch (error) {
    console.error("Error getting results:", error);
    return [];
  }
}

// Add result
async function addResult(result) {
  try {
    const resultsRef = collection(db, COLLECTIONS.results);
    const docRef = await addDoc(resultsRef, {
      ...result,
      date: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding result:", error);
    return null;
  }
}

// Delete result
async function deleteResultFromDB(resultId) {
  try {
    const resultRef = doc(db, COLLECTIONS.results, resultId);
    await deleteDoc(resultRef);
    return true;
  } catch (error) {
    console.error("Error deleting result:", error);
    return false;
  }
}

// Clear all results
async function clearAllResultsFromDB() {
  try {
    const resultsRef = collection(db, COLLECTIONS.results);
    const querySnapshot = await getDocs(resultsRef);
    
    const deletePromises = [];
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error("Error clearing results:", error);
    return false;
  }
}

/* ========================= 
   DEFAULT QUIZZES
   ========================= */

function getDefaultQuizzes() {
  return {
    "Grade 1": {
      "1st": {
        topic: "GENERAL QUESTIONS (Grade 1 — 1st Term)",
        durationSeconds: 2 * 60,
        questions: [
          { id: 1, text: "What color are strawberries?", options: ["Blue", "Red", "Black", "Grey"], answerIndex: 1 },
          { id: 2, text: "Which of these is round?", options: ["Triangle", "Circle", "Square", "Line"], answerIndex: 1 }
        ]
      },
      "2nd": {
        topic: "Colors & Simple Shapes (Grade 1 — 2nd Term)",
        durationSeconds: 2 * 60,
        questions: [
          { id: 1, text: "What color is grass?", options: ["Yellow", "Green", "Pink", "Purple"], answerIndex: 1 }
        ]
      },
      "3rd": {
        topic: "Colors & Simple Shapes (Grade 1 — 3rd Term)",
        durationSeconds: 2 * 60,
        questions: [
          { id: 1, text: "What shape has 3 sides?", options: ["Circle", "Triangle", "Square", "Line"], answerIndex: 1 }
        ]
      }
    },
    "Grade 2": {
      "1st": {
        topic: "Colors & Simple Shapes (Grade 2 — 1st Term)",
        durationSeconds: 2 * 60,
        questions: [
          { id: 1, text: "What color are strawberries?", options: ["Blue", "Red", "Black", "Grey"], answerIndex: 1 },
          { id: 2, text: "Which of these is round?", options: ["Triangle", "Circle", "Square", "Line"], answerIndex: 1 }
        ]
      },
      "2nd": {
        topic: "Colors & Simple Shapes (Grade 2 — 2nd Term)",
        durationSeconds: 2 * 60,
        questions: [
          { id: 1, text: "What color is grass?", options: ["Yellow", "Green", "Pink", "Purple"], answerIndex: 1 }
        ]
      },
      "3rd": {
        topic: "Colors & Simple Shapes (Grade 2 — 3rd Term)",
        durationSeconds: 2 * 60,
        questions: [
          { id: 1, text: "What shape has 3 sides?", options: ["Circle", "Triangle", "Square", "Line"], answerIndex: 1 }
        ]
      }
    },
    "Grade 3": {
      "1st": {
        topic: "GST (GRADE 3 — 1st Term)",
        durationSeconds: 25 * 60,
        questions: [
          { id: 1, text: "Visual art is __?", options: ["An art form we can hear", "An art form we can see", "An art form we can taste", "An art form we can smell"], answerIndex: 1 },
          { id: 2, text: "Which of these components serves as the brain of the computer?", options: ["Speaker", "Floppy disk", "Flash drive", "System Unit"], answerIndex: 3 }
        ]
      },
      "2nd": {
        topic: "General Studies (Grade 3 — 2nd Term)",
        durationSeconds: 25 * 60,
        questions: [
          { id: 1, text: "What color is grass?", options: ["Yellow", "Green", "Pink", "Purple"], answerIndex: 1 }
        ]
      },
      "3rd": {
        topic: "General Studies (Grade 3 — 3rd Term)",
        durationSeconds: 25 * 60,
        questions: [
          { id: 1, text: "What shape has 3 sides?", options: ["Circle", "Triangle", "Square", "Line"], answerIndex: 1 }
        ]
      }
    },
    "Grade 4": {
      "1st": {
        topic: "GST (GRADE 4 — 1st Term)",
        durationSeconds: 25 * 60,
        questions: [
          { id: 1, text: "Which of these components serves as the brain of the computer?", options: ["Speaker", "Floppy disk", "Flash drive", "System Unit"], answerIndex: 3 },
          { id: 2, text: "What is 2345 in words?", options: ["Two thousand three hundred and forty-five", "Two thousand three hundred and forty", "Two thousand one hundred and forty-five", "Two thousand three hundred and forty"], answerIndex: 0 }
        ]
      },
      "2nd": {
        topic: "General Studies (Grade 4 — 2nd Term)",
        durationSeconds: 25 * 60,
        questions: [
          { id: 1, text: "The human feeding system helps us take _____ in", options: ["Sound", "Food", "Color", "Breath"], answerIndex: 1 },
          { id: 2, text: "_______ is not a way of becoming a citizen of a country", options: ["Citizenship by birth", "Citizenship by Registration", "Citizenship by computer", "Citizenship by Naturalization"], answerIndex: 2 }
        ]
      },
      "3rd": {
        topic: "General Studies (Grade 4 — 3rd Term)",
        durationSeconds: 25 * 60,
        questions: [
          { id: 1, text: "What shape has 3 sides?", options: ["Circle", "Triangle", "Square", "Line"], answerIndex: 1 }
        ]
      }
    },
    "Grade 5": {
      "1st": {
        topic: "GST (GRADE 5 — 1st Term)",
        durationSeconds: 25 * 60,
        questions: [
          { id: 1, text: "Which is incorrect?", options: ["A healthy environment is attractive", "A healthy environment is safe for living", "A healthy environment prevents diseases", "A healthy environment causes pollution"], answerIndex: 3 },
          { id: 2, text: "A computer that calculate and perform logical operation is known as?", options: ["digital computer", "analogue computer", "hybrid computer", "Calculation computer"], answerIndex: 0 }
        ]
      },
      "2nd": {
        topic: "General Studies (Grade 5 — 2nd Term)",
        durationSeconds: 25 * 60,
        questions: [
          { id: 1, text: "Which of these is a baby cat?", options: ["Puppy", "Calf", "Kitten", "Foal"], answerIndex: 2 }
        ]
      },
      "3rd": {
        topic: "General Studies (Grade 5 — 3rd Term)",
        durationSeconds: 25 * 60,
        questions: [
          { id: 1, text: "What color are most bananas when ripe?", options: ["Blue", "Yellow", "Red", "Pink"], answerIndex: 1 }
        ]
      }
    }
  };
}

/* ========================= 
   EXPORT ALL FUNCTIONS
   ========================= */

export {
  // Settings
  getQuizPassword,
  setQuizPassword,
  getAdminCredentials,
  setAdminCredentials,
  getSchoolInfo,
  setSchoolInfo,
  
  // Quizzes
  getQuizzes,
  saveQuizzes,
  getQuiz,
  
  // Students
  getStudents,
  addStudent,
  updateStudent,
  deleteStudentFromDB,
  
  // Results
  getResults,
  addResult,
  deleteResultFromDB,
  clearAllResultsFromDB,
  
  // Defaults
  getDefaultQuizzes
};

/* ========================= 
   MAKE TOGGLE PASSWORD GLOBAL
   ========================= */

window.togglePassword = function(inputId, button) {
  const input = document.getElementById(inputId);
  
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '🔒';
    button.classList.add('showing');
  } else {
    input.type = 'password';
    button.textContent = '👁️';
    button.classList.remove('showing');
  }
};