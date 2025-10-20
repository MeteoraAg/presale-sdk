import fc from "fast-check";
import { describe } from "node:test";
import { Rounding, U64_MAX, uiPriceToQPrice } from "../src";

describe("Miscellaneous Tests", () => {
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
});
