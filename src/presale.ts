import { Program } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  PresaleAccount,
  PresaleProgram,
  PresaleProgress,
  Rounding,
  TransferHookAccountInfo,
  UnsoldTokenAction,
  WhitelistMode,
} from "./type";

import { unpackMint } from "@solana/spl-token";
import { BN } from "bn.js";
import Decimal from "decimal.js";
import { BalanceTree } from "../libs/merkle_tree";
import type { Presale as PresaleTypes } from "./idl/presale";
import PresaleIDL from "./idl/presale.json";
import {
  autoFetchProofAndCreatePermissionedEscrowWithMerkleProofIx,
  createClaimIx,
  createCloseEscrowIx,
  createCloseFixedPriceArgsIx,
  createCloseMerkleProofMetadataIx,
  createCreatorWithdrawIx,
  createInitializeFcfsPresaleIx,
  createInitializeFixedPricePresaleIx,
  createInitializeProrataPresaleIx,
  createMerkleRootConfigIx,
  createOperatorIx,
  createPerformUnsoldBaseTokenActionIx,
  createPermissionedEscrowWithCreatorIx,
  createPermissionedEscrowWithMerkleProofIx,
  createPermissionlessEscrowIx,
  createRefreshEscrowIx,
  createRevokeOperatorIx,
  createWithdrawIx,
  createWithdrawRemainingQuoteIx,
  getOrCreatePermissionedEscrowWithMerkleProofIx,
  getOrCreatePermissionlessEscrowIx,
  IClaimParams,
  ICloseEscrowParams,
  ICloseMerkleProofMetadataParams,
  ICreateCloseFixedPriceArgsParams,
  ICreateInitializePresaleIxParams,
  ICreateMerkleRootConfigParams,
  ICreateOperatorParams,
  ICreatePermissionedEscrowWithCreatorParams,
  ICreatePermissionedEscrowWithMerkleProofParams,
  ICreatePermissionlessEscrowParams,
  ICreatorWithdrawParams,
  IPerformUnsoldBaseTokenActionParams,
  IRefreshEscrowParams,
  IRevokeOperatorParams,
  IWithdrawParams,
  IWithdrawRemainingQuoteParams,
} from "./instructions";
import { createDepositIx, IDepositParams } from "./instructions/deposit";
import { uiPriceToQPrice } from "./math";
import { getSlicesAndExtraAccountMetasForTransferHook } from "./token2022";
import { getPresaleProgressState } from "./info_processor";

/**
 * Creates and returns an instance of the Presale program.
 *
 * @param connection - The Solana connection object to interact with the blockchain.
 * @param programId - The public key identifying the deployed Presale program.
 * @returns An initialized `Program<PresaleTypes>` instance for interacting with the Presale program.
 */
function createPresaleProgram(connection: Connection, programId: PublicKey) {
  const program = new Program<PresaleTypes>(
    {
      ...PresaleIDL,
      address: programId.toBase58(),
    } as PresaleTypes,
    {
      connection,
    }
  );

  return program;
}

/**
 * Fetches and prepares account information required for caching in the presale context.
 *
 * This function retrieves the presale account data, fetches mint account information for both
 * base and quote mints, and gathers any extra account metas needed for transfer hooks.
 * It then constructs a `TransferHookAccountInfo` object containing relevant slices and extra account metas.
 *
 * @param presaleProgram - The presale program instance containing provider and account definitions.
 * @param presaleAddress - The public key address of the presale account to fetch.
 * @returns An object containing the fetched `presaleAccount` and the constructed `transferHookAccountInfo`.
 */
