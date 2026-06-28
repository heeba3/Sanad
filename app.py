from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os
import re
import tempfile
import whisper
import ssl

# تجاوز مشكلة SSL في macOS
ssl._create_default_https_context = ssl._create_unverified_context

app = Flask(__name__)
CORS(app)

# Load ML classifier
model = joblib.load("sanad_report_classifier_v3.pkl")

# Load Whisper model
whisper_model = whisper.load_model("base")

label_map_ar = {
    "security": "أمني",
    "medical": "طبي",
    "lost_items": "مفقودات"
}

def rule_based_classification(text):
    t = text.strip().lower()

    medical_keywords = [
        "أغمي", "اغمي", "مغمى", "ضيق تنفس", "ضيق في التنفس", "ينزف", "نزيف",
        "ألم صدر", "الم صدر", "صدر", "تشنجات", "يتقيأ", "حرارته", "دوخة",
        "سقط", "طاح", "اسعاف", "إسعاف", "مريض",
        "fainted", "unconscious", "difficulty breathing", "shortness of breath",
        "bleeding", "chest pain", "seizures", "vomiting", "high fever", "dizzy", "collapsed"
    ]

    lost_item_keywords = [
        "جواز", "جوازي", "passport",
        "جوال", "جوالي", "هاتف", "هاتفي", "phone", "telephone", "mobile",
        "محفظة", "محفظتي", "wallet",
        "بطاقة", "بطاقتي", "نسك", "card", "nusuk",
        "حقيبة", "حقيبتي", "شنطة", "شنطتي", "bag", "handbag",
        "سوار", "bracelet",
        "دواء", "medicine",
        "مبلغ", "فلوس", "cash", "money"
    ]

    missing_person_keywords = [
        "طفلي", "ابني", "ابنتي", "أبي", "ابي", "أمي", "امي", "أخي", "اخي",
        "أختي", "اختي", "زوجتي", "زوجي", "مرافقي",
        "my child", "my son", "my daughter", "my father", "my mother",
        "my brother", "my sister", "my wife", "my husband", "my companion"
    ]

    missing_words = [
        "مفقود", "ضايع", "ضاع", "اختفى",
        "missing", "lost", "miss", "gone"
    ]

    security_keywords = [
        "شخص مشبوه", "يتشاجر", "يهدد", "يحاول سرقة", "سرقة",
        "suspicious", "threat", "fight", "security", "steal"
    ]

    if any(keyword in t for keyword in medical_keywords):
        return "medical"

    if any(person in t for person in missing_person_keywords) and any(word in t for word in missing_words):
        return "security"

    if any(keyword in t for keyword in security_keywords):
        return "security"

    if any(keyword in t for keyword in lost_item_keywords):
        return "lost_items"

    return None

def classify_text(text):
    pred = rule_based_classification(text)
    if pred is None:
        pred = model.predict([text])[0]
    return pred

@app.route("/")
def home():
    return {"message": "SANAD AI backend is running"}

@app.route("/predict-text", methods=["POST"])
def predict_text():
    data = request.get_json()

    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data["text"].strip()

    if not text:
        return jsonify({"error": "Empty text"}), 400

    pred = classify_text(text)

    return jsonify({
        "input_text": text,
        "predicted_label_en": pred,
        "predicted_label_ar": label_map_ar[pred]
    })

@app.route("/predict-audio", methods=["POST"])
def predict_audio():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]

    if audio_file.filename == "":
        return jsonify({"error": "Empty audio filename"}), 400

    language = request.form.get("language", None)
    suffix = os.path.splitext(audio_file.filename)[1] or ".webm"
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name

        kwargs = {}
        if language:
            kwargs["language"] = language

        result = whisper_model.transcribe(temp_path, **kwargs)
        text = result["text"].strip()

        if not text:
            return jsonify({"error": "Could not extract speech text"}), 400

        pred = classify_text(text)

        return jsonify({
            "input_text": text,
            "predicted_label_en": pred,
            "predicted_label_ar": label_map_ar[pred]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    app.run(debug=True, port=5000)