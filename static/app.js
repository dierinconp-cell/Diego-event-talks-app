/**
 * BigQuery Release Notes Dashboard - Frontend Logic
 * Handles state, API fetching, filtering, search, and X (Twitter) composition modal.
 */

// Application State
const state = {
    allReleases: [],
    filteredReleases: [],
    activeFilter: 'all',
    searchQuery: '',
    isLoading: false,
    selectedRelease: null
};

// URL regex to identify links for character counting
const URL_REGEX = /https?:\/\/[^\s]+/g;
const TWITTER_URL_LEN = 23;

// DOM Elements
const elements = {
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search'),
    typeFilters: document.getElementById('type-filters'),
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),
    loadingSkeletons: document.getElementById('loading-skeletons'),
    releasesGrid: document.getElementById('releases-grid'),
    emptyState: document.getElementById('empty-state'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeIcon: document.getElementById('theme-icon'),
    
    // Modal elements
    tweetModal: document.getElementById('tweet-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCounter: document.getElementById('char-counter'),
    tweetPreviewText: document.getElementById('tweet-preview-text'),
    copyTweetBtn: document.getElementById('copy-tweet-btn'),
    shareXBtn: document.getElementById('share-x-btn')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchReleases();
});

// Event Listeners Setup
function setupEventListeners() {
    // Search input handlers
    elements.searchInput.addEventListener('input', handleSearch);
    elements.clearSearchBtn.addEventListener('click', clearSearch);
    
    // Filter chip handlers
    elements.typeFilters.addEventListener('click', handleFilterClick);
    
    // Refresh button handler
    elements.refreshBtn.addEventListener('click', fetchReleases);
    
    // Export CSV button handler
    if (elements.exportCsvBtn) {
        elements.exportCsvBtn.addEventListener('click', exportToCSV);
    }
    
    // Theme toggle button handler
    if (elements.themeToggleBtn) {
        elements.themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // Empty state reset button
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Modal handlers
    elements.closeModalBtn.addEventListener('click', closeTweetModal);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) closeTweetModal();
    });
    elements.tweetTextarea.addEventListener('input', handleTweetInput);
    elements.copyTweetBtn.addEventListener('click', copyTweetText);
    elements.shareXBtn.addEventListener('click', shareOnX);
    
    // Close modal on Escape key press
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.tweetModal.classList.contains('active')) {
            closeTweetModal();
        }
    });
}

// Fetch Releases from Backend
async function fetchReleases() {
    if (state.isLoading) return;
    
    setLoadingState(true);
    
    try {
        const response = await fetch('/api/releases');
        if (!response.ok) throw new Error('Network response was not ok');
        
        state.allReleases = await response.json();
        buildDynamicFilters();
        applyFiltersAndSearch();
    } catch (error) {
        console.error('Failed to fetch releases:', error);
        // Show empty state with error details if fetch fails
        showErrorEmptyState();
    } finally {
        setLoadingState(false);
    }
}

// Build Dynamic Category Filters from active data
function buildDynamicFilters() {
    if (!elements.typeFilters) return;

    // Scan unique types from allReleases
    const uniqueTypes = new Set();
    state.allReleases.forEach(item => {
        if (item.type) {
            const trimmed = item.type.trim();
            if (trimmed) {
                uniqueTypes.add(trimmed);
            }
        }
    });

    // Define standard categories and prioritization
    const standardPriority = {
        'feature': 1,
        'change': 2,
        'announcement': 3,
        'deprecation': 4
    };

    // Sort unique types
    const sortedTypes = Array.from(uniqueTypes).sort((a, b) => {
        const priorityA = standardPriority[a.toLowerCase()] || 999;
        const priorityB = standardPriority[b.toLowerCase()] || 999;
        
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        return a.localeCompare(b);
    });

    // Helper for pluralization
    function getDisplayName(type) {
        const typeLower = type.toLowerCase();
        if (typeLower === 'feature') return 'Features';
        if (typeLower === 'change') return 'Changes';
        if (typeLower === 'announcement') return 'Announcements';
        if (typeLower === 'deprecation') return 'Deprecations';
        return type;
    }

    // Build buttons HTML dynamically
    // Start with the 'All Updates' button
    const allBtn = document.createElement('button');
    allBtn.className = `filter-chip${state.activeFilter === 'all' ? ' active' : ''}`;
    allBtn.dataset.type = 'all';
    allBtn.textContent = 'All Updates';
    
    // Clear and build container
    elements.typeFilters.innerHTML = '';
    elements.typeFilters.appendChild(allBtn);

    // Build the dynamic buttons
    sortedTypes.forEach(type => {
        const typeLower = type.toLowerCase();
        const btn = document.createElement('button');
        
        const isActive = (state.activeFilter === typeLower);
        btn.className = `filter-chip${isActive ? ' active' : ''}`;
        btn.dataset.type = typeLower;

        const dot = document.createElement('span');
        dot.className = `badge-dot ${typeLower}`;
        
        btn.appendChild(dot);
        btn.appendChild(document.createTextNode(' ' + getDisplayName(type)));
        
        elements.typeFilters.appendChild(btn);
    });
}

