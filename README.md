# IPV Identity Reuse Service

## Introduction

The Identity Reuse Service is an AWS services designed to meet One Login’s Tier
1 objectives by separating identity reuse journeys from IPV Core and be served
by the Identity Reuse Service instead.

The service is written using Typescript.

## Pre-requisites

You should ensure that your machine has the following installed:

- Node.js 22.x
- Git
- AWS CLI
- AWS SAM CLI

## Installing

Check out the repository and run the following:

```bash
npm ci
```

## Testing

You can run the unit tests using the following command:

```bash
npm run test
```

You can run the acceptance tests using the following command (replacing the value of `<stack-name>`):

```bash
SAM_STACK_NAME=<stack-name> npm run test:acceptance
```

## Linting

You can lint the code using the following command:

```bash
npm run lint
```

You can automatically resolve linting issues with:

```bash
npm run lint-fix
```

## Pull Requests

We use pre-commit to check code quality and check for known vulnerabilities
before code is pushed to Github. You should install pre-commit using the
following:

```bash
brew install pre-commit
pre-commit install
```

Pre-commit will run automatically before code is pushed to Github. However, you
can run pre-commit manually by running.

```bash
pre-commit
```

By default, pre-commit will only run against files that are staged. However, you
can run pre-commit against all files using:

```bash
pre-commit run --all-files
```

## Deploy to a development environment

For testing, you can deploy your code changes to a development environment.

There are two templates that make up the application:

* `/infrastructure/identity-reuse-service/template.yaml` - the main application stack, containing:
  * a public API for the OAuth 2.0 authorization endpoint and frontend endpoints, with associated logic in Lambda functions
  * a private external-facing API for the OAuth 2.0 token endpoint and protected resource, with associated logic in Lambda functions*
    (except for the token function, which lives in the stack below)
* `/infrastructure/oauth-internal/template.yaml` - internal-only OAuth "helper" stacks, containing:
  * a private internal-facing API providing some endpoints that help manage a user's OAuth session
  * a nested [ipv-cri-oauth-common](https://github.com/govuk-one-login/ipv-cri-oauth-common) stack deployed via SAR
    containing the session management logic in Lambda functions and a DynamoDB table

> **_NOTE:_**  The `oauth-internal` stack imports stack outputs from the `identity-reuse-service` stack, so there is a dependency between the two.
> This is because the audit queue lives in the latter, but the former also needs access to it.

### Deploying the main application stack

By default, the `./deploy-to-dev.sh` script deploys only `/infrastructure/identity-reuse-service/template.yaml`.

Follow these instructions to build and deploy the above AWS resources to your development environment.

1. Set your environment variables (replace with your actual values):

```sh
export AWS_PROFILE="<your_aws_profile_name>"
export STACK_NAME="<your_stack_name>"
```

2. Run the following commands:

```sh
# Login to AWS
aws sso login --profile $AWS_PROFILE

# Takes ~5 minutes to complete
./deploy-to-dev.sh -s $STACK_NAME
```

3. To verify the deployment, you can pick either one of the following options:

- Locate your Stack in CloudFormation > Stacks, from the AWS Console.
- Run the following command:

```sh
aws cloudformation describe-stacks --profile $AWS_PROFILE --stack-name $STACK_NAME
```

### Deploying the OAuth internal stack

To deploy `/infrastructure/oauth-internal/template.yaml` you need additional options when using the script.

* `-o` - add this to deploy BOTH the `identity-reuse-service` stack and the `oauth-internal` stack
* `-n` - add this (as well as `-o`) to deploy ONLY the `oauth-internal` stack
* `-m` - use this to specify the `identity-reuse-service` stack that the `oauth-internal` stack points to -
         by default it uses the one being deployed, or `preview-main` if only deploying `oauth-internal`.

```sh
# Deploy BOTH (oauth-internal points at $STACK_NAME)
./deploy-to-dev.sh -s $STACK_NAME -o

# Deploy only oauth-internal (oauth-internal points at preview-main)
./deploy-to-dev.sh -s $STACK_NAME -o -n

# Deploy only oauth-internal (oauth-internal points at $ANOTHER_SIS_STACK)
./deploy-to-dev.sh -s $STACK_NAME -o -n -m $ANOTHER_SIS_STACK
```

### Delete your stack deployment

When you have finished testing, you'll need to manually delete the stack(s) you created by adding `-d` to any of the commands:

```sh
# Takes ~5 minutes to complete
# Deletes only identity-reuse-service
./deploy-to-dev.sh -s $STACK_NAME -d

# Deletes BOTH identity-reuse-service and oauth-internal
./deploy-to-dev.sh -s $STACK_NAME -o -d

# Deletes ONLY oauth-internal
./deploy-to-dev.sh -s $STACK_NAME -o -n -d
```

## Interact with the deployed service in development

Note: This section is informative rather than instructional. These steps vary depending on what you're interacting with, and how those services are configured.

Using the User Identity lambda function as an example, here's how you might interact with it - after a successful deployment to AWS:

1. Copy the API Gateway endpoint URL from the CloudFormation stack outputs:

```sh
aws cloudformation describe-stacks --profile $AWS_PROFILE \
    --stack-name $STACK_NAME --output text \
    --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue"
```

2. Use cURL to make a request to the User Identity endpoint:

```sh
UI_LAMBDA="<https://URL_FROM_PREVIOUS_STEP>"
curl -X POST \
  --header "Authorization: Bearer ABC" \
  ${UI_LAMBDA}/user-identity \
  --data '{"foo":"bar"}'
```

3. You can browse logs through CloudWatch in AWS Console to see the output of your request, or use the AWS CLI:

```sh
aws logs tail /aws/lambda/$STACK_NAME-UserIdentityFunction \
    --follow --format json --profile $AWS_PROFILE
```
