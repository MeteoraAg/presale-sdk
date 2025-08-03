import { NATIVE_MINT } from "@solana/spl-token";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import Decimal from "decimal.js";
import fs from "fs";
import os from "os";
import { derivePresale, PRESALE_PROGRAM_ID } from "../../src";
import {
  ILockedVestingArgs,
  IPresaleArgs,
  ITokenomicArgs,
} from "../../src/instructions";
import Presale from "../../src/presale";
import { Rounding, UnsoldTokenAction, WhitelistMode } from "../../src/type";

const connection = new Connection(clusterApiUrl("devnet"));

async function initializeMerkleTreePermissionedFixedPricePresale(
  connection: Connection,
  baseMintPubkey: PublicKey,
  quoteMintPubkey: PublicKey,
  keypair: Keypair,
  baseKeypair: Keypair,
  price: Decimal,
  unsoldTokenAction: UnsoldTokenAction,
  tokenomicArgs: ITokenomicArgs,
  presaleArgs: Omit<IPresaleArgs, "presaleMode">,
  whitelistedAddresses: PublicKey[],
  merkleProofServerUrl: string,
  lockedVestingArgs?: ILockedVestingArgs
) {
  const initializeFixedPricePresaleTx = await Presale.createFixedPricePresale(
    connection,
    PRESALE_PROGRAM_ID,
    {
      baseMintPubkey,
      quoteMintPubkey,
      basePubkey: baseKeypair.publicKey,
      creatorPubkey: keypair.publicKey,
      feePayerPubkey: keypair.publicKey,
      tokenomicArgs,
      presaleArgs,
      lockedVestingArgs,
    },
    {
      price,
      unsoldTokenAction,
      rounding: Rounding.Down,
    }
  );

  initializeFixedPricePresaleTx.sign(keypair, baseKeypair);

  let txSig = await connection.sendRawTransaction(
    initializeFixedPricePresaleTx.serialize()
  );

  console.log("Initialize presale transaction sent:", txSig);

  await connection.confirmTransaction({
    signature: txSig,
    lastValidBlockHeight: initializeFixedPricePresaleTx.lastValidBlockHeight,
    blockhash: initializeFixedPricePresaleTx.recentBlockhash,
  });

  await connection.confirmTransaction(
    {
      signature: txSig,
      lastValidBlockHeight: initializeFixedPricePresaleTx.lastValidBlockHeight,
      blockhash: initializeFixedPricePresaleTx.recentBlockhash,
    },
    "finalized"
  );

  const presaleAddress = derivePresale(
    baseMintPubkey,
    quoteMintPubkey,
    baseKeypair.publicKey,
    PRESALE_PROGRAM_ID
  );

  const presaleInstance = await Presale.create(
    connection,
    presaleAddress,
    PRESALE_PROGRAM_ID
  );

  const initTxs = await presaleInstance.createMerkleRootConfigFromAddresses({
    creator: keypair.publicKey,
    addresses: whitelistedAddresses,
    addressPerTree: 10_000,
  });

  await Promise.all(
    initTxs.map(async (tx) => {
      tx.sign(keypair);
      const txSig = await connection.sendRawTransaction(tx.serialize());
      console.log("Merkle root config transaction sent:", txSig);
      await connection.confirmTransaction(
        {
          signature: txSig,
          lastValidBlockHeight: tx.lastValidBlockHeight,
          blockhash: tx.recentBlockhash,
        },
        "finalized"
      );
      console.log("Merkle root config transaction confirmed:", txSig);
    })
  );

  const createPermissionedServerMetadataTx =
    await presaleInstance.createPermissionedServerMetadata({
      serverUrl: merkleProofServerUrl,
      owner: keypair.publicKey,
    });

  createPermissionedServerMetadataTx.sign(keypair);

  txSig = await connection.sendRawTransaction(
    createPermissionedServerMetadataTx.serialize()
  );

  console.log("Permissioned server metadata transaction sent:", txSig);

  await connection.confirmTransaction(
    {
      signature: txSig,
      lastValidBlockHeight:
        createPermissionedServerMetadataTx.lastValidBlockHeight,
      blockhash: createPermissionedServerMetadataTx.recentBlockhash,
    },
    "finalized"
  );
}

const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const rawKeypair = fs.readFileSync(keypairFilepath, "utf-8");
const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(rawKeypair)));

const tokenomicArgs: ITokenomicArgs = {
  presalePoolSupply: new BN(2000000000),
};
const presaleArgs: Omit<IPresaleArgs, "presaleMode"> = {
  presaleMaximumCap: new BN(100000000000),
  presaleMinimumCap: new BN(1000000000),
  buyerMaximumDepositCap: new BN(1000000000),
  buyerMinimumDepositCap: new BN(10000000),
  presaleStartTime: new BN(0),
  presaleEndTime: new BN(Math.floor(Date.now() / 1000 + 86400)),
  whitelistMode: WhitelistMode.PermissionWithMerkleProof,
};

const lockedVestingArgs: ILockedVestingArgs = {
  lockDuration: new BN(3600),
  vestDuration: new BN(3600),
};

const baseMintPubkey = new PublicKey(
  "Bn3KEckvpzxD5qxPArYPQMX9PGswZd6QypXqWPob79S"
);

const quoteMintPubkey = NATIVE_MINT;

const baseKeypair = Keypair.generate();

const whitelistedAddresses: PublicKey[] = [keypair.publicKey];

const merkleProofServerUrl = "http://localhost:8080/merkle-proof";

initializeMerkleTreePermissionedFixedPricePresale(
  connection,
  baseMintPubkey,
  quoteMintPubkey,
  keypair,
  baseKeypair,
  new Decimal(0.1),
  UnsoldTokenAction.Refund,
  tokenomicArgs,
  presaleArgs,
  whitelistedAddresses,
  merkleProofServerUrl,
  lockedVestingArgs
);
