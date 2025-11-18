// Admin Panel Application State
let adminState = {
    currentAdmin: null,
    adminName: localStorage.getItem('adminName') || '',
    goals: [],
    users: [],
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
    
    // Add event delegation for dynamic buttons
    document.addEventListener('click', handleDynamicButtonClicks);
    document.addEventListener('change', handleDynamicChangeEvents);
}

// Handle clicks on dynamically generated buttons using event delegation
function handleDynamicButtonClicks(e) {
    if (e.target.matches('.reason-btn')) {
        e.preventDefault();
        const goalId = e.target.dataset.goalId;
        const reason = e.target.dataset.reason;
        if (goalId && reason) {
            quickInvalidate(goalId, reason);
        }
    } else if (e.target.matches('.custom-invalidate-btn')) {
        e.preventDefault();
        const goalId = e.target.dataset.goalId;
        if (goalId) {
            showInvalidationForm(goalId);
        }
    } else if (e.target.matches('.confirm-invalidate-btn')) {
        e.preventDefault();
        const goalId = e.target.dataset.goalId;
        if (goalId) {
            invalidateGoal(goalId);
        }
    } else if (e.target.matches('.cancel-invalidate-btn')) {
        e.preventDefault();
        const goalId = e.target.dataset.goalId;
        if (goalId) {
            hideInvalidationForm(goalId);
        }
    } else if (e.target.matches('.qa-toggle-btn')) {
        e.preventDefault();
        const goalId = e.target.dataset.goalId;
        if (goalId) {
            toggleQASection(goalId);
        }
    } else if (e.target.matches('.remove-user-btn')) {
        e.preventDefault();
        const userId = e.target.dataset.userId;
        const username = e.target.dataset.username;
        if (userId && username) {
            removeUser(userId, username);
        }
    } else if (e.target.matches('.edit-name-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const userId = e.target.dataset.userId;
        console.log('Edit name button clicked for userId:', userId);
        
        // Check if admin name is provided
        if (!adminState.adminName || adminState.adminName.trim() === '') {
            showToast('Please enter your admin name in the header before editing user names', 'warning');
            const adminNameInput = document.getElementById('adminNameInput');
            if (adminNameInput) {
                adminNameInput.focus();
                adminNameInput.style.border = '2px solid orange';
                setTimeout(() => {
                    adminNameInput.style.border = '';
                }, 3000);
            }
            return;
        }
        
        if (userId) {
            showNameEditor(userId);
        } else {
            console.error('No userId found on edit button:', e.target);
        }
    } else if (e.target.matches('.save-name-btn')) {
        e.preventDefault();
        const userId = e.target.dataset.userId;
        if (userId) {
            saveNameEdit(userId);
        }
    } else if (e.target.matches('.cancel-name-btn')) {
        e.preventDefault();
        const userId = e.target.dataset.userId;
        if (userId) {
            cancelNameEdit(userId);
        }
    } else if (e.target.matches('.edit-goal-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const goalId = e.target.dataset.goalId;
        console.log('Edit goal button clicked for goalId:', goalId);
        
        // Check if admin name is provided
        if (!adminState.adminName || adminState.adminName.trim() === '') {
            showToast('Please enter your admin name in the header before editing goals', 'warning');
            const adminNameInput = document.getElementById('adminNameInput');
            if (adminNameInput) {
                adminNameInput.focus();
                adminNameInput.style.border = '2px solid orange';
                setTimeout(() => {
                    adminNameInput.style.border = '';
                }, 3000);
            }
            return;
        }
        
        if (goalId) {
            showGoalEditor(goalId);
        } else {
            console.error('No goalId found on edit button:', e.target);
        }
    } else if (e.target.matches('.save-goal-btn')) {
        e.preventDefault();
        const goalId = e.target.dataset.goalId;
        if (goalId) {
            saveGoalEdit(goalId);
        }
    } else if (e.target.matches('.cancel-goal-btn')) {
        e.preventDefault();
        const goalId = e.target.dataset.goalId;
        if (goalId) {
            cancelGoalEdit(goalId);
        }
    }
}

// Debounce timer for display name updates
let displayNameUpdateTimer = null;

// Handle change events on dynamically generated elements
function handleDynamicChangeEvents(e) {
    if (e.target.matches('.house-selector') || e.target.matches('.user-house-selector')) {
        const userId = e.target.dataset.userId;
        const house = e.target.value;
        if (userId) {
            updateUserHouse(userId, house);
        }
    } else if (e.target.matches('#adminNameInput')) {
        adminState.adminName = e.target.value.trim();
        localStorage.setItem('adminName', adminState.adminName);
    } else if (e.target.matches('.display-name-input') || e.target.matches('.user-display-name-input')) {
        const userId = e.target.dataset.userId;
        const newDisplayName = e.target.value.trim();
        
        // Debounce the update to avoid excessive API calls
        if (displayNameUpdateTimer) {
            clearTimeout(displayNameUpdateTimer);
        }
        
        displayNameUpdateTimer = setTimeout(() => {
            if (userId && newDisplayName) {
                console.log('Debounced update for userId:', userId, 'displayName:', newDisplayName);
                updateUserDisplayName(userId, newDisplayName);
            } else if (userId && !newDisplayName) {
                console.log('Empty display name for userId:', userId, '- not updating');
            }
        }, 1000); // Wait 1 second after user stops typing
    } else if (e.target.matches('#userSearchFilter')) {
        // Debounced search functionality
        if (displayNameUpdateTimer) {
            clearTimeout(displayNameUpdateTimer);
        }
        
        displayNameUpdateTimer = setTimeout(() => {
            const currentUsers = adminState.users || [];
            if (currentUsers.length > 0) {
                displayUsers(currentUsers);
            }
        }, 300); // Shorter delay for search
    }
}

// Handle keyboard events for inline name editing
document.addEventListener('keydown', (e) => {
    if (e.target.matches('.inline-name-input')) {
        const userId = e.target.dataset.userId;
        if (e.key === 'Enter') {
            e.preventDefault();
            saveNameEdit(userId);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelNameEdit(userId);
        }
    }
});

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
    
    // Set admin name input
    const adminNameInput = document.getElementById('adminNameInput');
    if (adminNameInput) {
        adminNameInput.value = adminState.adminName;
    }
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
    } else if (sectionName === 'users') {
        loadUsers();
    } else if (sectionName === 'logs') {
        loadLogs();
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
            adminState.goals = data.goals || [];
            displayGoals(data.goals || []);
            updateStats({ totalUsers: data.totalUsers || 0 });
        } else {
            console.error('Admin goals error:', data.error);
            container.innerHTML = `
                <div class="no-data-message">
                    <h3>Unable to load goals</h3>
                    <p>${data.error || 'Unknown error occurred'}</p>
                    <button class="btn btn-primary" onclick="loadGoals()">Try Again</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Admin goals loading error:', error);
        container.innerHTML = `
            <div class="no-data-message">
                <h3>Connection Error</h3>
                <p>Unable to connect to the server. Please check your configuration.</p>
                <button class="btn btn-primary" onclick="loadGoals()">Retry</button>
            </div>
        `;
    }
}

function displayGoals(goals) {
    const container = document.getElementById('goalsContainer');
    
    if (!goals || goals.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">📋</div>
                <h3>No Goals Found</h3>
                <p>No goals match the current filters, or no students have submitted goals yet.</p>
                <button class="btn btn-secondary" onclick="clearFilters()">Clear Filters</button>
            </div>
        `;
        return;
    }
    
    // Create each goal card separately to avoid nesting issues
    const goalCards = goals.map(goal => {
        const validationScores = goal.validationData ? `
            <div class="admin-validation-summary">
                <h5>🤖 AI Validation Analysis</h5>
                <div class="validation-scores-admin">
                    <div class="score-row">
                        <span>Ambition: <strong class="${goal.validationData.ambitionScore >= 4 ? 'score-pass' : 'score-fail'}">${goal.validationData.ambitionScore || 0}/5</strong></span>
                        <span>Measurable: <strong class="${goal.validationData.measurableScore >= 8 ? 'score-pass' : 'score-fail'}">${goal.validationData.measurableScore || 0}/10</strong></span>
                        <span>Relevance: <strong class="${goal.validationData.relevanceScore >= 8 ? 'score-pass' : 'score-fail'}">${goal.validationData.relevanceScore || 0}/10</strong></span>
                    </div>
                    <div class="overall-score">
                        Overall: <strong class="${goal.validationData.overallScore >= 8 ? 'score-pass' : 'score-fail'}">${goal.validationData.overallScore || 0}/10</strong>
                    </div>
                </div>
                <div class="ai-feedback">
                    <p><strong>💬 AI Feedback:</strong></p>
                    <p class="feedback-text">"${escapeHtml(goal.validationData.feedback || 'No feedback available')}"</p>
                </div>
            </div>
        ` : '';
        
        const invalidationSection = goal.status === 'active' ? `
            <div class="quick-invalidate">
                <h6>⚡ Quick Invalidate</h6>
                <div class="invalidation-reasons">
                    <button class="reason-btn" data-goal-id="${escapeHtml(goal.id)}" data-reason="Not ambitious enough" onclick="quickInvalidate('${escapeHtml(goal.id)}', 'Not ambitious enough')">Not Ambitious</button>
                    <button class="reason-btn" data-goal-id="${escapeHtml(goal.id)}" data-reason="Not measurable" onclick="quickInvalidate('${escapeHtml(goal.id)}', 'Not measurable')">Not Measurable</button>
                    <button class="reason-btn" data-goal-id="${escapeHtml(goal.id)}" data-reason="Not relevant" onclick="quickInvalidate('${escapeHtml(goal.id)}', 'Not relevant')">Not Relevant</button>
                    <button class="reason-btn" data-goal-id="${escapeHtml(goal.id)}" data-reason="BrainLift goal missing additional tasks" onclick="quickInvalidate('${escapeHtml(goal.id)}', 'BrainLift goal missing additional tasks')">BrainLift Only</button>
                </div>
                <button class="btn btn-danger btn-sm custom-invalidate-btn" data-goal-id="${escapeHtml(goal.id)}" onclick="showInvalidationForm('${escapeHtml(goal.id)}')" style="margin-top: 0.5rem;">
                    ✏️ Custom Reason
                </button>
                <div id="invalidationForm_${escapeHtml(goal.id)}" class="invalidation-form hidden">
                    <label for="reason_${escapeHtml(goal.id)}">Custom invalidation reason:</label>
                    <textarea id="reason_${escapeHtml(goal.id)}" rows="3" placeholder="Enter detailed reason..."></textarea>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                        <button class="btn btn-danger btn-sm confirm-invalidate-btn" data-goal-id="${escapeHtml(goal.id)}" onclick="invalidateGoal('${escapeHtml(goal.id)}')">Confirm</button>
                        <button class="btn btn-secondary btn-sm cancel-invalidate-btn" data-goal-id="${escapeHtml(goal.id)}" onclick="hideInvalidationForm('${escapeHtml(goal.id)}')">Cancel</button>
                    </div>
                </div>
            </div>
        ` : '';
        
        return `
            <div class="admin-goal-card">
                <div class="goal-header-simple">
                    <div class="user-info-simple">
                        <strong>👤 ${escapeHtml(goal.user.username)}</strong>
                        <span class="house-badge house-${goal.user.house || 'none'}">${getHouseDisplay(goal.user.house)}</span>
                        <div class="goal-status ${goal.status}">${goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}</div>
                    </div>
                </div>
                
                <div class="user-management">
                    <div class="user-name-section">
                        <div class="name-display">
                            <label>✏️ Display Name:</label>
                            <div class="name-display-content">
                                <span class="current-name">${escapeHtml(goal.user.username)}</span>
                                <button class="edit-name-btn" data-user-id="${escapeHtml(goal.userId)}" title="Edit display name">✏️</button>
                            </div>
                        </div>
                        <div class="name-editor hidden" id="nameEditor_${escapeHtml(goal.userId)}">
                            <input type="text" class="inline-name-input" data-user-id="${escapeHtml(goal.userId)}" 
                                   value="${escapeHtml(goal.user.username)}" placeholder="Enter display name...">
                            <div class="name-editor-actions">
                                <button class="save-name-btn" data-user-id="${escapeHtml(goal.userId)}" onclick="saveNameEdit('${escapeHtml(goal.userId)}')" title="Save">✅</button>
                                <button class="cancel-name-btn" data-user-id="${escapeHtml(goal.userId)}" onclick="cancelNameEdit('${escapeHtml(goal.userId)}')" title="Cancel">❌</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Fallback: Keep the old input for debounced updates -->
                    <div class="fallback-input hidden">
                        <input type="text" class="display-name-input" data-user-id="${escapeHtml(goal.userId)}" value="${escapeHtml(goal.user.username)}" placeholder="Enter display name...">
                    </div>
                </div>
                
                <div class="goal-content-simple">
                    <div class="goal-text-section">
                        <div class="goal-display" id="goalDisplay_${escapeHtml(goal.id)}">
                            <h4>🎯 ${escapeHtml(goal.goal)}</h4>
                            <button class="edit-goal-btn" data-goal-id="${escapeHtml(goal.id)}" title="Edit goal">✏️</button>
                        </div>
                        <div class="goal-editor hidden" id="goalEditor_${escapeHtml(goal.id)}">
                            <textarea class="goal-edit-input" data-goal-id="${escapeHtml(goal.id)}" rows="3">${escapeHtml(goal.goal)}</textarea>
                            <div class="goal-editor-actions">
                                <button class="save-goal-btn" data-goal-id="${escapeHtml(goal.id)}" title="Save">✅</button>
                                <button class="cancel-goal-btn" data-goal-id="${escapeHtml(goal.id)}" title="Cancel">❌</button>
                            </div>
                        </div>
                    </div>
                    
                    ${goal.alphaXProject ? `<p class="alpha-project-simple"><strong>🚀 Project:</strong> ${escapeHtml(goal.alphaXProject)}</p>` : ''}
                    
                    ${goal.screenshotData ? `
                        <div class="goal-screenshot">
                            <h6>📷 Screenshot Proof</h6>
                            <div class="screenshot-container">
                                <img src="${goal.screenshotData}" alt="Goal completion screenshot" 
                                     onclick="openImageModal('${goal.screenshotData}')" 
                                     style="max-width: 200px; max-height: 150px; cursor: pointer; border-radius: 0.5rem; border: 2px solid var(--border-color);">
                                <p class="screenshot-hint">Click to view full size</p>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="goal-dates">
                        <span>📅 Created: ${new Date(goal.createdAt).toLocaleDateString()}</span>
                        ${goal.completedAt ? `<span>🎉 Completed: ${new Date(goal.completedAt).toLocaleDateString()}</span>` : ''}
                        ${goal.invalidatedAt ? `<span class="invalidation-date">❌ Invalidated: ${new Date(goal.invalidatedAt).toLocaleDateString()}</span>` : ''}
                        ${goal.lastEditedBy ? `<span class="last-edited">✏️ Edited by ${escapeHtml(goal.lastEditedBy)}</span>` : ''}
                    </div>
                </div>
                
                ${goal.status === 'invalidated' && goal.invalidationReason ? `
                    <div class="invalidation-history">
                        <h6>📋 Invalidation Details</h6>
                        <div class="invalidation-info">
                            <p><strong>Reason:</strong> ${escapeHtml(goal.invalidationReason)}</p>
                            ${goal.invalidatedBy ? `<p><strong>Admin:</strong> ${escapeHtml(goal.invalidatedBy)}</p>` : ''}
                            ${goal.adminName ? `<p><strong>Admin Name:</strong> ${escapeHtml(goal.adminName)}</p>` : ''}
                            ${goal.invalidatedAt ? `<p><strong>Date:</strong> ${new Date(goal.invalidatedAt).toLocaleString()}</p>` : ''}
                        </div>
                    </div>
                ` : ''}
                
                <div class="house-assignment">
                    <label>🏛️ House:</label>
                    <select class="house-selector" data-user-id="${escapeHtml(goal.userId)}" onchange="updateUserHouse('${escapeHtml(goal.userId)}', this.value)">
                        <option value="">No House</option>
                        <option value="sparta" ${goal.user.house === 'sparta' ? 'selected' : ''}>⚔️ Sparta</option>
                        <option value="athens" ${goal.user.house === 'athens' ? 'selected' : ''}>🦉 Athens</option>
                        <option value="corinth" ${goal.user.house === 'corinth' ? 'selected' : ''}>🌊 Corinth</option>
                        <option value="olympia" ${goal.user.house === 'olympia' ? 'selected' : ''}>🏛️ Olympia</option>
                        <option value="delfi" ${goal.user.house === 'delfi' ? 'selected' : ''}>🔮 Delfi</option>
                    </select>
                </div>
                
                ${validationScores}
                
                ${goal.aiQuestions && goal.aiAnswers ? `
                    <div class="ai-qa-toggle">
                        <button class="qa-toggle-btn" data-goal-id="${escapeHtml(goal.id)}" onclick="toggleQASection('${escapeHtml(goal.id)}')">
                            <span class="qa-arrow" id="arrow-${escapeHtml(goal.id)}">▼</span>
                            🤖 View AI Questions & Student Answers
                        </button>
                        <div class="ai-qa-content" id="qa-${escapeHtml(goal.id)}" style="display: none;">
                            ${safeParseAndDisplayQA(goal.aiQuestions, goal.aiAnswers)}
                        </div>
                    </div>
                ` : ''}
                
                ${invalidationSection}
            </div>
        `;
    });
    
    container.innerHTML = `<div class="goals-grid">${goalCards.join('')}</div>`;
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
        'sparta': '⚔️ Sparta',
        'athens': '🦉 Athens',
        'corinth': '🌊 Corinth',
        'olympia': '🏛️ Olympia',
        'delfi': '🔮 Delfi'
    };
    return houses[house] || '🏛️ No House';
}

// Q&A section toggle functionality
function toggleQASection(goalId) {
    const qaContent = document.getElementById(`qa-${goalId}`);
    const arrow = document.getElementById(`arrow-${goalId}`);
    
    if (qaContent.style.display === 'none') {
        qaContent.style.display = 'block';
        arrow.textContent = '▲';
    } else {
        qaContent.style.display = 'none';
        arrow.textContent = '▼';
    }
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
            const houseDisplay = getHouseDisplay(house);
            showToast(`User house updated to ${houseDisplay}`, 'success');
            await logAdminAction('house_change', `Updated user house to ${houseDisplay}`, { userId, house });
            loadGoals(); // Refresh to show updated house
            // Also refresh users if they're loaded
            if (adminState.users.length > 0) {
                loadUsers();
            }
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast('Failed to update user house', 'error');
    }
}

// Function to update user display name
async function updateUserDisplayName(userId, newDisplayName) {
    if (!newDisplayName || newDisplayName.trim() === '') {
        showToast('Display name cannot be empty', 'warning');
        return;
    }
    
    try {
        console.log('Updating user display name for userId:', userId, 'to:', newDisplayName);
        const response = await fetch('/api/update-user-display-name', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, displayName: newDisplayName.trim() })
        });
        
        const data = await response.json();
        console.log('Display name update response:', data);
        
        if (data.success) {
            showToast(`Display name updated to "${newDisplayName}"`, 'success');
            await logAdminAction('user_update', `Updated user display name to "${newDisplayName}"`, { userId, newDisplayName });
            
            // Update all display-name-input elements with this userId
            document.querySelectorAll(`.display-name-input[data-user-id="${userId}"]`).forEach(input => {
                input.value = newDisplayName;
            });
            
            loadGoals(); // Refresh to show updated display name
            // Also refresh users if they're loaded
            if (adminState.users.length > 0) {
                loadUsers();
            }
        } else {
            showToast(data.error || 'Failed to update display name', 'error');
        }
    } catch (error) {
        console.error('Error updating display name:', error);
        showToast('Failed to update display name - network error', 'error');
    }
}

// Inline name editing functions
function showNameEditor(userId) {
    console.log('showNameEditor called for userId:', userId);
    
    // Prevent multiple calls
    if (window.editingUser === userId) {
        console.log('Already editing this user, ignoring duplicate call');
        return;
    }
    window.editingUser = userId;
    
    // Find the edit button first to get the correct context
    const editButton = document.querySelector(`.edit-name-btn[data-user-id="${userId}"]`);
    if (!editButton) {
        console.error('Edit button not found for userId:', userId);
        window.editingUser = null;
        return;
    }
    
    let nameDisplay, nameEditor;
    
    // Try to find in user card first (users section)
    let userCard = editButton.closest('.user-card');
    
    if (userCard) {
        // Found in users section
        console.log('Found user card in users section');
        nameDisplay = userCard.querySelector('.name-display');
    } else {
        // In goals section
        console.log('Looking in goals section');
        nameDisplay = editButton.closest('.name-display');
    }
    
    nameEditor = document.getElementById(`nameEditor_${userId}`);
    
    if (!nameDisplay || !nameEditor) {
        console.error('Name display or editor elements not found for userId:', userId);
        console.log('nameDisplay:', nameDisplay);
        console.log('nameEditor:', nameEditor);
        console.log('Available nameEditor elements:', document.querySelectorAll('[id^="nameEditor_"]'));
        window.editingUser = null;
        return;
    }
    
    const input = nameEditor.querySelector('.inline-name-input');
    if (!input) {
        console.error('Input element not found for userId:', userId);
        window.editingUser = null;
        return;
    }
    
    console.log('Showing name editor for userId:', userId);
    console.log('nameDisplay element:', nameDisplay);
    console.log('nameEditor element:', nameEditor);
    
    // Force show/hide with direct style manipulation as backup
    nameDisplay.style.display = 'none';
    nameEditor.style.display = 'flex';
    nameEditor.classList.remove('hidden');
    nameDisplay.classList.add('hidden');
    
    console.log('nameEditor final display style:', window.getComputedStyle(nameEditor).display);
    
    // Small delay to ensure DOM is updated
    setTimeout(() => {
        input.focus();
        input.select();
    }, 10);
}

function cancelNameEdit(userId) {
    console.log('cancelNameEdit called for userId:', userId);
    
    // Always reset editing state first
    window.editingUser = null;
    
    // Find the name display and editor elements
    let nameDisplay, nameEditor;
    const editButton = document.querySelector(`.edit-name-btn[data-user-id="${userId}"]`);
    
    if (editButton) {
        const userCard = editButton.closest('.user-card');
        if (userCard) {
            // Found in users section
            nameDisplay = userCard.querySelector('.name-display');
        } else {
            // Goals section
            nameDisplay = editButton.closest('.name-display');
        }
    }
    
    nameEditor = document.getElementById(`nameEditor_${userId}`);
    
    if (!nameDisplay || !nameEditor) {
        console.error('Name display or editor elements not found for userId:', userId);
        return;
    }
    
    const input = nameEditor.querySelector('.inline-name-input');
    if (!input) {
        console.error('Input element not found for userId:', userId);
        return;
    }
    
    // Reset input to original value
    const h4Element = nameDisplay.querySelector('h4');
    const currentNameElement = nameDisplay.querySelector('.current-name');
    
    if (h4Element) {
        // Users section format
        input.value = h4Element.textContent;
    } else if (currentNameElement) {
        // Goals section format
        input.value = currentNameElement.textContent;
    }
    
    // Force hide/show with direct style manipulation
    nameEditor.style.display = 'none';
    nameDisplay.style.display = '';
    nameEditor.classList.add('hidden');
    nameDisplay.classList.remove('hidden');
}

async function saveNameEdit(userId) {
    const nameEditor = document.getElementById(`nameEditor_${userId}`);
    if (!nameEditor) {
        console.error('Name editor not found for userId:', userId);
        showToast('Name editor not found', 'error');
        return;
    }
    
    const input = nameEditor.querySelector('.inline-name-input');
    if (!input) {
        console.error('Input element not found for userId:', userId);
        showToast('Input element not found', 'error');
        return;
    }
    
    const newDisplayName = input.value.trim();
    if (!newDisplayName) {
        showToast('Display name cannot be empty', 'warning');
        input.focus();
        return;
    }
    
    // Show saving state
    const saveBtn = nameEditor.querySelector('.save-name-btn');
    let originalText = '✅';
    if (saveBtn) {
        originalText = saveBtn.textContent;
        saveBtn.textContent = '⏳';
        saveBtn.disabled = true;
    }
    
    try {
        console.log('Updating display name for userId:', userId, 'to:', newDisplayName);
        const response = await fetch('/api/update-user-display-name', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, displayName: newDisplayName })
        });
        
        const data = await response.json();
        console.log('Update response:', data);
        
        if (data.success) {
            showToast(`Display name updated to "${newDisplayName}"`, 'success');
            await logAdminAction('user_update', `Updated user display name to "${newDisplayName}"`, { userId, newDisplayName });
            
            // Update the display immediately
            let nameDisplay;
            const editButton = document.querySelector(`.edit-name-btn[data-user-id="${userId}"]`);
            
            if (editButton) {
                const userCard = editButton.closest('.user-card');
                if (userCard) {
                    // Users section
                    nameDisplay = userCard.querySelector('.name-display');
                    if (nameDisplay) {
                        const h4Element = nameDisplay.querySelector('h4');
                        if (h4Element) {
                            h4Element.textContent = newDisplayName;
                        }
                    }
                } else {
                    // Goals section
                    nameDisplay = editButton.closest('.name-display');
                    if (nameDisplay) {
                        const currentNameElement = nameDisplay.querySelector('.current-name');
                        if (currentNameElement) {
                            currentNameElement.textContent = newDisplayName;
                        }
                    }
                }
            } else {
                console.warn('Could not find edit button for userId:', userId);
            }
            
            if (nameDisplay) {
                // Hide editor and show display
                nameEditor.style.display = 'none';
                nameDisplay.style.display = '';
                nameEditor.classList.add('hidden');
                nameDisplay.classList.remove('hidden');
            }
            
            // Reset editing state
            window.editingUser = null;
            
            // Refresh data in background
            if (adminState.users.length > 0) {
                loadUsers();
            }
            loadGoals();
        } else {
            showToast(data.error || 'Failed to update display name', 'error');
        }
    } catch (error) {
        console.error('Error updating display name:', error);
        showToast('Failed to update display name - network error', 'error');
    } finally {
        // Restore button state
        if (saveBtn) {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
        
        // Always reset editing state on error
        window.editingUser = null;
    }
}

// Goal editing functions
let editingGoal = null;

function showGoalEditor(goalId) {
    console.log('showGoalEditor called for goalId:', goalId);
    
    // Prevent multiple edits
    if (editingGoal === goalId) {
        console.log('Already editing this goal, ignoring duplicate call');
        return;
    }
    editingGoal = goalId;
    
    const goalDisplay = document.getElementById(`goalDisplay_${goalId}`);
    const goalEditor = document.getElementById(`goalEditor_${goalId}`);
    
    if (!goalDisplay || !goalEditor) {
        console.error('Goal display or editor elements not found for goalId:', goalId);
        editingGoal = null;
        return;
    }
    
    const textarea = goalEditor.querySelector('.goal-edit-input');
    if (!textarea) {
        console.error('Textarea element not found for goalId:', goalId);
        editingGoal = null;
        return;
    }
    
    console.log('Showing goal editor for goalId:', goalId);
    
    // Force show/hide with direct style manipulation
    goalDisplay.style.display = 'none';
    goalEditor.style.display = 'flex';
    goalEditor.classList.remove('hidden');
    goalDisplay.classList.add('hidden');
    
    // Small delay to ensure DOM is updated
    setTimeout(() => {
        textarea.focus();
        textarea.select();
    }, 10);
}

function cancelGoalEdit(goalId) {
    console.log('cancelGoalEdit called for goalId:', goalId);
    
    // Reset editing state
    editingGoal = null;
    
    const goalDisplay = document.getElementById(`goalDisplay_${goalId}`);
    const goalEditor = document.getElementById(`goalEditor_${goalId}`);
    
    if (!goalDisplay || !goalEditor) {
        console.error('Goal display or editor elements not found for goalId:', goalId);
        return;
    }
    
    const textarea = goalEditor.querySelector('.goal-edit-input');
    if (!textarea) {
        console.error('Textarea element not found for goalId:', goalId);
        return;
    }
    
    // Reset textarea to original value
    const originalGoal = goalDisplay.querySelector('h4').textContent.replace('🎯 ', '');
    textarea.value = originalGoal;
    
    // Force hide/show with direct style manipulation
    goalEditor.style.display = 'none';
    goalDisplay.style.display = '';
    goalEditor.classList.add('hidden');
    goalDisplay.classList.remove('hidden');
}

async function saveGoalEdit(goalId) {
    console.log('saveGoalEdit called for goalId:', goalId);
    
    const goalEditor = document.getElementById(`goalEditor_${goalId}`);
    if (!goalEditor) {
        console.error('Goal editor not found for goalId:', goalId);
        showToast('Goal editor not found', 'error');
        return;
    }
    
    const textarea = goalEditor.querySelector('.goal-edit-input');
    if (!textarea) {
        console.error('Textarea element not found for goalId:', goalId);
        showToast('Textarea element not found', 'error');
        return;
    }
    
    const newGoalText = textarea.value.trim();
    if (!newGoalText) {
        showToast('Goal text cannot be empty', 'warning');
        textarea.focus();
        return;
    }
    
    // Show saving state
    const saveBtn = goalEditor.querySelector('.save-goal-btn');
    let originalText = '✅';
    if (saveBtn) {
        originalText = saveBtn.textContent;
        saveBtn.textContent = '⏳';
        saveBtn.disabled = true;
    }
    
    try {
        console.log('Updating goal for goalId:', goalId, 'to:', newGoalText);
        const response = await fetch('/api/update-goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                goalId, 
                newGoalText,
                adminName: adminState.adminName 
            })
        });
        
        const data = await response.json();
        console.log('Goal update response:', data);
        
        if (data.success) {
            showToast(`Goal updated successfully by ${adminState.adminName}`, 'success');
            await logAdminAction('goal_update', `Updated goal to: "${newGoalText}"`, { goalId, newGoalText });
            
            // Update the display immediately
            const goalDisplay = document.getElementById(`goalDisplay_${goalId}`);
            if (goalDisplay) {
                const h4Element = goalDisplay.querySelector('h4');
                if (h4Element) {
                    h4Element.textContent = `🎯 ${newGoalText}`;
                }
                
                // Hide editor and show display
                goalEditor.style.display = 'none';
                goalDisplay.style.display = '';
                goalEditor.classList.add('hidden');
                goalDisplay.classList.remove('hidden');
            }
            
            // Reset editing state
            editingGoal = null;
            
            // Refresh data in background
            loadGoals();
        } else {
            showToast(data.error || 'Failed to update goal', 'error');
        }
    } catch (error) {
        console.error('Error updating goal:', error);
        showToast('Failed to update goal - network error', 'error');
    } finally {
        // Restore button state
        if (saveBtn) {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
        
        // Always reset editing state on error
        editingGoal = null;
    }
}

// Enhanced invalidation functions
async function quickInvalidate(goalId, reason) {
    // Check if admin name is provided
    if (!adminState.adminName) {
        showToast('Please enter your admin name in the header before invalidating goals', 'warning');
        const adminNameInput = document.getElementById('adminNameInput');
        if (adminNameInput) {
            adminNameInput.focus();
        }
        return;
    }
    
    if (!confirm(`Invalidate this goal?\n\nReason: ${reason}\nAdmin: ${adminState.adminName}`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/invalidate-goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ goalId, reason, adminName: adminState.adminName })
        });
        
        const data = await response.json();
        if (data.success) {
            showToast(`Goal invalidated successfully by ${adminState.adminName}`, 'success');
            await logAdminAction('goal_invalidation', `Invalidated goal with reason: ${reason}`, { goalId, reason });
            loadGoals();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast('Failed to invalidate goal', 'error');
    }
}

// Safe JSON parsing helper
function safeParseAndDisplayQA(questionsData, answersData) {
    try {
        let questions, answers;
        
        // Handle both string and array formats
        if (typeof questionsData === 'string') {
            questions = JSON.parse(questionsData);
        } else if (Array.isArray(questionsData)) {
            questions = questionsData;
        } else {
            return '<p class="error-message">Invalid questions data format</p>';
        }
        
        if (typeof answersData === 'string') {
            answers = JSON.parse(answersData);
        } else if (Array.isArray(answersData)) {
            answers = answersData;
        } else {
            return '<p class="error-message">Invalid answers data format</p>';
        }
        
        if (!Array.isArray(questions) || !Array.isArray(answers)) {
            return '<p class="error-message">Questions and answers must be arrays</p>';
        }
        
        return questions.map((question, index) => `
            <div class="qa-item">
                <p class="question"><strong>Q${index + 1}:</strong> ${escapeHtml(question || 'Invalid question')}</p>
                <p class="answer"><strong>A:</strong> ${escapeHtml(answers[index] || 'No answer provided')}</p>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error parsing Q&A data:', error);
        return `
            <div class="error-message">
                <p><strong>⚠️ Data Format Error</strong></p>
                <p>Unable to display questions and answers due to data format issues.</p>
                <details style="margin-top: 0.5rem; font-size: 0.8rem; color: #666;">
                    <summary>Debug Info</summary>
                    <pre>Questions: ${typeof questionsData} - ${String(questionsData).substring(0, 100)}...</pre>
                    <pre>Answers: ${typeof answersData} - ${String(answersData).substring(0, 100)}...</pre>
                </details>
            </div>
        `;
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
    
    // Check if admin name is provided
    if (!adminState.adminName) {
        showToast('Please enter your admin name in the header before invalidating goals', 'warning');
        const adminNameInput = document.getElementById('adminNameInput');
        if (adminNameInput) {
            adminNameInput.focus();
        }
        return;
    }
    
    if (!confirm(`Are you sure you want to invalidate this goal?\n\nReason: ${reason}\nAdmin: ${adminState.adminName}\n\nThis action cannot be undone.`)) {
        return;
    }
    
    showLoading('Invalidating goal...');
    
    try {
        console.log('Invalidating goal:', goalId, 'with reason:', reason, 'by admin:', adminState.adminName);
        const response = await fetch('/api/invalidate-goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ goalId, reason, adminName: adminState.adminName })
        });
        
        const data = await response.json();
        hideLoading();
        
        console.log('Invalidation response:', data);
        
        if (data.success) {
            showToast(`Goal invalidated successfully by ${adminState.adminName}`, 'success');
            await logAdminAction('goal_invalidation', `Invalidated goal with custom reason: ${reason}`, { goalId, reason });
            loadGoals(); // Reload goals
        } else {
            console.error('Invalidation failed:', data.error);
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Invalidation error:', error);
        showToast('Failed to invalidate goal - network error', 'error');
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

// User Management Functions
async function loadUsers() {
    const container = document.getElementById('usersContainer');
    container.innerHTML = '<div class="loading">Loading users...</div>';
    
    try {
        const response = await fetch('/api/admin-users');
        const data = await response.json();
        
        if (data.success) {
            adminState.users = data.users || [];
            displayUsers(data.users || []);
        } else {
            container.innerHTML = `
                <div class="no-data-message">
                    <h3>Unable to load users</h3>
                    <p>${data.error || 'Unknown error occurred'}</p>
                    <button class="btn btn-primary" onclick="loadUsers()">Try Again</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = `
            <div class="no-data-message">
                <h3>Connection Error</h3>
                <p>Unable to connect to the server. Please check your configuration.</p>
                <button class="btn btn-primary" onclick="loadUsers()">Retry</button>
            </div>
        `;
    }
}

function displayUsers(users) {
    const container = document.getElementById('usersContainer');
    
    if (!users || users.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">👥</div>
                <h3>No Users Found</h3>
                <p>No users are currently in the system.</p>
            </div>
        `;
        return;
    }
    
    // Apply search filter if exists
    const searchTerm = document.getElementById('userSearchFilter')?.value.toLowerCase() || '';
    const filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );
    
    const userCards = filteredUsers.map(user => {
        const goalCount = user.goalCount || 0;
        const activeGoals = user.activeGoals || 0;
        const completedGoals = user.completedGoals || 0;
        const isDeleted = user.deleted || false;
        
        return `
            <div class="user-card ${isDeleted ? 'deleted' : ''}">
                <div class="user-header">
                    <div class="user-info">
                        <div class="user-name-section">
                            <div class="name-display">
                                <h4>${escapeHtml(user.username)}</h4>
                                ${!isDeleted ? `<button class="edit-name-btn" data-user-id="${escapeHtml(user.id)}" onclick="showNameEditor('${escapeHtml(user.id)}')" title="Edit display name">✏️</button>` : ''}
                            </div>
                            <div class="name-editor hidden" id="nameEditor_${escapeHtml(user.id)}">
                                <input type="text" class="inline-name-input" data-user-id="${escapeHtml(user.id)}" 
                                       value="${escapeHtml(user.username)}" placeholder="Enter display name...">
                                <div class="name-editor-actions">
                                    <button class="save-name-btn" data-user-id="${escapeHtml(user.id)}" onclick="saveNameEdit('${escapeHtml(user.id)}')" title="Save">✅</button>
                                    <button class="cancel-name-btn" data-user-id="${escapeHtml(user.id)}" onclick="cancelNameEdit('${escapeHtml(user.id)}')" title="Cancel">❌</button>
                                </div>
                            </div>
                        </div>
                        <div class="user-details">
                            <p><strong>📧 Email:</strong> ${escapeHtml(user.email)}</p>
                            <p><strong>🏛️ House:</strong> ${getHouseDisplay(user.house)}</p>
                            ${user.createdAt ? `<p><strong>📅 Joined:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>` : ''}
                            ${isDeleted ? `<p class="deleted-status">❌ Account Deleted</p>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="user-management-controls">
                    <div class="house-management">
                        <label>🏛️ House Assignment:</label>
                        <select class="user-house-selector" data-user-id="${escapeHtml(user.id)}" onchange="updateUserHouse('${escapeHtml(user.id)}', this.value)" ${isDeleted ? 'disabled' : ''}>
                            <option value="">No House</option>
                            <option value="sparta" ${user.house === 'sparta' ? 'selected' : ''}>⚔️ Sparta</option>
                            <option value="athens" ${user.house === 'athens' ? 'selected' : ''}>🦉 Athens</option>
                            <option value="corinth" ${user.house === 'corinth' ? 'selected' : ''}>🌊 Corinth</option>
                            <option value="olympia" ${user.house === 'olympia' ? 'selected' : ''}>🏛️ Olympia</option>
                            <option value="delfi" ${user.house === 'delfi' ? 'selected' : ''}>🔮 Delfi</option>
                        </select>
                    </div>
                </div>
                
                <div class="user-stats">
                    <span>Total Goals: ${goalCount}</span>
                    <span>Active: ${activeGoals}</span>
                    <span>Completed: ${completedGoals}</span>
                </div>
                
                <div class="user-actions">
                    ${!isDeleted ? `
                        <button class="btn btn-danger-confirm remove-user-btn" data-user-id="${escapeHtml(user.id)}" 
                                data-username="${escapeHtml(user.username)}" onclick="removeUser('${escapeHtml(user.id)}', '${escapeHtml(user.username)}')">
                            🗑️ Remove User
                        </button>
                    ` : `
                        <button class="btn btn-secondary" disabled>
                            ❌ User Deleted
                        </button>
                    `}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = `<div class="users-grid">${userCards.join('')}</div>`;
}

// User removal function
async function removeUser(userId, username) {
    // Check if admin name is provided
    if (!adminState.adminName) {
        showToast('Please enter your admin name in the header before removing users', 'warning');
        const adminNameInput = document.getElementById('adminNameInput');
        if (adminNameInput) {
            adminNameInput.focus();
        }
        return;
    }
    
    const confirmed = confirm(`⚠️ DANGER: Remove user "${username}"?\n\nThis will:\n- Mark their account as deleted\n- Keep their goals for historical purposes\n- This action CANNOT be undone\n\nAdmin: ${adminState.adminName}\n\nType the username to confirm deletion.`);
    
    if (!confirmed) return;
    
    // Ask for confirmation by typing username
    const confirmUsername = prompt(`To confirm deletion, type the username exactly: "${username}"`);
    if (confirmUsername !== username) {
        showToast('Username confirmation failed. Deletion cancelled.', 'warning');
        return;
    }
    
    showLoading('Removing user...');
    
    try {
        const response = await fetch('/api/remove-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, adminName: adminState.adminName })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showToast(`User "${username}" removed successfully by ${adminState.adminName}`, 'success');
            await logAdminAction('user_removal', `Removed user "${username}" (${userId})`, { userId, username });
            loadUsers(); // Refresh users list
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Failed to remove user - network error', 'error');
    }
}

// Admin Logs Functions
async function loadLogs() {
    const container = document.getElementById('logsContainer');
    container.innerHTML = '<div class="loading">Loading admin logs...</div>';
    
    try {
        const typeFilter = document.getElementById('logTypeFilter')?.value || 'all';
        const dateFilter = document.getElementById('logDateFilter')?.value || 'all';
        
        const params = new URLSearchParams();
        if (typeFilter !== 'all') params.append('type', typeFilter);
        if (dateFilter !== 'all') params.append('date', dateFilter);
        
        const response = await fetch(`/api/admin-logs?${params}`);
        const data = await response.json();
        
        if (data.success) {
            displayLogs(data.logs || []);
        } else {
            container.innerHTML = `
                <div class="no-data-message">
                    <h3>Unable to load logs</h3>
                    <p>${data.error || 'Unknown error occurred'}</p>
                    <button class="btn btn-primary" onclick="loadLogs()">Try Again</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        container.innerHTML = `
            <div class="no-data-message">
                <h3>Connection Error</h3>
                <p>Unable to connect to the server. Please check your configuration.</p>
                <button class="btn btn-primary" onclick="loadLogs()">Retry</button>
            </div>
        `;
    }
}

function displayLogs(logs) {
    const container = document.getElementById('logsContainer');
    
    if (!logs || logs.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">📜</div>
                <h3>No Logs Found</h3>
                <p>No admin actions match the current filters.</p>
                <button class="btn btn-secondary" onclick="loadLogs()">Refresh</button>
            </div>
        `;
        return;
    }
    
    const logEntries = logs.map(log => `
        <div class="log-entry">
            <div class="log-header">
                <div class="log-type ${log.type}">${getLogTypeDisplay(log.type)}</div>
                <div class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</div>
            </div>
            <div class="log-details">${escapeHtml(log.description)}</div>
            <div class="log-admin">👤 Admin: ${escapeHtml(log.adminName || log.adminEmail || 'Unknown')}</div>
            ${log.details ? `<div class="log-admin">📋 Details: ${escapeHtml(JSON.stringify(log.details))}</div>` : ''}
        </div>
    `).join('');
    
    container.innerHTML = `<div class="logs-container">${logEntries}</div>`;
}

function getLogTypeDisplay(type) {
    const types = {
        'goal_invalidation': '🎯 Goal Invalidation',
        'goal_update': '✏️ Goal Edit',
        'user_update': '👤 User Update',
        'user_removal': '🗑️ User Removal',
        'house_change': '🏛️ House Change'
    };
    return types[type] || '📝 Admin Action';
}

async function logAdminAction(type, description, details = {}) {
    try {
        await fetch('/api/log-admin-action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type,
                description,
                adminName: adminState.adminName,
                details
            })
        });
    } catch (error) {
        console.warn('Failed to log admin action:', error);
    }
}

async function exportLogs() {
    try {
        const typeFilter = document.getElementById('logTypeFilter')?.value || 'all';
        const dateFilter = document.getElementById('logDateFilter')?.value || 'all';
        
        const params = new URLSearchParams();
        if (typeFilter !== 'all') params.append('type', typeFilter);
        if (dateFilter !== 'all') params.append('date', dateFilter);
        params.append('export', 'csv');
        
        const response = await fetch(`/api/admin-logs?${params}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('Logs exported successfully', 'success');
        } else {
            showToast('Failed to export logs', 'error');
        }
    } catch (error) {
        showToast('Failed to export logs', 'error');
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
