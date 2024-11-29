document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing...');
    
    // Initialize habit autocomplete
    initializeHabitAutocomplete();

    // Initialize tag functionality
    console.log('Initializing tag management...');
    initializeTagManagement();
    console.log('Tag management initialized');

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
            })
            .catch(error => console.error('Error:', error));
    });
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

function initializeTagManagement() {
    console.log('Inside initializeTagManagement');
    let currentHabitId = null;
    const tagModal = document.getElementById('tagModal');
    const saveChangesBtn = document.getElementById('saveTagChanges');

    console.log('tagModal:', tagModal);
    console.log('saveChangesBtn:', saveChangesBtn);

    if (!saveChangesBtn) {
        console.error('Save changes button not found!');
        return;
    }

    // When tag modal is opened
    tagModal.addEventListener('show.bs.modal', function(event) {
        console.log('Modal show event triggered');
        const button = event.relatedTarget;
        currentHabitId = button.dataset.habitId;
        console.log('Modal opened for habit:', currentHabitId);
        
        // Reset checkboxes
        tagModal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        // Check boxes for existing tags on the habit
        const habitTags = document.querySelector(`.habit-card[data-habit-id="${currentHabitId}"] .habit-tags`);
        if (habitTags) {
            const existingTags = habitTags.querySelectorAll('.habit-tag');
            existingTags.forEach(tag => {
                const tagId = tag.dataset.tagId;
                const checkbox = tagModal.querySelector(`#tag${tagId}`);
                if (checkbox) checkbox.checked = true;
            });
        }
    });

    // Save changes button click handler
    console.log('Adding click handler to save button');
    saveChangesBtn.addEventListener('click', function(e) {
        console.log('Save button clicked!');
        e.preventDefault();
        
        console.log('Save changes clicked for habit:', currentHabitId);
        
        const selectedTags = [];
        const tagIds = [];
        const checkboxes = tagModal.querySelectorAll('input[type="checkbox"]:checked');
        console.log('Found checked checkboxes:', checkboxes.length);
        
        checkboxes.forEach(checkbox => {
            const tagId = checkbox.value;
            tagIds.push(tagId);
            const tagLabel = checkbox.nextElementSibling;
            const tagName = tagLabel.textContent.trim();
            const tagColor = tagLabel.style.backgroundColor;
            
            selectedTags.push({
                id: tagId,
                name: tagName,
                color: tagColor
            });
        });

        console.log('Selected tags:', selectedTags);

        // Send update to server
        fetch('/update_habit_tags', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                habit_id: currentHabitId,
                tag_ids: tagIds
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update habit tags display
                const habitTags = document.querySelector(`.habit-card[data-habit-id="${currentHabitId}"] .habit-tags`);
                if (!habitTags) {
                    console.error('Habit tags container not found for habit:', currentHabitId);
                    return;
                }

                habitTags.innerHTML = '';
                
                selectedTags.forEach(tag => {
                    const tagElement = document.createElement('div');
                    tagElement.className = 'habit-tag';
                    tagElement.dataset.tagId = tag.id;
                    tagElement.style.backgroundColor = tag.color;
                    tagElement.textContent = tag.name;
                    
                    habitTags.appendChild(tagElement);
                });

                // Close modal
                const modalInstance = bootstrap.Modal.getInstance(tagModal);
                if (modalInstance) {
                    modalInstance.hide();
                } else {
                    console.error('Modal instance not found');
                    $(tagModal).modal('hide'); // Fallback
                }
            } else {
                console.error('Failed to update tags:', data.error);
            }
        })
        .catch(error => {
            console.error('Error updating tags:', error);
        });
    });
    
    console.log('Tag management initialization complete');
}
