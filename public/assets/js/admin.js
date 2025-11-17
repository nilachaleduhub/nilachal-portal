document.addEventListener('DOMContentLoaded', () => {
    // --- Admin Auth Modal Logic ---
    const authModal = document.getElementById('admin-auth-modal');
    const loginForm = document.getElementById('admin-login-form');
    const authTitle = document.getElementById('auth-title');
    const authError = document.getElementById('admin-auth-error');
    const container = document.querySelector('.containernew');

    function showAuthModal(show) {
        authModal.style.display = show ? 'flex' : 'none';
        if (container) container.style.display = show ? 'none' : 'block';
    }
    function setAuthError(msg) { authError.textContent = msg || ''; }

    // Helper function to get admin token from localStorage
    function getAdminToken() {
        return localStorage.getItem('adminToken');
    }

    // Helper function to create authenticated fetch options
    function getAuthHeaders(additionalHeaders = {}) {
        const token = getAdminToken();
        return {
            ...additionalHeaders,
            'Content-Type': 'application/json',
            'X-Admin-Token': token || ''
        };
    }

    // Helper function for authenticated fetch calls to admin API
    async function adminFetch(url, options = {}) {
        const token = getAdminToken();
        const headers = {
            'Content-Type': 'application/json',
            'X-Admin-Token': token || '',
            ...(options.headers || {})
        };
        
        // Merge headers, but don't override Content-Type if it's set for FormData
        if (options.body instanceof FormData) {
            delete headers['Content-Type']; // Let browser set it for FormData
        }
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        // If unauthorized, clear token and show login
        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            showAuthModal(true);
            throw new Error('Session expired. Please login again.');
        }
        
        return response;
    }

    // Check for token in localStorage
    let adminToken = getAdminToken();
    if (!adminToken) {
        showAuthModal(true);
    }

    // Admin logout button
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            // Show auth modal and hide main container
            showAuthModal(true);
            // Optionally reload to reset UI state
            setTimeout(() => { window.location.reload(); }, 150);
        });
    }



    // Function to initialize admin panel navigation
    function initializeAdminNavigation() {
        // --- Main Menu Navigation ---
        const mainMenuSection = document.getElementById('main-menu-section');
        const mocktestsSection = document.getElementById('mocktests-section');
        const mocktestsBtn = document.getElementById('mocktests-btn');
        const backToMainBtn = document.getElementById('back-to-main-btn');
        
        // Show Mocktests section when Mocktests button is clicked
        if (mocktestsBtn && !mocktestsBtn.dataset.listenerAttached) {
            mocktestsBtn.dataset.listenerAttached = 'true';
            mocktestsBtn.addEventListener('click', () => {
                if (mainMenuSection) mainMenuSection.style.display = 'none';
                if (mocktestsSection) mocktestsSection.style.display = 'block';
                // Setup nav buttons when mocktests section is shown
                setTimeout(() => {
                    if (typeof setupAdminNavButtons === 'function') {
                        setupAdminNavButtons();
                    } else if (window.setupAdminNavButtons) {
                        window.setupAdminNavButtons();
                    }
                }, 50);
                // Show categories section by default
                const categoriesSection = document.getElementById('categories-section');
                if (categoriesSection) {
                    categoriesSection.style.display = 'block';
                    categoriesSection.style.opacity = '0';
                    categoriesSection.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        categoriesSection.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        categoriesSection.style.opacity = '1';
                        categoriesSection.style.transform = 'translateY(0)';
                    }, 10);
                }
            });
        }
        
        // Go back to main menu when Back button is clicked
        if (backToMainBtn && !backToMainBtn.dataset.listenerAttached) {
            backToMainBtn.dataset.listenerAttached = 'true';
            backToMainBtn.addEventListener('click', () => {
                if (mocktestsSection) mocktestsSection.style.display = 'none';
                if (mainMenuSection) mainMenuSection.style.display = 'block';
                // Hide all content sections
                ['categories','exams','tests','questions'].forEach(name => {
                    const el = document.getElementById(`${name}-section`);
                    if (el) el.style.display = 'none';
                });
            });
        }

        // (moved subject change and media list rendering to initAddMediaSection)
        // --- Courses Section Navigation ---
        const coursesSection = document.getElementById('courses-section');
        const coursesBtn = document.getElementById('courses-btn');
        const backToMainFromCoursesBtn = document.getElementById('back-to-main-from-courses-btn');
        
        // Show Courses section when Courses button is clicked
        if (coursesBtn && !coursesBtn.dataset.listenerAttached) {
            coursesBtn.dataset.listenerAttached = 'true';
            coursesBtn.addEventListener('click', () => {
                if (mainMenuSection) mainMenuSection.style.display = 'none';
                if (coursesSection) coursesSection.style.display = 'block';
                // Show course categories section by default
                const courseCategoriesSection = document.getElementById('course-categories-section');
                if (courseCategoriesSection) {
                    courseCategoriesSection.style.display = 'block';
                    courseCategoriesSection.style.opacity = '0';
                    courseCategoriesSection.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        courseCategoriesSection.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        courseCategoriesSection.style.opacity = '1';
                        courseCategoriesSection.style.transform = 'translateY(0)';
                    }, 10);
                }
                loadCourseCategories();
            });
        }
        
        // Go back to main menu from Courses section
        if (backToMainFromCoursesBtn && !backToMainFromCoursesBtn.dataset.listenerAttached) {
            backToMainFromCoursesBtn.dataset.listenerAttached = 'true';
            backToMainFromCoursesBtn.addEventListener('click', () => {
                if (coursesSection) coursesSection.style.display = 'none';
                if (mainMenuSection) mainMenuSection.style.display = 'block';
                // Hide all course content sections
                ['course-categories','courses-list','lessons'].forEach(name => {
                    const el = document.getElementById(`${name}-section`);
                    if (el) el.style.display = 'none';
                });
            });
        }

        // --- Dashboard Navigation ---
        const dashboardBtn = document.getElementById('dashboard-btn');
        if (dashboardBtn && !dashboardBtn.dataset.listenerAttached) {
            dashboardBtn.dataset.listenerAttached = 'true';
            dashboardBtn.addEventListener('click', () => {
                window.location.href = 'admin-dashboard.html';
            });
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setAuthError('');
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;
        if (!username || !password) return setAuthError('Username and password required');
        try {
            // Login endpoint doesn't need token
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success && data.token) {
                localStorage.setItem('adminToken', data.token);
                showAuthModal(false);
                // Initialize navigation after successful login
                initializeAdminNavigation();
            } else {
                setAuthError(data.message || 'Login failed');
            }
        } catch (err) {
            setAuthError('Server error');
        }
    });



    // If not logged in, block admin panel
    if (!adminToken) return;
    
    // Initialize navigation if already logged in
    initializeAdminNavigation();
    
    // --- Navigation Elements ---
    const navButtons = document.querySelectorAll('.nav-btn');
    // Build sections map only for elements that exist in the DOM
    const sections = {};
    ['categories','exams','tests','questions'].forEach(name => {
        const el = document.getElementById(`${name}-section`);
        if (el) sections[name] = el;
    });

    // --- Navigation Functionality ---
    // Function to setup navigation for admin nav buttons
    function setupAdminNavButtons() {
        // Find admin-nav inside mocktests-section specifically
        const mocktestsSection = document.getElementById('mocktests-section');
        const adminNav = mocktestsSection ? mocktestsSection.querySelector('.admin-nav') : null;
        
        if (adminNav && !adminNav.dataset.listenerAttached) {
            adminNav.dataset.listenerAttached = 'true';
            adminNav.addEventListener('click', (e) => {
                const button = e.target.closest('.nav-btn');
                if (!button) return;
                const targetSection = button.dataset.section;
                if (!targetSection) return;

                // Remove active class from nav buttons inside the admin nav
                const adminNavButtons = adminNav.querySelectorAll('.nav-btn');
                adminNavButtons.forEach(btn => btn.classList.remove('active'));

                // Activate clicked button
                button.classList.add('active');

                // Hide all existing sections
                Object.values(sections).forEach(section => {
                    if (section && section.style) section.style.display = 'none';
                });

                // Show the requested section if present
                const targetEl = sections[targetSection];
                if (targetEl) {
                    targetEl.style.display = 'block';
                    targetEl.style.opacity = '0';
                    targetEl.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        targetEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        targetEl.style.opacity = '1';
                        targetEl.style.transform = 'translateY(0)';
                    }, 10);
                }
            });
        }
    }
    
    // Make setupAdminNavButtons available globally for initializeAdminNavigation
    window.setupAdminNavButtons = setupAdminNavButtons;
    
    // Setup navigation buttons initially
    setupAdminNavButtons();

    // --- DOM Elements ---
    const categoryForm = document.getElementById('category-form');
    const categoryIdInput = document.getElementById('category-id');
    const categoryNameInput = document.getElementById('category-name');
    const categoryDescInput = document.getElementById('category-desc');
    const categoryCourseDetailsInput = document.getElementById('category-course-details');
    const categoryCourseCostInput = document.getElementById('category-course-cost');
    const categoryValidityValueInput = document.getElementById('category-validity-value');
    const categoryValidityUnitSelect = document.getElementById('category-validity-unit');
    const categoryDiscountYes = document.getElementById('category-discount-yes');
    const categoryDiscountNo = document.getElementById('category-discount-no');
    const categoryDiscountFields = document.getElementById('category-discount-fields');
    const categoryDiscountPercentInput = document.getElementById('category-discount-percent');
    const categoryDiscountCodeInput = document.getElementById('category-discount-code');
    const categoryDiscountMessageInput = document.getElementById('category-discount-message');
    const categoryList = document.getElementById('category-list');

    const examForm = document.getElementById('exam-form');
    const examIdInput = document.getElementById('exam-id');
    const examCategorySelect = document.getElementById('exam-category-select');
    const examNameInput = document.getElementById('exam-name');
    const examDescInput = document.getElementById('exam-desc');
    const examCourseDetailsInput = document.getElementById('exam-course-details');
    const examCourseCostInput = document.getElementById('exam-course-cost');
    const examValidityValueInput = document.getElementById('exam-validity-value');
    const examValidityUnitSelect = document.getElementById('exam-validity-unit');
    const examDiscountYes = document.getElementById('exam-discount-yes');
    const examDiscountNo = document.getElementById('exam-discount-no');
    const examDiscountFields = document.getElementById('exam-discount-fields');
    const examDiscountPercentInput = document.getElementById('exam-discount-percent');
    const examDiscountCodeInput = document.getElementById('exam-discount-code');
    const examDiscountMessageInput = document.getElementById('exam-discount-message');
    const examList = document.getElementById('exam-list');

    const testForm = document.getElementById('test-form');
    const testIdInput = document.getElementById('test-id');
    const testCategorySelect = document.getElementById('test-category-select');
    const testExamSelect = document.getElementById('test-exam-select');
    const testNameInput = document.getElementById('test-name-select');
    const testNumQuestionsInput = document.getElementById('test-num-questions');
    const testTimeLimitInput = document.getElementById('test-time-limit');
    const testPositiveMarkInput = document.getElementById('test-positive-mark');
    const testNegativeMarkInput = document.getElementById('test-negative-mark');
    const testHasSectionsYes = document.getElementById('test-has-sections-yes');
    const testHasSectionsNo = document.getElementById('test-has-sections-no');
    const testIsFreeYes = document.getElementById('test-is-free-yes');
    const testIsFreeNo = document.getElementById('test-is-free-no');
    const questionsContainer = document.getElementById('questions-container');
    // Sections configuration elements (create form)
    const testSectionsContainer = document.getElementById('test-sections-container');
    const testNumSectionsInput = document.getElementById('test-num-sections');
    const configureSectionsBtn = document.getElementById('configure-sections-btn');
    const testSectionRows = document.getElementById('test-section-rows');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const autoCreateQuestionsBtn = document.getElementById('auto-create-questions-btn');
    const testList = document.getElementById('test-list');
    const questionCountSpan = document.getElementById('question-count');

    // --- New elements for Question Form ---
    const questionForm = document.getElementById('question-form');
    const questionCategorySelect = document.getElementById('question-category-select');
    const questionExamSelect = document.getElementById('question-exam-select');
    const questionTestSelect = document.getElementById('question-test-select');

    // --- Data Storage Keys ---
    const ADMIN_CATEGORIES_KEY = 'adminCategories';
    const EXAM_DATA_PREFIX = 'examData_';
    const TEST_DATA_PREFIX = 'testData_';

    // --- Utility Functions ---
    const getFromLS = (key, defaultValue = []) => JSON.parse(localStorage.getItem(key)) || defaultValue;
    const saveToLS = (key, data) => localStorage.setItem(key, JSON.stringify(data));
    const generateId = () => `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const VALIDITY_UNIT_LABELS = {
        day: 'Day',
        month: 'Month',
        year: 'Year'
    };

    function formatValidity(value, unit) {
        if (!value || !unit) return '';
        const numericValue = parseInt(value, 10);
        if (Number.isNaN(numericValue) || numericValue <= 0) return '';
        const label = VALIDITY_UNIT_LABELS[unit] || unit;
        const suffix = numericValue === 1 ? label : `${label}s`;
        return `${numericValue} ${suffix}`;
    }

    function parseValidityString(input) {
        if (!input || typeof input !== 'string') {
            return { value: '', unit: '' };
        }
        const match = input.trim().match(/^(\d+)\s*([a-zA-Z]+)/);
        if (!match) {
            return { value: '', unit: '' };
        }
        const value = match[1];
        let unit = match[2].toLowerCase();
        if (unit.endsWith('s')) {
            unit = unit.slice(0, -1);
        }
        if (!VALIDITY_UNIT_LABELS[unit]) {
            return { value: '', unit: '' };
        }
        return { value, unit };
    }

    function resolveValidityParts(entity = {}) {
        if (entity && entity.validityValue && entity.validityUnit) {
            return {
                value: entity.validityValue,
                unit: entity.validityUnit
            };
        }
        return parseValidityString(entity.courseValidity || '');
    }

    function normaliseDiscountCode(code) {
        if (!code) return '';
        return String(code).trim().toUpperCase();
    }

    function toggleDiscountSection(sectionEl, shouldShow, inputs = []) {
        if (!sectionEl) return;
        sectionEl.style.display = shouldShow ? 'block' : 'none';
        if (!shouldShow && Array.isArray(inputs)) {
            inputs.forEach(input => {
                if (!input) return;
                if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
                    input.value = '';
                }
            });
        }
    }

    const updateCategoryDiscountVisibility = () => {
        const shouldShow = categoryDiscountYes ? !!categoryDiscountYes.checked : false;
        toggleDiscountSection(categoryDiscountFields, shouldShow, [
            categoryDiscountPercentInput,
            categoryDiscountCodeInput,
            categoryDiscountMessageInput
        ]);
    };

    if (categoryDiscountYes && categoryDiscountNo) {
        categoryDiscountYes.addEventListener('change', updateCategoryDiscountVisibility);
        categoryDiscountNo.addEventListener('change', updateCategoryDiscountVisibility);
        updateCategoryDiscountVisibility();
    }

    const updateExamDiscountVisibility = () => {
        const shouldShow = examDiscountYes ? !!examDiscountYes.checked : false;
        toggleDiscountSection(examDiscountFields, shouldShow, [
            examDiscountPercentInput,
            examDiscountCodeInput,
            examDiscountMessageInput
        ]);
    };

    if (examDiscountYes && examDiscountNo) {
        examDiscountYes.addEventListener('change', updateExamDiscountVisibility);
        examDiscountNo.addEventListener('change', updateExamDiscountVisibility);
        updateExamDiscountVisibility();
    }

    // Initialize media handlers for a question block: image preview and table editor
    function initMediaHandlers(block) {
        try {
            const fileInput = block.querySelector('.question-image-file');
            const imgPreview = block.querySelector('.question-image-preview');
            const removeImageBtn = block.querySelector('.remove-image-btn');
            const imageDimensionsContainer = block.querySelector('.image-dimensions-container');
            const imageWidthInput = block.querySelector('.image-width-input');
            const imageHeightInput = block.querySelector('.image-height-input');
            const addTableBtn = block.querySelector('.add-table-btn');
            const removeTableBtn = block.querySelector('.remove-table-btn');
            const tableContainer = block.querySelector('.table-editor-container');
            const tableWrapper = block.querySelector('.table-editor-wrapper');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    
                    // Compress and resize image before converting to base64
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            // Calculate new dimensions (max 1200px width, maintain aspect ratio)
                            const maxWidth = 1200;
                            const maxHeight = 1200;
                            let width = img.width;
                            let height = img.height;
                            
                            if (width > maxWidth || height > maxHeight) {
                                if (width > height) {
                                    height = (height * maxWidth) / width;
                                    width = maxWidth;
                                } else {
                                    width = (width * maxHeight) / height;
                                    height = maxHeight;
                                }
                            }
                            
                            // Create temporary canvas to compress image
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = width;
                            tempCanvas.height = height;
                            const tempCtx = tempCanvas.getContext('2d');
                            tempCtx.drawImage(img, 0, 0, width, height);
                            
                            // Convert to JPEG with 0.85 quality (good balance between size and quality)
                            const compressedDataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
                            
                    imgPreview.src = compressedDataUrl;
                    imgPreview.style.display = 'block';
                    imgPreview.style.visibility = 'visible';
                    if (removeImageBtn) { removeImageBtn.style.display = 'block'; }
                    if (imageDimensionsContainer) { imageDimensionsContainer.style.display = 'block'; }
                    if (tableContainer) { tableContainer.style.display = 'none'; }
                    if (addTableBtn) { addTableBtn.style.display = 'inline-block'; }
                    if (removeTableBtn) { removeTableBtn.style.display = 'none'; }
                            
                            const originalSize = (f.size / 1024).toFixed(2);
                            const compressedSize = ((compressedDataUrl.length * 3) / 4 / 1024).toFixed(2);
                            console.log(`Image compressed: ${originalSize}KB -> ~${compressedSize}KB`);
                        };
                        img.onerror = () => {
                            console.error('Failed to load image');
                            alert('Failed to load image. Please try a different image.');
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(f);
                });
            }

            // Remove image button functionality
            if (removeImageBtn) {
                removeImageBtn.addEventListener('click', () => {
                    // Clear the image preview
                    imgPreview.src = '';
                    imgPreview.style.display = 'none';
                    imgPreview.style.visibility = 'hidden';
                    removeImageBtn.style.display = 'none';
                    // Hide and clear dimension inputs
                    if (imageDimensionsContainer) {
                        imageDimensionsContainer.style.display = 'none';
                    }
                    if (imageWidthInput) {
                        imageWidthInput.value = '';
                    }
                    if (imageHeightInput) {
                        imageHeightInput.value = '';
                    }
                    // Clear the file input
                    if (fileInput) {
                        fileInput.value = '';
                    }
                });
            }

            // Table editor functionality
            if (addTableBtn && tableContainer) {
                addTableBtn.addEventListener('click', () => {
                    imgPreview.style.display = 'none';
                    if (removeImageBtn) { removeImageBtn.style.display = 'none'; }
                    if (imageDimensionsContainer) { imageDimensionsContainer.style.display = 'none'; }
                    tableContainer.style.display = 'block';
                    addTableBtn.style.display = 'none';
                    removeTableBtn.style.display = 'inline-block';
                    // Generate default 2x2 table if empty
                    if (!tableWrapper.querySelector('table')) {
                        generateTableForBlock(block);
                    }
                });
            }

            if (removeTableBtn && tableContainer) {
                removeTableBtn.addEventListener('click', () => {
                    tableContainer.style.display = 'none';
                    addTableBtn.style.display = 'inline-block';
                    removeTableBtn.style.display = 'none';
                    if (tableWrapper) {
                        tableWrapper.innerHTML = '';
                    }
                });
            }

            // Explanation image handler
            const explanationFileInput = block.querySelector('.explanation-image-file');
            const explanationImgPreview = block.querySelector('.explanation-image-preview');
            const removeExplanationImageBtn = block.querySelector('.remove-explanation-image-btn');
            
            if (explanationFileInput) {
                explanationFileInput.addEventListener('change', (e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    
                    // Compress and resize image before converting to base64
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            // Calculate new dimensions (max 1200px width, maintain aspect ratio)
                            const maxWidth = 1200;
                            const maxHeight = 1200;
                            let width = img.width;
                            let height = img.height;
                            
                            if (width > maxWidth || height > maxHeight) {
                                if (width > height) {
                                    height = (height * maxWidth) / width;
                                    width = maxWidth;
                                } else {
                                    width = (width * maxHeight) / height;
                                    height = maxHeight;
                                }
                            }
                            
                            // Create temporary canvas to compress image
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = width;
                            tempCanvas.height = height;
                            const tempCtx = tempCanvas.getContext('2d');
                            tempCtx.drawImage(img, 0, 0, width, height);
                            
                            // Convert to JPEG with 0.85 quality
                            const compressedDataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
                            
                            explanationImgPreview.src = compressedDataUrl;
                            explanationImgPreview.style.display = 'block';
                            if (removeExplanationImageBtn) {
                                removeExplanationImageBtn.style.display = 'block';
                            }
                            
                            const originalSize = (f.size / 1024).toFixed(2);
                            const compressedSize = ((compressedDataUrl.length * 3) / 4 / 1024).toFixed(2);
                            console.log(`Explanation image compressed: ${originalSize}KB -> ~${compressedSize}KB`);
                        };
                        img.onerror = () => {
                            console.error('Failed to load explanation image');
                            alert('Failed to load image. Please try a different image.');
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(f);
                });
            }

            // Remove explanation image button
            if (removeExplanationImageBtn) {
                removeExplanationImageBtn.addEventListener('click', () => {
                    explanationImgPreview.src = '';
                    explanationImgPreview.style.display = 'none';
                    removeExplanationImageBtn.style.display = 'none';
                    if (explanationFileInput) {
                        explanationFileInput.value = '';
                    }
                });
            }
        } catch (err) {
            console.error('initMediaHandlers error', err);
        }
    }

    // Function to convert table cells to editable textareas (for restoring tables)
    function convertTableToEditable(wrapper) {
        const table = wrapper.querySelector('table');
        if (!table) {
            console.warn('No table found in wrapper');
            return;
        }
        
        const cells = table.querySelectorAll('td');
        if (cells.length === 0) {
            console.warn('No cells found in table');
            return;
        }
        
        cells.forEach((td, index) => {
            // Skip if already has a textarea
            if (td.querySelector('.table-cell-input')) {
                return;
            }
            
            // Get text content, converting <br> tags to newlines
            let currentText = td.innerHTML || '';
            // Convert <br> and <br/> to newlines
            currentText = currentText.replace(/<br\s*\/?>/gi, '\n');
            // Remove any remaining HTML tags but preserve text
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = currentText;
            currentText = tempDiv.textContent || tempDiv.innerText || '';
            
            const textarea = document.createElement('textarea');
            textarea.className = 'table-cell-input';
            textarea.value = currentText;
            textarea.placeholder = `Cell ${index + 1}`;
            textarea.style.cssText = 'width:100%; border:none; outline:none; padding:4px; min-height:30px; resize:none; overflow:hidden; font-family:inherit; font-size:inherit;';
            // Auto-resize on input
            textarea.addEventListener('input', function() {
                autoResizeTableCell(this);
            });
            // Initial resize
            setTimeout(() => {
                autoResizeTableCell(textarea);
            }, 10);
            
            // Clear and add textarea
            td.innerHTML = '';
            td.appendChild(textarea);
            td.style.border = '1px solid #ddd';
            td.style.padding = '8px';
            td.style.verticalAlign = 'top';
        });
        
        console.log('Converted', cells.length, 'table cells to editable textareas');
    }
    
    // Function to auto-resize table cell based on content
    function autoResizeTableCell(textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set height based on content, with min height
        const newHeight = Math.max(30, textarea.scrollHeight);
        textarea.style.height = newHeight + 'px';
        
        // Also adjust row height if needed - find max height in row
        const td = textarea.parentElement;
        const tr = td.parentElement;
        if (tr) {
            let maxHeight = 0;
            tr.querySelectorAll('.table-cell-input').forEach(cell => {
                cell.style.height = 'auto';
                maxHeight = Math.max(maxHeight, cell.scrollHeight);
                cell.style.height = Math.max(30, cell.scrollHeight) + 'px';
            });
        }
    }
    
    // Table generation function (global for onclick)
    window.generateTable = function(btn) {
        const container = btn.closest('.table-editor-container');
        const wrapper = container.querySelector('.table-editor-wrapper');
        const rowsInput = container.querySelector('.table-rows-input');
        const colsInput = container.querySelector('.table-cols-input');
        const rows = parseInt(rowsInput.value) || 2;
        const cols = parseInt(colsInput.value) || 2;
        
        let html = '<table style="width:100%; border-collapse:collapse; border:1px solid #ddd; margin-top:8px; table-layout:auto;">';
        for (let r = 0; r < rows; r++) {
            html += '<tr>';
            for (let c = 0; c < cols; c++) {
                html += `<td style="border:1px solid #ddd; padding:8px; vertical-align:top;"><input type="text" class="table-cell-input" placeholder="Cell ${r+1},${c+1}" style="width:100%; border:none; outline:none; padding:4px; min-height:30px; resize:none;"></td>`;
            }
            html += '</tr>';
        }
        html += '</table>';
        wrapper.innerHTML = html;
        
        // Add auto-resize listeners to all inputs
        const inputs = wrapper.querySelectorAll('.table-cell-input');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                autoResizeTableCell(this);
            });
        });
    };
    
    // Helper function to generate table for a block
    function generateTableForBlock(block) {
        const container = block.querySelector('.table-editor-container');
        const wrapper = container.querySelector('.table-editor-wrapper');
        const rowsInput = container.querySelector('.table-rows-input');
        const colsInput = container.querySelector('.table-cols-input');
        const rows = parseInt(rowsInput.value) || 2;
        const cols = parseInt(colsInput.value) || 2;
        
        let html = '<table style="width:100%; border-collapse:collapse; border:1px solid #ddd; margin-top:8px; table-layout:auto;">';
        for (let r = 0; r < rows; r++) {
            html += '<tr>';
            for (let c = 0; c < cols; c++) {
                html += `<td style="border:1px solid #ddd; padding:8px; vertical-align:top;"><textarea class="table-cell-input" placeholder="Cell ${r+1},${c+1}" style="width:100%; border:none; outline:none; padding:4px; min-height:30px; resize:none; overflow:hidden; font-family:inherit; font-size:inherit;"></textarea></td>`;
            }
            html += '</tr>';
        }
        html += '</table>';
        wrapper.innerHTML = html;
        
        // Add auto-resize listeners to all textareas
        const textareas = wrapper.querySelectorAll('.table-cell-input');
        textareas.forEach(textarea => {
            textarea.addEventListener('input', function() {
                autoResizeTableCell(this);
            });
            // Initial resize
            autoResizeTableCell(textarea);
        });
    }

    // --- Question Management ---
    let questionCounter = 0;
    
    function addQuestionBlock(questionNumber = null, sectionIndex = null) {
        questionCounter++;
        const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const displayNumber = questionNumber || questionCounter;

        const questionBlock = document.createElement('div');
        questionBlock.className = 'question-block';
        questionBlock.id = questionId;
        if (sectionIndex !== null && typeof sectionIndex !== 'undefined') {
            questionBlock.dataset.sectionIndex = sectionIndex;
        }

        const headerLabel = (sectionIndex !== null && typeof sectionIndex !== 'undefined') ? `Section ${parseInt(sectionIndex) + 1} - Question ${displayNumber}` : `Question ${displayNumber}`;

        questionBlock.innerHTML = `
            <h4>
                ${headerLabel}
                <button type="button" class="btn-red-small" onclick="document.getElementById('${questionId}').remove(); updateQuestionCount();">Remove</button>
            </h4>
            <textarea class="question-text" placeholder="Question text" required></textarea>
            <div class="media-controls">
                <label class="file-label">Attach image <input type="file" class="question-image-file" accept="image/*"></label>
                <button type="button" class="btn-gray add-table-btn">Add Table</button>
                <button type="button" class="btn-gray remove-table-btn" style="display:none;">Remove Table</button>
                <div class="image-preview-wrap" style="position:relative; display:inline-block;">
                    <img class="question-image-preview" style="max-width:100%; display:none; margin-top:8px;"/>
                    <button type="button" class="remove-image-btn" style="display:none; position:absolute; top:8px; right:8px; background:#ff4444; color:white; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer; font-size:16px; line-height:1; box-shadow:0 2px 4px rgba(0,0,0,0.2);" title="Remove image">×</button>
                </div>
                <div class="image-dimensions-container" style="display:none; margin-top:8px; padding:8px; background:#f5f5f5; border-radius:4px;">
                    <label style="margin-right:12px;">Width (cm): <input type="number" class="image-width-input" min="0.1" step="0.1" style="width:80px; padding:4px; border:1px solid #ddd; border-radius:4px; font-size:14px;" placeholder="Auto"></label>
                    <label>Height (cm): <input type="number" class="image-height-input" min="0.1" step="0.1" style="width:80px; padding:4px; border:1px solid #ddd; border-radius:4px; font-size:14px;" placeholder="Auto"></label>
                </div>
                <div class="table-editor-container" style="display:none; margin-top:8px; border:1px solid #ddd; padding:12px; background:#fff; border-radius:4px;">
                    <div style="margin-bottom:8px;">
                        <label style="margin-right:12px;">Rows: <input type="number" class="table-rows-input" value="2" min="1" max="10" style="width:80px; padding:6px; border:1px solid #ddd; border-radius:4px; font-size:14px;"></label>
                        <label style="margin-right:12px;">Columns: <input type="number" class="table-cols-input" value="2" min="1" max="10" style="width:80px; padding:6px; border:1px solid #ddd; border-radius:4px; font-size:14px;"></label>
                        <button type="button" class="btn-gray" style="padding:6px 16px; font-size:0.9rem;" onclick="generateTable(this)">Generate Table</button>
                    </div>
                    <div class="table-editor-wrapper"></div>
                </div>
            </div>
            <div class="options-grid">
                <div class="option-item">
                    <input type="radio" name="correct-answer-${questionId}" value="0" required>
                    <input type="text" class="option-text" placeholder="Option 1" required>
                </div>
                <div class="option-item">
                    <input type="radio" name="correct-answer-${questionId}" value="1" required>
                    <input type="text" class="option-text" placeholder="Option 2" required>
                </div>
                <div class="option-item">
                    <input type="radio" name="correct-answer-${questionId}" value="2" required>
                    <input type="text" class="option-text" placeholder="Option 3" required>
                </div>
                <div class="option-item">
                    <input type="radio" name="correct-answer-${questionId}" value="3" required>
                    <input type="text" class="option-text" placeholder="Option 4" required>
                </div>
            </div>
            <textarea class="explanation-text" placeholder="Answer explanation"></textarea>
            <div class="explanation-image-controls" style="margin-top: 8px;">
                <label class="file-label" style="display: inline-block; margin-right: 10px;">Attach explanation image <input type="file" class="explanation-image-file" accept="image/*"></label>
                <div class="explanation-image-preview-wrap" style="position:relative; display:inline-block; margin-top:8px;">
                    <img class="explanation-image-preview" style="max-width:300px; max-height:200px; display:none; margin-top:8px; border-radius:8px; border:1px solid #ddd;"/>
                    <button type="button" class="remove-explanation-image-btn" style="display:none; position:absolute; top:8px; right:8px; background:#ff4444; color:white; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer; font-size:16px; line-height:1; box-shadow:0 2px 4px rgba(0,0,0,0.2);" title="Remove image">×</button>
                </div>
            </div>
        `;

        // Append to proper container
        if (sectionIndex !== null && typeof sectionIndex !== 'undefined') {
            const secContainer = document.getElementById(`section-questions-${sectionIndex}`);
            if (secContainer) {
                secContainer.appendChild(questionBlock);
            } else {
                questionsContainer.appendChild(questionBlock);
            }
        } else {
            questionsContainer.appendChild(questionBlock);
        }

        // Initialize media handlers (drawing, file preview)
        if (typeof initMediaHandlers === 'function') {
            initMediaHandlers(questionBlock);
        }
    }

    // --- Sections UI Helpers ---
    function renderSectionRows(num) {
        testSectionRows.innerHTML = '';
        const n = parseInt(num) || 0;
        for (let i = 1; i <= n; i++) {
            const row = document.createElement('div');
            row.className = 'section-row';
            row.dataset.index = i - 1;
            row.innerHTML = `
                <h4>Section ${i}</h4>
                <input type="text" class="section-name" placeholder="Section name">
                <input type="number" class="section-num-questions" min="1" placeholder="Questions in this section">
                <label>Sectional timing?</label>
                <label><input type="radio" name="section-timing-${i}" value="yes" class="section-timing-yes"> Yes</label>
                <label><input type="radio" name="section-timing-${i}" value="no" class="section-timing-no" checked> No</label>
                <input type="number" class="section-time-limit" min="1" placeholder="Time (minutes)" style="display:none; width:150px; margin-left:6px;">
                <hr>
            `;
            testSectionRows.appendChild(row);
            // wire timing radios
            const yes = row.querySelector('.section-timing-yes');
            const no = row.querySelector('.section-timing-no');
            const timeInput = row.querySelector('.section-time-limit');
            yes.addEventListener('change', () => { timeInput.style.display = 'inline-block'; });
            no.addEventListener('change', () => { timeInput.style.display = 'none'; timeInput.value = ''; });
        }
    }

    // Show/hide sections container when radios change
    if (testHasSectionsYes && testHasSectionsNo) {
        testHasSectionsYes.addEventListener('change', () => {
            testSectionsContainer.style.display = 'block';
        });
        testHasSectionsNo.addEventListener('change', () => {
            testSectionsContainer.style.display = 'none';
        });
    }

    configureSectionsBtn && configureSectionsBtn.addEventListener('click', () => {
        const num = testNumSectionsInput.value;
        if (!num || parseInt(num) < 1) {
            alert('Please enter a valid number of sections (>=1)');
            return;
        }
        renderSectionRows(num);
    });
    
    addQuestionBtn.addEventListener('click', () => {
        addQuestionBlock();
        updateQuestionCount();
    });
    
    autoCreateQuestionsBtn.addEventListener('click', () => {
        autoCreateQuestionSpaces();
    });

    window.updateQuestionCount = () => {
        const count = questionsContainer.getElementsByClassName('question-block').length;
        questionCountSpan.textContent = `(${count})`;
        // Re-number questions
        const questionBlocks = questionsContainer.getElementsByClassName('question-block');
        for(let i = 0; i < questionBlocks.length; i++) {
            questionBlocks[i].querySelector('h4').firstChild.textContent = `Question ${i + 1} `;
        }
        questionCounter = count;
    };

    // --- Event Listeners for Dropdown Changes ---
    testCategorySelect.addEventListener('change', populateTestExamSelect);
    testExamSelect.addEventListener('change', populateTestNameSelect);
    questionCategorySelect.addEventListener('change', populateQuestionExamSelect);
    questionExamSelect.addEventListener('change', populateQuestionTestSelect);
    questionTestSelect.addEventListener('change', loadSelectedTestQuestions);
    

    // --- Render Functions ---
    function renderCategories() {
        const categories = getFromLS(ADMIN_CATEGORIES_KEY);
        categoryList.innerHTML = '';
        examCategorySelect.innerHTML = '<option value="">-- Select a Category --</option>';
        testCategorySelect.innerHTML = '<option value="">-- Select Category --</option>';
        questionCategorySelect.innerHTML = '<option value="">-- Select Category --</option>';

        categories.forEach(cat => {
            // Render list item
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-info">
                    <strong>${cat.name}</strong>
                    <span>ID: ${cat.id}</span>
                    ${cat.description ? `<span>Description: ${cat.description}</span>` : ''}
                    ${cat.courseDetails ? `<span>Course Details: ${cat.courseDetails}</span>` : ''}
                    ${cat.courseCost ? `<span>Price: ${cat.courseCost}</span>` : ''}
                    ${cat.courseValidity ? `<span>Validity: ${cat.courseValidity}</span>` : ''}
                    ${cat.hasDiscount ? `<span>Discount: ${cat.discountPercent || 0}%${cat.discountCode ? ` (Code: ${cat.discountCode})` : ''}</span>` : ''}
                    ${cat.discountMessage ? `<span>Discount Message: ${cat.discountMessage}</span>` : ''}
                </div>
                <div class="list-item-actions">
                    <button class="btn-edit" data-id="${cat.id}">Edit</button>
                    <button class="btn-delete" data-id="${cat.id}">Delete</button>
                </div>
            `;
            categoryList.appendChild(item);

            // Populate select dropdowns
            const option = new Option(cat.name, cat.id);
            examCategorySelect.add(option.cloneNode(true));
            testCategorySelect.add(option.cloneNode(true));
            questionCategorySelect.add(option);
        });
    }

    function renderExams() {
        const categories = getFromLS(ADMIN_CATEGORIES_KEY);
        examList.innerHTML = '';
        testExamSelect.innerHTML = '<option value="">-- Select Exam --</option>';
        questionExamSelect.innerHTML = '<option value="">-- Select Exam --</option>';

        categories.forEach(cat => {
            const exams = getFromLS(`${EXAM_DATA_PREFIX}${cat.id}`);
            exams.forEach(exam => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <div class="list-item-info">
                        <strong>${exam.name}</strong>
                        <span>Category: ${cat.name} | ID: ${exam.id}</span>
                        ${exam.description ? `<span>Description: ${exam.description}</span>` : ''}
                        ${exam.courseDetails ? `<span>Course Details: ${exam.courseDetails}</span>` : ''}
                        ${exam.courseCost ? `<span>Price: ${exam.courseCost}</span>` : ''}
                        ${exam.courseValidity ? `<span>Validity: ${exam.courseValidity}</span>` : ''}
                        ${exam.hasDiscount ? `<span>Discount: ${exam.discountPercent || 0}%${exam.discountCode ? ` (Code: ${exam.discountCode})` : ''}</span>` : ''}
                        ${exam.discountMessage ? `<span>Discount Message: ${exam.discountMessage}</span>` : ''}
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-edit" data-id="${exam.id}" data-cat-id="${cat.id}">Edit</button>
                        <button class="btn-delete" data-id="${exam.id}" data-cat-id="${cat.id}">Delete</button>
                    </div>
                `;
                examList.appendChild(item);
            });
        });
    }

    function renderTests() {
        const categories = getFromLS(ADMIN_CATEGORIES_KEY);
        testList.innerHTML = '';

        categories.forEach(cat => {
            // Get tests from both storage locations
            const examTests = [];
            const exams = getFromLS(`${EXAM_DATA_PREFIX}${cat.id}`);
            
            // Create a map of examId to examName for quick lookup
            // Store both string and number versions to handle type mismatches
            const examNameMap = {};
            exams.forEach(exam => {
                // Store with both string and number keys to handle type mismatches
                const examIdStr = String(exam.id);
                const examIdNum = exam.id;
                examNameMap[examIdStr] = exam.name;
                examNameMap[examIdNum] = exam.name;
                (exam.tests || []).forEach(test => {
                    examTests.push({...test, examName: exam.name, examId: exam.id});
                });
            });

            // Get tests from separate test storage
            const separateTests = getFromLS(`${TEST_DATA_PREFIX}${cat.id}`, []);
            
            // Add exam name to separate tests by looking up in examNameMap
            const separateTestsWithExamName = separateTests.map(test => {
                let examName = 'Unknown';
                if (test.examId) {
                    // Try both string and number versions of examId
                    examName = examNameMap[test.examId] || examNameMap[String(test.examId)] || examNameMap[Number(test.examId)] || 'Unknown';
                }
                return {...test, examName: examName};
            });
            
            // Combine and remove duplicates
            const allTests = [...examTests, ...separateTestsWithExamName];
            const uniqueTests = allTests.filter((test, index, self) => 
                index === self.findIndex(t => t.id === test.id)
            );

            uniqueTests.forEach(test => {
                const item = document.createElement('div');
                item.className = 'list-item';
                const sectionsSummary = (test.hasSections && test.sections && test.sections.length > 0) ? `Sections: ${test.sections.length}` : (test.hasSections ? 'Sections: Yes' : 'Sections: No');
                const freeSummary = test.isFree ? 'Access: Free' : 'Access: Paid';
                item.innerHTML = `
                    <div class="list-item-info">
                        <strong>${test.name}</strong>
                        <span>Exam: ${test.examName || 'Unknown'} | ID: ${test.id} | ${sectionsSummary} | ${freeSummary}</span>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-edit" data-id="${test.id}" data-exam-id="${test.examId}" data-cat-id="${cat.id}">Edit</button>
                        <button class="btn-delete" data-id="${test.id}" data-exam-id="${test.examId}" data-cat-id="${cat.id}">Delete</button>
                    </div>
                `;
                testList.appendChild(item);
            });
        });
    }

    function populateTestExamSelect() {
        const categoryId = testCategorySelect.value;
        testExamSelect.innerHTML = '<option value="">-- Select Exam --</option>';
        testNameInput.innerHTML = '<option value="">-- Select Test Name --</option>';
        if (!categoryId) return;

        const exams = getFromLS(`${EXAM_DATA_PREFIX}${categoryId}`);
        exams.forEach(exam => {
            testExamSelect.add(new Option(exam.name, exam.id));
        });
    }

    function populateTestNameSelect() {
        const categoryId = testCategorySelect.value;
        const examId = testExamSelect.value;
        testNameInput.innerHTML = '<option value="">-- Select Test Name --</option>';
        if (!categoryId || !examId) return;

        const exams = getFromLS(`${EXAM_DATA_PREFIX}${categoryId}`);
        const exam = exams.find(e => e.id === examId);
        if (exam && exam.tests) {
            exam.tests.forEach(test => {
                testNameInput.add(new Option(test.name, test.id));
            });
        }
    }

    function populateQuestionExamSelect() {
        const categoryId = questionCategorySelect.value;
        questionExamSelect.innerHTML = '<option value="">-- Select Exam --</option>';
        questionTestSelect.innerHTML = '<option value="">-- Select Test --</option>';
        if (!categoryId) return;

        const exams = getFromLS(`${EXAM_DATA_PREFIX}${categoryId}`);
        console.log('populateQuestionExamSelect - categoryId:', categoryId, 'exams:', exams);
        exams.forEach(exam => {
            questionExamSelect.add(new Option(exam.name, exam.id));
        });
    }

    async function populateQuestionTestSelect() {
        const categoryId = questionCategorySelect.value;
        const examId = questionExamSelect.value;
        questionTestSelect.innerHTML = '<option value="">-- Select Test --</option>';
        console.log('populateQuestionTestSelect called:', { categoryId, examId });
        if (!categoryId || !examId) {
            console.log('Missing categoryId or examId');
            return;
        }
        // Always refresh tests from server before populating
        try {
            const res = await adminFetch(`/api/admin/tests/${categoryId}`);
            const all = await res.json();
            if (all.success && Array.isArray(all.tests)) {
                saveToLS(`${TEST_DATA_PREFIX}${categoryId}`, all.tests);
            }
        } catch (err) {
            console.warn('Could not refresh tests from server', err);
        }
        // Now populate from localStorage
        const separateTests = getFromLS(`${TEST_DATA_PREFIX}${categoryId}`, []);
        // Defensive: trim examId and compare as string
        const examIdStr = (examId || '').toString().trim();
        const examTests = separateTests.filter(test => (test.examId || '').toString().trim() === examIdStr);
        if (examTests.length === 0) {
            const opt = new Option('No tests found for this exam', '', true, false);
            opt.disabled = true;
            questionTestSelect.add(opt);
            autoCreateQuestionsBtn.style.display = 'none';
        } else {
            examTests.forEach(test => {
                questionTestSelect.add(new Option(test.name, test.id));
            });
            autoCreateQuestionsBtn.style.display = 'block';
        }
    }

    // Render per-section containers inside questions area
    function renderQuestionSectionContainers(test) {
        // Clear existing
        questionsContainer.innerHTML = '';
        if (test && test.hasSections && test.sections && test.sections.length > 0) {
            test.sections.forEach((sec, idx) => {
                const secWrap = document.createElement('div');
                secWrap.className = 'section-questions-wrap';
                secWrap.id = `section-questions-wrap-${idx}`;
                secWrap.innerHTML = `
                    <h3>${sec.name || `Section ${idx+1}`} <small>(${sec.numQuestions || ''} ques)</small></h3>
                    <div id="section-questions-${idx}"></div>
                    <button type="button" class="btn-gray add-section-question-btn" data-section-index="${idx}">Add Question to this Section</button>
                    <hr>
                `;
                questionsContainer.appendChild(secWrap);
            });
            // Wire add buttons
            const addBtns = questionsContainer.querySelectorAll('.add-section-question-btn');
            addBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.currentTarget.dataset.sectionIndex);
                    addQuestionBlock(null, idx);
                    updateQuestionCount();
                });
            });
            // Render section navigation tabs
            const sectionNav = document.getElementById('section-nav');
            const sectionTabs = document.getElementById('section-tabs');
            if (sectionNav && sectionTabs) {
                sectionNav.style.display = 'block';
                sectionTabs.innerHTML = '';
                test.sections.forEach((sec, idx) => {
                    const tab = document.createElement('button');
                    tab.className = 'section-tab btn-gray';
                    tab.dataset.index = idx;
                    tab.textContent = sec.name || `Section ${idx+1}`;
                    tab.addEventListener('click', () => { setActiveSection(idx); });
                    sectionTabs.appendChild(tab);
                });
                // set first as active
                setActiveSection(0);
            }
        } else {
            // fallback: global questions container + single add button already present
            questionsContainer.innerHTML = '';
            const sectionNav = document.getElementById('section-nav');
            if (sectionNav) sectionNav.style.display = 'none';
        }
    }

    // Section navigation state
    let activeSectionIndex = null;
    function setActiveSection(idx) {
        activeSectionIndex = idx;
        // highlight tab
        const tabs = document.querySelectorAll('#section-tabs .section-tab');
        tabs.forEach(t => t.classList.remove('active-tab'));
        const activeTab = document.querySelector(`#section-tabs .section-tab[data-index='${idx}']`);
        if (activeTab) activeTab.classList.add('active-tab');
        // show only relevant section container
        const wraps = document.querySelectorAll('.section-questions-wrap');
        wraps.forEach(w => w.style.display = 'none');
        const activeWrap = document.getElementById(`section-questions-wrap-${idx}`);
        if (activeWrap) activeWrap.style.display = 'block';
    }

    // Prev/Next buttons
    const sectionPrevBtn = document.getElementById('section-prev-btn');
    const sectionNextBtn = document.getElementById('section-next-btn');
    if (sectionPrevBtn && sectionNextBtn) {
        sectionPrevBtn.addEventListener('click', () => {
            if (activeSectionIndex === null) return;
            const tabs = document.querySelectorAll('#section-tabs .section-tab');
            const prev = Math.max(0, activeSectionIndex - 1);
            setActiveSection(prev);
        });
        sectionNextBtn.addEventListener('click', () => {
            if (activeSectionIndex === null) return;
            const tabs = document.querySelectorAll('#section-tabs .section-tab');
            const next = Math.min(tabs.length - 1, activeSectionIndex + 1);
            setActiveSection(next);
        });
    }

    // Auto-create question spaces based on test's number of questions
    function autoCreateQuestionSpaces() {
        const categoryId = questionCategorySelect.value;
        const examId = questionExamSelect.value;
        const testId = questionTestSelect.value;
        
        console.log('autoCreateQuestionSpaces called:', { categoryId, examId, testId });
        
        if (!categoryId || !examId || !testId) {
            console.log('Missing required selections for auto-create');
            return;
        }

        // Find the test to get its number of questions
        let test = null;
        
        // First try to get test from exam structure
        const exams = getFromLS(`${EXAM_DATA_PREFIX}${categoryId}`);
        const exam = exams.find(e => e.id === examId);
        if (exam && exam.tests) {
            test = exam.tests.find(t => t.id === testId);
        }
        
        // If not found in exam structure, try separate test storage
        if (!test) {
            const separateTests = getFromLS(`${TEST_DATA_PREFIX}${categoryId}`, []);
            test = separateTests.find(t => t.id === testId);
        }
        
        if (test && test.numQuestions) {
            console.log('Found test', test.name);
            // Clear existing questions
            questionsContainer.innerHTML = '';
            questionCounter = 0;

            if (test.hasSections && test.sections && test.sections.length > 0) {
                // Render section containers
                renderQuestionSectionContainers(test);
                // For each section, create question blocks inside its container
                test.sections.forEach((sec, idx) => {
                    const secNum = parseInt(sec.numQuestions) || 0;
                    for (let i = 1; i <= secNum; i++) {
                        addQuestionBlock(i, idx);
                    }
                });
            } else {
                const numQuestions = parseInt(test.numQuestions);
                // Create question blocks for the specified number
                for (let i = 1; i <= numQuestions; i++) {
                    addQuestionBlock(i);
                }
            }
            
            updateQuestionCount();
            
            // Show success message
            const message = document.createElement('div');
            message.className = 'success-message';
            message.style.cssText = `
                background: #d4edda;
                color: #155724;
                padding: 10px 15px;
                border-radius: 8px;
                margin: 15px 0;
                border: 1px solid #c3e6cb;
                font-weight: 500;
            `;
            message.textContent = `✅ Created ${numQuestions} question spaces for "${test.name}"`;
            
            // Insert message before the questions container
            questionsContainer.parentNode.insertBefore(message, questionsContainer);
            
            // Remove message after 5 seconds
            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 5000);
            
        } else {
            console.log('Test not found or no numQuestions specified');
            // Clear existing questions if test not found
            questionsContainer.innerHTML = '';
            questionCounter = 0;
            updateQuestionCount();
        }
    }

    // Load existing questions for the selected test in the Add Questions panel
    function loadSelectedTestQuestions() {
        const categoryId = questionCategorySelect.value;
        const examId = questionExamSelect.value;
        const testId = questionTestSelect.value;

        console.log('loadSelectedTestQuestions called:', { categoryId, examId, testId });

        // Clear current UI
        questionsContainer.innerHTML = '';
        questionCounter = 0;

        if (!categoryId || !examId || !testId) {
            updateQuestionCount();
            return;
        }

        // Find the test (first try exam structure, then separate storage)
        let test = null;
        const exams = getFromLS(`${EXAM_DATA_PREFIX}${categoryId}`);
        const exam = exams.find(e => e.id === examId);
        if (exam && exam.tests) {
            test = exam.tests.find(t => t.id === testId);
        }
        if (!test) {
            const separateTests = getFromLS(`${TEST_DATA_PREFIX}${categoryId}`, []);
            test = separateTests.find(t => t.id === testId);
        }

        if (!test) {
            console.log('Selected test not found in storage');
            updateQuestionCount();
            return;
        }

        // If test already has saved questions, render them
        if (test.questions && test.questions.length > 0) {
            if (test.hasSections && test.sections && test.sections.length > 0) {
                renderQuestionSectionContainers(test);
                test.questions.forEach((q) => {
                    const sectionIndex = (typeof q.sectionIndex !== 'undefined') ? q.sectionIndex : null;
                    questionCounter++;
                    addQuestionBlock(questionCounter, sectionIndex);
                    const container = sectionIndex !== null ? document.getElementById(`section-questions-${sectionIndex}`) : questionsContainer;
                    const blocks = container.getElementsByClassName('question-block');
                    const block = blocks[blocks.length - 1];
                    if (block) {
                        block.querySelector('.question-text').value = q.question || '';
                        const optionInputs = block.querySelectorAll('.option-text');
                        optionInputs.forEach((opt, i) => opt.value = (q.options && q.options[i]) ? q.options[i] : '');
                        const correct = (typeof q.correctAnswer !== 'undefined') ? q.correctAnswer : 0;
                        const radio = block.querySelector(`input[type="radio"][value="${correct}"]`);
                        if (radio) radio.checked = true;
                        block.querySelector('.explanation-text').value = q.explanation || '';
                        // populate image or table preview if available
                        const imgPreview = block.querySelector('.question-image-preview');
                        const removeImageBtn = block.querySelector('.remove-image-btn');
                        if (q.imageData && q.imageData.trim() !== '' && imgPreview) {
                            imgPreview.src = q.imageData;
                            imgPreview.style.display = 'block';
                            imgPreview.style.visibility = 'visible';
                            if (removeImageBtn) { removeImageBtn.style.display = 'block'; }
                            console.log('Restored image for question:', q.imageData.substring(0, 50) + '...');
                        }
                        // Restore explanation image if available
                        const explanationImgPreview = block.querySelector('.explanation-image-preview');
                        const removeExplanationImageBtn = block.querySelector('.remove-explanation-image-btn');
                        if (q.explanationImage && q.explanationImage.trim() !== '' && explanationImgPreview) {
                            explanationImgPreview.src = q.explanationImage;
                            explanationImgPreview.style.display = 'block';
                            if (removeExplanationImageBtn) { removeExplanationImageBtn.style.display = 'block'; }
                            console.log('Restored explanation image for question:', q.explanationImage.substring(0, 50) + '...');
                        }
                        // Restore table if available
                        if (q.tableData && q.tableData.trim() !== '') {
                            const tableContainer = block.querySelector('.table-editor-container');
                            const tableWrapper = block.querySelector('.table-editor-wrapper');
                            const addTableBtn = block.querySelector('.add-table-btn');
                            const removeTableBtn = block.querySelector('.remove-table-btn');
                            if (tableContainer && tableWrapper) {
                                tableWrapper.innerHTML = q.tableData;
                                tableContainer.style.display = 'block';
                                if (addTableBtn) addTableBtn.style.display = 'none';
                                if (removeTableBtn) removeTableBtn.style.display = 'inline-block';
                                // Wait for DOM to update, then convert table cells back to editable textareas
                                setTimeout(() => {
                                    convertTableToEditable(tableWrapper);
                                    console.log('Restored table for question');
                                }, 100);
                            }
                        }
                        // Re-initialize media handlers for this block
                        initMediaHandlers(block);
                    }
                });
            } else {
                test.questions.forEach((q) => {
                    questionCounter++;
                    addQuestionBlock(questionCounter);
                    const blocks = questionsContainer.getElementsByClassName('question-block');
                    const block = blocks[blocks.length - 1];
                    if (block) {
                        block.querySelector('.question-text').value = q.question || '';
                        const optionInputs = block.querySelectorAll('.option-text');
                        optionInputs.forEach((opt, i) => opt.value = (q.options && q.options[i]) ? q.options[i] : '');
                        const correct = (typeof q.correctAnswer !== 'undefined') ? q.correctAnswer : 0;
                        const radio = block.querySelector(`input[type="radio"][value="${correct}"]`);
                        if (radio) radio.checked = true;
                        block.querySelector('.explanation-text').value = q.explanation || '';
                        // Restore explanation image if available
                        const explanationImgPreview = block.querySelector('.explanation-image-preview');
                        const removeExplanationImageBtn = block.querySelector('.remove-explanation-image-btn');
                        if (q.explanationImage && q.explanationImage.trim() !== '' && explanationImgPreview) {
                            explanationImgPreview.src = q.explanationImage;
                            explanationImgPreview.style.display = 'block';
                            if (removeExplanationImageBtn) { removeExplanationImageBtn.style.display = 'block'; }
                            console.log('Restored explanation image for question:', q.explanationImage.substring(0, 50) + '...');
                        }
                        const imgPreview = block.querySelector('.question-image-preview');
                        const removeImageBtn = block.querySelector('.remove-image-btn');
                        const imageDimensionsContainer = block.querySelector('.image-dimensions-container');
                        const imageWidthInput = block.querySelector('.image-width-input');
                        const imageHeightInput = block.querySelector('.image-height-input');
                        if (q.imageData && q.imageData.trim() !== '' && imgPreview) {
                            imgPreview.src = q.imageData;
                            imgPreview.style.display = 'block';
                            imgPreview.style.visibility = 'visible';
                            if (removeImageBtn) { removeImageBtn.style.display = 'block'; }
                            if (imageDimensionsContainer) { imageDimensionsContainer.style.display = 'block'; }
                            // Restore image dimensions if available
                            if (imageWidthInput && q.imageWidth) {
                                imageWidthInput.value = q.imageWidth;
                            }
                            if (imageHeightInput && q.imageHeight) {
                                imageHeightInput.value = q.imageHeight;
                            }
                            console.log('Restored image for question:', q.imageData.substring(0, 50) + '...');
                        }
                        // Restore table if available
                        if (q.tableData && q.tableData.trim() !== '') {
                            const tableContainer = block.querySelector('.table-editor-container');
                            const tableWrapper = block.querySelector('.table-editor-wrapper');
                            const addTableBtn = block.querySelector('.add-table-btn');
                            const removeTableBtn = block.querySelector('.remove-table-btn');
                            if (tableContainer && tableWrapper) {
                                tableWrapper.innerHTML = q.tableData;
                                tableContainer.style.display = 'block';
                                if (addTableBtn) addTableBtn.style.display = 'none';
                                if (removeTableBtn) removeTableBtn.style.display = 'inline-block';
                                // Wait for DOM to update, then convert table cells back to editable textareas
                                setTimeout(() => {
                                    convertTableToEditable(tableWrapper);
                                    console.log('Restored table for question');
                                }, 100);
                            }
                        }
                        // Re-initialize media handlers for this block
                        initMediaHandlers(block);
                    }
                });
            }
            updateQuestionCount();
        } else {
            // No saved questions - leave container empty and let user use Auto-Create
            console.log('No saved questions for selected test');
            updateQuestionCount();
        }
    }


    // --- Event Handlers ---

    // Category Form
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = categoryIdInput.value.trim();
        const name = categoryNameInput.value.trim();
        const description = categoryDescInput.value.trim();
        const courseDetails = categoryCourseDetailsInput ? categoryCourseDetailsInput.value.trim() : '';
        const courseCost = categoryCourseCostInput ? categoryCourseCostInput.value.trim() : '';

        const validityValueRaw = categoryValidityValueInput ? categoryValidityValueInput.value.trim() : '';
        let validityValue = validityValueRaw ? parseInt(validityValueRaw, 10) : null;
        const validityUnit = categoryValidityUnitSelect ? categoryValidityUnitSelect.value : '';

        if (validityValueRaw && (Number.isNaN(validityValue) || validityValue <= 0)) {
            alert('Please enter a valid validity value greater than zero.');
            return;
        }
        if (validityValue && !validityUnit) {
            alert('Please select a validity unit.');
            return;
        }
        if (!validityValue && validityUnit) {
            alert('Please enter a validity value.');
            return;
        }
        if (!validityValue) {
            validityValue = null;
        }
        const courseValidity = validityValue ? formatValidity(validityValue, validityUnit) : '';

        const hasDiscount = categoryDiscountYes ? !!categoryDiscountYes.checked : false;
        let discountPercent = 0;
        let discountCode = '';
        let discountMessage = '';
        if (hasDiscount) {
            const percentRaw = categoryDiscountPercentInput ? categoryDiscountPercentInput.value.trim() : '';
            discountPercent = percentRaw ? parseFloat(percentRaw) : 0;
            if (!percentRaw || Number.isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
                alert('Please enter a valid discount percentage between 0 and 100.');
                return;
            }
            discountCode = normaliseDiscountCode(categoryDiscountCodeInput ? categoryDiscountCodeInput.value : '');
            if (!discountCode) {
                alert('Please provide a discount code.');
                return;
            }
            discountMessage = categoryDiscountMessageInput ? categoryDiscountMessageInput.value.trim() : '';
            if (!discountMessage) {
                alert('Please provide a discount message for users.');
                return;
            }
        }

        const payload = {
            id: id || undefined,
            name,
            description,
            courseDetails,
            courseCost,
            courseValidity,
            validityValue,
            validityUnit: validityValue ? validityUnit : '',
            hasDiscount,
            discountPercent: hasDiscount ? discountPercent : 0,
            discountCode: hasDiscount ? discountCode : '',
            discountMessage: hasDiscount ? discountMessage : ''
        };

        let serverSuccess = false;
        try {
            const res = await adminFetch('/api/admin/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success && data.category) {
                serverSuccess = true;
                // After saving, fetch all categories from server and sync to localStorage
                const res2 = await adminFetch('/api/admin/categories');
                const all = await res2.json();
                if (all.success && Array.isArray(all.categories)) {
                    saveToLS(ADMIN_CATEGORIES_KEY, all.categories);
                }
                alert(id ? 'Category updated successfully!' : 'Category saved to server (MongoDB) and synced to localStorage!');
            }
        } catch (err) {
            console.warn('Server save failed, falling back to localStorage', err);
        }
        if (!serverSuccess) {
            let categories = getFromLS(ADMIN_CATEGORIES_KEY);
            if (id) {
                categories = categories.map(cat => cat.id === id ? {
                    ...cat,
                    name,
                    description,
                    courseDetails,
                    courseCost,
                    courseValidity,
                    validityValue,
                    validityUnit: validityValue ? validityUnit : '',
                    hasDiscount,
                    discountPercent: hasDiscount ? discountPercent : 0,
                    discountCode: hasDiscount ? discountCode : '',
                    discountMessage: hasDiscount ? discountMessage : ''
                } : cat);
            } else {
                categories.push({
                    id: generateId(),
                    name,
                    description,
                    courseDetails,
                    courseCost,
                    courseValidity,
                    validityValue,
                    validityUnit: validityValue ? validityUnit : '',
                    hasDiscount,
                    discountPercent: hasDiscount ? discountPercent : 0,
                    discountCode: hasDiscount ? discountCode : '',
                    discountMessage: hasDiscount ? discountMessage : ''
                });
            }
            saveToLS(ADMIN_CATEGORIES_KEY, categories);
            alert('Category saved locally (localStorage). Server unavailable.');
        }
        // Explicitly clear the ID field to prevent creating duplicates
        categoryForm.reset();
        categoryIdInput.value = '';
        if (categoryDiscountNo) categoryDiscountNo.checked = true;
        if (categoryValidityUnitSelect) categoryValidityUnitSelect.value = '';
        updateCategoryDiscountVisibility();
        loadAllData();
    });

    // Exam Form
    examForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = examIdInput.value.trim();
        const categoryId = examCategorySelect.value;
        const name = examNameInput.value;
        const description = examDescInput.value;
        const courseDetails = examCourseDetailsInput ? examCourseDetailsInput.value.trim() : '';
        const courseCost = examCourseCostInput ? examCourseCostInput.value.trim() : '';

        const validityValueRaw = examValidityValueInput ? examValidityValueInput.value.trim() : '';
        let validityValue = validityValueRaw ? parseInt(validityValueRaw, 10) : null;
        const validityUnit = examValidityUnitSelect ? examValidityUnitSelect.value : '';

        if (validityValueRaw && (Number.isNaN(validityValue) || validityValue <= 0)) {
            alert('Please enter a valid validity value greater than zero.');
            return;
        }
        if (validityValue && !validityUnit) {
            alert('Please select a validity unit.');
            return;
        }
        if (!validityValue && validityUnit) {
            alert('Please enter a validity value.');
            return;
        }
        if (!validityValue) {
            validityValue = null;
        }
        const courseValidity = validityValue ? formatValidity(validityValue, validityUnit) : '';

        const hasDiscount = examDiscountYes ? !!examDiscountYes.checked : false;
        let discountPercent = 0;
        let discountCode = '';
        let discountMessage = '';
        if (hasDiscount) {
            const percentRaw = examDiscountPercentInput ? examDiscountPercentInput.value.trim() : '';
            discountPercent = percentRaw ? parseFloat(percentRaw) : 0;
            if (!percentRaw || Number.isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
                alert('Please enter a valid discount percentage between 0 and 100.');
                return;
            }
            discountCode = normaliseDiscountCode(examDiscountCodeInput ? examDiscountCodeInput.value : '');
            if (!discountCode) {
                alert('Please provide a discount code.');
                return;
            }
            discountMessage = examDiscountMessageInput ? examDiscountMessageInput.value.trim() : '';
            if (!discountMessage) {
                alert('Please provide a discount message for users.');
                return;
            }
        }

        const payload = {
            id: id || undefined,
            categoryId,
            name,
            description,
            courseDetails,
            courseCost,
            courseValidity,
            validityValue,
            validityUnit: validityValue ? validityUnit : '',
            hasDiscount,
            discountPercent: hasDiscount ? discountPercent : 0,
            discountCode: hasDiscount ? discountCode : '',
            discountMessage: hasDiscount ? discountMessage : ''
        };

        let serverSuccess = false;
        try {
            const res = await adminFetch('/api/admin/exams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success && data.exam) {
                serverSuccess = true;
                // After saving, fetch all exams for the category and sync to localStorage
                const res2 = await adminFetch(`/api/admin/exams/${categoryId}`);
                const all = await res2.json();
                if (all.success && Array.isArray(all.exams)) {
                    saveToLS(`${EXAM_DATA_PREFIX}${categoryId}`, all.exams);
                }
                const isUpdate = id && id.length > 0;
                alert(isUpdate ? 'Exam updated successfully!' : 'Exam saved to server (MongoDB) and synced to localStorage!');
            }
        } catch (err) {
            console.warn('Server save failed, falling back to localStorage', err);
        }
        if (!serverSuccess) {
            let exams = getFromLS(`${EXAM_DATA_PREFIX}${categoryId}`);
            if (id) {
                exams = exams.map(ex => ex.id === id ? {
                    ...ex,
                    name,
                    description,
                    courseDetails,
                    courseCost,
                    courseValidity,
                    validityValue,
                    validityUnit: validityValue ? validityUnit : '',
                    hasDiscount,
                    discountPercent: hasDiscount ? discountPercent : 0,
                    discountCode: hasDiscount ? discountCode : '',
                    discountMessage: hasDiscount ? discountMessage : '',
                    tests: ex.tests || []
                } : ex);
            } else {
                exams.push({
                    id: generateId(),
                    name,
                    description,
                    courseDetails,
                    courseCost,
                    courseValidity,
                    validityValue,
                    validityUnit: validityValue ? validityUnit : '',
                    hasDiscount,
                    discountPercent: hasDiscount ? discountPercent : 0,
                    discountCode: hasDiscount ? discountCode : '',
                    discountMessage: hasDiscount ? discountMessage : '',
                    tests: []
                });
            }
            saveToLS(`${EXAM_DATA_PREFIX}${categoryId}`, exams);
            alert('Exam saved locally (localStorage). Server unavailable.');
        }
        examForm.reset();
        examIdInput.value = '';
        if (examDiscountNo) examDiscountNo.checked = true;
        if (examValidityUnitSelect) examValidityUnitSelect.value = '';
        updateExamDiscountVisibility();
        loadAllData();
    });

    // Test Form
    testForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryId = testCategorySelect.value;
        const examId = testExamSelect.value;
        const name = testNameInput.value.trim();
        const numQuestions = testNumQuestionsInput.value;
        const timeLimit = testTimeLimitInput.value;
        const positiveMark = testPositiveMarkInput.value;
        const negativeMark = testNegativeMarkInput.value;
        if (!categoryId || !examId || !name) return;

        const testId = testIdInput ? testIdInput.value.trim() : '';
        const newTest = {
            id: testId || undefined,
            categoryId,
            examId,
            name,
            hasSections: (testHasSectionsYes && testHasSectionsYes.checked) ? true : false,
            numQuestions,
            timeLimit,
            positiveMark,
            negativeMark,
            isFree: testIsFreeYes ? !!testIsFreeYes.checked : false,
            questions: [],
            sections: []
        };

        // If sections configured, collect section details
        if (newTest.hasSections) {
            const rows = testSectionRows ? testSectionRows.querySelectorAll('.section-row') : [];
            if (rows.length === 0) { alert('Please configure sections for this test.'); return; }
            let total = 0;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const name = row.querySelector('.section-name').value.trim();
                const numQ = parseInt(row.querySelector('.section-num-questions').value);
                const timingYes = row.querySelector('.section-timing-yes').checked;
                const timeLimitVal = row.querySelector('.section-time-limit').value;
                if (!name) { alert(`Please enter a name for section ${i+1}`); return; }
                if (!numQ || numQ < 1) { alert(`Please enter a valid number of questions for section ${i+1}`); return; }
                if (timingYes && (!timeLimitVal || parseInt(timeLimitVal) < 1)) { alert(`Please enter a valid time limit for section ${i+1}`); return; }
                total += numQ;
                newTest.sections.push({ name, numQuestions: numQ, sectionalTiming: timingYes ? true : false, timeLimit: timingYes ? timeLimitVal : '' });
            }
            if (parseInt(newTest.numQuestions) !== total) { alert('Sum of questions in all sections must equal the total Number of Questions for the test.'); return; }
        }

        let serverSuccess = false;
        try {
            const res = await adminFetch('/api/admin/tests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTest)
            });
            const data = await res.json();
            if (data.success && data.test) {
                serverSuccess = true;
                // After saving, fetch all tests for the category and sync to localStorage
                const res2 = await adminFetch(`/api/admin/tests/${categoryId}`);
                const all = await res2.json();
                if (all.success && Array.isArray(all.tests)) {
                    saveToLS(`${TEST_DATA_PREFIX}${categoryId}`, all.tests);
                }
                const isUpdate = testId && testId.length > 0;
                alert(isUpdate ? 'Test updated successfully!' : 'Test saved to server (MongoDB) and synced to localStorage!');
            }
        } catch (err) {
            console.warn('Server save failed, falling back to localStorage', err);
        }
        if (!serverSuccess) {
            newTest.id = generateId();
            const tests = getFromLS(`${TEST_DATA_PREFIX}${categoryId}`, []);
            tests.push(newTest);
            saveToLS(`${TEST_DATA_PREFIX}${categoryId}`, tests);
            alert('Test saved locally (localStorage). Server unavailable.');
        }

        testNameInput.value = '';
        testNumQuestionsInput.value = '';
        testTimeLimitInput.value = '';
        testPositiveMarkInput.value = '';
        testNegativeMarkInput.value = '';
        if (testIdInput) testIdInput.value = '';
        if (testIsFreeYes) testIsFreeYes.checked = false;
        if (testIsFreeNo) testIsFreeNo.checked = true;
        renderTests();
    });

    // Edit Buttons
    categoryList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit')) {
            const id = e.target.dataset.id;
            const categories = getFromLS(ADMIN_CATEGORIES_KEY);
            const category = categories.find(cat => cat.id === id);
            if (category) {
                categoryIdInput.value = category.id;
                categoryNameInput.value = category.name;
                categoryDescInput.value = category.description || '';
                if (categoryCourseDetailsInput) categoryCourseDetailsInput.value = category.courseDetails || '';
                if (categoryCourseCostInput) categoryCourseCostInput.value = category.courseCost || '';
                const { value, unit } = resolveValidityParts(category);
                if (categoryValidityValueInput) categoryValidityValueInput.value = value || '';
                if (categoryValidityUnitSelect) categoryValidityUnitSelect.value = unit || '';
                const hasDiscount = !!category.hasDiscount;
                if (categoryDiscountYes && categoryDiscountNo) {
                    categoryDiscountYes.checked = hasDiscount;
                    categoryDiscountNo.checked = !hasDiscount;
                }
                if (categoryDiscountPercentInput) categoryDiscountPercentInput.value = hasDiscount ? (category.discountPercent ?? '') : '';
                if (categoryDiscountCodeInput) categoryDiscountCodeInput.value = hasDiscount ? (category.discountCode || '') : '';
                if (categoryDiscountMessageInput) categoryDiscountMessageInput.value = hasDiscount ? (category.discountMessage || '') : '';
                updateCategoryDiscountVisibility();
            }
        }
    });

    examList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit')) {
            const id = e.target.dataset.id;
            const categoryId = e.target.dataset.catId;
            const exams = getFromLS(`${EXAM_DATA_PREFIX}${categoryId}`);
            const exam = exams.find(ex => ex.id === id);
            if (exam) {
                examIdInput.value = exam.id;
                examCategorySelect.value = categoryId;
                examNameInput.value = exam.name;
                examDescInput.value = exam.description || '';
                if (examCourseDetailsInput) examCourseDetailsInput.value = exam.courseDetails || '';
                if (examCourseCostInput) examCourseCostInput.value = exam.courseCost || '';
                const { value, unit } = resolveValidityParts(exam);
                if (examValidityValueInput) examValidityValueInput.value = value || '';
                if (examValidityUnitSelect) examValidityUnitSelect.value = unit || '';
                const hasDiscount = !!exam.hasDiscount;
                if (examDiscountYes && examDiscountNo) {
                    examDiscountYes.checked = hasDiscount;
                    examDiscountNo.checked = !hasDiscount;
                }
                if (examDiscountPercentInput) examDiscountPercentInput.value = hasDiscount ? (exam.discountPercent ?? '') : '';
                if (examDiscountCodeInput) examDiscountCodeInput.value = hasDiscount ? (exam.discountCode || '') : '';
                if (examDiscountMessageInput) examDiscountMessageInput.value = hasDiscount ? (exam.discountMessage || '') : '';
                updateExamDiscountVisibility();
            }
        }
    });

    testList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit')) {
            const id = e.target.dataset.id;
            const examId = e.target.dataset.examId;
            const categoryId = e.target.dataset.catId;
            
            let test = null;
            
            // First try to find test in exam structure
            const exams = getFromLS(`${EXAM_DATA_PREFIX}${categoryId}`);
            const exam = exams.find(ex => ex.id === examId);
            if (exam && exam.tests) {
                test = exam.tests.find(t => t.id === id);
            }
            
            // If not found in exam structure, try separate test storage
            if (!test) {
                const separateTests = getFromLS(`${TEST_DATA_PREFIX}${categoryId}`, []);
                test = separateTests.find(t => t.id === id);
            }
            
            if (test) {
                testIdInput.value = test.id;
                testCategorySelect.value = categoryId;
                // Populate exam select dropdown before setting the value
                populateTestExamSelect();
                // Get examId from test object if not available from dataset, handling type mismatches
                const testExamId = examId || test.examId;
                if (testExamId) {
                    const examIdStr = String(testExamId);
                    const examIdNum = Number(testExamId);
                    // Find matching option by iterating through all options, handling type mismatches
                    let foundOption = null;
                    for (let i = 0; i < testExamSelect.options.length; i++) {
                        const option = testExamSelect.options[i];
                        const optionValueStr = String(option.value);
                        const optionValueNum = Number(option.value);
                        if (option.value === testExamId || option.value === examIdStr || option.value === examIdNum ||
                            optionValueStr === examIdStr || optionValueNum === examIdNum) {
                            foundOption = option.value;
                            break;
                        }
                    }
                    // Set the value if found
                    if (foundOption) {
                        testExamSelect.value = foundOption;
                    } else {
                        // Fallback: try setting directly (might work if types match)
                        testExamSelect.value = testExamId;
                    }
                }
                testNameInput.value = test.name;
                testNumQuestionsInput.value = test.numQuestions;
                testTimeLimitInput.value = test.timeLimit;
                testPositiveMarkInput.value = test.positiveMark;
                testNegativeMarkInput.value = test.negativeMark;
                if (testIsFreeYes && testIsFreeNo) {
                    if (test.isFree) {
                        testIsFreeYes.checked = true;
                        testIsFreeNo.checked = false;
                    } else {
                        testIsFreeYes.checked = false;
                        testIsFreeNo.checked = true;
                    }
                }
                // Set has-sections radios for create form when loading existing test
                if (typeof test.hasSections !== 'undefined') {
                    if (test.hasSections) {
                        if (testHasSectionsYes) testHasSectionsYes.checked = true;
                        if (testHasSectionsNo) testHasSectionsNo.checked = false;
                    } else {
                        if (testHasSectionsYes) testHasSectionsYes.checked = false;
                        if (testHasSectionsNo) testHasSectionsNo.checked = true;
                    }
                    // populate sections if available
                    if (test.hasSections && test.sections && test.sections.length > 0) {
                        testSectionsContainer.style.display = 'block';
                        testNumSectionsInput.value = test.sections.length;
                        renderSectionRows(test.sections.length);
                        // fill rows
                        const rows = testSectionRows.querySelectorAll('.section-row');
                        rows.forEach((row, idx) => {
                            const sec = test.sections[idx] || {};
                            row.querySelector('.section-name').value = sec.name || '';
                            row.querySelector('.section-num-questions').value = sec.numQuestions || '';
                            if (sec.sectionalTiming) {
                                row.querySelector('.section-timing-yes').checked = true;
                                row.querySelector('.section-time-limit').style.display = 'inline-block';
                                row.querySelector('.section-time-limit').value = sec.timeLimit || '';
                            } else {
                                row.querySelector('.section-timing-no').checked = true;
                                row.querySelector('.section-time-limit').style.display = 'none';
                                row.querySelector('.section-time-limit').value = '';
                            }
                        });
                    } else {
                        testSectionsContainer.style.display = test.hasSections ? 'block' : 'none';
                    }
                }
                
                // Clear existing questions
                questionsContainer.innerHTML = '';
                questionCounter = 0;

                // If test has sections, render section containers and place questions accordingly
                if (test.questions) {
                    if (test.hasSections && test.sections && test.sections.length > 0) {
                        renderQuestionSectionContainers(test);
                        // Place each saved question into its section container if sectionIndex present
                        test.questions.forEach((q, index) => {
                            const sectionIndex = (typeof q.sectionIndex !== 'undefined') ? q.sectionIndex : null;
                            questionCounter++;
                            // create a block in the right container
                            addQuestionBlock(questionCounter, sectionIndex);
                            // populate the latest added block fields
                            // find the last added block in the expected container
                            const container = sectionIndex !== null ? document.getElementById(`section-questions-${sectionIndex}`) : questionsContainer;
                            const blocks = container.getElementsByClassName('question-block');
                            const block = blocks[blocks.length - 1];
                            if (block) {
                                block.querySelector('.question-text').value = q.question || '';
                                const optionInputs = block.querySelectorAll('.option-text');
                                optionInputs.forEach((opt, i) => opt.value = (q.options && q.options[i]) ? q.options[i] : '');
                                const correct = q.correctAnswer || 0;
                                const radio = block.querySelector(`input[type="radio"][value="${correct}"]`);
                                if (radio) radio.checked = true;
                                block.querySelector('.explanation-text').value = q.explanation || '';
                                // Restore explanation image if available
                                const explanationImgPreview = block.querySelector('.explanation-image-preview');
                                const removeExplanationImageBtn = block.querySelector('.remove-explanation-image-btn');
                                if (q.explanationImage && q.explanationImage.trim() !== '' && explanationImgPreview) {
                                    explanationImgPreview.src = q.explanationImage;
                                    explanationImgPreview.style.display = 'block';
                                    if (removeExplanationImageBtn) { removeExplanationImageBtn.style.display = 'block'; }
                                }
                            }
                        });
                    } else {
                        test.questions.forEach((q, index) => {
                            questionCounter++;
                            const questionId = `q_${Date.now()}_${index}`;
                            const questionBlock = document.createElement('div');
                            questionBlock.className = 'question-block';
                            questionBlock.id = questionId;
                            questionBlock.innerHTML = `
                                <h4>
                                    Question ${questionCounter}
                                    <button type="button" class="btn-red-small" onclick="document.getElementById('${questionId}').remove(); updateQuestionCount();">Remove</button>
                                </h4>
                                <textarea class="question-text" placeholder="Question text" required>${q.question}</textarea>
                                <div class="options-grid">
                                    <div class="option-item">
                                        <input type="radio" name="correct-answer-${questionId}" value="0" ${q.correctAnswer === 0 ? 'checked' : ''} required>
                                        <input type="text" class="option-text" placeholder="Option 1" value="${q.options[0] || ''}" required>
                                    </div>
                                    <div class="option-item">
                                        <input type="radio" name="correct-answer-${questionId}" value="1" ${q.correctAnswer === 1 ? 'checked' : ''} required>
                                        <input type="text" class="option-text" placeholder="Option 2" value="${q.options[1] || ''}" required>
                                    </div>
                                    <div class="option-item">
                                        <input type="radio" name="correct-answer-${questionId}" value="2" ${q.correctAnswer === 2 ? 'checked' : ''} required>
                                        <input type="text" class="option-text" placeholder="Option 3" value="${q.options[2] || ''}" required>
                                    </div>
                                    <div class="option-item">
                                        <input type="radio" name="correct-answer-${questionId}" value="3" ${q.correctAnswer === 3 ? 'checked' : ''} required>
                                        <input type="text" class="option-text" placeholder="Option 4" value="${q.options[3] || ''}" required>
                                    </div>
                                </div>
                                <textarea class="explanation-text" placeholder="Answer explanation">${q.explanation}</textarea>
                            `;
                            questionsContainer.appendChild(questionBlock);
                        });
                    }
                }
                updateQuestionCount();
            }
        }
    });

    // Delete Buttons
    categoryList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            if (!id) return;
            
            // Confirm deletion
            if (!confirm('Are you sure you want to delete this category? This will also delete all associated exams and tests.')) {
                return;
            }
            
            let serverSuccess = false;
            try {
                // Delete from MongoDB server
                const res = await adminFetch(`/api/admin/categories/${id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (data.success) {
                    serverSuccess = true;
                    // After deleting from server, fetch all categories and sync to localStorage
                    const res2 = await adminFetch('/api/admin/categories');
                    const all = await res2.json();
                    if (all.success && Array.isArray(all.categories)) {
                        saveToLS(ADMIN_CATEGORIES_KEY, all.categories);
                    }
                    alert('Category deleted from server (MongoDB) and synced to localStorage!');
                } else {
                    alert('Failed to delete category from server: ' + (data.message || 'Unknown error'));
                }
            } catch (err) {
                console.warn('Server delete failed, falling back to localStorage', err);
            }
            
            // Delete from localStorage (always update localStorage after server attempt)
            let categories = getFromLS(ADMIN_CATEGORIES_KEY);
            categories = categories.filter(cat => cat.id !== id);
            saveToLS(ADMIN_CATEGORIES_KEY, categories);
            
            if (!serverSuccess) {
                alert('Category deleted locally (localStorage). Server unavailable.');
            }
            
            loadAllData();
        }
    });

    examList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            const categoryId = e.target.dataset.catId;
            if (!id || !categoryId) return;
            if (!confirm('Are you sure you want to delete this exam? This will also delete all associated tests.')) {
                return;
            }
            let serverSuccess = false;
            try {
                const res = await adminFetch(`/api/admin/exams/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    serverSuccess = true;
                    // Refresh exams from server and sync
                    const res2 = await adminFetch(`/api/admin/exams/${categoryId}`);
                    const all = await res2.json();
                    if (all.success && Array.isArray(all.exams)) {
                        saveToLS(`${EXAM_DATA_PREFIX}${categoryId}`, all.exams);
                    }
                    // Also refresh tests cache for this category since cascading delete may remove tests
                    try {
                        const r3 = await adminFetch(`/api/admin/tests/${categoryId}`);
                        const allTests = await r3.json();
                        if (allTests.success && Array.isArray(allTests.tests)) {
                            saveToLS(`${TEST_DATA_PREFIX}${categoryId}`, allTests.tests);
                        }
                    } catch (e2) { /* ignore */ }
                    alert('Exam deleted from server and synced.');
                } else {
                    alert(data.message || 'Failed to delete exam on server');
                }
            } catch (err) {
                console.warn('Server exam delete failed, falling back to localStorage', err);
            }
            // Update local storage regardless
            let exams = getFromLS(`${EXAM_DATA_PREFIX}${categoryId}`);
            exams = exams.filter(exam => exam.id !== id);
            saveToLS(`${EXAM_DATA_PREFIX}${categoryId}`, exams);
            // Remove tests of this exam from local caches
            let separateTests = getFromLS(`${TEST_DATA_PREFIX}${categoryId}`, []);
            separateTests = separateTests.filter(t => t.examId !== id);
            saveToLS(`${TEST_DATA_PREFIX}${categoryId}`, separateTests);
            loadAllData();
        }
    });

    testList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            const examId = e.target.dataset.examId;
            const categoryId = e.target.dataset.catId;
            if (!id || !categoryId) return;
            if (!confirm('Are you sure you want to delete this test?')) {
                return;
            }
            try {
                const res = await adminFetch(`/api/admin/tests/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    // Refresh tests cache from server
                    try {
                        const r = await adminFetch(`/api/admin/tests/${categoryId}`);
                        const all = await r.json();
                        if (all.success && Array.isArray(all.tests)) {
                            saveToLS(`${TEST_DATA_PREFIX}${categoryId}`, all.tests);
                        }
                    } catch (e2) { /* ignore */ }
                } else {
                    alert(data.message || 'Failed to delete test on server');
                }
            } catch (err) {
                console.warn('Server test delete failed, updating localStorage anyway', err);
            }
            // Remove from embedded exam structure in local cache
            let exams = getFromLS(`${EXAM_DATA_PREFIX}${categoryId}`);
            exams = exams.map(exam => {
                if (exam.id === examId && exam.tests) {
                    exam.tests = exam.tests.filter(test => test.id !== id);
                }
                return exam;
            });
            saveToLS(`${EXAM_DATA_PREFIX}${categoryId}`, exams);
            // Remove from separate tests cache
            let separateTests = getFromLS(`${TEST_DATA_PREFIX}${categoryId}`, []);
            separateTests = separateTests.filter(test => test.id !== id);
            saveToLS(`${TEST_DATA_PREFIX}${categoryId}`, separateTests);
            loadAllData();
        }
    });

    // Question Form
    questionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryId = questionCategorySelect.value;
        const examId = questionExamSelect.value;
        const testId = questionTestSelect.value;

        if (!categoryId || !examId || !testId) {
            alert('Please select a category, exam, and test.');
            return;
        }

        // Collect questions from all .question-block elements (including inside section containers)
        const questions = [];
        const questionBlocks = questionsContainer.querySelectorAll('.question-block');

        for (let i = 0; i < questionBlocks.length; i++) {
            const block = questionBlocks[i];
            const questionText = block.querySelector('.question-text').value;
            const explanation = block.querySelector('.explanation-text').value;
            const correctAnswerRadio = block.querySelector('input[type="radio"]:checked');
            const optionInputs = block.querySelectorAll('.option-text');

            if (questionText && correctAnswerRadio && optionInputs.length === 4) {
                const options = Array.from(optionInputs).map(input => input.value);
                const correctAnswer = parseInt(correctAnswerRadio.value);
                let sectionIndex = null;
                if (block.dataset.sectionIndex !== undefined && block.dataset.sectionIndex !== null) {
                    const idx = parseInt(block.dataset.sectionIndex);
                    if (!isNaN(idx)) sectionIndex = idx;
                }

                const qObj = {
                    question: questionText,
                    options: options,
                    correctAnswer: correctAnswer,
                    explanation: explanation
                };
                // capture image or table data if present
                const imgPreview = block.querySelector('.question-image-preview');
                const imageWidthInput = block.querySelector('.image-width-input');
                const imageHeightInput = block.querySelector('.image-height-input');
                const tableContainer = block.querySelector('.table-editor-container');
                const tableWrapper = block.querySelector('.table-editor-wrapper');
                
                // Capture explanation image if present
                const explanationImgPreview = block.querySelector('.explanation-image-preview');
                if (explanationImgPreview && explanationImgPreview.src) {
                    const explanationImgSrc = explanationImgPreview.src.trim();
                    const isNotHidden = explanationImgPreview.style.display !== 'none' && 
                                       window.getComputedStyle(explanationImgPreview).display !== 'none';
                    
                    if (explanationImgSrc && explanationImgSrc !== '' && explanationImgSrc !== 'undefined' && 
                        !explanationImgSrc.startsWith('undefined') && 
                        (explanationImgSrc.startsWith('data:') || explanationImgSrc.startsWith('http')) &&
                        isNotHidden) {
                        qObj.explanationImage = explanationImgSrc;
                        console.log('Captured explanation image data for question');
                    }
                }
                
                // Check for uploaded image first
                if (imgPreview && imgPreview.src) {
                    const imgSrc = imgPreview.src.trim();
                    // Check if it's a valid data URL (starts with data:) or a valid URL
                    // Check if image is not explicitly hidden
                    const isNotHidden = imgPreview.style.display !== 'none' && 
                                       window.getComputedStyle(imgPreview).display !== 'none';
                    
                    if (imgSrc && imgSrc !== '' && imgSrc !== 'undefined' && 
                        !imgSrc.startsWith('undefined') && 
                        (imgSrc.startsWith('data:') || imgSrc.startsWith('http')) &&
                        isNotHidden) {
                        qObj.imageData = imgSrc;
                        // Capture image dimensions if provided
                        if (imageWidthInput && imageWidthInput.value) {
                            const width = parseFloat(imageWidthInput.value);
                            if (!isNaN(width) && width > 0) {
                                qObj.imageWidth = width;
                            }
                        }
                        if (imageHeightInput && imageHeightInput.value) {
                            const height = parseFloat(imageHeightInput.value);
                            if (!isNaN(height) && height > 0) {
                                qObj.imageHeight = height;
                            }
                        }
                        console.log('Captured image data for question:', qObj.imageData.substring(0, 50) + '...');
                    } else {
                        console.log('Image preview found but not captured. src:', imgSrc ? imgSrc.substring(0, 50) : 'empty', 'isNotHidden:', isNotHidden);
                    }
                } else {
                    console.log('No image preview found for question block');
                }
                
                // If no image from preview, check table
                if (!qObj.imageData && tableContainer && tableWrapper) {
                    const tableVisible = tableContainer.style.display !== 'none' && 
                                        window.getComputedStyle(tableContainer).display !== 'none';
                    if (tableVisible) {
                        const table = tableWrapper.querySelector('table');
                        if (table) {
                            // Convert table textareas to actual table cells with text
                            const tableClone = table.cloneNode(true);
                            const cells = tableClone.querySelectorAll('.table-cell-input');
                            cells.forEach(textarea => {
                                const td = textarea.parentElement;
                                const text = textarea.value || '';
                                // Replace textarea with text content, preserving line breaks
                                td.innerHTML = text.replace(/\n/g, '<br>');
                                td.style.border = '1px solid #ddd';
                                td.style.padding = '8px';
                                td.style.verticalAlign = 'top';
                            });
                            // Save table HTML
                            qObj.tableData = tableClone.outerHTML;
                            console.log('Captured table data for question');
                        }
                    }
                }
                if (sectionIndex !== null) qObj.sectionIndex = sectionIndex;
                questions.push(qObj);
            }
        }

        if (questions.length === 0) {
            alert('Please add at least one question.');
            return;
        }

        let serverSuccess = false;
        try {
            const res = await adminFetch(`/api/admin/tests/${testId}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions })
            });
            
            // Check if response is ok before trying to parse JSON
            let data;
            if (!res.ok) {
                let errorMessage = `Server error: ${res.status}`;
                try {
                    // Try to parse as JSON first for better error messages
                    const contentType = res.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        data = await res.json();
                        errorMessage = data.message || errorMessage;
                    } else {
                        const errorText = await res.text();
                        errorMessage += ` - ${errorText}`;
                    }
                } catch (e) {
                    // If we can't read the error, just use the status
                    console.warn('Could not parse error response', e);
                }
                console.error('Server responded with error:', res.status, errorMessage);
                throw new Error(errorMessage);
            } else {
                data = await res.json();
            }
            if (data.success) {
                serverSuccess = true;
                // After saving, fetch the test from server and sync its questions to localStorage
                const res2 = await fetch(`/api/tests/${testId}`);
                const testData = await res2.json();
                if (testData.success && testData.test) {
                    // Update in separate test storage
                    const tests = getFromLS(`${TEST_DATA_PREFIX}${categoryId}`, []);
                    const idx = tests.findIndex(t => t.id === testId);
                    if (idx !== -1) {
                        tests[idx].questions = testData.test.questions || [];
                        saveToLS(`${TEST_DATA_PREFIX}${categoryId}`, tests);
                    }
                    // Also update in exam structure
                    const exams = getFromLS(`${EXAM_DATA_PREFIX}${categoryId}`);
                    const examIdx = exams.findIndex(e => e.id === examId);
                    if (examIdx !== -1 && exams[examIdx].tests) {
                        const tIdx = exams[examIdx].tests.findIndex(t => t.id === testId);
                        if (tIdx !== -1) {
                            exams[examIdx].tests[tIdx].questions = testData.test.questions || [];
                            saveToLS(`${EXAM_DATA_PREFIX}${categoryId}`, exams);
                        }
                    }
                }
                alert(`Successfully saved ${questions.length} questions to the test (MongoDB) and synced to localStorage!`);
            } else {
                console.warn('Server returned success:false', data);
                throw new Error(data.message || 'Server returned an error');
            }
        } catch (err) {
            console.error('Server save failed, falling back to localStorage', err);
        }
        if (!serverSuccess) {
            // Try exam structure first
            const exams = getFromLS(`${EXAM_DATA_PREFIX}${categoryId}`);
            const examIndex = exams.findIndex(e => e.id === examId);
            if (examIndex !== -1 && exams[examIndex].tests) {
                const testIndex = exams[examIndex].tests.findIndex(t => t.id === testId);
                if (testIndex !== -1) {
                    exams[examIndex].tests[testIndex].questions = questions;
                    saveToLS(`${EXAM_DATA_PREFIX}${categoryId}`, exams);
                }
            }
            // Also update in separate test storage
            const tests = getFromLS(`${TEST_DATA_PREFIX}${categoryId}`, []);
            const separateTestIndex = tests.findIndex(t => t.id === testId);
            if (separateTestIndex !== -1) {
                tests[separateTestIndex].questions = questions;
                saveToLS(`${TEST_DATA_PREFIX}${categoryId}`, tests);
            }
            alert(`Successfully saved ${questions.length} questions locally (localStorage). Server unavailable.`);
        }

        questionsContainer.innerHTML = '';
        questionCounter = 0;
        updateQuestionCount();
        questionForm.reset();
    });


    // Make functions globally available
    
    // Debug function to check stored data
    window.debugAdminData = function() {
        console.log('=== ADMIN DATA DEBUG ===');
        const categories = getFromLS(ADMIN_CATEGORIES_KEY);
        console.log('Categories:', categories);
        
        categories.forEach(cat => {
            console.log(`\n--- Category: ${cat.name} (${cat.id}) ---`);
            const exams = getFromLS(`${EXAM_DATA_PREFIX}${cat.id}`);
            console.log('Exams:', exams);
            
            exams.forEach(exam => {
                console.log(`  Exam: ${exam.name} (${exam.id})`);
                console.log(`  Tests in exam:`, exam.tests || 'No tests array');
            });
            
            const tests = getFromLS(`${TEST_DATA_PREFIX}${cat.id}`, []);
            console.log('Separate tests:', tests);
        });
        console.log('=== END DEBUG ===');
    };

    // Load All Data on Page Load - Fetch from database first, then sync to localStorage
    async function loadAllData() {
        try {
            // Step 1: Fetch categories from database
            const categoriesRes = await adminFetch('/api/admin/categories');
            const categoriesData = await categoriesRes.json();
            
            if (categoriesData.success && Array.isArray(categoriesData.categories)) {
                // Save categories to localStorage
                saveToLS(ADMIN_CATEGORIES_KEY, categoriesData.categories);
                
                // Step 2: For each category, fetch exams and tests
                for (const category of categoriesData.categories) {
                    const categoryId = category.id;
                    
                    // Fetch exams for this category
                    try {
                        const examsRes = await adminFetch(`/api/admin/exams/${categoryId}`);
                        const examsData = await examsRes.json();
                        if (examsData.success && Array.isArray(examsData.exams)) {
                            // Save exams to localStorage
                            saveToLS(`${EXAM_DATA_PREFIX}${categoryId}`, examsData.exams);
                        }
                    } catch (err) {
                        console.warn(`Error loading exams for category ${categoryId}:`, err);
                    }
                    
                    // Fetch tests for this category
                    try {
                        const testsRes = await adminFetch(`/api/admin/tests/${categoryId}`);
                        const testsData = await testsRes.json();
                        if (testsData.success && Array.isArray(testsData.tests)) {
                            // Save tests to localStorage
                            saveToLS(`${TEST_DATA_PREFIX}${categoryId}`, testsData.tests);
                        }
                    } catch (err) {
                        console.warn(`Error loading tests for category ${categoryId}:`, err);
                    }
                }
            } else {
                console.warn('Failed to load categories from database, using localStorage data');
            }
        } catch (err) {
            console.error('Error loading data from database:', err);
            console.warn('Falling back to localStorage data');
        }
        
        // Step 3: Render all data (from localStorage, which now has synced database data)
        renderCategories();
        renderExams();
        renderTests();
    }

    loadAllData();

    // --- Course Management Functions ---
    
    // Course Category Management
    const courseCategoryForm = document.getElementById('course-category-form');
    const courseCategoryIdInput = document.getElementById('course-category-id');
    const courseCategoryNameInput = document.getElementById('course-category-name');
    const courseCategoryDescInput = document.getElementById('course-category-desc');
    const courseCategoryList = document.getElementById('course-category-list');
    
    // Course Management
    const courseForm = document.getElementById('course-form');
    const courseIdInput = document.getElementById('course-id');
    const courseCategorySelect = document.getElementById('course-category-select');
    const courseNameInput = document.getElementById('course-name');
    const courseDescInput = document.getElementById('course-desc');
    const courseDetailsInput = document.getElementById('course-details');
    const courseCostInput = document.getElementById('course-cost');
    const courseValidityInput = document.getElementById('course-validity');
    const courseList = document.getElementById('course-list');
    
    // Lesson Management
    const lessonForm = document.getElementById('lesson-form');
    const lessonIdInput = document.getElementById('lesson-id');
    const lessonCategorySelect = document.getElementById('lesson-category-select');
    const lessonCourseSelect = document.getElementById('lesson-course-select');
    // removed lesson title input
    // New subjects UI elements
    const lessonHasSubjectsYes = document.getElementById('lesson-has-subjects-yes');
    const lessonHasSubjectsNo = document.getElementById('lesson-has-subjects-no');
    const lessonSubjectsContainer = document.getElementById('lesson-subjects-container');
    const lessonNumSubjectsInput = document.getElementById('lesson-num-subjects');
    const configureSubjectsBtn = document.getElementById('configure-subjects-btn');
    const lessonSubjectRows = document.getElementById('lesson-subject-rows');
    const lessonList = document.getElementById('lesson-list');
    
    // Load Course Categories
    async function loadCourseCategories() {
        try {
            const res = await adminFetch('/api/admin/course-categories');
            const data = await res.json();
            if (data.success && Array.isArray(data.categories)) {
                renderCourseCategories(data.categories);
                populateCourseCategorySelects(data.categories);
            }
        } catch (err) {
            console.error('Error loading course categories:', err);
        }
    }
    
    function renderCourseCategories(categories) {
        courseCategoryList.innerHTML = '';
        categories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-info">
                    <strong>${cat.name}</strong>
                    <span>ID: ${cat.id}</span>
                    ${cat.description ? `<span style="color:#64748b; display:block; margin-top:4px;">${cat.description}</span>` : ''}
                </div>
                <div class="list-item-actions">
                    <button class="btn-edit" data-id="${cat.id}">Edit</button>
                    <button class="btn-delete" data-id="${cat.id}">Delete</button>
                </div>
            `;
            courseCategoryList.appendChild(item);
        });
    }
    
    function populateCourseCategorySelects(categories) {
        courseCategorySelect.innerHTML = '<option value="">-- Select Course Category --</option>';
        lessonCategorySelect.innerHTML = '<option value="">-- Select Course Category --</option>';
        categories.forEach(cat => {
            const option1 = new Option(cat.name, cat.id);
            const option2 = new Option(cat.name, cat.id);
            courseCategorySelect.add(option1);
            lessonCategorySelect.add(option2);
        });
    }
    
    // Course Category Form Handler
    const courseCategoryFormEl = document.getElementById('course-category-form');
    if (courseCategoryFormEl) {
        courseCategoryFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idInput = document.getElementById('course-category-id');
            const nameInput = document.getElementById('course-category-name');
            const descInput = document.getElementById('course-category-desc');
            
            if (!nameInput) {
                alert('Form elements not found. Please refresh the page.');
                return;
            }
            
            const id = idInput ? idInput.value.trim() : '';
            const name = nameInput.value.trim();
            const description = descInput ? descInput.value.trim() : '';
            
            if (!name) {
                alert('Category name is required');
                return;
            }
            
            try {
                console.log('Sending course category request:', { id: id || undefined, name, description });
                const res = await adminFetch('/api/admin/course-categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id || undefined, name, description })
                });
                
                console.log('Response status:', res.status);
                const contentType = res.headers.get('content-type');
                console.log('Response content-type:', contentType);
                
                let data;
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await res.text();
                    console.error('Expected JSON but got:', text.substring(0, 200));
                    alert('Server returned non-JSON response. Please check server logs. Status: ' + res.status);
                    return;
                } else {
                    data = await res.json();
                    console.log('Response data:', data);
                }
                
                if (data.success && data.category) {
                    alert(id ? 'Course category updated successfully!' : 'Course category saved successfully!');
                    if (idInput) idInput.value = '';
                    courseCategoryFormEl.reset();
                    loadCourseCategories();
                } else {
                    alert(data.message || 'Failed to save course category');
                }
            } catch (err) {
                console.error('Error saving course category:', err);
                alert('Error saving course category: ' + err.message);
            }
        });
    }
    
    // Course Category Edit/Delete
    if (courseCategoryList) {
        courseCategoryList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-edit')) {
                const id = e.target.dataset.id;
                try {
                    const res = await adminFetch('/api/admin/course-categories');
                    const data = await res.json();
                    if (data.success) {
                        const category = data.categories.find(cat => cat.id === id);
                        if (category) {
                            courseCategoryIdInput.value = category.id;
                            courseCategoryNameInput.value = category.name;
                            courseCategoryDescInput.value = category.description || '';
                        }
                    }
                } catch (err) {
                    console.error('Error loading category:', err);
                }
            } else if (e.target.classList.contains('btn-delete')) {
                const id = e.target.dataset.id;
                if (!confirm('Are you sure you want to delete this course category? This will also delete all associated courses and lessons.')) {
                    return;
                }
                try {
                    const res = await adminFetch(`/api/admin/course-categories/${id}`, {
                        method: 'DELETE'
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Course category deleted successfully!');
                        loadCourseCategories();
                        loadCourses();
                        loadLessons();
                    } else {
                        alert(data.message || 'Failed to delete course category');
                    }
                } catch (err) {
                    console.error('Error deleting category:', err);
                    alert('Error deleting course category');
                }
            }
        });
    }
    
    // Load Courses by Category
    async function loadCourses(categoryId = null) {
        if (!categoryId) {
            categoryId = courseCategorySelect.value;
            if (!categoryId) {
                courseList.innerHTML = '<p style="padding:20px; color:#64748b;">Please select a course category first.</p>';
                return;
            }
        }
        try {
            const res = await adminFetch(`/api/admin/courses/${categoryId}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.courses)) {
                renderCourses(data.courses);
            } else {
                courseList.innerHTML = '<p style="padding:20px; color:#64748b;">No courses found for this category.</p>';
            }
        } catch (err) {
            console.error('Error loading courses:', err);
            courseList.innerHTML = '<p style="padding:20px; color:#e53e3e;">Error loading courses.</p>';
        }
    }
    
    function renderCourses(courses) {
        courseList.innerHTML = '';
        courses.forEach(course => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-info">
                    <strong>${course.name}</strong>
                    <span>ID: ${course.id}</span>
                    ${course.description ? `<span style="color:#64748b; display:block; margin-top:4px;">${course.description}</span>` : ''}
                    ${course.courseDetails ? `<span style="color:#475569; display:block; margin-top:4px;">Details: ${course.courseDetails}</span>` : ''}
                    ${course.courseCost ? `<span style="color:#475569; display:block; margin-top:4px;">Cost: ${course.courseCost}</span>` : ''}
                    ${course.courseValidity ? `<span style="color:#475569; display:block; margin-top:4px;">Validity: ${course.courseValidity}</span>` : ''}
                </div>
                <div class="list-item-actions">
                    <button class="btn-edit" data-id="${course.id}" data-cat-id="${course.categoryId}">Edit</button>
                    <button class="btn-delete" data-id="${course.id}">Delete</button>
                </div>
            `;
            courseList.appendChild(item);
        });
    }
    
    // Course Form Handler
    if (courseForm) {
        courseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = courseIdInput.value.trim();
            const categoryId = courseCategorySelect.value;
            const name = courseNameInput.value.trim();
            const description = courseDescInput.value.trim();
            const courseDetails = courseDetailsInput ? courseDetailsInput.value.trim() : '';
            const courseCost = courseCostInput ? courseCostInput.value.trim() : '';
            const courseValidity = courseValidityInput ? courseValidityInput.value.trim() : '';
            
            if (!categoryId) {
                alert('Please select a course category');
                return;
            }
            
            try {
                const res = await adminFetch('/api/admin/courses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id || undefined, categoryId, name, description, courseDetails, courseCost, courseValidity })
                });
                const data = await res.json();
                if (data.success && data.course) {
                    alert(id ? 'Course updated successfully!' : 'Course saved successfully!');
                    courseIdInput.value = '';
                    courseIdInput.value = '';
                    if (courseDetailsInput) courseDetailsInput.value = '';
                    if (courseCostInput) courseCostInput.value = '';
                    if (courseValidityInput) courseValidityInput.value = '';
                    courseForm.reset();
                    loadCourses();
                    populateLessonCourseSelect();
                } else {
                    alert(data.message || 'Failed to save course');
                }
            } catch (err) {
                console.error('Error saving course:', err);
                alert('Error saving course');
            }
        });
        
        // Load courses when category changes
        courseCategorySelect.addEventListener('change', () => {
            loadCourses();
        });
    }
    
    // Course Edit/Delete
    if (courseList) {
        courseList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-edit')) {
                const id = e.target.dataset.id;
                const categoryId = e.target.dataset.catId;
                try {
                    const res = await adminFetch(`/api/admin/courses/${categoryId}`);
                    const data = await res.json();
                    if (data.success) {
                        const course = data.courses.find(c => c.id === id);
                        if (course) {
                            courseIdInput.value = course.id;
                            courseCategorySelect.value = course.categoryId;
                            courseNameInput.value = course.name;
                            courseDescInput.value = course.description || '';
                            if (courseDetailsInput) courseDetailsInput.value = course.courseDetails || '';
                            if (courseCostInput) courseCostInput.value = course.courseCost || '';
                            if (courseValidityInput) courseValidityInput.value = course.courseValidity || '';
                        }
                    }
                } catch (err) {
                    console.error('Error loading course:', err);
                }
            } else if (e.target.classList.contains('btn-delete')) {
                const id = e.target.dataset.id;
                if (!confirm('Are you sure you want to delete this course? This will also delete all associated lessons.')) {
                    return;
                }
                try {
                    const res = await adminFetch(`/api/admin/courses/${id}`, {
                        method: 'DELETE'
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Course deleted successfully!');
                        loadCourses();
                        loadLessons();
                    } else {
                        alert(data.message || 'Failed to delete course');
                    }
                } catch (err) {
                    console.error('Error deleting course:', err);
                    alert('Error deleting course');
                }
            }
        });
    }
    
    // Populate Lesson Course Select
    async function populateLessonCourseSelect() {
        const categoryId = lessonCategorySelect.value;
        if (!categoryId) {
            lessonCourseSelect.innerHTML = '<option value="">-- Select Course --</option>';
            return;
        }
        try {
            const res = await adminFetch(`/api/admin/courses/${categoryId}`);
            const data = await res.json();
            lessonCourseSelect.innerHTML = '<option value="">-- Select Course --</option>';
            if (data.success && Array.isArray(data.courses)) {
                data.courses.forEach(course => {
                    const option = new Option(course.name, course.id);
                    lessonCourseSelect.add(option);
                });
            }
        } catch (err) {
            console.error('Error loading courses for lessons:', err);
        }
    }
    
    // Load courses when category changes in lesson form
    if (lessonCategorySelect) {
        lessonCategorySelect.addEventListener('change', () => {
            populateLessonCourseSelect();
            loadLessons();
        });
    }
    
    if (lessonCourseSelect) {
        lessonCourseSelect.addEventListener('change', () => {
            loadLessons();
        });
    }
    
    // Subjects UI wiring
    if (lessonHasSubjectsYes && lessonHasSubjectsNo) {
        lessonHasSubjectsYes.addEventListener('change', () => {
            if (lessonSubjectsContainer) lessonSubjectsContainer.style.display = 'block';
        });
        lessonHasSubjectsNo.addEventListener('change', () => {
            if (lessonSubjectsContainer) lessonSubjectsContainer.style.display = 'none';
        });
    }

    function renderSubjectRows(num) {
        if (!lessonSubjectRows) return;
        lessonSubjectRows.innerHTML = '';
        const n = parseInt(num) || 0;
        for (let i = 1; i <= n; i++) {
            const row = document.createElement('div');
            row.className = 'section-row';
            row.dataset.index = i - 1;
            row.innerHTML = `
                <h4>Subject ${i}</h4>
                <input type="text" class="subject-name" placeholder="Subject name">
                <input type="text" class="subject-desc" placeholder="Subject description">
                <hr>
            `;
            lessonSubjectRows.appendChild(row);
        }
    }

    if (configureSubjectsBtn) {
        configureSubjectsBtn.addEventListener('click', () => {
            const num = lessonNumSubjectsInput ? lessonNumSubjectsInput.value : '';
            if (!num || parseInt(num) < 1) { alert('Please enter a valid number of subjects (>=1)'); return; }
            renderSubjectRows(num);
        });
    }

    // Load Lessons by Course
    async function loadLessons() {
        const courseId = lessonCourseSelect.value;
        if (!courseId) {
            lessonList.innerHTML = '<p style="padding:20px; color:#64748b;">Please select a course first.</p>';
            return;
        }
        try {
            const res = await adminFetch(`/api/admin/lessons/${courseId}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.lessons)) {
                renderLessons(data.lessons);
            } else {
                lessonList.innerHTML = '<p style="padding:20px; color:#64748b;">No lessons found for this course.</p>';
            }
        } catch (err) {
            console.error('Error loading lessons:', err);
            lessonList.innerHTML = '<p style="padding:20px; color:#e53e3e;">Error loading lessons.</p>';
        }
    }
    
    function renderLessons(lessons) {
        lessonList.innerHTML = '';
        lessons.forEach(lesson => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-info">
                    <strong>${lesson.title}</strong>
                    <span>ID: ${lesson.id}</span>
                    ${Array.isArray(lesson.subjects) && lesson.subjects.length > 0 ? `
                        <div style="margin-top:8px; font-size:0.9rem; color:#64748b;">
                            📚 Subjects: ${lesson.subjects.length}
                        </div>
                    ` : ''}
                </div>
                <div class="list-item-actions">
                    <button class="btn-edit" data-id="${lesson.id}" data-course-id="${lesson.courseId}" data-cat-id="${lesson.categoryId}">Edit</button>
                    <button class="btn-delete" data-id="${lesson.id}">Delete</button>
                </div>
            `;
            lessonList.appendChild(item);
        });
    }
    
    // Lesson Form Handler
    if (lessonForm) {
        lessonForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = lessonIdInput.value.trim();
            const categoryId = lessonCategorySelect.value;
            const courseId = lessonCourseSelect.value;
            const title = '';
            const hasSubjects = lessonHasSubjectsYes && lessonHasSubjectsYes.checked ? true : false;
            const subjects = [];
            if (hasSubjects && lessonSubjectRows) {
                const rows = lessonSubjectRows.querySelectorAll('.section-row');
                rows.forEach(row => {
                    const name = (row.querySelector('.subject-name') || {}).value || '';
                    const description = (row.querySelector('.subject-desc') || {}).value || '';
                    if (name.trim()) subjects.push({ name: name.trim(), description: description.trim() });
                });
                if (subjects.length === 0) {
                    alert('Please add at least one subject or choose No.');
                    return;
                }
            }
            
            if (!categoryId || !courseId) {
                alert('Please fill in all required fields');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('id', id || '');
                formData.append('categoryId', categoryId);
                formData.append('courseId', courseId);
                if (title) formData.append('title', title);
                formData.append('hasSubjects', hasSubjects ? 'true' : 'false');
                formData.append('subjects', JSON.stringify(subjects));
                
                const res = await adminFetch('/api/admin/lessons', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success && data.lesson) {
                    alert(id ? 'Lesson updated successfully!' : 'Lesson saved successfully!');
                    lessonIdInput.value = '';
                    lessonForm.reset();
                    if (lessonSubjectsContainer) {
                        lessonSubjectsContainer.style.display = 'none';
                        if (lessonSubjectRows) lessonSubjectRows.innerHTML = '';
                    }
                    loadLessons();
                } else {
                    alert(data.message || 'Failed to save lesson');
                }
            } catch (err) {
                console.error('Error saving lesson:', err);
                alert('Error saving lesson');
            }
        });
    }
    
    // Lesson Edit/Delete
    if (lessonList) {
        lessonList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-edit')) {
                const id = e.target.dataset.id;
                const courseId = e.target.dataset.courseId;
                const categoryId = e.target.dataset.catId;
                try {
                    const res = await adminFetch(`/api/admin/lessons/${courseId}`);
                    const data = await res.json();
                    if (data.success) {
                        const lesson = data.lessons.find(l => l.id === id);
                        if (lesson) {
                            lessonIdInput.value = lesson.id;
                            lessonCategorySelect.value = lesson.categoryId;
                            populateLessonCourseSelect();
                            setTimeout(() => {
                                lessonCourseSelect.value = lesson.courseId;
                                lessonTitleInput.value = lesson.title;
                                // Populate subjects UI if present
                                if (Array.isArray(lesson.subjects) && lesson.subjects.length > 0) {
                                    if (lessonHasSubjectsYes) lessonHasSubjectsYes.checked = true;
                                    if (lessonHasSubjectsNo) lessonHasSubjectsNo.checked = false;
                                    if (lessonSubjectsContainer) lessonSubjectsContainer.style.display = 'block';
                                    if (lessonNumSubjectsInput) lessonNumSubjectsInput.value = lesson.subjects.length;
                                    renderSubjectRows(lesson.subjects.length);
                                    const rows = lessonSubjectRows ? lessonSubjectRows.querySelectorAll('.section-row') : [];
                                    rows.forEach((row, idx) => {
                                        const subj = lesson.subjects[idx] || {};
                                        const nameEl = row.querySelector('.subject-name');
                                        const descEl = row.querySelector('.subject-desc');
                                        if (nameEl) nameEl.value = subj.name || '';
                                        if (descEl) descEl.value = subj.description || '';
                                    });
                                } else {
                                    if (lessonHasSubjectsYes) lessonHasSubjectsYes.checked = false;
                                    if (lessonHasSubjectsNo) lessonHasSubjectsNo.checked = true;
                                    if (lessonSubjectsContainer) lessonSubjectsContainer.style.display = 'none';
                                    if (lessonSubjectRows) lessonSubjectRows.innerHTML = '';
                                }
                            }, 100);
                        }
                    }
                } catch (err) {
                    console.error('Error loading lesson:', err);
                }
            } else if (e.target.classList.contains('btn-delete')) {
                const id = e.target.dataset.id;
                if (!confirm('Are you sure you want to delete this lesson? This will also delete associated video and PDF files.')) {
                    return;
                }
                try {
                    const res = await adminFetch(`/api/admin/lessons/${id}`, {
                        method: 'DELETE'
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Lesson deleted successfully!');
                        loadLessons();
                    } else {
                        alert(data.message || 'Failed to delete lesson');
                    }
                } catch (err) {
                    console.error('Error deleting lesson:', err);
                    alert('Error deleting lesson');
                }
            }
        });
    }
    
    // Setup Courses Navigation Buttons
    function setupCoursesNavButtons() {
        const coursesNav = document.getElementById('courses-section')?.querySelector('.admin-nav');
        if (coursesNav && !coursesNav.dataset.listenerAttached) {
            coursesNav.dataset.listenerAttached = 'true';
            coursesNav.addEventListener('click', (e) => {
                const button = e.target.closest('.nav-btn');
                if (!button) return;
                const targetSection = button.dataset.section;
                if (!targetSection) return;
                
                // Remove active class
                coursesNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Hide all sections
                ['course-categories', 'courses-list', 'lessons', 'add-media'].forEach(name => {
                    const el = document.getElementById(`${name}-section`);
                    if (el) el.style.display = 'none';
                });
                
                // Show target section
                const targetEl = document.getElementById(`${targetSection}-section`);
                if (targetEl) {
                    targetEl.style.display = 'block';
                    targetEl.style.opacity = '0';
                    targetEl.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        targetEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        targetEl.style.opacity = '1';
                        targetEl.style.transform = 'translateY(0)';
                    }, 10);
                    
                    // Load data when section is shown
                    if (targetSection === 'course-categories') {
                        loadCourseCategories();
                    } else if (targetSection === 'courses-list') {
                        loadCourses();
                    } else if (targetSection === 'lessons') {
                        loadLessons();
                    } else if (targetSection === 'add-media') {
                        initAddMediaSection();
                    }
                }
            });
        }
    }
    
    // Setup courses nav when courses section is shown
    const coursesBtnEl = document.getElementById('courses-btn');
    if (coursesBtnEl) {
        coursesBtnEl.addEventListener('click', () => {
            setTimeout(() => {
                setupCoursesNavButtons();
            }, 50);
        });
    }

    // --- Add Video/PDF Section Logic ---
    function initAddMediaSection() {
        const mediaCategorySelect = document.getElementById('media-category-select');
        const mediaCourseSelect = document.getElementById('media-course-select');
        const mediaSubjectSelect = document.getElementById('media-subject-select');
        const openAddVideoModalBtn = document.getElementById('open-add-video-modal');
        const addVideoModal = document.getElementById('add-video-modal');
        const addVideoForm = document.getElementById('add-video-form');
        const cancelAddVideoBtn = document.getElementById('cancel-add-video');
        const inlinePdfInput = document.getElementById('media-pdf-inline');
        const inlinePdfUploadBtn = document.getElementById('upload-pdf-inline-btn');
        const existingMediaList = document.getElementById('existing-media-list');

        // Load categories
        (async function populateCategories() {
            try {
                const res = await adminFetch('/api/admin/course-categories');
                const data = await res.json();
                if (mediaCategorySelect) {
                    mediaCategorySelect.innerHTML = '<option value="">-- Select Course Category --</option>';
                    if (data.success && Array.isArray(data.categories)) {
                        data.categories.forEach(cat => {
                            mediaCategorySelect.add(new Option(cat.name, cat.id));
                        });
                    }
                }
            } catch (err) { /* ignore */ }
        })();

        // When category changes, load courses
        if (mediaCategorySelect) {
            mediaCategorySelect.onchange = async () => {
                const categoryId = mediaCategorySelect.value;
                mediaCourseSelect.innerHTML = '<option value="">-- Select Course --</option>';
                mediaSubjectSelect.innerHTML = '<option value="">-- Select Subject (auto) --</option>';
                if (!categoryId) return;
                try {
                    const res = await adminFetch(`/api/admin/courses/${categoryId}`);
                    const data = await res.json();
                    if (data.success && Array.isArray(data.courses)) {
                        data.courses.forEach(course => mediaCourseSelect.add(new Option(course.name, course.id)));
                    }
                } catch (err) { /* ignore */ }
            };
        }

        // When course changes, load subjects by aggregating lessons' subjects for that course
        if (mediaCourseSelect) {
            mediaCourseSelect.onchange = async () => {
                const courseId = mediaCourseSelect.value;
                mediaSubjectSelect.innerHTML = '<option value="">-- Select Subject (auto) --</option>';
                if (!courseId) return;
                try {
                    const res = await adminFetch(`/api/admin/lessons/${courseId}`);
                    const data = await res.json();
                    if (data.success && Array.isArray(data.lessons)) {
                        const set = new Set();
                        data.lessons.forEach(l => {
                            if (Array.isArray(l.subjects)) {
                                l.subjects.forEach(s => { if (s && s.name) set.add(s.name); });
                            }
                            if (l.subjectName) set.add(l.subjectName);
                        });
                        const subjects = Array.from(set);
                        if (subjects.length === 0) {
                            mediaSubjectSelect.add(new Option('No subjects found (you can leave it blank)', ''));
                        } else {
                            subjects.forEach(name => mediaSubjectSelect.add(new Option(name, name)));
                        }
                        if (existingMediaList) {
                            renderExistingMedia(data.lessons, mediaSubjectSelect.value);
                        }
                    }
                } catch (err) { /* ignore */ }
            };
        }

        // Open/close Add Video inline form
        if (openAddVideoModalBtn && addVideoModal) {
            openAddVideoModalBtn.onclick = () => {
                addVideoModal.style.display = 'block';
            };
        }
        if (cancelAddVideoBtn && addVideoModal) {
            cancelAddVideoBtn.onclick = () => { addVideoModal.style.display = 'none'; };
        }

        // Submit Add Video form
        if (addVideoForm) {
            addVideoForm.onsubmit = async (e) => {
                e.preventDefault();
                const categoryId = mediaCategorySelect.value;
                const courseId = mediaCourseSelect.value;
                const subjectName = mediaSubjectSelect.value;
                const idEl = document.getElementById('video-id');
                const titleEl = document.getElementById('video-title');
                const descEl = document.getElementById('video-description');
                const videoFileEl = document.getElementById('video-file');
                const pdfFileEl = document.getElementById('video-pdf-file');
                const thumbFileEl = document.getElementById('video-thumbnail-file');
                const title = titleEl ? titleEl.value.trim() : '';
                const description = descEl ? descEl.value.trim() : '';
                const videoFile = videoFileEl ? videoFileEl.files[0] : null;
                const pdfFile = pdfFileEl ? pdfFileEl.files[0] : null;
                const thumbFile = thumbFileEl ? thumbFileEl.files[0] : null;

                if (!categoryId || !courseId || !title) { alert('Select category/course and provide video title'); return; }
                try {
                    const fd = new FormData();
                    fd.append('categoryId', categoryId);
                    fd.append('courseId', courseId);
                    if (idEl && idEl.value) fd.append('id', idEl.value);
                    fd.append('title', title);
                    if (subjectName) fd.append('subjectName', subjectName);
                    if (description) fd.append('videoDescription', description);
                    if (videoFile) fd.append('video', videoFile);
                    if (pdfFile) fd.append('pdf', pdfFile);
                    if (thumbFile) fd.append('thumbnail', thumbFile);
                    const res = await adminFetch('/api/admin/lessons', { method: 'POST', body: fd });
                    let data;
                    const ct = res.headers.get('content-type') || '';
                    if (ct.includes('application/json')) {
                        data = await res.json();
                    } else {
                        const text = await res.text();
                        throw new Error(`Unexpected response: ${res.status} ${text.substring(0,200)}`);
                    }
                    if (data.success) {
                        alert('Video saved successfully');
                        addVideoModal.style.display = 'none';
                        addVideoForm.reset();
                        try {
                            const r = await adminFetch(`/api/admin/lessons/${courseId}`);
                            const d = await r.json();
                            if (d.success) renderExistingMedia(d.lessons || [], mediaSubjectSelect.value);
                        } catch (e) { /* ignore */ }
                    } else {
                        alert(data.message || 'Failed to save video');
                    }
                } catch (err) {
                    console.error('Save video error:', err);
                    alert('Error saving video: ' + (err && err.message ? err.message : 'Unknown error'));
                }
            };
        }

        // Inline PDF upload (without video)
        if (inlinePdfUploadBtn) {
            inlinePdfUploadBtn.onclick = async () => {
                const categoryId = mediaCategorySelect.value;
                const courseId = mediaCourseSelect.value;
                const subjectName = mediaSubjectSelect.value;
                const pdf = inlinePdfInput ? inlinePdfInput.files[0] : null;
                if (!categoryId || !courseId || !pdf) { alert('Select category/course and choose a PDF'); return; }
                try {
                    const fd = new FormData();
                    fd.append('categoryId', categoryId);
                    fd.append('courseId', courseId);
                    if (subjectName) fd.append('subjectName', subjectName);
                    fd.append('pdf', pdf);
                    const res = await adminFetch('/api/admin/lessons', { method: 'POST', body: fd });
                    const data = await res.json();
                    if (data.success) {
                        alert('PDF uploaded successfully');
                        inlinePdfInput.value = '';
                    } else {
                        alert(data.message || 'Failed to upload PDF');
                    }
                } catch (err) {
                    alert('Error uploading PDF');
                }
            };
        }
    }
});
