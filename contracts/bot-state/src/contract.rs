#![cfg_attr(target_arch = "wasm32", no_main)]

use bot_state::{BotState, Operation};
use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};

pub struct BotStateContract {
    state: BotState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(BotStateContract);

impl WithContractAbi for BotStateContract {
    type Abi = bot_state::BotStateAbi;
}

impl Contract for BotStateContract {
    type Message = ();
    type InstantiationArgument = String; // bot_id
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = BotState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        BotStateContract { state, runtime }
    }

    async fn instantiate(&mut self, bot_id: String) {
        // Validate that the application parameters were configured correctly
        self.runtime.application_parameters();

        self.state.bot_id.set(bot_id);
        self.state.follower_count.set(0);
        self.state.accuracy_24h.set(Default::default());
    }

    async fn execute_operation(&mut self, operation: Operation) -> Self::Response {
        match operation {
            Operation::SubmitPrediction {
                timestamp,
                action,
                predicted_price_micro,
                confidence_bps,
                reasoning,
            } => {
                // Parse string values to u64
                let timestamp_u64 = timestamp.parse::<u64>()
                    .expect("Invalid timestamp format");
                let price_micro_u64 = predicted_price_micro.parse::<u64>()
                    .expect("Invalid price format");

                // Create signal from parameters
                let signal = bot_state::Signal {
                    timestamp: timestamp_u64,
                    action,
                    predicted_price_micro: price_micro_u64,
                    confidence_bps,
                    reasoning,
                    actual_price_micro: None,
                };

                // Validate signal
                if let Err(e) = signal.validate() {
                    panic!("Invalid signal: {}", e);
                }

                // Check timestamp is monotonically increasing
                if let Some(latest) = self.state.latest_signal.get() {
                    if signal.timestamp <= latest.timestamp {
                        panic!("Signal timestamp must be greater than previous signal");
                    }
                }

                // Update state
                self.state.latest_signal.set(Some(signal));
            }

            Operation::ResolveSignal {
                timestamp,
                actual_price_micro,
            } => {
                // Parse string values to u64
                let timestamp_u64 = timestamp.parse::<u64>()
                    .expect("Invalid timestamp format");
                let actual_price_u64 = actual_price_micro.parse::<u64>()
                    .expect("Invalid actual price format");

                if let Some(signal) = self.state.latest_signal.get().clone() {
                    if signal.timestamp == timestamp_u64 {
                        let previous_price_micro = signal.predicted_price_micro; // Simplified
                        let mut resolved_signal = signal.clone();
                        resolved_signal.actual_price_micro = Some(actual_price_u64);

                        // Update accuracy metrics
                        let mut metrics = self.state.accuracy_24h.get().clone();
                        let current_time = self.runtime.system_time().micros() / 1000; // Convert to ms
                        metrics.update(&resolved_signal, previous_price_micro, current_time);
                        self.state.accuracy_24h.set(metrics);

                        self.state.latest_signal.set(Some(resolved_signal));
                    }
                }
            }

            Operation::AddFollower => {
                let count = self.state.follower_count.get();
                self.state.follower_count.set(count + 1);
            }

            Operation::RemoveFollower => {
                let count = *self.state.follower_count.get();
                if count > 0 {
                    self.state.follower_count.set(count - 1);
                }
            }
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {}

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

#[cfg(test)]
mod tests {
    use futures::FutureExt as _;
    use linera_sdk::{util::BlockingWait, views::View, Contract, ContractRuntime};

    use bot_state::{Action, Operation};

    use super::{BotState, BotStateContract};

    #[test]
    fn test_submit_prediction() {
        let bot_id = "test-bot".to_string();
        let mut app = create_and_instantiate_app(bot_id.clone());

        app.execute_operation(Operation::SubmitPrediction {
            timestamp: 1000000,
            action: Action::Buy,
            predicted_price: 2500.0,
            confidence: 0.75,
            reasoning: "Bullish trend detected".to_string(),
        })
        .now_or_never()
        .expect("Execution should not await anything");

        let latest = app.state.latest_signal.get();
        assert!(latest.is_some());
        assert_eq!(latest.as_ref().unwrap().timestamp, 1000000);
        assert_eq!(latest.as_ref().unwrap().action, Action::Buy);
    }

    #[test]
    fn test_follower_count() {
        let bot_id = "test-bot".to_string();
        let mut app = create_and_instantiate_app(bot_id);

        // Add follower
        app.execute_operation(Operation::AddFollower)
            .now_or_never()
            .expect("Execution should not await anything");

        assert_eq!(*app.state.follower_count.get(), 1);

        // Add another
        app.execute_operation(Operation::AddFollower)
            .now_or_never()
            .expect("Execution should not await anything");

        assert_eq!(*app.state.follower_count.get(), 2);

        // Remove one
        app.execute_operation(Operation::RemoveFollower)
            .now_or_never()
            .expect("Execution should not await anything");

        assert_eq!(*app.state.follower_count.get(), 1);
    }

    fn create_and_instantiate_app(bot_id: String) -> BotStateContract {
        let runtime = ContractRuntime::new().with_application_parameters(());
        let mut contract = BotStateContract {
            state: BotState::load(runtime.root_view_storage_context())
                .blocking_wait()
                .expect("Failed to read from mock key value store"),
            runtime,
        };

        contract
            .instantiate(bot_id)
            .now_or_never()
            .expect("Initialization should not await anything");

        contract
    }
}
