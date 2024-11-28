document.addEventListener('DOMContentLoaded', function() {
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
    
    // Count consecutive completed days
    let streak = 0;
    const checkboxes = Array.from(tracker.querySelectorAll('.checkbox'));
    
    // Count from most recent day
    for (let i = checkboxes.length - 1; i >= 0; i--) {
        if (checkboxes[i].classList.contains('completed')) {
            streak++;
        } else {
            break;
        }
    }
    
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
