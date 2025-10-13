import Decimal from "decimal.js";
import { Rounding, U64_MAX } from "./type";
import { BN } from "@coral-xyz/anchor";

export function uiPriceToQPrice(
  price: number,
  baseTokenDecimal: number,
  quoteTokenDecimal: number,
  rounding: Rounding
): BN {
  let lamportPrice = price * Math.pow(10, quoteTokenDecimal - baseTokenDecimal);
  lamportPrice =
    rounding == Rounding.Up
      ? Math.ceil(lamportPrice)
      : Math.floor(lamportPrice);

  const lamportPriceBN = new BN(lamportPrice);
  return lamportPriceBN.shln(64);
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
