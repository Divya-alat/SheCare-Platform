import os
import joblib
from flask import Blueprint, request, jsonify
from utils.preprocess import preprocess_input, build_risk_response

pcos_bp = Blueprint('pcos', __name__)

# ── Find pcos_model.pkl by walking UP from this file ─────────
def _find_model():
    # Start from this file's directory and walk up
    current = os.path.dirname(os.path.abspath(__file__))
    
    # Walk up max 4 levels looking for pcos_model.pkl
    for _ in range(4):
        current = os.path.dirname(current)
        for subfolder in ['models', 'api/models', 'api', '.']:
            candidate = os.path.join(current, subfolder, 'pcos_model.pkl')
            candidate = os.path.normpath(candidate)
            if os.path.isfile(candidate):
                return candidate
    return None

MODEL_PATH = _find_model()

try:
    if MODEL_PATH:
        model = joblib.load(MODEL_PATH)
        print(f"✅ PCOS model loaded from: {MODEL_PATH}")
    else:
        model = None
        print("❌ pcos_model.pkl not found anywhere. Running in fallback mode.")
        print("   Please place pcos_model.pkl in ml-models/models/ folder")
except Exception as e:
    model = None
    print(f"❌ Could not load PCOS model: {e}")


def predict_pcos():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON body received'}), 400

    if model is None:
        # Fallback rule-based scoring
        symptoms = data.get('symptoms', {})
        count    = sum(1 for v in symptoms.values() if v)
        prob     = min(count / 8, 0.95)
        result   = build_risk_response(int(prob > 0.5), prob, data)
        result['fallback'] = True
        return jsonify(result), 200

    try:
        features    = preprocess_input(data)
        prediction  = int(model.predict(features)[0])
        probability = float(model.predict_proba(features)[0][1])
        result      = build_risk_response(prediction, probability, data)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


pcos_bp.add_url_rule('/predict', 'predict', predict_pcos, methods=['POST'])


@pcos_bp.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':       'OK',
        'model_loaded': model is not None,
        'model_path':   str(MODEL_PATH),
    }), 200