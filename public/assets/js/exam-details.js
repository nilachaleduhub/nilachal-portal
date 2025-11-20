// exam-details.js - Handles exam details management functionality

let examDetailsData = [];
let currentEditingId = null;
let syllabusTableHTML = '';
let cutoffTableHTML = '';
let examPatterns = []; // Array to store pattern HTML for each pattern item

// Media path helpers
function normalizeMediaPath(path) {
    return path ? path.replace(/\\/g, '/') : '';
}

function sanitizeMediaPath(path) {
    if (!path) return '';
    const normalized = normalizeMediaPath(path);
    if (normalized.startsWith('blob:') || normalized.startsWith('data:')) {
        return '';
    }
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        try {
            const url = new URL(normalized);
            if (url.origin === window.location.origin) {
                return url.pathname || '';
            }
            return normalized;
        } catch (err) {
            return normalized;
        }
    }
    return normalized.startsWith('/') ? normalized : '/' + normalized;
}

function buildMediaUrl(path) {
    const sanitized = sanitizeMediaPath(path);
    if (!sanitized) return '';
    if (sanitized.startsWith('http://') || sanitized.startsWith('https://') || sanitized.startsWith('data:') || sanitized.startsWith('blob:')) {
        return sanitized;
    }
    return sanitized.startsWith('/') ? sanitized : '/' + sanitized;
}

function applyExistingImagePreview({ previewEl, imgEl, datasetOwner, rawPath }) {
    if (!previewEl || !imgEl || !datasetOwner) return;
    const sanitizedPath = sanitizeMediaPath(rawPath || '');
    const displayUrl = buildMediaUrl(sanitizedPath);
    if (sanitizedPath && displayUrl) {
        imgEl.src = displayUrl;
        previewEl.style.display = 'block';
        datasetOwner.dataset.imagePath = sanitizedPath;
    } else {
        imgEl.src = '';
        previewEl.style.display = 'none';
        datasetOwner.dataset.imagePath = '';
    }
}

// Helper function to get admin token
function getAdminToken() {
    return localStorage.getItem('adminToken');
}

// Helper function for authenticated fetch calls to admin API
async function adminFetch(url, options = {}) {
    const token = getAdminToken();
    const headers = {
        'X-Admin-Token': token || '',
        ...(options.headers || {})
    };
    
    // Merge headers, but don't override Content-Type if it's set for FormData
    if (options.body instanceof FormData) {
        delete headers['Content-Type']; // Let browser set it for FormData
    } else if (!options.headers || !options.headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    // If unauthorized, clear token and show login
    if (response.status === 401) {
        localStorage.removeItem('adminToken');
        alert('Session expired. Please login again.');
        // Optionally reload to show login modal
        window.location.reload();
        throw new Error('Session expired. Please login again.');
    }
    
    return response;
}

// Initialize exam details functionality
document.addEventListener('DOMContentLoaded', () => {
    const examDetailsBtn = document.getElementById('exam-details-btn');
    const examDetailsSection = document.getElementById('exam-details-section');
    const mainMenuSection = document.getElementById('main-menu-section');
    const backBtn = document.getElementById('back-to-main-from-exam-details-btn');
    const examDetailsContent = document.getElementById('exam-details-content');

    // Load exam details HTML content
    if (examDetailsContent) {
        fetch('exam-details.html')
            .then(res => res.text())
            .then(html => {
                examDetailsContent.innerHTML = html;
                initializeExamDetails();
            })
            .catch(err => {
                console.error('Error loading exam details HTML:', err);
                examDetailsContent.innerHTML = '<div class="error">Error loading exam details form</div>';
            });
    }

    // Show exam details section
    if (examDetailsBtn && !examDetailsBtn.dataset.listenerAttached) {
        examDetailsBtn.dataset.listenerAttached = 'true';
        examDetailsBtn.addEventListener('click', () => {
            if (mainMenuSection) mainMenuSection.style.display = 'none';
            if (examDetailsSection) examDetailsSection.style.display = 'block';
            loadExamDetails();
        });
    }

    // Back button
    if (backBtn && !backBtn.dataset.listenerAttached) {
        backBtn.dataset.listenerAttached = 'true';
        backBtn.addEventListener('click', () => {
            if (examDetailsSection) examDetailsSection.style.display = 'none';
            if (mainMenuSection) mainMenuSection.style.display = 'block';
        });
    }
});

// Initialize exam details form
function initializeExamDetails() {
    const form = document.getElementById('exam-details-form');
    if (!form) return;

    // Form submission
    form.addEventListener('submit', handleExamDetailsSubmit);

    // Image preview handlers
    setupImagePreview('about-exam-image', 'about-exam-image-preview', 'about-exam-image-preview-img');
    setupImagePreview('exam-syllabus-image', 'exam-syllabus-image-preview', 'exam-syllabus-image-preview-img');

    // Link input handlers
    setupLinkInputs();
    
    // Pattern input handlers
    setupPatternInputs();

    // Cutoff items setup
    resetCutoffItemsUI();
}

// Setup image preview
function setupImagePreview(inputId, previewId, imgId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const img = document.getElementById(imgId);

    if (input && preview && img) {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    img.src = event.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Remove image preview
function removeImagePreview(inputId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(inputId + '-preview');
    
    if (input) input.value = '';
    if (preview) preview.style.display = 'none';
}

// Setup link inputs
function setupLinkInputs() {
    const linkItems = document.querySelectorAll('.link-item');
    linkItems.forEach(item => {
        const captionInput = item.querySelector('.link-caption');
        const urlInput = item.querySelector('.link-url');
        
        if (captionInput && urlInput) {
            [captionInput, urlInput].forEach(input => {
                input.addEventListener('input', updateLinksTable);
            });
        }
    });
}

// Add link item
function addLinkItem() {
    const container = document.getElementById('links-container');
    if (!container) return;

    const linkItem = document.createElement('div');
    linkItem.className = 'link-item';
    linkItem.innerHTML = `
        <input type="text" class="link-caption" placeholder="Link Caption" name="link-caption[]">
        <input type="url" class="link-url" placeholder="https://example.com" name="link-url[]">
        <button type="button" class="remove-link-btn" onclick="removeLinkItem(this)">Remove</button>
    `;
    
    container.appendChild(linkItem);
    setupLinkInputs();
    
    // Show remove button on first item if there are multiple
    const allItems = container.querySelectorAll('.link-item');
    if (allItems.length > 1) {
        allItems[0].querySelector('.remove-link-btn').style.display = 'block';
    }
}

// Remove link item
function removeLinkItem(btn) {
    const item = btn.closest('.link-item');
    if (item) {
        item.remove();
        updateLinksTable();
        
        // Hide remove button on first item if only one remains
        const container = document.getElementById('links-container');
        const allItems = container.querySelectorAll('.link-item');
        if (allItems.length === 1) {
            allItems[0].querySelector('.remove-link-btn').style.display = 'none';
        }
    }
}

// Update links table
function updateLinksTable() {
    const container = document.getElementById('links-container');
    const tableContainer = document.getElementById('links-table-container');
    const tableBody = document.querySelector('#links-table tbody');
    
    if (!container || !tableContainer || !tableBody) return;

    const links = [];
    const linkItems = container.querySelectorAll('.link-item');
    
    linkItems.forEach(item => {
        const caption = item.querySelector('.link-caption')?.value.trim();
        const url = item.querySelector('.link-url')?.value.trim();
        
        if (caption && url) {
            links.push({ caption, url });
        }
    });

    if (links.length > 0) {
        tableContainer.style.display = 'block';
        tableBody.innerHTML = '';
        
        links.forEach((link, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(link.caption)}</td>
                <td><a href="${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.url)}</a></td>
                <td><button type="button" class="btn-small" onclick="removeLinkFromTable(${index})">Remove</button></td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableContainer.style.display = 'none';
    }
}

// Remove link from table (for display purposes)
function removeLinkFromTable(index) {
    const container = document.getElementById('links-container');
    const items = container.querySelectorAll('.link-item');
    if (items[index]) {
        items[index].remove();
        updateLinksTable();
    }
}

// Setup pattern inputs
function setupPatternInputs() {
    const patternItems = document.querySelectorAll('.pattern-item');
    patternItems.forEach((item, index) => {
        const typeRadios = item.querySelectorAll('input[name^="pattern-type-"]');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                handlePatternTypeChange(item, e.target.value);
            });
        });
        
        // Setup image preview for pattern images
        const imageInput = item.querySelector('.pattern-image');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                handlePatternImageChange(item, e.target.files[0]);
            });
        }
    });
}

