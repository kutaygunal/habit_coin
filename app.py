from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta
import os
from urllib.parse import urlparse
from werkzeug.utils import secure_filename
import uuid
import time

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///habits.db'
app.config['SECRET_KEY'] = 'your-secret-key-here'  # Change this to a secure secret key
app.config['UPLOAD_FOLDER'] = os.path.join(app.static_folder, 'profile_photos')
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024  # 1MB max file size
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message_category = 'info'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    email_notifications = db.Column(db.Boolean, default=True)
    profile_photo = db.Column(db.String(255), default='default.png')
    habits = db.relationship('Habit', backref='user', lazy=True)

class Habit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Changed to nullable=True temporarily
    
class HabitLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    habit_id = db.Column(db.Integer, db.ForeignKey('habit.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    completed = db.Column(db.Boolean, default=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        user = User.query.filter_by(username=username).first()
        if user:
            flash('Username already exists. Please choose a different one.', 'danger')
            return redirect(url_for('register'))
        
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return redirect(url_for('register'))
        
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user = User(username=username, email=email, password=hashed_password)
        db.session.add(user)
        db.session.commit()
        
        flash('Your account has been created! You can now log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = request.form.get('remember', False) == 'on'
        
        user = User.query.filter_by(username=username).first()
        
        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user, remember=remember)
            next_page = request.args.get('next')
            if not next_page or urlparse(next_page).netloc != '':
                next_page = url_for('index')
            
            # Update existing habits to belong to this user
            anonymous_habits = Habit.query.filter_by(user_id=None).all()
            for habit in anonymous_habits:
                habit.user_id = user.id
            db.session.commit()
            
            flash('Successfully logged in!', 'success')
            return redirect(next_page)
        else:
            flash('Invalid username or password', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    try:
        habits = Habit.query.filter_by(user_id=current_user.id).all()
        today = datetime.now().date()
        return render_template('index.html', habits=habits, today=today, timedelta=timedelta)
    except Exception as e:
        app.logger.error(f"Error in index route: {str(e)}")
        flash('An error occurred while loading habits.', 'danger')
        return render_template('index.html', habits=[])

@app.route('/add_habit', methods=['POST'])
@login_required
def add_habit():
    name = request.form.get('name')
    description = request.form.get('description')
    
    if name:
        new_habit = Habit(name=name, description=description, user_id=current_user.id)
        db.session.add(new_habit)
        db.session.commit()
    
    return redirect(url_for('index'))

@app.route('/toggle_habit', methods=['POST'])
@login_required
def toggle_habit():
    habit_id = request.json.get('habit_id')
    date_str = request.json.get('date')
    date = datetime.strptime(date_str, '%Y-%m-%d').date()
    
    # Verify the habit belongs to the current user
    habit = Habit.query.get_or_404(habit_id)
    if habit.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    habit_log = HabitLog.query.filter_by(
        habit_id=habit_id,
        date=date
    ).first()
    
    if habit_log:
        habit_log.completed = not habit_log.completed
    else:
        habit_log = HabitLog(habit_id=habit_id, date=date, completed=True)
        db.session.add(habit_log)
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/delete_habit/<int:habit_id>', methods=['DELETE'])
@login_required
def delete_habit(habit_id):
    habit = Habit.query.get_or_404(habit_id)
    
    # Verify the habit belongs to the current user
    if habit.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Delete associated logs first
    HabitLog.query.filter_by(habit_id=habit_id).delete()
    
    # Delete the habit
    db.session.delete(habit)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/habit_status/<int:habit_id>')
@login_required
def habit_status(habit_id):
    # Verify the habit belongs to the current user
    habit = Habit.query.get_or_404(habit_id)
    if habit.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    habit_logs = HabitLog.query.filter_by(habit_id=habit_id).all()
    completions = [{'date': log.date.strftime('%Y-%m-%d'), 'completed': log.completed} for log in habit_logs]
    return jsonify({'completions': completions})

@app.route('/profile')
@login_required
def profile():
    # Get user statistics
    habits_count = Habit.query.filter_by(user_id=current_user.id).count()
    
    # Count completed habits in the last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    completed_count = HabitLog.query.join(Habit).filter(
        Habit.user_id == current_user.id,
        HabitLog.completed == True,
        HabitLog.date >= thirty_days_ago
    ).count()
    
    # Calculate current streak
    streak_count = 0
    today = datetime.utcnow().date()
    check_date = today
    
    while True:
        day_completed = HabitLog.query.join(Habit).filter(
            Habit.user_id == current_user.id,
            HabitLog.date == check_date,
            HabitLog.completed == True
        ).first()
        
        if not day_completed:
            break
            
        streak_count += 1
        check_date -= timedelta(days=1)
    
    return render_template('profile.html', 
                         habits_count=habits_count,
                         completed_count=completed_count,
                         streak_count=streak_count)

@app.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    email = request.form.get('email')
    username = request.form.get('username')
    
    if not email or not username:
        flash('Email and username are required.', 'danger')
        return redirect(url_for('profile'))
    
    # Check if email is already taken by another user
    email_exists = User.query.filter(User.email == email, User.id != current_user.id).first()
    if email_exists:
        flash('Email is already taken.', 'danger')
        return redirect(url_for('profile'))
    
    # Check if username is already taken by another user
    username_exists = User.query.filter(User.username == username, User.id != current_user.id).first()
    if username_exists:
        flash('Username is already taken.', 'danger')
        return redirect(url_for('profile'))
    
    current_user.email = email
    current_user.username = username
    db.session.commit()
    
    flash('Profile updated successfully!', 'success')
    return redirect(url_for('profile'))

@app.route('/change_password', methods=['POST'])
@login_required
def change_password():
    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')
    
    if not current_password or not new_password or not confirm_password:
        flash('All password fields are required.', 'danger')
        return redirect(url_for('profile'))
    
    if not bcrypt.check_password_hash(current_user.password, current_password):
        flash('Current password is incorrect.', 'danger')
        return redirect(url_for('profile'))
    
    if new_password != confirm_password:
        flash('New passwords do not match.', 'danger')
        return redirect(url_for('profile'))
    
    if len(new_password) < 6:
        flash('Password must be at least 6 characters long.', 'danger')
        return redirect(url_for('profile'))
    
    current_user.password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.session.commit()
    
    flash('Password changed successfully!', 'success')
    return redirect(url_for('profile'))

@app.route('/update_settings', methods=['POST'])
@login_required
def update_settings():
    email_notifications = 'email_notifications' in request.form
    
    try:
        current_user.email_notifications = email_notifications
        db.session.commit()
        flash('Settings updated successfully!', 'success')
    except Exception as e:
        flash('Failed to update settings. Please try again.', 'danger')
        
    return redirect(url_for('profile'))

@app.route('/delete_account', methods=['POST'])
@login_required
def delete_account():
    password = request.form.get('password')
    
    if not password:
        flash('Password is required to delete account.', 'danger')
        return redirect(url_for('profile'))
    
    if not bcrypt.check_password_hash(current_user.password, password):
        flash('Password is incorrect.', 'danger')
        return redirect(url_for('profile'))
    
    # Delete all user's habits and habit logs
    habits = Habit.query.filter_by(user_id=current_user.id).all()
    for habit in habits:
        HabitLog.query.filter_by(habit_id=habit.id).delete()
    Habit.query.filter_by(user_id=current_user.id).delete()
    
    # Delete the user
    db.session.delete(current_user)
    db.session.commit()
    
    logout_user()
    flash('Your account has been deleted.', 'info')
    return redirect(url_for('login'))

@app.route('/upload_profile_photo', methods=['POST'])
@login_required
def upload_profile_photo():
    if 'photo' not in request.files:
        return jsonify({'success': False, 'message': 'No file uploaded'}), 400
    
    photo = request.files['photo']
    
    if photo.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400
    
    if not allowed_file(photo.filename):
        return jsonify({'success': False, 'message': 'Invalid file type'}), 400
    
    try:
        # Generate unique filename
        filename = secure_filename(f"{current_user.id}_{int(time.time())}.jpg")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save the file
        photo.save(filepath)
        
        # Update user's profile photo in database
        if current_user.profile_photo != 'default.png':
            # Delete old profile photo
            old_photo_path = os.path.join(app.config['UPLOAD_FOLDER'], current_user.profile_photo)
            if os.path.exists(old_photo_path):
                os.remove(old_photo_path)
        
        current_user.profile_photo = filename
        db.session.commit()
        
        return jsonify({
            'success': True,
            'photo_url': url_for('static', filename=f'profile_photos/{filename}')
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.context_processor
def inject_theme():
    return dict(theme='light')

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)
