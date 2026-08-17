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
    -c      --orch-deploy       Deploy the orchestration-stub stack (optional)
    -p      --stubs-profile     The AWS profile for the stubs environment. (default = 'stubs-dev')
    -n      --no-sis-deploy     Do not deploy the identity-reuse-service stack (optional)
    -m      --shared-stack-name The name of an existing identity-reuse-shared stack that the oauth-internal can point
                                at for audit infrastructure. (optional)
    -f      --force-build       Forces a build instead of using the build cache. (optional)
    -y      --no-confirm        Don't require changes to be confirmed when deploying
    -r      --resolve-s3        Force use default SAM managed bucket when samconfig.toml is present.
    -d      --destroy           Destroy the given stack
    -h      --help              Prints this help message and exits

EOF

  return 0
}

parse_args() {
  DEPLOY_SIS=true
  DEPLOY_OAUTH=false
  DEPLOY_ORCH=false
  STUBS_PROFILE="stubs-dev"
  SHARED_STACK_NAME="reuse-identity-shared"
  RESOLVE_S3=false
  CONFIRM_CHANGES=true
  BUILD_CACHE="--cached"
  OPERATION="deploy"
  ENVIRONMENT="dev"
  AWS_PROFILE="sis-dev"
  AWS_DEFAULT_REGION=eu-west-2
  SAM_CMD=sam

  if [[ "${OSTYPE}" =~ ^msys ]]; then
    SAM_CMD=sam.cmd
  fi

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
      -c | --orch-deploy)
        DEPLOY_ORCH=true
        ;;
      -p | --stubs-profile)
        shift
        STUBS_PROFILE="${1}"
        ;;
      -n | --no-sis-deploy)
        DEPLOY_SIS=false
        ;;
      -m | --shared-stack-name)
        shift
        SHARED_STACK_NAME="${1}"
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
  elif "${DEPLOY_OAUTH}" || "${DEPLOY_ORCH}"; then
    SIS_STACK_NAME="${STACK_NAME}"
    OAUTH_STACK_NAME="${STACK_NAME}"
  else
    echo "Nothing to deploy. Using --no-sis-deploy without --oauth-deploy or --orch-deploy means I don't do anything."
    usage
    exit 1
  fi

  if "${DEPLOY_ORCH}"; then
    ORCH_STACK_NAME="${STACK_NAME}"
  fi
}

get_sis_outputs() {
  local sis_stack_name="${1}"

  echo "Fetching SIS stack outputs from stack '${sis_stack_name}' (profile: ${AWS_PROFILE})..."

  SIS_PUBLIC_API_OUTPUT=$(aws cloudformation describe-stacks \
    --stack-name "${sis_stack_name}" \
    --profile "${AWS_PROFILE}" \
    --region eu-west-2 \
    --query "Stacks[0].Outputs[?OutputKey=='SisPublicApi'].OutputValue" \
    --output text)

  if [[ -z "${SIS_PUBLIC_API_OUTPUT}" || "${SIS_PUBLIC_API_OUTPUT}" == "None" ]]; then
    echo "Error: Could not retrieve SisPublicApi output from stack '${sis_stack_name}'."
    exit 1
  fi

  SIS_PRIVATE_API_OUTPUT=$(aws cloudformation describe-stacks \
    --stack-name "${sis_stack_name}" \
    --profile "${AWS_PROFILE}" \
    --region eu-west-2 \
    --query "Stacks[0].Outputs[?OutputKey=='SisPrivateApi'].OutputValue" \
    --output text)

  if [[ -z "${SIS_PRIVATE_API_OUTPUT}" || "${SIS_PRIVATE_API_OUTPUT}" == "None" ]]; then
    echo "Error: Could not retrieve SisPrivateApi output from stack '${sis_stack_name}'."
    exit 1
  fi

  echo "SisPublicApi:  ${SIS_PUBLIC_API_OUTPUT}"
  echo "SisPrivateApi: ${SIS_PRIVATE_API_OUTPUT}"
}

resolve_bucket_param() {
  local component="${1}"
  local sam_config="infrastructure/${component}/samconfig.toml"

  if [[ -e "${sam_config}" ]] && ! "${RESOLVE_S3}"; then
    BUCKET_PARAM=("--config-file" "../../../${sam_config}")
  else
    BUCKET_PARAM=("--resolve-s3")
  fi
}

deploy() {
  local component="${1}"
  local stack_name="${2}"
  shift 2

  local template_file="infrastructure/${component}/template.yaml"
  local build_dir=".aws-sam/build/${component}"

  pushd "${BASE_DIR}"
  resolve_bucket_param "${component}"

  echo -e "\n\033[1;34m==> Deploying component '${component}' to stack '${stack_name}'\033[0m\n"

  echo "Validating ${template_file}..."
  $SAM_CMD validate \
    --template-file "${template_file}" \
    --profile "${AWS_PROFILE}"
  echo

  echo "Building ${template_file}..."
  $SAM_CMD build --parallel --beta-features "${BUILD_CACHE}" \
    --template-file "${template_file}" \
    --build-dir "${build_dir}"
  echo

  echo "Deploying ${template_file} to stack ${stack_name}..."
  $SAM_CMD deploy \
    --template-file "${build_dir}/template.yaml" \
    --stack-name "${stack_name}" \
    --s3-prefix "${stack_name}" \
    "${BUCKET_PARAM[@]}" \
    "${CONFIRM_CHANGES_PARAM}" \
    --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
    --no-fail-on-empty-changeset \
    --profile "${AWS_PROFILE}" \
    --tags DeploymentSource=Manual StackType=Dev Project="ipv-identity-reuse-service" \
    --parameter-overrides Environment="${ENVIRONMENT}" "$@"
  echo

  popd
}

