import vault from 'node-vault';

const vaultClient = vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR || 'https://vault.rajivwallace.com'
});

export const setupVaultConnection = async () => {
  try {
    await vaultClient.approleLogin({
      role_id: process.env.VAULT_ROLE_ID,
      secret_id: process.env.VAULT_SECRET_ID
    });
  } catch (error) {
    console.error('Failed to connect to Vault:', error);
    process.exit(1);
  }
};

export const getSecretFromVault = async (path: string) => {
  const { data } = await vaultClient.read(path);
  return data;
};