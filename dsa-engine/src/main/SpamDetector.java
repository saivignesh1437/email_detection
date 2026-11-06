package main;

import java.util.PriorityQueue;
import java.util.Scanner;

public class SpamDetector {

    public static void main(String[] args) {

        Scanner scanner = new Scanner(System.in);

        // ==========================================
        // DSA COMPONENT
        // ==========================================

        EmailAnalyzer analyzer =
                new EmailAnalyzer();

        // ==========================================
        // PRIORITY QUEUE
        // Max-heap:
        // highest spam score comes first
        // ==========================================

        PriorityQueue<EmailRecord> riskQueue =
                new PriorityQueue<>(
                    (a, b) -> Integer.compare(
                        b.getSpamScore(),
                        a.getSpamScore()
                    )
                );

        char choice;

        // ==========================================
        // MAIN LOOP
        // ==========================================

        do {

            System.out.println(
                "\n================================="
            );

            System.out.println(
                "       EMAIL SPAM DETECTOR"
            );

            System.out.println(
                "================================="
            );

            // --------------------------------------
            // INPUT
            // --------------------------------------

            System.out.print(
                "Enter email subject: "
            );

            String subject =
                    scanner.nextLine();

            System.out.print(
                "Enter email body: "
            );

            String body =
                    scanner.nextLine();

            // ======================================
            // DSA ANALYSIS
            // ======================================

            EmailRecord record =
                    analyzer.analyze(
                        subject,
                        body
                    );

            // ======================================
            // FINAL RESULT
            // ======================================

            System.out.println(
                "\n================================="
            );

            System.out.println(
                "          FINAL RESULT"
            );

            System.out.println(
                "================================="
            );

            System.out.println(
                "Spam Score: "
                + record.getSpamScore()
            );

            System.out.println(
                "Risk Level: "
                + record.getRiskLevel()
            );

            System.out.println(
                "Classification: "
                + record.getClassification()
            );

            System.out.println(
                "Detected Keywords: "
                + record.getDetectedKeywords()
            );

            System.out.println(
                "================================="
            );

            // ======================================
            // ADD TO PRIORITY QUEUE
            // ======================================

            riskQueue.add(record);

            // ======================================
            // ANOTHER EMAIL?
            // ======================================

            System.out.print(
                "\nPress Y to analyze another email "
                + "or N to exit: "
            );

            String input =
                    scanner.nextLine();

            if (input.isEmpty()) {

                choice = 'n';

            } else {

                choice =
                    input.toLowerCase().charAt(0);
            }

        } while (choice == 'y');

        // ==========================================
        // PRIORITY QUEUE
        // ==========================================

        System.out.println(
            "\n================================="
        );

        System.out.println(
            "       EMAIL RISK RANKING"
        );

        System.out.println(
            "================================="
        );

        while (!riskQueue.isEmpty()) {

            EmailRecord record =
                    riskQueue.poll();

            System.out.println(
                "Score: "
                + record.getSpamScore()
                + " | Risk: "
                + record.getRiskLevel()
                + " | "
                + record.getClassification()
                + " | "
                + record.getEmail()
            );
        }

        // ==========================================
        // END
        // ==========================================

        System.out.println(
            "\nThank you for using Email Spam Detector!"
        );

        scanner.close();
    }
}