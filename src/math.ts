import { Rounding } from "./type";
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
