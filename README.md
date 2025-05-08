# IPV Identity Reuse Service

## Introduction

The Identity Reuse Service is an AWS services designed to meet One Login’s Tier
1 objectives by separating identity reuse journeys from IPV Core and be served
by the Identity Reuse Service instead.

The service is written using Typescript.

## Pre-requisites

You should ensure that your machine has the following installed:
* Node.js 22.x
* Git
* AWS CLI
* AWS SAM CLI

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
