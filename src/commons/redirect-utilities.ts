export const redirectToErrorPage = async (domainName: string) =>
  await redirect(`https://${domainName}/error/unrecoverable`);

export const redirect = async (location: string) => ({
  statusCode: 302,
  headers: {
    Location: location,
  },
  body: "",
});
