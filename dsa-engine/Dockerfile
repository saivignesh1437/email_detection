# ==============================================================================
# Java DSA Spam Detection Engine Dockerfile
# Standalone high-performance service utilizing Aho-Corasick & Damerau-Levenshtein
# ==============================================================================

# --- Stage 1: Build & Compilation ---
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy sources (compatible with build context at dsa-engine or repo root)
COPY . .
RUN if [ -d "src" ]; then \
      mkdir -p out && javac -d out $(find src -name "*.java"); \
    elif [ -d "dsa-engine/src" ]; then \
      mkdir -p out && javac -d out $(find dsa-engine/src -name "*.java"); \
    else \
      echo "[ERROR] No Java source files found for compilation" && exit 1; \
    fi

# --- Stage 2: Minimal Production JRE Runtime ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy compiled classes from builder stage
COPY --from=builder /app/out ./out

# Defaults for local use; Render overrides PORT for the public web service.
ENV PORT=8080
ENV DSA_HOST=0.0.0.0

EXPOSE 10000

ENTRYPOINT ["java", "-cp", "out", "main.SpamApi"]