async function fetchAccountsForCache(
  presaleProgram: PresaleProgram,
  presaleAddress: PublicKey
) {
  const connection = presaleProgram.provider.connection;

  const presaleAccount = await presaleProgram.account.presale.fetch(
    presaleAddress
  );

  const [baseMintAccount, quoteMintAccount] =
    await connection.getMultipleAccountsInfo([
      presaleAccount.baseMint,
      presaleAccount.quoteMint,
    ]);

  const { slices, extraAccountMetas } =
    await getSlicesAndExtraAccountMetasForTransferHook(
      connection,
      {
        mintAddress: presaleAccount.baseMint,
        mintAccountInfo: baseMintAccount,
      },
      {
        mintAddress: presaleAccount.quoteMint,
        mintAccountInfo: quoteMintAccount,
      }
    );

  return {
    presaleAccount,
    transferHookAccountInfo: {
      slices,
      extraAccountMetas,
    },
  };
}

async function buildTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  feePayer: PublicKey
) {
  const latestBlockhashInfo = await connection.getLatestBlockhash();
  return new Transaction({
    ...latestBlockhashInfo,
    feePayer,
  }).add(...instructions);
}

class Presale {
  constructor(
    public program: PresaleProgram,
    public presaleAddress: PublicKey,
    public presaleAccount: PresaleAccount,
    public transferHookAccountInfo: TransferHookAccountInfo
  ) {}

  /**
   * Creates a new instance of the `Presale` class using the provided Solana connection,
   * presale address, and program ID. Initializes the Anchor `Program` with the specified IDL and
   * derives the presale authority address.
   *
   * @param connection - The Solana connection object to interact with the blockchain.
   * @param presaleAddress - The public key representing the presale account.
   * @param programId - The public key of the deployed program.
   * @returns A Promise that resolves to a new `Presale` instance.
   */
  static async create(
    connection: Connection,
    presaleAddress: PublicKey,
    programId: PublicKey
  ) {
    const presaleProgram = createPresaleProgram(connection, programId);
    const { presaleAccount, transferHookAccountInfo } =
      await fetchAccountsForCache(presaleProgram, presaleAddress);

    return new Presale(
      presaleProgram,
      presaleAddress,
      presaleAccount,
      transferHookAccountInfo
    );
  }

  /**
   * Creates a new prorata presale transaction.
   *
   * This static method constructs and returns a `Transaction` object for initializing
   * a prorata presale on the specified Solana program. It prepares the necessary instruction
   * and sets the transaction's fee payer and blockhash.
   *
   * @param connection - The Solana connection object used to interact with the network.
   * @param programId - The public key of the presale program.
   * @param params - The parameters required to initialize the presale, excluding the program reference.
   * @returns A Promise that resolves to a `Transaction` object containing the initialization instruction.
   */
  static async createProrataPresale(
    connection: Connection,
    programId: PublicKey,
    params: Omit<ICreateInitializePresaleIxParams, "program">
  ) {
    const initializePresaleIx = await createInitializeProrataPresaleIx({
      program: createPresaleProgram(connection, programId),
      ...params,
    });

    return buildTransaction(
      connection,
      [initializePresaleIx],
      params.feePayerPubkey
    );
  }

  /**
   * Creates a transaction to initialize a First-Come-First-Serve (FCFS) presale on the Solana blockchain.
   *
   * This method constructs the required instruction for initializing an FCFS presale,
   * fetches the latest blockhash, and returns a `Transaction` object ready to be signed and sent.
   *
   * @param connection - The Solana connection object used to interact with the blockchain.
   * @param programId - The public key of the presale program.
   * @param params - The parameters required to initialize the presale, excluding the program reference.
   *                 Must include the fee payer's public key as `feePayerPubkey`.
   * @returns A `Transaction` object containing the initialization instruction for the FCFS presale.
   */
  static async createFcfsPresale(
    connection: Connection,
    programId: PublicKey,
    params: Omit<ICreateInitializePresaleIxParams, "program">
  ) {
    const initializePresaleIx = await createInitializeFcfsPresaleIx({
      program: createPresaleProgram(connection, programId),
      ...params,
    });

    return buildTransaction(
      connection,
      [initializePresaleIx],
      params.feePayerPubkey
    );
  }

