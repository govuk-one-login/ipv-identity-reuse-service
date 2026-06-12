import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResourcePropertiesCommon,
  Context,
} from "aws-lambda";
import { FAILED, send, SUCCESS } from "cfn-response-promise";
import {
  S3Client,
  PutObjectCommand,
  ListObjectVersionsCommand,
  ListObjectVersionsCommandOutput,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { globSync } from "fast-glob";
import fs from "node:fs";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger();

const EXTENSION_MAPPINGS = new Map<string, string>([
  ["js", "text/javascript"],
  ["svg", "image/svg+xml"],
  ["css", "text/css"],
  ["json", "application/json"],
  ["ico", "image/x-icon"],
  ["png", "image/png"],
]);

interface ResourceProperties extends CloudFormationCustomResourceResourcePropertiesCommon {
  Bucket: string;
  LayerVersion: string;
}

const getContentType = (key: string): string | undefined => {
  return EXTENSION_MAPPINGS.get(key.slice(Math.max(0, key.lastIndexOf(".") + 1)));
};

const uploadResources = async (bucket: string) => {
  const baseDirectory = require.resolve("govuk-frontend").replace(/\/dist\/govuk.*/, "/dist/govuk");
  const fileList = ["govuk-frontend*.{js,css}?(.map)", "assets/**"].flatMap((pattern) =>
    globSync(pattern, { cwd: baseDirectory })
  );

  const client = new S3Client({});

  for (const key of fileList) {
    const stream = fs.createReadStream(`${baseDirectory}/${key}`);
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: stream,
      ContentType: getContentType(key),
    });

    await client.send(putCommand);

    logger.info("Updating file", { Bucket: bucket, Key: key, ContentType: getContentType(key) });
  }
};

const deleteResources = async (bucket: string) => {
  const client = new S3Client({});

  const listObjectsCommand = new ListObjectVersionsCommand({
    Bucket: bucket,
  });

  const listObjectsResponse: ListObjectVersionsCommandOutput = await client.send(listObjectsCommand);

  const objects = [...(listObjectsResponse.Versions ?? []), ...(listObjectsResponse.DeleteMarkers ?? [])].map(
    ({ Key, VersionId }) => ({ Key, VersionId })
  );

  //  doesn't throw an error if the bucket is already empty
  if (objects.length === 0) {
    return;
  }

  const deleteObjectsCommand = new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: {
      Objects: objects,
    },
  });

  await client.send(deleteObjectsCommand);
  logger.info("Deleted files", { Bucket: bucket, Keys: objects });
};

export const handler = async (
  event: CloudFormationCustomResourceEvent<ResourceProperties>,
  context: Context
): Promise<void> => {
  let response: "SUCCESS" | "FAILED" = SUCCESS;
  logger.info("Received Event", {
    RequestType: event.RequestType,
    ResourceProperties: event.ResourceProperties,
  });

  try {
    switch (event.RequestType) {
      case "Create":
      case "Update": {
        await uploadResources(event.ResourceProperties.Bucket);
        break;
      }
      case "Delete": {
        await deleteResources(event.ResourceProperties.Bucket);
        break;
      }
      default: {
        logger.error(`Request type not supported`);
        response = FAILED;
        break;
      }
    }
  } catch (error) {
    response = FAILED;
    logger.error(
      `Error whilst performing ${event.RequestType} operation`,
      error instanceof Error ? error : (error as string)
    );
    throw error;
  } finally {
    await send(event, context, response, undefined, `${event.ResourceProperties.Bucket}Sync`);
  }
};
