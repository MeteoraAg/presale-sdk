import { IdlDiscriminator } from "@coral-xyz/anchor/dist/cjs/idl";
import { MemcmpFilter, PublicKey } from "@solana/web3.js";
import IDL from "../idl/presale.json";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

export * from "./escrow_wrapper";
export * from "./presale_wrapper";
export * from "./presale_registry_wrapper";

const IDL_DISCRIMINATOR_LENGTH = 8;

function getAccountDiscriminator(accountName: string): IdlDiscriminator {
  return IDL.accounts.find(
    (acc) => acc.name.toLowerCase() === accountName.toLowerCase()
  )?.discriminator;
}

export function getPresaleFilter(): MemcmpFilter {
  return {
    memcmp: {
      offset: 0,
      bytes: bs58.encode(getAccountDiscriminator("presale")),
    },
  };
}

export function getEscrowPresaleFilter(
  presaleAddress: PublicKey
): MemcmpFilter {
  return {
    memcmp: {
      offset: IDL_DISCRIMINATOR_LENGTH,
      bytes: presaleAddress.toBase58(),
    },
  };
}

export function getEscrowFilter(): MemcmpFilter {
  return {
    memcmp: {
      offset: 0,
      bytes: bs58.encode(getAccountDiscriminator("escrow")),
    },
  };
}

export function getEscrowOwnerFilter(owner: PublicKey): MemcmpFilter {
  return {
    memcmp: {
      offset: IDL_DISCRIMINATOR_LENGTH + 32,
      bytes: owner.toBase58(),
    },
  };
}
