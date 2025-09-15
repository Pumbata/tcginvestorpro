// TCG Investor Pro - Portfolio Management System
// This file handles all portfolio-related functionality

// Portfolio state management
const PortfolioState = {
    currentUser: null,
    portfolioItems: [],
    selectedCard: null,
    isLoaded: false
};

// Portfolio Management Class
class PortfolioManager {
    constructor() {
        this.setupEventListeners();
        this.initializePortfolio();
    }

    /**
     * Set up all portfolio event listeners
     */
    setupEventListeners() {
        // Add Card Modal
        document.getElementById('addCardBtn')?.addEventListener('click', () => this.showAddCardModal());
        document.getElementById('closeAddCardModal')?.addEventListener('click', () => this.hideAddCardModal());
        document.getElementById('cancelAddCard')?.addEventListener('click', () => this.hideAddCardModal());
        document.getElementById('addCardForm')?.addEventListener('submit', (e) => this.handleAddCard(e));

        // Card Search
        document.getElementById('searchCardBtn')?.addEventListener('click', () => this.searchCards());
        document.getElementById('cardSearchInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchCards();
            }
        });

        // Portfolio Actions
        document.getElementById('refreshPortfolioBtn')?.addEventListener('click', () => this.refreshPortfolio());
        document.getElementById('exportPortfolioBtn')?.addEventListener('click', () => this.exportPortfolio());
        document.getElementById('importCsvBtn')?.addEventListener('click', () => this.importCsv());

        // Portfolio Filters
        document.getElementById('portfolioFilter')?.addEventListener('change', () => this.filterPortfolio());
        document.getElementById('portfolioSort')?.addEventListener('change', () => this.sortPortfolio());

        // Edit Modal
        document.getElementById('closeEditModal')?.addEventListener('click', () => this.hideEditModal());
        document.getElementById('cancelEdit')?.addEventListener('click', () => this.hideEditModal());
        document.getElementById('editPortfolioForm')?.addEventListener('submit', (e) => this.handleEditPortfolio(e));
        document.getElementById('deletePortfolioItem')?.addEventListener('click', () => this.deletePortfolioItem());

        // Modal backdrop clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });

        // Set default purchase date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('purchaseDate')?.setAttribute('value', today);
    }

    /**
     * Initialize portfolio on page load
     */
    async initializePortfolio() {
        try {
            // Check if user is authenticated
            const { data: { user } } = await window.SupabaseConfig.getSupabaseClient().auth.getUser();
            
            if (user) {
                PortfolioState.currentUser = user;
                await this.loadPortfolio();
                this.updatePortfolioStats();
            } else {
                this.showLoginPrompt();
            }
        } catch (error) {
            console.error('Error initializing portfolio:', error);
            this.showError('Failed to initialize portfolio');
        }
    }

    /**
     * Load portfolio from database
     */
    async loadPortfolio() {
        try {
            if (!PortfolioState.currentUser) return;

            const { data, error } = await window.SupabaseConfig.DatabaseHelpers.getUserPortfolio(PortfolioState.currentUser.id);
            
            if (error) {
                console.error('Error loading portfolio:', error);
                this.showError('Failed to load portfolio');
                return;
            }

            PortfolioState.portfolioItems = data || [];
            this.renderPortfolioTable();
            this.updatePortfolioStats();
            PortfolioState.isLoaded = true;
        } catch (error) {
            console.error('Error loading portfolio:', error);
            this.showError('Failed to load portfolio');
        }
    }

    /**
     * Show Add Card Modal
     */
    showAddCardModal() {
        if (!PortfolioState.currentUser) {
            this.showLoginPrompt();
            return;
        }

        document.getElementById('addCardModal').classList.add('active');
        document.getElementById('cardSearchInput').focus();
    }

    /**
     * Hide Add Card Modal
     */
    hideAddCardModal() {
        document.getElementById('addCardModal').classList.remove('active');
        this.resetAddCardForm();
    }

    /**
     * Reset Add Card Form
     */
    resetAddCardForm() {
        document.getElementById('addCardForm').reset();
        document.getElementById('cardSearchResults').innerHTML = '';
        PortfolioState.selectedCard = null;
        
        // Set default date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('purchaseDate').value = today;
    }

    /**
     * Search for cards
     */
    async searchCards() {
        const searchTerm = document.getElementById('cardSearchInput').value.trim();
        if (!searchTerm) return;

        try {
            this.showLoading('cardSearchResults');
            
            const { data, error } = await window.SupabaseConfig.DatabaseHelpers.searchCards(searchTerm, { limit: 10 });
            
            if (error) {
                console.error('Error searching cards:', error);
                this.showError('Failed to search cards');
                return;
            }

            this.renderCardSearchResults(data || []);
        } catch (error) {
            console.error('Error searching cards:', error);
            this.showError('Failed to search cards');
        }
    }

    /**
     * Render card search results
     */
    renderCardSearchResults(cards) {
        const container = document.getElementById('cardSearchResults');
        
        if (cards.length === 0) {
            container.innerHTML = '<div class="portfolio-error">No cards found. Try a different search term.</div>';
            return;
        }

        container.innerHTML = cards.map(card => `
            <div class="card-search-item" data-card-id="${card.id}" onclick="portfolioManager.selectCard('${card.id}')">
                <img src="${card.image_url || '/placeholder-card.jpg'}" alt="${card.name}" class="card-image" onerror="this.src='/placeholder-card.jpg'">
                <div class="card-info">
                    <h4 class="card-name">${card.name}</h4>
                    <p class="card-set">${card.set_name} - ${card.number}</p>
                </div>
                <div class="card-price">
                    $${this.formatPrice(card.pricing_data?.[0]?.ungraded_price || 0)}
                </div>
            </div>
        `).join('');
    }

    /**
     * Select a card from search results
     */
    selectCard(cardId) {
        // Find the selected card
        const selectedElement = document.querySelector(`[data-card-id="${cardId}"]`);
        const allElements = document.querySelectorAll('.card-search-item');
        
        // Remove selection from all items
        allElements.forEach(el => el.classList.remove('selected'));
        
        // Add selection to clicked item
        selectedElement.classList.add('selected');
        
        // Store selected card
        PortfolioState.selectedCard = cardId;
        
        // Enable form submission
        document.querySelector('#addCardForm button[type="submit"]').disabled = false;
    }

    /**
     * Handle Add Card Form Submission
     */
    async handleAddCard(e) {
        e.preventDefault();
        
        if (!PortfolioState.selectedCard) {
            this.showError('Please select a card from the search results');
            return;
        }

        if (!PortfolioState.currentUser) {
            this.showLoginPrompt();
            return;
        }

        try {
            const formData = new FormData(e.target);
            const portfolioData = {
                cardId: PortfolioState.selectedCard,
                purchasePrice: parseFloat(formData.get('purchasePrice') || document.getElementById('purchasePrice').value),
                purchaseDate: formData.get('purchaseDate') || document.getElementById('purchaseDate').value,
                gradingStatus: formData.get('gradingStatus') || document.getElementById('gradingStatus').value,
                quantity: parseInt(formData.get('quantity') || document.getElementById('quantity').value),
                notes: formData.get('notes') || document.getElementById('notes').value
            };

            // Add to database
            const { error } = await window.SupabaseConfig.DatabaseHelpers.addToPortfolio(
                PortfolioState.currentUser.id,
                portfolioData.cardId,
                portfolioData.purchasePrice,
                portfolioData.purchaseDate,
                portfolioData.gradingStatus,
                portfolioData.notes
            );

            if (error) {
                console.error('Error adding to portfolio:', error);
                this.showError('Failed to add card to portfolio');
                return;
            }

            this.showSuccess('Card added to portfolio successfully!');
            this.hideAddCardModal();
            await this.loadPortfolio();
            
        } catch (error) {
            console.error('Error adding card to portfolio:', error);
            this.showError('Failed to add card to portfolio');
        }
    }

    /**
     * Render Portfolio Table
     */
    renderPortfolioTable() {
        const tbody = document.getElementById('portfolioTableBody');
        
        if (PortfolioState.portfolioItems.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="8">
                        <div class="empty-portfolio">
                            <div class="empty-icon">📦</div>
                            <h3>No cards in portfolio yet</h3>
                            <p>Add some cards to start tracking your Pokemon card investments!</p>
                            <button class="btn-primary" onclick="document.getElementById('addCardBtn').click()">Add Your First Card</button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = PortfolioState.portfolioItems.map(item => {
            const currentPrice = this.getCurrentPrice(item);
            const profit = (currentPrice - item.purchase_price) * item.quantity;
            const roi = ((currentPrice - item.purchase_price) / item.purchase_price) * 100;
            
            return `
                <tr>
                    <td>
                        <div class="card-info">
                            <img src="${item.cards?.image_url || '/placeholder-card.jpg'}" alt="${item.cards?.name}" class="card-image" onerror="this.src='/placeholder-card.jpg'">
                            <div class="card-details">
                                <h4>${item.cards?.name || 'Unknown Card'}</h4>
                                <p>${item.cards?.set_name || ''} - ${item.cards?.number || ''}</p>
                            </div>
                        </div>
                    </td>
                    <td>$${this.formatPrice(item.purchase_price)}</td>
                    <td>$${this.formatPrice(currentPrice)}</td>
                    <td class="${roi >= 0 ? 'roi-positive' : 'roi-negative'}">${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%</td>
                    <td class="${profit >= 0 ? 'roi-positive' : 'roi-negative'}">${profit >= 0 ? '+' : ''}$${this.formatPrice(profit)}</td>
                    <td>${this.formatGradingStatus(item.grading_status)}</td>
                    <td>${new Date(item.purchase_date).toLocaleDateString()}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-outline btn-sm" onclick="portfolioManager.editPortfolioItem('${item.id}')">Edit</button>
                            <button class="btn-danger btn-sm" onclick="portfolioManager.confirmDelete('${item.id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Get current price for a portfolio item
     */
    getCurrentPrice(item) {
        if (!item.cards?.pricing_data?.[0]) return item.purchase_price;
        
        const pricing = item.cards.pricing_data[0];
        
        // Return appropriate price based on grading status
        switch (item.grading_status) {
            case 'psa-10': return pricing.psa_10_price || pricing.ungraded_price || 0;
            case 'psa-9': return pricing.psa_9_price || pricing.psa_10_price || pricing.ungraded_price || 0;
            case 'psa-8': return pricing.psa_8_price || pricing.psa_9_price || pricing.ungraded_price || 0;
            case 'psa-7': return pricing.psa_7_price || pricing.psa_8_price || pricing.ungraded_price || 0;
            default: return pricing.ungraded_price || 0;
        }
    }

    /**
     * Update Portfolio Statistics
     */
    updatePortfolioStats() {
        const totalInvested = PortfolioState.portfolioItems.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);
        const totalCurrentValue = PortfolioState.portfolioItems.reduce((sum, item) => sum + (this.getCurrentPrice(item) * item.quantity), 0);
        const totalProfit = totalCurrentValue - totalInvested;
        const totalROI = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

        document.getElementById('totalInvested').textContent = `$${this.formatPrice(totalInvested)}`;
        document.getElementById('currentValue').textContent = `$${this.formatPrice(totalCurrentValue)}`;
        document.getElementById('totalROI').textContent = `${totalROI >= 0 ? '+' : ''}${totalROI.toFixed(1)}%`;
        document.getElementById('totalProfit').textContent = `${totalProfit >= 0 ? '+' : ''}$${this.formatPrice(totalProfit)}`;

        // Update colors based on performance
        const roiElement = document.getElementById('totalROI');
        const profitElement = document.getElementById('totalProfit');
        
        roiElement.className = totalROI >= 0 ? 'roi-positive' : 'roi-negative';
        profitElement.className = totalProfit >= 0 ? 'roi-positive' : 'roi-negative';
    }

    /**
     * Edit Portfolio Item
     */
    editPortfolioItem(itemId) {
        const item = PortfolioState.portfolioItems.find(i => i.id === itemId);
        if (!item) return;

        // Populate edit form
        document.getElementById('editPortfolioId').value = itemId;
        document.getElementById('editPurchasePrice').value = item.purchase_price;
        document.getElementById('editPurchaseDate').value = item.purchase_date.split('T')[0];
        document.getElementById('editGradingStatus').value = item.grading_status;
        document.getElementById('editQuantity').value = item.quantity || 1;
        document.getElementById('editNotes').value = item.notes || '';

        // Show edit modal
        document.getElementById('editPortfolioModal').classList.add('active');
    }

    /**
     * Hide Edit Modal
     */
    hideEditModal() {
        document.getElementById('editPortfolioModal').classList.remove('active');
    }

    /**
     * Handle Edit Portfolio Form Submission
     */
    async handleEditPortfolio(e) {
        e.preventDefault();
        
        const itemId = document.getElementById('editPortfolioId').value;
        const formData = new FormData(e.target);
        
        try {
            const updateData = {
                purchase_price: parseFloat(formData.get('editPurchasePrice') || document.getElementById('editPurchasePrice').value),
                purchase_date: formData.get('editPurchaseDate') || document.getElementById('editPurchaseDate').value,
                grading_status: formData.get('editGradingStatus') || document.getElementById('editGradingStatus').value,
                quantity: parseInt(formData.get('editQuantity') || document.getElementById('editQuantity').value),
                notes: formData.get('editNotes') || document.getElementById('editNotes').value
            };

            const { error } = await window.SupabaseConfig.DatabaseHelpers.updatePortfolioItem(itemId, updateData);
            
            if (error) {
                console.error('Error updating portfolio item:', error);
                this.showError('Failed to update portfolio item');
                return;
            }
            
            this.showSuccess('Portfolio item updated successfully!');
            this.hideEditModal();
            await this.loadPortfolio();
            
        } catch (error) {
            console.error('Error updating portfolio item:', error);
            this.showError('Failed to update portfolio item');
        }
    }

    /**
     * Confirm Delete Portfolio Item
     */
    confirmDelete(itemId) {
        if (confirm('Are you sure you want to delete this item from your portfolio?')) {
            this.deletePortfolioItem(itemId);
        }
    }

    /**
     * Delete Portfolio Item
     */
    async deletePortfolioItem(itemId = null) {
        const id = itemId || document.getElementById('editPortfolioId').value;
        
        try {
            const { error } = await window.SupabaseConfig.DatabaseHelpers.removeFromPortfolio(
                PortfolioState.currentUser.id,
                id
            );

            if (error) {
                console.error('Error deleting portfolio item:', error);
                this.showError('Failed to delete portfolio item');
                return;
            }

            this.showSuccess('Portfolio item deleted successfully!');
            this.hideEditModal();
            await this.loadPortfolio();
            
        } catch (error) {
            console.error('Error deleting portfolio item:', error);
            this.showError('Failed to delete portfolio item');
        }
    }

    /**
     * Refresh Portfolio
     */
    async refreshPortfolio() {
        this.showLoading('portfolioTableBody');
        await this.loadPortfolio();
    }

    /**
     * Export Portfolio
     */
    exportPortfolio() {
        if (PortfolioState.portfolioItems.length === 0) {
            this.showError('No portfolio items to export');
            return;
        }

        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Generate CSV Content
     */
    generateCSV() {
        const headers = ['Card Name', 'Set', 'Number', 'Purchase Price', 'Current Value', 'ROI', 'Profit', 'Grading Status', 'Purchase Date', 'Notes'];
        const rows = PortfolioState.portfolioItems.map(item => {
            const currentPrice = this.getCurrentPrice(item);
            const profit = (currentPrice - item.purchase_price) * (item.quantity || 1);
            const roi = ((currentPrice - item.purchase_price) / item.purchase_price) * 100;
            
            return [
                item.cards?.name || 'Unknown',
                item.cards?.set_name || '',
                item.cards?.number || '',
                item.purchase_price,
                currentPrice,
                `${roi.toFixed(1)}%`,
                profit,
                this.formatGradingStatus(item.grading_status),
                new Date(item.purchase_date).toLocaleDateString(),
                item.notes || ''
            ];
        });

        return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    /**
     * Import CSV (placeholder)
     */
    importCsv() {
        this.showError('CSV import feature coming soon!');
    }

    /**
     * Filter Portfolio
     */
    filterPortfolio() {
        const filter = document.getElementById('portfolioFilter').value;
        // Implementation would filter PortfolioState.portfolioItems and re-render
        this.renderPortfolioTable();
    }

    /**
     * Sort Portfolio
     */
    sortPortfolio() {
        const sortBy = document.getElementById('portfolioSort').value;
        // Implementation would sort PortfolioState.portfolioItems and re-render
        this.renderPortfolioTable();
    }

    /**
     * Hide All Modals
     */
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
    }

    /**
     * Show Login Prompt
     */
    showLoginPrompt() {
        this.showError('Please sign in to manage your portfolio');
        // Trigger sign in modal
        if (window.showAuthModal) {
            window.showAuthModal();
        }
    }

    /**
     * Utility Functions
     */
    formatPrice(price) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price || 0);
    }

    formatGradingStatus(status) {
        return status.replace('psa-', 'PSA ').replace('bgs-', 'BGS ').replace('ungraded', 'Ungraded');
    }

    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="portfolio-loading">Loading...</div>';
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `portfolio-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize Portfolio Manager when DOM is loaded
let portfolioManager;
document.addEventListener('DOMContentLoaded', function() {
    portfolioManager = new PortfolioManager();
});

// Export for global access
window.portfolioManager = portfolioManager;
