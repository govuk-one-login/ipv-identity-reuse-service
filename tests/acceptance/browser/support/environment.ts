import { CloudFormationOutputs, getCloudFormationOutput, SHARED_SIS_STACK } from "../../shared/utils/cloudformation.js";

export const sisStackName = (): string => {
  return process.env.SAM_STACK_NAME || SHARED_SIS_STACK;
};

export const sisBaseUrl = async (): Promise<string> => {
  return await getCloudFormationOutput(CloudFormationOutputs.SisPublicApi);
};

export const sisPrivateApiUrl = async (): Promise<string> => {
  return await getCloudFormationOutput(CloudFormationOutputs.SisPrivateApi);
};
