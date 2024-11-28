# HabitCoin - Habit Tracking Application

A modern web application for tracking daily habits and building consistent routines.

## Features

### Core Features
- Create and manage daily habits
- Track habit completion
- View habit statistics and streaks
- Delete unwanted habits

### User Management
- User registration and authentication
- Secure password hashing
- User-specific habit tracking
- Comprehensive user profiles

### Profile Features
- View member statistics
  * Total habits count
  * 30-day completion count
  * Current streak tracking
- Update profile information
  * Email address
  * Username
- Change password securely
- Customize preferences
  * Email notifications
  * UI theme (Light/Dark)
- Account management
  * View join date
  * Delete account option

### Security Features
- Password hashing with bcrypt
- User authentication required for all routes
- CSRF protection
- Secure session management
- User-specific data access

## Technologies Used

### Backend
- Python 3.10+
- Flask Framework
- SQLAlchemy ORM
- SQLite Database
- Flask-Login for authentication
- Flask-Bcrypt for password hashing

### Frontend
- HTML5
- CSS3
- JavaScript
- Bootstrap 5
- Font Awesome icons

## Installation

1. Clone the repository:
```bash
git clone https://github.com/kutaygunal/habit_coin.git
cd habit_coin
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Initialize the database:
```bash
python reset_db.py
```

5. Run the application:
```bash
python app.py
```

6. Visit `http://localhost:5000` in your web browser

## Dependencies

```
Flask==2.3.3
Flask-SQLAlchemy==3.1.1
python-dotenv==1.0.0
Flask-Login==0.6.3
Flask-Bcrypt==1.0.1
email-validator==2.1.0.post1
```

## Project Structure

```
HabitCoin/
├── app.py                 # Main application file
├── reset_db.py           # Database initialization script
├── requirements.txt      # Project dependencies
├── static/
│   ├── style.css        # CSS styles
│   └── script.js        # JavaScript functions
├── templates/
│   ├── index.html       # Main habit tracking page
│   ├── login.html       # Login page
│   ├── register.html    # Registration page
│   └── profile.html     # User profile page
└── habits.db            # SQLite database
```

## Database Models

### User
- id (Primary Key)
- username
- email
- password (hashed)
- created_at
- email_notifications
- theme
- habits (relationship)

### Habit
- id (Primary Key)
- name
- description
- created_at
- user_id (Foreign Key)

### HabitLog
- id (Primary Key)
- habit_id (Foreign Key)
- date
- completed

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Future Enhancements

1. Email notifications for daily habits
2. Mobile responsive design improvements
3. Social features and habit sharing
4. Advanced analytics and insights
5. Habit categories and tags
6. Progress visualization
7. Export habit data
8. API integration for third-party apps
