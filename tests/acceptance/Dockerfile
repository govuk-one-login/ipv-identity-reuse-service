# checkov:skip=CKV_DOCKER_2: We don't need a healthcheck
FROM node:20.19.4@sha256:a6c4ae2f61d3807514fc4b152b5b37810c70e836303d361d9f84d3842534d666 AS build

COPY . /build

WORKDIR /build
RUN --mount=type=secret,id=npmrc \
    --mount=type=secret,id=node-auth-token,env=NODE_AUTH_TOKEN \
    NPM_CONFIG_USERCONFIG=/run/secrets/npmrc \
    npm ci
RUN ./node_modules/.bin/tsc

FROM node:20.19.4@sha256:a6c4ae2f61d3807514fc4b152b5b37810c70e836303d361d9f84d3842534d666
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
