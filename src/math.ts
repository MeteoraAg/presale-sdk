import Decimal from "decimal.js";
import { Rounding, U128_MAX, U64_MAX } from "./type";
import { BN } from "@coral-xyz/anchor";
import invariant from "tiny-invariant";

const SCALE_MULTIPLIER = new BN(2).pow(new BN(64));

export function uiPriceToQPrice(
  price: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number,
  rounding: Rounding
): BN {
  Decimal.set({ toExpPos: 40 });
  let lamportPrice = price * Math.pow(10, quoteTokenDecimal - baseTokenDecimal);
  const lamportPriceDecimal = new Decimal(lamportPrice);

  const qPriceDecimal = lamportPriceDecimal.mul(new Decimal(2).pow(64));

  const qPrice =
    rounding === Rounding.Up ? qPriceDecimal.ceil() : qPriceDecimal.floor();

  if (
    qPrice.lessThan(new Decimal(1)) ||
    qPrice.greaterThan(new Decimal(U128_MAX.toString()))
  ) {
    return new BN(0);
  }

  return new BN(qPrice.toString());
}

export function qPriceToPrice(qPrice: BN): Decimal {
  return new Decimal(qPrice.toString()).div(new Decimal(2).pow(64));
}

export function calculateDynamicLamportPrice(
  presaleSupply: BN,
  totalDeposit: BN
): Decimal {
  return new Decimal(totalDeposit.toString()).div(
    new Decimal(presaleSupply.toString())
  );
}

export function calculateImmediateReleaseToken(
  totalSoldToken: BN,
  immediateReleaseBps: BN
): {
  immediateReleasedAmount: BN;
  vestedAmount: BN;
} {
  if (immediateReleaseBps.isZero()) {
    return {
      immediateReleasedAmount: new BN(0),
      vestedAmount: totalSoldToken,
    };
  }

  const immediateReleasedAmount = totalSoldToken
    .mul(immediateReleaseBps)
    .div(new BN(10000));

  return {
    immediateReleasedAmount,
    vestedAmount: totalSoldToken.sub(immediateReleasedAmount),
  };
}

// Calculates lock duration and vest duration in seconds from the given timestamps. Vest start immediately follows lock end.
export function calculateLockAndVestDurationFromTimestamps(
  presaleEndTime: BN,
  lockEndTime: BN,
  vestEndTime: BN
) {
  invariant(
    presaleEndTime.lte(lockEndTime),
    "Lock end must be after presale end"
  );

  invariant(lockEndTime.lte(vestEndTime), "Vest end must be after lock end");

  const lockDuration = lockEndTime.sub(presaleEndTime);
  const vestDuration = vestEndTime.sub(lockEndTime);

  return {
    lockDuration,
    vestDuration,
  };
}

export function calculateMinimumQuoteAmountForBaseLamport(
  uiPrice: Decimal,
  baseDecimal: BN,
  quoteDecimal: BN,
  rounding: Rounding
) {
  const qPrice = uiPriceToQPrice(
    uiPrice.toNumber(),
    baseDecimal.toNumber(),
    quoteDecimal.toNumber(),
    rounding
  );

  return qPrice.add(SCALE_MULTIPLIER).sub(new BN(1)).div(SCALE_MULTIPLIER);
}

export function calculateMaximumQuoteAmountForPresaleSupply(
  uiPrice: Decimal,
  baseDecimal: BN,
  quoteDecimal: BN,
  presaleSupply: BN,
  rounding: Rounding
): {
  maxPresaleCap: BN;
  remainingPresaleSupply: BN;
} {
  const qPrice = uiPriceToQPrice(
    uiPrice.toNumber(),
    baseDecimal.toNumber(),
    quoteDecimal.toNumber(),
    rounding
  );

  let maxPresaleCap = presaleSupply
    .mul(qPrice)
    .add(SCALE_MULTIPLIER.sub(new BN(1)))
    .div(SCALE_MULTIPLIER);

  let maxPresaleSupplyBought = maxPresaleCap.mul(SCALE_MULTIPLIER).div(qPrice);

  // Due to maxPresaleCap round up, if the price is < 1, the extra lamport rounded can buy more than presale supply
  // Eg: price: 0.05
  // presaleSupply: 111
  // maxPresaleCap: price * presaleSupply = 5.55 -> rounded up to 6
  // maxPresaleSupplyBought: maxPresaleCap / price = 6 / 0.05 = 120 > presaleSupply
  if (maxPresaleSupplyBought.gt(presaleSupply)) {
    maxPresaleCap = maxPresaleCap.sub(new BN(1));
  }

  maxPresaleSupplyBought = maxPresaleCap.mul(SCALE_MULTIPLIER).div(qPrice);
  const remainingPresaleSupply = presaleSupply.sub(maxPresaleSupplyBought);

  return {
    maxPresaleCap,
    remainingPresaleSupply,
  };
}

export function calculateDepositFeeIncludedAmount(
  depositAmount: BN,
  feeBps: BN,
  rounding: Rounding
) {
  if (feeBps.isZero()) {
    return depositAmount;
  }

  const denominator = new BN(10000).sub(feeBps);
  let adjustedDepositAmount = depositAmount.mul(new BN(10000));

  if (rounding === Rounding.Up) {
    adjustedDepositAmount = adjustedDepositAmount
      .add(denominator)
      .sub(new BN(1));
  }

  return adjustedDepositAmount.div(denominator);
}
