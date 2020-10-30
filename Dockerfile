FROM node:latest

ARG PORT=4001
ENV PORT=$PORT

WORKDIR /app

# Install ffmpeg
#COPY ffmpeg_setup.sh /app
#RUN /app/ffmpeg_setup.sh

COPY package.json .
RUN npm install
COPY main.js .
COPY core ./core
COPY config ./config

EXPOSE $PORT

CMD [ "node", "main.js" ]