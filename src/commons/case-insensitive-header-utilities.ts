export const getProperty = <T extends Record<string, unknown>>(object: T, property: string): string | undefined => {
  const propertyLowerCase = property.toLowerCase();
  const foundKey = Object.keys(object).find((k) => k.toLowerCase() === propertyLowerCase);
  return foundKey && typeof object[foundKey] === "string" ? object[foundKey] : undefined;
};
