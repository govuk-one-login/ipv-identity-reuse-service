export const normaliseToStartOfDay = (date: Date): Date => {
  const normalised = new Date(date);
  normalised.setUTCHours(0, 0, 0, 0);
  return normalised;
};

export const hasNbfExpired = (nbf: number, validityPeriodDays: number): boolean => {
  const nbfDate = normaliseToStartOfDay(new Date(nbf * 1000));
  const endOfValidity = nbfDate.setUTCDate(nbfDate.getUTCDate() + validityPeriodDays);
  return endOfValidity <= Date.now();
};
