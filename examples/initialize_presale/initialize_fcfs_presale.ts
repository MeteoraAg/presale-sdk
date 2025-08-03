import { NATIVE_MINT } from "@solana/spl-token";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import fs from "fs";
import os from "os";
import { derivePresale, PRESALE_PROGRAM_ID } from "../../src";
import {
  ILockedVestingArgs,
  IPresaleArgs,
  ITokenomicArgs,
} from "../../src/instructions";
import Presale from "../../src/presale";
import { WhitelistMode } from "../../src/type";

const connection = new Connection(clusterApiUrl("devnet"));

async function initializeFcfsPresale(
  connection: Connection,
  baseMintPubkey: PublicKey,
  quoteMintPubkey: PublicKey,
  keypair: Keypair,
  baseKeypair: Keypair,
  tokenomicArgs: ITokenomicArgs,
  presaleArgs: Omit<IPresaleArgs, "presaleMode">,
  lockedVestingArgs?: ILockedVestingArgs
) {
  const initializeFcfsPresaleTx = await Presale.createFcfsPresale(
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
    }
  );

  initializeFcfsPresaleTx.sign(keypair, baseKeypair);

  const txSig = await connection.sendRawTransaction(
    initializeFcfsPresaleTx.serialize()
  );

  console.log("Initialize presale transaction sent:", txSig);

  await connection.confirmTransaction({
    signature: txSig,
    lastValidBlockHeight: initializeFcfsPresaleTx.lastValidBlockHeight,
    blockhash: initializeFcfsPresaleTx.recentBlockhash,
  });

  await connection.confirmTransaction(
    {
      signature: txSig,
      lastValidBlockHeight: initializeFcfsPresaleTx.lastValidBlockHeight,
      blockhash: initializeFcfsPresaleTx.recentBlockhash,
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

  console.log("Presale state: ", presaleInstance.presaleAccount);
}

const keypairFilepath = `${os.homedir()}/.config/solana/id.json`;
const rawKeypair = fs.readFileSync(keypairFilepath, "utf-8");
const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(rawKeypair)));

const tokenomicArgs: ITokenomicArgs = {
  presalePoolSupply: new BN(1000000),
};
const presaleArgs: Omit<IPresaleArgs, "presaleMode"> = {
  presaleMaximumCap: new BN(100000000000),
  presaleMinimumCap: new BN(1000000000),
  buyerMaximumDepositCap: new BN(1000000000),
  buyerMinimumDepositCap: new BN(10000000),
  presaleStartTime: new BN(0),
  presaleEndTime: new BN(Math.floor(Date.now() / 1000 + 86400)),
  whitelistMode: WhitelistMode.Permissionless,
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

initializeFcfsPresale(
  connection,
  baseMintPubkey,
  quoteMintPubkey,
  keypair,
  baseKeypair,
  tokenomicArgs,
  presaleArgs,
  lockedVestingArgs
);
