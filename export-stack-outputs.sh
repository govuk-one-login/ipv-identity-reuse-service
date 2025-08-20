#!/bin/bash

set -e
set -o pipefail

echoerr() { echo "$@" 1>&2; }

usage() {
  cat << 'EOF' >&2
This script provides export for. For use in dev.

Usage: eval "$(./export-stack-outputs.sh --stack-name <stack>)"

Options:
    -a      --aws-account       The AWS account to deploy to. (optional)
    -s      --stack-name        The name of your stack.
    -q      --quiet             Print minimal messages
    -h      --help              Prints this help message and exits
EOF
}

QUIET=false

while [ "$1" != "" ]; do
  case $1 in
  -a | --aws-account)
    shift
    AWS_TARGET_ACCOUNT=$1
    ;;
  -s | --stack-name)
    shift
    STACK_NAME=$1
    ;;
  -q | --quiet)
    QUIET=true
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
  if ! $QUIET; then
    echoerr "Assuming you're already signed in to the target account..."
    echoerr
  fi
else
  echoerr "Using the GDS cli to sign in to aws $AWS_TARGET_ACCOUNT..."
  eval "$(gds-cli aws "$AWS_TARGET_ACCOUNT" -e)"
  echoerr
fi

if [ -z "$STACK_NAME" ]; then
  echoerr "Please specify a stack name."
  usage
  exit 1
fi

STACKS_JSON=$(aws cloudformation describe-stacks --region eu-west-2 --stack-name "$STACK_NAME")
STACK_OUTPUTS_JSON=$(echo "$STACKS_JSON" | jq ".Stacks[0].Outputs")

for idx in $(echo "$STACK_OUTPUTS_JSON" | jq 'keys | .[]' | tr -d '\r'); do
  OUTPUT_KEY=$(echo "$STACK_OUTPUTS_JSON" | jq -r ".[$idx].OutputKey" | tr -d '\r')
  OUTPUT_VALUE=$(echo "$STACK_OUTPUTS_JSON" | jq -r ".[$idx].OutputValue" | tr -d '\r')
  ENV_VAR_NAME="CFN_$OUTPUT_KEY"
  echo "export $ENV_VAR_NAME=\"$OUTPUT_VALUE\""
done
