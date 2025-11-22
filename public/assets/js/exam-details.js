// exam-details.js - Handles exam details management functionality

let examDetailsData = [];
let currentEditingId = null;
let syllabusTableHTML = '';
let cutoffTableHTML = '';
let examPatterns = []; // Array to store pattern HTML for each pattern item

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

    // Link input handlers
    setupLinkInputs();
    
    // Pattern input handlers
    setupPatternInputs();
    
    // Syllabus input handlers
    setupSyllabusInputs();
    
    // Cutoff input handlers
    setupCutoffInputs();
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
                pattern.imagePath = item.dataset.imagePath;
                console.log('Pattern picture path from dataset:', pattern.imagePath);
            } else {
                // Fallback to checking preview image src
                const previewImg = item.querySelector('.pattern-image-preview-img');
                if (previewImg && previewImg.src && !previewImg.src.startsWith('data:') && !previewImg.src.startsWith('blob:')) {
                    pattern.imagePath = previewImg.src;
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

// Setup syllabus inputs
function setupSyllabusInputs() {
    const syllabusItems = document.querySelectorAll('.syllabus-item');
    syllabusItems.forEach((item, index) => {
        const typeRadios = item.querySelectorAll('input[name^="syllabus-type-"]');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                handleSyllabusTypeChange(item, e.target.value);
            });
        });
        
        // Setup image preview for syllabus images
        const imageInput = item.querySelector('.syllabus-image');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                handleSyllabusImageChange(item, e.target.files[0]);
            });
        }
    });
}

