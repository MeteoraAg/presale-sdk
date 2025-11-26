import {
  AddressLookupTableAccount,
  Commitment,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export async function getOnChainTimestamp(connection: Connection) {
  const clock = await connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY);
  return clock.data.readBigInt64LE(32);
}

export async function fetchMultipleAccountsAutoChunk(
  connection: Connection,
  addresses: PublicKey[]
) {
  const chunkedAddresses: PublicKey[][] = [];

  while (addresses.length > 0) {
    const chunk = addresses.splice(0, 100);
    chunkedAddresses.push(chunk);
  }

  return Promise.all(
    chunkedAddresses.map((chunk, outerIdx) =>
      connection.getMultipleAccountsInfo(chunk).then((accounts) => {
        return accounts.map((account, innerIdx) => ({
          pubkey: chunkedAddresses[outerIdx][innerIdx],
          account,
        }));
      })
    )
  ).then((results) => results.flat());
}

export const getSimulationComputeUnits = async (
  connection: Connection,
  instructions: Array<TransactionInstruction>,
  payer: PublicKey,
  lookupTables: Array<AddressLookupTableAccount> | [],
  commitment: Commitment = "confirmed"
): Promise<number | null> => {
  const testInstructions = [
    // Set an arbitrarily high number in simulation
    // so we can be sure the transaction will succeed
    // and get the real compute units used
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
    ...instructions,
  ];

  const testTransaction = new VersionedTransaction(
    new TransactionMessage({
      instructions: testInstructions,
      payerKey: payer,
      // RecentBlockhash can by any public key during simulation
      // since 'replaceRecentBlockhash' is set to 'true' below
      recentBlockhash: PublicKey.default.toString(),
    }).compileToV0Message(lookupTables)
  );

  const rpcResponse = await connection.simulateTransaction(testTransaction, {
    replaceRecentBlockhash: true,
    sigVerify: false,
    commitment,
  });

  if (rpcResponse?.value?.err) {
    const logs = rpcResponse.value.logs?.join("\n  • ") || "No logs available";
    throw new Error(
      `Transaction simulation failed:\n  •${logs}` +
        JSON.stringify(rpcResponse?.value?.err)
    );
  }

  return rpcResponse.value.unitsConsumed || null;
};
