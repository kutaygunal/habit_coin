from app import app, db

# Drop and recreate all tables
with app.app_context():
    # Drop all tables
    db.drop_all()
    
    # Create all tables with new schema
    db.create_all()
    
    print("Database has been reset successfully with the new schema!")
