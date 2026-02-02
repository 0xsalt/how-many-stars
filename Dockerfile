FROM oven/bun:1-debian AS runner
WORKDIR /app

RUN groupadd --system --gid 1001 appuser && \
    useradd --system --uid 1001 --gid appuser appuser

COPY --chown=appuser:appuser src/ ./src/
COPY --chown=appuser:appuser package.json ./

USER appuser

ENV PORT=3000
ENV USE_TLS=false

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]
