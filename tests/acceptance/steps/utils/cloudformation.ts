import {
  CloudFormationClient,
  DescribeStacksCommand,
  DescribeStacksCommandOutput,
} from "@aws-sdk/client-cloudformation";
import { getString } from "../../../../src/commons/string-utils";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";

export const CloudFormationOutputs = {
  ApiEndpoint: "ApiEndpoint",
  ApiKeyPath: "ApiKeyPath", // pragma: allowlist secret
  AppConfigApplication: "AppConfigApplication",
  AppConfigEnvironment: "AppConfigEnvironment",
  AppConfigName: "AppConfigName",
} as const;

export type CloudFormationOutputsType = keyof typeof CloudFormationOutputs;

const cloudFormationStacks: Map<string, DescribeStacksCommandOutput> = new Map();

export const getCloudFormationStack = async (stackName: string): Promise<DescribeStacksCommandOutput> => {
  let cloudFormationStack = cloudFormationStacks.get(stackName);
  if (!cloudFormationStack) {
    const client = new CloudFormationClient();
    cloudFormationStack = await client.send(
      new DescribeStacksCommand({
        StackName: process.env.SAM_STACK_NAME,
      })
    );

    cloudFormationStacks.set(stackName, cloudFormationStack);
  }
  return cloudFormationStack;
};

export const getCloudFormationParameter = async (parameter: string): Promise<string> => {
  const stackDescription = await getCloudFormationStack(process.env.SAM_STACK_NAME || "");
  const output = stackDescription.Stacks?.flatMap((stack) =>
    stack.Parameters?.filter(({ ParameterKey }) => ParameterKey === parameter)
  ).shift();

  if (!output?.ParameterValue) {
    throw new Error(`Parameter ${parameter} not found in ${process.env.SAM_STACK_NAME}`);
  }

  return output.ParameterValue;
};

export const getCloudFormationOutput = async (logicalResourceId: CloudFormationOutputsType): Promise<string> => {
  const stackDescription = await getCloudFormationStack(process.env.SAM_STACK_NAME || "");
  const output = stackDescription.Stacks?.flatMap((stack) =>
    stack.Outputs?.filter((output) => output.OutputKey === logicalResourceId)
  ).shift();

  if (!output?.OutputValue) {
    throw new Error(`Output ${logicalResourceId} not found in ${process.env.SAM_STACK_NAME}`);
  }

  return output.OutputValue;
};

export const getCloudFormationResourceSecretValue = async (
  logicalResourceId: CloudFormationOutputsType
): Promise<string> => {
  const secretPath = await getCloudFormationOutput(logicalResourceId);

  const secretValue = getString(await getSecret(secretPath));

  if (!secretValue) {
    throw new Error(`${logicalResourceId} returned invalid result`);
  }
  return secretValue;
};
