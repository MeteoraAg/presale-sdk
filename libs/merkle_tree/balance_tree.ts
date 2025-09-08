import { BN, web3 } from "@coral-xyz/anchor";
import { sha256 } from "js-sha256";

import { MerkleTree } from "./merkle_tree";

export interface WhitelistedWallet {
  account: web3.PublicKey;
  registryIndex: BN;
  depositCap: BN;
}

export class BalanceTree {
  private readonly _tree: MerkleTree;
  constructor(whitelistedWallet: WhitelistedWallet[]) {
    this._tree = new MerkleTree(
      whitelistedWallet.map((whitelistedWallet) => {
        return BalanceTree.toNode(whitelistedWallet);
      })
    );
  }

  static verifyProof(
    whitelistedWallet: WhitelistedWallet,
    proof: Buffer[],
    root: Buffer
  ): boolean {
    let pair = BalanceTree.toNode(whitelistedWallet);
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item);
    }

    return pair.equals(root);
  }

  static toNode(whitelistWallet: WhitelistedWallet): Buffer {
    const buf0 = whitelistWallet.account.toBuffer();
    const buf1 = whitelistWallet.registryIndex.toArrayLike(Buffer, "le", 1);
    const buf2 = whitelistWallet.depositCap.toArrayLike(Buffer, "le", 8);

    const buf = Buffer.concat([buf0, buf1, buf2]);

    const hashedBuff = Buffer.from(sha256(buf), "hex");

    const bufWithPrefix = Buffer.concat([Buffer.from([0]), hashedBuff]);
    return Buffer.from(sha256(bufWithPrefix), "hex");
  }

  getHexRoot(): string {
    return this._tree.getHexRoot();
  }

  // returns the hex bytes32 values of the proof
  getHexProof(whitelistWallet: WhitelistedWallet): string[] {
    return this._tree.getHexProof(BalanceTree.toNode(whitelistWallet));
  }

  getRoot(): Buffer {
    return this._tree.getRoot();
  }

  getProof(whitelistWallet: WhitelistedWallet): Buffer[] {
    return this._tree.getProof(BalanceTree.toNode(whitelistWallet));
  }
}
