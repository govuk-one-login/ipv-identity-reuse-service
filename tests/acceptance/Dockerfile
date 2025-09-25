# checkov:skip=CKV_DOCKER_2: We don't need a healthcheck
FROM node:22.14.0@sha256:e5ddf893cc6aeab0e5126e4edae35aa43893e2836d1d246140167ccc2616f5d7 AS build

COPY . /build

WORKDIR /build
RUN --mount=type=secret,id=npmrc \
    --mount=type=secret,id=node-auth-token,env=NODE_AUTH_TOKEN \
    NPM_CONFIG_USERCONFIG=/run/secrets/npmrc \
    npm ci
RUN ./node_modules/.bin/tsc

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
RUN useradd $USER \
 && chown -R $USER /app

COPY --from=build --chown=$USER /build/dist/ /app/dist/
COPY --from=build --chown=$USER /build/tests/acceptance/features /app/features
COPY --from=build --chown=$USER /build/tests/acceptance/run-tests.sh /
COPY --from=build --chown=$USER /build/node_modules /app/node_modules

USER $USER
ENTRYPOINT [ "/run-tests.sh" ]
