import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResourcePropertiesCommon,
  Context,
} from "aws-lambda";
import { FAILED, send, SUCCESS } from "cfn-response-promise";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsCommand,
  ListObjectsCommandOutput,
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
  return EXTENSION_MAPPINGS.get(key.substring(key.lastIndexOf(".") + 1));
};

const uploadResources = async (bucket: string) => {
  const baseDir = require.resolve("govuk-frontend").replace(/\/dist\/govuk.*/, "/dist/govuk");
  const fileList = ["govuk-frontend*.{js,css}?(.map)", "assets/**"].flatMap((pattern) =>
    globSync(pattern, { cwd: baseDir })
  );

  const client = new S3Client({});

  for (const key of fileList) {
    const stream = fs.createReadStream(`${baseDir}/${key}`);
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

  const listObjectsCommand = new ListObjectsCommand({
    Bucket: bucket,
  });

  const listObjectsResponse: ListObjectsCommandOutput = await client.send(listObjectsCommand);
  const keys = listObjectsResponse.Contents?.map((contents) => ({
    Key: contents.Key,
  }));
  const deleteObjectsCommand = new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: {
      Objects: keys,
    },
  });

  await client.send(deleteObjectsCommand);
  logger.info("Deleted files", { Bucket: bucket, Keys: keys });
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
      case "Update":
        await uploadResources(event.ResourceProperties.Bucket);
        break;
      case "Delete":
        await deleteResources(event.ResourceProperties.Bucket);
        break;
      default:
        logger.error(`Request type not supported`);
        response = FAILED;
        break;
    }
  } catch (e) {
    response = FAILED;
    logger.error(`Error whilst performing ${event.RequestType} operation`, e instanceof Error ? e : (e as string));
    throw e;
  } finally {
    await send(event, context, response, undefined, `${event.ResourceProperties.Bucket}Sync`);
  }
};
