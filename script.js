// Application State
let appState = {
    currentUser: null,
    goals: [],
    validationResult: null,
    pendingQuestions: null,
    aiQuestions: null,
    aiAnswers: null,
    userAlphaXProject: null,
    lastValidatedGoalText: null // Track the goal text that was last validated
};

// File upload utility functions
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function resetFileUploadDisplay() {
    const display = document.querySelector('.file-upload-display');
    const text = document.querySelector('.file-upload-text span:last-child');
    if (display && text) {
        display.classList.remove('file-selected');
        text.textContent = 'Upload Screenshot';
    }
}

// File upload functions for goal completion
function handleCompletionFileUpload(goalId) {
    const fileInput = document.getElementById(`completionScreenshot_${goalId}`);
    // Escape the goalId for CSS selector (replace colon with escaped version)
    const escapedGoalId = goalId.replace(/:/g, '\\:');
    const display = document.querySelector(`#completionModal_${escapedGoalId} .file-upload-display`);
    const text = display ? display.querySelector('.file-upload-text span:last-child') : null;
    
    if (!fileInput) return;
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Please upload an image file', 'error');
                fileInput.value = '';
                return;
            }
            
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                showToast('File size must be less than 10MB', 'error');
                fileInput.value = '';
                return;
            }
            
            if (display && text) {
                display.classList.add('file-selected');
                text.textContent = `✅ ${file.name}`;
            }
        } else {
            if (display && text) {
                display.classList.remove('file-selected');
                text.textContent = 'Upload Screenshot';
            }
        }
    });
}

// Goal text change monitoring
function setupGoalTextMonitoring() {
    const goalInput = document.getElementById('goalInput');
    if (!goalInput) return;
    
    goalInput.addEventListener('input', () => {
        const currentGoalText = goalInput.value.trim();
        
        // Check if goal text has changed since last validation
        if (appState.validationResult && appState.lastValidatedGoalText && 
            currentGoalText !== appState.lastValidatedGoalText) {
            
            console.log('Goal text changed since last validation - requiring re-validation');
            
            // Clear validation state
            appState.validationResult = null;
            appState.lastValidatedGoalText = null;
            appState.aiQuestions = null;
            appState.aiAnswers = null;
            
            // Disable submit button
            const submitBtn = document.getElementById('submitGoalBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
            }
            
            // Hide validation results and show re-validation message
            const validationResults = document.getElementById('validationResults');
            if (validationResults) {
                validationResults.classList.add('hidden');
            }
            
            // Show revalidation hint
            const revalidationHint = document.getElementById('revalidationHint');
            if (revalidationHint) {
                revalidationHint.classList.remove('hidden');
            }
            
            // Show toast notification
            showToast('Goal text changed - please validate again before submitting', 'warning');
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Goal Tracker initialized');
    checkSession();
    
    // Initialize file upload after DOM is ready
    setTimeout(() => {
        setupGoalTextMonitoring();
    }, 100);
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
            appState.userAlphaXProject = data.user.alphaXProject;
            
            // Check if user needs to set up Alpha X project
            if (!appState.userAlphaXProject) {
                showAlphaXModal();
            } else {
                showApp();
                loadGoals();
            }
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
    
    
    // Alpha X project setup form
    document.getElementById('alphaXSetupForm').addEventListener('submit', handleAlphaXSetup);
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
            appState.userAlphaXProject = data.user.alphaXProject;
            showToast('Welcome back!', 'success');
            
            // Check if user needs to set up Alpha X project
            if (!appState.userAlphaXProject) {
                showAlphaXModal();
            } else {
                showApp();
                loadGoals();
            }
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
            appState.userAlphaXProject = data.user.alphaXProject;
            showToast('Account created successfully!', 'success');
            
            // New users always need to set up Alpha X project
            showAlphaXModal();
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
    document.getElementById('alphaXModal').classList.add('hidden');
    
    // Update welcome message
    document.getElementById('welcomeUser').textContent = `Welcome, ${appState.currentUser.username}!`;
    
    // Display Alpha X project
    updateProjectDisplay();
    
    // Reset goal form
    document.getElementById('goalForm').reset();
    document.getElementById('validationResults').classList.add('hidden');
    document.getElementById('submitGoalBtn').disabled = true;
    appState.validationResult = null;
}

function updateProjectDisplay() {
    const projectSpan = document.getElementById('currentProject');
    if (appState.userAlphaXProject) {
        projectSpan.textContent = appState.userAlphaXProject;
    } else {
        projectSpan.textContent = 'No project set - click edit to add one';
        projectSpan.style.fontStyle = 'italic';
        projectSpan.style.color = 'var(--text-secondary)';
    }
}

function editProject() {
    const newProject = prompt('Enter your Alpha X project description:', appState.userAlphaXProject || '');
    if (newProject && newProject.trim() && newProject.trim() !== appState.userAlphaXProject) {
        updateAlphaXProject(newProject.trim());
    }
}

async function updateAlphaXProject(project) {
    showLoading('Updating your Alpha X project...');
    
    try {
        const response = await fetch('/api/update-alpha-x-project', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ alphaXProject: project })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            appState.userAlphaXProject = project;
            appState.currentUser.alphaXProject = project;
            updateProjectDisplay();
            showToast('Alpha X project updated successfully!', 'success');
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Failed to update Alpha X project', 'error');
    }
}

function showAlphaXModal() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('appSection').classList.add('hidden');
    document.getElementById('alphaXModal').classList.remove('hidden');
}

async function handleAlphaXSetup(e) {
    e.preventDefault();
    const alphaXProject = document.getElementById('userAlphaXProject').value.trim();
    
    if (!alphaXProject) {
        showToast('Please describe your Alpha X project', 'warning');
        return;
    }
    
    if (alphaXProject.length < 20) {
        showToast('Please provide more details about your Alpha X project', 'warning');
        return;
    }
    
    showLoading('Saving your Alpha X project...');
    
    try {
        const response = await fetch('/api/update-alpha-x-project', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ alphaXProject })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            appState.userAlphaXProject = alphaXProject;
            appState.currentUser.alphaXProject = alphaXProject;
            showToast('Alpha X project saved successfully!', 'success');
            showApp();
            loadGoals();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Failed to save Alpha X project. Please try again.', 'error');
    }
}

