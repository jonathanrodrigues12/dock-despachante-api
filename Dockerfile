FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist

COPY package*.json ./

RUN npm install --only=production

EXPOSE 3000

CMD ["node", "dist/main","sh", "-c", "npx typeorm migration:run -d dist/data-source.js && node dist/main"]