// Handle syllabus type change
function handleSyllabusTypeChange(syllabusItem, type) {
    const textContent = syllabusItem.querySelector('.syllabus-text-content');
    const pictureContent = syllabusItem.querySelector('.syllabus-picture-content');
    const tableContent = syllabusItem.querySelector('.syllabus-table-content');
    
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

// Handle syllabus image change
function handleSyllabusImageChange(syllabusItem, file) {
    if (!file) return;
    
    const preview = syllabusItem.querySelector('.syllabus-image-preview');
    const previewImg = syllabusItem.querySelector('.syllabus-image-preview-img');
    
    if (preview && previewImg) {
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Add syllabus item
function addSyllabusItem() {
    const container = document.getElementById('exam-syllabus-container');
    if (!container) return;
    
    const syllabusItems = container.querySelectorAll('.syllabus-item');
    const newIndex = syllabusItems.length;
    
    const syllabusItem = document.createElement('div');
    syllabusItem.className = 'syllabus-item';
    syllabusItem.innerHTML = `
        <input type="text" class="syllabus-caption" placeholder="Syllabus Caption (e.g., Mathematics Syllabus, Physics Syllabus)" name="syllabus-caption[]">
        <div class="syllabus-content-options">
            <label><input type="radio" name="syllabus-type-${newIndex}" value="text" checked> Text</label>
            <label><input type="radio" name="syllabus-type-${newIndex}" value="picture"> Picture</label>
            <label><input type="radio" name="syllabus-type-${newIndex}" value="table"> Table</label>
        </div>
        <div class="syllabus-content syllabus-text-content">
            <textarea class="syllabus-text" placeholder="Enter syllabus details" rows="4" name="syllabus-text[]"></textarea>
        </div>
        <div class="syllabus-content syllabus-picture-content" style="display: none;">
            <input type="file" class="syllabus-image" accept="image/*" name="syllabus-image[]">
            <div class="syllabus-image-preview" style="display: none;">
                <img class="syllabus-image-preview-img" src="" alt="Preview">
                <button type="button" class="remove-image-btn" onclick="removeSyllabusImagePreview(this)">Remove</button>
            </div>
        </div>
        <div class="syllabus-content syllabus-table-content" style="display: none;">
            <div class="syllabus-table-editor">
                <div class="table-editor-controls">
                    <input type="number" class="syllabus-table-rows" placeholder="Rows" min="1" value="3" style="width: 100px;">
                    <input type="number" class="syllabus-table-cols" placeholder="Columns" min="1" value="3" style="width: 100px;">
                    <button type="button" class="btn-secondary" onclick="generateSyllabusItemTable(this)">Generate Table</button>
                    <button type="button" class="btn-secondary" onclick="cancelSyllabusItemTable(this)">Cancel</button>
                </div>
                <div class="syllabus-table-preview" style="margin-top: 15px; overflow-x: auto;"></div>
            </div>
        </div>
        <button type="button" class="remove-syllabus-btn" onclick="removeSyllabusItem(this)">Remove</button>
    `;
    
    container.appendChild(syllabusItem);
    // Initialize dataset.imagePath to empty string to prevent undefined issues
    syllabusItem.dataset.imagePath = '';
    setupSyllabusInputs();

    
    // Show remove button on first item if there are multiple
    const allItems = container.querySelectorAll('.syllabus-item');
    if (allItems.length > 1) {
        allItems[0].querySelector('.remove-syllabus-btn').style.display = 'block';
    }
}

// Remove syllabus item
function removeSyllabusItem(btn) {
    const item = btn.closest('.syllabus-item');
    if (item) {
        item.remove();
        
        // Hide remove button on first item if only one remains
        const container = document.getElementById('exam-syllabus-container');
        const allItems = container.querySelectorAll('.syllabus-item');
        if (allItems.length === 1) {
            allItems[0].querySelector('.remove-syllabus-btn').style.display = 'none';
        }
    }
}

// Remove syllabus image preview
function removeSyllabusImagePreview(btn) {
    const preview = btn.closest('.syllabus-image-preview');
    const syllabusItem = btn.closest('.syllabus-item');
    const imageInput = syllabusItem.querySelector('.syllabus-image');
    
    if (preview) preview.style.display = 'none';
    if (imageInput) imageInput.value = '';
}

// Generate syllabus item table
function generateSyllabusItemTable(btn) {
    const syllabusItem = btn.closest('.syllabus-item');
    const rowsInput = syllabusItem.querySelector('.syllabus-table-rows');
    const colsInput = syllabusItem.querySelector('.syllabus-table-cols');
    const preview = syllabusItem.querySelector('.syllabus-table-preview');
    
    if (!rowsInput || !colsInput || !preview) return;
    
    const rows = parseInt(rowsInput.value || 3);
    const cols = parseInt(colsInput.value || 3);
    
    let tableHTML = '<table class="editable-table syllabus-table"><thead><tr>';
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
    syllabusItem.dataset.tableHtml = preview.innerHTML;
    
    // Capture table changes
    const table = preview.querySelector('.syllabus-table');
    if (table) {
        const updateTableHtml = () => {
            syllabusItem.dataset.tableHtml = preview.innerHTML;
        };
        
        table.addEventListener('input', updateTableHtml);
        table.addEventListener('blur', updateTableHtml, true);
        table.addEventListener('focusout', updateTableHtml);
        
        const cells = table.querySelectorAll('th, td');
        cells.forEach(cell => {
            cell.addEventListener('blur', updateTableHtml);
        });
    }
}

// Cancel syllabus item table
function cancelSyllabusItemTable(btn) {
    const syllabusItem = btn.closest('.syllabus-item');
    const preview = syllabusItem.querySelector('.syllabus-table-preview');
    if (preview) {
        preview.innerHTML = '';
        syllabusItem.dataset.tableHtml = '';
    }
}

// Get syllabus data
function getSyllabusData() {
    const syllabuses = [];
    const syllabusItems = document.querySelectorAll('.syllabus-item');
    
    syllabusItems.forEach((item, index) => {
        const caption = item.querySelector('.syllabus-caption')?.value.trim();
        const typeRadio = item.querySelector('input[name^="syllabus-type-"]:checked');
        const type = typeRadio ? typeRadio.value : 'text';
        
        if (!caption) return; // Skip if no caption
        
        const syllabus = {
            caption: caption,
            type: type
        };
        
        if (type === 'text') {
            const text = item.querySelector('.syllabus-text')?.value.trim() || '';
            syllabus.text = text;
        } else if (type === 'picture') {
            const imageFile = item.querySelector('.syllabus-image')?.files[0];
            if (imageFile) {
                syllabus.imageFile = imageFile;
                console.log('Syllabus picture file found:', imageFile.name);
            }
            // CRITICAL: Always preserve existing image path from dataset (set during edit load)
            if (item.dataset.imagePath) {
                syllabus.imagePath = item.dataset.imagePath;
                console.log('Syllabus picture path from dataset:', syllabus.imagePath);
            } else {
                // Fallback to checking preview image src
                const previewImg = item.querySelector('.syllabus-image-preview-img');
                if (previewImg && previewImg.src && !previewImg.src.startsWith('data:') && !previewImg.src.startsWith('blob:')) {
                    syllabus.imagePath = previewImg.src;
                    console.log('Syllabus picture path from preview:', syllabus.imagePath);
                }
            }
            // ALWAYS include imagePath if found - don't skip it
            if (syllabus.imagePath) {
                console.log('Syllabus imagePath included:', syllabus.imagePath);
            } else if (!syllabus.imageFile) {
                console.warn('Syllabus picture has no image file or path for caption:', syllabus.caption);
            }
        }
 else if (type === 'table') {
            const tablePreview = item.querySelector('.syllabus-table-preview');
            let tableHtml = '';
            
            if (tablePreview && tablePreview.innerHTML.trim()) {
                tableHtml = tablePreview.innerHTML;
                item.dataset.tableHtml = tableHtml;
            } else if (item.dataset.tableHtml) {
                tableHtml = item.dataset.tableHtml;
            }
            
            if (tableHtml) {
                syllabus.table = tableHtml;
            }
        }
        
        if (syllabus.caption) {
            syllabuses.push(syllabus);
        }
    });
    
    return syllabuses;
}

// Setup cutoff inputs
function setupCutoffInputs() {
    const cutoffItems = document.querySelectorAll('.cutoff-item');
    cutoffItems.forEach((item, index) => {
        const typeRadios = item.querySelectorAll('input[name^="cutoff-type-"]');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                handleCutoffTypeChange(item, e.target.value);
            });
        });
        
        // Setup image preview for cutoff images
        const imageInput = item.querySelector('.cutoff-image');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                handleCutoffImageChange(item, e.target.files[0]);
            });
        }
    });
}

// Handle cutoff type change
function handleCutoffTypeChange(cutoffItem, type) {
    const pictureContent = cutoffItem.querySelector('.cutoff-picture-content');
    const tableContent = cutoffItem.querySelector('.cutoff-table-content');
    
    // Hide all content
    [pictureContent, tableContent].forEach(content => {
        if (content) content.style.display = 'none';
    });
    
    // Show selected content
    if (type === 'picture' && pictureContent) {
        pictureContent.style.display = 'block';
    } else if (type === 'table' && tableContent) {
        tableContent.style.display = 'block';
    }
}

