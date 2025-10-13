import BN from "bn.js";
import { PresaleRegistry } from "../type";

export interface IPresaleRegistryWrapper {
  getPresaleRegistry(): PresaleRegistry;
  uninitialize(): boolean;
  escrowCount(): BN;
  registryIndex(): BN;
  getRemainingDepositAmount(
    presaleRemainingDepositAmount: BN,
    presaleTotalDepositAmount: BN
  ): {
    refundDepositAmount: BN;
    refundFeeAmount: BN;
  };
}

export class PresaleRegistryWrapper implements IPresaleRegistryWrapper {
  public presaleRegistry: PresaleRegistry;
  public index: BN;

  constructor(presaleRegistry: PresaleRegistry, index: BN) {
    this.presaleRegistry = presaleRegistry;
    this.index = index;
  }

  public getPresaleRegistry(): PresaleRegistry {
    return this.presaleRegistry;
  }

  public uninitialize(): boolean {
    const {
      presaleSupply,
      buyerMaximumDepositCap,
      buyerMinimumDepositCap,
      depositFeeBps,
    } = this.presaleRegistry;

    return (
      presaleSupply.eqn(0) &&
      buyerMaximumDepositCap.eqn(0) &&
      buyerMinimumDepositCap.eqn(0) &&
      depositFeeBps === 0
    );
  }

  public escrowCount(): BN {
    return this.presaleRegistry.totalEscrow;
  }

  public registryIndex(): BN {
    return this.index;
  }

  public getRemainingDepositAmount(
    presaleRemainingDepositAmount: BN,
    presaleTotalDepositAmount: BN
  ): {
    refundDepositAmount: BN;
    refundFeeAmount: BN;
  } {
    const { totalDeposit, totalDepositFee } = this.presaleRegistry;
    if (totalDeposit.isZero() || presaleRemainingDepositAmount.isZero()) {
      return {
        refundDepositAmount: new BN(0),
        refundFeeAmount: new BN(0),
      };
    }

    const registryRemainingDepositAmount = presaleRemainingDepositAmount
      .mul(totalDeposit)
      .div(presaleTotalDepositAmount);

    const registryRemainingDepositFee = totalDeposit
      .mul(registryRemainingDepositAmount)
      .div(totalDeposit);

    return {
      refundDepositAmount: registryRemainingDepositAmount,
      refundFeeAmount: registryRemainingDepositFee,
    };
  }
}
