FROM node:15.0.1-alpine3.12

ARG PORT=4001
ENV PORT=$PORT

WORKDIR /app

COPY package.json .
RUN npm install
COPY main.js .
COPY core ./core
COPY config ./config
# Copy ffmpeg
COPY ffmpeg ./ffmpeg

EXPOSE $PORT

CMD [ "node", "main.js" ]