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

// Brain Lift content handling functions
function getBrainLiftContent() {
    const textarea = document.getElementById('brainliftContent');
    return textarea ? textarea.value.trim() : '';
}

function countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    const cleanText = text
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, ' ')
        .trim();
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);
    return words.length;
}

// Initialize Brain Lift text area word counter
function initializeBrainLiftWordCounter() {
    const textarea = document.getElementById('brainliftContent');
    const wordCountDisplay = document.getElementById('brainliftWordCount');
    
    if (textarea && wordCountDisplay) {
        textarea.addEventListener('input', () => {
            const text = textarea.value;
            const wordCount = countWords(text);
            wordCountDisplay.textContent = `${wordCount} words`;
        });
    }
}

// Brain Lift file upload removed - only text paste is supported now

// Global variable to store selected completion screenshots  
let selectedCompletionScreenshots = [];

// File upload functions for goal completion
function handleCompletionFileUpload() {
    console.log('Initializing completion screenshot upload...');
    
    const fileInput = document.getElementById('completionScreenshot');
    const dropzone = document.getElementById('completionDropzone');
    
    console.log('Completion file input found:', !!fileInput);
    console.log('Completion dropzone found:', !!dropzone);
    
    if (!fileInput) {
        console.error('Completion screenshot file input not found!');
                return;
            }
            
    if (!dropzone) {
        console.error('Completion screenshot dropzone not found!');
                return;
            }
            
    // Reset completion screenshots when modal opens
    selectedCompletionScreenshots = [];
    
    // File input change handler
    fileInput.addEventListener('change', handleCompletionScreenshotSelect);
    console.log('Added change event listener to completion file input');
    
    // Drag and drop handlers for completion
    dropzone.addEventListener('dragover', handleCompletionDragOver);
    dropzone.addEventListener('dragenter', handleCompletionDragEnter);
    dropzone.addEventListener('dragleave', handleCompletionDragLeave);
    dropzone.addEventListener('drop', handleCompletionDrop);
    console.log('Added drag and drop event listeners to completion dropzone');
    
    // Click handler for completion dropzone
    dropzone.addEventListener('click', () => {
        console.log('Completion dropzone clicked, opening file dialog');
        fileInput.click();
    });
    
    console.log('Completion screenshot upload initialized successfully');
}

function handleCompletionScreenshotSelect(e) {
    console.log('Completion file input change event triggered');
    const files = Array.from(e.target.files || []);
    console.log('Completion files selected:', files.length);
    addCompletionScreenshots(files);
}

function handleCompletionDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}

function handleCompletionDragEnter(e) {
    e.preventDefault();
    e.target.classList.add('drag-active');
}

function handleCompletionDragLeave(e) {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-active');
    }
}

function handleCompletionDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-active');
    
    console.log('Completion files dropped:', e.dataTransfer.files.length);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    console.log('Completion image files filtered:', files.length);
    
    if (files.length === 0) {
        showToast('Please drop image files only', 'warning');
        return;
    }
    
    addCompletionScreenshots(files);
}

function addCompletionScreenshots(files) {
    console.log('Adding completion screenshots:', files.length, 'files');
    
    if (!files || files.length === 0) {
        console.log('No files provided to addCompletionScreenshots');
        return;
    }
    
    const validFiles = [];
    
    for (const file of files) {
        console.log('Processing completion file:', file.name, 'type:', file.type, 'size:', file.size);
        
        // Check file type
            if (!file.type.startsWith('image/')) {
            showToast(`"${file.name}" is not an image file (type: ${file.type})`, 'warning');
            continue;
        }
        
        // Check file size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            showToast(`"${file.name}" is too large. Please use images under 2MB`, 'warning');
            continue;
        }
        
        // Check for duplicates
        const isDuplicate = selectedCompletionScreenshots.some(existing => 
            existing.name === file.name && existing.size === file.size
        );
        
        if (isDuplicate) {
            showToast(`"${file.name}" is already selected`, 'warning');
            continue;
        }
        
        validFiles.push(file);
        console.log('Completion file added to valid files:', file.name);
    }
    
    console.log('Valid completion files count:', validFiles.length);
    
    if (validFiles.length === 0) {
        console.log('No valid completion files to add');
                return;
            }
            
    // Add valid files to completion selection
    selectedCompletionScreenshots.push(...validFiles);
    console.log('Total selected completion screenshots:', selectedCompletionScreenshots.length);
    
    // Update completion UI
    updateCompletionScreenshotPreview();
    showToast(`✅ Added ${validFiles.length} completion image${validFiles.length > 1 ? 's' : ''} successfully!`, 'success');
}

function removeCompletionScreenshot(index) {
    selectedCompletionScreenshots.splice(index, 1);
    updateCompletionScreenshotPreview();
    showToast('Completion image removed', 'info');
}