  /**
   * Creates a Solana transaction to initialize a fixed price presale.
   *
   * This method fetches mint account information, prepares the presale program,
   * constructs the initialization instruction, and returns a transaction ready to be signed and sent.
   *
   * @param connection - The Solana connection object.
   * @param programId - The public key of the presale program.
   * @param presaleParams - Parameters for initializing the presale, excluding the program reference.
   * @param fixedPriceParams - Parameters specific to the fixed price presale, including unsold token action, price, and rounding.
   * @returns A Promise that resolves to a Transaction containing the initialization instruction.
   */
  static async createFixedPricePresale(
    connection: Connection,
    programId: PublicKey,
    presaleParams: Omit<ICreateInitializePresaleIxParams, "program">,
    fixedPriceParams: {
      unsoldTokenAction: UnsoldTokenAction;
      price: Decimal;
      rounding: Rounding;
    }
  ) {
    const [baseMintAccount, quoteMintAccount] =
      await connection.getMultipleAccountsInfo([
        presaleParams.baseMintPubkey,
        presaleParams.quoteMintPubkey,
      ]);

    const baseMint = unpackMint(presaleParams.baseMintPubkey, baseMintAccount);
    const quoteMint = unpackMint(
      presaleParams.quoteMintPubkey,
      quoteMintAccount
    );

    const program = createPresaleProgram(connection, programId);
    const initializePresaleIx = await createInitializeFixedPricePresaleIx(
      {
        ...presaleParams,
        program,
      },
      {
        baseMintPubkey: presaleParams.baseMintPubkey,
        quoteMintPubkey: presaleParams.quoteMintPubkey,
        feePayerPubkey: presaleParams.feePayerPubkey,
        basePubkey: presaleParams.basePubkey,
        ownerPubkey: presaleParams.creatorPubkey,
        unsoldTokenAction: fixedPriceParams.unsoldTokenAction,
        qPrice: uiPriceToQPrice(
          fixedPriceParams.price.toNumber(),
          baseMint.decimals,
          quoteMint.decimals,
          fixedPriceParams.rounding
        ),
        program,
      }
    );

    return buildTransaction(
      connection,
      [initializePresaleIx],
      presaleParams.feePayerPubkey
    );
  }

  /**
   * Creates a transaction to close a fixed price presale on the blockchain.
   *
   * This static method constructs and returns a `Transaction` object that includes
   * the necessary instruction to close a fixed price presale, using the provided
   * connection, parameters, and program ID.
   *
   * @param connection - The Solana connection object to interact with the blockchain.
   * @param params - The parameters required to close the fixed price presale, excluding the presale program.
   * @param programId - The public key of the presale program.
   * @returns A Promise that resolves to a `Transaction` containing the close presale instruction.
   */
  static async closeFixedPricePresaleArgs(
    connection: Connection,
    params: Omit<ICreateCloseFixedPriceArgsParams, "presaleProgram">,
    programId: PublicKey
  ) {
    const presaleProgram = createPresaleProgram(connection, programId);

    const { baseMint, quoteMint, base, owner } = params;

    const closeFixedPricePresaleArgsIx = await createCloseFixedPriceArgsIx({
      presaleProgram,
      baseMint,
      quoteMint,
      base,
      owner,
    });

    return buildTransaction(
      connection,
      [closeFixedPricePresaleArgsIx],
      params.owner
    );
  }

