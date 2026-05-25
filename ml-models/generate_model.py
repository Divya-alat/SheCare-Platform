"""
Run this script ONCE to generate pcos_model.pkl on your machine.

HOW TO RUN:
  1. Open terminal in VS Code
  2. cd to ml-models folder
  3. Activate venv: .\venv\Scripts\Activate.ps1
  4. Run: python generate_model.py
  5. You will see: SUCCESS! Model saved to models/pcos_model.pkl
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

print("🌸 SheCare PCOS Model Generator")
print("=" * 40)

# ── Step 1: Generate training data ───────────────────────────
print("📊 Generating training dataset...")
np.random.seed(42)
n = 541

pcos = np.random.binomial(1, 0.33, n)

def feature(pcos_arr, pcos_prob, no_pcos_prob):
    return np.where(
        pcos_arr == 1,
        np.random.binomial(1, pcos_prob, n),
        np.random.binomial(1, no_pcos_prob, n)
    )

df = pd.DataFrame({
    'Cycle(R/I)':            feature(pcos, 0.82, 0.15),
    'Weight gain(Y/N)':      feature(pcos, 0.78, 0.18),
    'hair growth(Y/N)':      feature(pcos, 0.70, 0.12),
    'Skin darkening (Y/N)':  feature(pcos, 0.65, 0.10),
    'Hair loss(Y/N)':        feature(pcos, 0.62, 0.20),
    'Pimples(Y/N)':          feature(pcos, 0.72, 0.28),
    'Fast food (Y/N)':       feature(pcos, 0.68, 0.42),
    'Reg.Exercise(Y/N)':     feature(pcos, 0.25, 0.55),
    'BMI':                   np.where(pcos==1,
                                np.random.normal(26,4,n),
                                np.random.normal(23,3,n)).clip(16,42),
    'Age (yrs)':             np.where(pcos==1,
                                np.random.normal(26,4,n),
                                np.random.normal(28,5,n)).clip(18,45).astype(int),
    'PCOS (Y/N)':            pcos,
})

# ── Step 2: Feature engineering ──────────────────────────────
df['symptom_score'] = (df['Weight gain(Y/N)'] + df['hair growth(Y/N)'] +
                       df['Skin darkening (Y/N)'] + df['Hair loss(Y/N)'] +
                       df['Pimples(Y/N)'])

df['bmi_category'] = pd.cut(df['BMI'],
    bins=[0, 18.5, 25, 30, 100], labels=[0, 1, 2, 3]).astype(int)

df['age_group'] = pd.cut(df['Age (yrs)'],
    bins=[0, 22, 28, 35, 100], labels=[0, 1, 2, 3]).astype(int)

# ── Step 3: Train model ───────────────────────────────────────
FEATURES = [
    'Cycle(R/I)', 'Weight gain(Y/N)', 'hair growth(Y/N)',
    'Skin darkening (Y/N)', 'Hair loss(Y/N)', 'Pimples(Y/N)',
    'Fast food (Y/N)', 'Reg.Exercise(Y/N)',
    'symptom_score', 'BMI', 'Age (yrs)', 'bmi_category', 'age_group',
]

X = df[FEATURES]
y = df['PCOS (Y/N)']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y)

print("🤖 Training Random Forest model...")
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1,
)
model.fit(X_train, y_train)

acc = accuracy_score(y_test, model.predict(X_test))
print(f"✅ Model trained! Accuracy: {acc*100:.1f}%")

# ── Step 4: Save model ────────────────────────────────────────
# Save in ml-models/models/ folder (run this from ml-models/)
save_dir = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(save_dir, exist_ok=True)

save_path = os.path.join(save_dir, 'pcos_model.pkl')
joblib.dump(model, save_path)

print(f"")
print(f"✅ SUCCESS! Model saved to: {save_path}")
print(f"")
print(f"Now run Flask:")
print(f"  cd api")
print(f"  python app.py")