// Set Loading State
function setLoadingState(loading) {
    state.isLoading = loading;
    
    if (loading) {
        elements.refreshIcon.classList.add('spinning');
        elements.refreshBtn.disabled = true;
        elements.loadingSkeletons.style.display = 'grid';
        elements.releasesGrid.style.display = 'none';
        elements.emptyState.style.display = 'none';
    } else {
        elements.refreshIcon.classList.remove('spinning');
        elements.refreshBtn.disabled = false;
        elements.loadingSkeletons.style.display = 'none';
    }
}

// Reset Filters and Search
function resetFilters() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    
    // Reset filter active chip
    const chips = elements.typeFilters.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        if (chip.dataset.type === 'all') {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
    state.activeFilter = 'all';
    
    applyFiltersAndSearch();
}

// Search Input Handler
function handleSearch(e) {
    state.searchQuery = e.target.value.toLowerCase().trim();
    
    if (state.searchQuery.length > 0) {
        elements.clearSearchBtn.style.display = 'flex';
    } else {
        elements.clearSearchBtn.style.display = 'none';
    }
    
    applyFiltersAndSearch();
}

// Clear Search Query
function clearSearch() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    elements.searchInput.focus();
    applyFiltersAndSearch();
}

// Filter Chip Click Handler
function handleFilterClick(e) {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    
    // Update active UI classes
    const chips = elements.typeFilters.querySelectorAll('.filter-chip');
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    
    state.activeFilter = chip.dataset.type;
    applyFiltersAndSearch();
}

// Apply Both Filters and Search in Memory
function applyFiltersAndSearch() {
    let results = state.allReleases;
    
    // 1. Apply Type Filter
    if (state.activeFilter !== 'all') {
        results = results.filter(item => {
            const type = item.type.toLowerCase();
            if (state.activeFilter === 'deprecation') {
                return type.includes('deprecat') || type.includes('delete') || type.includes('security');
            }
            return type === state.activeFilter;
        });
    }
    
    // 2. Apply Search Query
    if (state.searchQuery) {
        results = results.filter(item => {
            const inType = item.type.toLowerCase().includes(state.searchQuery);
            const inDate = item.date.toLowerCase().includes(state.searchQuery);
            const inContent = getPlainText(item.content).toLowerCase().includes(state.searchQuery);
            return inType || inDate || inContent;
        });
    }
    
    state.filteredReleases = results;
    renderReleases();
}

// Render Release Cards to Grid
function renderReleases() {
    elements.releasesGrid.innerHTML = '';
    
    if (state.filteredReleases.length === 0) {
        elements.releasesGrid.style.display = 'none';
        elements.emptyState.style.display = 'block';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.releasesGrid.style.display = 'grid';
    
    state.filteredReleases.forEach((item, index) => {
        const card = createReleaseCard(item, index);
        elements.releasesGrid.appendChild(card);
    });
}

// Helper to convert HTML content into plain text
function getPlainText(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
}

// Classify class modifiers for card border styling
function getCardClassModifier(type) {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('feature')) return 'feature-card';
    if (typeLower.includes('change')) return 'change-card';
    if (typeLower.includes('announcement')) return 'announcement-card';
    if (typeLower.includes('deprecat')) return 'deprecation-card';
    return 'announcement-card';
}

// Create Card HTML Element
function createReleaseCard(item, index) {
    const card = document.createElement('div');
    card.className = `release-card ${getCardClassModifier(item.type)}`;
    card.setAttribute('data-index', index);
    
    // Date area
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    
    const dateSpan = document.createElement('span');
    dateSpan.className = 'release-date';
    dateSpan.innerHTML = `<i class="ph ph-calendar-blank"></i> ${item.date}`;
    
    // Type Badge
    const badgeSpan = document.createElement('span');
    const displayType = item.type.toLowerCase();
    badgeSpan.className = `type-badge ${displayType}`;
    badgeSpan.textContent = item.type;
    
    cardHeader.appendChild(dateSpan);
    cardHeader.appendChild(badgeSpan);
    
    // Body Content
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    cardBody.innerHTML = item.content;
    
    // Enforce target="_blank" and rel="noopener noreferrer" for links
    const links = cardBody.querySelectorAll('a');
    links.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });
    
    // Footer / Tweet & Copy Buttons
    const cardFooter = document.createElement('div');
    cardFooter.className = 'card-footer';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-card-btn';
    copyBtn.innerHTML = `<i class="ph ph-copy"></i> Copy`;
    copyBtn.addEventListener('click', async () => {
        const plainContent = getPlainText(item.content);
        const copyText = `BigQuery [${item.type}] (${item.date}): ${plainContent}\nLink: ${item.link}`;
        try {
            await navigator.clipboard.writeText(copyText);
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `<i class="ph ph-check"></i> Copied!`;
            copyBtn.disabled = true;
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.disabled = false;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    });
    
    const tweetBtn = document.createElement('button');
    tweetBtn.className = 'tweet-btn';
    tweetBtn.innerHTML = `<i class="ph-bold ph-x-logo"></i> Tweet`;
    tweetBtn.addEventListener('click', () => openTweetModal(item));
    
    cardFooter.appendChild(copyBtn);
    cardFooter.appendChild(tweetBtn);
    
    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    card.appendChild(cardFooter);
    
    return card;
}

