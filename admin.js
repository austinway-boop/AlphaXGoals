// Admin Panel Application State
let adminState = {
    currentAdmin: null,
    adminName: localStorage.getItem('adminName') || '',
    goals: [],
    users: [],
    prompts: {},
    stats: {}
};

// Goal type filter state
let currentGoalTypeFilter = 'all'; // 'all', 'regular', 'afterSchool'

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
    } else if (e.target.matches('.edit-goal-btn') || e.target.matches('.edit-goal-btn-mini')) {
        e.preventDefault();
        e.stopPropagation();
        const goalId = e.target.dataset.goalId;
        console.log('Edit goal button clicked for goalId:', goalId);
        
        if (goalId) {
            showGoalEditingModal(goalId);
        } else {
            console.error('No goalId found on edit button:', e.target);
        }
    } else if (e.target.matches('.revoke-completion-btn')) {
        e.preventDefault();
        const goalId = e.target.dataset.goalId;
        if (goalId) {
            revokeCompletion(goalId);
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
    // Clear any editing state when switching sections
    if (window.editingUser) {
        console.log('Clearing editing state due to section switch');
        window.editingUser = null;
    }
    
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
    }
}

// Load initial admin data
async function loadAdminData() {
    await loadGoals();
}

// Goals Management Functions
async function loadGoals() {
    const container = document.getElementById('goalsContainer');
    container.innerHTML = '<div class="loading">Loading goals...</div>';
    
    // Clear editing state when refreshing goal data (which includes user names)
    if (window.editingUser) {
        console.log('Clearing editing state due to goal data refresh');
        window.editingUser = null;
    }
    
    try {
        const params = new URLSearchParams();
        const dateFilter = document.getElementById('dateFilter').value;
        const specificDate = document.getElementById('specificDateFilter')?.value;
        const houseFilter = document.getElementById('houseFilter').value;
        const usernameFilter = document.getElementById('usernameFilter').value;
        const emailFilter = document.getElementById('emailFilter').value;
        
        if (dateFilter === 'specific' && specificDate) {
            params.append('date', 'specific');
            params.append('specificDate', specificDate);
        } else if (dateFilter !== 'all') {
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
    
    // Update goal type counts
    updateGoalTypeCounts(goals || []);
    
    // Filter goals based on current goal type filter
    let filteredByType = goals || [];
    if (currentGoalTypeFilter === 'regular') {
        filteredByType = filteredByType.filter(g => !g.isAfterSchool);
    } else if (currentGoalTypeFilter === 'afterSchool') {
        filteredByType = filteredByType.filter(g => g.isAfterSchool);
    }
    
    if (!filteredByType || filteredByType.length === 0) {
        const filterMessage = currentGoalTypeFilter === 'afterSchool' 
            ? 'No after school goals found.' 
            : currentGoalTypeFilter === 'regular'
                ? 'No regular goals found.'
                : 'No goals match the current filters, or no students have submitted goals yet.';
        
        container.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">📋</div>
                <h3>No Goals Found</h3>
                <p>${filterMessage}</p>
                <button class="btn btn-secondary" onclick="clearFilters()">Clear Filters</button>
            </div>
        `;
        return;
    }
    
    // Sort goals by status: Completed first, Active middle, Invalid/Invalidated last
    const sortedGoals = [...filteredByType].sort((a, b) => {
        const statusOrder = {
            'completed': 1,
            'active': 2,
            'invalidated': 3,
            'invalid': 3
        };
        
        const aOrder = statusOrder[a.status] || 4;
        const bOrder = statusOrder[b.status] || 4;
        
        if (aOrder !== bOrder) {
            return aOrder - bOrder;
        }
        
        // Within same status, sort by creation date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Create each goal card separately to avoid nesting issues
    const goalCards = sortedGoals.map(goal => {
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
        
        // Admin complete section for after school goals
        const adminCompleteSection = goal.status === 'active' && goal.isAfterSchool ? `
            <div class="admin-complete-section">
                <h6>Mark as Complete (After School Goal)</h6>
                <p class="admin-complete-description">After school goals can only be completed by admins.</p>
                <button class="btn btn-primary admin-complete-btn" data-goal-id="${escapeHtml(goal.id)}" onclick="adminCompleteGoal('${escapeHtml(goal.id)}')">
                    Mark as Complete
                </button>
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
        
        const revocationSection = goal.status === 'completed' ? `
            <div class="goal-revocation">
                <h6>🔄 Revoke Completion</h6>
                <p class="revocation-description">Goal marked as completed but needs review?</p>
                <div class="revocation-actions">
                    <button class="btn btn-warning btn-sm revoke-completion-btn" data-goal-id="${escapeHtml(goal.id)}" onclick="revokeCompletion('${escapeHtml(goal.id)}')">
                        🔄 Revoke Completion
                    </button>
                </div>
            </div>
        ` : '';
        
        return `
            <div class="admin-goal-card ${goal.isAfterSchool ? 'after-school-goal' : ''}" onclick="toggleGoalDetails('${escapeHtml(goal.id)}')">
                <div class="goal-header-simple">
                    <div class="user-info-simple">
                        <strong>👤 ${escapeHtml(goal.user.username)}</strong>
                        ${goal.isAfterSchool ? `
                            <span class="after-school-badge">After School</span>
                        ` : ''}
                        ${goal.estimatedHours && goal.estimatedHours < 2.5 ? `
                            <span class="no-hp-warning">
                                ⚠️ NO HOUSE POINTS
                            </span>
                        ` : ''}
                        <span class="house-badge house-${goal.user.house || 'none'}">${getHouseDisplay(goal.user.house)}</span>
                        <div class="goal-status ${goal.status}">${goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}</div>
                        ${goal.estimatedHours ? `
                            <div class="goal-time-badge" style="background: ${goal.estimatedHours < 2.5 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; border: 2px solid ${goal.estimatedHours < 2.5 ? '#ef4444' : '#10b981'}; color: ${goal.estimatedHours < 2.5 ? '#ef4444' : '#10b981'}; font-weight: 700;">
                                ⏱️ ${goal.estimatedHours}h
                            </div>
                        ` : ''}
                    </div>
                    <div class="expand-indicator">
                        <span class="expand-arrow" id="arrow-${escapeHtml(goal.id)}">▼</span>
                        <span>Click to ${goal.status === 'completed' ? 'view proof' : 'manage'}</span>
                    </div>
                </div>
                
                <div class="goal-title-preview">
                    <div class="goal-title-section">
                        <h4>🎯 ${escapeHtml(goal.goal)}</h4>
                        ${canEditGoal(goal.createdAt) ? `<button class="edit-goal-btn-mini" data-goal-id="${escapeHtml(goal.id)}" title="Edit this goal" onclick="event.stopPropagation(); showGoalEditingModal('${escapeHtml(goal.id)}')">✏️ Edit</button>` : 
                          `<span class="edit-disabled" title="Goals can only be edited on the day they were created">🔒 Edit locked</span>`}
                    </div>
                    ${goal.alphaXProject ? `<p class="alpha-project-preview">🚀 ${escapeHtml(goal.alphaXProject)}</p>` : ''}
                </div>
                
                <div class="goal-details-section hidden" id="details-${escapeHtml(goal.id)}" onclick="event.stopPropagation()">
                    <div class="user-management">
                        <div class="user-info-display">
                            <label>👤 Student Name:</label>
                            <span class="student-name">${escapeHtml(goal.user.username)}</span>
                        </div>
                    </div>
                    
                    <div class="goal-content-simple">
                        <div class="goal-text-section">
                            <div class="goal-display">
                                <div class="goal-text-with-edit">
                                    <h4>🎯 ${escapeHtml(goal.goal)}</h4>
                                    ${canEditGoal(goal.createdAt) ? `<button class="edit-goal-btn" data-goal-id="${escapeHtml(goal.id)}" title="Edit goal text">✏️ Edit Goal</button>` : 
                                      `<span class="edit-disabled" title="Goals can only be edited on the day they were created">🔒 Edit locked</span>`}
                                </div>
                            </div>
                        </div>
                        
                        ${goal.alphaXProject ? `<p class="alpha-project-simple"><strong>🚀 Project:</strong> ${escapeHtml(goal.alphaXProject)}</p>` : ''}
                        
                        ${(goal.brainliftEntryId || goal.startingWordCount !== null) ? `
                            <div class="brainlift-tracking-section">
                                <h6>📚 BrainLift Word Count Tracking</h6>
                                <div class="brainlift-info">
                                    <div class="word-count-display">
                                        <div class="word-count-item start">
                                            <strong>🔢 Starting Words:</strong> 
                                            <span class="word-count-number">${goal.startingWordCount || 0}</span>
                                            <span class="word-count-label">(when goal created)</span>
                                        </div>
                                        ${goal.status === 'completed' && goal.endingWordCount !== null ? `
                                            <div class="word-count-item end">
                                                <strong>🎯 Ending Words:</strong> 
                                                <span class="word-count-number">${goal.endingWordCount}</span>
                                                <span class="word-count-label">(when goal completed)</span>
                                            </div>
                                            <div class="word-count-item difference">
                                                <strong>📈 Words Added:</strong> 
                                                <span class="word-count-difference ${(goal.endingWordCount - goal.startingWordCount) > 0 ? 'positive' : 'neutral'}">
                                                    +${Math.max(0, goal.endingWordCount - goal.startingWordCount)}
                                                </span>
                                                <span class="word-count-label">(net change)</span>
                                            </div>
                                        ` : goal.status === 'completed' ? `
                                            <div class="word-count-item pending">
                                                <strong>⏳ Ending Words:</strong> 
                                                <span class="word-count-pending">Pending extraction</span>
                                            </div>
                                        ` : `
                                            <div class="word-count-item pending">
                                                <strong>⏳ Ending Words:</strong> 
                                                <span class="word-count-pending">Will be counted on completion</span>
                                            </div>
                                        `}
                                    </div>
                                    ${goal.contentPreview ? `
                                        <div class="content-preview">
                                            <strong>📝 Content Preview:</strong>
                                            <p class="content-preview-text">"${escapeHtml(goal.contentPreview)}"</p>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        ` : `
                            <div class="brainlift-tracking-section" style="background: #fff3cd; border-color: #ffc107;">
                                <h6>📚 BrainLift Tracking Not Available</h6>
                                <p style="color: #856404; font-size: 0.9rem; margin: 0;">
                                    This goal was created before the Brain Lift content tracking system was implemented.
                                </p>
                            </div>
                        `}
                        
                        ${(goal.screenshotDataArray || goal.textProof) ? `
                            <div class="goal-proof-section">
                                <h6>📋 Completion Proof</h6>
                                
                                ${goal.textProof ? `
                                    <div class="proof-item">
                                        <h7>📝 Description (${goal.textProof.length} characters)</h7>
                                        <div class="text-proof-display">
                                            <p class="text-proof-content">${escapeHtml(goal.textProof)}</p>
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${goal.hasScreenshots ? `
                                    <div class="proof-item">
                                        <h7>📷 Screenshots Provided</h7>
                                        <p class="info-message">✅ ${goal.screenshotCount || 'Multiple'} screenshot(s) were uploaded (not stored to save space)</p>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                        <div class="goal-dates">
                            <span>📅 Created: ${new Date(goal.createdAt).toLocaleDateString()}</span>
                            ${goal.completedAt ? `<span>🎉 Completed: ${new Date(goal.completedAt).toLocaleDateString()}</span>` : ''}
                            ${goal.invalidatedAt ? `<span class="invalidation-date">❌ Invalidated: ${new Date(goal.invalidatedAt).toLocaleDateString()}</span>` : ''}
                            ${goal.lastEditedBy ? `<span class="last-edited">✏️ Edited by ${escapeHtml(goal.lastEditedBy)}</span>` : ''}
                        </div>
                        
                        ${goal.estimatedHours ? `
                            <div class="estimated-hours-display" style="margin-top: 1rem; padding: 1rem; border-radius: 0.5rem; ${goal.estimatedHours < 2.5 ? 'background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444;' : 'background: rgba(16, 185, 129, 0.1); border: 2px solid #10b981;'}">
                                <span style="font-size: 1.1rem; font-weight: 600; ${goal.estimatedHours < 2.5 ? 'color: #ef4444;' : 'color: #10b981;'}">
                                    ⏱️ Time Estimate: ${goal.estimatedHours} hours
                                </span>
                                ${goal.estimatedHours < 2.5 ? `
                                    <div style="margin-top: 0.5rem; font-weight: 600; color: #ef4444;">
                                        ⚠️ BELOW 2.5 HOURS - DOES NOT MEET HOUSE POINTS CRITERIA
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
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
                            <option value="delphi" ${goal.user.house === 'delphi' ? 'selected' : ''}>🔮 Delphi</option>
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
                    
                    ${adminCompleteSection}
                    
                    ${invalidationSection}
                    
                    ${revocationSection}
                </div>
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

// Goal type filter (all, regular, afterSchool)
function setGoalTypeFilter(type) {
    currentGoalTypeFilter = type;
    
    // Update active tab
    document.querySelectorAll('.goal-type-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.type === type) {
            tab.classList.add('active');
        }
    });
    
    // Re-display goals with new filter
    displayGoals(adminState.goals);
}

// Update goal type counts
function updateGoalTypeCounts(goals) {
    const allCount = goals.length;
    const regularCount = goals.filter(g => !g.isAfterSchool).length;
    const afterSchoolCount = goals.filter(g => g.isAfterSchool).length;
    
    const allCountEl = document.getElementById('allGoalsCount');
    const regularCountEl = document.getElementById('regularGoalsCount');
    const afterSchoolCountEl = document.getElementById('afterSchoolGoalsCount');
    
    if (allCountEl) allCountEl.textContent = allCount;
    if (regularCountEl) regularCountEl.textContent = regularCount;
    if (afterSchoolCountEl) afterSchoolCountEl.textContent = afterSchoolCount;
}

function applyFilters() {
    loadGoals();
}

function handleDateFilterChange() {
    const dateFilter = document.getElementById('dateFilter');
    const specificDateInput = document.getElementById('specificDateFilter');
    
    if (dateFilter.value === 'specific') {
        specificDateInput.classList.remove('hidden');
        // Set default to today if not set
        if (!specificDateInput.value) {
            const today = new Date();
            specificDateInput.value = today.toISOString().split('T')[0];
        }
        specificDateInput.focus();
    } else {
        specificDateInput.classList.add('hidden');
        applyFilters();
    }
}

function clearFilters() {
    document.getElementById('dateFilter').value = 'today';
    document.getElementById('houseFilter').value = 'all';
    document.getElementById('usernameFilter').value = '';
    document.getElementById('emailFilter').value = '';
    const specificDateInput = document.getElementById('specificDateFilter');
    if (specificDateInput) {
        specificDateInput.value = '';
        specificDateInput.classList.add('hidden');
    }
    loadGoals();
}

// House management functions
function getHouseDisplay(house) {
    const houses = {
        'sparta': '⚔️ Sparta',
        'athens': '🦉 Athens',
        'corinth': '🌊 Corinth',
        'olympia': '🏛️ Olympia',
        'delphi': '🔮 Delphi'
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
        
        if (!response.ok) {
            console.error('HTTP error:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Display name update response:', data);
        
        if (data.success) {
            showToast(`Display name updated to "${newDisplayName}"`, 'success');
            await logAdminAction('user_update', `Updated user display name to "${newDisplayName}"`, { userId, newDisplayName });
            
            // Update all display-name-input elements with this userId
            document.querySelectorAll(`.display-name-input[data-user-id="${userId}"]`).forEach(input => {
                input.value = newDisplayName;
            });
            
            // Force refresh of all data to show updated display name
            setTimeout(() => {
                console.log('Refreshing data after display name update...');
                loadGoals(); // Refresh to show updated display name
                // Also refresh users if they're loaded
                if (adminState.users.length > 0) {
                    loadUsers();
                }
            }, 500);
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
    
    // Check if we're already editing this user and editor is actually visible
    if (window.editingUser === userId) {
        const currentEditor = document.getElementById(`nameEditor_${userId}`);
        if (currentEditor && currentEditor.style.display !== 'none' && !currentEditor.classList.contains('hidden')) {
            console.log('Already editing this user and editor is visible, ignoring duplicate call');
            return;
        } else {
            console.log('Editing state was stuck, clearing it and proceeding');
            window.editingUser = null;
        }
    }
    
    // Clear any other editing states
    if (window.editingUser && window.editingUser !== userId) {
        console.log('Canceling edit for previous user:', window.editingUser);
        cancelNameEdit(window.editingUser);
    }
    
    window.editingUser = userId;
    
    // ONLY work in User Management section - find the user card
    const editButton = document.querySelector(`.user-card .edit-name-btn[data-user-id="${userId}"]`);
    if (!editButton) {
        console.error('Edit button not found in User Management section for userId:', userId);
        showToast('Edit name is only available in User Management section', 'warning');
        window.editingUser = null;
        return;
    }
    
    // Find the user card (User Management section only)
    const userCard = editButton.closest('.user-card');
    if (!userCard) {
        console.error('User card not found - edit only works in User Management section');
        showToast('Edit name is only available in User Management section', 'warning');
        window.editingUser = null;
        return;
    }
    
    console.log('Found user card in User Management section');
    const nameDisplay = userCard.querySelector('.name-display');
    const nameEditor = document.getElementById(`nameEditor_${userId}`);
    
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
    
    // ONLY work in User Management section - find the user card
    const editButton = document.querySelector(`.user-card .edit-name-btn[data-user-id="${userId}"]`);
    
    let nameDisplay, nameEditor;
    if (editButton) {
        const userCard = editButton.closest('.user-card');
        if (userCard) {
            // Found in User Management section
            nameDisplay = userCard.querySelector('.name-display');
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
    
    // Reset input to original value (User Management format)
    const h4Element = nameDisplay.querySelector('h4');
    if (h4Element) {
        input.value = h4Element.textContent;
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
        
        if (!response.ok) {
            console.error('HTTP error:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Update response:', data);
        
        if (data.success) {
            showToast(`Display name updated to "${newDisplayName}"`, 'success');
            await logAdminAction('user_update', `Updated user display name to "${newDisplayName}"`, { userId, newDisplayName });
            
            // Update the display immediately in User Management section only
            let nameDisplay;
            const editButton = document.querySelector(`.user-card .edit-name-btn[data-user-id="${userId}"]`);
            
            if (editButton) {
                const userCard = editButton.closest('.user-card');
                if (userCard) {
                    // User Management section
                    nameDisplay = userCard.querySelector('.name-display');
                    if (nameDisplay) {
                        const h4Element = nameDisplay.querySelector('h4');
                        if (h4Element) {
                            h4Element.textContent = newDisplayName;
                        }
                    }
                }
            } else {
                console.warn('Could not find edit button in User Management section for userId:', userId);
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
            
            // Refresh data in background - force fresh data
            setTimeout(() => {
                if (adminState.users.length > 0) {
                    console.log('Refreshing users after name update...');
                    loadUsers();
                }
                console.log('Refreshing goals after name update...');
                loadGoals();
            }, 500);
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

function showGoalCreationModal() {
    console.log('Opening goal creation modal for admin');
    
    // Check if admin name is provided
    if (!adminState.adminName || adminState.adminName.trim() === '') {
        showToast('Please enter your admin name in the header before creating goals', 'warning');
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
    
    // Load users first if not already loaded
    if (!adminState.users || adminState.users.length === 0) {
        loadUsers().then(() => {
            showGoalCreationModalWithUsers();
        });
    } else {
        showGoalCreationModalWithUsers();
    }
}

function showGoalCreationModalWithUsers() {
    // Create user options
    const userOptions = adminState.users
        .filter(user => !user.deleted)
        .map(user => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.username)} (${escapeHtml(user.email)})</option>`)
        .join('');
    
    if (!userOptions) {
        showToast('No active users found. Please ensure users are registered.', 'warning');
        return;
    }
    
    // Create modal HTML for goal creation
    const modalHTML = `
        <div id="goalCreationModal" class="goal-editing-modal-overlay">
            <div class="goal-editing-modal">
                <div class="goal-editing-header">
                    <h2>➕ Create New Goal for Student</h2>
                    <button class="close-modal-btn" onclick="closeGoalCreationModal()">&times;</button>
                </div>
                
                <div class="goal-editing-content">
                    <div class="goal-creation-form">
                        <div class="form-group">
                            <label for="studentSelect" class="form-label">
                                <strong>👤 Select Student:</strong>
                                <span class="form-help">Choose which student this goal will be created for</span>
                            </label>
                            <select id="studentSelect" class="student-selector" onchange="updateAlphaXProject()">
                                <option value="">-- Select a Student --</option>
                                ${userOptions}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="alphaXProjectInput" class="form-label">
                                <strong>🚀 Alpha X Project:</strong>
                                <span class="form-help">Enter the student's Alpha X project (required for AI validation)</span>
                            </label>
                            <input 
                                type="text" 
                                id="alphaXProjectInput" 
                                class="alpha-x-input"
                                placeholder="e.g., AI-powered social matchmaking algorithm for video games"
                            />
                        </div>
                        
                        <div class="form-group">
                            <label for="adminBrainliftLink" class="form-label">
                                <strong>📚 Student's BrainLift Link:</strong>
                                <span class="form-help">Provide the link to the student's BrainLift document (publicly viewable)</span>
                            </label>
                            <input 
                                type="url" 
                                id="adminBrainliftLink" 
                                class="alpha-x-input"
                                placeholder="https://docs.google.com/document/d/... (must be publicly viewable)"
                                required
                            />
                        </div>
                        
                        <div class="form-group">
                            <label for="goalTextCreator" class="form-label">
                                <strong>🎯 Goal Text:</strong>
                                <span class="form-help">Write the goal for the student. It will be validated by AI.</span>
                            </label>
                            <textarea 
                                id="goalTextCreator" 
                                class="goal-text-editor"
                                rows="4"
                                placeholder="Enter the goal text that will be assigned to the student..."
                            ></textarea>
                        </div>
                        
                        <div class="form-group">
                            <div class="checkbox-group" id="afterSchoolCheckboxGroup" onclick="toggleAfterSchoolCheckbox()">
                                <input type="checkbox" id="isAfterSchoolCheckbox" onclick="event.stopPropagation()">
                                <div class="checkbox-label">
                                    <strong>After School Goal</strong>
                                    <span>Check this if this goal is for after school hours work</span>
                                </div>
                            </div>
                        </div>
                        
                        <div id="goalCreationFeedback" class="validation-feedback-section" style="display: none;"></div>
                        
                        <div class="admin-info">
                            <strong>👨‍💼 Admin:</strong> ${adminState.adminName}
                        </div>
                    </div>
                    
                    <div class="goal-editing-actions">
                        <button class="btn btn-secondary" onclick="closeGoalCreationModal()">
                            ❌ Cancel
                        </button>
                        <button class="btn btn-primary" onclick="createGoalForStudent()">
                            🤖 Create Goal & Validate with AI
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    const existingModal = document.getElementById('goalCreationModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Focus on the student selector
    setTimeout(() => {
        const selector = document.getElementById('studentSelect');
        if (selector) {
            selector.focus();
        }
    }, 100);
}

function updateAlphaXProject() {
    const studentSelect = document.getElementById('studentSelect');
    const alphaXInput = document.getElementById('alphaXProjectInput');
    
    if (studentSelect.value) {
        const selectedUser = adminState.users.find(u => u.id === studentSelect.value);
        if (selectedUser && selectedUser.alphaXProject) {
            alphaXInput.value = selectedUser.alphaXProject;
        }
    }
}

function toggleAfterSchoolCheckbox() {
    const checkbox = document.getElementById('isAfterSchoolCheckbox');
    const checkboxGroup = document.getElementById('afterSchoolCheckboxGroup');
    
    checkbox.checked = !checkbox.checked;
    
    if (checkbox.checked) {
        checkboxGroup.classList.add('checked');
    } else {
        checkboxGroup.classList.remove('checked');
    }
}

function closeGoalCreationModal() {
    const modal = document.getElementById('goalCreationModal');
    if (modal) {
        modal.remove();
    }
}

async function createGoalForStudent() {
    const studentSelect = document.getElementById('studentSelect');
    const alphaXInput = document.getElementById('alphaXProjectInput');
    const brainliftLinkInput = document.getElementById('adminBrainliftLink');
    const goalTextarea = document.getElementById('goalTextCreator');
    
    // Validate form inputs
    if (!studentSelect.value) {
        showToast('Please select a student', 'warning');
        studentSelect.focus();
        return;
    }
    
    const alphaXProject = alphaXInput.value.trim();
    if (!alphaXProject) {
        showToast('Please enter the Alpha X project', 'warning');
        alphaXInput.focus();
        return;
    }
    
    const brainliftLink = brainliftLinkInput.value.trim();
    if (!brainliftLink) {
        showToast('Please enter the BrainLift document link', 'warning');
        brainliftLinkInput.focus();
        return;
    }
    
    // Validate BrainLift URL
    try {
        new URL(brainliftLink);
    } catch (e) {
        showToast('Please provide a valid URL for the BrainLift document', 'warning');
        brainliftLinkInput.focus();
        return;
    }
    
    const goalText = goalTextarea.value.trim();
    if (!goalText) {
        showToast('Please enter the goal text', 'warning');
        goalTextarea.focus();
        return;
    }
    
    // Show loading state
    const createBtn = document.querySelector('.goal-editing-actions .btn-primary');
    const originalText = createBtn.textContent;
    createBtn.textContent = '🤖 AI Processing...';
    createBtn.disabled = true;
    
    try {
        const isAfterSchool = document.getElementById('isAfterSchoolCheckbox')?.checked || false;
        
        console.log('Creating goal for student:', studentSelect.value, 'goal:', goalText, 'project:', alphaXProject, 'isAfterSchool:', isAfterSchool);
        
        const response = await fetch('/api/admin-create-goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                userId: studentSelect.value,
                goal: goalText,
                brainliftLink: brainliftLink,
                alphaXProject: alphaXProject,
                adminName: adminState.adminName,
                isAfterSchool: isAfterSchool
            })
        });
        
        const data = await response.json();
        console.log('Goal creation response:', data);
        
        const feedbackDiv = document.getElementById('goalCreationFeedback');
        
        if (data.success) {
            const selectedUser = adminState.users.find(u => u.id === studentSelect.value);
            const userName = selectedUser ? selectedUser.username : 'Unknown';
            
            let validationInfo = '';
            if (data.validation) {
                validationInfo = `<br><strong>AI Validation Scores:</strong> Ambition ${data.validation.ambitionScore}/5, Measurable ${data.validation.measurableScore}/10, Relevance ${data.validation.relevanceScore}/10`;
            }
            
            let questionsInfo = '';
            if (data.aiQuestions && data.aiAnswers) {
                questionsInfo = `<br><strong>AI Questions Generated:</strong> ${data.aiQuestions.length} questions automatically answered for the student`;
            }
                
            feedbackDiv.innerHTML = `
                <div class="validation-success">
                    <h4>🎉 Goal Created Successfully!</h4>
                    <p><strong>✅ Student:</strong> ${escapeHtml(userName)}</p>
                    <p><strong>🎯 Goal:</strong> ${escapeHtml(goalText)}</p>
                    <p><strong>🚀 Project:</strong> ${escapeHtml(alphaXProject)}</p>
                    ${validationInfo}
                    ${questionsInfo}
                    <p><strong>👨‍💼 Created by:</strong> ${adminState.adminName}</p>
                    <p><strong>📱 Next:</strong> The student can now see this goal in their dashboard and work on completing it.</p>
                </div>
            `;
            feedbackDiv.style.display = 'block';
            
            await logAdminAction('goal_creation', `Created new goal for student ${userName}: "${goalText}"`, { 
                userId: studentSelect.value, 
                goal: goalText, 
                alphaXProject: alphaXProject 
            });
            
            showToast(`✅ Goal created successfully for ${userName}!`, 'success');
            
            // Update button to show completion
            createBtn.textContent = '✅ Goal Created Successfully!';
            createBtn.disabled = true;
            createBtn.style.background = '#4caf50';
            
            // Auto-close modal after delay
            setTimeout(() => {
                closeGoalCreationModal();
                loadGoals(); // Refresh the goals list to show the new goal
            }, 4000);
            
        } else {
            // Handle validation failure or other errors
            if (data.validation && !data.validation.isValid) {
                const validationMsg = data.validation.feedback || 'Goal does not meet validation criteria';
                
                feedbackDiv.innerHTML = `
                    <div class="validation-failure">
                        <h4>❌ AI Validation Failed</h4>
                        <p><strong>Issue:</strong> ${validationMsg}</p>
                        <div class="validation-scores">
                            <div class="score-item ${data.validation.ambitionScore >= 4 ? 'pass' : 'fail'}">
                                <strong>Ambition:</strong> ${data.validation.ambitionScore}/5 ${data.validation.ambitionScore >= 4 ? '✅' : '❌ (Need 4+)'}
                            </div>
                            <div class="score-item ${data.validation.measurableScore >= 8 ? 'pass' : 'fail'}">
                                <strong>Measurable:</strong> ${data.validation.measurableScore}/10 ${data.validation.measurableScore >= 8 ? '✅' : '❌ (Need 8+)'}
                            </div>
                            <div class="score-item ${data.validation.relevanceScore >= 8 ? 'pass' : 'fail'}">
                                <strong>Relevance:</strong> ${data.validation.relevanceScore}/10 ${data.validation.relevanceScore >= 8 ? '✅' : '❌ (Need 8+)'}
                            </div>
                        </div>
                        ${data.validation.suggestions && data.validation.suggestions.length > 0 ? 
                            `<div class="ai-suggestions">
                                <strong>💡 AI Suggestions:</strong>
                                <ul>
                                    ${data.validation.suggestions.map(s => `<li>${s}</li>`).join('')}
                                </ul>
                            </div>` : ''}
                        <p><em>Please revise the goal based on the feedback above and try again.</em></p>
                    </div>
                `;
                feedbackDiv.style.display = 'block';
                showToast(`❌ Goal failed AI validation. Check the feedback and try again.`, 'error', 8000);
            } else {
                feedbackDiv.innerHTML = `
                    <div class="validation-error">
                        <h4>❌ Error Creating Goal</h4>
                        <p>${data.error || 'An unknown error occurred'}</p>
                    </div>
                `;
                feedbackDiv.style.display = 'block';
                showToast(data.error || 'Failed to create goal', 'error');
            }
        }
    } catch (error) {
        console.error('Error creating goal:', error);
        const feedbackDiv = document.getElementById('goalCreationFeedback');
        feedbackDiv.innerHTML = `
            <div class="validation-error">
                <h4>❌ Network Error</h4>
                <p>Failed to connect to the server. Please check your internet connection and try again.</p>
            </div>
        `;
        feedbackDiv.style.display = 'block';
        showToast('Failed to create goal - network error', 'error');
    } finally {
        // Only restore button state if it's not the success state
        if (createBtn.textContent !== '✅ Goal Created Successfully!') {
            createBtn.textContent = originalText;
            createBtn.disabled = false;
        }
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Chicago',
        timeZoneName: 'short'
    });
}

function showGoalEditingModal(goalId) {
    console.log('Opening goal editing modal for goalId:', goalId);
    
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
    
    // Find the goal data
    const goal = adminState.goals.find(g => g.id === goalId);
    if (!goal) {
        console.error('Goal not found for goalId:', goalId);
        showToast('Goal not found', 'error');
        return;
    }
    
    // Check if goal can be edited (current day only)
    if (!canEditGoal(goal.createdAt)) {
        showToast('Goals can only be edited on the day they were created', 'warning');
        return;
    }
    
    // Create modal HTML for goal editing
    const modalHTML = `
        <div id="goalEditingModal" class="goal-editing-modal-overlay">
            <div class="goal-editing-modal">
                <div class="goal-editing-header">
                    <h2>✏️ Edit Student Goal</h2>
                    <button class="close-modal-btn" onclick="closeGoalEditingModal()">&times;</button>
                </div>
                
                <div class="goal-editing-content">
                    <div class="goal-meta-info">
                        <div class="student-info">
                            <strong>👤 Student:</strong> ${escapeHtml(goal.user.username)}
                            <span class="house-badge house-${goal.user.house || 'none'}">${getHouseDisplay(goal.user.house)}</span>
                        </div>
                        <div class="goal-dates">
                            <strong>📅 Created:</strong> ${formatDate(goal.createdAt)}
                        </div>
                        <div class="alpha-project-info">
                            <strong>🚀 Project:</strong> ${escapeHtml(goal.alphaXProject || 'Not specified')}
                        </div>
                    </div>
                    
                    <div class="goal-editing-form">
                        <label for="goalTextEditor" class="form-label">
                            <strong>🎯 Goal Text:</strong>
                            <span class="form-help">Edit the goal text below. Changes will be validated by AI and replace the existing goal.</span>
                        </label>
                        <textarea 
                            id="goalTextEditor" 
                            class="goal-text-editor"
                            rows="4"
                            placeholder="Enter the updated goal text..."
                        >${escapeHtml(goal.goal)}</textarea>
                        
                        <div id="goalEditingFeedback" class="validation-feedback-section" style="display: none;"></div>
                        
                        <div class="admin-info">
                            <strong>👨‍💼 Admin:</strong> ${adminState.adminName}
                        </div>
                    </div>
                    
                    <div class="goal-editing-actions">
                        <button class="btn btn-secondary" onclick="closeGoalEditingModal()">
                            ❌ Cancel
                        </button>
                        <button class="btn btn-primary" onclick="saveEditedGoal('${goalId}')">
                            🤖 Validate & Update Goal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    const existingModal = document.getElementById('goalEditingModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Focus on the textarea
    setTimeout(() => {
        const textarea = document.getElementById('goalTextEditor');
        if (textarea) {
            textarea.focus();
            textarea.select();
        }
    }, 100);
}

function closeGoalEditingModal() {
    const modal = document.getElementById('goalEditingModal');
    if (modal) {
        modal.remove();
    }
    editingGoal = null;
}

async function saveEditedGoal(goalId) {
    const textarea = document.getElementById('goalTextEditor');
    if (!textarea) {
        showToast('Goal editor not found', 'error');
        return;
    }
    
    const newGoalText = textarea.value.trim();
    if (!newGoalText) {
        showToast('Goal text cannot be empty', 'warning');
        textarea.focus();
        return;
    }
    
    // Show loading state
    const saveBtn = document.querySelector('.goal-editing-actions .btn-primary');
    const originalText = saveBtn.textContent;
        saveBtn.textContent = '🤖 AI Validating...';
        saveBtn.disabled = true;
    
    try {
        console.log('Updating existing goal for goalId:', goalId, 'to:', newGoalText);
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
        
        const feedbackDiv = document.getElementById('goalEditingFeedback');
        
        if (data.success) {
            const goal = adminState.goals.find(g => g.id === goalId);
            const userName = goal ? goal.user.username : 'Unknown';
            
            let validationInfo = '';
            if (data.validation) {
                validationInfo = `<br><strong>AI Validation Scores:</strong> Ambition ${data.validation.ambitionScore}/5, Measurable ${data.validation.measurableScore}/10, Relevance ${data.validation.relevanceScore}/10`;
            }
                
            feedbackDiv.innerHTML = `
                <div class="validation-success">
                    <h4>🎉 Goal Updated Successfully!</h4>
                    <p><strong>✅ Student:</strong> ${escapeHtml(userName)}</p>
                    <p><strong>🎯 Updated Goal:</strong> ${escapeHtml(newGoalText)}</p>
                    ${validationInfo}
                    <p><strong>👨‍💼 Updated by:</strong> ${adminState.adminName}</p>
                    <p><strong>📱 Next:</strong> The student will see the updated goal immediately in their dashboard.</p>
                </div>
            `;
            feedbackDiv.style.display = 'block';
            
            await logAdminAction('goal_edit', `Edited goal for student ${userName}: "${newGoalText}"`, { 
                goalId: goalId, 
                newGoalText: newGoalText,
                originalGoal: goal ? goal.goal : 'Unknown'
            });
            
            showToast(`✅ Goal updated successfully for ${userName}!`, 'success');
            
            // Update button to show completion
            saveBtn.textContent = '✅ Goal Updated Successfully!';
            saveBtn.disabled = true;
            saveBtn.style.background = '#4caf50';
            
            // Auto-close modal after delay
            setTimeout(() => {
                closeGoalEditingModal();
                loadGoals(); // Refresh the goals list to show the updated goal
            }, 3000);
            
        } else {
            // Handle validation failure or other errors
            if (data.validation && !data.validation.isValid) {
                const validationMsg = data.validation.feedback || 'Goal does not meet validation criteria';
                
                feedbackDiv.innerHTML = `
                    <div class="validation-failure">
                        <h4>❌ AI Validation Failed</h4>
                        <p><strong>Issue:</strong> ${validationMsg}</p>
                        <div class="validation-scores">
                            <div class="score-item ${data.validation.ambitionScore >= 4 ? 'pass' : 'fail'}">
                                <strong>Ambition:</strong> ${data.validation.ambitionScore}/5 ${data.validation.ambitionScore >= 4 ? '✅' : '❌ (Need 4+)'}
                            </div>
                            <div class="score-item ${data.validation.measurableScore >= 8 ? 'pass' : 'fail'}">
                                <strong>Measurable:</strong> ${data.validation.measurableScore}/10 ${data.validation.measurableScore >= 8 ? '✅' : '❌ (Need 8+)'}
                            </div>
                            <div class="score-item ${data.validation.relevanceScore >= 8 ? 'pass' : 'fail'}">
                                <strong>Relevance:</strong> ${data.validation.relevanceScore}/10 ${data.validation.relevanceScore >= 8 ? '✅' : '❌ (Need 8+)'}
                            </div>
                        </div>
                        ${data.validation.suggestions && data.validation.suggestions.length > 0 ? 
                            `<div class="ai-suggestions">
                                <strong>💡 AI Suggestions:</strong>
                                <ul>
                                    ${data.validation.suggestions.map(s => `<li>${s}</li>`).join('')}
                                </ul>
                            </div>` : ''}
                        <p><em>Please revise the goal based on the feedback above and try again.</em></p>
                    </div>
                `;
                feedbackDiv.style.display = 'block';
                showToast(`❌ Goal failed AI validation. Check the feedback and try again.`, 'error', 8000);
            } else {
                feedbackDiv.innerHTML = `
                    <div class="validation-error">
                        <h4>❌ Error Updating Goal</h4>
                        <p>${data.error || 'An unknown error occurred'}</p>
                    </div>
                `;
                feedbackDiv.style.display = 'block';
                showToast(data.error || 'Failed to update goal', 'error');
            }
        }
    } catch (error) {
        console.error('Error updating goal:', error);
        const feedbackDiv = document.getElementById('goalEditingFeedback');
        feedbackDiv.innerHTML = `
            <div class="validation-error">
                <h4>❌ Network Error</h4>
                <p>Failed to connect to the server. Please check your internet connection and try again.</p>
            </div>
        `;
        feedbackDiv.style.display = 'block';
        showToast('Failed to update goal - network error', 'error');
    } finally {
        // Only restore button state if it's not the success state
        if (saveBtn.textContent !== '✅ Goal Updated Successfully!') {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }
}

// Old inline goal editing functions removed - replaced with goal creation modal workflow

// Admin complete goal function (for after school goals)
async function adminCompleteGoal(goalId) {
    console.log('adminCompleteGoal called for goalId:', goalId);
    
    // Check if admin name is provided
    if (!adminState.adminName || adminState.adminName.trim() === '') {
        showToast('Please enter your admin name in the header before completing goals', 'warning');
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
    
    if (!confirm(`Mark this after school goal as complete?\n\nAdmin: ${adminState.adminName}\n\nThis action will be logged.`)) {
        return;
    }
    
    showLoading('Completing goal...');
    
    try {
        console.log('Completing goal:', goalId, 'by admin:', adminState.adminName);
        const response = await fetch('/api/admin-complete-goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ goalId, adminName: adminState.adminName })
        });
        
        const data = await response.json();
        hideLoading();
        
        console.log('Complete response:', data);
        
        if (data.success) {
            showToast(`Goal marked as complete by ${adminState.adminName}`, 'success');
            await logAdminAction('goal_completion', `Completed after school goal`, { goalId });
            loadGoals(); // Reload goals to show updated status
        } else {
            console.error('Complete failed:', data.error);
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Complete error:', error);
        showToast('Failed to complete goal - network error', 'error');
    }
}

// Goal revocation functions
async function revokeCompletion(goalId) {
    console.log('revokeCompletion called for goalId:', goalId);
    
    // Check if admin name is provided
    if (!adminState.adminName || adminState.adminName.trim() === '') {
        showToast('Please enter your admin name in the header before revoking goal completion', 'warning');
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
    
    if (!confirm(`Revoke completion for this goal?\n\nThis will change the goal status from "completed" back to "active".\n\nAdmin: ${adminState.adminName}\n\nThis action will be logged.`)) {
        return;
    }
    
    showLoading('Revoking goal completion...');
    
    try {
        console.log('Revoking completion for goal:', goalId, 'by admin:', adminState.adminName);
        const response = await fetch('/api/revoke-goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ goalId, adminName: adminState.adminName })
        });
        
        const data = await response.json();
        hideLoading();
        
        console.log('Revocation response:', data);
        
        if (data.success) {
            showToast(`Goal completion revoked successfully by ${adminState.adminName}`, 'success');
            await logAdminAction('goal_revocation', `Revoked completion for goal and changed status back to active`, { goalId });
            loadGoals(); // Reload goals to show updated status
        } else {
            console.error('Revocation failed:', data.error);
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Revocation error:', error);
        showToast('Failed to revoke goal completion - network error', 'error');
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
    
    // Safely update stats elements if they exist (stats section may be removed)
    const totalGoalsEl = document.getElementById('totalGoals');
    if (totalGoalsEl && stats.totalGoals !== undefined) {
        totalGoalsEl.textContent = stats.totalGoals;
    }
    
    const activeGoalsEl = document.getElementById('activeGoals');
    if (activeGoalsEl && stats.activeGoals !== undefined) {
        activeGoalsEl.textContent = stats.activeGoals;
    }
    
    const completedGoalsEl = document.getElementById('completedGoals');
    if (completedGoalsEl && stats.completedGoals !== undefined) {
        completedGoalsEl.textContent = stats.completedGoals;
    }
    
    const invalidatedGoalsEl = document.getElementById('invalidatedGoals');
    if (invalidatedGoalsEl && stats.invalidatedGoals !== undefined) {
        invalidatedGoalsEl.textContent = stats.invalidatedGoals;
    }
    
    const totalUsersEl = document.getElementById('totalUsers');
    if (totalUsersEl && stats.totalUsers !== undefined) {
        totalUsersEl.textContent = stats.totalUsers;
    }
}

// User Management Functions
async function loadUsers() {
    const container = document.getElementById('usersContainer');
    container.innerHTML = '<div class="loading">Loading users...</div>';
    
    // Clear editing state when refreshing user data
    if (window.editingUser) {
        console.log('Clearing editing state due to user data refresh');
        window.editingUser = null;
    }
    
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
                            <option value="delphi" ${user.house === 'delphi' ? 'selected' : ''}>🔮 Delphi</option>
                        </select>
                    </div>
                </div>
                
                <div class="user-stats">
                    <span>Total Goals: ${goalCount}</span>
                    <span>Active: ${activeGoals}</span>
                    <span>Completed: ${completedGoals}</span>
                    <span>Brain Lift Entries: ${user.brainliftEntryCount || 0}</span>
                </div>
                
                ${user.brainliftEntryCount > 0 ? `
                    <div class="brainlift-history-section">
                        <button class="btn btn-secondary brainlift-history-toggle" onclick="toggleBrainLiftHistory('${escapeHtml(user.id)}')">
                            📊 View Brain Lift History (${user.brainliftEntryCount || 0} entries)
                        </button>
                        <div id="brainliftHistory_${escapeHtml(user.id)}" class="brainlift-history-content hidden">
                            <div class="loading">Loading Brain Lift history...</div>
                        </div>
                    </div>
                ` : ''}
                
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

// Brain Lift History Functions
async function toggleBrainLiftHistory(userId) {
    const historyContent = document.getElementById(`brainliftHistory_${userId}`);
    if (!historyContent) return;
    
    if (historyContent.classList.contains('hidden')) {
        // Show and load history
        historyContent.classList.remove('hidden');
        await loadBrainLiftHistory(userId);
    } else {
        // Hide history
        historyContent.classList.add('hidden');
    }
}

async function loadBrainLiftHistory(userId) {
    const historyContent = document.getElementById(`brainliftHistory_${userId}`);
    if (!historyContent) return;
    
    historyContent.innerHTML = '<div class="loading">Loading Brain Lift history...</div>';
    
    try {
        const response = await fetch(`/api/admin-brainlift-history?userId=${encodeURIComponent(userId)}`);
        const data = await response.json();
        
        if (data.success && data.groupedByDate) {
            displayBrainLiftHistory(historyContent, data.groupedByDate);
        } else {
            historyContent.innerHTML = `
                <div class="no-data-message">
                    <p>Unable to load Brain Lift history</p>
                    <p class="error-text">${data.error || 'Unknown error'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading Brain Lift history:', error);
        historyContent.innerHTML = `
            <div class="no-data-message">
                <p>Failed to load Brain Lift history</p>
                <p class="error-text">Network error</p>
            </div>
        `;
    }
}

function displayBrainLiftHistory(container, groupedByDate) {
    if (!groupedByDate || Object.keys(groupedByDate).length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <p>No Brain Lift entries found</p>
            </div>
        `;
        return;
    }
    
    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
    
    const historyHTML = sortedDates.map(date => {
        const entries = groupedByDate[date];
        const formattedDate = new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        return `
            <div class="brainlift-date-group">
                <h5 class="brainlift-date-header">📅 ${formattedDate}</h5>
                ${entries.map(entry => `
                    <div class="brainlift-entry">
                        <div class="brainlift-entry-info">
                            <span class="brainlift-word-count">📊 <strong>${entry.wordCount} words</strong></span>
                            <span class="brainlift-time">🕐 ${new Date(entry.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div class="brainlift-preview">
                            ${escapeHtml(entry.content).substring(0, 150)}${entry.content.length > 150 ? '...' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="brainlift-history-list">
            ${historyHTML}
        </div>
    `;
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
        'goal_revocation': '🔄 Goal Revocation',
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

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Screenshot rendering functions removed - screenshots no longer stored in Redis to save space
// Goals now only track hasScreenshots (boolean) and screenshotCount (number)

// Goal expand/collapse functionality
function toggleGoalDetails(goalId) {
    const detailsSection = document.getElementById(`details-${goalId}`);
    const arrow = document.getElementById(`arrow-${goalId}`);
    
    if (detailsSection && arrow) {
        if (detailsSection.classList.contains('hidden')) {
            detailsSection.classList.remove('hidden');
            arrow.textContent = '▲';
            arrow.style.transform = 'rotate(180deg)';
        } else {
            detailsSection.classList.add('hidden');
            arrow.textContent = '▼';
            arrow.style.transform = 'rotate(0deg)';
        }
    }
}

// Check if goal can be edited (current day only)
function canEditGoal(createdAt) {
    const now = new Date();
    const goalDate = new Date(createdAt);
    
    // Convert to CST for consistency
    const nowCST = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    const goalDateCST = new Date(goalDate.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    
    // Check if both dates are on the same day in CST
    return nowCST.toDateString() === goalDateCST.toDateString();
}

