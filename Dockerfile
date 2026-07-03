FROM node:22-alpine AS deps
WORKDIR /app
ARG DATABASE_URL=postgresql://user:pass@localhost:5432/db
ENV DATABASE_URL=${DATABASE_URL}
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG DATABASE_URL=postgresql://user:pass@localhost:5432/db
ENV DATABASE_URL=${DATABASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ARG DATABASE_URL=postgresql://user:pass@localhost:5432/db
ENV NODE_ENV=production
ENV DATABASE_URL=${DATABASE_URL}
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
