# checkov:skip=CKV_DOCKER_2: We don't need a healthcheck
# checkov:skip=CKV_DOCKER_3: We don't need a user
# checkov:skip=CKV_DOCKER_7: We want to keep up to speed with the latest test image
FROM node:20.19.4@sha256:a6c4ae2f61d3807514fc4b152b5b37810c70e836303d361d9f84d3842534d666 AS build

COPY . /build

WORKDIR /build
RUN --mount=type=secret,id=npmrc NPM_CONFIG_USERCONFIG=/run/secrets/npmrc npm ci
RUN ./node_modules/.bin/tsc

FROM node:20.19.4@sha256:a6c4ae2f61d3807514fc4b152b5b37810c70e836303d361d9f84d3842534d666

# checkov:skip=CKV_DOCKER_9: We need to install awscli
RUN apt update && apt-get install awscli -y

WORKDIR /app
COPY --from=build /build/dist/ /app/dist/
COPY --from=build /build/tests/acceptance/features /app/features
COPY --from=build /build/tests/acceptance/run-tests.sh /
COPY --from=build /build/node_modules /app/node_modules

ENTRYPOINT [ "/run-tests.sh" ]
