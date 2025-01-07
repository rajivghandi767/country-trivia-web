import { Pool, PoolConfig } from 'pg';

interface VaultResponse {
  data: {
    data: {
      password: string;
    };
  };
}

export class DatabaseConnector {
  private static instance: Pool;
  private static config: PoolConfig;

  private static async getVaultCredentials(): Promise<string> {
    try {
      // Get Vault token from environment
      const vaultToken = process.env.VAULT_TOKEN;
      
      // Access Vault API using fetch
      const response = await fetch(
        `${process.env.VAULT_ADDR}/v1/secret/data/countrytrivia/db`,
        {
          headers: {
            'X-Vault-Token': vaultToken
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Vault API error: ${response.status}`);
      }

      const data = await response.json() as VaultResponse;
      return data.data.data.password;
    } catch (error) {
      console.error('Error fetching credentials from Vault:', error);
      throw error;
    }
  }

  public static async getConnection(): Promise<Pool> {
    if (!DatabaseConnector.instance) {
      try {
        // Get password from Vault
        const dbPassword = await DatabaseConnector.getVaultCredentials();

        // Configure database connection with explanatory comments
        DatabaseConnector.config = {
          user: 'postgres',
          host: 'db',
          database: 'countrytrivia',
          password: dbPassword,
          port: 5432,
          // Connection pool settings
          max: 20,         // Maximum number of clients the pool should contain
          idleTimeoutMillis: 30000,  // How long a client is allowed to remain idle before being closed
          connectionTimeoutMillis: 2000,  // How long to wait when connecting a new client
        };

        // Create connection pool
        DatabaseConnector.instance = new Pool(DatabaseConnector.config);

        // Test connection
        const client = await DatabaseConnector.instance.connect();
        console.log('Database connection successful');
        client.release();

      } catch (error) {
        console.error('Error initializing database connection:', error);
        throw error;
      }
    }

    return DatabaseConnector.instance;
  }

  public static async closeConnection(): Promise<void> {
    if (DatabaseConnector.instance) {
      await DatabaseConnector.instance.end();
      DatabaseConnector.instance = null;
    }
  }
}

// Convenience function to get database connection
export const getDb = async (): Promise<Pool> => {
  return DatabaseConnector.getConnection();
};