// Handle pattern type change
function handlePatternTypeChange(patternItem, type) {
    const textContent = patternItem.querySelector('.pattern-text-content');
    const pictureContent = patternItem.querySelector('.pattern-picture-content');
    const tableContent = patternItem.querySelector('.pattern-table-content');
    
    // Hide all content
    [textContent, pictureContent, tableContent].forEach(content => {
        if (content) content.style.display = 'none';
    });
    
    // Show selected content
    if (type === 'text' && textContent) {
        textContent.style.display = 'block';
    } else if (type === 'picture' && pictureContent) {
        pictureContent.style.display = 'block';
    } else if (type === 'table' && tableContent) {
        tableContent.style.display = 'block';
    }
}

// Handle pattern image change
function handlePatternImageChange(patternItem, file) {
    if (!file) return;
    
    const preview = patternItem.querySelector('.pattern-image-preview');
    const previewImg = patternItem.querySelector('.pattern-image-preview-img');
    
    if (preview && previewImg) {
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Add pattern item
function addPatternItem() {
    const container = document.getElementById('exam-pattern-container');
    if (!container) return;
    
    const patternItems = container.querySelectorAll('.pattern-item');
    const newIndex = patternItems.length;
    
    const patternItem = document.createElement('div');
    patternItem.className = 'pattern-item';
    patternItem.innerHTML = `
        <input type="text" class="pattern-caption" placeholder="Pattern Caption (e.g., Exam Duration, Total Marks)" name="pattern-caption[]">
        <div class="pattern-content-options">
            <label><input type="radio" name="pattern-type-${newIndex}" value="text" checked> Text</label>
            <label><input type="radio" name="pattern-type-${newIndex}" value="picture"> Picture</label>
            <label><input type="radio" name="pattern-type-${newIndex}" value="table"> Table</label>
        </div>
        <div class="pattern-content pattern-text-content">
            <textarea class="pattern-text" placeholder="Enter pattern details" rows="4" name="pattern-text[]"></textarea>
        </div>
        <div class="pattern-content pattern-picture-content" style="display: none;">
            <input type="file" class="pattern-image" accept="image/*" name="pattern-image[]">
            <div class="pattern-image-preview" style="display: none;">
                <img class="pattern-image-preview-img" src="" alt="Preview">
                <button type="button" class="remove-image-btn" onclick="removePatternImagePreview(this)">Remove</button>
            </div>
        </div>
        <div class="pattern-content pattern-table-content" style="display: none;">
            <div class="pattern-table-editor">
                <div class="table-editor-controls">
                    <input type="number" class="pattern-table-rows" placeholder="Rows" min="1" value="3" style="width: 100px;">
                    <input type="number" class="pattern-table-cols" placeholder="Columns" min="1" value="3" style="width: 100px;">
                    <button type="button" class="btn-secondary" onclick="generatePatternTable(this)">Generate Table</button>
                    <button type="button" class="btn-secondary" onclick="cancelPatternTable(this)">Cancel</button>
                </div>
                <div class="pattern-table-preview" style="margin-top: 15px; overflow-x: auto;"></div>
            </div>
        </div>
        <button type="button" class="remove-pattern-btn" onclick="removePatternItem(this)">Remove</button>
    `;
    
    container.appendChild(patternItem);
    setupPatternInputs();
    
    // Show remove button on first item if there are multiple
    const allItems = container.querySelectorAll('.pattern-item');
    if (allItems.length > 1) {
        allItems[0].querySelector('.remove-pattern-btn').style.display = 'block';
    }
}

// Remove pattern item
function removePatternItem(btn) {
    const item = btn.closest('.pattern-item');
    if (item) {
        item.remove();
        
        // Hide remove button on first item if only one remains
        const container = document.getElementById('exam-pattern-container');
        const allItems = container.querySelectorAll('.pattern-item');
        if (allItems.length === 1) {
            allItems[0].querySelector('.remove-pattern-btn').style.display = 'none';
        }
    }
}

// Remove pattern image preview
function removePatternImagePreview(btn) {
    const preview = btn.closest('.pattern-image-preview');
    const patternItem = btn.closest('.pattern-item');
    const imageInput = patternItem.querySelector('.pattern-image');
    
    if (preview) preview.style.display = 'none';
    if (imageInput) imageInput.value = '';
}

// Generate pattern table
function generatePatternTable(btn) {
    const patternItem = btn.closest('.pattern-item');
    const rowsInput = patternItem.querySelector('.pattern-table-rows');
    const colsInput = patternItem.querySelector('.pattern-table-cols');
    const preview = patternItem.querySelector('.pattern-table-preview');
    
    if (!rowsInput || !colsInput || !preview) return;
    
    const rows = parseInt(rowsInput.value || 3);
    const cols = parseInt(colsInput.value || 3);
    
    let tableHTML = '<table class="editable-table pattern-table"><thead><tr>';
    for (let i = 0; i < cols; i++) {
        tableHTML += `<th contenteditable="true">Header ${i + 1}</th>`;
    }
    tableHTML += '</tr></thead><tbody>';
    
    for (let i = 0; i < rows; i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < cols; j++) {
            tableHTML += `<td contenteditable="true">Cell ${i + 1}-${j + 1}</td>`;
        }
        tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table>';
    
    preview.innerHTML = tableHTML;
    
    // Store initial table HTML immediately
    patternItem.dataset.tableHtml = preview.innerHTML;
    
    // Capture table changes on input, blur, and focusout
    const table = preview.querySelector('.pattern-table');
    if (table) {
        const updateTableHtml = () => {
            patternItem.dataset.tableHtml = preview.innerHTML;
        };
        
        table.addEventListener('input', updateTableHtml);
        table.addEventListener('blur', updateTableHtml, true); // Use capture phase
        table.addEventListener('focusout', updateTableHtml);
        
        // Also capture when any cell loses focus
        const cells = table.querySelectorAll('th, td');
        cells.forEach(cell => {
            cell.addEventListener('blur', updateTableHtml);
        });
    }
}

// Cancel pattern table
function cancelPatternTable(btn) {
    const patternItem = btn.closest('.pattern-item');
    const preview = patternItem.querySelector('.pattern-table-preview');
    if (preview) {
        preview.innerHTML = '';
        patternItem.dataset.tableHtml = '';
    }
}

// Cutoff items helpers
function resetCutoffItemsUI(items = []) {
    const container = document.getElementById('cutoff-items-container');
    if (!container) return;
    container.innerHTML = '';
    if (Array.isArray(items) && items.length > 0) {
        items.forEach(item => addCutoffItem(item));
    } else {
        addCutoffItem();
    }
    ensureCutoffRemoveButtons();
}

function addCutoffItem(data = {}) {
    const container = document.getElementById('cutoff-items-container');
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'cutoff-item';
    const storedPath = sanitizeMediaPath(data.imagePath || '');
    item.dataset.imagePath = storedPath;
    item.innerHTML = `
        <input type="text" class="cutoff-caption" placeholder="Cut Off Caption">
        <input type="file" class="cutoff-image" accept="image/*">
        <small class="cutoff-helper-text">Upload cut off as an image</small>
        <div class="cutoff-entry-image-preview image-preview" style="display: none;">
            <img class="cutoff-entry-image-preview-img" src="" alt="Preview">
            <button type="button" class="remove-image-btn" onclick="removeCutoffImagePreview(this)">Remove</button>
        </div>
        <button type="button" class="remove-cutoff-btn" onclick="removeCutoffItem(this)" style="display: none;">Remove</button>
    `;

    container.appendChild(item);

    const captionInput = item.querySelector('.cutoff-caption');
    if (captionInput && data.caption) {
        captionInput.value = data.caption;
    }

    const imageInput = item.querySelector('.cutoff-image');
    if (imageInput) {
        imageInput.addEventListener('change', (e) => handleCutoffImageChange(item, e.target.files[0]));
    }

    const preview = item.querySelector('.cutoff-entry-image-preview');
    const img = item.querySelector('.cutoff-entry-image-preview-img');
    if (preview && img) {
        applyExistingImagePreview({
            previewEl: preview,
            imgEl: img,
            datasetOwner: item,
            rawPath: storedPath
        });
    }

    ensureCutoffRemoveButtons();
}

function handleCutoffImageChange(item, file) {
    if (!item || !file) return;
    const preview = item.querySelector('.cutoff-entry-image-preview');
    const img = item.querySelector('.cutoff-entry-image-preview-img');

    if (preview && img) {
        const reader = new FileReader();
        reader.onload = (event) => {
            img.src = event.target.result;
            preview.style.display = 'block';
            item.dataset.imagePath = '';
        };
        reader.readAsDataURL(file);
    }
}

function removeCutoffImagePreview(btn) {
    const preview = btn.closest('.cutoff-entry-image-preview');
    const item = btn.closest('.cutoff-item');
    const imageInput = item?.querySelector('.cutoff-image');

    if (imageInput) {
        imageInput.value = '';
    }
    if (item) {
        item.dataset.imagePath = '';
    }
    if (preview) {
        preview.style.display = 'none';
    }
}

function removeCutoffItem(btn) {
    const item = btn.closest('.cutoff-item');
    const container = item?.parentElement;
    if (!item || !container) return;

    item.remove();
    if (container.children.length === 0) {
        addCutoffItem();
    }
    ensureCutoffRemoveButtons();
}

function ensureCutoffRemoveButtons() {
    const container = document.getElementById('cutoff-items-container');
    if (!container) return;
    const items = container.querySelectorAll('.cutoff-item');
    items.forEach(item => {
        const removeBtn = item.querySelector('.remove-cutoff-btn');
        if (removeBtn) {
            removeBtn.style.display = items.length > 1 ? 'block' : 'none';
        }
    });
}

function loadCutoffItemsFromExam(exam) {
    const items = Array.isArray(exam.cutoffs) && exam.cutoffs.length > 0
        ? exam.cutoffs
        : (exam.cutoffImagePath ? [{ caption: '', imagePath: exam.cutoffImagePath }] : []);
    resetCutoffItemsUI(items.map(item => ({
        caption: item?.caption || '',
        imagePath: sanitizeMediaPath(item?.imagePath || '')
    })));
}

function getCutoffItemsData() {
    const items = [];
    const cutoffItems = document.querySelectorAll('.cutoff-item');
    cutoffItems.forEach(item => {
        const caption = item.querySelector('.cutoff-caption')?.value.trim() || '';
        const imageInput = item.querySelector('.cutoff-image');
        const imageFile = imageInput?.files[0] || null;
        const imagePath = sanitizeMediaPath(item.dataset.imagePath || '');

        if (caption || imageFile || imagePath) {
            items.push({
                caption,
                imageFile,
                imagePath
            });
        }
    });
    return items;
}

// Get patterns data
function getPatternsData() {
    const patterns = [];
    const patternItems = document.querySelectorAll('.pattern-item');
    
    patternItems.forEach((item, index) => {
        const caption = item.querySelector('.pattern-caption')?.value.trim();
        const typeRadio = item.querySelector('input[name^="pattern-type-"]:checked');
        const type = typeRadio ? typeRadio.value : 'text';
        
        if (!caption) return; // Skip if no caption
        
        const pattern = {
            caption: caption,
            type: type
        };
        
        if (type === 'text') {
            const text = item.querySelector('.pattern-text')?.value.trim() || '';
            pattern.text = text;
            console.log('Pattern text captured:', { caption: pattern.caption, text: text.substring(0, 50) });
        } else if (type === 'picture') {
            const imageFile = item.querySelector('.pattern-image')?.files[0];
            if (imageFile) {
                pattern.imageFile = imageFile;
                console.log('Pattern picture file found:', imageFile.name);
            }
            // Always check for existing image path (when editing or when no new file uploaded)
            // First check if there's a stored image path in dataset
            if (item.dataset.imagePath) {
                pattern.imagePath = sanitizeMediaPath(item.dataset.imagePath);
                console.log('Pattern picture path from dataset:', pattern.imagePath);
            } else {
                // Fallback to checking preview image src
                const previewImg = item.querySelector('.pattern-image-preview-img');
                if (previewImg && previewImg.src && !previewImg.src.startsWith('data:') && !previewImg.src.startsWith('blob:')) {
                    pattern.imagePath = sanitizeMediaPath(previewImg.src);
                    console.log('Pattern picture path from preview:', pattern.imagePath);
                }
            }
            // Ensure imagePath is included even if no new file is uploaded
            if (!pattern.imagePath && !pattern.imageFile) {
                console.warn('Pattern picture has no image file or path for caption:', pattern.caption);
            }
        } else if (type === 'table') {
            const tablePreview = item.querySelector('.pattern-table-preview');
            let tableHtml = '';
            
            // First, try to get the latest HTML from the preview (most up-to-date)
            if (tablePreview && tablePreview.innerHTML.trim()) {
                tableHtml = tablePreview.innerHTML;
                // Also update dataset to keep it in sync
                item.dataset.tableHtml = tableHtml;
                console.log('Pattern table HTML from preview:', tableHtml.substring(0, 100));
            } else if (item.dataset.tableHtml) {
                // Fallback to dataset if preview is empty
                tableHtml = item.dataset.tableHtml;
                console.log('Pattern table HTML from dataset:', tableHtml.substring(0, 100));
            }
            
            if (tableHtml) {
                pattern.table = tableHtml;
                console.log('Pattern table captured:', { caption: pattern.caption, tableLength: tableHtml.length });
            } else {
                console.warn('Pattern table has no table HTML for caption:', pattern.caption);
            }
        }
        
        // Always push pattern if it has a caption, even if content is empty
        if (pattern.caption) {
            patterns.push(pattern);
            console.log('Pattern added to array:', { caption: pattern.caption, type: pattern.type });
        } else {
            console.warn('Pattern skipped - no caption');
        }
    });
    
    return patterns;
}

// Add syllabus table
function addSyllabusTable() {
    const editor = document.getElementById('syllabus-table-editor');
    if (editor) {
        editor.style.display = 'block';
    }
}

// Generate syllabus table
function generateSyllabusTable() {
    const rows = parseInt(document.getElementById('syllabus-table-rows')?.value || 3);
    const cols = parseInt(document.getElementById('syllabus-table-cols')?.value || 3);
    const preview = document.getElementById('syllabus-table-preview');
    
    if (!preview) return;

    let tableHTML = '<table class="editable-table" id="syllabus-table"><thead><tr>';
    for (let i = 0; i < cols; i++) {
        tableHTML += `<th contenteditable="true">Header ${i + 1}</th>`;
    }
    tableHTML += '</tr></thead><tbody>';
    
    for (let i = 0; i < rows; i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < cols; j++) {
            tableHTML += `<td contenteditable="true">Cell ${i + 1}-${j + 1}</td>`;
        }
        tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table>';
    
    preview.innerHTML = tableHTML;
    
    // Add event listeners to capture table changes
    const table = preview.querySelector('#syllabus-table');
    if (table) {
        table.addEventListener('input', () => {
            syllabusTableHTML = preview.innerHTML;
        });
        table.addEventListener('blur', () => {
            syllabusTableHTML = preview.innerHTML;
        });
    }
    
    syllabusTableHTML = preview.innerHTML;
}

// Cancel syllabus table
function cancelSyllabusTable() {
    const editor = document.getElementById('syllabus-table-editor');
    const preview = document.getElementById('syllabus-table-preview');
    if (editor) editor.style.display = 'none';
    if (preview) preview.innerHTML = '';
    syllabusTableHTML = '';
}

// Add cutoff table
function addCutoffTable() {
    const editor = document.getElementById('cutoff-table-editor');
    if (editor) {
        editor.style.display = 'block';
    }
}

// Generate cutoff table
function generateCutoffTable() {
    const rows = parseInt(document.getElementById('cutoff-table-rows')?.value || 3);
    const cols = parseInt(document.getElementById('cutoff-table-cols')?.value || 3);
    const preview = document.getElementById('cutoff-table-preview');
    
    if (!preview) return;

    let tableHTML = '<table class="editable-table" id="cutoff-table"><thead><tr>';
    for (let i = 0; i < cols; i++) {
        tableHTML += `<th contenteditable="true">Header ${i + 1}</th>`;
    }
    tableHTML += '</tr></thead><tbody>';
    
    for (let i = 0; i < rows; i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < cols; j++) {
            tableHTML += `<td contenteditable="true">Cell ${i + 1}-${j + 1}</td>`;
        }
        tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table>';
    
    preview.innerHTML = tableHTML;
    
    // Add event listeners to capture table changes
    const table = preview.querySelector('#cutoff-table');
    if (table) {
        table.addEventListener('input', () => {
            cutoffTableHTML = preview.innerHTML;
        });
        table.addEventListener('blur', () => {
            cutoffTableHTML = preview.innerHTML;
        });
    }
    
    cutoffTableHTML = preview.innerHTML;
}

// Cancel cutoff table
function cancelCutoffTable() {
    const editor = document.getElementById('cutoff-table-editor');
    const preview = document.getElementById('cutoff-table-preview');
    if (editor) editor.style.display = 'none';
    if (preview) preview.innerHTML = '';
    cutoffTableHTML = '';
}

// Handle form submission
async function handleExamDetailsSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    
    // Get form values - try multiple methods to ensure we get the value
    const examNamedetailsInput = document.getElementById('exam-name-details');
    let examNamedetails = '';
    
    if (examNamedetailsInput) {
        examNamedetails = examNamedetailsInput.value ? examNamedetailsInput.value.trim() : '';
        console.log('Exam name from input element (raw):', examNamedetailsInput.value);
        console.log('Exam name from input element (trimmed):', examNamedetails);
    }
    
    // Fallback: try to get from form data if input element method didn't work
    if (!examNamedetails || examNamedetails.length === 0) {
        const formDataCheck = new FormData(form);
        const examNamedetailsFromForm = formDataCheck.get('exam-name-details');
        if (examNamedetailsFromForm) {
            examNamedetails = examNamedetailsFromForm.trim();
            console.log('Exam name from FormData:', examNamedetails);
        }
    }
    
    // Final validation
    if (!examNamedetails || examNamedetails.length === 0) {
        alert('Please enter an exam name');
        if (examNamedetailsInput) {
            examNamedetailsInput.focus();
        }
        return;
    }
    
    console.log('Final exam name being used:', examNamedetails);
    
    const examDetails = {
        examNamedetails: examNamedetails,
        aboutExamText: document.getElementById('about-exam-text')?.value.trim() || '',
        aboutExamImage: document.getElementById('about-exam-image')?.files[0] || null,
        examSyllabusText: document.getElementById('exam-syllabus-text')?.value.trim() || '',
        examSyllabusImage: document.getElementById('exam-syllabus-image')?.files[0] || null,
        links: getLinksData(),
        patterns: getPatternsData(),
        cutoffItems: getCutoffItemsData(),
        syllabusTable: syllabusTableHTML,
        cutoffTable: cutoffTableHTML
    };

    // Capture current table HTML before submission
    const syllabusPreview = document.getElementById('syllabus-table-preview');
    const cutoffPreview = document.getElementById('cutoff-table-preview');
    if (syllabusPreview && syllabusPreview.innerHTML.trim()) {
        syllabusTableHTML = syllabusPreview.innerHTML;
    }
    if (cutoffPreview && cutoffPreview.innerHTML.trim()) {
        cutoffTableHTML = cutoffPreview.innerHTML;
    }
    
    examDetails.syllabusTable = syllabusTableHTML;
    examDetails.cutoffTable = cutoffTableHTML;

    // Capture pattern table HTML right before submission
    const patternItems = document.querySelectorAll('.pattern-item');
    patternItems.forEach((item) => {
        const typeRadio = item.querySelector('input[name^="pattern-type-"]:checked');
        if (typeRadio && typeRadio.value === 'table') {
            const tablePreview = item.querySelector('.pattern-table-preview');
            if (tablePreview && tablePreview.innerHTML.trim()) {
                item.dataset.tableHtml = tablePreview.innerHTML;
            }
        }
    });
    
    // Re-get patterns data after capturing latest table HTML
    examDetails.patterns = getPatternsData();
    
    // Ensure patterns is always an array
    if (!Array.isArray(examDetails.patterns)) {
        examDetails.patterns = [];
    }
    
    console.log('Final patterns before submission:', JSON.stringify(examDetails.patterns, null, 2));
    console.log('Final patterns count:', examDetails.patterns.length);
    
    // Validate patterns have required data
    examDetails.patterns.forEach((pattern, index) => {
        if (!pattern.caption) {
            console.warn(`Pattern at index ${index} has no caption, skipping`);
        }
        if (pattern.type === 'text' && !pattern.text) {
            console.warn(`Pattern "${pattern.caption}" (text type) has no text content`);
        }
        if (pattern.type === 'picture' && !pattern.imagePath && !pattern.imageFile) {
            console.warn(`Pattern "${pattern.caption}" (picture type) has no image path or file`);
        }
        if (pattern.type === 'table' && !pattern.table) {
            console.warn(`Pattern "${pattern.caption}" (table type) has no table HTML`);
        }
    });

    // Build FormData for file uploads
    const submitData = new FormData();
    submitData.append('examNamedetails', examDetails.examNamedetails);
    submitData.append('aboutExamText', examDetails.aboutExamText || '');
    submitData.append('examSyllabusText', examDetails.examSyllabusText || '');
    submitData.append('links', JSON.stringify(examDetails.links));
    
    // Add patterns data (without files first, then add files separately)
    const patternsForJson = examDetails.patterns.map((p, index) => {
        const patternData = {
            caption: p.caption || '',
            type: p.type || 'text'
        };
        if (p.type === 'text') {
            patternData.text = p.text || '';
        } else if (p.type === 'picture') {
            // Always include imagePath if it exists (for existing images)
            if (p.imagePath) {
                patternData.imagePath = p.imagePath;
            }
            // Note: imageFile will be added separately as FormData file
        } else if (p.type === 'table') {
            patternData.table = p.table || '';
        }
        console.log(`Pattern ${index} data:`, patternData);
        return patternData;
    });
    
    // Debug: Log patterns being sent
    console.log('Patterns being sent (JSON):', JSON.stringify(patternsForJson, null, 2));
    console.log('Patterns count:', patternsForJson.length);
    
    // Always send patterns, even if empty array
    submitData.append('patterns', JSON.stringify(patternsForJson));
    
    // Add pattern image files
    examDetails.patterns.forEach((pattern, index) => {
        if (pattern.type === 'picture' && pattern.imageFile) {
            submitData.append(`patternImage_${index}`, pattern.imageFile);
        }
    });
    
    const cutoffItemsForJson = examDetails.cutoffItems.map((item, index) => {
        const payload = {
            caption: item.caption || '',
            imagePath: item.imagePath || ''
        };
        console.log(`Cutoff item ${index} data:`, payload);
        return payload;
    });
    submitData.append('cutoffs', JSON.stringify(cutoffItemsForJson));

    examDetails.cutoffItems.forEach((item, index) => {
        if (item.imageFile) {
            submitData.append(`cutoffImage_${index}`, item.imageFile);
        }
    });

    submitData.append('syllabusTable', examDetails.syllabusTable);
    submitData.append('cutoffTable', examDetails.cutoffTable);
    
    // Debug: Log examNamedetails being sent
    console.log('Sending examNamedetails:', examDetails.examNamedetails);
    
    if (examDetails.aboutExamImage) {
        submitData.append('aboutExamImage', examDetails.aboutExamImage);
    }
    if (examDetails.examSyllabusImage) {
        submitData.append('examSyllabusImage', examDetails.examSyllabusImage);
    }
    
    if (currentEditingId) {
        submitData.append('id', currentEditingId);
    }

    try {
        const response = await adminFetch('/api/admin/exam-details', {
            method: 'POST',
            body: submitData
        });

        const result = await response.json();
        
        if (result.success) {
            const successMessage = currentEditingId ? 'Exam details updated successfully!' : 'Exam details saved successfully!';
            alert(successMessage);
            resetExamDetailsForm();
            loadExamDetails();
        } else {
            alert('Error: ' + (result.message || 'Failed to save exam details'));
        }
    } catch (error) {
        console.error('Error saving exam details:', error);
        alert('Error saving exam details. Please try again.');
    }
}

// Get links data
function getLinksData() {
    const links = [];
    const linkItems = document.querySelectorAll('.link-item');
    
    linkItems.forEach(item => {
        const caption = item.querySelector('.link-caption')?.value.trim();
        const url = item.querySelector('.link-url')?.value.trim();
        
        if (caption && url) {
            links.push({ caption, url });
        }
    });
    
    return links;
}

// Load exam details
async function loadExamDetails() {
    const listContainer = document.getElementById('exam-details-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="loading-message">Loading exam details...</div>';

    try {
        const response = await adminFetch('/api/admin/exam-details');
        const result = await response.json();

        if (result.success && Array.isArray(result.examDetails)) {
            examDetailsData = result.examDetails;
            displayExamDetailsList(examDetailsData);
        } else {
            listContainer.innerHTML = '<div class="error">No exam details found</div>';
        }
    } catch (error) {
        console.error('Error loading exam details:', error);
        listContainer.innerHTML = '<div class="error">Error loading exam details</div>';
    }
}

// Display exam details list
function displayExamDetailsList(exams) {
    const listContainer = document.getElementById('exam-details-list');
    if (!listContainer) return;

    if (exams.length === 0) {
        listContainer.innerHTML = '<div class="empty-message">No exam details added yet</div>';
        return;
    }

    let html = '<div class="exam-details-grid">';
    
    exams.forEach(exam => {
        // Use id field if available, otherwise use _id
        const examId = exam.id || exam._id;
        const examNamedetailsDisplay = exam.examNamedetails || 'Unnamed Exam';
        html += `
            <div class="exam-details-card">
                <h4>${escapeHtml(examNamedetailsDisplay)}</h4>
                <div class="exam-details-actions">
                    <button class="btn-edit" onclick="editExamDetails('${examId}')">Edit</button>
                    <button class="btn-delete" onclick="deleteExamDetails('${examId}')">Delete</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    listContainer.innerHTML = html;
}


// Edit exam details
async function editExamDetails(id) {
    console.log('=== EDIT EXAM DETAILS START ===');
    console.log('editExamDetails called with id:', id, 'type:', typeof id);
    console.log('examDetailsData length:', examDetailsData.length);
    console.log('examDetailsData sample:', examDetailsData.length > 0 ? JSON.stringify(examDetailsData[0], null, 2) : 'empty');
    
    // Convert id to string for comparison
    const idStr = String(id);
    console.log('Looking for exam with id string:', idStr);
    
    // Find the exam - log each comparison
    let exam = null;
    for (let i = 0; i < examDetailsData.length; i++) {
        const e = examDetailsData[i];
        const examId = e.id ? String(e.id) : (e._id ? String(e._id) : null);
        const logName = e.examNamedetails;
        console.log(`Exam ${i}: id=${e.id}, _id=${e._id}, examId=${examId}, examNamedetails=${logName}, match=${examId === idStr}`);
        if (examId === idStr) {
            exam = e;
            console.log('FOUND MATCHING EXAM:', JSON.stringify(exam, null, 2));
            break;
        }
    }
    
    if (!exam) {
        console.error('Exam not found for id:', id);
        console.error('Available exams:', examDetailsData.map(e => ({ id: e.id, _id: e._id, examNamedetails: e.examNamedetails })));
        alert('Exam not found. Please refresh the page and try again.');
        return;
    }

    // Fetch full exam details from server to ensure media data is present
    try {
        const detailResponse = await adminFetch(`/api/admin/exam-details/${idStr}`);
        const detailResult = await detailResponse.json();
        if (detailResult.success && detailResult.examDetail) {
            exam = detailResult.examDetail;
        } else {
            console.warn('Could not fetch detailed exam record for id:', idStr, detailResult.message);
        }
    } catch (detailErr) {
        console.warn('Error fetching detailed exam record:', detailErr);
    }

    // Use the id field (not _id) for server lookup - prioritize id field
    // If exam has id field, use it; otherwise use _id (server will handle both)
    // Convert to string to ensure consistency
    currentEditingId = String(exam.id || exam._id);
    
    console.log('Current editing ID:', currentEditingId);
    console.log('Exam object examNamedetails field:', exam.examNamedetails);
    console.log('Exam object keys:', Object.keys(exam));
    console.log('Full exam object:', JSON.stringify(exam, null, 2));
    
    // If exam name is missing, try to fetch from server
    if (!exam.examNamedetails) {
        console.log('WARNING: Exam name missing in local data, fetching from server...');
        try {
            const fetchResponse = await adminFetch(`/api/admin/exam-details`);
            const fetchResult = await fetchResponse.json();
            if (fetchResult.success && Array.isArray(fetchResult.examDetails)) {
                const serverExam = fetchResult.examDetails.find(e => {
                    const eId = e.id ? String(e.id) : (e._id ? String(e._id) : null);
                    return eId === idStr;
                });
                if (serverExam) {
                    console.log('Server exam found:', JSON.stringify(serverExam, null, 2));
                    if (serverExam.examNamedetails) {
                        exam.examNamedetails = serverExam.examNamedetails;
                        console.log('Fetched exam name from server:', exam.examNamedetails);
                    } else {
                        console.error('Server exam also missing examNamedetails!');
                    }
                } else {
                    console.error('Server exam not found for id:', idStr);
                }
            }
        } catch (fetchErr) {
            console.warn('Could not fetch exam from server:', fetchErr);
        }
    } else {
        console.log('Exam name found in local data:', exam.examNamedetails);
    }

    // START SIMPLIFIED EXAM NAME SETTING
    const examNamedetailsInput = document.getElementById('exam-name-details');
    const examNameToSet = exam.examNamedetails || exam.exam_name || exam.name || '';

    if (examNamedetailsInput) {
        // Set the value directly
        examNamedetailsInput.value = examNameToSet;
        examNamedetailsInput.defaultValue = examNameToSet;

        // Trigger events to ensure form recognizes the change
        examNamedetailsInput.dispatchEvent(new Event('input', { bubbles: true }));
        examNamedetailsInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('SIMPLIFIED: Exam name set to:', examNamedetailsInput.value);
    } else {
        console.error('SIMPLIFIED: Exam Name Input element not found!');
    }
    // END SIMPLIFIED EXAM NAME SETTING

    const aboutExamTextInput = document.getElementById('about-exam-text');
    if (aboutExamTextInput) {
        aboutExamTextInput.value = exam.aboutExamText || '';
    }
    
    const examSyllabusTextInput = document.getElementById('exam-syllabus-text');
    if (examSyllabusTextInput) {
        examSyllabusTextInput.value = exam.examSyllabusText || '';
    }

    // Load images if available
    if (exam.aboutExamImagePath) {
        const img = document.getElementById('about-exam-image-preview-img');
        const preview = document.getElementById('about-exam-image-preview');
        if (img && preview) {
            img.src = exam.aboutExamImagePath;
            preview.style.display = 'block';
        }
    }
    if (exam.examSyllabusImagePath) {
        const img = document.getElementById('exam-syllabus-image-preview-img');
        const preview = document.getElementById('exam-syllabus-image-preview');
        if (img && preview) {
            img.src = exam.examSyllabusImagePath;
            preview.style.display = 'block';
        }
    }
    loadCutoffItemsFromExam(exam);

    // Load links
    if (exam.links && Array.isArray(exam.links) && exam.links.length > 0) {
        const container = document.getElementById('links-container');
        if (container) {
            container.innerHTML = '';
            exam.links.forEach(link => {
                addLinkItem();
                const items = container.querySelectorAll('.link-item');
                const lastItem = items[items.length - 1];
                const captionInput = lastItem.querySelector('.link-caption');
                const urlInput = lastItem.querySelector('.link-url');
                if (captionInput) captionInput.value = link.caption || '';
                if (urlInput) urlInput.value = link.url || '';
            });
            updateLinksTable();
        }
    } else {
        // Reset to default if no links
        const container = document.getElementById('links-container');
        if (container) {
            container.innerHTML = `
                <div class="link-item">
                    <input type="text" class="link-caption" placeholder="Link Caption" name="link-caption[]">
                    <input type="url" class="link-url" placeholder="https://example.com" name="link-url[]">
                    <button type="button" class="remove-link-btn" onclick="removeLinkItem(this)" style="display: none;">Remove</button>
                </div>
            `;
            setupLinkInputs();
        }
    }

    // Load patterns
    if (exam.patterns && Array.isArray(exam.patterns) && exam.patterns.length > 0) {
        const container = document.getElementById('exam-pattern-container');
        if (container) {
            container.innerHTML = '';
            exam.patterns.forEach((pattern, index) => {
                addPatternItem();
                const items = container.querySelectorAll('.pattern-item');
                const lastItem = items[items.length - 1];
                
                // Set caption
                const captionInput = lastItem.querySelector('.pattern-caption');
                if (captionInput) {
                    captionInput.value = pattern.caption || '';
                }
                
                // Set type
                const typeRadios = lastItem.querySelectorAll(`input[name^="pattern-type-"]`);
                typeRadios.forEach(radio => {
                    if (radio.value === pattern.type) {
                        radio.checked = true;
                        // Trigger change event to show the correct content div
                        radio.dispatchEvent(new Event('change'));
                        handlePatternTypeChange(lastItem, pattern.type);
                        
                        // Set content based on type after type is set
                        if (pattern.type === 'text' && pattern.text) {
                            const textArea = lastItem.querySelector('.pattern-text');
                            if (textArea) {
                                textArea.value = pattern.text || '';
                            }
                        } else if (pattern.type === 'picture' && pattern.imagePath) {
                            const previewImg = lastItem.querySelector('.pattern-image-preview-img');
                            const preview = lastItem.querySelector('.pattern-image-preview');
                            if (previewImg && preview) {
                                const storedPath = sanitizeMediaPath(pattern.imagePath);
                                const displayPath = buildMediaUrl(storedPath);
                                previewImg.src = displayPath;
                                preview.style.display = 'block';
                                // Store the image path in the pattern item for later retrieval
                                lastItem.dataset.imagePath = storedPath;
                            }
                        } else if (pattern.type === 'table' && pattern.table) {
                            const preview = lastItem.querySelector('.pattern-table-preview');
                            if (preview) {
                                preview.innerHTML = pattern.table;
                                lastItem.dataset.tableHtml = pattern.table;
                                
                                // Set up event listeners to capture table changes
                                const table = preview.querySelector('.pattern-table');
                                if (table) {
                                    const updateTableHtml = () => {
                                        lastItem.dataset.tableHtml = preview.innerHTML;
                                    };
                                    
                                    table.addEventListener('input', updateTableHtml);
                                    table.addEventListener('blur', updateTableHtml, true);
                                    table.addEventListener('focusout', updateTableHtml);
                                    
                                    // Also capture when any cell loses focus
                                    const cells = table.querySelectorAll('th, td');
                                    cells.forEach(cell => {
                                        cell.addEventListener('blur', updateTableHtml);
                                    });
                                }
                            }
                        }
                    }
                });
            });
            setupPatternInputs();
        }
    } else {
        // Reset to default if no patterns
        const container = document.getElementById('exam-pattern-container');
        if (container) {
            container.innerHTML = `
                <div class="pattern-item">
                    <input type="text" class="pattern-caption" placeholder="Pattern Caption (e.g., Exam Duration, Total Marks)" name="pattern-caption[]">
                    <div class="pattern-content-options">
                        <label><input type="radio" name="pattern-type-0" value="text" checked> Text</label>
                        <label><input type="radio" name="pattern-type-0" value="picture"> Picture</label>
                        <label><input type="radio" name="pattern-type-0" value="table"> Table</label>
                    </div>
                    <div class="pattern-content pattern-text-content">
                        <textarea class="pattern-text" placeholder="Enter pattern details" rows="4" name="pattern-text[]"></textarea>
                    </div>
                    <div class="pattern-content pattern-picture-content" style="display: none;">
                        <input type="file" class="pattern-image" accept="image/*" name="pattern-image[]">
                        <div class="pattern-image-preview" style="display: none;">
                            <img class="pattern-image-preview-img" src="" alt="Preview">
                            <button type="button" class="remove-image-btn" onclick="removePatternImagePreview(this)">Remove</button>
                        </div>
                    </div>
                    <div class="pattern-content pattern-table-content" style="display: none;">
                        <div class="pattern-table-editor">
                            <div class="table-editor-controls">
                                <input type="number" class="pattern-table-rows" placeholder="Rows" min="1" value="3" style="width: 100px;">
                                <input type="number" class="pattern-table-cols" placeholder="Columns" min="1" value="3" style="width: 100px;">
                                <button type="button" class="btn-secondary" onclick="generatePatternTable(this)">Generate Table</button>
                                <button type="button" class="btn-secondary" onclick="cancelPatternTable(this)">Cancel</button>
                            </div>
                            <div class="pattern-table-preview" style="margin-top: 15px; overflow-x: auto;"></div>
                        </div>
                    </div>
                    <button type="button" class="remove-pattern-btn" onclick="removePatternItem(this)" style="display: none;">Remove</button>
                </div>
            `;
            setupPatternInputs();
        }
    }

    // Load tables
    if (exam.syllabusTable) {
        syllabusTableHTML = exam.syllabusTable;
        const syllabusPreview = document.getElementById('syllabus-table-preview');
        const syllabusEditor = document.getElementById('syllabus-table-editor');
        if (syllabusPreview) {
            syllabusPreview.innerHTML = exam.syllabusTable;
        }
        if (syllabusEditor) {
            syllabusEditor.style.display = 'block';
        }
        // Re-attach event listeners
        const syllabusTable = syllabusPreview?.querySelector('#syllabus-table');
        if (syllabusTable) {
            syllabusTable.addEventListener('input', () => {
                syllabusTableHTML = syllabusPreview.innerHTML;
            });
            syllabusTable.addEventListener('blur', () => {
                syllabusTableHTML = syllabusPreview.innerHTML;
            });
        }
    } else {
        // Reset syllabus table if not present
        syllabusTableHTML = '';
        const syllabusPreview = document.getElementById('syllabus-table-preview');
        const syllabusEditor = document.getElementById('syllabus-table-editor');
        if (syllabusPreview) syllabusPreview.innerHTML = '';
        if (syllabusEditor) syllabusEditor.style.display = 'none';
    }
    
    if (exam.cutoffTable) {
        cutoffTableHTML = exam.cutoffTable;
        const cutoffPreview = document.getElementById('cutoff-table-preview');
        const cutoffEditor = document.getElementById('cutoff-table-editor');
        if (cutoffPreview) {
            cutoffPreview.innerHTML = exam.cutoffTable;
        }
        if (cutoffEditor) {
            cutoffEditor.style.display = 'block';
        }
        // Re-attach event listeners
        const cutoffTable = cutoffPreview?.querySelector('#cutoff-table');
        if (cutoffTable) {
            cutoffTable.addEventListener('input', () => {
                cutoffTableHTML = cutoffPreview.innerHTML;
            });
            cutoffTable.addEventListener('blur', () => {
                cutoffTableHTML = cutoffPreview.innerHTML;
            });
        }
    } else {
        // Reset cutoff table if not present
        cutoffTableHTML = '';
        const cutoffPreview = document.getElementById('cutoff-table-preview');
        const cutoffEditor = document.getElementById('cutoff-table-editor');
        if (cutoffPreview) cutoffPreview.innerHTML = '';
        if (cutoffEditor) cutoffEditor.style.display = 'none';
    }

    // Scroll to form
    const formSection = document.getElementById('exam-details-form');
    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Delete exam details
async function deleteExamDetails(id) {
    if (!confirm('Are you sure you want to delete this exam details?')) return;

    try {
        const response = await adminFetch(`/api/admin/exam-details/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Exam details deleted successfully!');
            loadExamDetails();
        } else {
            alert('Error: ' + (result.message || 'Failed to delete exam details'));
        }
    } catch (error) {
        console.error('Error deleting exam details:', error);
        alert('Error deleting exam details. Please try again.');
    }
}

// Reset form
function resetExamDetailsForm() {
    const form = document.getElementById('exam-details-form');
    if (form) form.reset();
    
    currentEditingId = null;
    syllabusTableHTML = '';
    cutoffTableHTML = '';

    // Reset image previews
    ['about-exam-image', 'exam-syllabus-image'].forEach(id => {
        removeImagePreview(id);
    });

    resetCutoffItemsUI();

    // Reset links
    const linksContainer = document.getElementById('links-container');
    if (linksContainer) {
        linksContainer.innerHTML = `
            <div class="link-item">
                <input type="text" class="link-caption" placeholder="Link Caption" name="link-caption[]">
                <input type="url" class="link-url" placeholder="https://example.com" name="link-url[]">
                <button type="button" class="remove-link-btn" onclick="removeLinkItem(this)" style="display: none;">Remove</button>
            </div>
        `;
        setupLinkInputs();
    }

    // Reset tables
    document.getElementById('links-table-container').style.display = 'none';
    cancelSyllabusTable();
    cancelCutoffTable();
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Expose functions to global scope for onclick handlers
window.editExamDetails = editExamDetails;
window.deleteExamDetails = deleteExamDetails;
window.addLinkItem = addLinkItem;
window.removeLinkItem = removeLinkItem;
window.removeLinkFromTable = removeLinkFromTable;
window.addPatternItem = addPatternItem;
window.removePatternItem = removePatternItem;
window.removePatternImagePreview = removePatternImagePreview;
window.generatePatternTable = generatePatternTable;
window.cancelPatternTable = cancelPatternTable;
window.addSyllabusTable = addSyllabusTable;
window.generateSyllabusTable = generateSyllabusTable;
window.cancelSyllabusTable = cancelSyllabusTable;
window.addCutoffTable = addCutoffTable;
window.generateCutoffTable = generateCutoffTable;
window.cancelCutoffTable = cancelCutoffTable;
window.removeImagePreview = removeImagePreview;
window.resetExamDetailsForm = resetExamDetailsForm;
window.addCutoffItem = addCutoffItem;
window.removeCutoffItem = removeCutoffItem;
window.removeCutoffImagePreview = removeCutoffImagePreview;



