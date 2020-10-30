FROM node:10.5.0

# Install ffmpeg
RUN set -x \
    && add-apt-repository ppa:mc3man/trusty-media \
    && apt-get update \
    && apt-get dist-upgrade \
    && apt-get install -y --no-install-recommends \
        ffmpeg

ARG PORT
ENV PORT=$PORT

WORKDIR /app
COPY package.json .
RUN npm install
COPY main.js .
COPY core ./core
COPY config ./config

EXPOSE $PORT

CMD [ "node", "main.js" ]