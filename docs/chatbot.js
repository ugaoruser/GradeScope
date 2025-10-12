/**
 * FeedbackChatbot - AI assistant for generating personalized student feedback
 * Helps teachers provide consistent, quality feedback based on student performance
 */

class FeedbackChatbot {
  constructor() {
    // Feedback templates for different performance levels
    this.feedbackTemplates = {
      excellent: [
        "{{name}} demonstrates exceptional understanding of {{topic}}. The work shows mastery of key concepts and excellent application of skills.",
        "Outstanding performance on {{topic}}! {{name}} shows deep comprehension and creative problem-solving abilities.",
        "Excellent work on {{topic}}! {{name}}'s performance exceeds expectations with thorough understanding and precise execution."
      ],
      good: [
        "{{name}} shows good understanding of {{topic}}. The work demonstrates solid grasp of concepts with minor areas for improvement.",
        "Good job on {{topic}}! {{name}} demonstrates consistent understanding and application of key concepts.",
        "{{name}} has performed well on {{topic}}, showing clear comprehension of most concepts and good execution."
      ],
      needsImprovement: [
        "{{name}} shows basic understanding of {{topic}} but needs more practice to strengthen comprehension of key concepts.",
        "{{name}}'s work on {{topic}} shows effort, but would benefit from additional review of fundamental concepts.",
        "With more focused practice on {{topic}}, {{name}} can improve understanding and application of important concepts."
      ],
      poor: [
        "{{name}} is struggling with {{topic}} and requires additional support. Let's schedule time to review the fundamental concepts.",
        "{{name}} needs significant help with {{topic}}. I recommend focused review sessions on the core principles.",
        "{{name}}'s understanding of {{topic}} needs immediate attention. Let's develop a structured plan to address knowledge gaps."
      ]
    };

    // Subject-specific improvement suggestions
    this.improvementSuggestions = {
      math: {
        excellent: [
          "Challenge with more complex problem-solving scenarios",
          "Introduce advanced concepts that build on current knowledge",
          "Encourage peer tutoring to reinforce mastery"
        ],
        good: [
          "Provide practice with varied problem types",
          "Review specific concepts where minor errors occurred",
          "Assign extension activities that apply concepts in new contexts"
        ],
        needsImprovement: [
          "Focus on foundational skills with targeted practice",
          "Use visual models to reinforce abstract concepts",
          "Break down complex problems into smaller steps"
        ],
        poor: [
          "Schedule one-on-one review sessions",
          "Return to prerequisite skills that may be missing",
          "Provide simplified practice with immediate feedback"
        ]
      },
      science: {
        excellent: [
          "Assign independent research projects",
          "Connect concepts to real-world applications",
          "Encourage participation in science competitions"
        ],
        good: [
          "Incorporate more hands-on experiments",
          "Connect theoretical concepts to practical applications",
          "Provide additional reading on related topics"
        ],
        needsImprovement: [
          "Review scientific vocabulary and key terms",
          "Use multimedia resources to reinforce concepts",
          "Practice scientific method with structured experiments"
        ],
        poor: [
          "Create simplified concept maps",
          "Use concrete examples before abstract concepts",
          "Break complex processes into sequential steps"
        ]
      },
      english: {
        excellent: [
          "Introduce more challenging literature",
          "Encourage creative writing projects",
          "Develop advanced analytical skills"
        ],
        good: [
          "Practice varied writing styles",
          "Focus on deeper textual analysis",
          "Expand vocabulary through thematic word studies"
        ],
        needsImprovement: [
          "Review grammar fundamentals",
          "Practice structured paragraph writing",
          "Develop reading comprehension with guided questions"
        ],
        poor: [
          "Focus on sentence-level construction",
          "Build vocabulary through contextual learning",
          "Use graphic organizers for writing preparation"
        ]
      },
      history: {
        excellent: [
          "Explore primary source analysis",
          "Assign research projects on specialized topics",
          "Connect historical events to contemporary issues"
        ],
        good: [
          "Practice comparing different historical perspectives",
          "Create timelines to reinforce chronological understanding",
          "Analyze cause and effect relationships"
        ],
        needsImprovement: [
          "Focus on key events and their significance",
          "Use visual aids to reinforce chronology",
          "Practice summarizing historical narratives"
        ],
        poor: [
          "Create simplified timelines of major events",
          "Use historical fiction to build context",
          "Focus on biographical studies of key figures"
        ]
      }
    };
  }

  /**
   * Generate personalized feedback based on score and topic
   * @param {number} score - Student's score (0-100)
   * @param {string} subject - Subject area (math, science, english, history)
   * @param {string} topic - Specific topic within the subject
   * @param {string} name - Student's name (optional)
   * @returns {string} Personalized feedback
   */
  generateFeedback(score, subject, topic, name = "The student") {
    let performanceLevel;
    
    // Determine performance level based on score
    if (score >= 90) {
      performanceLevel = 'excellent';
    } else if (score >= 75) {
      performanceLevel = 'good';
    } else if (score >= 60) {
      performanceLevel = 'needsImprovement';
    } else {
      performanceLevel = 'poor';
    }
    
    // Select a random template from the appropriate category
    const templates = this.feedbackTemplates[performanceLevel];
    const randomIndex = Math.floor(Math.random() * templates.length);
    let feedback = templates[randomIndex];
    
    // Replace placeholders with actual values
    feedback = feedback.replace(/{{name}}/g, name);
    feedback = feedback.replace(/{{topic}}/g, topic);
    
    return feedback;
  }

