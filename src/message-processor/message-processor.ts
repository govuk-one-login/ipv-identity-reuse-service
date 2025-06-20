import logger from "../utils/logger";

export const handler = async (request: any): Promise<string> => {
  logger.info(request);

  return "execution succeeded";
};
