import { BN, web3 } from "@coral-xyz/anchor";
import { sha256 } from "js-sha256";

import { MerkleTree } from "./merkle_tree";

interface WhitelistedWallet {
  account: web3.PublicKey;
}

export class BalanceTree {
  private readonly _tree: MerkleTree;
  constructor(whitelistedWallet: WhitelistedWallet[]) {
    this._tree = new MerkleTree(
      whitelistedWallet.map(({ account }) => {
        return BalanceTree.toNode(account);
      })
    );
  }

  static verifyProof(
    account: web3.PublicKey,
    proof: Buffer[],
    root: Buffer
  ): boolean {
    let pair = BalanceTree.toNode(account);
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item);
    }

    return pair.equals(root);
  }

  static toNode(account: web3.PublicKey): Buffer {
    const buf = account.toBuffer();

    const hashedBuff = Buffer.from(sha256(buf), "hex");

    const bufWithPrefix = Buffer.concat([Buffer.from([0]), hashedBuff]);
    return Buffer.from(sha256(bufWithPrefix), "hex");
  }

  getHexRoot(): string {
    return this._tree.getHexRoot();
  }

  // returns the hex bytes32 values of the proof
  getHexProof(account: web3.PublicKey): string[] {
    return this._tree.getHexProof(BalanceTree.toNode(account));
  }

  getRoot(): Buffer {
    return this._tree.getRoot();
  }

  getProof(account: web3.PublicKey, maxCap: BN): Buffer[] {
    return this._tree.getProof(BalanceTree.toNode(account));
  }
}
