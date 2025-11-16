#![cfg_attr(target_arch = "wasm32", no_main)]

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Schema};
use linera_sdk::{
    http,
    linera_base_types::WithServiceAbi,
    views::View,
    Service,
    ServiceRuntime,
};
use serde::{Deserialize, Serialize};

use bot_state::{AccuracyMetrics, Action, BotState, Operation, Signal};

/// Binance 24hr ticker response
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Binance24hrTicker {
    symbol: String,
    last_price: String,
    price_change_percent: String,
    quote_volume: String,
}

/// Binance kline (OHLC candlestick) response
/// Format: [timestamp, open, high, low, close, volume, close_time, quote_volume, trades, taker_buy_base, taker_buy_quote, ignore]
#[derive(Debug, Deserialize)]
struct BinanceKline(
    u64,    // Open time
    String, // Open
    String, // High
    String, // Low
    String, // Close
    String, // Volume
    u64,    // Close time
    String, // Quote asset volume
    u64,    // Number of trades
    String, // Taker buy base asset volume
    String, // Taker buy quote asset volume
    String, // Ignore
);

/// Market snapshot for prediction
#[derive(Debug, Clone, Serialize)]
struct MarketSnapshot {
    timestamp: u64,
    current_price: f64,
    change_24h: f64,
    volume_24h: f64,
    price_history: Vec<PricePoint>,
}

#[derive(Debug, Clone, Serialize)]
struct PricePoint {
    timestamp: u64,
    open: f64,
    high: f64,
    low: f64,
    close: f64,
    volume: f64,
}

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
            BotMutationRoot {
                runtime: self.runtime.clone(),
            },
            EmptySubscription,
        )
        .finish()
        .execute(query)
        .await
    }
}

impl BotStateService {
    /// Fetch current market data from Binance
    fn fetch_market_data(&self) -> Result<MarketSnapshot, String> {
        // Get 24hr ticker for current price, volume, and change
        // Using localhost proxy to bypass HTTP authorization restrictions
        let ticker_request = http::Request::get("http://localhost:3002/binance/ticker?symbol=ETHUSDT");
        let ticker_response = self.runtime.http_request(ticker_request);

        if ticker_response.status != 200 {
            return Err(format!("Binance ticker API error: {}", ticker_response.status));
        }

        let ticker: Binance24hrTicker = serde_json::from_slice(&ticker_response.body)
            .map_err(|e| format!("Failed to parse ticker: {}", e))?;

        let current_price: f64 = ticker.last_price.parse()
            .map_err(|e| format!("Failed to parse price: {}", e))?;
        let change_24h: f64 = ticker.price_change_percent.parse()
            .map_err(|e| format!("Failed to parse change: {}", e))?;
        let volume_24h: f64 = ticker.quote_volume.parse()
            .map_err(|e| format!("Failed to parse volume: {}", e))?;

        // Get 200 hourly candles for price history
        // Using localhost proxy to bypass HTTP authorization restrictions
        let klines_request = http::Request::get("http://localhost:3002/binance/klines?symbol=ETHUSDT&interval=1h&limit=200");
        let klines_response = self.runtime.http_request(klines_request);

        if klines_response.status != 200 {
            return Err(format!("Binance klines API error: {}", klines_response.status));
        }

        let klines: Vec<BinanceKline> = serde_json::from_slice(&klines_response.body)
            .map_err(|e| format!("Failed to parse klines: {}", e))?;

        let price_history: Vec<PricePoint> = klines.into_iter()
            .filter_map(|k| {
                Some(PricePoint {
                    timestamp: k.0,
                    open: k.1.parse().ok()?,
                    high: k.2.parse().ok()?,
                    low: k.3.parse().ok()?,
                    close: k.4.parse().ok()?,
                    volume: k.5.parse().ok()?,
                })
            })
            .collect();

        Ok(MarketSnapshot {
            timestamp: self.runtime.system_time().micros(),
            current_price,
            change_24h,
            volume_24h,
            price_history,
        })
    }

