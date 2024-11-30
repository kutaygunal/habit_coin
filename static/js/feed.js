document.addEventListener('DOMContentLoaded', function() {
    // Add click event listeners to all delete buttons
    document.querySelectorAll('.delete-activity-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const activityId = this.getAttribute('data-activity-id');
            deleteActivity(activityId);
        });
    });
});

function deleteActivity(activityId) {
    if (confirm('Are you sure you want to delete this activity?')) {
        fetch(`/delete_activity/${activityId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (response.ok) {
                const feedCard = document.querySelector(`.feed-card[data-activity-id="${activityId}"]`);
                if (feedCard) {
                    feedCard.remove();
                    
                    // Check if there are any remaining feed cards
                    const remainingCards = document.querySelectorAll('.feed-card');
                    if (remainingCards.length === 0) {
                        const feedContainer = document.querySelector('.feed-container');
                        feedContainer.innerHTML = `
                            <div class="empty-feed">
                                <i class="fas fa-stream"></i>
                                <h3>No Activities Yet</h3>
                                <p>Start tracking your habits to see updates here!</p>
                            </div>
                        `;
                    }
                }
            } else {
                alert('Failed to delete activity');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while deleting the activity');
        });
    }
}
