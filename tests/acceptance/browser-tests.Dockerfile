FROM node:22.14.0@sha256:e5ddf893cc6aeab0e5126e4edae35aa43893e2836d1d246140167ccc2616f5d7
ARG USER=testrunner
ARG BUILD_DATE
ARG COMMIT_SHA
ARG GIT_REPO

LABEL BUILD_DATE=${BUILD_DATE}
LABEL COMMIT_SHA=${COMMIT_SHA}
LABEL GIT_REPO=${GIT_REPO}

RUN apt-get update \
 && apt-get install awscli -y \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN useradd $USER -b /app \
 && chown -R $USER /app

COPY --chown=$USER /tests/acceptance/browser/ /app/tests/acceptance/browser/
COPY --chown=$USER /tests/acceptance/shared/ /app/tests/acceptance/shared/
COPY --chown=$USER /src/commons/ /app/src/commons/
COPY --chown=$USER /shared-test/ /app/shared-test/
COPY --chown=$USER /package.json /app/
COPY --chown=$USER /package-lock.json /app/
COPY --chown=$USER /playwright.config.ts /app/
COPY --chown=$USER /tsconfig.json /app/
COPY /tests/acceptance/browser-tests.run-tests.sh /run-tests.sh

RUN --mount=type=secret,id=npmrc \
    --mount=type=secret,id=node-auth-token,env=NODE_AUTH_TOKEN \
    NPM_CONFIG_USERCONFIG=/run/secrets/npmrc \
    npm ci

RUN node_modules/.bin/playwright install-deps chromium

USER $USER

ENV TEST_SRC_DIR=/app/tests/acceptance
ENTRYPOINT [ "/run-tests.sh" ]
