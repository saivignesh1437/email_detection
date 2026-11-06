import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

# 1. Load the dataset
df = pd.read_csv("email_dataset.csv")

# 2. Combine subject and body
df["email_text"] = (
    df["subject"].fillna("") + " " +
    df["body"].fillna("")
).str.strip()

X = df["email_text"]
y = df["label"].astype(int)

# 3. Split into training and testing data
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print("=" * 50)
print("DATASET SUMMARY")
print("=" * 50)
print("Total emails:", len(df))
print("Training emails:", len(X_train))
print("Testing emails:", len(X_test))

print("\nTraining class distribution:")
print(y_train.value_counts().sort_index())

print("\nTesting class distribution:")
print(y_test.value_counts().sort_index())

# 4. Convert text into TF-IDF features
vectorizer = TfidfVectorizer(
    stop_words="english",
    max_features=5000
)

X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

# 5. Train the model
model = MultinomialNB()
model.fit(X_train_tfidf, y_train)

# 6. Predict labels for testing data
y_pred = model.predict(X_test_tfidf)

# 7. Evaluate the model
print("\n" + "=" * 50)
print("TESTING RESULTS")
print("=" * 50)

print(f"Accuracy:  {accuracy_score(y_test, y_pred) * 100:.2f}%")
print(f"Precision: {precision_score(y_test, y_pred, zero_division=0) * 100:.2f}%")
print(f"Recall:    {recall_score(y_test, y_pred, zero_division=0) * 100:.2f}%")
print(f"F1-score:  {f1_score(y_test, y_pred, zero_division=0) * 100:.2f}%")

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred, labels=[0, 1]))

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        y_pred,
        labels=[0, 1],
        target_names=["Legitimate", "Spam"],
        zero_division=0
    )
)

# 8. Save actual testing predictions
results = pd.DataFrame({
    "email_text": X_test,
    "actual_label": y_test,
    "predicted_label": y_pred,
    "correct_prediction": (y_test.to_numpy() == y_pred)
})

results["actual_label"] = results["actual_label"].map(
    {0: "Legitimate", 1: "Spam"}
)
results["predicted_label"] = results["predicted_label"].map(
    {0: "Legitimate", 1: "Spam"}
)

results.to_csv("testing_results.csv", index=False)

print("\nSaved predictions to testing_results.csv")