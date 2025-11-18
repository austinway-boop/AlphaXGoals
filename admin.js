// Admin Panel Application State
let adminState = {
    currentAdmin: null,
    goals: [],
    prompts: {},
    stats: {}
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin Panel initialized');
    checkAdminSession();
    setupEventListeners();
});

// Check if admin has an active session
async function checkAdminSession() {
    try {
        const response = await fetch('/api/admin-session');
        const data = await response.json();
        
        if (data.success && data.admin) {
            adminState.currentAdmin = data.admin;
            showAdminPanel();
            loadAdminData();
        } else {
            showAdminAuth();
        }
    } catch (error) {
        console.error('Admin session check failed:', error);
        showAdminAuth();
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
}

// Admin Authentication Functions
async function handleAdminLogin(e) {
    e.preventDefault();
    const password = document.getElementById('adminPasswordField').value;
    
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
            adminState.currentAdmin = data.admin;
            showToast('Welcome to Admin Panel!', 'success');
            showAdminPanel();
            loadAdminData();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Admin login failed. Please try again.', 'error');
    }
}

async function adminLogout() {
    try {
        await fetch('/api/admin-logout', { method: 'POST' });
        adminState.currentAdmin = null;
        adminState.goals = [];
        showToast('Logged out successfully', 'success');
        showAdminAuth();
    } catch (error) {
        showToast('Logout failed', 'error');
    }
}

// UI State Management
function showAdminAuth() {
    document.getElementById('adminAuthSection').classList.remove('hidden');
    document.getElementById('adminPanelSection').classList.add('hidden');
    
    // Reset form
    document.getElementById('adminLoginForm').reset();
}

function showAdminPanel() {
    document.getElementById('adminAuthSection').classList.add('hidden');
    document.getElementById('adminPanelSection').classList.remove('hidden');
    
    // Update admin info
    document.getElementById('adminEmail').textContent = adminState.currentAdmin.email;
}

// Admin Panel Navigation
function showAdminSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + 'Section').classList.add('active');
    
    // Add active class to clicked nav button
    event.target.classList.add('active');
    
    // Load section-specific data
    if (sectionName === 'goals') {
        loadGoals();
    } else if (sectionName === 'prompts') {
        loadPrompts();
    } else if (sectionName === 'stats') {
        loadStats();
    }
}

// Load initial admin data
async function loadAdminData() {
    await Promise.all([
        loadGoals(),
        loadPrompts(),
        loadStats()
    ]);
}

