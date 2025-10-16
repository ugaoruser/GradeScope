/**
 * Role-based Access Control System for GradeTracker
 * This file provides centralized access control functionality
 */

// Define permission levels for different roles

const API_BASE = `https://gradescope-a4hw.onrender.com`;

const PERMISSIONS = {
  student: {
    viewOwnGrades: true,
    joinSubjects: true,
    viewSubjectDetails: true,
    viewOwnProfile: true,
    editOwnProfile: true
  },
  teacher: {
    viewOwnGrades: false,
    joinSubjects: false,
    viewSubjectDetails: true,
    viewOwnProfile: true,
    editOwnProfile: true,
    createSubjects: true,
    manageGrades: true,
    viewStudentGrades: true,
    createGradeItems: true,
    createGradeCategories: true,
    viewEnrolledStudents: true
  },
  parent: {
    viewOwnGrades: false,
    joinSubjects: true, // For their children
    viewSubjectDetails: true,
    viewOwnProfile: true,
    editOwnProfile: true,
    viewChildGrades: true,
    viewChildSubjects: true
  },
  admin: {
    viewOwnGrades: false,
    joinSubjects: false,
    viewSubjectDetails: true,
    viewOwnProfile: true,
    editOwnProfile: true,
    createSubjects: true,
    manageGrades: true,
    viewStudentGrades: true,
    createGradeItems: true,
    createGradeCategories: true,
    viewEnrolledStudents: true,
    manageUsers: true,
    manageRoles: true,
    viewSystemLogs: true
  }
};

// Check if user has permission
function hasPermission(permission) {
  const role = localStorage.getItem('role');
  if (!role) return false;
  
  return PERMISSIONS[role] && PERMISSIONS[role][permission] === true;
}

// Enforce page access based on role
function enforcePageAccess() {
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  
  // If not logged in, redirect to login
  if (!token) {
    if (!['/login.html', '/signup.html'].some(page => window.location.pathname.endsWith(page))) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }
  
  // Page access rules
  const currentPage = window.location.pathname;
  
  // Pages accessible to all authenticated users
  const commonPages = ['index.html', 'subject.html'];
  if (commonPages.some(page => currentPage.endsWith(page))) {
    return true;
  }
  
  // Role-specific page access
  if (currentPage.endsWith('teacher-grades.html') && role !== 'teacher' && role !== 'admin') {
    window.location.href = `index.html`;
    return false;
  }
  
  if (currentPage.endsWith('student-grades.html') && role !== 'student' && role !== 'parent' && role !== 'teacher' && role !== 'admin') {
    window.location.href = `index.html`;
    return false;
  }
  
  return true;
}

// Hide/show UI elements based on permissions
function updateUIByPermission() {
  const role = localStorage.getItem('role');
  
  // Add role class to body
  document.body.classList.remove('role-student', 'role-teacher', 'role-parent', 'role-admin');
  document.body.classList.add(`role-${role}`);
  
  // Hide/show elements with permission-based classes
  document.querySelectorAll('[data-requires-permission]').forEach(element => {
    const requiredPermission = element.getAttribute('data-requires-permission');
    if (hasPermission(requiredPermission)) {
      element.style.display = '';
    } else {
      element.style.display = 'none';
    }
  });
  
  // Hide/show elements with role-based classes
  document.querySelectorAll('[data-requires-role]').forEach(element => {
    const requiredRoles = element.getAttribute('data-requires-role').split(',');
    if (requiredRoles.includes(role)) {
      element.style.display = '';
    } else {
      element.style.display = 'none';
    }
  });
}

// Verify token with server and update user info
async function verifyAuthentication() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const response = await fetch(`${window.API_BASE}/api/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      clearUserSession();
      return false;
    }
    
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Authentication error:', error);
    clearUserSession();
    return false;
  }
}

// Clear user session data
function clearUserSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('userName');
  localStorage.removeItem('userId');
}

// Initialize access control
function initAccessControl() {
  // Check authentication and enforce page access
  if (!enforcePageAccess()) return;
  
  // Update UI based on permissions
  document.addEventListener('DOMContentLoaded', () => {
    updateUIByPermission();
  });
  
  // Verify token periodically (every 5 minutes)
  setInterval(verifyAuthentication, 5 * 60 * 1000);
}

// Export functions
window.AccessControl = {
  hasPermission,
  enforcePageAccess,
  updateUIByPermission,
  verifyAuthentication,
  clearUserSession,
  initAccessControl
};

// Auto-initialize
initAccessControl();