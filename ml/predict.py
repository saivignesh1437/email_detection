"""
Inference Service for Intelligent Email Management and Spam Detection Platform
Predicts spam probability and extracts high-impact keyword indicators.
"""
import os
import sys
import re
import joblib
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.preprocessing import clean_text

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
_model = None
_vectorizer = None

def get_model_and_vectorizer():
    global _model, _vectorizer
    if _model is None or _vectorizer is None:
        model_path = os.path.join(MODEL_DIR, "spam_classifier.joblib")
        vec_path = os.path.join(MODEL_DIR, "tfidf_vectorizer.joblib")
        if not os.path.exists(model_path) or not os.path.exists(vec_path):
            raise FileNotFoundError(
                f"Model or vectorizer artifact missing in {MODEL_DIR}. Please run ml/train.py first."
            )
        _model = joblib.load(model_path)
        _vectorizer = joblib.load(vec_path)
    return _model, _vectorizer

def explain_prediction(model, vectorizer, text: str, is_spam: bool, top_n: int = 5) -> str:
    """
    Extracts informative keywords from the input text that contributed to the classification.
    """
    cleaned = clean_text(text)
    feature_names = vectorizer.get_feature_names_out()
    vec = vectorizer.transform([cleaned])
    nonzero_indices = vec.nonzero()[1]
    
    if len(nonzero_indices) == 0:
        return "Standard communication vocabulary with neutral text distribution."

    # If logistic regression, use weights
    if hasattr(model, "coef_"):
        coefs = model.coef_[0]
        # weights of words present in the email
        word_weights = [(feature_names[i], coefs[i] * vec[0, i]) for i in nonzero_indices]
        if is_spam:
            # Sort by highest positive weight towards spam
            word_weights.sort(key=lambda x: x[1], reverse=True)
            top_words = [w[0] for w in word_weights if w[1] > 0][:top_n]
            if top_words:
                return f"Triggered key spam indicator terms: [{', '.join(top_words)}]."
            else:
                return "Elevated spam confidence based on combined lexical and phrasing pattern."
        else:
            # Sort by lowest negative weight (towards ham)
            word_weights.sort(key=lambda x: x[1])
            top_words = [w[0] for w in word_weights if w[1] < 0][:top_n]
            if top_words:
                return f"Consistent with legitimate correspondence containing typical terms: [{', '.join(top_words)}]."
            else:
                return "Recognized standard message phrasing with no recognized threat markers."
    else:
        # Fallback for Naive Bayes or other models
        tfidf_scores = [(feature_names[i], vec[0, i]) for i in nonzero_indices]
        tfidf_scores.sort(key=lambda x: x[1], reverse=True)
        top_words = [w[0] for w in tfidf_scores[:top_n]]
        if is_spam:
            return f"Flagged high-frequency promotional/phishing terms: [{', '.join(top_words)}]."
        else:
            return f"Contains standard conversational/business terms: [{', '.join(top_words)}]."

def predict_email_spam(subject: str, body: str) -> dict:
    """
    Predicts whether an email is Spam or Not Spam given subject and body.
    Returns:
        dict: {
            "is_spam": bool,
            "classification": "Spam" | "Not Spam",
            "spam_score": float (0.0 to 1.0),
            "confidence_percentage": float,
            "reason": str
        }
    """
    model, vectorizer = get_model_and_vectorizer()
    combined_text = (subject or "") + " " + (body or "")
    cleaned = clean_text(combined_text)

    vec = vectorizer.transform([cleaned])
    prob_spam = float(model.predict_proba(vec)[0][1])
    is_spam = bool(prob_spam >= 0.50)
    classification = "Spam" if is_spam else "Not Spam"
    confidence = (prob_spam if is_spam else (1.0 - prob_spam)) * 100.0

    reason = explain_prediction(model, vectorizer, combined_text, is_spam)
    if is_spam:
        reason += f" Spam confidence score is {round(prob_spam, 4)} (Threshold: 0.50)."
    else:
        reason += f" Legitimate confidence score is {round(1.0 - prob_spam, 4)}."

    return {
        "is_spam": is_spam,
        "classification": classification,
        "spam_score": round(prob_spam, 4),
        "confidence_percentage": round(confidence, 1),
        "reason": reason
    }
