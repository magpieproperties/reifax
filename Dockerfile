FROM node:8-slim

LABEL maintainer="Mike Schulte <kornarmy@gmail.com>"

# install chrome rather than relying on Puppeteer 
RUN apt-get update && apt-get install -y wget --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge --auto-remove -y curl \
    && rm -rf /src/*.deb

#ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
#RUN yarn global add puppeteer@1.7.0 && yarn cache clean

#ENV NODE_PATH="/usr/local/share/.config/yarn/global/node_modules:${NODE_PATH}"

#ENV PATH="/tools:${PATH}"

# copy project files and install dependencies
RUN mkdir -p /var/app
WORKDIR /var/app
COPY . /var/app/
RUN npm install

RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /var/app
USER pptruser


ENTRYPOINT ["node", "server.js"]
#CMD ["yarn", "start"]