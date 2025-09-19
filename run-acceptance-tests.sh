#!/bin/bash

set -e
set -o pipefail

usage() {
  cat << EOF
This script runs internal acceptance tests against a deployed stack.

Usage:
    -a      --aws-account       The AWS account to deploy to. (optional)
    -s      --stack-name        The name of your stack.
    -d      --docker            Run the tests using Docker and the acceptance testing image
    -h      --help              Prints this help message and exits
EOF
}

RUN_WITH_DOCKER=false

while [ "$1" != "" ]; do
  case $1 in
  -a | --aws-account)
    shift
    AWS_TARGET_ACCOUNT=$1
    ;;
  -s | --stack-name)
    shift
    SAM_STACK_NAME=$1
    ;;
  -d | --docker)
    RUN_WITH_DOCKER=true
    ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    echo -e "Unknown option $1...\n"
    usage
    exit 1
    ;;
  esac
  shift
done

if [ -z "$AWS_TARGET_ACCOUNT" ]; then
  echo "Assuming you're already signed in to the target account..."
  echo
else
  echo "Using the GDS cli to sign in to aws $AWS_TARGET_ACCOUNT..."
  eval "$(gds-cli aws "$AWS_TARGET_ACCOUNT" -e)"
  echo
fi

if [ -z "$SAM_STACK_NAME" ]; then
  echo "Please specify a stack name."
  usage
  exit 1
fi

if $RUN_WITH_DOCKER; then
  docker build -t acceptance-test-runner -f tests/acceptance/Dockerfile .

  docker run -ti --rm --entrypoint "" \
    -v $PWD:/test \
    -w /test \
    -e AWS_REGION="eu-west-2" \
    -e AWS_DEFAULT_REGION="eu-west-2" \
    -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:?}" \
    -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:?}" \
    -e AWS_SESSION_TOKEN="${AWS_SESSION_TOKEN:?}" \
    -e AWS_SECURITY_TOKEN="${AWS_SECURITY_TOKEN}" \
    -e SAM_STACK_NAME="${SAM_STACK_NAME}" \
    acceptance-test-runner \
    /bin/bash -c "npm i && npm run test:acceptance -- --format html:test-reports/acceptance.html"
else
  export SAM_STACK_NAME
  export TEST_ENVIRONMENT="dev"
  npm run test:acceptance -- --format html:test-reports/acceptance.html
fi
