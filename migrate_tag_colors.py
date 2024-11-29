from app import app, db, Tag

# Define the color cycle
colors = ['#ff9f40', '#ffc107', '#f44336', '#9c27b0', '#4caf50']

def migrate_tag_colors():
    with app.app_context():
        # Get all users
        users = db.session.query(Tag.user_id).distinct().all()
        
        for (user_id,) in users:
            # Get all tags for this user
            user_tags = Tag.query.filter_by(user_id=user_id).order_by(Tag.created_at).all()
            
            # Update colors for each tag
            for i, tag in enumerate(user_tags):
                tag.color = colors[i % len(colors)]
            
        # Commit all changes
        db.session.commit()
        print("Successfully updated tag colors!")

if __name__ == '__main__':
    migrate_tag_colors()
