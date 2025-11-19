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
    } else {
        showAuthModal(false);
    }

    // Admin logout button
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            showAuthModal(true);
            // Optionally reload to reset UI state
            setTimeout(() => { window.location.reload(); }, 150);
        });
    }

    // Admin login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setAuthError('');
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;

        if (!username || !password) {
            setAuthError('Please enter both username and password.');
            return;
        }

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success && data.token) {
                localStorage.setItem('adminToken', data.token);
                showAuthModal(false);
                window.location.reload();
            } else {
                setAuthError(data.message || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setAuthError('Login error. Please try again.');
        }
    });

    // Ad form handling
    const adForm = document.getElementById('ad-form');
    const adPosterInput = document.getElementById('ad-poster');
    const adPosterPreview = document.getElementById('ad-poster-preview');
    const adPosterPreviewImg = document.getElementById('ad-poster-preview-img');

    // Preview poster image
    if (adPosterInput) {
        adPosterInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    adPosterPreviewImg.src = event.target.result;
                    adPosterPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Submit ad form
    if (adForm) {
        adForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            const adId = document.getElementById('ad-id').value;
            const position = document.getElementById('ad-position').value;
            const isActive = document.getElementById('ad-is-active').checked;
            const posterFile = adPosterInput.files[0];

            if (adId) formData.append('id', adId);
            formData.append('position', position);
            formData.append('isActive', isActive);
            if (posterFile) formData.append('poster', posterFile);

            try {
                const res = await adminFetch('/api/admin/ads', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    alert('Ad saved successfully!');
                    adForm.reset();
                    document.getElementById('ad-id').value = '';
                    adPosterPreview.style.display = 'none';
                    loadAds();
                } else {
                    alert('Error: ' + (data.message || 'Failed to save ad'));
                }
            } catch (err) {
                console.error('Error saving ad:', err);
                alert('Error saving ad. Please try again.');
            }
        });
    }

    // Load and display ads
    async function loadAds() {
        const adsList = document.getElementById('ads-list');
        if (!adsList) return;

        try {
            const res = await adminFetch('/api/admin/ads');
            const data = await res.json();
            if (data.success && Array.isArray(data.ads)) {
                if (data.ads.length === 0) {
                    adsList.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748b;">No ads created yet.</div>';
                    return;
                }
                adsList.innerHTML = '';
                data.ads.forEach(ad => {
                    const adCard = document.createElement('div');
                    adCard.style.cssText = 'background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);';
                    adCard.innerHTML = `
                        <div style="margin-bottom: 15px;">
                            <strong style="color: #334155;">Position: ${ad.position}</strong>
                            <span style="margin-left: 10px; padding: 4px 8px; background: ${ad.isActive ? '#10b981' : '#94a3b8'}; color: white; border-radius: 4px; font-size: 0.85rem;">
                                ${ad.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        ${ad.posterPath ? `
                            <img src="${ad.posterPath}" alt="Ad Poster" style="width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px; margin-bottom: 15px; background: #f8fafc;">
                        ` : '<div style="padding: 40px; text-align: center; background: #f8fafc; border-radius: 8px; margin-bottom: 15px; color: #94a3b8;">No poster uploaded</div>'}
                        <div style="display: flex; gap: 10px;">
                            <button class="edit-ad-btn" data-ad-id="${ad.id}" style="flex: 1; padding: 8px; background: #3366ff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Edit</button>
                            <button class="delete-ad-btn" data-ad-id="${ad.id}" style="flex: 1; padding: 8px; background: #e53e3e; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Delete</button>
                        </div>
                    `;
                    adsList.appendChild(adCard);
                });

                // Edit button handlers
                adsList.querySelectorAll('.edit-ad-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const adId = btn.dataset.adId;
                        const ad = data.ads.find(a => a.id === adId);
                        if (ad) {
                            document.getElementById('ad-id').value = ad.id;
                            document.getElementById('ad-position').value = ad.position;
                            document.getElementById('ad-is-active').checked = ad.isActive;
                            if (ad.posterPath) {
                                adPosterPreviewImg.src = ad.posterPath;
                                adPosterPreview.style.display = 'block';
                            } else {
                                adPosterPreview.style.display = 'none';
                            }
                            document.getElementById('ad-form-section').scrollIntoView({ behavior: 'smooth' });
                        }
                    });
                });

                // Delete button handlers
                adsList.querySelectorAll('.delete-ad-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        if (!confirm('Are you sure you want to delete this ad?')) return;
                        const adId = btn.dataset.adId;
                        try {
                            const res = await adminFetch(`/api/admin/ads/${adId}`, { method: 'DELETE' });
                            const data = await res.json();
                            if (data.success) {
                                alert('Ad deleted successfully!');
                                loadAds();
                            } else {
                                alert('Error: ' + (data.message || 'Failed to delete ad'));
                            }
                        } catch (err) {
                            console.error('Error deleting ad:', err);
                            alert('Error deleting ad. Please try again.');
                        }
                    });
                });
            } else {
                adsList.innerHTML = '<div style="text-align: center; padding: 20px; color: #e53e3e;">Error loading ads.</div>';
            }
        } catch (err) {
            console.error('Error loading ads:', err);
            const adsList = document.getElementById('ads-list');
            if (adsList) {
                adsList.innerHTML = '<div style="text-align: center; padding: 20px; color: #e53e3e;">Error loading ads. Please try again.</div>';
            }
        }
    }

    // Load ads on page load
    if (adminToken) {
        loadAds();
    }
});











