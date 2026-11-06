"""
Model Training Script for Intelligent Email Management and Spam Detection Platform
Trains TF-IDF + Classifier on data/email_dataset.csv and generates real, measured metrics.
"""
import os
import re
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.preprocessing import clean_text

def train_and_evaluate():
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "email_dataset.csv")
    model_dir = os.path.join(os.path.dirname(__file__), "model")
    os.makedirs(model_dir, exist_ok=True)

    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}")

    df = pd.read_csv(data_path)
    print(f"Loaded dataset with {len(df)} records.")
    print(f"Class distribution: Ham={sum(df['label'] == 0)}, Spam={sum(df['label'] == 1)}")

    # Combine subject and body for comprehensive classification
    df["full_text"] = df["subject"].fillna("") + " " + df["body"].fillna("")
    df["cleaned_text"] = df["full_text"].apply(clean_text)

    X = df["cleaned_text"]
    y = df["label"]

    # Stratified 80/20 train/test split for reproducibility
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print(f"Training samples: {len(X_train)}, Testing samples: {len(X_test)}")

    # TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(
        max_features=2500,
        ngram_range=(1, 2),
        stop_words="english",
        sublinear_tf=True
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    # Train Candidates: MultinomialNB and LogisticRegression
    nb_model = MultinomialNB(alpha=0.5)
    nb_model.fit(X_train_vec, y_train)
    nb_preds = nb_model.predict(X_test_vec)
    nb_f1 = f1_score(y_test, nb_preds)

    lr_model = LogisticRegression(C=2.0, max_iter=1000, random_state=42)
    lr_model.fit(X_train_vec, y_train)
    lr_preds = lr_model.predict(X_test_vec)
    lr_f1 = f1_score(y_test, lr_preds)

    # Select best model based on F1-score
    if lr_f1 >= nb_f1:
        best_model = lr_model
        best_name = "Logistic Regression (C=2.0)"
        y_preds = lr_preds
        y_probs = lr_model.predict_proba(X_test_vec)[:, 1]
    else:
        best_model = nb_model
        best_name = "Multinomial Naive Bayes (alpha=0.5)"
        y_preds = nb_preds
        y_probs = nb_model.predict_proba(X_test_vec)[:, 1]

    # Calculate actual metrics
    acc = float(accuracy_score(y_test, y_preds))
    prec = float(precision_score(y_test, y_preds))
    rec = float(recall_score(y_test, y_preds))
    f1 = float(f1_score(y_test, y_preds))
    cm = confusion_matrix(y_test, y_preds).tolist() # [[TN, FP], [FN, TP]]

    metrics = {
        "model_type": best_name,
        "total_dataset_size": int(len(df)),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": {
            "true_negatives": cm[0][0],
            "false_positives": cm[0][1],
            "false_negatives": cm[1][0],
            "true_positives": cm[1][1]
        },
        "feature_count": int(len(vectorizer.get_feature_names_out())),
        "training_date": pd.Timestamp.now().isoformat()
    }

    # Save artifacts
    vectorizer_file = os.path.join(model_dir, "tfidf_vectorizer.joblib")
    model_file = os.path.join(model_dir, "spam_classifier.joblib")
    metrics_file = os.path.join(model_dir, "evaluation_metrics.json")

    joblib.dump(vectorizer, vectorizer_file)
    joblib.dump(best_model, model_file)

    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("\n" + "="*50)
    print(f"TRAINING COMPLETE - Best Model: {best_name}")
    print("="*50)
    print(f"Accuracy:  {acc * 100:.2f}%")
    print(f"Precision: {prec * 100:.2f}%")
    print(f"Recall:    {rec * 100:.2f}%")
    print(f"F1 Score:  {f1 * 100:.2f}%")
    print(f"Confusion Matrix: TN={cm[0][0]}, FP={cm[0][1]}, FN={cm[1][0]}, TP={cm[1][1]}")
    print("="*50)
    print(f"Model saved to:      {model_file}")
    print(f"Vectorizer saved to: {vectorizer_file}")
    print(f"Metrics saved to:    {metrics_file}")

    return metrics

if __name__ == "__main__":
    train_and_evaluate()
