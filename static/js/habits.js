document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Handle clicking on day circles
    const circles = document.querySelectorAll('.day-circle');
    console.log('Found circles:', circles.length);
    
    circles.forEach(circle => {
        circle.addEventListener('click', function(e) {
            console.log('Circle clicked');
            console.log('Circle classes:', this.classList.toString());
            console.log('Circle dataset:', this.dataset);
            
            // Only proceed if the circle is active
            if (!this.classList.contains('active')) {
                console.log('Circle is not active');
                return;
            }

            const habitTracker = this.closest('.habit-tracker');
            console.log('Habit tracker:', habitTracker);
            
            if (!habitTracker) {
                console.error('Could not find habit tracker');
                return;
            }
            
            const habitId = habitTracker.dataset.habitId;
            const date = this.dataset.date;
            
            console.log('Processing click:', { habitId, date });
            
            // Toggle checked state
            this.classList.toggle('checked');
            
            // Update in database
            fetch('/toggle_habit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    habit_id: habitId,
                    date: date
                })
            })
            .then(response => {
                console.log('Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Server response:', data);
                if (data.success) {
                    // Update streak count if provided
                    if (data.streak !== undefined) {
                        const streakElement = this.closest('.habit-card')
                            .querySelector('.streak-count');
                        if (streakElement) {
                            streakElement.textContent = data.streak;
                        }
                    }
                } else {
                    console.error('Server returned error:', data.error);
                    // If the server update failed, revert the UI change
                    this.classList.toggle('checked');
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                // Revert the UI change if the server update failed
                this.classList.toggle('checked');
            });
        });
    });

    // Handle delete button clicks
    const deleteButtons = document.querySelectorAll('.delete-btn');
    console.log('Found delete buttons:', deleteButtons.length);
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const habitId = this.dataset.habitId;
            const habitCard = this.closest('.habit-card');
            
            if (confirm('Are you sure you want to delete this habit?')) {
                fetch(`/delete_habit/${habitId}`, {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        habitCard.remove();
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            }
        });
    });
});
