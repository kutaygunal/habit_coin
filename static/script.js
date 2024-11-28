document.addEventListener('DOMContentLoaded', function() {
    // Initialize habit autocomplete
    initializeHabitAutocomplete();

    // Initialize checkboxes based on database state
    updateHabitDisplay();

    // Initialize delete functionality
    initializeDeleteButtons();

    // Add click handlers for all checkboxes
    document.querySelectorAll('.checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', function() {
            const habitId = this.closest('.habit-tracker').dataset.habitId;
            const date = this.parentElement.dataset.date;
            
            // Add animation class
            this.classList.add('clicking');
            
            fetch('/toggle_habit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    habit_id: habitId,
                    date: date
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.classList.toggle('completed');
                    updateStreakCount(habitId);
                }
            })
            .catch(error => console.error('Error:', error))
            .finally(() => {
                // Remove animation class
                setTimeout(() => {
                    this.classList.remove('clicking');
                }, 200);
            });
        });
    });
});

function initializeDeleteButtons() {
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    let habitToDelete = null;
    let habitCardToDelete = null;

    // Add click handlers for delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            habitToDelete = this.dataset.habitId;
            habitCardToDelete = this.closest('.habit-card');
            deleteModal.show();
        });
    });

    // Handle confirm delete
    document.getElementById('confirmDelete').addEventListener('click', function() {
        if (habitToDelete && habitCardToDelete) {
            fetch(`/delete_habit/${habitToDelete}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Add animation class
                    habitCardToDelete.classList.add('deleting');
                    
                    // Remove the card after animation
                    setTimeout(() => {
                        habitCardToDelete.remove();
                        
                        // If no habits left, you might want to show a message
                        if (document.querySelectorAll('.habit-card').length === 0) {
                            const habitsGrid = document.querySelector('.habits-grid');
                            habitsGrid.innerHTML = '<div class="no-habits">No habits yet. Add one above!</div>';
                        }
                    }, 300);
                }
            })
            .catch(error => console.error('Error:', error))
            .finally(() => {
                deleteModal.hide();
                habitToDelete = null;
                habitCardToDelete = null;
            });
        }
    });
}

function updateHabitDisplay() {
    // Get all habit trackers
    document.querySelectorAll('.habit-tracker').forEach(tracker => {
        const habitId = tracker.dataset.habitId;
        
        // Fetch completion status for this habit
        fetch(`/habit_status/${habitId}`)
            .then(response => response.json())
            .then(data => {
                // Update checkboxes based on completion status
                data.completions.forEach(completion => {
                    const dayBox = tracker.querySelector(`[data-date="${completion.date}"]`);
                    if (dayBox) {
                        const checkbox = dayBox.querySelector('.checkbox');
                        if (completion.completed) {
                            checkbox.classList.add('completed');
                        }
                    }
                });
                
                // Update streak count
                updateStreakCount(habitId);
            })
            .catch(error => console.error('Error:', error));
    });
}

function updateStreakCount(habitId) {
    const tracker = document.querySelector(`.habit-tracker[data-habit-id="${habitId}"]`);
    const card = tracker.closest('.habit-card');
    const streakCount = card.querySelector('.streak-count');
    
    // Get all completed dates and sort them
    const completedElements = Array.from(tracker.querySelectorAll('.day-circle.checked'));
    console.log('Found completed elements:', completedElements);
    
    const completedDates = completedElements
        .map(element => {
            const dateStr = element.dataset.date;
            console.log('Processing date:', dateStr);
            return new Date(dateStr);
        })
        .sort((a, b) => b - a); // Sort in descending order (most recent first)
    
    console.log('Sorted completed dates:', completedDates);
    
    let streak = 0;
    if (completedDates.length > 0) {
        streak = 1; // Start with 1 for the most recent date
        for (let i = 0; i < completedDates.length - 1; i++) {
            const currentDate = completedDates[i];
            const nextDate = completedDates[i + 1];
            
            // Calculate the difference in days
            const diffTime = Math.abs(currentDate - nextDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            console.log('Comparing dates:', {
                current: currentDate.toISOString(),
                next: nextDate.toISOString(),
                diffDays: diffDays
            });
            
            if (diffDays === 1) {
                streak++;
                console.log('Streak increased to:', streak);
            } else {
                console.log('Streak broken, gap of', diffDays, 'days');
                break;
            }
        }
    }
    
    console.log('Final streak:', streak);
    
    // Update streak count with animation
    const currentStreak = parseInt(streakCount.textContent);
    if (currentStreak !== streak) {
        streakCount.classList.add('updating');
        setTimeout(() => {
            streakCount.textContent = streak;
            streakCount.classList.remove('updating');
        }, 200);
    }
}

async function initializeHabitAutocomplete() {
    const habitInput = document.querySelector('#habit-input');
    if (!habitInput) return;

    // Create and style the dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'habit-suggestions';
    dropdown.style.display = 'none';
    dropdown.style.position = 'absolute';
    dropdown.style.width = habitInput.offsetWidth + 'px';
    dropdown.style.maxHeight = '200px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.backgroundColor = 'white';
    dropdown.style.border = '1px solid #ddd';
    dropdown.style.borderRadius = '4px';
    dropdown.style.zIndex = '1000';
    habitInput.parentNode.style.position = 'relative';
    habitInput.parentNode.appendChild(dropdown);

    // Fetch predefined habits
    let predefinedHabits = [];
    try {
        const response = await fetch('/static/predefined_habits.txt');
        const text = await response.text();
        predefinedHabits = text.split('\n').filter(habit => habit.trim());
    } catch (error) {
        console.error('Error loading predefined habits:', error);
    }

    habitInput.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        if (!value) {
            dropdown.style.display = 'none';
            return;
        }

        // Filter matching habits
        const matches = predefinedHabits.filter(habit => 
            habit.toLowerCase().includes(value)
        );

        if (matches.length > 0) {
            dropdown.innerHTML = matches
                .map(habit => `<div class="suggestion-item">${habit}</div>`)
                .join('');
            dropdown.style.display = 'block';

            // Add click handlers to suggestions
            dropdown.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', function() {
                    habitInput.value = this.textContent;
                    dropdown.style.display = 'none';
                });
                item.style.padding = '8px 12px';
                item.style.cursor = 'pointer';
                item.addEventListener('mouseenter', function() {
                    this.style.backgroundColor = '#f0f0f0';
                });
                item.addEventListener('mouseleave', function() {
                    this.style.backgroundColor = 'white';
                });
            });
        } else {
            dropdown.style.display = 'none';
        }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!habitInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}
