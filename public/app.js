// Application State
let appState = {
    currentUser: null,
    goals: [],
    validationResult: null,
    pendingQuestions: null
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Goal Tracker initialized');
    checkSession();
    setupEventListeners();
});

// Check if user has an active session
async function checkSession() {
    try {
        // Check database status first
        await checkDatabaseStatus();
        
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (data.success && data.user) {
            appState.currentUser = data.user;
            showApp();
            loadGoals();
        } else {
            showAuth();
        }
    } catch (error) {
        console.error('Session check failed:', error);
        showAuth();
    }
}

// Check database connectivity status
async function checkDatabaseStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.success && data.database.connected) {
            showToast('Database connected successfully', 'success');
            console.log('Database status:', data.database);
        } else {
            showToast('Database connection issues detected', 'warning');
            console.warn('Database status:', data.database);
        }
    } catch (error) {
        showToast('Unable to check database status', 'error');
        console.error('Database status check failed:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Authentication forms
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    document.getElementById('adminLoginFormElement').addEventListener('submit', handleAdminLogin);
    
    // Goal form
    document.getElementById('goalForm').addEventListener('submit', handleGoalSubmit);
    
    // File upload handler
    document.getElementById('screenshot').addEventListener('change', handleFileUpload);
    
    // XP amount change handler
    document.getElementById('xpAmount').addEventListener('input', handleXpAmountChange);
}

// Authentication Functions
function switchToRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

function switchToLogin() {
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('adminLoginForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

function showAdminLogin() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('adminLoginForm').classList.remove('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    showLoading('Signing you in...');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            appState.currentUser = data.user;
            showToast('Welcome back!', 'success');
            showApp();
            loadGoals();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Login failed. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    showLoading('Creating your account...');
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            appState.currentUser = data.user;
            showToast('Account created successfully!', 'success');
            showApp();
            loadGoals();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Registration failed. Please try again.', 'error');
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;
    
    showLoading('Authenticating admin...');
    
    try {
        const response = await fetch('/api/admin-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showToast('Redirecting to Admin Panel...', 'success');
            // Redirect to admin panel
            window.location.href = '/admin.html';
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Admin login failed. Please try again.', 'error');
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        appState.currentUser = null;
        appState.goals = [];
        showToast('Logged out successfully', 'success');
        showAuth();
    } catch (error) {
        showToast('Logout failed', 'error');
    }
}

// UI State Management
function showAuth() {
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('appSection').classList.add('hidden');
    
    // Reset forms
    document.getElementById('loginFormElement').reset();
    document.getElementById('registerFormElement').reset();
}

function showApp() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('appSection').classList.remove('hidden');
    
    // Update welcome message
    document.getElementById('welcomeUser').textContent = `Welcome, ${appState.currentUser.username}!`;
    
    // Reset goal form
    document.getElementById('goalForm').reset();
    document.getElementById('validationResults').classList.add('hidden');
    document.getElementById('submitGoalBtn').disabled = true;
    appState.validationResult = null;
}

// Goal Management Functions
async function validateGoal() {
    const goal = document.getElementById('goalInput').value.trim();
    const xpAmount = document.getElementById('xpAmount').value;
    const screenshot = document.getElementById('screenshot').files[0];
    
    if (!goal) {
        showToast('Please enter a goal first', 'warning');
        return;
    }
    
    // Check if XP goal has screenshot
    if (xpAmount && !screenshot) {
        showToast('XP-related goals require a screenshot of your current XP dashboard', 'warning');
        return;
    }
    
    showLoading('Validating your goal with AI...');
    
    try {
        const response = await fetch('/api/validate-goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                goal,
                xpAmount: xpAmount ? parseInt(xpAmount) : null,
                hasScreenshot: !!screenshot
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            appState.validationResult = data.validation;
            displayValidationResults(data.validation);
            
            // Enable submit button if goal is valid
            document.getElementById('submitGoalBtn').disabled = !data.validation.isValid;
            
            if (data.validation.isValid) {
                showToast('Goal validated successfully! You can now submit it.', 'success');
            } else {
                showToast('Goal needs improvement. Check the validation feedback.', 'warning');
            }
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Validation failed. Please try again.', 'error');
    }
}

function displayValidationResults(validation) {
    const resultsContainer = document.getElementById('validationResults');
    const contentContainer = document.getElementById('validationContent');
    
    // Check if AI has questions
    if (validation.hasQuestions && validation.questions && validation.questions.length > 0) {
        displayAIQuestions(validation.questions);
        return;
    }
    
    const statusClass = validation.isValid ? 'valid' : 'invalid';
    const statusIcon = validation.isValid ? '✅' : '❌';
    const statusText = validation.isValid ? 'Goal Approved' : 'Needs Improvement';
    
    const difficultyIcon = validation.difficulty === 'challenging' ? '🔥' : 
                          validation.difficulty === 'reasonable' ? '⚡' : 
                          validation.difficulty === 'unclear' ? '❓' : '🟡';
    
    const measurableIcon = validation.measurable ? '📊' : '❓';
    
    contentContainer.innerHTML = `
        <div class="validation-status ${statusClass}">
            <span>${statusIcon}</span>
            ${statusText}
        </div>
        
        <div class="validation-item">
            <div class="validation-icon">${difficultyIcon}</div>
            <div class="validation-content">
                <h4>Difficulty Assessment</h4>
                <p><strong>${validation.difficulty.charAt(0).toUpperCase() + validation.difficulty.slice(1)}</strong> - Estimated ${validation.estimatedHours} hours</p>
            </div>
        </div>
        
        <div class="validation-item">
            <div class="validation-icon">${measurableIcon}</div>
            <div class="validation-content">
                <h4>Measurability</h4>
                <p>${validation.measurable ? 'Goal has clear, measurable success criteria' : 'Goal lacks specific, measurable outcomes'}</p>
            </div>
        </div>
        
        <div class="validation-item">
            <div class="validation-icon">🤖</div>
            <div class="validation-content">
                <h4>AI Feedback</h4>
                <p>${validation.feedback}</p>
                ${validation.suggestions && validation.suggestions.length > 0 ? `
                    <div class="validation-suggestions">
                        <strong>Suggestions for improvement:</strong>
                        <ul>
                            ${validation.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    resultsContainer.classList.remove('hidden');
}

function displayAIQuestions(questions) {
    const resultsContainer = document.getElementById('validationResults');
    const contentContainer = document.getElementById('validationContent');
    
    contentContainer.innerHTML = `
        <div class="validation-status invalid">
            <span>❓</span>
            AI Needs Clarification
        </div>
        
        <div class="validation-item">
            <div class="validation-icon">🤖</div>
            <div class="validation-content">
                <h4>AI Questions</h4>
                <p>The AI needs more information to properly validate your goal. Please answer the following questions with detailed explanations:</p>
                <div class="ai-help-note">
                    <strong>💡 Tip:</strong> If the AI asks about something unfamiliar (like a platform, tool, or concept), explain what it is and how it works. This helps the AI better understand and validate your goal.
                </div>
            </div>
        </div>
        
        <div class="ai-questions-form">
            ${questions.map((question, index) => `
                <div class="question-group">
                    <label for="aiQuestion${index}" class="question-label">
                        <span class="question-number">${index + 1}.</span>
                        ${escapeHtml(question)}
                    </label>
                    <textarea 
                        id="aiQuestion${index}" 
                        class="question-answer" 
                        placeholder="Provide a detailed explanation... If this is about an unfamiliar platform or concept, please explain what it is and how it works."
                        rows="3"
                        required
                    ></textarea>
                </div>
            `).join('')}
            
            <div class="questions-actions">
                <button type="button" class="btn btn-primary" onclick="submitAnswers()">
                    <span class="btn-icon">💬</span>
                    Submit Answers
                </button>
            </div>
        </div>
    `;
    
    // Store questions in state for later use
    appState.pendingQuestions = questions;
    
    resultsContainer.classList.remove('hidden');
}

async function submitAnswers() {
    const questions = appState.pendingQuestions;
    if (!questions || questions.length === 0) {
        showToast('No questions to answer', 'error');
        return;
    }
    
    // Collect answers
    const answers = [];
    for (let i = 0; i < questions.length; i++) {
        const answer = document.getElementById(`aiQuestion${i}`).value.trim();
        if (!answer) {
            showToast(`Please answer question ${i + 1}`, 'warning');
            return;
        }
        answers.push(answer);
    }
    
    const goal = document.getElementById('goalInput').value.trim();
    const xpAmount = document.getElementById('xpAmount').value;
    const screenshot = document.getElementById('screenshot').files[0];
    
    showLoading('Processing your answers...');
    
    try {
        const response = await fetch('/api/answer-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                goal,
                xpAmount: xpAmount ? parseInt(xpAmount) : null,
                hasScreenshot: !!screenshot,
                questions,
                answers
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            appState.validationResult = data.validation;
            appState.pendingQuestions = null;
            // Store AI questions and answers for goal submission
            appState.aiQuestions = questions;
            appState.aiAnswers = answers;
            displayValidationResults(data.validation);
            
            // Enable submit button if goal is valid
            document.getElementById('submitGoalBtn').disabled = !data.validation.isValid;
            
            if (data.validation.isValid) {
                showToast('Goal validated successfully! Submitting your goal...', 'success');
                // Automatically submit the goal since user already went through validation process
                setTimeout(() => {
                    document.getElementById('submitGoalBtn').click();
                }, 1500); // Small delay to show the success message
            } else {
                showToast('Goal still needs improvement. Check the validation feedback.', 'warning');
            }
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Failed to process answers. Please try again.', 'error');
    }
}

async function handleGoalSubmit(e) {
    e.preventDefault();
    
    if (!appState.validationResult || !appState.validationResult.isValid) {
        showToast('Please validate your goal first', 'warning');
        return;
    }
    
    const goal = document.getElementById('goalInput').value;
    const xpAmount = document.getElementById('xpAmount').value;
    const screenshot = document.getElementById('screenshot').files[0];
    
    let screenshotData = null;
    if (screenshot) {
        try {
            screenshotData = await fileToBase64(screenshot);
        } catch (error) {
            showToast('Failed to process screenshot. Please try again.', 'error');
            return;
        }
    }
    
    const requestBody = {
        goal,
        xpAmount: xpAmount || null,
        screenshotData,
        // Include AI questions and answers if they exist
        aiQuestions: appState.aiQuestions || null,
        aiAnswers: appState.aiAnswers || null
    };
    
    showLoading('Submitting your goal...');
    
    try {
        const response = await fetch('/api/submit-goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showToast('Goal submitted successfully!', 'success');
            
            // Reset form and validation
            document.getElementById('goalForm').reset();
            document.getElementById('validationResults').classList.add('hidden');
            document.getElementById('submitGoalBtn').disabled = true;
            appState.validationResult = null;
            appState.aiQuestions = null;
            appState.aiAnswers = null;
            
            // Reset file upload display
            const uploadText = document.querySelector('.file-upload-text span:last-child');
            uploadText.textContent = 'Upload Screenshot';
            document.querySelector('.file-upload-text').style.color = '';
            
            // Reload goals
            loadGoals();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Failed to submit goal. Please try again.', 'error');
    }
}

async function loadGoals() {
    const goalsList = document.getElementById('goalsList');
    goalsList.innerHTML = '<div class="loading">Loading your goals...</div>';
    
    try {
        const response = await fetch('/api/goals');
        const data = await response.json();
        
        if (data.success) {
            appState.goals = data.goals;
            displayGoals(data.goals);
        } else {
            goalsList.innerHTML = '<div class="loading">Failed to load goals</div>';
        }
    } catch (error) {
        goalsList.innerHTML = '<div class="loading">Failed to load goals</div>';
    }
}

function displayGoals(goals) {
    const goalsList = document.getElementById('goalsList');
    
    if (!goals || goals.length === 0) {
        goalsList.innerHTML = `
            <div class="goal-card text-center">
                <h3>No Goals Yet</h3>
                <p>Submit your first goal above to get started!</p>
            </div>
        `;
        return;
    }
    
    // Sort goals: today's goals first, then by creation date (newest first)
    const today = new Date().toDateString();
    const sortedGoals = [...goals].sort((a, b) => {
        const aIsToday = new Date(a.createdAt).toDateString() === today;
        const bIsToday = new Date(b.createdAt).toDateString() === today;
        
        // If one is today's goal and the other isn't, today's goal comes first
        if (aIsToday && !bIsToday) return -1;
        if (!aIsToday && bIsToday) return 1;
        
        // Otherwise sort by creation date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    goalsList.innerHTML = sortedGoals.map(goal => {
        const createdDate = new Date(goal.createdAt).toLocaleDateString();
        const completedDate = goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : null;
        const isToday = new Date(goal.createdAt).toDateString() === today;
        
        return `
            <div class="goal-card${isToday ? ' today-goal' : ''}" style="animation-delay: ${sortedGoals.indexOf(goal) * 0.1}s">
                <div class="goal-header">
                    <div class="goal-status ${goal.status}">
                        <span>${goal.status === 'completed' ? '✅' : '🎯'}</span>
                        ${goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                    </div>
                </div>
                
                <div class="goal-content">
                    <h3>${escapeHtml(goal.goal)}</h3>
                    
                    <div class="goal-meta">
                        <span><span>📅</span> Created: ${createdDate}</span>
                        ${goal.xpAmount ? `<span><span>⭐</span> ${goal.xpAmount} XP</span>` : ''}
                        ${completedDate ? `<span><span>🎉</span> Completed: ${completedDate}</span>` : ''}
                    </div>
                    
                    ${goal.screenshotData ? `
                        <div class="goal-screenshot">
                            <img src="${goal.screenshotData}" alt="XP Screenshot" onclick="openImageModal('${goal.screenshotData}')">
                        </div>
                    ` : ''}
                </div>
                
                ${goal.status === 'active' ? `
                    <div class="goal-actions">
                        <button class="btn btn-success" onclick="completeGoal('${goal.id}')">
                            <span class="btn-icon">✅</span>
                            Mark Complete
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function completeGoal(goalId) {
    if (!confirm('Are you sure you want to mark this goal as completed?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/complete-goal?goalId=${goalId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Goal marked as completed! 🎉', 'success');
            loadGoals();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast('Failed to complete goal', 'error');
    }
}

// File upload handling
function handleFileUpload(e) {
    const file = e.target.files[0];
    const uploadText = document.querySelector('.file-upload-text span:last-child');
    
    if (file) {
        uploadText.textContent = file.name;
        document.querySelector('.file-upload-text').style.color = 'var(--success-color)';
    } else {
        uploadText.textContent = 'Upload Screenshot';
        document.querySelector('.file-upload-text').style.color = '';
    }
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// XP amount change handler
function handleXpAmountChange(e) {
    const xpAmount = e.target.value;
    const screenshot = document.getElementById('screenshot').files[0];
    
    if (xpAmount && !screenshot) {
        showToast('Don\'t forget to upload your XP dashboard screenshot!', 'warning');
    }
}

// Image modal for screenshots
function openImageModal(imageSrc) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="image-modal-content">
            <img src="${imageSrc}" alt="Screenshot">
            <button class="close-modal" onclick="closeImageModal()">&times;</button>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) closeImageModal();
    };
    
    document.body.appendChild(modal);
    
    // Add modal styles dynamically
    if (!document.getElementById('modalStyles')) {
        const style = document.createElement('style');
        style.id = 'modalStyles';
        style.textContent = `
            .image-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                animation: fadeIn 0.3s ease;
            }
            
            .image-modal-content {
                position: relative;
                max-width: 90vw;
                max-height: 90vh;
            }
            
            .image-modal img {
                max-width: 100%;
                max-height: 100%;
                border-radius: 0.5rem;
            }
            
            .close-modal {
                position: absolute;
                top: -40px;
                right: 0;
                background: var(--surface);
                color: var(--text-primary);
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                font-size: 1.5rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }
        `;
        document.head.appendChild(style);
    }
}

function closeImageModal() {
    const modal = document.querySelector('.image-modal');
    if (modal) {
        modal.remove();
    }
}

// Loading overlay functions
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    text.textContent = message;
    overlay.classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// Toast notification function
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    
    // Remove existing type classes
    toast.classList.remove('success', 'error', 'warning');
    
    // Add new type class
    if (type !== 'info') {
        toast.classList.add(type);
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Test Claude API connectivity
async function testClaude() {
    showLoading('Testing Claude API connection...');
    
    try {
        const response = await fetch('/api/test-claude', {
            method: 'GET'
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showToast(`✅ Claude API is working! Response: ${data.claudeResponse}`, 'success');
            console.log('Claude API Test Success:', data);
        } else {
            showToast(`❌ Claude API test failed: ${data.error}`, 'error');
            console.error('Claude API Test Failed:', data);
        }
    } catch (error) {
        hideLoading();
        showToast('❌ Failed to test Claude API connection', 'error');
        console.error('Claude API Test Error:', error);
    }
}

// Utility function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}