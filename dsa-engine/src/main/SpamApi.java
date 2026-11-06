package main;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class SpamApi {

    private static final EmailAnalyzer analyzer =
            new EmailAnalyzer();

    public static void main(String[] args) throws Exception {

        String host = System.getenv("DSA_HOST");
        if (host == null || host.trim().isEmpty()) {
            host = System.getenv("HOST");
        }
        if (host == null || host.trim().isEmpty()) {
            host = "0.0.0.0";
        }

        int port = 8080;
        String portEnv = System.getenv("PORT");
        if (portEnv == null || portEnv.trim().isEmpty()) {
            portEnv = System.getenv("DSA_PORT");
        }
        if (portEnv != null && !portEnv.trim().isEmpty()) {
            try {
                port = Integer.parseInt(portEnv.trim());
            } catch (NumberFormatException e) {
                System.err.println("Invalid port specified in environment ('" + portEnv + "'). Falling back to 8080.");
                port = 8080;
            }
        }

        HttpServer server = HttpServer.create(
                new InetSocketAddress(host, port),
                0
        );

        server.createContext(
                "/health",
                SpamApi::health
        );

        server.createContext(
                "/analyze",
                SpamApi::analyze
        );

        server.start();

        System.out.println(
                "Spam API running at http://" + host + ":" + port
        );
    }

    private static void health(
            HttpExchange exchange
    ) throws IOException {
        sendResponse(
                exchange,
                200,
                "{\"status\":\"online\",\"engine\":\"Java DSA Spam Engine\"}"
        );
    }

    private static void analyze(
            HttpExchange exchange
    ) throws IOException {

        // ==========================================
        // CORS
        // ==========================================

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Origin",
                "*"
        );

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Methods",
                "POST, OPTIONS"
        );

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Headers",
                "Content-Type"
        );

        // ==========================================
        // HANDLE OPTIONS REQUEST
        // ==========================================

        if (exchange.getRequestMethod()
                .equalsIgnoreCase("OPTIONS")) {

            exchange.sendResponseHeaders(
                    204,
                    -1
            );

            exchange.close();

            return;
        }

        // ==========================================
        // ONLY POST ALLOWED
        // ==========================================

        if (!exchange.getRequestMethod()
                .equalsIgnoreCase("POST")) {

            sendResponse(
                    exchange,
                    405,
                    "{\"error\":\"POST method required\"}"
            );

            return;
        }

        // ==========================================
        // READ REQUEST
        // ==========================================

        String request = new String(
                exchange.getRequestBody().readAllBytes(),
                StandardCharsets.UTF_8
        );

        // ==========================================
        // EXTRACT SUBJECT AND BODY
        // ==========================================

        String subject =
                extractValue(request, "subject");

        String body =
                extractValue(request, "body");

        // ==========================================
        // REAL EMAIL ANALYSIS
        // ==========================================

        EmailRecord record =
                analyzer.analyze(
                        subject,
                        body
                );

        // ==========================================
        // CONVERT RESULT TO JSON
        // ==========================================

        String keywords =
                record.getDetectedKeywords();

        StringBuilder keywordJson =
                new StringBuilder();

        if (!keywords.isEmpty()) {

            String[] keywordArray =
                    keywords.split(",");

            for (String keyword : keywordArray) {

                if (keywordJson.length() > 0) {
                    keywordJson.append(",");
                }

                keywordJson.append("\"")
                        .append(
                            escapeJson(
                                keyword.trim()
                            )
                        )
                        .append("\"");
            }
        }

        StringBuilder exactJson = new StringBuilder();
        for (String em : record.getExactMatches()) {
            if (exactJson.length() > 0) {
                exactJson.append(",");
            }
            exactJson.append("\"").append(escapeJson(em)).append("\"");
        }

        StringBuilder fuzzyJson = new StringBuilder();
        for (String fm : record.getFuzzyMatches()) {
            if (fuzzyJson.length() > 0) {
                fuzzyJson.append(",");
            }
            fuzzyJson.append("\"").append(escapeJson(fm)).append("\"");
        }

        String response =
                "{"
                + "\"score\":"
                + record.getSpamScore()
                + ","
                + "\"risk\":\""
                + escapeJson(
                    record.getRiskLevel()
                  )
                + "\","
                + "\"classification\":\""
                + escapeJson(
                    record.getClassification()
                  )
                + "\","
                + "\"keywords\":["
                + keywordJson
                + "],"
                + "\"exact_matches\":["
                + exactJson
                + "],"
                + "\"fuzzy_matches\":["
                + fuzzyJson
                + "]"
                + "}";

        sendResponse(
                exchange,
                200,
                response
        );
    }

    // ==========================================
    // SIMPLE JSON VALUE EXTRACTION
    // ==========================================

    private static String extractValue(
            String json,
            String key
    ) {
        // Match key with or without whitespace around colon
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                "\"" + java.util.regex.Pattern.quote(key) + "\"\\s*:\\s*\""
        );
        java.util.regex.Matcher matcher = pattern.matcher(json);
        if (!matcher.find()) {
            return "";
        }

        int start = matcher.end();
        StringBuilder value = new StringBuilder();
        boolean escaped = false;


        for (int i = start; i < json.length(); i++) {

            char current =
                    json.charAt(i);

            if (escaped) {

                if (current == 'n') {
                    value.append('\n');
                } else if (current == 'r') {
                    value.append('\r');
                } else if (current == 't') {
                    value.append('\t');
                } else {
                    value.append(current);
                }

                escaped = false;

            } else if (current == '\\') {

                escaped = true;

            } else if (current == '"') {

                break;

            } else {

                value.append(current);
            }
        }

        return value.toString();
    }

    // ==========================================
    // ESCAPE JSON
    // ==========================================

    private static String escapeJson(
            String text
    ) {

        return text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    // ==========================================
    // SEND HTTP RESPONSE
    // ==========================================

    private static void sendResponse(
            HttpExchange exchange,
            int status,
            String response
    ) throws IOException {

        byte[] responseBytes =
                response.getBytes(
                    StandardCharsets.UTF_8
                );

        exchange.getResponseHeaders().set(
                "Content-Type",
                "application/json"
        );

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Origin",
                "*"
        );

        exchange.sendResponseHeaders(
                status,
                responseBytes.length
        );

        try (
            OutputStream output =
                    exchange.getResponseBody()
        ) {

            output.write(responseBytes);
        }
    }
}