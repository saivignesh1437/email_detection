package core;

import java.util.*;

public class AhoCorasick {

    static class Node {
        Map<Character, Node> children = new HashMap<>();
        Node failure;
        List<String> outputs = new ArrayList<>();
    }

    private Node root = new Node();

    // Build the Trie
    public void addPattern(String pattern) {
        Node current = root;

        for (char ch : pattern.toLowerCase().toCharArray()) {
            current = current.children.computeIfAbsent(ch, k -> new Node());
        }

        current.outputs.add(pattern);
    }

    // Build failure links
    public void build() {
        Queue<Node> queue = new LinkedList<>();

        for (Node child : root.children.values()) {
            child.failure = root;
            queue.add(child);
        }

        while (!queue.isEmpty()) {
            Node current = queue.remove();

            for (Map.Entry<Character, Node> entry : current.children.entrySet()) {

                char ch = entry.getKey();
                Node child = entry.getValue();

                Node failure = current.failure;

                while (failure != root && !failure.children.containsKey(ch)) {
                    failure = failure.failure;
                }

                if (failure.children.containsKey(ch) &&
                    failure.children.get(ch) != child) {
                    child.failure = failure.children.get(ch);
                } else {
                    child.failure = root;
                }

                child.outputs.addAll(child.failure.outputs);

                queue.add(child);
            }
        }
    }

    // Search the text
    public List<String> search(String text) {

        List<String> matches = new ArrayList<>();
        Node current = root;

        text = text.toLowerCase();

        for (char ch : text.toCharArray()) {

            while (current != root && !current.children.containsKey(ch)) {
                current = current.failure;
            }

            if (current.children.containsKey(ch)) {
                current = current.children.get(ch);
            }

            matches.addAll(current.outputs);
        }

        return matches;
    }
}