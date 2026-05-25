import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask
from flask_cors import CORS
from routes.pcos_route   import pcos_bp, predict_pcos
from routes.stress_route import stress_bp

app = Flask(__name__)

# Allow requests from your Vercel frontend URL
CORS(app, origins=[
    "http://localhost:3000",
    "http://localhost:5000",
    os.environ.get("CLIENT_URL", "*"),
])

app.register_blueprint(pcos_bp,   url_prefix='/pcos')
app.register_blueprint(stress_bp, url_prefix='/stress')

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'OK', 'message': 'SheCare ML API is running 🌸'}, 200

app.add_url_rule('/predict', 'predict', predict_pcos, methods=['POST'])

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    debug = os.environ.get("NODE_ENV") != "production"
    app.run(host='0.0.0.0', port=port, debug=debug)