FROM node:12.16.2-alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8080
CMD [ "npm", "start" ]
