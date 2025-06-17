import { CloudFormationClient, DescribeStackResourceCommand } from "@aws-sdk/client-cloudformation";
import { LambdaClient, InvokeCommand, type InvokeCommandOutput } from "@aws-sdk/client-lambda";
import { type BlobPayloadInputTypes } from "@smithy/types";

export class LambdaTestClient {
  readonly #stackName: string;

  constructor(stackName: string) {
    this.#stackName = stackName;
  }

  public async getPhysicalResourceId(resource: string): Promise<string | undefined> {
    const client = new CloudFormationClient({});

    const response = await client.send(
      new DescribeStackResourceCommand({
        StackName: this.#stackName,
        LogicalResourceId: resource,
      })
    );

    return response.StackResourceDetail?.PhysicalResourceId;
  }

  public async callLambda(physicalResourceId: string, payload?: BlobPayloadInputTypes): Promise<InvokeCommandOutput> {
    const client = new LambdaClient({});

    return await client.send(
      new InvokeCommand({
        FunctionName: physicalResourceId,
        Payload: payload,
      })
    );
  }
}
