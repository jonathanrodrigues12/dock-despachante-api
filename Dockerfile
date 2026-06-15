FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run test

RUN npm run build

FROM node:20-alpine

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist

COPY package*.json ./

RUN npm install --omit=dev --legacy-peer-deps

EXPOSE 3333

CMD ["node", "dist/main"]
