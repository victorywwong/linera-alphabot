/**
 * BotCard component - Displays bot state and latest prediction
 */

import { BotState, Action } from '@/types';
import {
  formatUSD,
  fromMicroUSD,
  formatBasisPointsAsPercentage,
} from '@/lib/conversions';
import { formatDistanceToNow } from 'date-fns';

interface BotCardProps {
  botState: BotState;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function getActionColor(action: Action): string {
  switch (action) {
    case Action.Buy:
      return 'bg-green-100 text-green-800 border-green-300';
    case Action.Sell:
      return 'bg-red-100 text-red-800 border-red-300';
    case Action.Hold:
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  }
}

function getActionLabel(action: Action): string {
  return action.toUpperCase();
}

export function BotCard({ botState, onRefresh, isRefreshing = false }: BotCardProps) {
  const { botId, latestSignal, accuracy24H, followerCount } = botState;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AlphaBot</h2>
          <p className="text-sm text-gray-500 font-mono mt-1">{botId}</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>

      {/* Latest Signal */}
      {latestSignal ? (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Latest Prediction
          </h3>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            {/* Trading Signal Badge */}
            <div className="mb-4">
              <span
                className={`inline-block px-6 py-2 rounded-full text-2xl font-bold border-2 ${getActionColor(latestSignal.action)}`}
              >
                {getActionLabel(latestSignal.action)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Predicted Price</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatUSD(fromMicroUSD(latestSignal.predictedPriceMicro))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Confidence</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatBasisPointsAsPercentage(latestSignal.confidenceBps)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Reasoning</p>
              <p className="text-sm text-gray-700 italic">
                {latestSignal.reasoning}
              </p>
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(latestSignal.timestamp), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500">No predictions yet</p>
          </div>
        </div>
      )}

      {/* Accuracy Metrics */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          24h Performance
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total Predictions</p>
            <p className="text-2xl font-bold text-gray-900">
              {accuracy24H.totalPredictions}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Correct Direction</p>
            <p className="text-2xl font-bold text-gray-900">
              {accuracy24H.correctPredictions}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Accuracy</p>
            <p className="text-2xl font-bold text-green-600">
              {formatBasisPointsAsPercentage(accuracy24H.directionalAccuracyBps)}
            </p>
          </div>
        </div>
        <div className="mt-4 bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">RMSE (Price Error)</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatUSD(fromMicroUSD(accuracy24H.rmseMicro))}
          </p>
        </div>
      </div>

      {/* Follower Count */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{followerCount}</span>{' '}
          {followerCount === 1 ? 'follower' : 'followers'}
        </p>
      </div>
    </div>
  );
}
