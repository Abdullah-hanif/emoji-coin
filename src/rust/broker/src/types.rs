use std::collections::HashSet;

use processor::emojicoin_dot_fun::{EmojicoinDbEventType, Period};
use serde::{Deserialize, Serialize};
use strum::{Display, EnumIter, EnumString};

#[derive(Serialize, Deserialize, Debug, EnumString, EnumIter, PartialEq, Eq, Display)]
pub enum EventType {
    Chat,
    Swap,
    Liquidity,
    State,
    GlobalState,
    PeriodicState,
    MarketRegistration,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum ArenaPeriodRequest {
    Subscribe { period: Period },
    Unsubscribe { period: Period },
}

#[derive(Serialize, Deserialize, Debug, Default, PartialEq, Eq)]
pub struct SubscriptionMessage {
    #[serde(default)]
    pub markets: Vec<u64>,
    #[serde(default)]
    pub event_types: Vec<EmojicoinDbEventType>,
    #[serde(default)]
    pub arena: bool,
    #[serde(default)]
    pub arena_period: Option<ArenaPeriodRequest>,
}

#[derive(Debug, PartialEq, Eq)]
pub struct ClientSubscription {
    pub markets: HashSet<u64>,
    pub event_types: HashSet<EmojicoinDbEventType>,
    pub arena: bool,
    pub arena_candlestick_periods: HashSet<Period>,
}

#[test]
fn deserialize_subscription_message() {
    assert_eq!(
        serde_json::from_str::<SubscriptionMessage>(
            r#"{ "markets": [1, 2, 3], "event_types": ["Chat"], "arena": true }"#,
        )
        .unwrap(),
        SubscriptionMessage {
            markets: vec![1, 2, 3],
            event_types: vec![EmojicoinDbEventType::Chat],
            arena: true,
            arena_period: None,
        },
    );

    assert_eq!(
        serde_json::from_str::<SubscriptionMessage>(
            r#"{
              "markets": [4, 2],
              "event_types": ["MarketRegistration"],
              "arena": false,
              "arena_period": { "action": "subscribe", "period": "FifteenSeconds" }
            }"#,
        )
        .unwrap(),
        SubscriptionMessage {
            markets: vec![4, 2],
            event_types: vec![EmojicoinDbEventType::MarketRegistration],
            arena: false,
            arena_period: Some(ArenaPeriodRequest::Subscribe {
                period: Period::FifteenSeconds
            }),
        },
    );

    assert_eq!(
        serde_json::from_str::<SubscriptionMessage>(
            r#"{ "markets": [7, 11], "event_types": ["Swap"], "arena": true }"#,
        )
        .unwrap(),
        SubscriptionMessage {
            markets: vec![7, 11],
            event_types: vec![EmojicoinDbEventType::Swap],
            arena: true,
            arena_period: None,
        },
    );
}

#[test]
fn deserialize_subscription_happy_path() {
    let json = r#"{
        "markets": [1, 2, 3],
        "event_types": [],
        "arena": true
    }"#;
    let sub: SubscriptionMessage = serde_json::from_str(json).unwrap();
    assert_eq!(sub.arena_period, None);

    let json2 = r#"{
        "markets": [1, 2, 3],
        "event_types": [],
        "arena_period": { "action": "subscribe", "period": "FifteenSeconds" }
    }"#;
    let sub2: SubscriptionMessage = serde_json::from_str(json2).unwrap();
    assert_eq!(
        sub2.arena_period,
        Some(ArenaPeriodRequest::Subscribe {
            period: Period::FifteenSeconds
        }),
    );

    let json3 = r#"{
        "markets": [1, 2, 3],
        "event_types": [],
        "arena_period": { "action": "unsubscribe", "period": "OneHour" },
        "arena": false
    }"#;
    let sub3: SubscriptionMessage = serde_json::from_str(json3).unwrap();
    assert_eq!(
        sub3.arena_period,
        Some(ArenaPeriodRequest::Unsubscribe {
            period: (Period::OneHour)
        })
    );
}

#[test]
fn subscription_idempotent_serialization_happy_path() {
    let sub = SubscriptionMessage {
        markets: vec![1, 2, 3],
        event_types: vec![EmojicoinDbEventType::Chat],
        arena: true,
        arena_period: Some(ArenaPeriodRequest::Unsubscribe {
            period: Period::FifteenMinutes,
        }),
    };

    let json = serde_json::to_string(&sub).unwrap();
    let sub_parsed: SubscriptionMessage = serde_json::from_str(json.as_str()).unwrap();
    assert_eq!(sub, sub_parsed);
}
