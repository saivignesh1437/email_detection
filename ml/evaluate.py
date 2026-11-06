"""
Model Evaluation Script for Intelligent Email Management and Spam Detection Platform
Loads trained model and prints comprehensive evaluation report.
"""
import os
import sys
import json
import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.preprocessing import clean_text

def run_evaluation():
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, "..", "data", "email_dataset.csv")
    model_path = os.path.join(base_dir, "model", "spam_classifier.joblib")
    vectorizer_path = os.path.join(base_dir, "model", "tfidf_vectorizer.joblib")
    metrics_path = os.path.join(base_dir, "model", "evaluation_metrics.json")

    if not os.path.exists(model_path) or not os.path.exists(vectorizer_path):
        print("Model or vectorizer not found. Running training first...")
        from ml.train import train_and_evaluate
        train_and_evaluate()

    model = joblib.load(model_path)
    vectorizer = joblib.load(vectorizer_path)
    df = pd.read_csv(data_path)

    df["full_text"] = df["subject"].fillna("") + " " + df["body"].fillna("")
    df["cleaned"] = df["full_text"].apply(clean_text)

    X_vec = vectorizer.transform(df["cleaned"])
    y_true = df["label"]
    y_pred = model.predict(X_vec)

    print("\n" + "="*60)
    print("MODEL EVALUATION REPORT ON FULL DATASET")
    print("="*60)
    print(classification_report(y_true, y_pred, target_names=["Legitimate (Ham)", "Spam"]))
    print("Confusion Matrix:")
    print(confusion_matrix(y_true, y_pred))
    
    if os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            saved_metrics = json.load(f)
            print("\nSaved Test Split (Holdout 20%) Metrics:")
            for k, v in saved_metrics.items():
                print(f"  {k}: {v}")
    print("="*60)

if __name__ == "__main__":
    run_evaluation()
