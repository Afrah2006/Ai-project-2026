# Nurse scheduling site: Next.js UI + Python optimizer (runner.py)
FROM node:20-bookworm AS builder

WORKDIR /app
COPY . .

WORKDIR /app/website
RUN npm ci
RUN npm run build

FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && python3 --version

WORKDIR /app
COPY --from=builder /app /app

WORKDIR /app/website

ENV NODE_ENV=production
ENV PYTHON_EXECUTABLE=python3
ENV HOSTNAME=0.0.0.0
# Render sets PORT at runtime (often 10000). Next.js reads PORT automatically.
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start:host"]
