package main;

import core.AhoCorasick;
import core.DamerauLevenshtein;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EmailAnalyzer {

    private AhoCorasick ahoCorasick;

    private String[] spamPatterns = {
        "free",
        "winner",
        "win money",
        "prize",
        "lottery",
        "urgent",
        "click here",
        "claim reward"
    };

    private String[] fuzzyKeywords = {
        "free",
        "winner",
        "prize",
        "lottery",
        "urgent",
        "reward",
        "claim"
    };

    public EmailAnalyzer() {

        ahoCorasick = new AhoCorasick();

        for (String pattern : spamPatterns) {
            ahoCorasick.addPattern(pattern);
        }

        ahoCorasick.build();
    }

    public EmailRecord analyze(String subject, String body) {

        String email = subject + " " + body;

        int spamScore = 0;

        Map<String, Integer> keywordFrequency =
                new HashMap<>();

        // ==========================================
        // AHO-CORASICK EXACT MATCHING
        // ==========================================

        System.out.println("\n--- AHO-CORASICK ANALYSIS ---");

        List<String> exactMatches =
                ahoCorasick.search(email);

        for (String match : exactMatches) {

            keywordFrequency.put(
                match,
                keywordFrequency.getOrDefault(match, 0) + 1
            );

            spamScore += 2;

            System.out.println(
                "Exact match: " + match
            );
        }

        // ==========================================
        // DAMERAU-LEVENSHTEIN FUZZY MATCHING
        // ==========================================

        System.out.println("\n--- FUZZY MATCHING ---");

        List<String> fuzzyMatches = new java.util.ArrayList<>();

        String[] words =
                email.toLowerCase().split("\\s+");

        Map<String, Boolean> matchedWords =
                new HashMap<>();

        for (String match : exactMatches) {

            String[] matchWords =
                    match.toLowerCase().split("\\s+");

            for (String word : matchWords) {

                matchedWords.put(word, true);
            }
        }

        for (String word : words) {

            word = word.replaceAll(
                "[^a-zA-Z]",
                ""
            );

            if (word.isEmpty()) {
                continue;
            }

            // Already found exactly
            if (matchedWords.containsKey(word)) {
                continue;
            }

            // Ignore very short words
            if (word.length() < 4) {
                continue;
            }

            for (String suspicious : fuzzyKeywords) {

                int distance =
                        DamerauLevenshtein.distance(
                            word,
                            suspicious
                        );

                if (distance == 1) {

                    System.out.println(
                        "Fuzzy match: "
                        + word
                        + " -> "
                        + suspicious
                    );

                    fuzzyMatches.add(word + "->" + suspicious);

                    keywordFrequency.put(
                        suspicious,
                        keywordFrequency.getOrDefault(
                            suspicious,
                            0
                        ) + 1
                    );

                    spamScore += 1;

                    break;
                }
            }
        }

        // ==========================================
        // KEYWORD FREQUENCY
        // ==========================================

        System.out.println(
            "\n--- KEYWORD FREQUENCY ---"
        );

        for (
            Map.Entry<String, Integer> entry
            : keywordFrequency.entrySet()
        ) {

            System.out.println(
                entry.getKey()
                + " -> "
                + entry.getValue()
            );
        }

        // ==========================================
        // RISK LEVEL
        // ==========================================

        String riskLevel;
        String classification;

        if (spamScore >= 7) {

            riskLevel = "HIGH";
            classification = "SPAM";

        } else if (spamScore >= 3) {

            riskLevel = "MEDIUM";
            classification = "SPAM";

        } else {

            riskLevel = "LOW";
            classification = "NOT SPAM";
        }

        // ==========================================
        // DETECTED KEYWORDS
        // ==========================================

        StringBuilder detectedKeywords =
                new StringBuilder();

        for (String keyword : keywordFrequency.keySet()) {

            if (detectedKeywords.length() > 0) {
                detectedKeywords.append(", ");
            }

            detectedKeywords.append(keyword);
        }

        // ==========================================
        // RETURN RESULT
        // ==========================================

        return new EmailRecord(
            email,
            spamScore,
            riskLevel,
            classification,
            detectedKeywords.toString(),
            exactMatches,
            fuzzyMatches
        );
    }
}