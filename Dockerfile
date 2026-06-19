# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx svelte-kit sync && npm run build

# Stage 2: Production
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/build ./build

EXPOSE 3000
VOLUME ["/data"]
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "build/index.js"]
