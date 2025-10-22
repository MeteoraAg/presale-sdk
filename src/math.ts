import Decimal from "decimal.js";
import { Rounding, U128_MAX, U64_MAX } from "./type";
import { BN } from "@coral-xyz/anchor";
import invariant from "tiny-invariant";

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

  const scaleMultiplier = new BN(2).pow(new BN(64));
  return qPrice.add(scaleMultiplier).sub(new BN(1)).div(scaleMultiplier);
}
