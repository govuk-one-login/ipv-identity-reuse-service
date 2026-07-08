import { APIGatewayProxyEvent } from "aws-lambda";
import logger from "./logger";

export const getCookieValues = (event: Partial<APIGatewayProxyEvent>): Map<string, string> | undefined => {
  const lowercaseHeaders = Object.fromEntries(
    Object.entries(event.headers!).map(([key, value]) => [key.toLowerCase(), value])
  );

  const cookieHeader = lowercaseHeaders["cookie"];

  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(";");

  const cookieValues = new Map<string, string>();
  for (const element of cookies) {
    const cookie = element.trim();
    const separatorIndex = cookie.indexOf("=");
    const cookieName = cookie.slice(0, separatorIndex);
    const cookieValue = cookie.slice(separatorIndex + 1);
    try {
      const decodedCookieValue = decodeURIComponent(cookieValue!);
      cookieValues.set(cookieName, decodedCookieValue);
    } catch (error) {
      logger.error(`Error decoding cookie: ${error}`);
      return undefined;
    }
  }

  return cookieValues;
};
