import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import fs from "fs";
import os from "os";
import { PRESALE_PROGRAM_ID } from "../src";
import {
  ILockedVestingArgs,
  IPresaleArgs,
  ITokenomicArgs,
} from "../src/instructions";
import Presale from "../src/presale";
import { WhitelistMode } from "../src/type";
import { createMintAndMintTo } from "./helper";

const connection = new Connection(clusterApiUrl("devnet"));

async function initializeProrataPresale(
  connection: Connection,
  baseMintPubkey: PublicKey,
  quoteMintPubkey: PublicKey,
  keypair: Keypair,
  tokenomicArgs: ITokenomicArgs,
  presaleArgs: Omit<IPresaleArgs, "presaleMode">,
  lockedVestingArgs?: ILockedVestingArgs,
  initMintAndKeypairs?: {
    instructions: TransactionInstruction[];
    mintKeypair: Keypair;
  }[]
) {
  const initializeProrataPresaleTx = await Presale.createProrataPresale(
    connection,
    PRESALE_PROGRAM_ID,
    {
      baseMintPubkey,
      quoteMintPubkey,
      basePubkey: keypair.publicKey,
      creatorPubkey: keypair.publicKey,
      feePayerPubkey: keypair.publicKey,
      tokenomicArgs,
      presaleArgs,
      lockedVestingArgs,
    }
  );

  initializeProrataPresaleTx.sign(keypair);

  const txSig = await connection.sendRawTransaction(
    initializeProrataPresaleTx.serialize()
  );

  await connection.confirmTransaction({
    signature: txSig,
    lastValidBlockHeight: initializeProrataPresaleTx.lastValidBlockHeight,
    blockhash: initializeProrataPresaleTx.recentBlockhash,
  });
}

async function main(
  connection: Connection,
  keypair: Keypair,
  tokenomicArgs: ITokenomicArgs,
  presaleArgs: Omit<IPresaleArgs, "presaleMode">,
  lockedVestingArgs?: ILockedVestingArgs
) {
  const presaleSupply = new BN(1000000);
  const quoteTokenSupply = new BN(1000000);
  const baseMintPubkey = await createMintAndMintTo(
    connection,
    keypair,
    6,
    presaleSupply.toNumber()
  );
  const quoteMintPubkey = await createMintAndMintTo(
    connection,
    keypair,
    9,
    quoteTokenSupply.toNumber()
  );
  await initializeProrataPresale(
    connection,
    baseMintPubkey,
    quoteMintPubkey,
    keypair,
    tokenomicArgs,
    presaleArgs,
    lockedVestingArgs
  );
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
  presaleEndTime: new BN(Date.now() / 1000 + 86400),
  whitelistMode: WhitelistMode.Permissionless,
};

const lockedVestingArgs: ILockedVestingArgs = {
  lockDuration: new BN(3600),
  vestDuration: new BN(3600),
};

main(connection, keypair, tokenomicArgs, presaleArgs, lockedVestingArgs);
