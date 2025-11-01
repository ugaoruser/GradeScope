class WitAIChatbot {
  constructor() {
    // Wit.ai API configuration
    this.witApiToken = 'C4OIIUXCQHUO5ZPOGBZRE7EEMK2OMXDD';
    this.witApiUrl = 'https://api.wit.ai/message';
    this.apiVersion = '20251031';
    
    // Fallback responses for when API fails
    this.fallbackResponses = {
      greeting: "Hello! I'm your AI teaching assistant. I can help with generating feedback, calculating averages, and answering questions about student grades.",
      error: "I'm sorry, I'm having trouble understanding right now. You can try asking me to calculate averages, generate feedback for students, or help with grading tasks.",
      feedback: "I can help generate personalized feedback for students. Just tell me the student's name, subject, and their score!",
      average: "I can calculate averages for you. Just provide me with the numbers you'd like me to average.",
      help: "I can help you with:\n• Calculating grade averages\n• Generating student feedback\n• Answering questions about grading\n• General teaching assistance"
    };
    
    // Grade feedback templates for different score ranges
    this.gradeTemplates = {
      excellent: [
        "demonstrates exceptional understanding and mastery of the concepts",
        "shows outstanding performance with excellent comprehension",
        "exhibits superior grasp of the material with creative application"
      ],
      good: [
        "shows good understanding with solid performance",
        "demonstrates competent grasp of key concepts",
        "displays consistent understanding with room for growth"
      ],
      needsImprovement: [
        "shows basic understanding but needs more practice",
        "demonstrates effort but requires additional support",
        "needs focused review to strengthen comprehension"
      ],
      poor: [
        "requires significant support and additional practice",
        "needs immediate attention and structured review",
        "would benefit from one-on-one guidance"
      ]
    };
  }

  /**
   * Send message to Wit.ai API
   * @param {string} message - User message to process
   * @returns {Promise<Object>} Wit.ai response
   */
  async sendToWitAI(message) {
    try {
      const response = await fetch(`${this.witApiUrl}?v=${this.apiVersion}&q=${encodeURIComponent(message)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.witApiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Wit.ai API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Wit.ai API error:', error);
      return null;
    }
  }

  /**
   * Process user message and generate response
   * @param {string} message - User message
   * @returns {Promise<string>} Response message
   */
  async processMessage(message) {
    if (!message || typeof message !== 'string') {
      return this.fallbackResponses.error;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return this.fallbackResponses.help;
    }

    // First try Wit.ai API
    const witResponse = await this.sendToWitAI(trimmedMessage);
    
    // If Wit.ai API works, process the response
    if (witResponse) {
      return await this.handleWitAIResponse(trimmedMessage, witResponse);
    }

    // Fallback to local processing if API fails
    return this.handleLocalProcessing(trimmedMessage);
  }

  /**
   * Handle Wit.ai API response
   * @param {string} originalMessage - Original user message
   * @param {Object} witResponse - Response from Wit.ai
   * @returns {Promise<string>} Processed response
   */
  async handleWitAIResponse(originalMessage, witResponse) {
    try {
      // Extract intents and entities from Wit.ai response
      const intents = witResponse.intents || [];
      const entities = witResponse.entities || {};
      
      // Get the highest confidence intent
      const topIntent = intents.length > 0 ? intents[0] : null;
      const intentName = topIntent ? topIntent.name : '';
      const confidence = topIntent ? topIntent.confidence : 0;

      // If confidence is too low, fall back to local processing
      if (confidence < 0.5) {
        return this.handleLocalProcessing(originalMessage);
      }

      // Handle different intents
      switch (intentName) {
        case 'greetings':
        case 'greeting':
          return this.fallbackResponses.greeting;
          
        case 'calculate_average':
        case 'math_calculation':
          return this.handleAverageCalculation(originalMessage, entities);
          
        case 'generate_feedback':
        case 'student_feedback':
          return this.handleFeedbackGeneration(originalMessage, entities);
          
        case 'help':
        case 'assistance':
          return this.fallbackResponses.help;
          
        default:
          // Try to extract meaningful response from Wit.ai text
          if (witResponse.text && witResponse.text.length > 10) {
            return `Based on your message "${witResponse.text}", I can help you with grading tasks. ${this.fallbackResponses.help}`;
          }
          return this.handleLocalProcessing(originalMessage);
      }
    } catch (error) {
      console.error('Error processing Wit.ai response:', error);
      return this.handleLocalProcessing(originalMessage);
    }
  }

  /**
   * Handle local processing when API fails or confidence is low
   * @param {string} message - User message
   * @returns {string} Response message
   */
  handleLocalProcessing(message) {
    const lower = message.toLowerCase();

    // Greeting detection
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(lower)) {
      return this.fallbackResponses.greeting;
    }

    // Help detection
    if (/help|assist|what can you do/i.test(lower)) {
      return this.fallbackResponses.help;
    }

    // Average calculation
    if (lower.includes('average')) {
      const numbers = message.match(/\d+(?:\.\d+)?/g);
      if (numbers && numbers.length > 1) {
        const nums = numbers.map(Number);
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        return `The average of ${nums.join(', ')} is ${avg.toFixed(1)}.`;
      }
      return "To calculate an average, please provide the numbers you'd like me to average (e.g., 'average of 85, 90, 78').";
    }

    // Feedback generation
    if (lower.includes('feedback') || lower.includes('comment')) {
      return this.handleFeedbackRequest(message);
    }

    // Grade interpretation
    if (lower.includes('grade') && /\d+/.test(message)) {
      const score = parseInt(message.match(/\d+/)[0]);
      return this.interpretGrade(score);
    }

    return this.fallbackResponses.error;
  }

  /**
   * Handle average calculation from entities or text
   * @param {string} message - Original message
   * @param {Object} entities - Wit.ai entities
   * @returns {string} Average calculation result
   */
  handleAverageCalculation(message, entities) {
    // Try to extract numbers from entities first
    let numbers = [];
    
    if (entities.wit$number) {
      numbers = entities.wit$number.map(entity => parseFloat(entity.value)).filter(n => !isNaN(n));
    }
    
    // Fallback to regex extraction
    if (numbers.length === 0) {
      const matches = message.match(/\d+(?:\.\d+)?/g);
      if (matches) {
        numbers = matches.map(Number).filter(n => !isNaN(n));
      }
    }

    if (numbers.length > 1) {
      const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      return `The average of ${numbers.join(', ')} is ${avg.toFixed(1)}.`;
    }

    return "Please provide at least two numbers to calculate an average.";
  }

  /**
   * Handle feedback generation request
   * @param {string} message - Original message
   * @param {Object} entities - Wit.ai entities
   * @returns {string} Generated feedback
   */
  handleFeedbackGeneration(message, entities) {
    return this.handleFeedbackRequest(message);
  }

  /**
   * Handle feedback request from local processing
   * @param {string} message - User message
   * @returns {string} Feedback response
   */
  handleFeedbackRequest(message) {
    // Try to extract name, subject, and score
    const nameMatch = message.match(/for\s+([A-Za-z][A-Za-z\s]*?)(?:\s+in|\s+score|\s*,|$)/i);
    const scoreMatch = message.match(/(?:score|scored|got)\s*:?\s*(\d+)/i) || message.match(/(\d+)(?!.*\d)/);
    const subjectMatch = message.match(/in\s+([A-Za-z][A-Za-z\s]*?)(?:\s+score|\s*,|$)/i);

    const name = nameMatch ? nameMatch[1].trim() : 'the student';
    const score = scoreMatch ? Math.min(100, parseInt(scoreMatch[1], 10)) : 85;
    const subject = subjectMatch ? subjectMatch[1].trim() : 'this subject';

    return this.generateFeedback(score, subject, name);
  }

  /**
   * Generate personalized feedback based on score and topic
   * @param {number} score - Student's score (0-100)
   * @param {string} subject - Subject area
   * @param {string} name - Student's name (optional)
   * @returns {string} Personalized feedback
   */
  generateFeedback(score, subject, name = "The student") {
    let level;
    if (score >= 90) level = 'excellent';
    else if (score >= 75) level = 'good';
    else if (score >= 60) level = 'needsImprovement';
    else level = 'poor';

    const templates = this.gradeTemplates[level];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return `${name} scored ${score}% in ${subject} and ${template}. ${this.getSuggestion(level)}`;
  }

  /**
   * Get suggestion based on performance level
   * @param {string} level - Performance level
   * @returns {string} Suggestion
   */
  getSuggestion(level) {
    const suggestions = {
      excellent: "Consider providing more challenging material to maintain engagement.",
      good: "With a bit more practice, they can reach excellence.",
      needsImprovement: "Additional practice and review would be beneficial.",
      poor: "One-on-one support and focused review sessions are recommended."
    };
    return suggestions[level] || "";
  }

  /**
   * Interpret grade score
   * @param {number} score - Grade score
   * @returns {string} Grade interpretation
   */
  interpretGrade(score) {
    if (score >= 97) return `A score of ${score}% is excellent! Outstanding performance.`;
    if (score >= 93) return `A score of ${score}% is very good. Strong understanding shown.`;
    if (score >= 90) return `A score of ${score}% is good. Solid grasp of the material.`;
    if (score >= 87) return `A score of ${score}% shows good understanding with room for improvement.`;
    if (score >= 83) return `A score of ${score}% indicates basic understanding. More practice needed.`;
    if (score >= 80) return `A score of ${score}% suggests difficulty with the material. Additional support recommended.`;
    if (score >= 77) return `A score of ${score}% shows significant challenges. Immediate intervention needed.`;
    if (score >= 70) return `A score of ${score}% indicates major difficulties. Comprehensive review required.`;
    return `A score of ${score}% shows serious learning gaps. Intensive support and remediation needed.`;
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
    const feedback = this.generateFeedback(score, `${subject} - ${topic}`, name);
    const suggestions = [this.getSuggestion(score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'needsImprovement' : 'poor')];
    
    return {
      feedback: feedback,
      suggestions: suggestions
    };
  }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', function() {
  const chatbot = new WitAIChatbot();
  
  // Toggle chatbot visibility (for teacher-grades page)
  const toggleButton = document.getElementById('toggleChatbot');
  const chatbotContent = document.querySelector('.chatbot-content');
  
  if (toggleButton && chatbotContent) {
    toggleButton.addEventListener('click', function() {
      const isVisible = chatbotContent.style.display !== 'none';
      chatbotContent.style.display = isVisible ? 'none' : 'block';
      toggleButton.textContent = isVisible ? 'Show' : 'Hide';
    });
  }
  
  // Generate feedback button (for teacher-grades page)
  const generateButton = document.getElementById('generateFeedback');
  if (generateButton) {
    generateButton.addEventListener('click', async function() {
      const score = parseInt(document.getElementById('feedbackScore').value) || 85;
      const topic = document.getElementById('feedbackTopic').value || 'this topic';
      
      // Get the subject from the page context
      const subjectName = document.querySelector('.subject-title')?.textContent || 
                         document.getElementById('subjectTitle')?.textContent || 'General';
      
      // Get selected student name if available
      const studentSelect = document.getElementById('studentSelect');
      const studentName = studentSelect && studentSelect.options[studentSelect.selectedIndex]?.text !== 'All Students' 
        ? studentSelect.options[studentSelect.selectedIndex].text 
        : 'The student';
      
      // Generate feedback using the new API
      const feedbackResult = chatbot.generateCompleteFeedback(score, subjectName, topic, studentName);
      
      // Update UI with feedback
      document.getElementById('personalizedFeedback').textContent = feedbackResult.feedback;
      
      // Update suggestions list
      const suggestionsList = document.getElementById('improvementSuggestions');
      if (suggestionsList) {
        suggestionsList.innerHTML = '';
        feedbackResult.suggestions.forEach(suggestion => {
          const li = document.createElement('li');
          li.textContent = suggestion;
          suggestionsList.appendChild(li);
        });
      }
    });
  }
  
  // Copy feedback to comments button
  const copyButton = document.getElementById('copyFeedback');
  if (copyButton) {
    copyButton.addEventListener('click', function() {
      const feedback = document.getElementById('personalizedFeedback')?.textContent;
      if (!feedback) {
        alert('No feedback to copy. Please generate feedback first.');
        return;
      }
      
      // Try to find comments field in various contexts
      const commentsField = document.getElementById('scoreComments') || 
                           document.querySelector('textarea[name="comments"]') ||
                           document.querySelector('.score-form textarea');
      
      if (commentsField) {
        commentsField.value = feedback;
        alert('Feedback copied to comments field');
      } else {
        // Copy to clipboard as fallback
        navigator.clipboard.writeText(feedback).then(() => {
          alert('Feedback copied to clipboard');
        }).catch(() => {
          alert('No comments field found. Please open a score form first.');
        });
      }
    });
  }
});

// Expose a singleton agent for collaboration across pages
if (typeof window !== 'undefined') {
  if (!window.Agent) {
    try {
      window.Agent = new WitAIChatbot();
    } catch (_) {}
  }
}
