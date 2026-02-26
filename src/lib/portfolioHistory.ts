/**
 * Compute daily log-returns from a value series (chronological).
 * Returns array same length - first element 0.
 */
function dailyReturns(values: number[]): number[] {
  const ret: number[] = [0];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    if (prev > 0 && curr > 0) {
      ret.push(Math.log(curr / prev));
    } else {
      ret.push(0);
    }
  }
  return ret;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/** Annualized vol from daily log-returns (252 trading days). */
export function annualizedVolatility(dailyLogReturns: number[]): number {
  if (dailyLogReturns.length < 20) return NaN;
  const s = std(dailyLogReturns);
  return s * Math.sqrt(252);
}

/** Sharpe ratio: (annualized return - rf) / annualized vol. Log-returns: mean*252 ≈ annualized return. rf default 2.5%. */
export function sharpeRatio(
  dailyLogReturns: number[],
  riskFreeRateAnnual = 0.025
): number {
  if (dailyLogReturns.length < 20) return NaN;
  const m = mean(dailyLogReturns);
  const annRet = m * 252;
  const vol = annualizedVolatility(dailyLogReturns);
  if (vol <= 0) return NaN;
  return (annRet - riskFreeRateAnnual) / vol;
}

export { dailyReturns };