// Goal Management Functions
async function validateGoal() {
    const goal = document.getElementById('goalInput').value.trim();
    const alphaXProject = appState.userAlphaXProject;
    
    if (!goal) {
        showToast('Please enter a goal first', 'warning');
        return;
    }
    
    if (!alphaXProject) {
        showToast('Please set your Alpha X project first', 'warning');
        editProject();
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
                alphaXProject
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            appState.validationResult = data.validation;
            appState.lastValidatedGoalText = goal; // Store the validated goal text
            displayValidationResults(data.validation);
            
            // Hide revalidation hint
            const revalidationHint = document.getElementById('revalidationHint');
            if (revalidationHint) {
                revalidationHint.classList.add('hidden');
            }
            
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
    
    const getScoreIcon = (score, isAmbition = false) => {
        const threshold = isAmbition ? 4 : 8;
        const maxScore = isAmbition ? 5 : 10;
        if (score >= threshold) return '🟢';
        if (score >= (maxScore * 0.6)) return '🟡';
        return '🔴';
    };
    
    const getScoreColor = (score, isAmbition = false) => {
        const threshold = isAmbition ? 4 : 8;
        const maxScore = isAmbition ? 5 : 10;
        if (score >= threshold) return 'var(--success-color)';
        if (score >= (maxScore * 0.6)) return 'var(--warning-color)';
        return 'var(--danger-color)';
    };
    
    contentContainer.innerHTML = `
        <div class="validation-status ${statusClass}">
            <span>${statusIcon}</span>
            ${statusText} (Overall Score: ${validation.overallScore || 0}/10)
        </div>
        
        <div class="validation-item">
            <div class="validation-icon">${getScoreIcon(validation.ambitionScore || 0, true)}</div>
            <div class="validation-content">
                <h4>Ambition Score</h4>
                <p><strong style="color: ${getScoreColor(validation.ambitionScore || 0, true)}">${validation.ambitionScore || 0}/5</strong> - How challenging and growth-oriented is this goal?</p>
                <p><em>Requirement: 4/5 to pass</em></p>
            </div>
        </div>
        
        <div class="validation-item">
            <div class="validation-icon">${getScoreIcon(validation.measurableScore || 0)}</div>
            <div class="validation-content">
                <h4>Measurable Score</h4>
                <p><strong style="color: ${getScoreColor(validation.measurableScore || 0)}">${validation.measurableScore || 0}/10</strong> - How clearly defined and measurable are the success criteria?</p>
                <p><em>Requirement: 8/10 to pass</em></p>
            </div>
        </div>
        
        <div class="validation-item">
            <div class="validation-icon">${getScoreIcon(validation.relevanceScore || 0)}</div>
            <div class="validation-content">
                <h4>Relevance Score</h4>
                <p><strong style="color: ${getScoreColor(validation.relevanceScore || 0)}">${validation.relevanceScore || 0}/10</strong> - How relevant is this goal to your Alpha X project?</p>
                <p><em>Requirement: 8/10 to pass</em></p>
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
    const alphaXProject = appState.userAlphaXProject;
    
    showLoading('Processing your answers...');
    
    try {
        const response = await fetch('/api/answer-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                goal,
                alphaXProject,
                questions,
                answers
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            appState.validationResult = data.validation;
            appState.lastValidatedGoalText = goal; // Store the validated goal text
            appState.pendingQuestions = null;
            // Store AI questions and answers for goal submission
            appState.aiQuestions = questions;
            appState.aiAnswers = answers;
            displayValidationResults(data.validation);
            
            // Hide revalidation hint
            const revalidationHint = document.getElementById('revalidationHint');
            if (revalidationHint) {
                revalidationHint.classList.add('hidden');
            }
            
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
    
    // Check if goal is validated and current text matches validated text
    const currentGoalText = document.getElementById('goalInput').value.trim();
    
    if (!appState.validationResult || !appState.validationResult.isValid) {
        showToast('Please validate your goal first', 'warning');
        return;
    }
    
    if (!appState.lastValidatedGoalText || currentGoalText !== appState.lastValidatedGoalText) {
        showToast('Goal text has changed since validation - please validate again', 'warning');
        return;
    }
    
    const goal = document.getElementById('goalInput').value;
    const alphaXProject = appState.userAlphaXProject;
    
    const requestBody = {
        goal,
        alphaXProject,
        // Include AI questions and answers if they exist
        aiQuestions: appState.aiQuestions || null,
        aiAnswers: appState.aiAnswers || null,
        // Include validation data from AI
        validationData: appState.validationResult || null
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
            appState.lastValidatedGoalText = null;
            appState.aiQuestions = null;
            appState.aiAnswers = null;
            
            
            // Alpha X project persists, no need to reset
            
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
        
        console.log('Goals API response:', data);
        
        if (data.success) {
            appState.goals = data.goals || [];
            displayGoals(data.goals || []);
            
            if (data.message) {
                console.log('Goals API message:', data.message);
            }
        } else {
            console.error('Goals API error:', data.error);
            goalsList.innerHTML = `
                <div class="no-data-message">
                    <h3>Unable to load goals</h3>
                    <p>${data.error || 'Unknown error occurred'}</p>
                    <button class="btn btn-primary" onclick="loadGoals()">Try Again</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Goals loading error:', error);
        goalsList.innerHTML = `
            <div class="no-data-message">
                <h3>Connection Error</h3>
                <p>Unable to connect to the server. Please check your internet connection.</p>
                <button class="btn btn-primary" onclick="loadGoals()">Retry</button>
            </div>
        `;
    }
}

