/**
 * Chart.js - Performance visualization for GradeTracker
 * Provides data visualization for student performance trends
 */

class PerformanceChart {
  constructor() {
    this.chart = null;
    this.chartType = 'line';
    this.timeRange = 'quarter';
    this.chartColors = {
      student: 'rgba(54, 162, 235, 0.8)',
      classAverage: 'rgba(255, 99, 132, 0.8)'
    };
    this.currentStudentId = null;
    this.currentSubjectId = null;
  }

  /**
   * Initialize the chart with configuration
   * @param {string} canvasId - The ID of the canvas element
   */
  initialize(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    this.chart = new (window.Chart)(ctx, {
      type: this.chartType,
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Score (%)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Assignments'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.raw}%`;
              }
            }
          }
        }
      }
    });
    
    // Set up event listeners
    this._setupEventListeners();
  }

  /**
   * Set up event listeners for chart controls
   * @private
   */
  _setupEventListeners() {
    const chartTypeSelect = document.getElementById('chartType');
    const timeRangeSelect = document.getElementById('timeRange');
    const studentSelect = document.getElementById('studentSelect');
    const exportReportBtn = document.getElementById('exportReport');
    
    if (chartTypeSelect) {
      chartTypeSelect.addEventListener('change', () => {
        this.setChartType(chartTypeSelect.value);
      });
    }
    
    if (timeRangeSelect) {
      timeRangeSelect.addEventListener('change', () => {
        this.setTimeRange(timeRangeSelect.value);
        this.loadStudentData(this.currentStudentId, this.currentSubjectId);
      });
    }
    
    if (studentSelect) {
      studentSelect.addEventListener('change', () => {
        this.currentStudentId = studentSelect.value;
        // Get subject ID from URL (?id=) or fallback to ?subject or '1'
        const urlParams = new URLSearchParams(window.location.search);
        this.currentSubjectId = urlParams.get('id') || urlParams.get('subject') || '1';
        
        if (this.currentStudentId) {
          this.loadStudentData(this.currentStudentId, this.currentSubjectId);
        }
      });
      
      // Populate student dropdown
      this._populateStudentDropdown(studentSelect);
    }
    
    if (exportReportBtn) {
      exportReportBtn.addEventListener('click', () => {
        this._exportReport();
      });
    }
  }
  
  /**
   * Populate student dropdown with mock data
   * @param {HTMLElement} selectElement - The select element to populate
   * @private
   */
  _populateStudentDropdown(selectElement) {
    if (!window.apiMock) {
      console.error('API Mock not available');
      return;
    }
    
    window.apiMock.getStudents().then(students => {
      // Clear existing options except the first one
      while (selectElement.options.length > 1) {
        selectElement.remove(1);
      }
      
      // Add student options
      students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.name;
        selectElement.appendChild(option);
      });
    });
  }

  /**
   * Update chart type (line, bar, radar)
   * @param {string} type - Chart type
   */
  setChartType(type) {
    if (!this.chart) return;
    
    this.chartType = type;
    this.chart.config.type = type;
    
    // Update radar chart specific options
    if (type === 'radar') {
      this.chart.options.scales = {};
      this.chart.options.elements = {
        line: {
          borderWidth: 3
        }
      };
      this.chart.options.scales.r = {
        angleLines: {
          display: true
        },
        suggestedMin: 0,
        suggestedMax: 100
      };
    } else {
      // Reset to default scales for line and bar charts
      this.chart.options.scales = {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Score (%)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Assignments'
          }
        }
      };
    }
    
    this.chart.update();
  }

  /**
   * Update time range for data display
   * @param {string} range - Time range (quarter, year)
   */
  setTimeRange(range) {
    this.timeRange = range;
  }

  /**
   * Load student performance data
   * @param {string} studentId - Student ID
   * @param {string} subjectId - Subject ID
   */
  async loadStudentData(studentId, subjectId) {
    if (!studentId || !subjectId) return;
    
    this.currentStudentId = studentId;
    this.currentSubjectId = subjectId;
    
    try {
      // Use the mock API to get performance data
      if (window.apiMock) {
        const data = await window.apiMock.getStudentPerformance(
          studentId, 
          subjectId, 
          this.timeRange
        );
        this._updateChartWithData(data);
      } else {
        // Fallback to mock data if API is not available
        this._updateChartWithMockData();
      }
    } catch (error) {
      console.error('Error loading student data:', error);
      // Fallback to mock data on error
      this._updateChartWithMockData();
    }
  }

  /**
   * Update chart with real data from API
   * @param {Object} data - Performance data
   * @private
   */
  _updateChartWithData(data) {
    if (!this.chart || !data) return;
    
    const { studentScores, classAverages } = data;
    
    // Extract labels (assignment names)
    const labels = studentScores.map(item => item.item_name);
    
    // Extract student scores as percentages
    const scores = studentScores.map(item => 
      (item.score / item.max_score) * 100
    );
    
    // Map class averages to match student assignments
    const avgScores = classAverages.map(item => 
      (item.avg_score / item.max_score) * 100
    );
    
    // Update chart data
    this.chart.data.labels = labels;
    this.chart.data.datasets = [
      {
        label: 'Student Score',
        data: scores,
        backgroundColor: this.chartColors.student,
        borderColor: this.chartColors.student,
        borderWidth: 2,
        fill: false,
        tension: 0.4
      },
      {
        label: 'Class Average',
        data: avgScores,
        backgroundColor: this.chartColors.classAverage,
        borderColor: this.chartColors.classAverage,
        borderWidth: 2,
        fill: false,
        tension: 0.4
      }
    ];
    
    this.chart.update();
  }

  /**
   * Update chart with mock data for demonstration
   * This would be replaced with real data in production
   * @private
   */
  _updateChartWithMockData() {
    if (!this.chart) return;

    // Generate mock data based on time range
    const dataPoints = this.timeRange === 'quarter' ? 8 : 20;
    const labels = Array.from({length: dataPoints}, (_, i) => `Assignment ${i+1}`);
    
    // Generate student scores
    const studentScores = Array.from({length: dataPoints}, () => 
      Math.floor(Math.random() * 30) + 70); // Random scores between 70-100
    
    // Generate class average scores
    const classAverageScores = Array.from({length: dataPoints}, () => 
      Math.floor(Math.random() * 20) + 75); // Random scores between 75-95
    
    // Update chart data
    this.chart.data.labels = labels;
    this.chart.data.datasets = [
      {
        label: 'Student Score',
        data: studentScores,
        backgroundColor: this.chartColors.student,
        borderColor: this.chartColors.student,
        borderWidth: 2,
        fill: false,
        tension: 0.4
      },
      {
        label: 'Class Average',
        data: classAverageScores,
        backgroundColor: this.chartColors.classAverage,
        borderColor: this.chartColors.classAverage,
        borderWidth: 2,
        fill: false,
        tension: 0.4
      }
    ];
    
    this.chart.update();
  }

  /**
   * Export report with chart and performance data
   * @private
   */
  _exportReport() {
    if (!this.currentStudentId || !this.currentSubjectId) {
      alert('Please select a student first');
      return;
    }
    
    const studentSelect = document.getElementById('studentSelect');
    const studentName = studentSelect.options[studentSelect.selectedIndex].text;
    
    if (window.apiMock) {
      window.apiMock.generateReport(
        this.currentStudentId, 
        this.currentSubjectId
      ).then(report => {
        if (report) {
          this._displayReport(report);
        } else {
          alert('Could not generate report. Please try again.');
        }
      });
    } else {
      // Generate simple report without API
      const chartImage = this.chart.toBase64Image();
      const avgStudentScore = this._calculateAverage(this.chart.data.datasets[0].data);
      const avgClassScore = this._calculateAverage(this.chart.data.datasets[1].data);
      
      const report = {
        studentName,
        subjectName: 'Subject',
        averageScore: avgStudentScore.toFixed(1),
        classAverage: avgClassScore.toFixed(1),
        comparisonToClass: (avgStudentScore - avgClassScore).toFixed(1),
        trend: 'Not available',
        recommendations: ['Recommendation not available without API']
      };
      
      this._displayReport(report);
    }
  }
  
  /**
   * Calculate average of an array of numbers
   * @param {Array} numbers - Array of numbers
   * @returns {number} Average value
   * @private
   */
  _calculateAverage(numbers) {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
  
  /**
   * Display report in a modal or alert
   * @param {Object} report - Report data
   * @private
   */
  _displayReport(report) {
    // In a real implementation, this would generate a PDF or display in a modal
    // For now, we'll just show an alert with the report data
    const message = `
Performance Report for ${report.studentName}
Subject: ${report.subjectName}

Average Score: ${report.averageScore}%
Class Average: ${report.classAverage}%
Comparison to Class: ${report.comparisonToClass > 0 ? '+' : ''}${report.comparisonToClass}%
Performance Trend: ${report.trend || 'N/A'}

Recommendations:
${report.recommendations ? report.recommendations.join('\n') : 'None available'}
    `;
    
    alert(message);
  }
}