function clearCompletionScreenshots() {
    selectedCompletionScreenshots = [];
    updateCompletionScreenshotPreview();
}

function updateCompletionScreenshotPreview() {
    console.log('Updating completion screenshot preview, files count:', selectedCompletionScreenshots.length);
    
    const preview = document.getElementById('screenshotPreview');
    const container = document.getElementById('imagePreviewContainer');
    const dropzone = document.getElementById('completionDropzone');
    
    console.log('Completion preview element found:', !!preview);
    console.log('Completion container element found:', !!container);
    console.log('Completion dropzone element found:', !!dropzone);
    
    if (!preview || !container || !dropzone) {
        console.error('Missing required elements for completion screenshot preview update');
                return;
            }
            
    if (selectedCompletionScreenshots.length === 0) {
        console.log('No completion screenshots selected, hiding preview');
        preview.classList.add('hidden');
        dropzone.classList.remove('file-selected');
        
        // Reset dropzone text
        const dropzoneText = dropzone.querySelector('.file-upload-text span:last-child');
        if (dropzoneText) {
            dropzoneText.textContent = 'Click here or drag & drop your screenshots';
        }
        return;
    }
    
    console.log('Showing completion preview section');
    // Show preview section
    preview.classList.remove('hidden');
    dropzone.classList.add('file-selected');
    
    // Clear previous previews
    container.innerHTML = '';
    
    // Create preview for each image
    selectedCompletionScreenshots.forEach((file, index) => {
        console.log('Creating completion preview for:', file.name);
        
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-image-wrapper';
        
        const img = document.createElement('img');
        img.className = 'preview-image';
        img.alt = file.name;
        img.title = `${file.name} (${formatFileSize(file.size)})`;
        
        // Create object URL for preview
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
        
        // Click to view full size
        img.addEventListener('click', () => {
            console.log('Opening completion image modal for:', file.name);
            openImageModal(objectUrl);
        });
        
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image-btn';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove image';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Removing completion image:', file.name);
            URL.revokeObjectURL(objectUrl);
            removeCompletionScreenshot(index);
        });
        
        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        container.appendChild(wrapper);
    });
    
    // Update dropzone text
    const dropzoneText = dropzone.querySelector('.file-upload-text span:last-child');
    if (dropzoneText) {
        dropzoneText.textContent = `✅ ${selectedCompletionScreenshots.length} screenshot${selectedCompletionScreenshots.length > 1 ? 's' : ''} uploaded`;
        console.log('Updated completion dropzone text:', dropzoneText.textContent);
        } else {
        console.error('Could not find completion dropzone text element');
    }
    
    console.log('Completion screenshot preview updated successfully');
}

// Function that confirmCompletion() expects
window.getSelectedImages = function() {
    console.log('getSelectedImages called, returning', selectedCompletionScreenshots.length, 'files');
    return selectedCompletionScreenshots;
};

// Function to clear completion images 
window.clearSelectedImages = function() {
    console.log('Clearing selected completion images');
    selectedCompletionScreenshots = [];
    updateCompletionScreenshotPreview();
};

// Debug function to check completion screenshot upload state
window.debugCompletionScreenshots = function() {
    console.log('=== COMPLETION SCREENSHOT UPLOAD DEBUG ===');
    console.log('Selected completion screenshots count:', selectedCompletionScreenshots.length);
    console.log('Selected completion screenshots array:', selectedCompletionScreenshots);
    
    const fileInput = document.getElementById('completionScreenshot');
    const dropzone = document.getElementById('completionDropzone');
    const preview = document.getElementById('screenshotPreview');
    const container = document.getElementById('imagePreviewContainer');
    
    console.log('Completion file input element:', fileInput);
    console.log('Completion file input files:', fileInput?.files?.length || 0);
    console.log('Completion dropzone element:', dropzone);
    console.log('Completion preview element:', preview);
    console.log('Completion container element:', container);
    
    console.log('Completion dropzone classes:', dropzone?.className);
    console.log('Completion preview classes:', preview?.className);
    
    if (dropzone) {
        const dropzoneText = dropzone.querySelector('.file-upload-text span:last-child');
        console.log('Completion dropzone text element:', dropzoneText);
        console.log('Completion dropzone text content:', dropzoneText?.textContent);
    }
    
    console.log('=== END COMPLETION DEBUG ===');
};

// Goal completion modal functions  
let currentCompletionGoal = null;

