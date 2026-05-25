import numpy as np
from flask import Blueprint, request, jsonify

stress_bp = Blueprint('stress', __name__)


def _rule_based_stress(data: dict) -> dict:
    """
    Rule-based stress scoring (used when no ML model is present).
    Based on validated PSS (Perceived Stress Scale) research.
    """
    sleep_hrs    = float(data.get('sleepHours',    7))
    water_glasses= float(data.get('waterGlasses',  6))
    exercise_min = float(data.get('exerciseMinutes',30))
    mood         = data.get('mood', 'okay')
    factors      = data.get('stressFactors', [])

    score = 0.0

    # Sleep deprivation is the strongest stress predictor
    if sleep_hrs < 5:   score += 3.5
    elif sleep_hrs < 6: score += 2.5
    elif sleep_hrs < 7: score += 1.5
    elif sleep_hrs > 9: score += 0.5

    # Dehydration increases cortisol
    if water_glasses < 4: score += 1.5
    elif water_glasses < 6: score += 0.7

    # Exercise is protective
    if exercise_min == 0: score += 1.5
    elif exercise_min < 20: score += 0.5
    elif exercise_min >= 45: score -= 0.5

    # Mood
    mood_scores = {'stressed': 3.5, 'low': 2.5, 'okay': 1.0, 'good': 0.0, 'great': -0.5}
    score += mood_scores.get(mood, 1.0)

    # Number of stress factors
    score += len(factors) * 0.4

    # Clamp to 1-10
    stress_level = round(max(1, min(10, score)), 1)
    probability  = round((stress_level - 1) / 9, 4)

    return {
        'stressLevel':   stress_level,
        'probability':   probability,
        'category':      _stress_category(stress_level),
        'tips':          _stress_tips(data, stress_level),
    }


def _stress_category(level: float) -> dict:
    if level <= 3:
        return {'label': 'Low Stress',      'color': '#5BAD8F', 'emoji': '🌿'}
    elif level <= 6:
        return {'label': 'Moderate Stress', 'color': '#F5A623', 'emoji': '🌬️'}
    else:
        return {'label': 'High Stress',     'color': '#C8526A', 'emoji': '🌸'}


def _stress_tips(data: dict, level: float) -> list:
    tips = []
    sleep_hrs    = float(data.get('sleepHours', 7))
    water_glasses= float(data.get('waterGlasses', 6))
    exercise_min = float(data.get('exerciseMinutes', 30))
    factors      = data.get('stressFactors', [])

    if sleep_hrs < 7:
        tips.append('Try a consistent 10:30 PM bedtime — sleep is the #1 stress reducer')
    if water_glasses < 6:
        tips.append('Dehydration raises cortisol — aim for 8 glasses of water today')
    if exercise_min < 20:
        tips.append('A 20-minute walk releases endorphins that lower stress hormones naturally')
    if 'Work pressure' in factors:
        tips.append('Try the Pomodoro technique — 25 min focused work, 5 min break')
    if level >= 7:
        tips.append('Box breathing (4-4-4-4) for 5 minutes activates your parasympathetic system')
        tips.append('Journaling your thoughts for 10 minutes before bed can significantly lower next-day stress')

    tips.append('Yoga nidra (body scan meditation) is highly effective for stress in Indian women')
    return tips[:4]


@stress_bp.route('/predict', methods=['POST'])
def predict_stress():
    """
    POST /stress/predict
    Body: {
        sleepHours: 6,
        waterGlasses: 5,
        exerciseMinutes: 30,
        mood: 'okay',
        stressFactors: ['Work pressure', 'Sleep issues']
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON body received'}), 400

    try:
        result = _rule_based_stress(data)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500