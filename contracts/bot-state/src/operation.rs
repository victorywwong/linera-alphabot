use crate::state::Action;
use linera_sdk::graphql::GraphQLMutationRoot;
use serde::{Deserialize, Serialize};

/// Operations that can be performed on the bot state
#[derive(Debug, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Submit a new prediction signal
    SubmitPrediction {
        /// Unix timestamp in milliseconds as string (to avoid GraphQL Int32 overflow)
        timestamp: String,
        action: Action,
        /// Predicted price in micro-USD as string (multiply USD by 1_000_000)
        predicted_price_micro: String,
        /// Confidence in basis points (0-10000, where 10000 = 100%)
        confidence_bps: u64,
        reasoning: String,
    },

    /// Resolve a previous prediction with actual price
    ResolveSignal {
        /// Unix timestamp in milliseconds as string
        timestamp: String,
        /// Actual price in micro-USD as string
        actual_price_micro: String
    },

    /// Increment follower count (called when user follows)
    AddFollower,

    /// Decrement follower count (called when user unfollows)
    RemoveFollower,
}
