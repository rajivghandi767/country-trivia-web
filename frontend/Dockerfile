FROM node:24-alpine

WORKDIR /trivia-frontend-dev

COPY package*.json .
RUN npm ci
COPY . .

EXPOSE 5173

CMD ["npm","run","dev"]