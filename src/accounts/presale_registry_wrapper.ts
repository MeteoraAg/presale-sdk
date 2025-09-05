import { PresaleRegistry } from "../type";

export interface IPresaleRegistryWrapper {
  isInitialized(): boolean;
  getPresaleRegistry(): PresaleRegistry;
  getRegistryIndex(): number;
}

export class PresaleRegistryWrapper implements IPresaleRegistryWrapper {
  public presaleRegistry: PresaleRegistry;
  public index: number;

  constructor(presaleRegistry: PresaleRegistry, index: number) {
    this.presaleRegistry = presaleRegistry;
    this.index = index;
  }

  public isInitialized(): boolean {
    const {
      presaleSupply,
      buyerMaximumDepositCap,
      buyerMinimumDepositCap,
      depositFeeBps,
    } = this.presaleRegistry;

    return (
      !presaleSupply.isZero() ||
      !buyerMaximumDepositCap.isZero() ||
      !buyerMinimumDepositCap.isZero() ||
      depositFeeBps > 0
    );
  }

  public getPresaleRegistry(): PresaleRegistry {
    return this.presaleRegistry;
  }

  public getRegistryIndex(): number {
    return this.index;
  }
}
