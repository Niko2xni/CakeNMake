// A tier contains treatment choices, never another collection of tiers.
export function flatTreatment(treatment = {}) {
  const { layerTreatments, ...choices } = treatment;
  return choices;
}

export function normalizeTreatmentConfig(config) {
  const next = { ...config };
  for (const key of ['side', 'surfaceTreatment']) {
    const section = config[key];
    if (!section) continue;
    next[key] = {
      ...flatTreatment(section),
      ...(Array.isArray(section.layerTreatments) ? {
        layerTreatments: section.layerTreatments.map(flatTreatment),
      } : {}),
    };
  }
  return next;
}