// Goals Management Functions
async function loadGoals() {
    const container = document.getElementById('goalsContainer');
    container.innerHTML = '<div class="loading">Loading goals...</div>';
    
    try {
        const params = new URLSearchParams();
        const dateFilter = document.getElementById('dateFilter').value;
        const houseFilter = document.getElementById('houseFilter').value;
        const usernameFilter = document.getElementById('usernameFilter').value;
        const emailFilter = document.getElementById('emailFilter').value;
        
        if (dateFilter !== 'all') {
            params.append('date', dateFilter);
        }
        if (houseFilter !== 'all') {
            params.append('house', houseFilter);
        }
        if (usernameFilter) {
            params.append('username', usernameFilter);
        }
        if (emailFilter) {
            params.append('email', emailFilter);
        }
        
        const response = await fetch(`/api/admin-goals?${params}`);
        const data = await response.json();
        
        if (data.success) {
            adminState.goals = data.goals;
            displayGoals(data.goals);
            updateStats({ totalUsers: data.totalUsers });
        } else {
            container.innerHTML = '<div class="loading">Failed to load goals</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="loading">Failed to load goals</div>';
    }
}

function displayGoals(goals) {
    const container = document.getElementById('goalsContainer');
    
    if (!goals || goals.length === 0) {
        container.innerHTML = `
            <div class="admin-goal-card" style="text-align: center; grid-column: 1 / -1;">
                <h3>No Goals Found</h3>
                <p>No goals match the current filters.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="goals-grid">
            ${goals.map(goal => `
                <div class="admin-goal-card">
                    <div class="goal-user-info">
                        <div class="user-details">
                            <strong>👤 ${escapeHtml(goal.user.username)}</strong>
                            <span class="house-badge house-${goal.user.house || 'none'}">${getHouseDisplay(goal.user.house)}</span><br>
                            <small>📧 ${escapeHtml(goal.user.email)}</small>
                            <div class="house-selector">
                                <select onchange="updateUserHouse('${goal.user.id}', this.value)" style="font-size: 0.8rem; padding: 0.25rem;">
                                    <option value="">No House</option>
                                    <option value="gryffindor" ${goal.user.house === 'gryffindor' ? 'selected' : ''}>🦁 Gryffindor</option>
                                    <option value="hufflepuff" ${goal.user.house === 'hufflepuff' ? 'selected' : ''}>🦡 Hufflepuff</option>
                                    <option value="ravenclaw" ${goal.user.house === 'ravenclaw' ? 'selected' : ''}>🦅 Ravenclaw</option>
                                    <option value="slytherin" ${goal.user.house === 'slytherin' ? 'selected' : ''}>🐍 Slytherin</option>
                                </select>
                            </div>
                        </div>
                        <div class="goal-status ${goal.status}">${goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}</div>
                    </div>
                    
                    <div class="goal-content">
                        <h4>🎯 ${escapeHtml(goal.goal)}</h4>
                        ${goal.alphaXProject ? `<p class="alpha-project"><strong>🚀 Project:</strong> ${escapeHtml(goal.alphaXProject)}</p>` : ''}
                        
                        <div class="goal-meta">
                            <span>📅 ${new Date(goal.createdAt).toLocaleDateString()}</span>
                            ${goal.completedAt ? `<span>🎉 Completed: ${new Date(goal.completedAt).toLocaleDateString()}</span>` : ''}
                        </div>
                        
                        ${goal.validationData ? `
                            <div class="admin-validation-summary">
                                <h5>🤖 AI Validation Analysis</h5>
                                <div class="validation-scores-admin">
                                    <div class="score-row">
                                        <span>Ambition: <strong class="${goal.validationData.ambitionScore >= 9 ? 'score-pass' : 'score-fail'}">${goal.validationData.ambitionScore || 0}/10</strong></span>
                                        <span>Measurable: <strong class="${goal.validationData.measurableScore >= 9 ? 'score-pass' : 'score-fail'}">${goal.validationData.measurableScore || 0}/10</strong></span>
                                        <span>Relevance: <strong class="${goal.validationData.relevanceScore >= 9 ? 'score-pass' : 'score-fail'}">${goal.validationData.relevanceScore || 0}/10</strong></span>
                                    </div>
                                    <div class="overall-score">
                                        Overall: <strong class="${goal.validationData.overallScore >= 9 ? 'score-pass' : 'score-fail'}">${goal.validationData.overallScore || 0}/10</strong>
                                    </div>
                                </div>
                                <div class="time-analysis">
                                    <p><strong>⏱️ Time Estimate:</strong> ${goal.validationData.estimatedHours || 0} hours</p>
                                    ${goal.validationData.timeReasoning ? `<p class="time-reasoning"><em>${escapeHtml(goal.validationData.timeReasoning)}</em></p>` : ''}
                                </div>
                                <div class="ai-feedback">
                                    <p><strong>💬 AI Feedback:</strong></p>
                                    <p class="feedback-text">"${escapeHtml(goal.validationData.feedback || 'No feedback available')}"</p>
                                </div>
                                ${goal.validationData.suggestions && goal.validationData.suggestions.length > 0 ? `
                                    <div class="ai-suggestions">
                                        <p><strong>💡 Suggestions:</strong></p>
                                        <ul>
                                            ${goal.validationData.suggestions.map(suggestion => `<li>${escapeHtml(suggestion)}</li>`).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                        ${goal.invalidatedAt ? `
                            <div style="margin-top: 1rem; padding: 0.75rem; background: #ffebee; border-radius: 0.5rem; border: 1px solid #f44336;">
                                <strong>❌ Invalidated</strong><br>
                                <small>By: ${goal.invalidatedBy} on ${new Date(goal.invalidatedAt).toLocaleDateString()}</small><br>
                                <small>Reason: ${escapeHtml(goal.invalidationReason || 'No reason provided')}</small>
                            </div>
                        ` : ''}
                        
                        ${goal.screenshotData ? `
                            <div class="goal-screenshot" style="margin-top: 1rem;">
                                <img src="${goal.screenshotData}" alt="XP Screenshot" style="max-width: 100%; border-radius: 0.5rem; cursor: pointer;" onclick="openImageModal('${goal.screenshotData}')">
                            </div>
                        ` : ''}
                        
                        ${goal.aiQuestions && goal.aiAnswers ? `
                            <div class="ai-qa-section" style="margin-top: 1rem; padding: 0.75rem; background: #f0f7ff; border-radius: 0.5rem; border: 1px solid #2196f3;">
                                <strong>🤖 AI Questions & Answers</strong>
                                <div style="margin-top: 0.5rem;">
                                    ${goal.aiQuestions.map((question, index) => `
                                        <div style="margin-bottom: 1rem; padding: 0.5rem; background: white; border-radius: 0.25rem;">
                                            <div style="font-weight: bold; color: #1976d2; margin-bottom: 0.25rem;">
                                                Q${index + 1}: ${escapeHtml(question)}
                                            </div>
                                            <div style="color: #424242; padding-left: 0.5rem; border-left: 3px solid #2196f3;">
                                                A: ${escapeHtml(goal.aiAnswers[index] || 'No answer provided')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${goal.status === 'active' ? `
                        <div class="quick-invalidate">
                            <h6>⚡ Quick Invalidate</h6>
                            <div class="invalidation-reasons">
                                <button class="reason-btn" onclick="quickInvalidate('${goal.id}', 'Not ambitious enough - too easy')">Not Ambitious</button>
                                <button class="reason-btn" onclick="quickInvalidate('${goal.id}', 'Not measurable - unclear success criteria')">Not Measurable</button>
                                <button class="reason-btn" onclick="quickInvalidate('${goal.id}', 'Not relevant to Alpha X project')">Not Relevant</button>
                                <button class="reason-btn" onclick="quickInvalidate('${goal.id}', 'Insufficient time commitment - less than 3 hours')">Too Short</button>
                                <button class="reason-btn" onclick="quickInvalidate('${goal.id}', 'Inappropriate or off-topic content')">Inappropriate</button>
                            </div>
                            <div class="goal-actions">
                                <button class="btn btn-danger btn-sm" onclick="showInvalidationForm('${goal.id}')">
                                    <span class="btn-icon">✏️</span>
                                    Custom Reason
                                </button>
                            </div>
                        </div>
                        <div id="invalidationForm_${goal.id}" class="invalidation-form hidden">
                            <label for="reason_${goal.id}">Custom invalidation reason:</label>
                            <textarea id="reason_${goal.id}" style="width: 100%; margin: 0.5rem 0; padding: 0.5rem; border-radius: 0.25rem; border: 1px solid var(--border-color);" rows="3" placeholder="Enter detailed reason for invalidation..."></textarea>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-danger btn-sm" onclick="invalidateGoal('${goal.id}')">Confirm Invalidation</button>
                                <button class="btn btn-secondary btn-sm" onclick="hideInvalidationForm('${goal.id}')">Cancel</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// Time view management
let currentTimeView = 'daily';

function setTimeView(view) {
    currentTimeView = view;
    
    // Update active tab
    document.querySelectorAll('.view-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update date filter based on view
    const dateFilter = document.getElementById('dateFilter');
    if (view === 'daily') {
        dateFilter.value = 'today';
    } else if (view === 'weekly') {
        dateFilter.value = 'week';
    } else if (view === 'monthly') {
        dateFilter.value = 'month';
    }
    
    loadGoals();
}

function applyFilters() {
    loadGoals();
}

function clearFilters() {
    document.getElementById('dateFilter').value = 'today';
    document.getElementById('houseFilter').value = 'all';
    document.getElementById('usernameFilter').value = '';
    document.getElementById('emailFilter').value = '';
    loadGoals();
}

// House management functions
function getHouseDisplay(house) {
    const houses = {
        'gryffindor': '🦁 Gryffindor',
        'hufflepuff': '🦡 Hufflepuff',
        'ravenclaw': '🦅 Ravenclaw',
        'slytherin': '🐍 Slytherin'
    };
    return houses[house] || '🏠 No House';
}

async function updateUserHouse(userId, house) {
    try {
        const response = await fetch('/api/update-user-house', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, house })
        });
        
        const data = await response.json();
        if (data.success) {
            showToast(`User house updated to ${getHouseDisplay(house)}`, 'success');
            loadGoals(); // Refresh to show updated house
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast('Failed to update user house', 'error');
    }
}

// Enhanced invalidation functions
async function quickInvalidate(goalId, reason) {
    if (!confirm(`Invalidate this goal?\n\nReason: ${reason}`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/invalidate-goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ goalId, reason })
        });
        
        const data = await response.json();
        if (data.success) {
            showToast('Goal invalidated successfully', 'success');
            loadGoals();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast('Failed to invalidate goal', 'error');
    }
}

// CST timezone helper functions
function getCSTDate(date = new Date()) {
    return new Date(date.toLocaleString("en-US", {timeZone: "America/Chicago"}));
}

function getCSTDateString(date = new Date()) {
    const cstDate = getCSTDate(date);
    return cstDate.toISOString().split('T')[0];
}

function isCSTAfterMidnight() {
    const now = new Date();
    const cstNow = getCSTDate(now);
    const cstMidnight = new Date(cstNow);
    cstMidnight.setHours(0, 0, 0, 0);
    
    return cstNow.getTime() !== cstMidnight.getTime() && cstNow.getHours() >= 0;
}


// Goal Invalidation Functions
function showInvalidationForm(goalId) {
    document.getElementById(`invalidationForm_${goalId}`).classList.remove('hidden');
}

function hideInvalidationForm(goalId) {
    document.getElementById(`invalidationForm_${goalId}`).classList.add('hidden');
}

async function invalidateGoal(goalId) {
    const reason = document.getElementById(`reason_${goalId}`).value.trim();
    
    if (!reason) {
        showToast('Please provide a reason for invalidation', 'warning');
        return;
    }
    
    if (!confirm('Are you sure you want to invalidate this goal? This action cannot be undone.')) {
        return;
    }
    
    showLoading('Invalidating goal...');
    
    try {
        const response = await fetch('/api/admin-goals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                goalId,
                action: 'invalidate',
                reason
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showToast('Goal invalidated successfully', 'success');
            loadGoals(); // Reload goals
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Failed to invalidate goal', 'error');
    }
}

// AI Prompts Management Functions
async function loadPrompts() {
    showLoading('Loading AI prompts...');
    
    try {
        const response = await fetch('/api/admin-prompts');
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            adminState.prompts = data.prompts;
            displayPrompts(data.prompts);
        } else {
            showToast('Failed to load prompts', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Failed to load prompts', 'error');
    }
}

function displayPrompts(prompts) {
    if (prompts.validation) {
        document.getElementById('validationPrompt').value = prompts.validation.content || '';
    }
    if (prompts.answerQuestions) {
        document.getElementById('answerQuestionsPrompt').value = prompts.answerQuestions.content || '';
    }
}

async function savePrompt(promptType) {
    const content = document.getElementById(promptType + 'Prompt').value.trim();
    
    if (!content) {
        showToast('Prompt content cannot be empty', 'warning');
        return;
    }
    
    showLoading('Saving prompt...');
    
    try {
        const response = await fetch('/api/admin-prompts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                promptType,
                content
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showToast('Prompt saved successfully', 'success');
            loadPrompts(); // Reload to get updated timestamps
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Failed to save prompt', 'error');
    }
}

// Statistics Functions
async function loadStats() {
    // Calculate stats from current goals data
    const stats = calculateStats(adminState.goals);
    updateStats(stats);
}

function calculateStats(goals) {
    const stats = {
        totalGoals: goals.length,
        activeGoals: goals.filter(g => g.status === 'active').length,
        completedGoals: goals.filter(g => g.status === 'completed').length,
        invalidatedGoals: goals.filter(g => g.status === 'invalidated').length
    };
    return stats;
}

function updateStats(stats) {
    adminState.stats = { ...adminState.stats, ...stats };
    
    if (stats.totalGoals !== undefined) {
        document.getElementById('totalGoals').textContent = stats.totalGoals;
    }
    if (stats.activeGoals !== undefined) {
        document.getElementById('activeGoals').textContent = stats.activeGoals;
    }
    if (stats.completedGoals !== undefined) {
        document.getElementById('completedGoals').textContent = stats.completedGoals;
    }
    if (stats.invalidatedGoals !== undefined) {
        document.getElementById('invalidatedGoals').textContent = stats.invalidatedGoals;
    }
    if (stats.totalUsers !== undefined) {
        document.getElementById('totalUsers').textContent = stats.totalUsers;
    }
}

// Image modal functions (reused from main app)
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

// Utility function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
