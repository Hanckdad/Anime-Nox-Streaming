// Enhanced Utility functions
class Utils {
    // Format date dengan locale Indonesia
    static formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Kemarin';
        } else if (diffDays < 7) {
            return `${diffDays} hari lalu`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} minggu lalu`;
        }
        
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        };
        return date.toLocaleDateString('id-ID', options);
    }

    // Format waktu tayang
    static formatTime(timeString) {
        if (!timeString) return 'TBA';
        
        const [hours, minutes] = timeString.split(':');
        return `${hours}:${minutes}`;
    }

    // Truncate text dengan ellipsis
    static truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        
        return text.substr(0, maxLength).trim() + '...';
    }

    // Sanitize HTML untuk mencegah XSS
    static sanitizeHTML(str) {
        if (!str) return '';
        
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Debounce function untuk search
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    // Throttle function untuk scroll events
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Show loading state
    static showLoading(element, message = 'Memuat...') {
        if (!element) return;
        
        element.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p style="margin-top: 1rem; color: var(--text-muted);">${message}</p>
            </div>
        `;
    }

    // Show skeleton loading
    static showSkeleton(element, count = 6, type = 'anime') {
        if (!element) return;
        
        let skeletonHTML = '';
        
        if (type === 'anime') {
            for (let i = 0; i < count; i++) {
                skeletonHTML += `
                    <div class="anime-card">
                        <div class="anime-image-container skeleton" style="height: 300px;"></div>
                        <div class="anime-info">
                            <div class="skeleton skeleton-text" style="height: 20px; margin-bottom: 10px;"></div>
                            <div class="anime-meta">
                                <div class="skeleton skeleton-text short" style="height: 16px; width: 60px;"></div>
                                <div class="skeleton skeleton-text short" style="height: 16px; width: 40px;"></div>
                            </div>
                        </div>
                    </div>
                `;
            }
        } else if (type === 'episode') {
            for (let i = 0; i < count; i++) {
                skeletonHTML += `
                    <div class="episode-card">
                        <div class="skeleton skeleton-text" style="height: 20px; margin-bottom: 10px;"></div>
                        <div class="skeleton skeleton-text short" style="height: 16px; width: 120px; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text short" style="height: 14px; width: 80px;"></div>
                    </div>
                `;
            }
        }
        
        element.innerHTML = skeletonHTML;
    }

    // Show error state
    static showError(element, message, retryCallback = null) {
        if (!element) return;
        
        const retryButton = retryCallback ? `
            <button class="retry-btn" onclick="${retryCallback}">
                <i class="fas fa-redo"></i> Coba Lagi
            </button>
        ` : '';
        
        element.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Terjadi Kesalahan</h3>
                <p>${message}</p>
                ${retryButton}
            </div>
        `;
    }

    // Create anime card HTML
    static createAnimeCard(anime) {
        const score = anime.score ? `
            <div class="anime-score">
                <i class="fas fa-star"></i> ${anime.score.toFixed(1)}
            </div>
        ` : '';

        const episode = anime.episode ? `
            <span class="anime-episode">EP ${anime.episode}</span>
        ` : '<span class="anime-episode">-</span>';

        return `
            <div class="anime-card" data-id="${anime.id}" data-slug="${anime.slug}">
                <div class="anime-image-container">
                    <img src="${anime.image}" 
                         alt="${anime.title}" 
                         class="anime-image"
                         loading="lazy"
                         onerror="this.src='/assets/images/placeholder.jpg'">
                    ${score}
                    <div class="anime-overlay">
                        <div class="anime-actions">
                            <button class="action-btn watch-btn" data-slug="${anime.slug}">
                                <i class="fas fa-play"></i> Tonton
                            </button>
                            <button class="action-btn detail-btn" data-slug="${anime.slug}">
                                <i class="fas fa-info"></i> Detail
                            </button>
                        </div>
                    </div>
                </div>
                <div class="anime-info">
                    <h3 class="anime-title" title="${this.sanitizeHTML(anime.title)}">
                        ${this.sanitizeHTML(this.truncateText(anime.title, 50))}
                    </h3>
                    <div class="anime-meta">
                        ${episode}
                        <span class="anime-type">${anime.type || 'TV'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Create episode card HTML
    static createEpisodeCard(episode) {
        return `
            <div class="episode-card" data-slug="${episode.slug}">
                <div class="episode-header">
                    <span class="episode-title" title="${this.sanitizeHTML(episode.title)}">
                        ${this.sanitizeHTML(this.truncateText(episode.title, 60))}
                    </span>
                    <span class="episode-number">EP ${episode.episode}</span>
                </div>
                <div class="episode-anime">
                    <i class="fas fa-film"></i>
                    ${this.sanitizeHTML(episode.animeTitle)}
                </div>
                <div class="episode-date">
                    <i class="far fa-clock"></i>
                    ${this.formatDate(episode.date)}
                </div>
            </div>
        `;
    }

    // Create schedule item HTML
    static createScheduleItem(schedule) {
        const score = schedule.score ? `
            <span class="schedule-score">
                <i class="fas fa-star"></i> ${schedule.score.toFixed(1)}
            </span>
        ` : '';

        return `
            <div class="schedule-item" data-slug="${schedule.slug}">
                <span class="schedule-time">${this.formatTime(schedule.time)}</span>
                <span class="schedule-anime">${this.sanitizeHTML(schedule.title)}</span>
                ${score}
            </div>
        `;
    }

    // Get day name in Indonesian
    static getIndonesianDay(day) {
        const days = {
            'monday': 'Senin',
            'tuesday': 'Selasa',
            'wednesday': 'Rabu',
            'thursday': 'Kamis',
            'friday': 'Jumat',
            'saturday': 'Sabtu',
            'sunday': 'Minggu'
        };
        return days[day.toLowerCase()] || day;
    }

    // Format file size
    static formatFileSize(bytes) {
        if (!bytes) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Generate random ID
    static generateId(length = 8) {
        return Math.random().toString(36).substr(2, length);
    }

    // Check if element is in viewport
    static isInViewport(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // Smooth scroll to element
    static scrollToElement(element, offset = 80) {
        if (!element) return;
        
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }

    // Copy text to clipboard
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback untuk browser lama
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    }

    // Get URL parameters
    static getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    // Set URL parameter
    static setUrlParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.pushState({}, '', url);
    }

    // Remove URL parameter
    static removeUrlParam(key) {
        const url = new URL(window.location);
        url.searchParams.delete(key);
        window.history.pushState({}, '', url);
    }

    // Format duration
    static formatDuration(minutes) {
        if (!minutes) return 'N/A';
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours} jam ${mins} menit`;
        }
        return `${mins} menit`;
    }

    // Create rating stars
    static createRatingStars(score, maxScore = 10) {
        if (!score) return '';
        
        const normalizedScore = (score / maxScore) * 5;
        const fullStars = Math.floor(normalizedScore);
        const halfStar = normalizedScore % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        
        let stars = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star rating-star filled"></i>';
        }
        
        // Half star
        if (halfStar) {
            stars += '<i class="fas fa-star-half-alt rating-star filled"></i>';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star rating-star"></i>';
        }
        
        return stars;
    }

    // Validate email
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Format number dengan separator
    static formatNumber(num) {
        if (!num) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    // Detect mobile device
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Detect touch device
    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    // Get browser info
    static getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        
        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';
        
        return browser;
    }

    // Storage utilities
    static storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.warn('LocalStorage set failed:', error);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.warn('LocalStorage get failed:', error);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn('LocalStorage remove failed:', error);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.warn('LocalStorage clear failed:', error);
                return false;
            }
        }
    };

    // Session storage utilities
    static session = {
        set(key, value) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.warn('SessionStorage set failed:', error);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.warn('SessionStorage get failed:', error);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                sessionStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn('SessionStorage remove failed:', error);
                return false;
            }
        }
    };

    // Notification system
    static showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto remove
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);

        return notification;
    }

    static getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Modal system
    static showModal(title, content, buttons = []) {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        let buttonsHTML = '';
        if (buttons.length > 0) {
            buttonsHTML = `
                <div class="modal-footer">
                    ${buttons.map(btn => `
                        <button class="btn ${btn.class || 'btn-secondary'}" data-action="${btn.action || 'close'}">
                            ${btn.text}
                        </button>
                    `).join('')}
                </div>
            `;
        }
        
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-content">
                ${content}
            </div>
            ${buttonsHTML}
        `;
        
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);
        
        // Trigger animation
        setTimeout(() => {
            modalOverlay.classList.add('active');
        }, 100);
        
        // Close handlers
        const closeModal = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => {
                if (modalOverlay.parentNode) {
                    modalOverlay.parentNode.removeChild(modalOverlay);
                }
            }, 300);
        };
        
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        
        // Button handlers
        modal.querySelectorAll('.modal-footer .btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'close') {
                    closeModal();
                }
                // Custom actions can be handled here
            });
        });
        
        return {
            close: closeModal,
            element: modal
        };
    }

    // Image lazy loading helper
    static initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const lazyImageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const lazyImage = entry.target;
                        lazyImage.src = lazyImage.dataset.src;
                        lazyImage.classList.remove('lazy');
                        lazyImageObserver.unobserve(lazyImage);
                    }
                });
            });

            document.querySelectorAll('img.lazy').forEach(img => {
                lazyImageObserver.observe(img);
            });
        } else {
            // Fallback untuk browser lama
            document.querySelectorAll('img.lazy').forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            });
        }
    }

    // Performance measurement
    static measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`${name} took ${(end - start).toFixed(2)}ms`);
        return result;
    }

    // Async version of measurePerformance
    static async measurePerformanceAsync(name, asyncFn) {
        const start = performance.now();
        const result = await asyncFn();
        const end = performance.now();
        console.log(`${name} took ${(end - start).toFixed(2)}ms`);
        return result;
    }
}

// Initialize utilities ketika DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Utils.initLazyLoading();
});

// Export untuk penggunaan di modul lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}