/**
 * GraphQL queries for Linera bot-state application
 * Matches the schema defined in contracts/bot-state/src/service.rs
 */

import { gql } from 'graphql-request';

/**
 * Query to get complete bot state including latest signal and accuracy metrics
 */
export const GET_BOT_STATE = gql`
  query GetBotState {
    botId
    latestSignal {
      action
      predictedPriceMicro
      confidenceBps
      timestamp
      reasoning
    }
    accuracy24H {
      totalPredictions
      correctPredictions
      directionalAccuracyBps
      rmseMicro
      lastUpdated
    }
    followerCount
  }
`;

/**
 * Query to get only the latest signal
 */
export const GET_LATEST_SIGNAL = gql`
  query GetLatestSignal {
    latestSignal {
      action
      predictedPriceMicro
      confidenceBps
      timestamp
      reasoning
    }
  }
`;

/**
 * Query to get only accuracy metrics
 */
export const GET_ACCURACY_METRICS = gql`
  query GetAccuracyMetrics {
    accuracy24H {
      totalPredictions
      correctPredictions
      directionalAccuracyBps
      rmseMicro
      lastUpdated
    }
  }
`;

/**
 * Query to get follower count
 */
export const GET_FOLLOWER_COUNT = gql`
  query GetFollowerCount {
    followerCount
  }
`;
