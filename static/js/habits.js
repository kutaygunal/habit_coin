document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting habits.js');
    
    // Initialize generate button functionality
    initializeGenerateButton();
    
    // Load predefined habits
    const habitInput = document.getElementById('habit-input');
    const dropdownItems = document.querySelector('.habit-dropdown .dropdown-items');
    
    if (habitInput && dropdownItems) {
        fetch('/static/predefined_habits.txt')
            .then(response => response.text())
            .then(text => {
                const habits = text.split('\n').filter(habit => habit.trim() !== '');
                
                // Create dropdown items
                habits.forEach(habit => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item';
                    item.textContent = habit;
                    item.addEventListener('click', () => {
                        habitInput.value = habit;
                        habitInput.blur(); // This will unfocus the input and hide the dropdown
                    });
                    dropdownItems.appendChild(item);
                });
                
                // Filter items on input
                habitInput.addEventListener('input', () => {
                    const filter = habitInput.value.toLowerCase();
                    const items = dropdownItems.getElementsByClassName('dropdown-item');
                    
                    Array.from(items).forEach(item => {
                        const text = item.textContent;
                        item.style.display = text.toLowerCase().includes(filter) ? '' : 'none';
                    });
                });
            })
            .catch(error => console.error('Error loading predefined habits:', error));
    }

    // Function to count streaks
    function updateStreakCount(habitTracker) {
        const circles = habitTracker.querySelectorAll('.day-circle');
        const streakCountElement = habitTracker.closest('.habit-card').querySelector('.streak-count');
        let streakCount = 0;
        
        circles.forEach(circle => {
            if (circle.classList.contains('active') && circle.classList.contains('checked')) {
                streakCount++;
            }
        });
        
        streakCountElement.textContent = streakCount;
    }

    // Initialize streak counts for all habits
    document.querySelectorAll('.habit-tracker').forEach(habitTracker => {
        updateStreakCount(habitTracker);
    });
    
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
                    // Toggle the checked state based on server response
                    if (data.completed) {
                        this.classList.add('checked');
                    } else {
                        this.classList.remove('checked');
                    }
                    // Update streak count after successful toggle
                    updateStreakCount(habitTracker);
                }
            })
            .catch(error => {
                console.error('Error:', error);
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

// Initialize generate button functionality
function initializeGenerateButton() {
    const generateBtn = document.getElementById('generate-description');
    const descriptionInput = document.getElementById('habit-description');
    
    if (generateBtn && descriptionInput) {
        console.log('Generate button and description input found');
        generateBtn.addEventListener('click', async () => {
            console.log('Generate button clicked');
            const habitName = document.getElementById('habit-input').value;
            console.log('Habit name:', habitName);
            
            if (!habitName) {
                console.log('No habit name provided');
                alert('Please enter a habit name first');
                return;
            }

            // Store original button content
            const originalContent = generateBtn.innerHTML;
            
            // Update button to loading state
            generateBtn.classList.add('loading');
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            generateBtn.style.pointerEvents = 'none';
            descriptionInput.disabled = true;
            
            try {
                console.log('Making API request to /generate_description');
                const response = await fetch('/generate_description', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ habit_name: habitName })
                });
                
                console.log('API response status:', response.status);
                const data = await response.json();
                console.log('API response data:', data);
                
                if (response.ok) {
                    console.log('Setting description:', data.description);
                    descriptionInput.value = data.description;
                } else {
                    console.error('API error:', data.error);
                    alert(data.error || 'Failed to generate description');
                }
            } catch (error) {
                console.error('Fetch error:', error);
                alert('Failed to generate description. Please try again.');
            } finally {
                // Reset button state
                console.log('Resetting generate button state');
                generateBtn.classList.remove('loading');
                generateBtn.innerHTML = originalContent;
                generateBtn.style.pointerEvents = 'auto';
                descriptionInput.disabled = false;
            }
        });
    } else {
        console.error('Generate button or description input not found in DOM');
        console.log('Generate button element:', generateBtn);
        console.log('Description input element:', descriptionInput);
    }
}
