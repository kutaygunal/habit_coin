document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting habits.js');
    
    // Select all day circles
    const circles = document.querySelectorAll('.day-circle');
    console.log('Found circles:', circles.length);
    
    if (circles.length === 0) {
        console.error('No circles found! Check if the class name is correct.');
        return;
    }

    // Add click event listener to each circle
    circles.forEach((circle, index) => {
        console.log(`Adding click listener to circle ${index}`);
        
        circle.addEventListener('click', function(e) {
            console.log(`Circle ${index} clicked!`);
            
            // Only proceed if the circle is active
            if (!this.classList.contains('active')) {
                console.log('Circle is not active');
                return;
            }


            // Toggle clicked state
            this.classList.toggle('clicked');
            console.log('New class list:', this.classList.toString());

            const habitTracker = this.closest('.habit-tracker');
            console.log('Habit tracker:', habitTracker);
            
            if (!habitTracker) {
                console.error('Could not find habit tracker');
                return;
            }
            
            const habitId = habitTracker.dataset.habitId;
            const date = this.dataset.date;
            
            console.log('Processing click:', { habitId, date });
            
            // Update in database
            fetch('/toggle_habit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
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
                    // Toggle the clicked state based on server response
                    if (data.completed) {
                        this.classList.add('checked');
                    } else {
                        this.classList.remove('checked');
                    }
                } else {
                    // If server update failed, revert the clicked state
                    this.classList.toggle('clicked');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Revert the clicked state on error
                this.classList.toggle('clicked');
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
