#!/bin/bash

set -e
set -o pipefail
BASE_DIR="$(dirname "${0}")"

usage() {
  cat << EOF
This script deploys the Identity Reuse Service SAM template. For use in dev.

Usage:
    -a      --aws-profile       The AWS profile to deploy to. (optional)
    -s      --stack-name        The name of the stack to deploy.
    -e      --environment       Environment that the stack is being deployed to. (default = 'local')
    -o      --oauth-deploy      Deploy the oauth-internal stack (optional)
    -n      --no-sis-deploy     Do not deploy the identity-reuse-service stack (optional)
    -m      --sis-stack-name    The name of an existing identity-reuse-service stack that the oauth-internal can point
                                at for audit infrastructure and only relevant if not deploying a fresh
                                identity-reuse-service stack. (optional)
    -f      --force-build       Forces a build instead of using the build cache. (optional)
    -y      --no-confirm        Don't require changes to be confirmed when deploying
    -r      --resolve-s3        Force use default SAM managed bucket when samconfig.toml is present.
    -d      --destroy           Destroy the given stack
    -h      --help              Prints this help message and exits

EOF

  return 0
}

deploy_or_destroy() {
  pushd "${BASE_DIR}"

  TEMPLATE_FILE="infrastructure/${1}/template.yaml"
  BUILD_DIR=".aws-sam/build/${1}"
  shift
  STACK_NAME=${1}
  shift

  SAM_CONFIG="infrastructure/${1}/samconfig.toml"
  [[ -e "${SAM_CONFIG}" ]] || RESOLVE_S3=true
  if "${RESOLVE_S3}"; then
    BUCKET_PARAM=("--resolve-s3")
  else
    BUCKET_PARAM=("--config-file" "../../../$SAM_CONFIG")
  fi

  case $OPERATION in
    deploy)
      echo "Validating ${TEMPLATE_FILE}..."
      $SAM_CMD validate \
        --template-file "${TEMPLATE_FILE}" \
        --profile "${AWS_PROFILE}"
      echo

      echo "Building ${TEMPLATE_FILE}..."
      $SAM_CMD build --parallel --beta-features "${BUILD_CACHE}" \
        --template-file "${TEMPLATE_FILE}" \
        --build-dir "${BUILD_DIR}"
      echo

      echo "Deploying ${TEMPLATE_FILE} to stack ${STACK_NAME}..."
      $SAM_CMD deploy \
        --template-file "${BUILD_DIR}/template.yaml" \
        --stack-name "${STACK_NAME}" \
        --s3-prefix "${STACK_NAME}" \
        "${BUCKET_PARAM[@]}" \
        "${CONFIRM_CHANGES_PARAM}" \
        --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
        --no-fail-on-empty-changeset \
        --profile "${AWS_PROFILE}" \
        --tags DeploymentSource=Manual StackType=Dev Project="ipv-identity-reuse-service" \
        --parameter-overrides Environment="${ENVIRONMENT}" "$@"
      echo
      ;;
    destroy)
      echo "Destroying stack ${STACK_NAME}..."
      $SAM_CMD delete \
        --stack-name "${STACK_NAME}" \
        --profile "${AWS_PROFILE}"
      echo
      ;;
    *)
      popd
      echo -e "Unknown operation ${OPERATION}...\n"
      usage
      exit 1
      ;;
  esac
  popd
}

DEPLOY_SIS=true
DEPLOY_OAUTH=false
SIS_STACK_NAME="preview-main"
RESOLVE_S3=false
CONFIRM_CHANGES=true
BUILD_CACHE="--cached"
OPERATION="deploy"
ENVIRONMENT="local"
AWS_PROFILE="sis-dev"

while [[ -n "${1}" ]]; do
  case "${1}" in
    -a | --aws-profile)
      shift
      export AWS_PROFILE="${1}"
      ;;
    -s | --stack-name)
      shift
      STACK_NAME="${1}"
      ;;
    -e | --environment)
      shift
      ENVIRONMENT="${1}"
      ;;
    -o | --oauth-deploy)
      DEPLOY_OAUTH=true
      ;;
    -n | --no-sis-deploy)
      DEPLOY_SIS=false
      ;;
    -m | --sis-stack-name)
      shift
      SIS_STACK_NAME="${1}"
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
      echo -e "Unknown option ${1}...\n"
      usage
      exit 1
      ;;
  esac
  shift
done

if "${CONFIRM_CHANGES}"; then
  CONFIRM_CHANGES_PARAM="--confirm-changeset"
else
  CONFIRM_CHANGES_PARAM="--no-confirm-changeset"
fi

if [[ -z "${STACK_NAME}" ]]; then
  echo "Please specify a stack name."
  usage
  exit 1
fi

if "${DEPLOY_SIS}"; then
    SIS_STACK_NAME="${STACK_NAME}"
    if "${DEPLOY_OAUTH}"; then
        OAUTH_STACK_NAME="${STACK_NAME}-oauth"
    else
        OAUTH_STACK_NAME="preview-main-oauth"
    fi
elif "${DEPLOY_OAUTH}"; then
  OAUTH_STACK_NAME="${STACK_NAME}"
else
  echo "Nothing to deploy. Using --no-sis-deploy without --oauth-deploy means I don't do anything."
  usage
  exit 1
fi

SAM_CMD=sam
if [[ "${OSTYPE}" =~ ^msys ]]; then
  SAM_CMD=sam.cmd
fi

export AWS_DEFAULT_REGION=eu-west-2
echo "Environment: ${ENVIRONMENT}"
echo "Profile:     ${AWS_PROFILE}"
$DEPLOY_SIS && echo "Deploy identity-reuse-service to stack ${SIS_STACK_NAME}"
$DEPLOY_OAUTH && echo "Deploy oauth-internal to stack ${OAUTH_STACK_NAME}, pointing at identity-reuse-service stack ${SIS_STACK_NAME}"
echo

if $DEPLOY_SIS; then
  deploy_or_destroy "identity-reuse-service" "${SIS_STACK_NAME}" "OauthInternalStackName=${OAUTH_STACK_NAME}"
fi
if $DEPLOY_OAUTH; then
  deploy_or_destroy "oauth-internal" "${OAUTH_STACK_NAME}" "SisStackName=${SIS_STACK_NAME}"
fi