  /**
   * Get the standardized subject key
   * @param {string} subject - The subject name to standardize
   * @returns {string} Standardized subject key
   */
  getSubjectKey(subject) {
    subject = subject.toLowerCase();
    
    if (subject.includes('math') || subject.includes('algebra') || 
        subject.includes('calculus') || subject.includes('geometry')) {
      return 'math';
    } else if (subject.includes('science') || subject.includes('biology') || 
               subject.includes('chemistry') || subject.includes('physics')) {
      return 'science';
    } else if (subject.includes('english') || subject.includes('literature') || 
               subject.includes('writing') || subject.includes('language')) {
      return 'english';
    } else if (subject.includes('history') || subject.includes('social') || 
               subject.includes('geography') || subject.includes('economics')) {
      return 'history';
    }
    
    // Default to math if no match
    return 'math';
  }

  /**
   * Generate improvement suggestions based on score and subject
   * @param {number} score - Student's score (0-100)
   * @param {string} subject - Subject area
   * @returns {Array} List of improvement suggestions
   */
  generateImprovementSuggestions(score, subject) {
    let performanceLevel;
    const subjectKey = this.getSubjectKey(subject);
    
    // Determine performance level based on score
    if (score >= 90) {
      performanceLevel = 'excellent';
    } else if (score >= 75) {
      performanceLevel = 'good';
    } else if (score >= 60) {
      performanceLevel = 'needsImprovement';
    } else {
      performanceLevel = 'poor';
    }
    
    // Get suggestions for the subject and performance level
    const suggestions = this.improvementSuggestions[subjectKey][performanceLevel];
    return suggestions || [];
  }

  /**
   * Generate complete feedback including personalized message and improvement suggestions
   * @param {number} score - Student's score (0-100)
   * @param {string} subject - Subject area
   * @param {string} topic - Specific topic within the subject
   * @param {string} name - Student's name (optional)
   * @returns {Object} Object containing feedback and suggestions
   */
  generateCompleteFeedback(score, subject, topic, name = "The student") {
    const personalizedFeedback = this.generateFeedback(score, subject, topic, name);
    const suggestions = this.generateImprovementSuggestions(score, subject);
    
    return {
      feedback: personalizedFeedback,
      suggestions: suggestions
    };
  }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', function() {
  const chatbot = new FeedbackChatbot();
  
  // Toggle chatbot visibility
  const toggleButton = document.getElementById('toggleChatbot');
  const chatbotContent = document.querySelector('.chatbot-content');
  
  if (toggleButton && chatbotContent) {
    toggleButton.addEventListener('click', function() {
      const isVisible = chatbotContent.style.display !== 'none';
      chatbotContent.style.display = isVisible ? 'none' : 'block';
      toggleButton.textContent = isVisible ? 'Show' : 'Hide';
    });
  }
  
  // Generate feedback button
  const generateButton = document.getElementById('generateFeedback');
  if (generateButton) {
    generateButton.addEventListener('click', function() {
      const score = parseInt(document.getElementById('feedbackScore').value) || 85;
      const topic = document.getElementById('feedbackTopic').value || 'this topic';
      
      // Get the subject from the page context
      const subjectName = document.querySelector('.subject-title')?.textContent || 'General';
      
      // Get selected student name if available
      const studentSelect = document.getElementById('studentSelect');
      const studentName = studentSelect && studentSelect.options[studentSelect.selectedIndex]?.text !== 'Select a student' 
        ? studentSelect.options[studentSelect.selectedIndex].text 
        : 'The student';
      
      // Generate feedback
      const feedbackResult = chatbot.generateCompleteFeedback(score, subjectName, topic, studentName);
      
      // Update UI with feedback
      document.getElementById('personalizedFeedback').textContent = feedbackResult.feedback;
      
      // Update suggestions list
      const suggestionsList = document.getElementById('improvementSuggestions');
      suggestionsList.innerHTML = '';
      feedbackResult.suggestions.forEach(suggestion => {
        const li = document.createElement('li');
        li.textContent = suggestion;
        suggestionsList.appendChild(li);
      });
    });
  }
  
  // Copy feedback to comments button
  const copyButton = document.getElementById('copyFeedback');
  if (copyButton) {
    copyButton.addEventListener('click', function() {
      const feedback = document.getElementById('personalizedFeedback').textContent;
      
      // Find the active score form comments field
      const commentsField = document.querySelector('.score-form textarea[name="comments"]');
      if (commentsField) {
        commentsField.value = feedback;
        alert('Feedback copied to comments field');
      } else {
        alert('No comments field found. Please open a score form first.');
      }
    });
  }
});