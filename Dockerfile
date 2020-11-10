FROM node:15.0.1-alpine3.12

RUN apk add  --no-cache ffmpeg

ARG RTMPPORT=1935
ENV RTMPPORT=$RTMPPORT
ARG HTTPPORT=8000
ENV HTTPPORT=$HTTPPORT

WORKDIR /app

COPY package.json .
RUN npm install
COPY main.js .
COPY core ./core
COPY config ./config
# Copy ffmpeg
COPY ffmpeg ./ffmpeg

EXPOSE $RTMPPORT
EXPOSE $HTTPPORT

CMD [ "node", "main.js" ]