/**
 * Debug script to test navigation and modal functionality
 * Add to any page to test if elements are working
 */

console.log('🔍 GradeTracker Debug Script Loaded');

// Test element existence and event binding
function debugElements() {
  const elements = [
    'navHome', 'navHomeT', 'navSettings', 'navSettingsT',
    'aboutBtn', 'joinBtn', 'joinModal', 'aboutModal',
    'closeJoin', 'cancelJoin', 'confirmJoin'
  ];
  
  console.log('📋 Element Check:');
  elements.forEach(id => {
    const el = document.getElementById(id);
    console.log(`${id}: ${el ? '✅ Found' : '❌ Missing'}`);
    if (el && el._listeners) {
      console.log(`  └ Has event listeners: ${Object.keys(el._listeners).length}`);
    }
  });
}

// Test modal functionality
function testModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`❌ Modal ${modalId} not found`);
    return;
  }
  
  console.log(`🧪 Testing modal: ${modalId}`);
  
  // Test show
  modal.style.display = 'flex';
  modal.offsetHeight; // Force reflow
  requestAnimationFrame(() => {
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    console.log(`✅ Modal ${modalId} shown`);
    
    // Test hide after 2 seconds
    setTimeout(() => {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      setTimeout(() => {
        modal.style.display = 'none';
        console.log(`✅ Modal ${modalId} hidden`);
      }, 250);
    }, 2000);
  });
}

// Test navigation
function testNavigation() {
  console.log('🧪 Testing Navigation...');
  
  const navElements = ['navHome', 'navHomeT', 'navSettings', 'navSettingsT'];
  navElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      console.log(`✅ ${id} found and clickable`);
      // Test click without actually navigating
      el.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`🖱️ ${id} clicked successfully`);
        return false;
      });
    }
  });
}

// Auto-run tests when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(debugElements, 1000);
    setTimeout(testNavigation, 1500);
  });
} else {
  setTimeout(debugElements, 1000);
  setTimeout(testNavigation, 1500);
}

// Expose test functions globally
window.debugGT = {
  elements: debugElements,
  modal: testModal,
  nav: testNavigation
};

console.log('🎯 Debug functions available: window.debugGT.elements(), window.debugGT.modal("joinModal"), window.debugGT.nav()');