destroy() {
  local component="${1}"
  local stack_name="${2}"

  pushd "${BASE_DIR}"

  echo -e "\n\033[1;31m==> Destroying component '${component}' from stack '${stack_name}'\033[0m\n"

  $SAM_CMD delete \
    --stack-name "${stack_name}" \
    --profile "${AWS_PROFILE}"
  echo

  popd
}

deploy_orch() {
  local stack_name="${1}"
  local orch_dir="${BASE_DIR}/../ipv-reuse-service-stubs/orchestration-stub"

  echo -e "\n\033[1;34m==> Deploying orchestration-stub to stack '${stack_name}' (profile: ${STUBS_PROFILE})\033[0m\n"

  pushd "${orch_dir}"

  echo "Building orchestration-stub..."
  $SAM_CMD build --parallel --beta-features ${BUILD_CACHE}
  echo

  echo "Deploying orchestration-stub to stack ${stack_name}..."
  $SAM_CMD deploy \
    --stack-name "${stack_name}" \
    --resolve-s3 \
    --s3-prefix "${stack_name}" \
    "${CONFIRM_CHANGES_PARAM}" \
    --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
    --no-fail-on-empty-changeset \
    --profile "${STUBS_PROFILE}" \
    --tags DeploymentSource=Manual StackType=Dev Project="ipv-reuse-service-stubs" \
    --parameter-overrides \
      Environment="${ENVIRONMENT}" \
      PublicAuthApiOverride="${SIS_PUBLIC_API_OUTPUT}" \
      PrivateAuthApiOverride="${SIS_PRIVATE_API_OUTPUT}"
  echo

  popd
}

destroy_orch() {
  local stack_name="${1}"

  echo -e "\n\033[1;31m==> Destroying orchestration-stub from stack '${stack_name}' (profile: ${STUBS_PROFILE})\033[0m\n"

  $SAM_CMD delete \
    --stack-name "${stack_name}" \
    --profile "${STUBS_PROFILE}"
  echo
}

parse_args "$@"

echo -e "\033[32mEnvironment:\033[0m ${ENVIRONMENT}"
echo -e "\033[32mProfile:\033[0m     ${AWS_PROFILE}"
$DEPLOY_SIS && echo -e "\033[32mDeploy identity-reuse-service to stack ${SIS_STACK_NAME}, pointing at shared stack ${SHARED_STACK_NAME}\033[0m"
$DEPLOY_OAUTH && echo -e "\033[32mDeploy oauth-internal to stack ${OAUTH_STACK_NAME}, pointing at shared stack ${SHARED_STACK_NAME}\033[0m"
$DEPLOY_ORCH && echo -e "\033[32mDeploy orchestration-stub to stack ${ORCH_STACK_NAME} (profile: ${STUBS_PROFILE})\033[0m"
echo

if [[ "${OPERATION}" == "destroy" ]]; then
  if "${DEPLOY_ORCH}"; then
    destroy_orch "${ORCH_STACK_NAME}"
  fi

  if "${DEPLOY_SIS}"; then
    destroy "identity-reuse-service" "${SIS_STACK_NAME}"
  fi

  if "${DEPLOY_OAUTH}"; then
    destroy "oauth-internal" "${OAUTH_STACK_NAME}"
  fi
else
  if "${DEPLOY_OAUTH}"; then
    OAUTH_PARAMS=("SharedStackName=${SHARED_STACK_NAME}")
    if "${DEPLOY_ORCH}"; then
      ORCH_BASE_URL="https://orch-${ORCH_STACK_NAME}.reuse.dev.stubs.account.gov.uk"
      OAUTH_PARAMS+=("OrchestrationJwksEndpointOverride=${ORCH_BASE_URL}/.well-known/jwks.json")
      OAUTH_PARAMS+=("OrchestrationRedirectURIOverride=${ORCH_BASE_URL}")
    fi
    deploy "oauth-internal" "${OAUTH_STACK_NAME}" "${OAUTH_PARAMS[@]}"
  fi

  if "${DEPLOY_SIS}"; then
    deploy "identity-reuse-service" "${SIS_STACK_NAME}" "OauthInternalStackName=${OAUTH_STACK_NAME}" "SharedStackName=${SHARED_STACK_NAME}"
  fi

  if "${DEPLOY_ORCH}"; then
    get_sis_outputs "${SIS_STACK_NAME}"
    deploy_orch "${ORCH_STACK_NAME}"
  fi
fi
