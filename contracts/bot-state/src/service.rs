#![cfg_attr(target_arch = "wasm32", no_main)]

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Schema};
use linera_sdk::{
    graphql::GraphQLMutationRoot, linera_base_types::WithServiceAbi, views::View, Service,
    ServiceRuntime,
};

use bot_state::{AccuracyMetrics, BotState, Operation, Signal};

pub struct BotStateService {
    state: BotState,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(BotStateService);

impl WithServiceAbi for BotStateService {
    type Abi = bot_state::BotStateAbi;
}

impl Service for BotStateService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = BotState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        BotStateService {
            state,
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        let bot_id = self.state.bot_id.get().clone();
        let latest_signal = self.state.latest_signal.get().clone();
        let accuracy_24h = self.state.accuracy_24h.get().clone();
        let follower_count = *self.state.follower_count.get();

        Schema::build(
            BotQueryRoot {
                bot_id,
                latest_signal,
                accuracy_24h,
                follower_count,
            },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish()
        .execute(query)
        .await
    }
}

/// GraphQL query root for bot state
struct BotQueryRoot {
    bot_id: String,
    latest_signal: Option<Signal>,
    accuracy_24h: AccuracyMetrics,
    follower_count: u64,
}

#[Object]
impl BotQueryRoot {
    /// Get the bot's unique identifier
    async fn bot_id(&self) -> &String {
        &self.bot_id
    }

    /// Get the latest prediction signal
    async fn latest_signal(&self) -> &Option<Signal> {
        &self.latest_signal
    }

    /// Get the 24-hour accuracy metrics
    async fn accuracy_24h(&self) -> &AccuracyMetrics {
        &self.accuracy_24h
    }

    /// Get the number of followers
    async fn follower_count(&self) -> u64 {
        self.follower_count
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use async_graphql::{Request, Response, Value};
    use futures::FutureExt as _;
    use linera_sdk::{util::BlockingWait, views::View, Service, ServiceRuntime};
    use serde_json::json;

    use bot_state::{AccuracyMetrics, BotState};

    use super::BotStateService;

    #[test]
    fn test_query_bot_id() {
        let bot_id = "test-bot".to_string();
        let runtime = Arc::new(ServiceRuntime::<BotStateService>::new());
        let mut state = BotState::load(runtime.root_view_storage_context())
            .blocking_wait()
            .expect("Failed to read from mock key value store");
        state.bot_id.set(bot_id.clone());
        state.follower_count.set(0);
        state.accuracy_24h.set(AccuracyMetrics::default());

        let service = BotStateService {
            state,
            runtime: runtime.clone(),
        };

        let request = Request::new("{ botId }");

        let response = service
            .handle_query(request)
            .now_or_never()
            .expect("Query should not await anything");

        let expected = Response::new(Value::from_json(json!({"botId": "test-bot"})).unwrap());

        assert_eq!(response, expected);
    }

    #[test]
    fn test_query_follower_count() {
        let runtime = Arc::new(ServiceRuntime::<BotStateService>::new());
        let mut state = BotState::load(runtime.root_view_storage_context())
            .blocking_wait()
            .expect("Failed to read from mock key value store");
        state.bot_id.set("test".to_string());
        state.follower_count.set(42);
        state.accuracy_24h.set(AccuracyMetrics::default());

        let service = BotStateService {
            state,
            runtime: runtime.clone(),
        };

        let request = Request::new("{ followerCount }");

        let response = service
            .handle_query(request)
            .now_or_never()
            .expect("Query should not await anything");

        let expected = Response::new(Value::from_json(json!({"followerCount": 42})).unwrap());

        assert_eq!(response, expected);
    }
}
