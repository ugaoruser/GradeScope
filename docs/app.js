// Modern GradeTracker Application
'use strict';

// Global variables
let currentUser = null;
let userRole = null;
let grades = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

function initializeApp() {
  const path = window.location.pathname;
  
  // Route protection
  const role = localStorage.getItem('role');
  if (path.endsWith('homepage1.html') && role === 'teacher') {
    window.location.href = 'homepage2.html';
    return;
  }
  if (path.endsWith('homepage2.html') && role !== 'teacher') {
    window.location.href = 'homepage1.html';
    return;
  }
  
  // Initialize based on page
  if (!path.endsWith('login.html') && !path.endsWith('signup.html')) {
    checkAuthentication();
  }
  
  loadUserData();
  setupEventListeners();
}

// Simplified auth check
function checkAuthentication() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Load user data from localStorage
function loadUserData() {
  const userName = localStorage.getItem('fullName') || localStorage.getItem('userName');
  const role = localStorage.getItem('role');
  
  if (userName && role) {
    currentUser = { name: userName, role: role };
    userRole = role;
    updateUI();
  }
}

// Update UI based on user role
function updateUI() {
  const role = userRole || localStorage.getItem('role');
  if (!role) return;
  
  // Update body class for styling
  document.body.className = document.body.className.replace(/role-\w+/, '') + ` role-${role}`;
  
  // Update any role-specific elements
  const roleElements = document.querySelectorAll('[data-role]');
  roleElements.forEach(el => {
    const allowedRoles = el.dataset.role.split(',');
    if (allowedRoles.includes(role)) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  // Logout buttons
  const logoutBtns = document.querySelectorAll('.logout-btn, #logoutBtn, #logoutBtnT');
  logoutBtns.forEach(btn => {
    btn?.addEventListener('click', logout);
  });
  
  // Modal close handlers
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
}

// Logout function
function logout() {
  const keysToRemove = ['token', 'role', 'user', 'fullName', 'email', 'selectedChildId', 'selectedChildName', 'firstName', 'lastName', 'userId'];
  keysToRemove.forEach(key => localStorage.removeItem(key));
  window.location.href = 'login.html';
}

// Utility functions for grades
function viewGrades() {
  const gradesSection = document.getElementById('grades-section');
  if (gradesSection) {
    gradesSection.style.display = 'block';
    loadGrades();
  }
}

function loadGrades() {
  const storedGrades = localStorage.getItem('grades');
  const tbody = document.getElementById('grades-body');
  
  if (!tbody) return;
  
  if (storedGrades) {
    grades = JSON.parse(storedGrades);
  }
  
  tbody.innerHTML = '';
  
  if (grades.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No grades available</td></tr>';
    return;
  }
  
  grades.forEach(grade => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${grade.studentName || 'N/A'}</td>
      <td>${grade.subject || 'N/A'}</td>
      <td>${grade.grade || 'N/A'}</td>
      <td>Q${grade.quarter || '1'}</td>
      <td>${grade.remarks || '-'}</td>
    `;
    tbody.appendChild(row);
  });
}

// Error handling
window.addEventListener('error', function(e) {
  console.error('Application error:', e.error);
});

// Expose essential functions globally
if (typeof window !== 'undefined') {
  window.AppCore = {
    checkAuthentication,
    logout,
    loadUserData,
    updateUI
  };
}
