/**
 * GraphQL client for querying Linera bot-state application
 * Uses native fetch instead of graphql-request for better Linera compatibility
 */

/**
 * Get the Linera GraphQL endpoint from environment variables
 * Returns a placeholder URL if not set (for build time)
 */
function getGraphQLEndpoint(): string {
  const endpoint = process.env.NEXT_PUBLIC_LINERA_GRAPHQL_URL;

  // Return placeholder for build time, actual validation happens at runtime
  if (!endpoint) {
    return 'http://localhost:8081/placeholder';
  }

  return endpoint;
}

/**
 * Query helper with native fetch for Linera compatibility
 */
export async function queryLinera<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  // Runtime validation
  const endpoint = process.env.NEXT_PUBLIC_LINERA_GRAPHQL_URL;
  if (!endpoint) {
    throw new Error(
      'NEXT_PUBLIC_LINERA_GRAPHQL_URL is not set. ' +
      'Please create a .env.local file based on .env.local.example'
    );
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Check for GraphQL errors
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(result.errors[0]?.message || 'GraphQL query failed');
    }

    return result.data as T;
  } catch (error) {
    console.error('GraphQL query error:', error);
    throw new Error('Failed to query Linera application');
  }
}
