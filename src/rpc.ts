import { Connection, PublicKey } from "@solana/web3.js";

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
