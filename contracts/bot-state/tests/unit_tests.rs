use bot_state::{AccuracyMetrics, Action, Signal};

#[test]
fn test_signal_validation_success() {
    let signal = Signal {
        timestamp: 1000000,
        action: Action::Buy,
        predicted_price: 2500.0,
        confidence: 0.75,
        reasoning: "Strong momentum indicators".to_string(),
        actual_price: None,
    };

    assert!(signal.validate().is_ok());
}

#[test]
fn test_signal_validation_invalid_confidence() {
    let signal = Signal {
        timestamp: 1000000,
        action: Action::Buy,
        predicted_price: 2500.0,
        confidence: 1.5, // Invalid: > 1.0
        reasoning: "Test".to_string(),
        actual_price: None,
    };

    assert!(signal.validate().is_err());
}

#[test]
fn test_signal_validation_negative_price() {
    let signal = Signal {
        timestamp: 1000000,
        action: Action::Buy,
        predicted_price: -100.0, // Invalid
        confidence: 0.75,
        reasoning: "Test".to_string(),
        actual_price: None,
    };

    assert!(signal.validate().is_err());
}

#[test]
fn test_signal_validation_reasoning_too_long() {
    let long_reasoning = "x".repeat(513); // Invalid: > 512 chars
    let signal = Signal {
        timestamp: 1000000,
        action: Action::Buy,
        predicted_price: 2500.0,
        confidence: 0.75,
        reasoning: long_reasoning,
        actual_price: None,
    };

    assert!(signal.validate().is_err());
}

#[test]
fn test_directional_accuracy_buy_correct() {
    let signal = Signal {
        timestamp: 1000000,
        action: Action::Buy,
        predicted_price: 2600.0,
        confidence: 0.75,
        reasoning: "Bullish".to_string(),
        actual_price: Some(2550.0),
    };

    let previous_price = 2500.0;
    assert_eq!(signal.is_directionally_correct(previous_price), Some(true));
}

#[test]
fn test_directional_accuracy_buy_incorrect() {
    let signal = Signal {
        timestamp: 1000000,
        action: Action::Buy,
        predicted_price: 2600.0,
        confidence: 0.75,
        reasoning: "Bullish".to_string(),
        actual_price: Some(2450.0), // Price went down
    };

    let previous_price = 2500.0;
    assert_eq!(signal.is_directionally_correct(previous_price), Some(false));
}

#[test]
fn test_directional_accuracy_sell_correct() {
    let signal = Signal {
        timestamp: 1000000,
        action: Action::Sell,
        predicted_price: 2400.0,
        confidence: 0.75,
        reasoning: "Bearish".to_string(),
        actual_price: Some(2450.0), // Price went down
    };

    let previous_price = 2500.0;
    assert_eq!(signal.is_directionally_correct(previous_price), Some(true));
}

#[test]
fn test_directional_accuracy_hold_correct() {
    let signal = Signal {
        timestamp: 1000000,
        action: Action::Hold,
        predicted_price: 2500.0,
        confidence: 0.60,
        reasoning: "Consolidation".to_string(),
        actual_price: Some(2510.0), // Within 2% threshold
    };

    let previous_price = 2500.0;
    assert_eq!(signal.is_directionally_correct(previous_price), Some(true));
}

#[test]
fn test_accuracy_metrics_update() {
    let mut metrics = AccuracyMetrics::default();

    let signal = Signal {
        timestamp: 1000000,
        action: Action::Buy,
        predicted_price: 2600.0,
        confidence: 0.75,
        reasoning: "Test".to_string(),
        actual_price: Some(2550.0), // Correct direction
    };

    let previous_price = 2500.0;
    let current_time = 2000000;

    metrics.update(&signal, previous_price, current_time);

    assert_eq!(metrics.total_predictions, 1);
    assert_eq!(metrics.correct_predictions, 1);
    assert_eq!(metrics.directional_accuracy, 100.0);
    assert!(metrics.rmse > 0.0); // Should have some error
    assert_eq!(metrics.last_updated, current_time);
}

#[test]
fn test_accuracy_metrics_multiple_updates() {
    let mut metrics = AccuracyMetrics::default();
    let previous_price = 2500.0;

    // First signal: correct
    let signal1 = Signal {
        timestamp: 1000000,
        action: Action::Buy,
        predicted_price: 2600.0,
        confidence: 0.75,
        reasoning: "Test".to_string(),
        actual_price: Some(2550.0),
    };
    metrics.update(&signal1, previous_price, 1000000);

    // Second signal: incorrect
    let signal2 = Signal {
        timestamp: 2000000,
        action: Action::Sell,
        predicted_price: 2400.0,
        confidence: 0.70,
        reasoning: "Test".to_string(),
        actual_price: Some(2600.0), // Went up instead of down
    };
    metrics.update(&signal2, 2550.0, 2000000);

    assert_eq!(metrics.total_predictions, 2);
    assert_eq!(metrics.correct_predictions, 1);
    assert_eq!(metrics.directional_accuracy, 50.0);
}
