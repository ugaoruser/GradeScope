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
    this.chart = new Chart(ctx, {
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

// Initialize chart when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded. Please include Chart.js library.');
    return;
  }

  // Initialize performance chart
  window.performanceChart = new PerformanceChart();
  
  // Initialize chart if canvas exists
  const chartCanvas = document.getElementById('performanceChart');
  if (chartCanvas) {
    window.performanceChart.initialize('performanceChart');
  }
});