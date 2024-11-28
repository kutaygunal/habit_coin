from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///habits.db'
db = SQLAlchemy(app)

class Habit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
class HabitLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    habit_id = db.Column(db.Integer, db.ForeignKey('habit.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    completed = db.Column(db.Boolean, default=False)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    habits = Habit.query.all()
    today = datetime.now().date()
    return render_template('index.html', habits=habits, today=today, timedelta=timedelta)

@app.route('/add_habit', methods=['POST'])
def add_habit():
    name = request.form.get('name')
    description = request.form.get('description')
    
    if name:
        new_habit = Habit(name=name, description=description)
        db.session.add(new_habit)
        db.session.commit()
    
    return redirect(url_for('index'))

@app.route('/toggle_habit', methods=['POST'])
def toggle_habit():
    habit_id = request.json.get('habit_id')
    date_str = request.json.get('date')
    date = datetime.strptime(date_str, '%Y-%m-%d').date()
    
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

@app.route('/habit_status/<int:habit_id>')
def habit_status(habit_id):
    habit_logs = HabitLog.query.filter_by(habit_id=habit_id).all()
    completions = [{'date': log.date.strftime('%Y-%m-%d'), 'completed': log.completed} for log in habit_logs]
    return jsonify({'completions': completions})

@app.route('/delete_habit/<int:habit_id>', methods=['DELETE'])
def delete_habit(habit_id):
    habit = Habit.query.get_or_404(habit_id)
    
    # Delete associated logs first
    HabitLog.query.filter_by(habit_id=habit_id).delete()
    
    # Delete the habit
    db.session.delete(habit)
    db.session.commit()
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)