// Open Tweet Modal with preloaded text
function openTweetModal(item) {
    state.selectedRelease = item;
    
    // Extract clean content and truncate to keep tweet compact
    const cleanContent = getPlainText(item.content);
    const maxDescLength = 140;
    const truncatedContent = cleanContent.length > maxDescLength 
        ? cleanContent.substring(0, maxDescLength).trim() + '...' 
        : cleanContent.trim();
        
    // Format: BigQuery [Feature] (June 25, 2026): Vector Search is now... Link
    const defaultText = `BigQuery [${item.type}] (${item.date}): ${truncatedContent}\n\n${item.link}`;
    
    elements.tweetTextarea.value = defaultText;
    elements.tweetModal.classList.add('active');
    elements.tweetModal.setAttribute('aria-hidden', 'false');
    
    // Force counting update
    handleTweetInput();
}

// Close Tweet Modal
function closeTweetModal() {
    elements.tweetModal.classList.remove('active');
    elements.tweetModal.setAttribute('aria-hidden', 'true');
    state.selectedRelease = null;
}

// Calculate length of tweet, counting URLs as exactly 23 characters
function calculateTweetLength(text) {
    // Replace all URLs with a placeholder of 23 characters
    const textWithPlaceholderUrls = text.replace(URL_REGEX, 'a'.repeat(TWITTER_URL_LEN));
    return textWithPlaceholderUrls.length;
}

// Tweet input handler for count and preview
function handleTweetInput() {
    const text = elements.tweetTextarea.value;
    const count = calculateTweetLength(text);
    
    elements.charCounter.textContent = `${count} / 280`;
    
    // Preview rendering (replace URLs with styled elements in preview)
    let previewHtml = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(URL_REGEX, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
        
    elements.tweetPreviewText.innerHTML = previewHtml;
    
    // Manage class styling for limits
    elements.charCounter.className = 'char-counter';
    if (count > 280) {
        elements.charCounter.classList.add('danger');
        elements.shareXBtn.disabled = true;
    } else {
        elements.shareXBtn.disabled = false;
        if (count > 260) {
            elements.charCounter.classList.add('warning');
        }
    }
}

// Copy Tweet Text to Clipboard
async function copyTweetText() {
    const text = elements.tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        
        // Visual feedback
        const originalText = elements.copyTweetBtn.innerHTML;
        elements.copyTweetBtn.innerHTML = `<i class="ph ph-check"></i> <span>Copied!</span>`;
        elements.copyTweetBtn.disabled = true;
        
        setTimeout(() => {
            elements.copyTweetBtn.innerHTML = originalText;
            elements.copyTweetBtn.disabled = false;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}

// Share on X / Twitter Intent
function shareOnX() {
    const text = elements.tweetTextarea.value;
    const count = calculateTweetLength(text);
    if (count > 280) return; // safety check
    
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'width=550,height=420');
}

// Show Error Empty State
function showErrorEmptyState() {
    elements.loadingSkeletons.style.display = 'none';
    elements.releasesGrid.style.display = 'none';
    elements.emptyState.style.display = 'block';
    
    elements.emptyState.querySelector('h3').textContent = 'Failed to load updates';
    elements.emptyState.querySelector('p').textContent = 'Unable to communicate with the releases API. Please check your server status.';
}

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (elements.themeIcon) {
            elements.themeIcon.className = 'ph ph-moon';
        }
    } else {
        document.body.classList.remove('light-theme');
        if (elements.themeIcon) {
            elements.themeIcon.className = 'ph ph-sun';
        }
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    if (elements.themeIcon) {
        elements.themeIcon.className = isLight ? 'ph ph-moon' : 'ph ph-sun';
    }
}

// Export filtered releases to CSV
function exportToCSV() {
    if (state.filteredReleases.length === 0) {
        alert("No releases to export.");
        return;
    }
    
    const headers = ['Date', 'Type', 'Description', 'Link'];
    
    function escapeCSV(text) {
        if (text === null || text === undefined) {
            return '';
        }
        let cleanText = text.toString().replace(/"/g, '""');
        if (cleanText.includes(',') || cleanText.includes('\n') || cleanText.includes('\r') || cleanText.includes('"')) {
            cleanText = `"${cleanText}"`;
        }
        return cleanText;
    }
    
    const rows = state.filteredReleases.map(release => {
        const dateStr = release.date;
        const typeStr = release.type;
        const descStr = getPlainText(release.content);
        const linkStr = release.link;
        
        return [
            escapeCSV(dateStr),
            escapeCSV(typeStr),
            escapeCSV(descStr),
            escapeCSV(linkStr)
        ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bigquery_releases.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
