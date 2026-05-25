import numpy as np
import pandas as pd

MODEL_FEATURES = [
    'Cycle(R/I)',
    'Weight gain(Y/N)',
    'hair growth(Y/N)',
    'Skin darkening (Y/N)',
    'Hair loss(Y/N)',
    'Pimples(Y/N)',
    'Fast food (Y/N)',
    'Reg.Exercise(Y/N)',
    'symptom_score',
    'BMI',
    'Age (yrs)',
    'bmi_category',
    'age_group',
]


def preprocess_input(data: dict) -> pd.DataFrame:
    symptoms = data.get('symptoms', {})
    age      = float(data.get('age', 25))
    weight   = float(data.get('weight', 60))
    height   = float(data.get('height', 158))

    bmi = data.get('bmi')
    if not bmi:
        bmi = weight / ((height / 100) ** 2)
    bmi = float(bmi)

    cycle_irregular = int(bool(symptoms.get('irregularPeriods',  False)))
    weight_gain     = int(bool(symptoms.get('weightGain',        False)))
    hair_growth     = int(bool(symptoms.get('excessHairGrowth',  False)))
    skin_darkening  = int(bool(symptoms.get('darkSkinPatches',   False)))
    hair_loss       = int(bool(symptoms.get('hairLoss',          False)))
    pimples         = int(bool(symptoms.get('acne',              False)))
    fast_food       = int(bool(symptoms.get('fastFood',          False)))
    reg_exercise    = int(bool(symptoms.get('regularExercise',   False)))

    symptom_score = weight_gain + hair_growth + skin_darkening + hair_loss + pimples

    bmi_category = (0 if bmi < 18.5 else 1 if bmi < 25 else 2 if bmi < 30 else 3)
    age_group    = (0 if age <= 22  else 1 if age <= 28 else 2 if age <= 35 else 3)

    return pd.DataFrame([[
        cycle_irregular, weight_gain, hair_growth, skin_darkening,
        hair_loss, pimples, fast_food, reg_exercise,
        symptom_score, bmi, age, bmi_category, age_group,
    ]], columns=MODEL_FEATURES)


def build_risk_response(prediction: int, probability: float, data: dict) -> dict:
    risk_score = round(probability * 100)
    risk_level = ('high' if risk_score >= 65 else 'moderate' if risk_score >= 35 else 'low')

    symptoms = data.get('symptoms', {})
    bmi      = float(data.get('bmi', 22))

    risk_labels = {'low': '✅ Low Risk', 'moderate': '⚠️ Moderate Risk', 'high': '🔴 High Risk'}
    risk_colors = {'low': '#5BAD8F',     'moderate': '#F5A623',           'high': '#C8526A'}

    return {
        'prediction':      prediction,
        'probability':     round(probability, 4),
        'riskScore':       risk_score,
        'riskLevel':       risk_level,
        'riskLabel':       risk_labels[risk_level],
        'riskColor':       risk_colors[risk_level],
        'recommendations': _build_recommendations(symptoms, risk_level, bmi),
    }


def _build_recommendations(symptoms: dict, risk_level: str, bmi: float) -> list:
    recs = []
    if risk_level == 'high':
        recs.append('Please consult a gynaecologist soon for a thorough evaluation')
        recs.append('Ask your doctor for an ultrasound and hormone panel (LH, FSH, AMH, testosterone)')
    if risk_level == 'moderate':
        recs.append('Consider scheduling a check-up with your gynaecologist')
    if symptoms.get('irregularPeriods'):
        recs.append('Track your cycle dates consistently — irregular periods are the key PCOS signal')
    if symptoms.get('weightGain') or bmi > 25:
        recs.append('A low-GI diet (less white rice, maida, sugar) with 30 min daily exercise significantly reduces PCOS symptoms')
    if symptoms.get('excessHairGrowth') or symptoms.get('hairLoss'):
        recs.append('Elevated androgens may be causing this — a hormone blood test can confirm')
    if symptoms.get('acne'):
        recs.append('Hormonal acne from PCOS responds well to spearmint tea and a low-sugar diet')
    if symptoms.get('darkSkinPatches'):
        recs.append('Dark patches (acanthosis nigricans) can indicate insulin resistance — check fasting insulin')
    if not symptoms.get('regularExercise'):
        recs.append('Even 20–30 min of walking daily improves insulin sensitivity and helps regulate cycles')
    if risk_level == 'low':
        recs.append('Your risk appears low — maintain a healthy lifestyle and get an annual gynaecology check-up')
    recs.append('Yoga, meditation, or journaling significantly improves hormonal balance')
    return recs[:5]