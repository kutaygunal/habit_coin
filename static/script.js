document.addEventListener('DOMContentLoaded', function() {
    // Initialize checkboxes based on database state
    updateHabitDisplay();

    // Add click handlers for all checkboxes
    document.querySelectorAll('.checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', function() {
            const habitId = this.closest('.habit-tracker').dataset.habitId;
            const date = this.parentElement.dataset.date;
            
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
                }
            })
            .catch(error => console.error('Error:', error));
        });
    });
});

function updateHabitDisplay() {
    // Add functionality to update the display based on the database state
    // This would typically involve making a GET request to fetch the current state
    // and updating the UI accordingly
}
