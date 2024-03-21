FROM docker.io/node:lts-alpine
LABEL maintainer Lyas Spiehler

RUN apk add --no-cache --upgrade git

RUN mkdir -p /var/node

WORKDIR /var/node

RUN git clone https://github.com/lspiehler/node-mysql-rest-api.git

WORKDIR /var/node/node-mysql-rest-api

RUN npm install

EXPOSE 3000/tcp

CMD ["npm", "start"]