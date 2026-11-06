package main;

import java.util.ArrayList;
import java.util.List;

public class EmailRecord {

    private String email;
    private int spamScore;
    private String riskLevel;
    private String classification;
    private String detectedKeywords;
    private List<String> exactMatches;
    private List<String> fuzzyMatches;

    public EmailRecord(
            String email,
            int spamScore,
            String riskLevel,
            String classification,
            String detectedKeywords
    ) {
        this(email, spamScore, riskLevel, classification, detectedKeywords, new ArrayList<>(), new ArrayList<>());
    }

    public EmailRecord(
            String email,
            int spamScore,
            String riskLevel,
            String classification,
            String detectedKeywords,
            List<String> exactMatches,
            List<String> fuzzyMatches
    ) {
        this.email = email;
        this.spamScore = spamScore;
        this.riskLevel = riskLevel;
        this.classification = classification;
        this.detectedKeywords = detectedKeywords;
        this.exactMatches = exactMatches != null ? exactMatches : new ArrayList<>();
        this.fuzzyMatches = fuzzyMatches != null ? fuzzyMatches : new ArrayList<>();
    }

    public String getEmail() {
        return email;
    }

    public int getSpamScore() {
        return spamScore;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public String getClassification() {
        return classification;
    }

    public String getDetectedKeywords() {
        return detectedKeywords;
    }

    public List<String> getExactMatches() {
        return exactMatches;
    }

    public List<String> getFuzzyMatches() {
        return fuzzyMatches;
    }
}