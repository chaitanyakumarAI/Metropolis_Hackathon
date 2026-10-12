// Wallet-signature session message shared by client and server.
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function sessionMessage(address: string, issuedAt: string, chainId: number) {
  return [
    "FirstFan: verify wallet to unlock supporter content",
    "",
    `Address: ${address.toLowerCase()}`,
    `Chain ID: ${chainId}`,
    `Issued At: ${issuedAt}`,
    "",
    "This free signature proves you own this wallet. It does not send a transaction or move funds.",
  ].join("\n");
}