    /// Call inference.net API for LLM prediction (using Gemma 3 27B)
    /// API key is passed from service.rs and forwarded by the proxy
    fn call_inference_net(&self, market_data: &MarketSnapshot, api_key: &str) -> Result<Signal, String> {
        let system_prompt = "You are an expert cryptocurrency trader specializing in ETH price predictions.\nAnalyze market data using technical analysis and market psychology to provide clear trading signals.\nIMPORTANT: After your analysis, you MUST provide your final answer in the exact format specified.";

        let user_prompt = self.build_prompt(market_data);

        let body = serde_json::json!({
            "model": "google/gemma-3-27b-instruct/bf-16",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 1024
        });

        // Using localhost proxy to bypass HTTP authorization restrictions
        // Proxy transparently forwards the Authorization header to inference.net
        let request = http::Request::post(
            "http://localhost:3002/inference/chat/completions",
            serde_json::to_vec(&body).map_err(|e| format!("Failed to serialize request: {}", e))?
        )
        .with_header("Content-Type", b"application/json")
        .with_header("Authorization", format!("Bearer {}", api_key).as_bytes());

        let response = self.runtime.http_request(request);

        if response.status != 200 {
            return Err(format!("Inference.net API error: {} - {}", response.status, String::from_utf8_lossy(&response.body)));
        }

        let result: serde_json::Value = serde_json::from_slice(&response.body)
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let content = result["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| "No content in response".to_string())?;

        self.parse_llm_response(content, market_data)
    }

    /// Build prompt with market data
    fn build_prompt(&self, data: &MarketSnapshot) -> String {
        let ohlc: Vec<String> = data.price_history.iter().enumerate().map(|(i, candle)| {
            let hours_ago = data.price_history.len() - i;
            format!(
                "{}h ago: O=${:.2} H=${:.2} L=${:.2} C=${:.2} V={:.1}k",
                hours_ago, candle.open, candle.high, candle.low, candle.close, candle.volume / 1000.0
            )
        }).collect();

        format!(
            r#"Current ETH Market Data ({} hourly candles):
- Current Price: ${:.2}
- 24h Change: {:.2}%
- 24h Volume: ${}

Complete OHLC Candlesticks:
{}

Task: Predict ETH price movement in the next hour based on technical analysis.

At the END of your response, provide your final answer in this EXACT format:
ACTION: [BUY, SELL, or HOLD]
PRICE: [predicted price in USD, e.g., 3575.50]
CONFIDENCE: [0-100, e.g., 75]
REASONING: [max 200 chars explaining your technical analysis]"#,
            data.price_history.len(),
            data.current_price,
            data.change_24h,
            (data.volume_24h as u64).to_string(),
            ohlc.join("\n")
        )
    }

    /// Parse LLM response into Signal
    fn parse_llm_response(&self, content: &str, data: &MarketSnapshot) -> Result<Signal, String> {
        let mut action = Action::Hold;
        let mut predicted_price = data.current_price;
        let mut confidence = 50; // 50% default
        let mut reasoning = "No reasoning provided".to_string();

        for line in content.lines() {
            let trimmed = line.trim();

            if trimmed.starts_with("ACTION:") {
                let action_str = trimmed.split(':').nth(1).unwrap_or("").trim().to_uppercase();
                action = if action_str.contains("BUY") {
                    Action::Buy
                } else if action_str.contains("SELL") {
                    Action::Sell
                } else {
                    Action::Hold
                };
            } else if trimmed.starts_with("PRICE:") {
                let price_str = trimmed.split(':').nth(1).unwrap_or("").trim()
                    .replace("$", "").replace(",", "");
                if let Ok(price) = price_str.parse::<f64>() {
                    if price > 0.0 {
                        predicted_price = price;
                    }
                }
            } else if trimmed.starts_with("CONFIDENCE:") {
                let conf_str = trimmed.split(':').nth(1).unwrap_or("").trim()
                    .replace("%", "");
                if let Ok(conf) = conf_str.parse::<u64>() {
                    confidence = conf.min(100); // Clamp to 100
                }
            } else if trimmed.starts_with("REASONING:") {
                reasoning = trimmed.split(':').skip(1).collect::<Vec<&str>>().join(":")
                    .trim().chars().take(512).collect();
            }
        }

        // Convert to contract format (micro-USD and basis points)
        Ok(Signal {
            timestamp: data.timestamp,
            action,
            predicted_price_micro: (predicted_price * 1_000_000.0) as u64,
            confidence_bps: confidence * 100, // Convert 0-100 to basis points
            reasoning,
            actual_price_micro: None,
        })
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

/// GraphQL mutation root for bot predictions
struct BotMutationRoot {
    runtime: Arc<ServiceRuntime<BotStateService>>,
}

#[Object]
impl BotMutationRoot {
    /// Execute a prediction with the specified strategy
    ///
    /// Currently supports:
    /// - "gemma": Calls Gemma 3 27B via inference.net
    /// - "deepseek": Calls bot-service REST API (future)
    /// - "qwen-vertex": Calls bot-service REST API (future)
    /// - "gpt-oss-vertex": Calls bot-service REST API (future)
    ///
    /// Returns the generated signal or error message
    /// API key is passed through the proxy transparently to inference.net
    async fn execute_prediction(
        &self,
        strategy: String,
        api_key: Option<String>,
    ) -> Result<Signal, String> {
        // Create temporary service instance to access helper methods
        let state = BotState::load(self.runtime.root_view_storage_context())
            .await
            .map_err(|e| format!("Failed to load state: {}", e))?;

        let service = BotStateService {
            state,
            runtime: self.runtime.clone(),
        };

        // Fetch market data
        let market_data = service.fetch_market_data()?;

        // Route to appropriate strategy
        let signal = match strategy.as_str() {
            "gemma" => {
                let key = api_key.ok_or_else(|| "API key required for inference.net".to_string())?;
                service.call_inference_net(&market_data, &key)?
            }
            "deepseek" | "qwen-vertex" | "gpt-oss-vertex" => {
                // TODO: Call bot-service REST API
                return Err(format!("Strategy '{}' not yet implemented in service layer. Use bot-service directly.", strategy));
            }
            _ => {
                return Err(format!("Unknown strategy: {}", strategy));
            }
        };

        // Schedule operation to submit prediction
        self.runtime.schedule_operation(&Operation::SubmitPrediction {
            timestamp: signal.timestamp.to_string(),
            action: signal.action,
            predicted_price_micro: signal.predicted_price_micro.to_string(),
            confidence_bps: signal.confidence_bps,
            reasoning: signal.reasoning.clone(),
        });

        Ok(signal)
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
