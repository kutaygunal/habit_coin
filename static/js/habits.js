// API Service for handling all HTTP requests
class HabitAPI {
    static async toggleHabit(habitId, date) {
        try {
            const response = await fetch('/toggle_habit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ habit_id: habitId, date })
            });
            return await response.json();
        } catch (error) {
            console.error('Error toggling habit:', error);
            throw error;
        }
    }

    static async getHabitData(habitId, year, month) {
        try {
            const response = await fetch(`/get_habit_data/${habitId}/${year}/${month}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching habit data:', error);
            throw error;
        }
    }

    static async deleteHabit(habitId) {
        try {
            const response = await fetch(`/delete_habit/${habitId}`, { method: 'DELETE' });
            return await response.json();
        } catch (error) {
            console.error('Error deleting habit:', error);
            throw error;
        }
    }

    static async generateDescription(habitName) {
        try {
            const response = await fetch('/generate_description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ habit_name: habitName })
            });
            return await response.json();
        } catch (error) {
            console.error('Error generating description:', error);
            throw error;
        }
    }
}

// Main HabitTracker class to manage habit tracking functionality
class HabitTracker {
    constructor(trackerElement) {
        this.tracker = trackerElement;
        this.habitId = trackerElement.dataset.habitId;
        this.currentMonth = parseInt(trackerElement.dataset.currentMonth);
        this.currentYear = parseInt(trackerElement.dataset.currentYear);
        
        this.elements = {
            monthGrid: trackerElement.querySelector('.month-grid'),
            monthDisplay: trackerElement.querySelector('.month-display'),
            streakCount: trackerElement.closest('.habit-card').querySelector('.streak-count')
        };

        this.initializeEvents();
    }

    initializeEvents() {
        // Month navigation
        this.tracker.querySelector('.prev-month').addEventListener('click', () => this.navigateMonth(-1));
        this.tracker.querySelector('.next-month').addEventListener('click', () => this.navigateMonth(1));

        // Day click delegation
        this.elements.monthGrid.addEventListener('click', (e) => {
            const dayCircle = e.target.closest('.day-circle');
            if (dayCircle && dayCircle.classList.contains('active')) {
                this.handleDayClick(dayCircle);
            }
        });
    }

    async handleDayClick(dayCircle) {
        try {
            const date = dayCircle.dataset.date;
            const response = await HabitAPI.toggleHabit(this.habitId, date);
            
            if (response.success) {
                dayCircle.classList.toggle('checked');
                await this.updateStreakCount();
            }
        } catch (error) {
            console.error('Error handling day click:', error);
        }
    }

    async navigateMonth(direction) {
        let newMonth = this.currentMonth + direction;
        let newYear = this.currentYear;

        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }

        this.currentMonth = newMonth;
        this.currentYear = newYear;
        this.tracker.dataset.currentMonth = newMonth;
        this.tracker.dataset.currentYear = newYear;

        const date = new Date(newYear, newMonth - 1, 1);
        this.elements.monthDisplay.textContent = date.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });

        try {
            const data = await HabitAPI.getHabitData(this.habitId, newYear, newMonth);
            await this.updateMonthGrid(data, date);
        } catch (error) {
            console.error('Error navigating month:', error);
        }
    }

    async updateStreakCount() {
        try {
            const [currentData, prevData, nextData] = await Promise.all([
                HabitAPI.getHabitData(this.habitId, this.currentYear, this.currentMonth),
                HabitAPI.getHabitData(this.habitId, this.currentYear, this.currentMonth - 1 || 12),
                HabitAPI.getHabitData(this.habitId, this.currentYear, this.currentMonth + 1 > 12 ? 1 : this.currentMonth + 1)
            ]);

            const allDates = [...prevData.completed_dates, ...currentData.completed_dates, ...nextData.completed_dates]
                .map(dateStr => new Date(dateStr))
                .sort((a, b) => b - a);

            const streak = this.calculateStreak(allDates);
            this.updateStreakDisplay(streak);
        } catch (error) {
            console.error('Error updating streak count:', error);
        }
    }

    calculateStreak(dates) {
        if (dates.length === 0) return 0;
        
        let streak = 1;
        for (let i = 0; i < dates.length - 1; i++) {
            const diffDays = Math.ceil(Math.abs(dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) streak++;
            else break;
        }
        return streak;
    }

    updateStreakDisplay(streak) {
        const currentStreak = parseInt(this.elements.streakCount.textContent);
        if (currentStreak !== streak) {
            this.elements.streakCount.classList.add('updating');
            setTimeout(() => {
                this.elements.streakCount.textContent = streak;
                this.elements.streakCount.classList.remove('updating');
            }, 200);
        }
    }

    async updateMonthGrid(habitData, date) {
        const monthGrid = this.elements.monthGrid;
        monthGrid.innerHTML = '';

        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const startPadding = (firstDay.getDay() + 6) % 7;

        // Add empty spaces for padding
        monthGrid.append(...Array(startPadding).fill().map(() => {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'day-circle empty';
            return emptyDiv;
        }));

        // Add days of the month
        const today = new Date();
        const days = Array.from({ length: lastDay.getDate() }, (_, i) => i + 1);
        
        days.forEach(day => {
            const currentDate = new Date(date.getFullYear(), date.getMonth(), day);
            const dateStr = currentDate.toISOString().split('T')[0];
            
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day-circle';
            dayDiv.dataset.date = dateStr;

            if (currentDate <= today) {
                dayDiv.classList.add('active');
            }

            if (habitData.completed_dates?.includes(dateStr)) {
                dayDiv.classList.add('checked');
            }

            dayDiv.innerHTML = `<span class="day-number">${day}</span>`;
            monthGrid.appendChild(dayDiv);
        });

        await this.updateStreakCount();
    }
}

// Habit Input Manager for handling habit input and suggestions
class HabitInputManager {
    constructor() {
        this.habitInput = document.getElementById('habit-input');
        this.dropdownItems = document.querySelector('.habit-dropdown .dropdown-items');
        this.habitDropdown = document.querySelector('.habit-dropdown');
        this.descriptionArea = document.querySelector('.description-wrapper');

        if (this.habitInput && this.dropdownItems) {
            this.initializeDropdown();
        }
    }

    async initializeDropdown() {
        try {
            const response = await fetch('/static/predefined_habits.txt');
            const text = await response.text();
            const habits = text.split('\n').filter(habit => habit.trim() !== '');

            this.createDropdownItems(habits);
            this.setupEventListeners();
        } catch (error) {
            console.error('Error loading predefined habits:', error);
        }
    }

    createDropdownItems(habits) {
        habits.forEach(habit => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = habit;
            item.addEventListener('click', (e) => {
                this.habitInput.value = habit;
                this.habitDropdown.classList.remove('show');
                e.stopPropagation();
            });
            this.dropdownItems.appendChild(item);
        });
    }

    setupEventListeners() {
        this.habitInput.addEventListener('focus', () => {
            this.habitDropdown.classList.add('show');
        });

        this.habitInput.addEventListener('input', () => {
            this.filterDropdownItems();
        });

        this.habitInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.habitDropdown.classList.remove('show');
                this.habitInput.blur();
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.habitInput.contains(e.target) && 
                !this.habitDropdown.contains(e.target) && 
                !this.descriptionArea.contains(e.target)) {
                this.habitDropdown.classList.remove('show');
            }
        });
    }

    filterDropdownItems() {
        this.habitDropdown.classList.add('show');
        const filter = this.habitInput.value.toLowerCase();
        const items = this.dropdownItems.getElementsByClassName('dropdown-item');

        Array.from(items).forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(filter) ? '' : 'none';
        });
    }
}

// Filter Manager for handling habit filtering functionality
class FilterManager {
    constructor() {
        this.searchInput = document.querySelector('.search-box input');
        this.tagCheckboxes = document.querySelectorAll('.form-check-input');
        this.clearButton = document.querySelector('.clear-filter-btn');
        this.habitCards = document.querySelectorAll('.habit-card');
        
        this.initializeEvents();
    }

    initializeEvents() {
        // Clear button click handler
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => {
                console.log('Clear button clicked'); // Debug log
                this.clearFilters();
            });
        }

        // Search input handler
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.applyFilters());
        }

        // Tag checkbox handlers
        this.tagCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.applyFilters());
        });
    }

    clearFilters() {
        console.log('Clearing filters'); // Debug log
        
        // Clear search input
        if (this.searchInput) {
            this.searchInput.value = '';
        }

        // Uncheck all tag checkboxes
        this.tagCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // Show all habits
        this.applyFilters();
    }

    applyFilters() {
        const searchText = this.searchInput.value.toLowerCase();
        const selectedTags = Array.from(this.tagCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value); // Use checkbox value which contains the tag ID

        this.habitCards.forEach(card => {
            const habitName = card.querySelector('h3').textContent.toLowerCase();
            const habitTagElements = card.querySelectorAll('.habit-tag');
            const habitTagIds = Array.from(habitTagElements).map(tag => tag.dataset.tagId);
            
            const matchesSearch = !searchText || habitName.includes(searchText);
            const matchesTags = selectedTags.length === 0 || 
                selectedTags.every(tagId => habitTagIds.includes(tagId));

            card.style.display = (matchesSearch && matchesTags) ? '' : 'none';
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize habit trackers
    document.querySelectorAll('.habit-tracker').forEach(tracker => {
        new HabitTracker(tracker);
    });

    // Initialize habit input
    new HabitInputManager();

    // Initialize filter manager
    new FilterManager();

    // Initialize delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const habitId = this.dataset.habitId;
            const habitCard = this.closest('.habit-card');
            
            if (confirm('Are you sure you want to delete this habit?')) {
                try {
                    const response = await HabitAPI.deleteHabit(habitId);
                    if (response.success) {
                        habitCard.remove();
                    }
                } catch (error) {
                    console.error('Error deleting habit:', error);
                }
            }
        });
    });

    // Initialize generate button
    const generateBtn = document.getElementById('generate-description');
    const descriptionInput = document.getElementById('habit-description');
    const descriptionWrapper = document.querySelector('.description-wrapper');
    
    if (generateBtn && descriptionInput) {
        generateBtn.addEventListener('click', async () => {
            const habitName = document.getElementById('habit-input').value;
            
            if (!habitName) {
                alert('Please enter a habit name first');
                return;
            }

            const originalContent = generateBtn.innerHTML;
            generateBtn.classList.add('loading');
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            generateBtn.style.pointerEvents = 'none';
            descriptionInput.disabled = true;
            descriptionWrapper.classList.add('rainbow-animation');
            
            try {
                const data = await HabitAPI.generateDescription(habitName);
                if (data.description) {
                    descriptionInput.value = data.description;
                }
            } catch (error) {
                alert('Failed to generate description');
            } finally {
                generateBtn.classList.remove('loading');
                generateBtn.innerHTML = originalContent;
                generateBtn.style.pointerEvents = 'auto';
                descriptionInput.disabled = false;
                descriptionWrapper.classList.remove('rainbow-animation');
            }
        });
    }
});