// Handle cutoff image change
function handleCutoffImageChange(cutoffItem, file) {
    if (!file) return;
    
    const preview = cutoffItem.querySelector('.cutoff-image-preview');
    const previewImg = cutoffItem.querySelector('.cutoff-image-preview-img');
    
    if (preview && previewImg) {
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Add cutoff item
function addCutoffItem() {
    const container = document.getElementById('exam-cutoff-container');
    if (!container) return;
    
    const cutoffItems = container.querySelectorAll('.cutoff-item');
    const newIndex = cutoffItems.length;
    
    const cutoffItem = document.createElement('div');
    cutoffItem.className = 'cutoff-item';
    cutoffItem.innerHTML = `
        <input type="text" class="cutoff-caption" placeholder="Cut Off Caption (e.g., 2023 Cut Off, Category-wise Cut Off)" name="cutoff-caption[]">
        <div class="cutoff-content-options">
            <label><input type="radio" name="cutoff-type-${newIndex}" value="picture" checked> Picture</label>
            <label><input type="radio" name="cutoff-type-${newIndex}" value="table"> Table</label>
        </div>
        <div class="cutoff-content cutoff-picture-content">
            <input type="file" class="cutoff-image" accept="image/*" name="cutoff-image[]">
            <div class="cutoff-image-preview" style="display: none;">
                <img class="cutoff-image-preview-img" src="" alt="Preview">
                <button type="button" class="remove-image-btn" onclick="removeCutoffImagePreview(this)">Remove</button>
            </div>
        </div>
        <div class="cutoff-content cutoff-table-content" style="display: none;">
            <div class="cutoff-table-editor">
                <div class="table-editor-controls">
                    <input type="number" class="cutoff-table-rows" placeholder="Rows" min="1" value="3" style="width: 100px;">
                    <input type="number" class="cutoff-table-cols" placeholder="Columns" min="1" value="3" style="width: 100px;">
                    <button type="button" class="btn-secondary" onclick="generateCutoffItemTable(this)">Generate Table</button>
                    <button type="button" class="btn-secondary" onclick="cancelCutoffItemTable(this)">Cancel</button>
                </div>
                <div class="cutoff-table-preview" style="margin-top: 15px; overflow-x: auto;"></div>
            </div>
        </div>
        <button type="button" class="remove-cutoff-btn" onclick="removeCutoffItem(this)">Remove</button>
    `;
    
    container.appendChild(cutoffItem);
    setupCutoffInputs();
    
    // Show remove button on first item if there are multiple
    const allItems = container.querySelectorAll('.cutoff-item');
    if (allItems.length > 1) {
        allItems[0].querySelector('.remove-cutoff-btn').style.display = 'block';
    }
}

// Remove cutoff item
function removeCutoffItem(btn) {
    const item = btn.closest('.cutoff-item');
    if (item) {
        item.remove();
        
        // Hide remove button on first item if only one remains
        const container = document.getElementById('exam-cutoff-container');
        const allItems = container.querySelectorAll('.cutoff-item');
        if (allItems.length === 1) {
            allItems[0].querySelector('.remove-cutoff-btn').style.display = 'none';
        }
    }
}

// Remove cutoff image preview
function removeCutoffImagePreview(btn) {
    const preview = btn.closest('.cutoff-image-preview');
    const cutoffItem = btn.closest('.cutoff-item');
    const imageInput = cutoffItem.querySelector('.cutoff-image');
    
    if (preview) preview.style.display = 'none';
    if (imageInput) imageInput.value = '';
}

// Generate cutoff item table
function generateCutoffItemTable(btn) {
    const cutoffItem = btn.closest('.cutoff-item');
    const rowsInput = cutoffItem.querySelector('.cutoff-table-rows');
    const colsInput = cutoffItem.querySelector('.cutoff-table-cols');
    const preview = cutoffItem.querySelector('.cutoff-table-preview');
    
    if (!rowsInput || !colsInput || !preview) return;
    
    const rows = parseInt(rowsInput.value || 3);
    const cols = parseInt(colsInput.value || 3);
    
    let tableHTML = '<table class="editable-table cutoff-table"><thead><tr>';
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
    cutoffItem.dataset.tableHtml = preview.innerHTML;
    
    // Capture table changes
    const table = preview.querySelector('.cutoff-table');
    if (table) {
        const updateTableHtml = () => {
            cutoffItem.dataset.tableHtml = preview.innerHTML;
        };
        
        table.addEventListener('input', updateTableHtml);
        table.addEventListener('blur', updateTableHtml, true);
        table.addEventListener('focusout', updateTableHtml);
        
        const cells = table.querySelectorAll('th, td');
        cells.forEach(cell => {
            cell.addEventListener('blur', updateTableHtml);
        });
    }
}

// Cancel cutoff item table
function cancelCutoffItemTable(btn) {
    const cutoffItem = btn.closest('.cutoff-item');
    const preview = cutoffItem.querySelector('.cutoff-table-preview');
    if (preview) {
        preview.innerHTML = '';
        cutoffItem.dataset.tableHtml = '';
    }
}

// Get cutoff data
function getCutoffData() {
    const cutoffs = [];
    const cutoffItems = document.querySelectorAll('.cutoff-item');
    
    cutoffItems.forEach((item, index) => {
        const caption = item.querySelector('.cutoff-caption')?.value.trim();
        const typeRadio = item.querySelector('input[name^="cutoff-type-"]:checked');
        const type = typeRadio ? typeRadio.value : 'picture';
        
        if (!caption) return; // Skip if no caption
        
        const cutoff = {
            caption: caption,
            type: type
        };
        
        if (type === 'picture') {
            const imageFile = item.querySelector('.cutoff-image')?.files[0];
            if (imageFile) {
                cutoff.imageFile = imageFile;
            }
            if (item.dataset.imagePath) {
                cutoff.imagePath = item.dataset.imagePath;
            } else {
                const previewImg = item.querySelector('.cutoff-image-preview-img');
                if (previewImg && previewImg.src && !previewImg.src.startsWith('data:') && !previewImg.src.startsWith('blob:')) {
                    cutoff.imagePath = previewImg.src;
                }
            }
        } else if (type === 'table') {
            const tablePreview = item.querySelector('.cutoff-table-preview');
            let tableHtml = '';
            
            if (tablePreview && tablePreview.innerHTML.trim()) {
                tableHtml = tablePreview.innerHTML;
                item.dataset.tableHtml = tableHtml;
            } else if (item.dataset.tableHtml) {
                tableHtml = item.dataset.tableHtml;
            }
            
            if (tableHtml) {
                cutoff.table = tableHtml;
            }
        }
        
        if (cutoff.caption) {
            cutoffs.push(cutoff);
        }
    });
    
    return cutoffs;
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
    const examNameInput = document.getElementById('exam-namedetails');
    let examName = '';
    
    if (examNameInput) {
        examName = examNameInput.value ? examNameInput.value.trim() : '';
        console.log('Exam name from input element (raw):', examNameInput.value);
        console.log('Exam name from input element (trimmed):', examName);
    }
    
    // Fallback: try to get from form data if input element method didn't work
    if (!examName || examName.length === 0) {
        const formDataCheck = new FormData(form);
        const examNameFromForm = formDataCheck.get('exam-namedetails');
        if (examNameFromForm) {
            examName = examNameFromForm.trim();
            console.log('Exam name from FormData:', examName);
        }
    }
    
    // Final validation
    if (!examName || examName.length === 0) {
        alert('Please enter an exam name');
        if (examNameInput) {
            examNameInput.focus();
        }
        return;
    }
    
    console.log('Final exam name being used:', examName);
    
    const examDetails = {
        examName: examName,
        aboutExamText: document.getElementById('about-exam-text')?.value.trim() || '',
        aboutExamImage: document.getElementById('about-exam-image')?.files[0] || null,
        examPatternCaption: document.getElementById('exam-pattern-caption')?.value.trim() || '',
        examSyllabusCaption: document.getElementById('exam-syllabus-caption')?.value.trim() || '',
        links: getLinksData(),
        patterns: getPatternsData(),
        syllabuses: getSyllabusData(),
        cutoffs: getCutoffData()
    };

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
    
    // Capture syllabus table HTML right before submission
    const syllabusItems = document.querySelectorAll('.syllabus-item');
    syllabusItems.forEach((item) => {
        const typeRadio = item.querySelector('input[name^="syllabus-type-"]:checked');
        if (typeRadio && typeRadio.value === 'table') {
            const tablePreview = item.querySelector('.syllabus-table-preview');
            if (tablePreview && tablePreview.innerHTML.trim()) {
                item.dataset.tableHtml = tablePreview.innerHTML;
            }
        }
    });
    
    // Capture cutoff table HTML right before submission
    const cutoffItems = document.querySelectorAll('.cutoff-item');
    cutoffItems.forEach((item) => {
        const typeRadio = item.querySelector('input[name^="cutoff-type-"]:checked');
        if (typeRadio && typeRadio.value === 'table') {
            const tablePreview = item.querySelector('.cutoff-table-preview');
            if (tablePreview && tablePreview.innerHTML.trim()) {
                item.dataset.tableHtml = tablePreview.innerHTML;
            }
        }
    });
    
    // Re-get data after capturing latest table HTML
    examDetails.patterns = getPatternsData();
    examDetails.syllabuses = getSyllabusData();
    examDetails.cutoffs = getCutoffData();
    
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
    submitData.append('exam-namedetails', examDetails.examName);
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
    
    // Add pattern caption
    submitData.append('examPatternCaption', examDetails.examPatternCaption || '');
    
    // Add syllabuses data (without files first, then add files separately)
    const syllabusesForJson = examDetails.syllabuses.map((s, index) => {
        const syllabusData = {
            caption: s.caption || '',
            type: s.type || 'text'
        };
        if (s.type === 'text') {
            syllabusData.text = s.text || '';
        } else if (s.type === 'picture') {
            // Always include imagePath if it exists (for existing images)
            if (s.imagePath) {
                syllabusData.imagePath = s.imagePath;
            }
            // Note: imageFile will be added separately as FormData file
        } else if (s.type === 'table') {
            syllabusData.table = s.table || '';
        }
        console.log(`Syllabus ${index} data:`, syllabusData);
        return syllabusData;
    });
    
    // Debug: Log syllabuses being sent
    console.log('Syllabuses being sent (JSON):', JSON.stringify(syllabusesForJson, null, 2));
    console.log('Syllabuses count:', syllabusesForJson.length);
    
    // Always send syllabuses, even if empty array
    submitData.append('syllabuses', JSON.stringify(syllabusesForJson));
    submitData.append('examSyllabusCaption', examDetails.examSyllabusCaption || '');
    
    // Add syllabus image files
        // Add syllabus image files
        examDetails.syllabuses.forEach((syllabus, index) => {
            if (syllabus.type === 'picture') {
                // Log both new files and existing paths
                if (syllabus.imageFile) {
                    console.log(`Adding syllabus image file ${index}:`, syllabus.imageFile.name);
                    submitData.append(`syllabusImage_${index}`, syllabus.imageFile);
                }
                // CRITICAL: Log if imagePath is being sent
                if (syllabus.imagePath) {
                    console.log(`Syllabus ${index} has imagePath: ${syllabus.imagePath}`);
                }
            }
        });
    
    
    // Add cutoffs data (without files first, then add files separately)
    const cutoffsForJson = examDetails.cutoffs.map((c, index) => {
        const cutoffData = {
            caption: c.caption || '',
            type: c.type || 'picture'
        };
        if (c.type === 'picture') {
            if (c.imagePath) {
                cutoffData.imagePath = c.imagePath;
            }
        } else if (c.type === 'table') {
            cutoffData.table = c.table || '';
            console.log(`Cutoff ${index} table data length:`, cutoffData.table ? cutoffData.table.length : 0);
        }
        console.log(`Cutoff ${index} data:`, { caption: cutoffData.caption, type: cutoffData.type, hasImage: !!cutoffData.imagePath, hasTable: !!cutoffData.table });
        return cutoffData;
    });
    console.log('Cutoffs being sent (JSON):', JSON.stringify(cutoffsForJson, null, 2));
    submitData.append('cutoffs', JSON.stringify(cutoffsForJson));
    
    // Add cutoff image files
    examDetails.cutoffs.forEach((cutoff, index) => {
        if (cutoff.type === 'picture' && cutoff.imageFile) {
            submitData.append(`cutoffImage_${index}`, cutoff.imageFile);
        }
    });
    
    // Debug: Log examName being sent
    console.log('Sending examName:', examDetails.examName);
    
    if (examDetails.aboutExamImage) {
        submitData.append('aboutExamImage', examDetails.aboutExamImage);
    }
    
    if (currentEditingId) {
        submitData.append('id', currentEditingId);
    }

    try {
        const response = await adminFetch('/api/admin/exam-details', {
            method: currentEditingId ? 'PUT' : 'POST',
            body: submitData
        });

        const result = await response.json();
        
        if (result.success) {
            if (currentEditingId) {
                alert('Exam details updated successfully!');
            } else {
                alert('Exam details saved successfully!');
            }
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
        html += `
            <div class="exam-details-card">
                <h4>${escapeHtml(exam.examNamedetails || exam.examName || 'Unnamed Exam')}</h4>
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
        console.log(`Exam ${i}: id=${e.id}, _id=${e._id}, examId=${examId}, examName=${e.examName}, match=${examId === idStr}`);
        if (examId === idStr) {
            exam = e;
            console.log('FOUND MATCHING EXAM:', JSON.stringify(exam, null, 2));
            break;
        }
    }
    
    if (!exam) {
        console.error('Exam not found for id:', id);
        console.error('Available exams:', examDetailsData.map(e => ({ id: e.id, _id: e._id, examNamedetails: e.examNamedetails, examName: e.examName })));
        alert('Exam not found. Please refresh the page and try again.');
        return;
    }

    // Use the id field (not _id) for server lookup - prioritize id field
    // If exam has id field, use it; otherwise use _id (server will handle both)
    // Convert to string to ensure consistency
    currentEditingId = String(exam.id || exam._id);
    
    console.log('Current editing ID:', currentEditingId);
    console.log('Exam object examNamedetails field:', exam.examNamedetails);
    console.log('Exam object examName field:', exam.examName);
    console.log('Exam object keys:', Object.keys(exam));
    console.log('Full exam object:', JSON.stringify(exam, null, 2));
    
    // If exam name is missing, try to fetch from server
    if (!exam.examNamedetails && !exam.examName) {
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
                    if (serverExam.examNamedetails || serverExam.examName) {
                        exam.examNamedetails = serverExam.examNamedetails || serverExam.examName;
                        exam.examName = serverExam.examName || serverExam.examNamedetails;
                        console.log('Fetched exam name from server:', exam.examNamedetails || exam.examName);
                    } else {
                        console.error('Server exam also missing exam name!');
                    }
                } else {
                    console.error('Server exam not found for id:', idStr);
                }
            }
        } catch (fetchErr) {
            console.warn('Could not fetch exam from server:', fetchErr);
        }
    } else {
        console.log('Exam name found in local data:', exam.examNamedetails || exam.examName);
    }

    // START SIMPLIFIED EXAM NAME SETTING
    const examNameInput = document.getElementById('exam-namedetails');
    const examNameToSet = exam.examNamedetails || exam.examName || exam.exam_name || exam.Namedetails || exam.name || '';

    if (examNameInput) {
        // Set the value directly
        examNameInput.value = examNameToSet;
        examNameInput.defaultValue = examNameToSet;

        // Trigger events to ensure form recognizes the change
        examNameInput.dispatchEvent(new Event('input', { bubbles: true }));
        examNameInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('SIMPLIFIED: Exam name set to:', examNameInput.value);
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
    if (exam.cutoffImagePath) {
        const img = document.getElementById('cutoff-image-preview-img');
        const preview = document.getElementById('cutoff-image-preview');
        if (img && preview) {
            img.src = exam.cutoffImagePath;
            preview.style.display = 'block';
        }
    }

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
                        } else if (syllabus.type === 'picture' && syllabus.imagePath) {
                            const previewImg = lastItem.querySelector('.syllabus-image-preview-img');
                            const preview = lastItem.querySelector('.syllabus-image-preview');
                            if (previewImg && preview) {
                                // Ensure image path is correct
                                let imagePath = syllabus.imagePath;
                                if (!imagePath.startsWith('http') && !imagePath.startsWith('/')) {
                                    imagePath = '/' + imagePath;
                                }
                                previewImg.src = imagePath;
                                previewImg.onerror = function() {
                                    console.error('Failed to load syllabus image:', imagePath);
                                    preview.style.display = 'none';
                                };
                                previewImg.onload = function() {
                                    preview.style.display = 'block';
                                };
                                preview.style.display = 'block';
                                // CRITICAL: Store the image path in the syllabus item for later retrieval
                                lastItem.dataset.imagePath = imagePath;
                                console.log('Stored syllabus imagePath in dataset:', imagePath);
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

    // Set pattern caption
    const examPatternCaptionInput = document.getElementById('exam-pattern-caption');
    if (examPatternCaptionInput) {
        examPatternCaptionInput.value = exam.examPatternCaption || '';
    }
    
    // Set syllabus caption
    const examSyllabusCaptionInput = document.getElementById('exam-syllabus-caption');
    if (examSyllabusCaptionInput) {
        examSyllabusCaptionInput.value = exam.examSyllabusCaption || '';
    }

    // Load syllabuses
    if (exam.syllabuses && Array.isArray(exam.syllabuses) && exam.syllabuses.length > 0) {
        const container = document.getElementById('exam-syllabus-container');
        if (container) {
            container.innerHTML = '';
            exam.syllabuses.forEach((syllabus, index) => {
                addSyllabusItem();
                const items = container.querySelectorAll('.syllabus-item');
                const lastItem = items[items.length - 1];
                
                // Set caption
                const captionInput = lastItem.querySelector('.syllabus-caption');
                if (captionInput) {
                    captionInput.value = syllabus.caption || '';
                }
                
                // Set type
                const typeRadios = lastItem.querySelectorAll(`input[name^="syllabus-type-"]`);
                typeRadios.forEach(radio => {
                    if (radio.value === syllabus.type) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change'));
                        handleSyllabusTypeChange(lastItem, syllabus.type);
                        
                        // Set content based on type
                        if (syllabus.type === 'text' && syllabus.text) {
                            const textArea = lastItem.querySelector('.syllabus-text');
                            if (textArea) {
                                textArea.value = syllabus.text || '';
                            }
                        } else if (syllabus.type === 'picture' && syllabus.imagePath) {
                            const previewImg = lastItem.querySelector('.syllabus-image-preview-img');
                            const preview = lastItem.querySelector('.syllabus-image-preview');
                            if (previewImg && preview) {
                                // Ensure image path is correct
                                let imagePath = syllabus.imagePath;
                                if (!imagePath.startsWith('http') && !imagePath.startsWith('/')) {
                                    imagePath = '/' + imagePath;
                                }
                                previewImg.src = imagePath;
                                preview.style.display = 'block';
                                // Store the image path in the syllabus item for later retrieval
                                lastItem.dataset.imagePath = imagePath;
                            }
                        } else if (syllabus.type === 'table' && syllabus.table) {
                            const preview = lastItem.querySelector('.syllabus-table-preview');
                            if (preview) {
                                preview.innerHTML = syllabus.table;
                                lastItem.dataset.tableHtml = syllabus.table;
                                
                                const table = preview.querySelector('.syllabus-table');
                                if (table) {
                                    const updateTableHtml = () => {
                                        lastItem.dataset.tableHtml = preview.innerHTML;
                                    };
                                    
                                    table.addEventListener('input', updateTableHtml);
                                    table.addEventListener('blur', updateTableHtml, true);
                                    table.addEventListener('focusout', updateTableHtml);
                                    
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
            setupSyllabusInputs();
        }
    } else {
        // Reset to default if no syllabuses
        const container = document.getElementById('exam-syllabus-container');
        if (container) {
            container.innerHTML = `
                <div class="syllabus-item">
                    <input type="text" class="syllabus-caption" placeholder="Syllabus Caption (e.g., Mathematics Syllabus, Physics Syllabus)" name="syllabus-caption[]">
                    <div class="syllabus-content-options">
                        <label><input type="radio" name="syllabus-type-0" value="text" checked> Text</label>
                        <label><input type="radio" name="syllabus-type-0" value="picture"> Picture</label>
                        <label><input type="radio" name="syllabus-type-0" value="table"> Table</label>
                    </div>
                    <div class="syllabus-content syllabus-text-content">
                        <textarea class="syllabus-text" placeholder="Enter syllabus details" rows="4" name="syllabus-text[]"></textarea>
                    </div>
                    <div class="syllabus-content syllabus-picture-content" style="display: none;">
                        <input type="file" class="syllabus-image" accept="image/*" name="syllabus-image[]">
                        <div class="syllabus-image-preview" style="display: none;">
                            <img class="syllabus-image-preview-img" src="" alt="Preview">
                            <button type="button" class="remove-image-btn" onclick="removeSyllabusImagePreview(this)">Remove</button>
                        </div>
                    </div>
                    <div class="syllabus-content syllabus-table-content" style="display: none;">
                        <div class="syllabus-table-editor">
                            <div class="table-editor-controls">
                                <input type="number" class="syllabus-table-rows" placeholder="Rows" min="1" value="3" style="width: 100px;">
                                <input type="number" class="syllabus-table-cols" placeholder="Columns" min="1" value="3" style="width: 100px;">
                                <button type="button" class="btn-secondary" onclick="generateSyllabusItemTable(this)">Generate Table</button>
                                <button type="button" class="btn-secondary" onclick="cancelSyllabusItemTable(this)">Cancel</button>
                            </div>
                            <div class="syllabus-table-preview" style="margin-top: 15px; overflow-x: auto;"></div>
                        </div>
                    </div>
                    <button type="button" class="remove-syllabus-btn" onclick="removeSyllabusItem(this)" style="display: none;">Remove</button>
                </div>
            `;
            setupSyllabusInputs();
        }
    }

    // Load cutoffs
    if (exam.cutoffs && Array.isArray(exam.cutoffs) && exam.cutoffs.length > 0) {
        const container = document.getElementById('exam-cutoff-container');
        if (container) {
            container.innerHTML = '';
            exam.cutoffs.forEach((cutoff, index) => {
                addCutoffItem();
                const items = container.querySelectorAll('.cutoff-item');
                const lastItem = items[items.length - 1];
                
                // Set caption
                const captionInput = lastItem.querySelector('.cutoff-caption');
                if (captionInput) {
                    captionInput.value = cutoff.caption || '';
                }
                
                // Set type
                const typeRadios = lastItem.querySelectorAll(`input[name^="cutoff-type-"]`);
                typeRadios.forEach(radio => {
                    if (radio.value === cutoff.type) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change'));
                        handleCutoffTypeChange(lastItem, cutoff.type);
                        
                        // Set content based on type
                        if (cutoff.type === 'picture' && cutoff.imagePath) {
                            const previewImg = lastItem.querySelector('.cutoff-image-preview-img');
                            const preview = lastItem.querySelector('.cutoff-image-preview');
                            if (previewImg && preview) {
                                // Use the imagePath as-is since server already normalizes it
                                let imagePath = cutoff.imagePath.trim();
                                // Only add leading slash if it's a relative path and doesn't start with http, data, or blob
                                if (!imagePath.startsWith('http') && !imagePath.startsWith('/') && !imagePath.startsWith('data:') && !imagePath.startsWith('blob:')) {
                                    imagePath = '/' + imagePath;
                                }
                                // Ensure the path is properly formatted
                                if (imagePath && imagePath !== '/') {
                                    previewImg.src = imagePath;
                                    previewImg.onerror = function() {
                                        console.error('Failed to load cutoff image:', imagePath);
                                        this.style.display = 'none';
                                    };
                                    previewImg.onload = function() {
                                        preview.style.display = 'block';
                                    };
                                    preview.style.display = 'block';
                                    lastItem.dataset.imagePath = imagePath;
                                }
                            }
                        } else if (cutoff.type === 'table' && cutoff.table) {
                            const preview = lastItem.querySelector('.cutoff-table-preview');
                            if (preview) {
                                preview.innerHTML = cutoff.table;
                                lastItem.dataset.tableHtml = cutoff.table;
                                
                                const table = preview.querySelector('.cutoff-table');
                                if (table) {
                                    const updateTableHtml = () => {
                                        lastItem.dataset.tableHtml = preview.innerHTML;
                                    };
                                    
                                    table.addEventListener('input', updateTableHtml);
                                    table.addEventListener('blur', updateTableHtml, true);
                                    table.addEventListener('focusout', updateTableHtml);
                                    
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
            setupCutoffInputs();
        }
    } else {
        // Reset to default if no cutoffs
        const container = document.getElementById('exam-cutoff-container');
        if (container) {
            container.innerHTML = `
                <div class="cutoff-item">
                    <input type="text" class="cutoff-caption" placeholder="Cut Off Caption (e.g., 2023 Cut Off, Category-wise Cut Off)" name="cutoff-caption[]">
                    <div class="cutoff-content-options">
                        <label><input type="radio" name="cutoff-type-0" value="picture" checked> Picture</label>
                        <label><input type="radio" name="cutoff-type-0" value="table"> Table</label>
                    </div>
                    <div class="cutoff-content cutoff-picture-content">
                        <input type="file" class="cutoff-image" accept="image/*" name="cutoff-image[]">
                        <div class="cutoff-image-preview" style="display: none;">
                            <img class="cutoff-image-preview-img" src="" alt="Preview">
                            <button type="button" class="remove-image-btn" onclick="removeCutoffImagePreview(this)">Remove</button>
                        </div>
                    </div>
                    <div class="cutoff-content cutoff-table-content" style="display: none;">
                        <div class="cutoff-table-editor">
                            <div class="table-editor-controls">
                                <input type="number" class="cutoff-table-rows" placeholder="Rows" min="1" value="3" style="width: 100px;">
                                <input type="number" class="cutoff-table-cols" placeholder="Columns" min="1" value="3" style="width: 100px;">
                                <button type="button" class="btn-secondary" onclick="generateCutoffItemTable(this)">Generate Table</button>
                                <button type="button" class="btn-secondary" onclick="cancelCutoffItemTable(this)">Cancel</button>
                            </div>
                            <div class="cutoff-table-preview" style="margin-top: 15px; overflow-x: auto;"></div>
                        </div>
                    </div>
                    <button type="button" class="remove-cutoff-btn" onclick="removeCutoffItem(this)" style="display: none;">Remove</button>
                </div>
            `;
            setupCutoffInputs();
        }
    }

    // Load tables (legacy - for backward compatibility)
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
    ['about-exam-image', 'exam-syllabus-image', 'cutoff-image'].forEach(id => {
        removeImagePreview(id);
    });

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
    
    // Reset syllabus items
    const syllabusContainer = document.getElementById('exam-syllabus-container');
    if (syllabusContainer) {
        syllabusContainer.innerHTML = `
            <div class="syllabus-item">
                <input type="text" class="syllabus-caption" placeholder="Syllabus Caption (e.g., Mathematics Syllabus, Physics Syllabus)" name="syllabus-caption[]">
                <div class="syllabus-content-options">
                    <label><input type="radio" name="syllabus-type-0" value="text" checked> Text</label>
                    <label><input type="radio" name="syllabus-type-0" value="picture"> Picture</label>
                    <label><input type="radio" name="syllabus-type-0" value="table"> Table</label>
                </div>
                <div class="syllabus-content syllabus-text-content">
                    <textarea class="syllabus-text" placeholder="Enter syllabus details" rows="4" name="syllabus-text[]"></textarea>
                </div>
                <div class="syllabus-content syllabus-picture-content" style="display: none;">
                    <input type="file" class="syllabus-image" accept="image/*" name="syllabus-image[]">
                    <div class="syllabus-image-preview" style="display: none;">
                        <img class="syllabus-image-preview-img" src="" alt="Preview">
                        <button type="button" class="remove-image-btn" onclick="removeSyllabusImagePreview(this)">Remove</button>
                    </div>
                </div>
                <div class="syllabus-content syllabus-table-content" style="display: none;">
                    <div class="syllabus-table-editor">
                        <div class="table-editor-controls">
                            <input type="number" class="syllabus-table-rows" placeholder="Rows" min="1" value="3" style="width: 100px;">
                            <input type="number" class="syllabus-table-cols" placeholder="Columns" min="1" value="3" style="width: 100px;">
                            <button type="button" class="btn-secondary" onclick="generateSyllabusItemTable(this)">Generate Table</button>
                            <button type="button" class="btn-secondary" onclick="cancelSyllabusItemTable(this)">Cancel</button>
                        </div>
                        <div class="syllabus-table-preview" style="margin-top: 15px; overflow-x: auto;"></div>
                    </div>
                </div>
                <button type="button" class="remove-syllabus-btn" onclick="removeSyllabusItem(this)" style="display: none;">Remove</button>
            </div>
        `;
        setupSyllabusInputs();
    }
    
    // Reset cutoff items
    const cutoffContainer = document.getElementById('exam-cutoff-container');
    if (cutoffContainer) {
        cutoffContainer.innerHTML = `
            <div class="cutoff-item">
                <input type="text" class="cutoff-caption" placeholder="Cut Off Caption (e.g., 2023 Cut Off, Category-wise Cut Off)" name="cutoff-caption[]">
                <div class="cutoff-content-options">
                    <label><input type="radio" name="cutoff-type-0" value="picture" checked> Picture</label>
                    <label><input type="radio" name="cutoff-type-0" value="table"> Table</label>
                </div>
                <div class="cutoff-content cutoff-picture-content">
                    <input type="file" class="cutoff-image" accept="image/*" name="cutoff-image[]">
                    <div class="cutoff-image-preview" style="display: none;">
                        <img class="cutoff-image-preview-img" src="" alt="Preview">
                        <button type="button" class="remove-image-btn" onclick="removeCutoffImagePreview(this)">Remove</button>
                    </div>
                </div>
                <div class="cutoff-content cutoff-table-content" style="display: none;">
                    <div class="cutoff-table-editor">
                        <div class="table-editor-controls">
                            <input type="number" class="cutoff-table-rows" placeholder="Rows" min="1" value="3" style="width: 100px;">
                            <input type="number" class="cutoff-table-cols" placeholder="Columns" min="1" value="3" style="width: 100px;">
                            <button type="button" class="btn-secondary" onclick="generateCutoffItemTable(this)">Generate Table</button>
                            <button type="button" class="btn-secondary" onclick="cancelCutoffItemTable(this)">Cancel</button>
                        </div>
                        <div class="cutoff-table-preview" style="margin-top: 15px; overflow-x: auto;"></div>
                    </div>
                </div>
                <button type="button" class="remove-cutoff-btn" onclick="removeCutoffItem(this)" style="display: none;">Remove</button>
            </div>
        `;
        setupCutoffInputs();
    }
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
window.addSyllabusItem = addSyllabusItem;
window.removeSyllabusItem = removeSyllabusItem;
window.removeSyllabusImagePreview = removeSyllabusImagePreview;
window.generateSyllabusItemTable = generateSyllabusItemTable;
window.cancelSyllabusItemTable = cancelSyllabusItemTable;
window.addCutoffItem = addCutoffItem;
window.removeCutoffItem = removeCutoffItem;
window.removeCutoffImagePreview = removeCutoffImagePreview;
window.generateCutoffItemTable = generateCutoffItemTable;
window.cancelCutoffItemTable = cancelCutoffItemTable;
window.removeImagePreview = removeImagePreview;
window.resetExamDetailsForm = resetExamDetailsForm;