  /**
   * Creates a transaction to initialize a Merkle root configuration for a presale.
   *
   * This method constructs the necessary instruction using the provided parameters,
   * fetches the latest blockhash, and returns a `Transaction` object with the instruction added.
   *
   * @param params - The parameters required to create the Merkle root configuration, excluding the `presaleProgram`.
   * @returns A `Transaction` object containing the Merkle root configuration instruction.
   */
  async createMerkleRootConfig(
    params: Omit<
      ICreateMerkleRootConfigParams,
      "presaleProgram" | "presaleAddress"
    >
  ) {
    const initMerkleRootConfigIx = await createMerkleRootConfigIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      ...params,
    });

    const { creator } = params;

    return buildTransaction(
      this.program.provider.connection,
      [initMerkleRootConfigIx],
      creator
    );
  }

  /**
   * Creates Merkle root configuration transactions from a list of addresses.
   *
   * Splits the provided addresses into chunks (default size: 10,000), constructs a Merkle tree for each chunk,
   * and generates corresponding instructions to initialize Merkle root configs on-chain.
   * Returns an array of transactions, each containing the initialization instruction for a Merkle root config.
   *
   * @param params - The parameters for creating Merkle root configs.
   * @param params.addresses - Array of public keys to include in the Merkle trees.
   * @param params.addressPerTree - Optional. Number of addresses per Merkle tree chunk. Defaults to 10,000.
   * @param params.creator - The public key of the creator, used as the transaction fee payer.
   * @returns Promise resolving to an array of transactions, each containing an instruction to initialize a Merkle root config.
   */
  async createMerkleRootConfigFromAddresses(
    params: Omit<
      ICreateMerkleRootConfigParams,
      "presaleProgram" | "presaleAddress"
    > & {
      addresses: PublicKey[];
      addressPerTree?: number;
    }
  ) {
    let { addresses, addressPerTree, creator } = params;
    addressPerTree = addressPerTree || 10_000;

    const merkleTrees: BalanceTree[] = [];

    while (addresses.length > 0) {
      const chunkedAddress = addresses.splice(0, addressPerTree);
      const balanceTree = new BalanceTree(
        chunkedAddress.map((address) => ({
          account: address,
        }))
      );
      merkleTrees.push(balanceTree);
    }

    const initMerkleRootConfigsIx = await Promise.all(
      merkleTrees.map((tree, index) => {
        const root = tree.getRoot();
        return createMerkleRootConfigIx({
          presaleProgram: this.program,
          presaleAddress: this.presaleAddress,
          root,
          version: new BN(index),
          creator,
        });
      })
    );

    const latestBlockhashInfo =
      await this.program.provider.connection.getLatestBlockhash();

    return initMerkleRootConfigsIx.map((ix) => {
      return new Transaction({
        ...latestBlockhashInfo,
        feePayer: creator,
      }).add(ix);
    });
  }

  /**
   * Creates a permissionless escrow transaction for a presale.
   *
   * This method constructs and returns a `Transaction` object that initializes a permissionless escrow
   * using the provided parameters. The transaction includes the latest blockhash and sets the fee payer.
   *
   * @param params - The parameters required to create the permissionless escrow, excluding `presaleProgram` and `presaleAddress`.
   * @returns A `Transaction` object containing the instruction to initialize the permissionless escrow.
   */
  async createPermissionlessEscrow(
    params: Omit<
      ICreatePermissionlessEscrowParams,
      "presaleProgram" | "presaleAddress"
    >
  ) {
    const initPermissionlessEscrowIx = await createPermissionlessEscrowIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      ...params,
    });

    return buildTransaction(
      this.program.provider.connection,
      [initPermissionlessEscrowIx],
      params.payer
    );
  }

  /**
   * Creates a permissioned escrow by automatically fetching the Merkle proof from metadata.
   *
   * This method derives the Merkle proof metadata address using the presale address and program ID,
   * fetches the metadata state, constructs the Merkle proof API URL, and retrieves the Merkle proof
   * for the specified owner. It then calls `createPermissionedEscrowWithMerkleProof` with the fetched
   * proof and Merkle root configuration.
   *
   * @param params - The parameters required to create the permissioned escrow, excluding
   *                 `presaleProgram`, `presaleAddress`, `proof`, and `merkleRootConfig`.
   * @returns A promise that resolves to the result of `createPermissionedEscrowWithMerkleProof`.
   * @throws If the Merkle proof cannot be fetched from the constructed API URL.
   */
  async createPermissionedEscrowWithAutoFetchMerkleProofFromMetadata(
    params: Omit<
      ICreatePermissionedEscrowWithMerkleProofParams,
      "presaleProgram" | "presaleAddress" | "proof" | "merkleRootConfig"
    >
  ) {
    return autoFetchProofAndCreatePermissionedEscrowWithMerkleProofIx({
      presaleAddress: this.presaleAddress,
      presaleProgram: this.program,
      ...params,
    });
  }

  /**
   * Creates a permissioned escrow transaction with a Merkle proof.
   *
   * This method constructs and returns a `Transaction` object that initializes a permissioned escrow
   * using the provided parameters and a Merkle proof. The transaction includes the latest blockhash
   * and sets the fee payer as specified in the parameters.
   *
   * @param params - The parameters required to create the permissioned escrow, excluding `presaleProgram` and `presaleAddress`.
   * @returns A `Transaction` object containing the instruction to initialize the permissioned escrow.
   */
  async createPermissionedEscrowWithMerkleProof(
    params: Omit<
      ICreatePermissionedEscrowWithMerkleProofParams,
      "presaleProgram" | "presaleAddress"
    >
  ) {
    const initPermissionedEscrowIx =
      await createPermissionedEscrowWithMerkleProofIx({
        presaleProgram: this.program,
        presaleAddress: this.presaleAddress,
        ...params,
      });

    return buildTransaction(
      this.program.provider.connection,
      [initPermissionedEscrowIx],
      params.payer
    );
  }

  /**
   * Creates a permissioned escrow transaction with a specified creator.
   *
   * This method constructs and returns a Solana `Transaction` that initializes a permissioned escrow
   * using the provided parameters. It internally calls `createPermissionedEscrowWithCreatorIx` to
   * generate the required instruction, fetches the latest blockhash, and sets the fee payer.
   *
   * @param params - The parameters required to create the permissioned escrow, excluding
   *                 `presaleProgram` and `presaleAddress` which are provided by the class instance.
   * @returns A `Transaction` object containing the initialization instruction for the permissioned escrow.
   */
  async createPermissionedEscrowWithCreator(
    params: Omit<
      ICreatePermissionedEscrowWithCreatorParams,
      "presaleProgram" | "presaleAddress"
    >
  ) {
    const initPermissionedEscrowWithCreatorIx =
      await createPermissionedEscrowWithCreatorIx({
        presaleProgram: this.program,
        presaleAddress: this.presaleAddress,
        ...params,
      });

    return buildTransaction(
      this.program.provider.connection,
      [initPermissionedEscrowWithCreatorIx],
      params.payer
    );
  }

  /**
   * Creates a transaction to initialize an operator for the presale program.
   *
   * @param operator - The public key of the operator to be created.
   * @param creator - The public key of the creator who will pay the transaction fee.
   * @returns A `Transaction` object containing the instruction to initialize the operator.
   */
  async createOperator(params: Omit<ICreateOperatorParams, "presaleProgram">) {
    const { operator, creator } = params;

    const initOperatorIx = await createOperatorIx({
      presaleProgram: this.program,
      operator,
      creator,
    });

    const latestBlockhashInfo =
      await this.program.provider.connection.getLatestBlockhash();

    return new Transaction({
      ...latestBlockhashInfo,
      feePayer: creator,
    }).add(initOperatorIx);
  }

  /**
   * Creates a transaction to revoke an operator from the presale program.
   *
   * This method constructs a transaction that removes the specified operator's permissions,
   * using the provided creator's public key as the fee payer. The transaction includes
   * the latest blockhash for network validity.
   *
   * @param operator - The public key of the operator to be revoked.
   * @param creator - The public key of the creator initiating the revocation and paying the transaction fee.
   * @returns A `Transaction` object containing the revoke operator instruction.
   */
  async revokeOperator(params: Omit<IRevokeOperatorParams, "presaleProgram">) {
    const { operator, creator } = params;

    const revokeOperatorIx = await createRevokeOperatorIx({
      presaleProgram: this.program,
      operator,
      creator,
    });

    return buildTransaction(
      this.program.provider.connection,
      [revokeOperatorIx],
      creator
    );
  }

  /**
   * Asynchronously refetches the current state of the presale and updates the instance properties.
   *
   * This method calls a private helper to retrieve the latest `presaleAccount` and
   * `transferHookAccountInfo` from the blockchain, then updates the corresponding
   * properties on the class instance.
   *
   * @returns {Promise<void>} Resolves when the state has been successfully refetched and updated.
   */
  async refetchState() {
    const { presaleAccount, transferHookAccountInfo } =
      await fetchAccountsForCache(this.program, this.presaleAddress);

    this.presaleAccount = presaleAccount;
    this.transferHookAccountInfo = transferHookAccountInfo;
  }

  /**
   * Deposits funds into the presale, handling different whitelist modes.
   *
   * Depending on the whitelist mode of the presale, this method may initialize an escrow account
   * before performing the deposit. For permissionless mode, it creates a permissionless escrow.
   * For permissioned mode with Merkle proof, it creates a permissioned escrow with Merkle proof.
   * Then, it creates and returns a transaction containing all necessary instructions.
   *
   * @param params - The parameters required for the deposit, excluding internal presale-related fields.
   * @returns A promise that resolves to a transaction ready to be sent.
   */
  async deposit(
    params: Omit<
      IDepositParams,
      | "presaleProgram"
      | "presaleAddress"
      | "presaleAccount"
      | "transferHookAccountInfo"
      | "transferHookRemainingAccounts"
    >
  ) {
    const whitelistMode = this.presaleAccount.whitelistMode;

    const preInstructions: TransactionInstruction[] = [];

    switch (whitelistMode) {
      case WhitelistMode.Permissionless: {
        const initEscrowIx = await getOrCreatePermissionlessEscrowIx({
          presaleAddress: this.presaleAddress,
          presaleProgram: this.program,
          owner: params.owner,
          payer: params.owner,
        });

        if (initEscrowIx) {
          preInstructions.push(initEscrowIx);
        }
        break;
      }
      case WhitelistMode.PermissionWithMerkleProof: {
        const initEscrowIx =
          await getOrCreatePermissionedEscrowWithMerkleProofIx({
            presaleAddress: this.presaleAddress,
            presaleProgram: this.program,
            owner: params.owner,
            payer: params.owner,
          });

        if (initEscrowIx) {
          preInstructions.push(initEscrowIx);
        }
        break;
      }
    }

    const depositIx = await createDepositIx({
      presaleAccount: this.presaleAccount,
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      transferHookRemainingAccountInfo: this.transferHookAccountInfo,
      transferHookRemainingAccounts:
        this.transferHookAccountInfo.extraAccountMetas,
      ...params,
    });

    return buildTransaction(
      this.program.provider.connection,
      [...preInstructions, ...depositIx],
      params.owner
    );
  }

  /**
   * Withdraws funds from the presale contract.
   *
   * This method constructs and returns a transaction for withdrawing funds,
   * using the provided parameters and internal presale state. It omits several
   * internal fields from the input parameters, which are automatically supplied
   * from the instance.
   *
   * @param params - The withdrawal parameters, excluding internal presale and transfer hook fields.
   * @returns A transaction object ready to be signed and sent.
   */
  async withdraw(
    params: Omit<
      IWithdrawParams,
      | "presaleProgram"
      | "presaleAddress"
      | "presaleAccount"
      | "transferHookAccountInfo"
      | "transferHookRemainingAccounts"
    >
  ) {
    const withdrawIxs = await createWithdrawIx({
      presaleAccount: this.presaleAccount,
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      transferHookRemainingAccountInfo: this.transferHookAccountInfo,
      transferHookRemainingAccounts:
        this.transferHookAccountInfo.extraAccountMetas,
      ...params,
    });

    return buildTransaction(
      this.program.provider.connection,
      withdrawIxs,
      params.owner
    );
  }

  /**
   * Claims tokens from the presale contract for the specified owner.
   *
   * This method constructs the necessary instructions to claim tokens,
   * using the provided parameters and internal presale state, and builds
   * a transaction ready for submission.
   *
   * @param params - The parameters required to claim tokens, excluding internal presale fields.
   * @returns A transaction object containing the claim instructions.
   */
  async claim(
    params: Omit<
      IClaimParams,
      | "presaleProgram"
      | "presaleAddress"
      | "presaleAccount"
      | "transferHookAccountInfo"
      | "transferHookRemainingAccounts"
    >
  ) {
    const claimIxs = await createClaimIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      presaleAccount: this.presaleAccount,
      transferHookRemainingAccountInfo: this.transferHookAccountInfo,
      transferHookRemainingAccounts:
        this.transferHookAccountInfo.extraAccountMetas,
      ...params,
    });

    return buildTransaction(
      this.program.provider.connection,
      claimIxs,
      params.owner
    );
  }

  /**
   * Withdraws the remaining quote tokens from the presale contract.
   *
   * This method constructs and sends a transaction to withdraw any remaining quote tokens
   * associated with the presale. It uses the provided parameters along with internal state
   * such as the presale program, address, account, and transfer hook information.
   *
   * @param params - The parameters required to withdraw the remaining quote tokens, excluding
   *                 presale program, presale address, presale account, transfer hook account info,
   *                 and transfer hook remaining accounts, which are provided internally.
   * @returns A promise that resolves to the built transaction for withdrawing the remaining quote tokens.
   */
  async withdrawRemainingQuote(
    params: Omit<
      IWithdrawRemainingQuoteParams,
      | "presaleProgram"
      | "presaleAddress"
      | "presaleAccount"
      | "transferHookAccountInfo"
      | "transferHookRemainingAccounts"
    >
  ) {
    const withdrawRemainingQuoteIxs = await createWithdrawRemainingQuoteIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      presaleAccount: this.presaleAccount,
      transferHookRemainingAccountInfo: this.transferHookAccountInfo,
      transferHookRemainingAccounts:
        this.transferHookAccountInfo.extraAccountMetas,
      ...params,
    });

    return buildTransaction(
      this.program.provider.connection,
      withdrawRemainingQuoteIxs,
      params.owner
    );
  }

  /**
   * Performs an action on unsold base tokens in a presale context.
   *
   * This method constructs and executes the necessary instructions to handle unsold base tokens,
   * using the provided parameters and internal presale state. It omits several internal fields
   * from the input parameters, which are supplied automatically from the instance.
   *
   * @param params - The parameters required to perform the unsold base token action, excluding
   *                 `presaleProgram`, `presaleAddress`, `presaleAccount`, `transferHookAccountInfo`,
   *                 and `transferHookRemainingAccounts`, which are provided by the instance.
   * @returns A transaction object representing the performed action.
   */
  async performUnsoldBaseTokenAction(
    params: Omit<
      IPerformUnsoldBaseTokenActionParams,
      | "presaleProgram"
      | "presaleAddress"
      | "presaleAccount"
      | "transferHookAccountInfo"
      | "transferHookRemainingAccounts"
    >
  ) {
    const performUnsoldBaseTokenActionIxs =
      await createPerformUnsoldBaseTokenActionIx({
        presaleProgram: this.program,
        presaleAddress: this.presaleAddress,
        presaleAccount: this.presaleAccount,
        transferHookRemainingAccountInfo: this.transferHookAccountInfo,
        transferHookRemainingAccounts:
          this.transferHookAccountInfo.extraAccountMetas,
        ...params,
      });

    return buildTransaction(
      this.program.provider.connection,
      performUnsoldBaseTokenActionIxs,
      params.creator
    );
  }

  /**
   * Initiates a withdrawal transaction for the creator from the presale contract.
   *
   * This method constructs the necessary instructions for the creator to withdraw funds,
   * using the provided parameters and internal presale state. It omits the presale-specific
   * fields from the input parameters, as these are managed internally.
   *
   * @param params - The parameters required for the creator withdrawal, excluding
   *                 `presaleProgram`, `presaleAddress`, and `presaleAccount`.
   * @returns A transaction object ready to be signed and sent by the creator.
   */
  async creatorWithdraw(
    params: Omit<
      ICreatorWithdrawParams,
      "presaleProgram" | "presaleAddress" | "presaleAccount"
    >
  ) {
    const withdrawIxs = await createCreatorWithdrawIx({
      presaleAccount: this.presaleAccount,
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      transferHookRemainingAccountInfo: this.transferHookAccountInfo,
      transferHookRemainingAccounts:
        this.transferHookAccountInfo.extraAccountMetas,
      ...params,
    });

    return buildTransaction(
      this.program.provider.connection,
      withdrawIxs,
      params.creator
    );
  }

  /**
   * Closes the escrow account for the presale.
   *
   * This method creates and returns a transaction to close the escrow,
   * using the provided parameters. The transaction is built with the
   * necessary instructions and signed by the owner.
   *
   * @param params - Parameters required to close the escrow, excluding `presaleProgram` and `presaleAddress`.
   * @returns A promise that resolves to the transaction for closing the escrow.
   */
  async closeEscrow(
    params: Omit<ICloseEscrowParams, "presaleProgram" | "presaleAddress">
  ) {
    const closeEscrowIx = await createCloseEscrowIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      ...params,
    });

    return buildTransaction(
      this.program.provider.connection,
      [closeEscrowIx],
      params.owner
    );
  }

  /**
   * Closes the Merkle proof metadata account associated with the presale.
   *
   * This method constructs and returns a transaction to close the Merkle proof metadata,
   * using the provided parameters and the current presale address and program.
   *
   * @param params - The parameters required to close the Merkle proof metadata, excluding
   *                 `presaleProgram` and `presaleAddress` which are provided by the instance.
   * @returns A transaction object for closing the Merkle proof metadata.
   */
  async closeMerkleProofMetadata(
    params: Omit<
      ICloseMerkleProofMetadataParams,
      "presaleProgram" | "presaleAddress"
    >
  ) {
    const closeMerkleProofMetadataIx = await createCloseMerkleProofMetadataIx({
      presaleAddress: this.presaleAddress,
      presaleProgram: this.program,
      ...params,
    });

    return buildTransaction(
      this.program.provider.connection,
      [closeMerkleProofMetadataIx],
      params.owner
    );
  }

  /**
   * Refreshes the escrow state for the current presale instance.
   *
   * This method creates and returns a transaction to refresh the escrow,
   * using the provided parameters and the current presale program and address.
   *
   * @param params - The parameters required to refresh the escrow, excluding `presaleProgram` and `presaleAddress`.
   * @returns A promise that resolves to a transaction object for refreshing the escrow.
   */
  async refreshEscrow(
    params: Omit<IRefreshEscrowParams, "presaleProgram" | "presaleAddress">
  ) {
    const refreshEscrowIx = await createRefreshEscrowIx({
      presaleProgram: this.program,
      presaleAddress: this.presaleAddress,
      ...params,
    });

    return buildTransaction(
      this.program.provider.connection,
      [refreshEscrowIx],
      params.owner
    );
  }

  /**
   * Calculates the progress percentage of the presale based on the total deposit.
   *
   * The percentage is determined by dividing the total deposit (capped at the presale maximum cap)
   * by the presale maximum cap and multiplying by 100.
   *
   * @returns {number} The presale progress as a percentage (0 to 100).
   */
  getPresaleProgressPercentage() {
    const totalDeposit = Math.min(
      this.presaleAccount.totalDeposit.toNumber(),
      this.presaleAccount.presaleMaximumCap.toNumber()
    );

    return (
      (totalDeposit * 100.0) / this.presaleAccount.presaleMaximumCap.toNumber()
    );
  }

  /**
   * Determines the current progress state of the presale based on the current time and deposit amounts.
   *
   * @returns {PresaleProgress} The current state of the presale:
   * - `NotStarted`: If the current time is before the presale start time.
   * - `Ongoing`: If the current time is between the presale start and end times.
   * - `Completed`: If the presale has ended and the minimum cap has been reached.
   * - `Failed`: If the presale has ended and the minimum cap has not been reached.
   */
  getPresaleProgressState(): PresaleProgress {
    return getPresaleProgressState(this.presaleAccount);
  }
}

export default Presale;
