import { getConfiguration, getServiceApiKey } from "../types/configuration";

export const getIdentityFromCredentialStore = async (authorizationToken: string): Promise<Response> => {
  const configuration = await getConfiguration();
  const apiKey = await getServiceApiKey();

  return await fetch(`${configuration.evcsApiUrl}/identity`, {
    method: "GET",
    headers: {
      Authorization: authorizationToken,
      ...(apiKey && { "x-api-key": apiKey }),
    },
  });
};

export const invalidateIdentityInCredentialStore = async (userId: string): Promise<Response> => {
  const configuration = await getConfiguration();
  const apiKey = await getServiceApiKey();

  return await fetch(`${configuration.evcsApiUrl}/identity/invalidate`, {
    method: "POST",
    body: JSON.stringify({ userId: userId }),
    headers: {
      ...(apiKey && { "x-api-key": apiKey }),
    },
  });
};
