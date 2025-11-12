#!/bin/bash

set -e
set -o pipefail

usage() {
  cat << EOF
This script deploys the Identity Reuse Service SAM template. For use in dev.

Usage:
    -s      --stack-name        The name of your stack.
    -e      --environment       Environment that the stack is being deployed to. (default = 'local')
    -f      --force-build       Forces a build instead of using the build cache. (optional)
    -y      --no-confirm        Don't require changes to be confirmed when deploying
    -r      --resolve-s3        Force use default SAM managed bucket when samconfig.toml is present.
    -d      --destroy           Destroy the given stack
    -h      --help              Prints this help message and exits

EOF

  return 0
}

RESOLVE_S3=false
CONFIRM_CHANGES=true
BUILD_CACHE="--cached"
OPERATION="deploy"
ENVIRONMENT="local"
PROFILE="sis-dev"

while [[ -n "$1" ]]; do
  case $1 in
    -s | --stack-name)
      shift
      STACK_NAME=$1
      ;;
    -e | --environment)
      shift
      ENVIRONMENT=$1
      ;;
    -r | --resolve-s3)
      RESOLVE_S3=true
      ;;
    -f | --force-build)
      BUILD_CACHE=""
      ;;
    -y | --no-confirm)
      CONFIRM_CHANGES=false
      ;;
    -d | --destroy)
      OPERATION="destroy"
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

SAM_CONFIG=$(dirname "$0")/samconfig.toml
[[ -e "$SAM_CONFIG" ]] || RESOLVE_S3=true
if $RESOLVE_S3; then
  BUCKET_PARAM=(--resolve-s3)
else
  BUCKET_PARAM=()
fi

if $CONFIRM_CHANGES; then
  CONFIRM_CHANGES_PARAM="--confirm-changeset"
else
  CONFIRM_CHANGES_PARAM="--no-confirm-changeset"
fi

if [[ -z "$STACK_NAME" ]]; then
  echo "Please specify a stack name."
  usage
  exit 1
fi

SAM_CMD=sam
if [[ "$OSTYPE" =~ ^msys ]]; then
  SAM_CMD=sam.cmd
fi

export AWS_DEFAULT_REGION=eu-west-2
echo "Environment: $ENVIRONMENT"
echo "Profile:     $PROFILE"
echo "Stack Name:  $STACK_NAME"
echo

case $OPERATION in
  deploy)
    echo "Validating template..."
    $SAM_CMD validate \
      --template-file template.yaml \
      --profile "$PROFILE"
    echo

    echo "Building template..."
    $SAM_CMD build --parallel --beta-features ${BUILD_CACHE} \
      --template-file template.yaml
    echo

    echo "Deploying stack $STACK_NAME..."
    $SAM_CMD deploy \
      --stack-name "$STACK_NAME" \
      --s3-prefix "$STACK_NAME" \
      "${BUCKET_PARAM[@]}" \
      $CONFIRM_CHANGES_PARAM \
      --capabilities CAPABILITY_NAMED_IAM \
      --no-fail-on-empty-changeset \
      --profile "$PROFILE" \
      --tags DeploymentSource=Manual StackType=Dev Project="ipv-identity-reuse-service" \
      --parameter-overrides Environment="$ENVIRONMENT"
    echo
    ;;
  destroy)
    echo "Destroying stack $STACK_NAME..."
    $SAM_CMD delete \
      --stack-name "$STACK_NAME" \
      --profile "$PROFILE"
    echo
    ;;
  *)
    echo -e "Unknown operation $1...\n"
    usage
    exit 1
    ;;
esac