/**
 * Enhanced Grade Estimation Algorithm
 * Calculates estimated final grades with proper category weights
 */
class GradeEstimator {
  constructor() {
    this.defaultWeights = {
      'Performance Task': 0.50,  // 50%
      'Written Works': 0.30,     // 30% 
      'Periodical Exam': 0.20    // 20%
    };
  }

  /**
   * Calculate estimated final grade with category weights
   * @param {Array} gradeItems - Array of grade items with scores
   * @param {Object} categoryWeights - Custom category weights
   * @returns {Object} Grade estimation results
   */
  calculateEstimatedGrade(gradeItems, categoryWeights = null) {
    const weights = categoryWeights || this.defaultWeights;
    
    // Group items by category
    const categories = {};
    
    gradeItems.forEach(item => {
      if (!item.included_in_final) return;
      
      const categoryName = item.category_name || 'Other';
      if (!categories[categoryName]) {
        categories[categoryName] = {
          items: [],
          totalScore: 0,
          totalMax: 0,
          weight: weights[categoryName] || 0
        };
      }
      
      categories[categoryName].items.push(item);
      if (item.score !== null && item.score !== undefined) {
        categories[categoryName].totalScore += parseFloat(item.score);
        categories[categoryName].totalMax += parseFloat(item.max_score);
      }
    });

    // Calculate weighted final grade
    let weightedTotal = 0;
    let totalWeight = 0;
    let completionItems = 0;
    let totalItems = 0;

    Object.keys(categories).forEach(categoryName => {
      const category = categories[categoryName];
      if (category.totalMax > 0) {
        const categoryAverage = (category.totalScore / category.totalMax) * 100;
        weightedTotal += categoryAverage * category.weight;
        totalWeight += category.weight;
      }
      
      totalItems += category.items.length;
      completionItems += category.items.filter(item => 
        item.score !== null && item.score !== undefined).length;
    });

    const estimatedGrade = totalWeight > 0 ? weightedTotal : 0;
    const completion = totalItems > 0 ? (completionItems / totalItems) * 100 : 0;

    return {
      estimatedGrade: Math.round(estimatedGrade * 100) / 100,
      completion: Math.round(completion * 10) / 10,
      categories: Object.keys(categories).map(name => ({
        name,
        average: categories[name].totalMax > 0 ? 
          Math.round((categories[name].totalScore / categories[name].totalMax) * 10000) / 100 : 0,
        weight: categories[name].weight * 100,
        itemsCount: categories[name].items.length,
        completedCount: categories[name].items.filter(item => 
          item.score !== null && item.score !== undefined).length
      }))
    };
  }
}

