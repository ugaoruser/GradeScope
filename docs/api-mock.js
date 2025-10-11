/**
 * API Mock - Provides mock data for GradeTracker application
 * Used for development and testing purposes
 */

class ApiMock {
  constructor() {
    this.students = [
      { id: 1, name: "John Smith" },
      { id: 2, name: "Emma Johnson" },
      { id: 3, name: "Michael Brown" },
      { id: 4, name: "Sophia Davis" },
      { id: 5, name: "William Wilson" }
    ];
    
    this.subjects = [
      { id: 1, name: "Mathematics" },
      { id: 2, name: "Science" },
      { id: 3, name: "English" },
      { id: 4, name: "History" }
    ];
    
    this.gradeCategories = [
      { id: 1, name: "Written Works", weight: 30 },
      { id: 2, name: "Performance Tasks", weight: 50 },
      { id: 3, name: "Quarterly Assessment", weight: 20 }
    ];
  }

  /**
   * Get mock student performance data
   * @param {number} studentId - Student ID
   * @param {number} subjectId - Subject ID
   * @param {string} timeRange - Time range (quarter, year)
   * @returns {Promise} Promise resolving to performance data
   */
  getStudentPerformance(studentId, subjectId, timeRange) {
    return new Promise(resolve => {
      // Generate dates based on time range
      const dates = this._generateDates(timeRange);
      
      // Generate student scores
      const studentScores = dates.map((date, index) => {
        const maxScore = 100;
        const score = Math.floor(Math.random() * 30) + 70; // 70-100 range
        const categoryIndex = index % this.gradeCategories.length;
        
        return {
          score,
          date,
          item_name: `Assignment ${index + 1}`,
          category_name: this.gradeCategories[categoryIndex].name,
          max_score: maxScore
        };
      });
      
      // Generate class averages
      const classAverages = studentScores.map((item, index) => {
        return {
          item_id: index + 1,
          item_name: item.item_name,
          avg_score: Math.floor(Math.random() * 15) + 75, // 75-90 range
          max_score: item.max_score
        };
      });
      
      // Simulate network delay
      setTimeout(() => {
        resolve({
          studentScores,
          classAverages
        });
      }, 300);
    });
  }
  
  /**
   * Get list of students
   * @returns {Promise} Promise resolving to student list
   */
  getStudents() {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(this.students);
      }, 200);
    });
  }
  
  /**
   * Generate mock dates based on time range
   * @param {string} timeRange - Time range (quarter, year)
   * @returns {Array} Array of date strings
   * @private
   */
  _generateDates(timeRange) {
    const dates = [];
    const count = timeRange === 'quarter' ? 8 : 20;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Generate dates within the current quarter or year
    for (let i = 0; i < count; i++) {
      let date;
      if (timeRange === 'quarter') {
        // Current quarter - spread over 3 months
        const quarterStartMonth = Math.floor(month / 3) * 3;
        const monthOffset = i % 3;
        const dayOffset = Math.floor(i / 3) * 10 + 5;
        date = new Date(year, quarterStartMonth + monthOffset, dayOffset);
      } else {
        // Full year - spread over 12 months
        const monthOffset = i % 12;
        const dayOffset = Math.floor(i / 12) * 7 + 15;
        date = new Date(year, monthOffset, dayOffset);
      }
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // Sort dates chronologically
    dates.sort();
    
    return dates;
  }
  
  /**
   * Generate a performance report
   * @param {number} studentId - Student ID
   * @param {number} subjectId - Subject ID
   * @returns {Promise} Promise resolving to report data
   */
  generateReport(studentId, subjectId) {
    return new Promise(resolve => {
      const student = this.students.find(s => s.id === parseInt(studentId));
      const subject = this.subjects.find(s => s.id === parseInt(subjectId));
      
      if (!student || !subject) {
        resolve(null);
        return;
      }
      
      this.getStudentPerformance(studentId, subjectId, 'year').then(data => {
        const studentScores = data.studentScores.map(item => item.score);
        const classScores = data.classAverages.map(item => item.avg_score);
        
        const avgStudentScore = studentScores.reduce((a, b) => a + b, 0) / studentScores.length;
        const avgClassScore = classScores.reduce((a, b) => a + b, 0) / classScores.length;
        
        const report = {
          studentName: student.name,
          subjectName: subject.name,
          averageScore: avgStudentScore.toFixed(1),
          classAverage: avgClassScore.toFixed(1),
          comparisonToClass: (avgStudentScore - avgClassScore).toFixed(1),
          highestScore: Math.max(...studentScores),
          lowestScore: Math.min(...studentScores),
          trend: this._calculateTrend(studentScores),
          recommendations: this._generateRecommendations(avgStudentScore, subject.name)
        };
        
        setTimeout(() => {
          resolve(report);
        }, 500);
      });
    });
  }
  
  /**
   * Calculate performance trend
   * @param {Array} scores - Array of scores
   * @returns {string} Trend description
   * @private
   */
  _calculateTrend(scores) {
    if (scores.length < 2) return 'Not enough data';
    
    // Simple linear regression to determine trend
    const n = scores.length;
    const indices = Array.from({length: n}, (_, i) => i);
    
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((acc, x, i) => acc + x * scores[i], 0);
    const sumXX = indices.reduce((acc, x) => acc + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    if (slope > 1) return 'Strong improvement';
    if (slope > 0.2) return 'Improving';
    if (slope > -0.2) return 'Stable';
    if (slope > -1) return 'Declining';
    return 'Strong decline';
  }
  
  /**
   * Generate recommendations based on score and subject
   * @param {number} score - Average score
   * @param {string} subject - Subject name
   * @returns {Array} Array of recommendation strings
   * @private
   */
  _generateRecommendations(score, subject) {
    const recommendations = [];
    
    if (score >= 90) {
      recommendations.push('Consider advanced placement opportunities');
      recommendations.push('Encourage peer tutoring to reinforce knowledge');
    } else if (score >= 80) {
      recommendations.push('Focus on challenging problem areas');
      recommendations.push('Provide additional practice in specific topics');
    } else if (score >= 70) {
      recommendations.push('Schedule regular review sessions');
      recommendations.push('Implement targeted intervention strategies');
    } else {
      recommendations.push('Develop a comprehensive improvement plan');
      recommendations.push('Consider one-on-one tutoring sessions');
      recommendations.push('Break down complex topics into smaller components');
    }
    
    // Add subject-specific recommendations
    switch (subject.toLowerCase()) {
      case 'mathematics':
        recommendations.push('Practice with real-world math applications');
        break;
      case 'science':
        recommendations.push('Incorporate more hands-on experiments');
        break;
      case 'english':
        recommendations.push('Encourage daily reading and writing practice');
        break;
      case 'history':
        recommendations.push('Connect historical events to current affairs');
        break;
    }
    
    return recommendations;
  }
}

// Create global instance
window.apiMock = new ApiMock();