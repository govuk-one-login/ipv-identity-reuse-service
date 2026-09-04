import { CloudFormationOutputs, getCloudFormationOutput, SHARED_SIS_STACK } from "../../shared/utils/cloudformation";

export const SHARED_DEV_STUB = "https://orch.reuse.dev.stubs.account.gov.uk";
export const SHARED_DEV_SIS = "https://reuse-identity.dev.account.gov.uk";

export const sisStackName = (): string => {
  return process.env.SAM_STACK_NAME || SHARED_SIS_STACK;
};

export const sisBaseUrl = async (): Promise<string> => {
  return await getCloudFormationOutput(CloudFormationOutputs.SisPublicApi);
};

export const sisPrivateApiUrl = async (): Promise<string> => {
  return await getCloudFormationOutput(CloudFormationOutputs.SisPrivateApi);
};
