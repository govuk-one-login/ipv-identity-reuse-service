export const SHARED_DEV_STUB = "https://orch.reuse.dev.stubs.account.gov.uk";
export const SHARED_DEV_SIS = "https://reuse-identity.dev.account.gov.uk";

const SHARED_SIS_STACK = "preview-main";

export const sisStackName = (): string => {
  return process.env.STACK_NAME || SHARED_SIS_STACK;
};

export const sisBaseUrl = (): string => {
  const stack = sisStackName();

  if (stack === SHARED_SIS_STACK) {
    return SHARED_DEV_SIS;
  }
  return `https://${stack}.reuse-identity.dev.account.gov.uk`;
};
