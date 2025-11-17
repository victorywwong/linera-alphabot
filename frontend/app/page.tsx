/**
 * Home page - AlphaBot Dashboard
 * Displays the bot state and latest prediction from Linera
 */

'use client';

import { useState, useEffect } from 'react';
import { BotCard } from '@/components/BotCard';
import { BotState } from '@/types';
import { queryLinera } from '@/lib/graphql/client';
import { GET_BOT_STATE } from '@/lib/graphql/queries';

export default function Home() {
  const [botState, setBotState] = useState<BotState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBotState = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      const data = await queryLinera<BotState>(GET_BOT_STATE);
      setBotState(data);
    } catch (err) {
      console.error('Error fetching bot state:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch bot state. Please check your .env.local configuration.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBotState();
  }, []);

  // Auto-refresh every 5 seconds (configurable via env)
  useEffect(() => {
    const pollInterval = parseInt(
      process.env.NEXT_PUBLIC_POLL_INTERVAL || '5000',
      10
    );

    const interval = setInterval(() => {
      fetchBotState(true);
    }, pollInterval);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              AlphaBot Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Real-time ETH price predictions on Linera
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading bot state...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-2 text-sm text-red-700">{error}</p>
                  <div className="mt-4">
                    <button
                      onClick={() => fetchBotState()}
                      className="text-sm font-medium text-red-800 hover:text-red-600"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration hint */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Configuration Required
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                Make sure you have set up your <code className="bg-blue-100 px-2 py-1 rounded">.env.local</code> file:
              </p>
              <pre className="bg-blue-900 text-blue-100 p-3 rounded text-xs overflow-x-auto">
{`NEXT_PUBLIC_LINERA_GRAPHQL_URL=http://localhost:8081/chains/<CHAIN_ID>/applications/<APP_ID>`}
              </pre>
              <p className="text-xs text-blue-700 mt-2">
                See <code className="bg-blue-100 px-1 rounded">.env.local.example</code> for details.
              </p>
            </div>
          </div>
        )}

        {/* Bot State */}
        {botState && !isLoading && (
          <div className="flex justify-center">
            <BotCard
              botState={botState}
              onRefresh={() => fetchBotState(true)}
              isRefreshing={isRefreshing}
            />
          </div>
        )}

        {/* Footer Info */}
        {botState && !isLoading && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Auto-refreshing every 5 seconds
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
