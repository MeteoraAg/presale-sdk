import BN from "bn.js";
import { PresaleMode } from "../type";
import { FixedPricePresaleHandler } from "./fixed_price";
import { ProrataHandler } from "./prorata";
import { FcfsHandler } from "./fcfs";
import { IPresaleWrapper } from "../accounts/presale_wrapper";
import { IPresaleRegistryWrapper } from "../accounts/presale_registry_wrapper";
import { Structure } from "@solana/buffer-layout";

export function getSchemaFromRawData<T>(
  schema: Structure<T>,
  presaleModRawData: BN[]
): T {
  const buffer = Buffer.concat(
    presaleModRawData.map((data) => data.toArrayLike(Buffer, "le", 16))
  );
  const decoded = schema.decode(new Uint8Array(buffer));
  return decoded;
}

export function getPresaleRemainingDepositQuota(
  presaleMaximumCap: BN,
  totalDeposit: BN
): BN {
  return BN.max(presaleMaximumCap.sub(totalDeposit), new BN(0));
}

export function getBaseTokenSoldByDynamicPrice(
  totalDeposit: BN,
  presaleSupply: BN
): BN {
  if (totalDeposit.isZero() || presaleSupply.isZero()) {
    return new BN(0);
  }

  return presaleSupply;
}

export interface PresaleHandler {
  getRemainingDepositQuota(presaleWrapper: IPresaleWrapper): BN;
  getTotalBaseTokenSold(presaleWrapper: IPresaleWrapper): BN;
  getRegistryTotalBaseTokenSold(presaleRegistry: IPresaleRegistryWrapper): BN;
  canWithdraw(): boolean;
  suggestDepositAmount(maxAmount: BN, remainingDepositAmount: BN): BN;
  suggestWithdrawAmount(maxAmount: BN): BN;
  earlierEndOnceCapReached(): boolean;
}

export function getPresaleHandler(
  presaleMode: PresaleMode,
  presaleModRawData: BN[]
): PresaleHandler {
  switch (presaleMode) {
    case PresaleMode.FixedPrice:
      return new FixedPricePresaleHandler(presaleModRawData);
    case PresaleMode.Prorata:
      return new ProrataHandler();
    case PresaleMode.Fcfs:
      return new FcfsHandler(presaleModRawData);
    default:
      throw new Error("Unsupported presale type");
  }
}
