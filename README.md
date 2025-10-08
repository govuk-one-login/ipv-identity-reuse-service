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

### Instructions

Follow these instructions to build and deploy the lambda functions to your development environment.

1. Set your environment variables (replace with your actual values):

```sh
export AWS_PROFILE="your_aws_profile_name"
export STACK_NAME="your_stack_name"
```

2. Run the following commands:

```sh
# Login to AWS
aws sso login --profile $AWS_PROFILE

# Build the lambda functions locally
sam build --parallel

# Deploy the lambda functions to your development environment
sam deploy --profile $AWS_PROFILE --stack-name $STACK_NAME
```

3. To verify the deployment, you can pick either one of the following options:

- Locate your Stack in CloudFormation > Stacks, from the AWS Console.
- Run the following command:

```sh
aws cloudformation describe-stacks --profile $AWS_PROFILE --stack-name $STACK_NAME
```

### Delete your stack deployment

When you are done testing, you'll need to manually delete the stack you created:

```sh
sam delete --stack-name $STACK_NAME
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
UI_LAMBDA="https://URL_FROM_PREVIOUS_STEP"
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
