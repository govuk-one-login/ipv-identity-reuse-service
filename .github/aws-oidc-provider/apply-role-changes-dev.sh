#!/usr/bin/env bash
set -eu

template="$(dirname "${BASH_SOURCE[0]}")/gha-aws-oidc-provider-template.yaml"
provider_arn=$(aws iam list-open-id-connect-providers | jq -r '.OpenIDConnectProviderList[].Arn' | grep token.actions.githubusercontent.com || true)

sam deploy \
  --stack-name github-actions-oidc-provider \
  --template-file "$template" \
  --confirm-changeset --disable-rollback \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides GitHubOrg=govuk-one-login RepositoryName=ipv-identity-reuse-service ${provider_arn:+OIDCProviderArn=$provider_arn}
