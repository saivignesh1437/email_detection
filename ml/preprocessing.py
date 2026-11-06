"""
Text Preprocessing Module for Intelligent Email Management Platform
Provides shared NLP cleaning utilities for training, inference, and evaluation.
"""
import re

def clean_text(text: str) -> str:
    """
    Cleans raw email text: lowercases, normalizes URLs, email addresses,
    and currency figures, removes punctuation, and collapses whitespace.
    """
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'https?://\S+|www\.\S+', ' httpaddr ', text)
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', ' emailaddr ', text)
    text = re.sub(r'\$\d+', ' dollaramount ', text)
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text
