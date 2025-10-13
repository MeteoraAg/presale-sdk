import { BN, web3 } from "@coral-xyz/anchor";
import { sha256 } from "js-sha256";

import { MerkleTree } from "./merkle_tree";

export interface WhitelistedWallet {
  address: web3.PublicKey;
  registryIndex: BN;
  depositCap: BN;
}

export class BalanceTree {
  private readonly _tree: MerkleTree;
  constructor(whitelistedWallet: WhitelistedWallet[]) {
    this._tree = new MerkleTree(
      whitelistedWallet.map((wallet) => {
        return BalanceTree.toNode(wallet);
      })
    );
  }

  static verifyProof(
    wallet: WhitelistedWallet,
    proof: Buffer[],
    root: Buffer
  ): boolean {
    let pair = BalanceTree.toNode(wallet);
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item);
    }

    return pair.equals(root);
  }

  static toNode({
    address,
    registryIndex,
    depositCap,
  }: WhitelistedWallet): Buffer {
    const buf = Buffer.concat([
      address.toBuffer(),
      registryIndex.toBuffer("le", 8),
      depositCap.toBuffer("le", 8),
    ]);

    const hashedBuff = Buffer.from(sha256(buf), "hex");

    const bufWithPrefix = Buffer.concat([Buffer.from([0]), hashedBuff]);
    return Buffer.from(sha256(bufWithPrefix), "hex");
  }

  getHexRoot(): string {
    return this._tree.getHexRoot();
  }

  // returns the hex bytes32 values of the proof
  getHexProof(wallet: WhitelistedWallet): string[] {
    return this._tree.getHexProof(BalanceTree.toNode(wallet));
  }

  getRoot(): Buffer {
    return this._tree.getRoot();
  }

  getProof(wallet: WhitelistedWallet): Buffer[] {
    return this._tree.getProof(BalanceTree.toNode(wallet));
  }
}
