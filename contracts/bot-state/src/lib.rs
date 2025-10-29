mod operation;
mod state;

pub use operation::Operation;
pub use state::{AccuracyMetrics, Action, BotState, Signal};

use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{ContractAbi, ServiceAbi};

/// ABI for the BotState application
pub struct BotStateAbi;

impl ContractAbi for BotStateAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for BotStateAbi {
    type Query = Request;
    type QueryResponse = Response;
}