/**
 * Real-time Class Management System
 * Handles WebSocket connections for live updates
 */
class RealtimeClassManager {
  constructor() {
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  /**
   * Initialize real-time connection
   */
  connect() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const eventSourceUrl = `${window.API_BASE}/api/events?token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(eventSourceUrl);

      this.eventSource.addEventListener('open', () => {
        console.log('Real-time connection established');
        this.reconnectAttempts = 0;
        this.updateConnectionStatus(true);
      });

      this.eventSource.addEventListener('classCreated', (event) => {
        this.handleClassCreated(JSON.parse(event.data));
      });

      this.eventSource.addEventListener('enrollmentUpdated', (event) => {
        this.handleEnrollmentUpdated(JSON.parse(event.data));
      });

      this.eventSource.addEventListener('scoreUpdated', (event) => {
        this.handleScoreUpdated(JSON.parse(event.data));
      });

      this.eventSource.addEventListener('error', () => {
        this.updateConnectionStatus(false);
        this.handleConnectionError();
      });

    } catch (error) {
      console.error('Failed to establish real-time connection:', error);
    }
  }

  /**
   * Handle class creation events
   */
  handleClassCreated(data) {
    console.log('New class created:', data);
    // Refresh class list if on homepage
    if (window.location.pathname.includes('homepage')) {
      if (typeof loadTeacherSubjects === 'function') {
        loadTeacherSubjects();
      }
    }
  }

  /**
   * Handle student enrollment events
   */
  handleEnrollmentUpdated(data) {
    console.log('Enrollment updated:', data);
    // Show notification for teachers
    if (localStorage.getItem('role') === 'teacher') {
      this.showNotification('New student joined a class!', 'success');
    }
    // Refresh class/student lists
    this.refreshCurrentPageData();
  }

  /**
   * Handle grade/score update events
   */
  handleScoreUpdated(data) {
    console.log('Score updated:', data);
    // Refresh grade data if viewing grades
    if (window.location.pathname.includes('grades')) {
      this.refreshCurrentPageData();
    }
  }

  /**
   * Handle connection errors with reconnection logic
   */
  handleConnectionError() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus(connected) {
    const indicators = document.querySelectorAll('.real-time-indicator');
    indicators.forEach(indicator => {
      if (connected) {
        indicator.classList.add('connected');
      } else {
        indicator.classList.remove('connected');
      }
    });
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  /**
   * Refresh data on current page
   */
  refreshCurrentPageData() {
    const path = window.location.pathname;
    
    if (path.includes('homepage1') && typeof loadClasses === 'function') {
      loadClasses();
    } else if (path.includes('homepage2') && typeof loadTeacherSubjects === 'function') {
      loadTeacherSubjects();
    } else if (path.includes('student-grades') && typeof loadGradeData === 'function') {
      const currentQuarter = parseInt(document.querySelector('.quarter-tab.active')?.dataset.quarter) || 1;
      loadGradeData(currentQuarter);
    } else if (path.includes('teacher-grades') && typeof loadStudentGrades === 'function') {
      loadStudentGrades();
    }
  }

  /**
   * Disconnect real-time connection
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

// CSS animations for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOutRight {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}
.real-time-indicator .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  transition: background 0.3s ease;
}
.real-time-indicator.connected .status-dot {
  background: #10b981;
}
`;
document.head.appendChild(notificationStyles);

// Initialize systems when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Grade Estimator
  window.gradeEstimator = new GradeEstimator();
  
  // Initialize Real-time Class Manager
  window.realtimeManager = new RealtimeClassManager();
  
  // Connect to real-time updates if authenticated
  const token = localStorage.getItem('token');
  if (token) {
    window.realtimeManager.connect();
  }

  // Initialize performance chart if Chart.js is available
  if (window.Chart) {
    window.performanceChart = new PerformanceChart();
    
    const chartCanvas = document.getElementById('performanceChart');
    if (chartCanvas) {
      window.performanceChart.initialize('performanceChart');
    }
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (window.realtimeManager) {
      window.realtimeManager.disconnect();
    }
  });
});
