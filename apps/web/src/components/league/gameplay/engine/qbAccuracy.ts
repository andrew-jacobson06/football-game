export const THROW_TYPES = ["Perfect", "Accurate", "Close", "Catchable", "Off Target"] as const;
export type ThrowType = typeof THROW_TYPES[number];
export type AccuracyModRow = { throwType: ThrowType; min: number; max: number };

export function getThrowTypeChances(accuracy: number) {
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100)
    throw new Error("QB accuracy must be between 0 and 100.");
  const x = accuracy;
  const raw = [
    0.000000001291163967683*x**5 - 0.0000003472208462028*x**4 + 0.000033872231148*x**3 - 0.001387942688902*x**2 + 0.022849387551973*x,
    -3.351596126617e-12*x**5 + 0.00000003731998162211*x**4 - 0.000007419858259*x**3 + 0.000457999980141*x**2 - 0.006994403587507*x + 0.2,
    -0.000000001692996339958*x**5 + 0.0000004068162888524*x**4 - 0.000033400764649*x**3 + 0.001010032102114*x**2 - 0.008070502465329*x + 0.45,
    0.0000000007342493713593*x**5 - 0.0000002070052567261*x**4 + 0.000020836504392*x**3 - 0.000853179527636*x**2 + 0.008854313921555*x + 0.25,
    0.0000000004101353362437*x**5 - 0.0000001183231959587*x**4 + 0.000012050441306*x**3 - 0.000506244585052*x**2 + 0.006413179631283*x + 0.1,
  ];
  const weights = raw.map((chance) => Math.max(0, chance));
  const total = weights.reduce((sum, chance) => sum + chance, 0);
  let cumulative = 0;
  return THROW_TYPES.map((throwType, index) => {
    const chancePct = weights[index] / total * 100;
    cumulative += chancePct;
    return { throwType, rawChance: raw[index], chancePct,
      threshold: index === THROW_TYPES.length - 1 ? 100 : cumulative };
  });
}

/** Roll the throw quality and its Settings adjustment once for this throw. */
export function rollQBAccuracy(accuracy: number, table: readonly AccuracyModRow[], random: () => number = Math.random) {
  const throwTypeChances = getThrowTypeChances(accuracy);
  if (THROW_TYPES.some((type) => !table.some((row) => row.throwType === type)))
    throw new Error("Missing throw types in Accuracy Mod Settings table.");
  const accuracyRoll = random() * 100;
  const selected = throwTypeChances.find((row) => row.chancePct > 0 && accuracyRoll < row.threshold)
    ?? [...throwTypeChances].reverse().find((row) => row.chancePct > 0)!;
  const range = table.find((row) => row.throwType === selected.throwType)!;
  if (!Number.isFinite(range.min) || !Number.isFinite(range.max) || range.max < range.min)
    throw new Error(`Invalid Accuracy Mod range for ${range.throwType}.`);
  const accuracyAdjustment = range.min + random() * (range.max - range.min);
  return { qbAccuracy: accuracy, throwTypeChances, accuracyRoll, throwType: selected.throwType, accuracyAdjustment };
}
