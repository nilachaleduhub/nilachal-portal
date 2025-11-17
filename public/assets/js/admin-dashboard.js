// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Check admin authentication
    const token = getAdminToken();
    if (!token) {
        window.location.href = 'hubnilu.html';
        return;
    }

    // Setup logout button
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = 'hubnilu.html';
        });
    }

    // Load all dashboard data
    loadDashboardData();
});

// Helper function to get admin token
function getAdminToken() {
    return localStorage.getItem('adminToken');
}

// Helper function for authenticated fetch
async function adminFetch(url, options = {}) {
    const token = getAdminToken();
    const headers = {
        'Content-Type': 'application/json',
        'X-Admin-Token': token || '',
        ...(options.headers || {})
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = 'hubnilu.html';
        throw new Error('Session expired. Please login again.');
    }
    
    return response;
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadUsers(),
            loadPurchases(),
            loadCategories(),
            loadExams(),
            loadTests(),
            loadCourses(),
            loadVisitorCount()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load registered users
async function loadUsers() {
    try {
        const res = await adminFetch('/api/admin/users');
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error('Users API error:', res.status, errorText);
            throw new Error(`Server error: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Users data received:', data);
        
        const usersContent = document.getElementById('users-content');
        const totalUsersEl = document.getElementById('total-users');
        
        if (data.success && Array.isArray(data.users)) {
            totalUsersEl.textContent = data.users.length;
            
            if (data.users.length === 0) {
                usersContent.innerHTML = '<p style="color: #64748b; padding: 20px;">No registered users yet.</p>';
                return;
            }
            
            let html = '<table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Registered Date</th></tr></thead><tbody>';
            data.users.forEach(user => {
                const date = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
                html += `<tr>
                    <td>${escapeHtml(user.name || 'N/A')}</td>
                    <td>${escapeHtml(user.email || 'N/A')}</td>
                    <td>${escapeHtml(user.phone || 'N/A')}</td>
                    <td>${date}</td>
                </tr>`;
            });
            html += '</tbody></table>';
            usersContent.innerHTML = html;
        } else {
            console.error('Invalid users data format:', data);
            usersContent.innerHTML = '<div class="error">Failed to load users: ' + (data.message || 'Invalid response') + '</div>';
            totalUsersEl.textContent = '0';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('users-content').innerHTML = '<div class="error">Error loading users: ' + error.message + '. Please check console for details.</div>';
        document.getElementById('total-users').textContent = '0';
    }
}

// Load purchases
async function loadPurchases() {
    try {
        const res = await adminFetch('/api/admin/purchases');
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error('Purchases API error:', res.status, errorText);
            throw new Error(`Server error: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Purchases data received:', data);
        
        const purchasesContent = document.getElementById('purchases-content');
        const totalPurchasesEl = document.getElementById('total-purchases');
        
        if (data.success && Array.isArray(data.purchases)) {
            const completedPurchases = data.purchases.filter(p => p.status === 'completed');
            totalPurchasesEl.textContent = completedPurchases.length;
            
            if (completedPurchases.length === 0) {
                purchasesContent.innerHTML = '<p style="color: #64748b; padding: 20px;">No purchases yet.</p>';
                return;
            }
            
            let html = '<table class="data-table"><thead><tr><th>User Name</th><th>Email</th><th>Purchase Type</th><th>Item Name</th><th>Amount</th><th>Purchase Date</th></tr></thead><tbody>';
            completedPurchases.forEach(purchase => {
                const date = purchase.purchasedAt ? new Date(purchase.purchasedAt).toLocaleDateString() : 'N/A';
                const amount = purchase.amount ? `₹${purchase.amount}` : 'N/A';
                const typeClass = purchase.purchaseType || 'course';
                html += `<tr>
                    <td>${escapeHtml(purchase.userName || 'N/A')}</td>
                    <td>${escapeHtml(purchase.userEmail || 'N/A')}</td>
                    <td><span class="purchase-type ${typeClass}">${(purchase.purchaseType || 'course').toUpperCase()}</span></td>
                    <td>${escapeHtml(purchase.purchaseName || 'N/A')}</td>
                    <td>${amount}</td>
                    <td>${date}</td>
                </tr>`;
            });
            html += '</tbody></table>';
            purchasesContent.innerHTML = html;
        } else {
            console.error('Invalid purchases data format:', data);
            purchasesContent.innerHTML = '<div class="error">Failed to load purchases: ' + (data.message || 'Invalid response') + '</div>';
            totalPurchasesEl.textContent = '0';
        }
    } catch (error) {
        console.error('Error loading purchases:', error);
        document.getElementById('purchases-content').innerHTML = '<div class="error">Error loading purchases: ' + error.message + '. Please check console for details.</div>';
        document.getElementById('total-purchases').textContent = '0';
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load categories
async function loadCategories() {
    try {
        const res = await adminFetch('/api/admin/categories');
        const data = await res.json();
        
        const categoriesContent = document.getElementById('categories-content');
        const totalCategoriesEl = document.getElementById('total-categories');
        
        if (data.success && Array.isArray(data.categories)) {
            totalCategoriesEl.textContent = data.categories.length;
            
            if (data.categories.length === 0) {
                categoriesContent.innerHTML = '<p style="color: #64748b; padding: 20px;">No categories yet.</p>';
                return;
            }
            
            let html = '<ul class="data-list">';
            data.categories.forEach(category => {
                html += `<li><strong>${category.name || 'Unnamed Category'}</strong>${category.description ? ` - ${category.description}` : ''}</li>`;
            });
            html += '</ul>';
            categoriesContent.innerHTML = html;
        } else {
            categoriesContent.innerHTML = '<div class="error">Failed to load categories.</div>';
            totalCategoriesEl.textContent = '0';
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        document.getElementById('categories-content').innerHTML = '<div class="error">Error loading categories. Please try again.</div>';
        document.getElementById('total-categories').textContent = '0';
    }
}

// Load exams
async function loadExams() {
    try {
        // Get all categories first to fetch exams for each
        const categoriesRes = await adminFetch('/api/admin/categories');
        const categoriesData = await categoriesRes.json();
        
        if (!categoriesData.success || !Array.isArray(categoriesData.categories)) {
            throw new Error('Failed to load categories');
        }
        
        // Fetch exams for all categories
        const allExams = [];
        for (const category of categoriesData.categories) {
            try {
                const examsRes = await adminFetch(`/api/admin/exams/${category.id}`);
                const examsData = await examsRes.json();
                if (examsData.success && Array.isArray(examsData.exams)) {
                    allExams.push(...examsData.exams.map(exam => ({
                        ...exam,
                        categoryName: category.name
                    })));
                }
            } catch (err) {
                console.warn(`Error loading exams for category ${category.id}:`, err);
            }
        }
        
        const examsContent = document.getElementById('exams-content');
        const totalExamsEl = document.getElementById('total-exams');
        
        totalExamsEl.textContent = allExams.length;
        
        if (allExams.length === 0) {
            examsContent.innerHTML = '<p style="color: #64748b; padding: 20px;">No exams yet.</p>';
            return;
        }
        
        let html = '<table class="data-table"><thead><tr><th>Exam Name</th><th>Category</th><th>Description</th></tr></thead><tbody>';
        allExams.forEach(exam => {
            html += `<tr>
                <td><strong>${escapeHtml(exam.name || 'Unnamed Exam')}</strong></td>
                <td>${escapeHtml(exam.categoryName || 'N/A')}</td>
                <td>${escapeHtml(exam.description || 'No description')}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        examsContent.innerHTML = html;
    } catch (error) {
        console.error('Error loading exams:', error);
        document.getElementById('exams-content').innerHTML = '<div class="error">Error loading exams. Please try again.</div>';
        document.getElementById('total-exams').textContent = '0';
    }
}

// Load tests
async function loadTests() {
    try {
        // Get all categories first to fetch tests for each
        const categoriesRes = await adminFetch('/api/admin/categories');
        const categoriesData = await categoriesRes.json();
        
        if (!categoriesData.success || !Array.isArray(categoriesData.categories)) {
            throw new Error('Failed to load categories');
        }
        
        // Fetch tests for all categories
        const allTests = [];
        for (const category of categoriesData.categories) {
            try {
                const testsRes = await adminFetch(`/api/admin/tests/${category.id}`);
                const testsData = await testsRes.json();
                if (testsData.success && Array.isArray(testsData.tests)) {
                    allTests.push(...testsData.tests);
                }
            } catch (err) {
                console.warn(`Error loading tests for category ${category.id}:`, err);
            }
        }
        
        const testsContent = document.getElementById('tests-content');
        const totalTestsEl = document.getElementById('total-tests');
        
        totalTestsEl.textContent = allTests.length;
        
        if (allTests.length === 0) {
            testsContent.innerHTML = '<p style="color: #64748b; padding: 20px;">No mock tests yet.</p>';
            return;
        }
        
        let html = '<ul class="data-list">';
        allTests.forEach(test => {
            html += `<li><strong>${escapeHtml(test.name || 'Unnamed Test')}</strong>${test.description ? ` - ${escapeHtml(test.description)}` : ''}</li>`;
        });
        html += '</ul>';
        testsContent.innerHTML = html;
    } catch (error) {
        console.error('Error loading tests:', error);
        document.getElementById('tests-content').innerHTML = '<div class="error">Error loading tests. Please try again.</div>';
        document.getElementById('total-tests').textContent = '0';
    }
}

// Load courses
async function loadCourses() {
    try {
        // Get all course categories first
        const courseCategoriesRes = await adminFetch('/api/admin/course-categories');
        const courseCategoriesData = await courseCategoriesRes.json();
        
        if (!courseCategoriesData.success || !Array.isArray(courseCategoriesData.categories)) {
            throw new Error('Failed to load course categories');
        }
        
        // Fetch courses for all course categories
        const allCourses = [];
        for (const category of courseCategoriesData.categories) {
            try {
                const coursesRes = await adminFetch(`/api/admin/courses/${category.id}`);
                const coursesData = await coursesRes.json();
                if (coursesData.success && Array.isArray(coursesData.courses)) {
                    allCourses.push(...coursesData.courses.map(course => ({
                        ...course,
                        categoryName: category.name
                    })));
                }
            } catch (err) {
                console.warn(`Error loading courses for category ${category.id}:`, err);
            }
        }
        
        const coursesContent = document.getElementById('courses-content');
        const totalCoursesEl = document.getElementById('total-courses');
        
        totalCoursesEl.textContent = allCourses.length;
        
        if (allCourses.length === 0) {
            coursesContent.innerHTML = '<p style="color: #64748b; padding: 20px;">No courses yet.</p>';
            return;
        }
        
        let html = '<table class="data-table"><thead><tr><th>Course Name</th><th>Category</th><th>Description</th><th>Lessons</th></tr></thead><tbody>';
        
        // Fetch lesson count for each course
        for (const course of allCourses) {
            let lessonCount = 0;
            try {
                const lessonsRes = await adminFetch(`/api/admin/lessons/${course.id}`);
                const lessonsData = await lessonsRes.json();
                if (lessonsData.success && Array.isArray(lessonsData.lessons)) {
                    lessonCount = lessonsData.lessons.length;
                }
            } catch (err) {
                console.warn(`Error loading lessons for course ${course.id}:`, err);
            }
            
            html += `<tr>
                <td><strong>${escapeHtml(course.name || 'Unnamed Course')}</strong></td>
                <td>${escapeHtml(course.categoryName || 'N/A')}</td>
                <td>${escapeHtml(course.description || 'No description')}</td>
                <td>${lessonCount}</td>
            </tr>`;
        }
        
        html += '</tbody></table>';
        coursesContent.innerHTML = html;
    } catch (error) {
        console.error('Error loading courses:', error);
        document.getElementById('courses-content').innerHTML = '<div class="error">Error loading courses. Please try again.</div>';
        document.getElementById('total-courses').textContent = '0';
    }
}

// Load visitor count
async function loadVisitorCount() {
    try {
        const res = await adminFetch('/api/admin/visitors');
        const data = await res.json();
        
        const totalVisitorsEl = document.getElementById('total-visitors');
        
        if (data.success && typeof data.count === 'number') {
            totalVisitorsEl.textContent = data.count;
        } else {
            totalVisitorsEl.textContent = '0';
        }
    } catch (error) {
        console.error('Error loading visitor count:', error);
        document.getElementById('total-visitors').textContent = '0';
    }
}

