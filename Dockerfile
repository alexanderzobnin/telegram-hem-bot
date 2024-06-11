# syntax=docker/dockerfile:1

FROM node:18-alpine
WORKDIR /app
COPY . .
RUN yarn install
EXPOSE 8300
CMD ["node", "src/index.js"]
