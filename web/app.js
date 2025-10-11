// Improved page loading without visible buffer
const role = localStorage.getItem('role');
if (window.location.pathname.endsWith('homepage1.html') && role !== 'student') {
  window.location.href = 'homepage2.html';
}
if (window.location.pathname.endsWith('homepage2.html') && role !== 'teacher') {
  window.location.href = 'homepage1.html';
}

document.addEventListener('DOMContentLoaded', function() {
  checkAuthentication();
  // ...existing code...
});

function checkAuthentication() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  fetch('/api/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      localStorage.clear();
      window.location.href = 'login.html';
      return;
    }
    return response.json();
  })
  .then(data => {
    // Update UI after auth
    // ...existing code to update UI...
  })
  .catch(() => {
    localStorage.clear();
    window.location.href = 'login.html';
  });
}

// GradeScope Lite - Google Classroom-like Interface
// Global variables
let currentUser = null;
let userRole = null;
let grades = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  checkAuthentication();
  loadUserData();
  setupEventListeners();
});

// Check if user is authenticated
function checkAuthentication() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  
  // Verify token with server
  fetch('/api/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userId');
      window.location.href = 'login.html';
    }
    return response.json();
  })
  .then(data => {
    currentUser = data.user;
    userRole = data.user.role;
    updateUI();
  })
  .catch(error => {
    console.error('Authentication error:', error);
    window.location.href = 'login.html';
  });
}

// Load user data from localStorage
function loadUserData() {
  const userName = localStorage.getItem('userName');
  const role = localStorage.getItem('userRole');
  
  if (userName && role) {
    document.getElementById('user-name').textContent = userName;
    document.getElementById('user-role').textContent = role;
    document.getElementById('user-avatar').textContent = userName.charAt(0).toUpperCase();
  }
}

// Update UI based on user role
function updateUI() {
  const role = userRole || localStorage.getItem('userRole');
  
  // Update welcome message
  const userName = localStorage.getItem('userName');
  document.getElementById('welcome-title').textContent = `Welcome back, ${userName}!`;
  
  // Show role-specific content
  document.body.className = `role-${role}`;
  
  // Update welcome subtitle based on role
  const subtitles = {
    student: 'Track your academic progress and view your grades',
    teacher: 'Manage your classes and student grades',
    parent: 'Monitor your child\'s academic progress',
    admin: 'Manage the school\'s academic system'
  };
  
  document.getElementById('welcome-subtitle').textContent = subtitles[role] || 'Your classroom management dashboard';
}

// Setup event listeners
function setupEventListeners() {
  // Logout button
  document.getElementById('logout-btn').addEventListener('click', logout);
  
  // Grade form submission
  document.getElementById('grade-form').addEventListener('submit', handleGradeSubmit);
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('userId');
  window.location.href = 'login.html';
}

// Role-specific functions
function viewGrades() {
  document.getElementById('grades-section').style.display = 'block';
  loadGrades();
}

function closeGradesSection() {
  document.getElementById('grades-section').style.display = 'none';
}

function openGradeModal() {
  if (userRole !== 'teacher') {
    alert('Only teachers can add grades.');
    return;
  }
  document.getElementById('grade-modal').style.display = 'block';
}

function closeGradeModal() {
  document.getElementById('grade-modal').style.display = 'none';
  document.getElementById('grade-form').reset();
}

function handleGradeSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const gradeData = {
    studentName: formData.get('studentName'),
    subject: formData.get('subject'),
    grade: formData.get('grade'),
    quarter: formData.get('quarter'),
    remarks: formData.get('remarks')
  };

  // Add grade to local storage (in a real app, this would be sent to server)
  grades.push({
    id: Date.now(),
    ...gradeData,
    createdAt: new Date().toISOString()
  });

  localStorage.setItem('grades', JSON.stringify(grades));
  closeGradeModal();
  loadGrades();
}

function loadGrades() {
  const storedGrades = localStorage.getItem('grades');
  if (storedGrades) {
    grades = JSON.parse(storedGrades);
  }

  const tbody = document.getElementById('grades-body');
  tbody.innerHTML = '';

  if (grades.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--google-text-secondary);">No grades available</td></tr>';
                return;
              }

  grades.forEach(grade => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${grade.studentName}</td>
      <td>${grade.subject}</td>
      <td>${grade.grade}</td>
      <td>Q${grade.quarter}</td>
      <td>${grade.remarks || '-'}</td>
      <td class="actions-cell" style="display: none;">
        <button class="btn btn-secondary" onclick="editGrade(${grade.id})">Edit</button>
        <button class="btn btn-secondary" onclick="deleteGrade(${grade.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Show actions column for teachers
  if (userRole === 'teacher') {
    document.getElementById('actions-header').style.display = 'table-cell';
    document.querySelectorAll('.actions-cell').forEach(cell => {
      cell.style.display = 'table-cell';
    });
  }
}

// Placeholder functions for other features
function viewAssignments() {
  alert('Assignments feature coming soon!');
}

function viewClassOverview() {
  alert('Class overview feature coming soon!');
}

function viewChildProgress() {
  alert('Child progress feature coming soon!');
}

function viewCommunication() {
  alert('Communication feature coming soon!');
}

function manageSubjects() {
  alert('Subject management feature coming soon!');
}

function manageUsers() {
  alert('User management feature coming soon!');
}

function viewReports() {
  alert('Reports feature coming soon!');
}

function editGrade(gradeId) {
  alert('Edit grade feature coming soon!');
}

function deleteGrade(gradeId) {
  if (confirm('Are you sure you want to delete this grade?')) {
    grades = grades.filter(grade => grade.id !== gradeId);
    localStorage.setItem('grades', JSON.stringify(grades));
    loadGrades();
  }
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('grade-modal');
  if (event.target === modal) {
    closeGradeModal();
  }
}