function displayGoals(goals) {
    const goalsList = document.getElementById('goalsList');
    
    if (!goals || goals.length === 0) {
        goalsList.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">🎯</div>
                <h3>No Goals Yet</h3>
                <p>Submit your first goal above to get started on your Alpha X journey!</p>
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
            <div class="goal-card-minimal${isToday ? ' today-goal' : ''}${goal.status === 'completed' ? ' completed' : ''}" style="animation-delay: ${sortedGoals.indexOf(goal) * 0.1}s">
                <div class="goal-header-minimal">
                    <div class="goal-status-minimal ${goal.status}">
                        ${goal.status === 'completed' ? '✅' : goal.status === 'active' ? '🎯' : '❌'}
                    </div>
                    <div class="goal-title">
                        ${escapeHtml(goal.goal)}
                    </div>
                </div>
                
                <div class="goal-footer-minimal">
                    <div class="goal-meta-minimal">
                        <span class="date-created">📅 ${createdDate}</span>
                        ${completedDate ? `<span class="date-completed">🎉 ${completedDate}</span>` : ''}
                    </div>
                    
                    ${goal.status === 'active' && canCompleteGoal(goal.createdAt) ? `
                        <button class="btn-complete-minimal" onclick="showCompletionModal('${goal.id}')">
                            Complete
                        </button>
                    ` : goal.status === 'active' ? `
                        <div class="deadline-passed">Deadline passed</div>
                    ` : ''}
                </div>
                
                ${goal.validationData ? `
                    <div class="scores-minimal">
                        <span class="score-mini ${goal.validationData.ambitionScore >= 4 ? 'pass' : 'fail'}" title="Ambition: ${goal.validationData.ambitionScore || 0}/5">${goal.validationData.ambitionScore || 0}</span>
                        <span class="score-mini ${goal.validationData.measurableScore >= 8 ? 'pass' : 'fail'}" title="Measurable: ${goal.validationData.measurableScore || 0}/10">${goal.validationData.measurableScore || 0}</span>
                        <span class="score-mini ${goal.validationData.relevanceScore >= 8 ? 'pass' : 'fail'}" title="Relevance: ${goal.validationData.relevanceScore || 0}/10">${goal.validationData.relevanceScore || 0}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    // Add completion modals for active goals
    const completionModals = goals.filter(goal => goal.status === 'active').map(goal => `
        <div id="completionModal_${goal.id}" class="completion-modal hidden">
            <div class="modal-overlay" onclick="hideCompletionModal('${goal.id}')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🎉 Complete Your Goal</h3>
                    <button class="modal-close" onclick="hideCompletionModal('${goal.id}')">&times;</button>
                </div>
                
                <div class="goal-preview">
                    <h4>📝 "${escapeHtml(goal.goal)}"</h4>
                    ${goal.alphaXProject ? `<p class="alpha-project">🚀 Project: ${escapeHtml(goal.alphaXProject)}</p>` : ''}
                </div>
                
                <div class="screenshot-requirement">
                    <h5>📷 Upload Completion Proof</h5>
                    <p>Please upload a screenshot showing you completed this goal:</p>
                    
                    <div class="file-upload-wrapper">
                        <input type="file" id="completionScreenshot_${goal.id}" accept="image/*" required>
                        <div class="file-upload-display">
                            <div class="file-upload-text">
                                <span class="upload-icon">📷</span>
                                <span>Upload Completion Screenshot</span>
                            </div>
                            <div class="file-upload-hint">Required: Show proof of goal completion</div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-success" onclick="confirmCompletion('${goal.id}')">
                        ✅ Complete Goal
                    </button>
                    <button class="btn btn-secondary" onclick="hideCompletionModal('${goal.id}')">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add modals to the page
    if (completionModals) {
        goalsList.innerHTML += completionModals;
        
        // Initialize file upload handlers for completion modals
        goals.filter(goal => goal.status === 'active').forEach(goal => {
            handleCompletionFileUpload(goal.id);
        });
    }
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


// CST timezone helper functions
function getCSTDate(date = new Date()) {
    return new Date(date.toLocaleString("en-US", {timeZone: "America/Chicago"}));
}

function canCompleteGoal(createdAt) {
    const now = new Date();
    const cstNow = getCSTDate(now);
    const goalCreatedDate = new Date(createdAt);
    const goalCreatedCST = getCSTDate(goalCreatedDate);
    
    // Check if goal was created today in CST
    const goalCreatedTodayCST = goalCreatedCST.toDateString() === cstNow.toDateString();
    
    return goalCreatedTodayCST;
}

// Utility function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}