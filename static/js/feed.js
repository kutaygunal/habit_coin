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
