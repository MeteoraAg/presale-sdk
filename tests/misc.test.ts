import fc from "fast-check";
import { describe } from "node:test";
import {
  calculateMaximumQuoteAmountForPresaleSupply,
  Rounding,
  U64_MAX,
  uiPriceToQPrice,
} from "../src";
import Decimal from "decimal.js";
import { BN } from "bn.js";
import { expect } from "chai";

describe.only("Miscellaneous Tests", () => {
  it("uiPriceToQPrice should not causes BN assertion fail", () => {
    fc.assert(
      fc.property(
        fc.double({ min: Number.MIN_VALUE }),
        fc.integer({ min: 0, max: 12 }),
        fc.integer({ min: 0, max: 12 }),
        fc.boolean(),
        (uiPrice, baseDecimal, quoteDecimal, roundUp) => {
          if (isNaN(uiPrice) || !isFinite(uiPrice)) {
            return;
          }
          uiPriceToQPrice(
            uiPrice,
            baseDecimal,
            quoteDecimal,
            roundUp ? Rounding.Up : Rounding.Down
          );
        }
      )
    );
  });

  it("calculateMaximumQuoteAmountForPresaleSupply", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.0001, max: 1000 }),
        fc.bigInt({ min: BigInt(100), max: BigInt(U64_MAX.toString()) }),
        fc.boolean(),
        (uiPrice, rawPresaleSupply, roundUp) => {
          const baseDecimal = 6;
          const quoteDecimal = 6;
          const rounding = roundUp ? Rounding.Up : Rounding.Down;

          const { maxPresaleCap, remainingPresaleSupply } =
            calculateMaximumQuoteAmountForPresaleSupply(
              new Decimal(uiPrice),
              new BN(baseDecimal),
              new BN(quoteDecimal),
              new BN(rawPresaleSupply.toString()),
              rounding
            );

          const qPrice = uiPriceToQPrice(
            uiPrice,
            baseDecimal,
            quoteDecimal,
            rounding
          );
          const tokenBought = maxPresaleCap.shln(64).div(qPrice);

          if (remainingPresaleSupply.isZero()) {
            expect(tokenBought.eq(new BN(rawPresaleSupply.toString()))).to.be
              .true;
          } else {
            const remainingToken = new BN(rawPresaleSupply.toString()).sub(
              tokenBought
            );
            expect(remainingToken.eq(remainingPresaleSupply)).to.be.true;
          }
        }
      )
    );
  });
});
