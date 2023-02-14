# Dockerfile

# base image
FROM node:alpine

# create and set working directory
WORKDIR /app

COPY package.json .
COPY package-lock.json .

# install dependencies
RUN npm ci

# copy source files
COPY . .

# start application
EXPOSE 8090
CMD npm start

