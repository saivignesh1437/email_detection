package core;

public class DamerauLevenshtein {

    public static int distance(String a, String b) {

        a = a.toLowerCase();
        b = b.toLowerCase();

        int m = a.length();
        int n = b.length();

        int[][] dp = new int[m + 1][n + 1];

        // Base cases
        for (int i = 0; i <= m; i++) {
            dp[i][0] = i;
        }

        for (int j = 0; j <= n; j++) {
            dp[0][j] = j;
        }

        // Dynamic Programming
        for (int i = 1; i <= m; i++) {

            for (int j = 1; j <= n; j++) {

                int cost = (a.charAt(i - 1) == b.charAt(j - 1)) ? 0 : 1;

                dp[i][j] = Math.min(
                    Math.min(
                        dp[i - 1][j] + 1,       // deletion
                        dp[i][j - 1] + 1        // insertion
                    ),
                    dp[i - 1][j - 1] + cost    // substitution
                );

                // Transposition
                if (i > 1 && j > 1 &&
                    a.charAt(i - 1) == b.charAt(j - 2) &&
                    a.charAt(i - 2) == b.charAt(j - 1)) {

                    dp[i][j] = Math.min(
                        dp[i][j],
                        dp[i - 2][j - 2] + 1
                    );
                }
            }
        }

        return dp[m][n];
    }
}