function showCompletionModal(goalId) {
    console.log('Showing completion modal for goalId:', goalId);
    
    // Find the goal data
    const goal = appState.goals.find(g => g.id === goalId);
    if (!goal) {
        console.error('Goal not found:', goalId);
        return;
    }
    
    currentCompletionGoal = goal;
    
    // Create modal HTML dynamically and add to body
    const modalHTML = `
        <div id="completionModal" class="completion-modal" onclick="handleModalClick(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>🎉 Complete Your Goal</h3>
                    <button class="modal-close" onclick="hideCompletionModal()">&times;</button>
                </div>
                
                <div class="goal-preview">
                    <h4>📝 "${escapeHtml(goal.goal)}"</h4>
                    ${goal.alphaXProject ? `<p class="alpha-project">🚀 Project: ${escapeHtml(goal.alphaXProject)}</p>` : ''}
                </div>
                
                <div class="completion-instructions">
                    <p class="completion-intro">Show us what you accomplished today! All three sections below are required to complete your goal.</p>
                </div>
                
                <div class="proof-tabs">
                    <div class="tab-navigation">
                        <button class="tab-btn active" data-tab="text" onclick="switchProofTab('text')">📝 1. Write What You Did Today</button>
                        <button class="tab-btn" data-tab="screenshot" onclick="switchProofTab('screenshot')">📷 2. Upload Screenshots</button>
                        <button class="tab-btn" data-tab="brainlift" onclick="switchProofTab('brainlift')">🧠 3. Upload Updated Brain Lift</button>
                    </div>
                    
                    <!-- Text Proof Tab (now first) -->
                    <div id="textTab" class="proof-tab active">
                        <h5>📝 Write What You Did Today</h5>
                        <p class="tab-description">Describe your accomplishments and what you completed:</p>
                        <div class="example-box">
                            <strong>Example:</strong> "I completed 15 coding challenges on LeetCode, focusing on array manipulation and sorting algorithms. I solved problems #283, #349, and #26, taking detailed notes on time complexity. I also wrote a 500-word blog post about my learning process and published it on Medium."
                        </div>
                        <textarea id="completionText" rows="6" placeholder="Write about what you accomplished today, what you learned, and how you completed your goal..." class="completion-textarea" required></textarea>
                        <div class="character-count">
                            <span id="textCount">0</span> characters
                        </div>
                        
                        <div id="textPreview" class="content-preview">
                            <h6>Preview</h6>
                            <div class="text-preview-container">
                                <p id="textPreviewContent" class="preview-text">Start writing to see your preview...</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Screenshot Tab (now second) -->
                    <div id="screenshotTab" class="proof-tab hidden">
                        <h5>📷 Upload Screenshots to Prove What You Did Today</h5>
                        <p class="tab-description">Upload images that show your completed work:</p>
                        <div class="example-box">
                            <strong>Examples of good screenshots:</strong> Progress dashboards, completed assignments, code submissions, published content, finished projects, learning progress, certificates earned, or any visual proof of your work.
                        </div>
                        
                        <div class="file-upload-wrapper">
                            <input type="file" id="completionScreenshot" accept="image/*" multiple>
                            <div class="file-upload-display" id="completionDropzone">
                                <div class="file-upload-text">
                                    <span class="upload-icon">📷</span>
                                    <span>Click here or drag & drop your screenshots</span>
                                </div>
                                <div class="file-upload-hint">Support for multiple images - show us your progress!</div>
                            </div>
                            <div class="add-more-images">
                                <button type="button" class="btn-add-more" id="addMoreCompletionImages" onclick="document.getElementById('completionScreenshot').click()">+ Add More Screenshots</button>
                            </div>
                        </div>
                        
                        <div id="screenshotPreview" class="content-preview hidden">
                            <h6>📷 Your Screenshots</h6>
                            <div id="imagePreviewContainer" class="image-preview-grid"></div>
                        </div>
                    </div>
                    
                    <!-- Brain Lift Tab (third) -->
                    <div id="brainliftTab" class="proof-tab hidden">
                        <h5>🧠 Upload Your Updated Brain Lift Content</h5>
                        <p class="tab-description">Paste your current Brain Lift content so we can compare word counts:</p>
                        <div class="example-box">
                            <strong>Important:</strong> This should be your complete, current Brain Lift with all today's additions and updates. We'll compare the word count with your starting Brain Lift to measure your progress.
                        </div>
                        
                        <textarea id="completionBrainLift" rows="8" placeholder="Paste your complete, updated Brain Lift content here..." class="completion-textarea"></textarea>
                        <div class="word-count-info">
                            <div class="word-count-display">
                                <span id="brainliftCompletionWordCount">0 words</span>
                            </div>
                            <div class="starting-word-display">
                                Starting word count: <strong>${goal.startingWordCount || 0} words</strong>
                            </div>
                        </div>
                    </div>
                    
                        </div>
                        
                <div class="completion-requirement">
                    <div class="requirement-box">
                        <p><strong>📝 Ready to Complete Your Goal?</strong></p>
                        <p>Make sure you've completed all three sections above:</p>
                        <ul style="text-align: left; margin-top: 0.5rem;">
                            <li>✍️ Written description of what you did</li>
                            <li>📷 Screenshots of your work</li>
                            <li>🧠 Updated Brain Lift content</li>
                        </ul>
                        </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-success" onclick="confirmCompletion()">
                        🎉 Complete My Goal
                    </button>
                    <button class="btn btn-secondary" onclick="hideCompletionModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    const existingModal = document.getElementById('completionModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Initialize all handlers after modal is added to DOM
    setTimeout(() => {
        initializeCompletionModal();
    }, 50);
}

function handleModalClick(event) {
    // Only close if clicking the modal background, not the content
    if (event.target === event.currentTarget) {
        hideCompletionModal();
    }
}

function hideCompletionModal() {
    const modal = document.getElementById('completionModal');
    if (modal) {
        modal.remove();
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Clear selected images and current goal
    if (window.clearSelectedImages) {
        window.clearSelectedImages();
    }
    currentCompletionGoal = null;
}

function switchProofTab(tabType) {
    console.log('Switching to tab:', tabType);
    
    // Update tab buttons
    const modal = document.getElementById('completionModal');
    if (!modal) return;
    
    modal.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabType) {
            btn.classList.add('active');
        }
    });
    
    // Show/hide tab content
    modal.querySelectorAll('.proof-tab').forEach(tab => {
        tab.classList.add('hidden');
        tab.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`${tabType}Tab`);
    if (activeTab) {
        activeTab.classList.remove('hidden');
        activeTab.classList.add('active');
    }
}

function initializeCompletionModal() {
    console.log('Initializing completion modal handlers');
    
    // Initialize file upload handlers
    handleCompletionFileUpload();
    
    // Initialize character counter and text preview
    const textarea = document.getElementById('completionText');
    const counter = document.getElementById('textCount');
    const textPreview = document.getElementById('textPreviewContent');
    
    console.log('Text elements found:', {textarea, counter, textPreview});
    
    if (textarea && counter) {
        // Add input event listener for character counting and preview
        const handleTextInput = () => {
            const text = textarea.value;
            counter.textContent = text.length;
            console.log('Text length updated:', text.length);
            
            // Update live preview
            if (textPreview) {
                if (text.trim().length > 0) {
                    textPreview.textContent = text;
                    textPreview.classList.remove('empty');
                } else {
                    textPreview.textContent = 'Start writing to see your preview...';
                    textPreview.classList.add('empty');
                }
            }
        };
        
        textarea.addEventListener('input', handleTextInput);
        textarea.addEventListener('keyup', handleTextInput);
        textarea.addEventListener('paste', () => {
            setTimeout(handleTextInput, 10); // Handle paste events
        });
        
        // Trigger initial count and preview
        handleTextInput();
        
        console.log('Text input handlers attached successfully');
    } else {
        console.error('Text elements not found for initialization');
    }
    
    // Initialize Brain Lift word counter
    const brainliftTextarea = document.getElementById('completionBrainLift');
    const brainliftWordCount = document.getElementById('brainliftCompletionWordCount');
    
    if (brainliftTextarea && brainliftWordCount) {
        const handleBrainLiftInput = () => {
            const text = brainliftTextarea.value;
            const wordCount = countWords(text);
            brainliftWordCount.textContent = `${wordCount} words`;
        };
        
        brainliftTextarea.addEventListener('input', handleBrainLiftInput);
        brainliftTextarea.addEventListener('keyup', handleBrainLiftInput);
        brainliftTextarea.addEventListener('paste', () => {
            setTimeout(handleBrainLiftInput, 10);
        });
        
        // Trigger initial count
        handleBrainLiftInput();
        
        console.log('Brain Lift word counter initialized');
    }
}

// Error display function that shows outside modal
function showErrorOutsideModal(message) {
    // Create or update error overlay
    let errorOverlay = document.getElementById('errorOverlay');
    if (!errorOverlay) {
        errorOverlay = document.createElement('div');
        errorOverlay.id = 'errorOverlay';
        errorOverlay.className = 'error-overlay';
        document.body.appendChild(errorOverlay);
    }
    
    errorOverlay.innerHTML = `
        <div class="error-content">
            <div class="error-icon">⚠️</div>
            <div class="error-message">${message}</div>
            <button class="error-close" onclick="hideErrorOverlay()">Got it</button>
        </div>
    `;
    
    errorOverlay.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorOverlay && !errorOverlay.classList.contains('hidden')) {
            hideErrorOverlay();
        }
    }, 5000);
}

function hideErrorOverlay() {
    const errorOverlay = document.getElementById('errorOverlay');
    if (errorOverlay) {
        errorOverlay.classList.add('hidden');
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function confirmCompletion() {
    if (!currentCompletionGoal) {
        console.error('No goal selected for completion');
        return;
    }
    
    const goalId = currentCompletionGoal.id;
    console.log('Confirming completion for goalId:', goalId);
    
    // Check what proof methods are filled
    const screenshotFiles = window.getSelectedImages ? window.getSelectedImages() : [];
    const textProof = document.getElementById('completionText')?.value.trim();
    const brainliftContent = document.getElementById('completionBrainLift')?.value.trim();
    
    // All three sections are required
    if (!textProof || textProof.length === 0) {
        showErrorOutsideModal('Please write what you did today - describe how you completed this goal');
        switchProofTab('text');
        return;
    }
    
    if (!screenshotFiles || screenshotFiles.length === 0) {
        showErrorOutsideModal('Please upload screenshots to prove what you did today - at least one image is required');
        switchProofTab('screenshot');
        return;
    }
    
    if (!brainliftContent || brainliftContent.length === 0) {
        showErrorOutsideModal('Please upload your updated Brain Lift content - we need to compare word counts to verify your progress');
        switchProofTab('brainlift');
        return;
    }
    
    // No minimum character requirement - any text is acceptable
    
    showLoading('Processing proof and completing goal...');
    
    try {
        // Calculate total file size before processing  
        let totalSize = 0;
        for (let i = 0; i < screenshotFiles.length; i++) {
            totalSize += screenshotFiles[i].size;
        }
        
        // Base64 encoding increases size by ~33%, so check if it will exceed limits
        const estimatedBase64Size = totalSize * 1.33;
        const maxPayloadSize = 5 * 1024 * 1024; // 5MB estimated max for Vercel
        
        if (estimatedBase64Size > maxPayloadSize) {
            hideLoading();
            showErrorOutsideModal('Total image size too large. Please use smaller images or fewer images.');
            return;
        }
        
        // Process multiple screenshots to base64
        let screenshotDataArray = [];
        
        for (let i = 0; i < screenshotFiles.length; i++) {
            try {
                const screenshotData = await fileToBase64(screenshotFiles[i]);
                screenshotDataArray.push({
                    data: screenshotData,
                    filename: screenshotFiles[i].name,
                    size: screenshotFiles[i].size
                });
                console.log(`Screenshot ${i+1} processed, size:`, screenshotData.length);
            } catch (error) {
                console.error(`Failed to process screenshot ${i+1}:`, error);
                hideLoading();
                showErrorOutsideModal(`Failed to process image "${screenshotFiles[i].name}". Try a smaller image.`);
                return;
            }
        }
        
        console.log('Sending completion request for goal:', goalId);
        const response = await fetch('/api/complete-goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                goalId, 
                screenshotDataArray,
                textProof,
                brainliftContent
            })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 413) {
                throw new Error('Request too large - please use smaller files');
            }
            throw new Error(`Server error: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned invalid response');
        }
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showToast('Goal completed successfully! 🎉', 'success');
            hideCompletionModal();
            loadGoals();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error completing goal:', error);
        showToast('Failed to complete goal. Please try again.', 'error');
    }
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
    
    // Initialize monitoring after DOM is ready
    setTimeout(() => {
        setupGoalTextMonitoring();
        initializeBrainLiftWordCounter();
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
            
            console.log('Session data received:', { 
                user: data.user, 
                alphaXProject: data.user.alphaXProject,
                hasAlphaX: !!data.user.alphaXProject 
            });
            
            // Check if user needs to set up Alpha X project
            if (!appState.userAlphaXProject || appState.userAlphaXProject.trim() === '') {
                console.log('No Alpha X project found, checking if we can recover from goals...');
                // Try to recover Alpha X project from user's existing goals
                await tryRecoverAlphaXProject();
            } else {
                console.log('Alpha X project exists:', appState.userAlphaXProject);
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

// Toggle goal form visibility
function toggleGoalForm() {
    const goalFormSection = document.querySelector('.goal-form-section');
    if (goalFormSection) {
        goalFormSection.classList.toggle('collapsed');
    }
}

// AI Loading Animation - Wave Bars
function showAILoadingAnimation() {
    // Remove any existing AI loader
    const existingLoader = document.getElementById('aiLoadingAnimation');
    if (existingLoader) {
        existingLoader.remove();
    }
    
    const loader = document.createElement('div');
    loader.id = 'aiLoadingAnimation';
    loader.className = 'ai-loading-overlay';
    loader.innerHTML = `
        <div class="ai-loading-card">
            <div class="wave-bars-container">
                <div class="wave-bar bar-1"></div>
                <div class="wave-bar bar-2"></div>
                <div class="wave-bar bar-3"></div>
                <div class="wave-bar bar-4"></div>
                <div class="wave-bar bar-5"></div>
                <div class="wave-bar bar-6"></div>
                <div class="wave-bar bar-7"></div>
                <div class="wave-bar bar-8"></div>
            </div>
            <div class="ai-loading-text">
                <h3>AI is analyzing your goal...</h3>
                <p class="loading-subtext">This will only take a moment</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(loader);
    
    // Trigger animation
    setTimeout(() => {
        loader.classList.add('active');
    }, 10);
}

function hideAILoadingAnimation() {
    const loader = document.getElementById('aiLoadingAnimation');
    if (loader) {
        loader.classList.add('hiding');
        setTimeout(() => {
            loader.remove();
        }, 400);
    }
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
            
            // Show app directly without Alpha X modal
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
            appState.userAlphaXProject = data.user.alphaXProject;
            showToast('Account created successfully!', 'success');
            
            // Show app directly without Alpha X modal
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
    
    // Clear any completion screenshots from previous sessions
    selectedCompletionScreenshots = [];
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
    
    // Show submit animation
    const validateBtn = document.querySelector('.btn.btn-secondary');
    if (validateBtn) {
        validateBtn.classList.add('ai-submitting');
        setTimeout(() => validateBtn.classList.remove('ai-submitting'), 600);
    }
    
    // Create and show AI loading animation
    showAILoadingAnimation();
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
        hideAILoadingAnimation();
        
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
    
    // Add response animation
    resultsContainer.classList.add('ai-response-animation');
    setTimeout(() => resultsContainer.classList.remove('ai-response-animation'), 800);
    
    // Check if AI has questions
    if (validation.hasQuestions && validation.questions && validation.questions.length > 0) {
        displayAIQuestions(validation.questions);
        return;
    }
    
    const statusClass = validation.isValid ? 'valid' : 'invalid';
    const statusText = validation.isValid ? 'Goal Approved' : 'Needs Improvement';
    
    // Get the current goal text to display
    const currentGoal = document.getElementById('goalInput').value.trim();
    
    const getScoreColor = (score, isAmbition = false) => {
        const threshold = isAmbition ? 4 : 8;
        const maxScore = isAmbition ? 5 : 10;
        if (score >= threshold) return '#10b981';
        if (score >= (maxScore * 0.6)) return '#f59e0b';
        return '#ef4444';
    };
    
    contentContainer.innerHTML = `
        <div class="validation-goal-display">
            <h4>Your Goal:</h4>
            <p class="goal-text">${escapeHtml(currentGoal)}</p>
        </div>
        
        <div class="validation-status-clean ${statusClass}">
            <strong>${statusText}</strong>
            <span class="overall-score">Overall Score: ${validation.overallScore || 0}/10</span>
        </div>
        
        <div class="validation-scores-grid">
            <div class="score-item">
                <div class="score-label">Ambition</div>
                <div class="score-value" style="color: ${getScoreColor(validation.ambitionScore || 0, true)}">
                    ${validation.ambitionScore || 0}/5
                </div>
                <div class="score-requirement">Need 4/5</div>
            </div>
            
            <div class="score-item">
                <div class="score-label">Measurable</div>
                <div class="score-value" style="color: ${getScoreColor(validation.measurableScore || 0)}">
                    ${validation.measurableScore || 0}/10
                </div>
                <div class="score-requirement">Need 8/10</div>
            </div>
            
            <div class="score-item">
                <div class="score-label">Relevance</div>
                <div class="score-value" style="color: ${getScoreColor(validation.relevanceScore || 0)}">
                    ${validation.relevanceScore || 0}/10
                </div>
                <div class="score-requirement">Need 8/10</div>
            </div>
        </div>
        
        <div class="validation-feedback-section">
            <h4>AI Feedback</h4>
            <p>${validation.feedback}</p>
            ${validation.suggestions && validation.suggestions.length > 0 ? `
                <div class="validation-suggestions">
                    <strong>Suggestions:</strong>
                    <ul>
                        ${validation.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
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
    const brainliftContent = getBrainLiftContent();
    const alphaXProject = appState.userAlphaXProject;
    
    // Validate Brain Lift content
    if (!brainliftContent || brainliftContent.trim().length === 0) {
        showToast('Please paste your current Brain Lift content', 'warning');
        return;
    }
    
    showLoading('Calculating Brain Lift word count and submitting your goal...');
    
    try {
    const requestBody = {
        goal,
        brainliftContent,
        alphaXProject,
        // Include AI questions and answers if they exist
        aiQuestions: appState.aiQuestions || null,
        aiAnswers: appState.aiAnswers || null,
        // Include validation data from AI
        validationData: appState.validationResult || null
    };
    
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
            showToast('Goal submitted successfully! Starting word count: ' + (data.brainliftEntry?.wordCount || 0) + ' words', 'success');
            
            // Reset form and validation
            document.getElementById('goalForm').reset();
            document.getElementById('validationResults').classList.add('hidden');
            document.getElementById('submitGoalBtn').disabled = true;
            appState.validationResult = null;
            appState.lastValidatedGoalText = null;
            appState.aiQuestions = null;
            appState.aiAnswers = null;
            
            
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
                ${isToday ? '<div class="today-badge">Today</div>' : ''}
                
                <div class="goal-header-minimal">
                    <div class="goal-status-badge ${goal.status}">
                        ${goal.status === 'completed' ? 'Completed' : goal.status === 'active' ? 'Active' : 'Inactive'}
                    </div>
                </div>
                
                <div class="goal-content-wrapper">
                    <div class="goal-title">
                        ${escapeHtml(goal.goal)}
                    </div>
                    
                    ${goal.validationData ? `
                        <div class="scores-minimal">
                            <span class="score-badge ${goal.validationData.ambitionScore >= 4 ? 'pass' : 'fail'}">
                                Ambition: ${goal.validationData.ambitionScore}/5
                            </span>
                            <span class="score-badge ${goal.validationData.measurableScore >= 8 ? 'pass' : 'fail'}">
                                Measurable: ${goal.validationData.measurableScore}/10
                            </span>
                            <span class="score-badge ${goal.validationData.relevanceScore >= 8 ? 'pass' : 'fail'}">
                                Relevance: ${goal.validationData.relevanceScore}/10
                            </span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="goal-footer-minimal">
                    <div class="goal-meta-minimal">
                        <span class="date-label">Created: ${createdDate}</span>
                        ${completedDate ? `<span class="date-label">Completed: ${completedDate}</span>` : ''}
                    </div>
                    
                    <div class="goal-actions-minimal">
                    ${goal.status === 'active' && canCompleteGoal(goal.createdAt) ? `
                        <button class="btn-edit-minimal" onclick="editUserGoal('${goal.id}')" title="Edit goal">
                            Edit
                        </button>
                        <button class="btn-complete-minimal" onclick="showCompletionModal('${goal.id}')">
                            Complete
                        </button>
                    ` : goal.status === 'active' ? `
                        <div class="deadline-passed">Deadline passed</div>
                    ` : ''}
                    </div>
                </div>
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

// User Goal Editing Functions
let editingUserGoal = null;

function editUserGoal(goalId) {
    console.log('editUserGoal called for goalId:', goalId);
    
    // Find the goal data
    const goal = appState.goals.find(g => g.id === goalId);
    if (!goal) {
        console.error('Goal not found for editing:', goalId);
        showToast('Goal not found', 'error');
        return;
    }
    
    // Check if goal can be edited (today only)
    if (!canCompleteGoal(goal.createdAt)) {
        showToast('Goals can only be edited on the day they were created', 'warning');
        return;
    }
    
    editingUserGoal = goal;
    showUserGoalEditModal(goal);
}

function showUserGoalEditModal(goal) {
    // Create edit modal HTML
    const modalHTML = `
        <div id="userEditModal" class="modal-overlay" onclick="handleUserEditModalClick(event)">
            <div class="modal-content user-edit-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>✏️ Edit Your Goal</h3>
                    <button class="modal-close" onclick="hideUserEditModal()">&times;</button>
                </div>
                
                <div class="edit-instructions">
                    <p>Update your goal text below. Your edited goal will need to pass AI validation again before it's saved.</p>
                </div>
                
                <div class="goal-edit-form">
                    <div class="form-group">
                        <label for="editGoalInput">Your Goal</label>
                        <textarea 
                            id="editGoalInput" 
                            placeholder="Update your goal text..."
                            rows="4"
                            required
                        >${escapeHtml(goal.goal)}</textarea>
                        <div class="form-hint">Be specific and measurable. Goals should require at least 3 hours of work.</div>
                    </div>
                    
                    <div class="alpha-x-display">
                        <label>Alpha X Project</label>
                        <div class="project-display-readonly">
                            <span>${escapeHtml(goal.alphaXProject || appState.userAlphaXProject)}</span>
                        </div>
                    </div>
                    
                    <div class="edit-actions">
                        <button type="button" class="btn btn-secondary" onclick="validateEditedGoal()">
                            <span class="btn-icon">🤖</span>
                            Validate with AI
                        </button>
                        <button type="button" class="btn btn-primary" id="saveEditedGoalBtn" onclick="saveEditedGoal()" disabled>
                            <span class="btn-icon">💾</span>
                            Save Goal
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="hideUserEditModal()">
                            Cancel
                        </button>
                    </div>
                </div>
                
                <!-- Validation Results for Edited Goal -->
                <div id="editValidationResults" class="validation-results hidden">
                    <div class="validation-header">
                        <h3>AI Validation Results</h3>
                    </div>
                    <div id="editValidationContent"></div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    const existingModal = document.getElementById('userEditModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Focus on textarea
    setTimeout(() => {
        const textarea = document.getElementById('editGoalInput');
        if (textarea) {
            textarea.focus();
            textarea.select();
        }
    }, 100);
}

function handleUserEditModalClick(event) {
    // Only close if clicking the modal background, not the content
    if (event.target === event.currentTarget) {
        hideUserEditModal();
    }
}

function hideUserEditModal() {
    const modal = document.getElementById('userEditModal');
    if (modal) {
        modal.remove();
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Reset state
    editingUserGoal = null;
}

async function validateEditedGoal() {
    const goalText = document.getElementById('editGoalInput').value.trim();
    const alphaXProject = appState.userAlphaXProject;
    
    if (!goalText) {
        showToast('Please enter a goal first', 'warning');
        return;
    }
    
    if (!alphaXProject) {
        showToast('Alpha X project is required for validation', 'error');
        return;
    }
    
    showLoading('Validating your edited goal with AI...');
    
    try {
        const response = await fetch('/api/validate-goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                goal: goalText,
                alphaXProject
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            displayEditValidationResults(data.validation);
            
            // Enable save button if goal is valid
            const saveBtn = document.getElementById('saveEditedGoalBtn');
            if (saveBtn) {
                saveBtn.disabled = !data.validation.isValid;
            }
            
            if (data.validation.isValid) {
                showToast('Edited goal validated successfully! You can now save it.', 'success');
            } else {
                showToast('Edited goal needs improvement. Check the validation feedback.', 'warning');
            }
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Validation failed. Please try again.', 'error');
    }
}

function displayEditValidationResults(validation) {
    const resultsContainer = document.getElementById('editValidationResults');
    const contentContainer = document.getElementById('editValidationContent');
    
    if (!resultsContainer || !contentContainer) return;
    
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
    
    // Store validation result for saving
    window.currentEditValidation = validation;
}

async function saveEditedGoal() {
    if (!editingUserGoal || !window.currentEditValidation) {
        showToast('Please validate your goal first', 'warning');
        return;
    }
    
    if (!window.currentEditValidation.isValid) {
        showToast('Goal must pass validation before saving', 'warning');
        return;
    }
    
    const goalText = document.getElementById('editGoalInput').value.trim();
    
    if (!goalText) {
        showToast('Goal text cannot be empty', 'warning');
        return;
    }
    
    showLoading('Saving your updated goal...');
    
    try {
        const response = await fetch('/api/update-goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                goalId: editingUserGoal.id,
                newGoalText: goalText,
                adminName: appState.currentUser.username + ' (self-edit)',
                isUserEdit: true
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showToast('Goal updated successfully! ✅', 'success');
            hideUserEditModal();
            loadGoals(); // Refresh the goals list
        } else {
            if (data.validation && !data.validation.isValid) {
                showToast(`Goal validation failed: ${data.validation.feedback}`, 'error');
            } else {
                showToast(data.error || 'Failed to update goal', 'error');
            }
        }
    } catch (error) {
        hideLoading();
        console.error('Error saving edited goal:', error);
        showToast('Failed to save goal. Please try again.', 'error');
    }
}

// Try to recover Alpha X project from user's existing goals
async function tryRecoverAlphaXProject() {
    try {
        const response = await fetch('/api/goals');
        const data = await response.json();
        
        if (data.success && data.goals && data.goals.length > 0) {
            // Find the most recent goal with an Alpha X project
            const sortedGoals = data.goals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const goalWithAlphaX = sortedGoals.find(goal => goal.alphaXProject);
            
            if (goalWithAlphaX && goalWithAlphaX.alphaXProject) {
                console.log('Found Alpha X project in existing goals:', goalWithAlphaX.alphaXProject);
                // Update user record with recovered Alpha X project
                await updateAlphaXProject(goalWithAlphaX.alphaXProject);
                // Update app state
                appState.userAlphaXProject = goalWithAlphaX.alphaXProject;
                appState.currentUser.alphaXProject = goalWithAlphaX.alphaXProject;
                showApp();
                loadGoals();
                return;
            }
        }
        
        // Show app regardless - no modal needed
        console.log('No Alpha X project found, but showing app anyway');
        showApp();
        loadGoals();
    } catch (error) {
        console.error('Failed to recover Alpha X project:', error);
        // Show app anyway - no modal needed
        showApp();
        loadGoals();
    }
}

// Brain Lift functions are now handled in the upload section above

// Utility function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}