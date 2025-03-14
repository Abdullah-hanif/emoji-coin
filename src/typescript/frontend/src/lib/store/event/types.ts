import { type AnyPeriod, type Period } from "@sdk/const";
import { type SymbolEmoji } from "@sdk/emoji_data";
import {
  type MarketMetadataModel,
  type DatabaseModels,
  type BrokerEventModels,
} from "@sdk/indexer-v2/types";
import { type SubscribeBarsCallback } from "@static/charting_library/datafeed-api";
import { type LatestBar } from "./candlestick-bars";
import { type WritableDraft } from "immer";
import { type ClientState, type ClientActions } from "../websocket/store";
import { type ArenaActions, type ArenaState } from "../arena/store";
import { type Flatten } from "@sdk-types";

// Aliased to avoid repeating the type names over and over.
type Swap = DatabaseModels["swap_events"];
type Chat = DatabaseModels["chat_events"];
type MarketRegistration = DatabaseModels["market_registration_events"];
type MarketLatestStateEvent = DatabaseModels["market_latest_state_event"];
type Liquidity = DatabaseModels["liquidity_events"];
type GlobalState = DatabaseModels["global_state_events"];
type MarketLatestState = DatabaseModels["market_state"];

export type SymbolString = string;

export type CandlestickData = {
  callback: SubscribeBarsCallback | undefined;
  latestBar: LatestBar | undefined;
};

export type MarketStoreMetadata = Flatten<
  Omit<MarketMetadataModel, "time" | "marketNonce" | "trigger">
>;

export type MarketEventStore = {
  marketMetadata: MarketStoreMetadata;
  dailyVolume?: bigint;
  swapEvents: readonly Swap[];
  liquidityEvents: readonly Liquidity[];
  stateEvents: readonly (MarketLatestStateEvent | MarketLatestState)[];
  chatEvents: readonly Chat[];
  [Period.Period1M]: CandlestickData;
  [Period.Period5M]: CandlestickData;
  [Period.Period15M]: CandlestickData;
  [Period.Period30M]: CandlestickData;
  [Period.Period1H]: CandlestickData;
  [Period.Period4H]: CandlestickData;
  [Period.Period1D]: CandlestickData;
};

export type EventState = {
  guids: Readonly<Set<string>>;
  stateFirehose: readonly (MarketLatestStateEvent | MarketLatestState)[];
  marketRegistrations: readonly MarketRegistration[];
  markets: Readonly<Map<SymbolString, MarketEventStore>>;
  globalStateEvents: Readonly<GlobalState[]>;
};

export type PeriodSubscription = {
  marketEmojis: SymbolEmoji[];
  period: AnyPeriod;
  cb: SubscribeBarsCallback;
};

export type SetLatestBarsArgs = {
  marketMetadata: MarketStoreMetadata;
  latestBars: readonly LatestBar[];
};

export type EventActions = {
  getMarket: (m: SymbolEmoji[]) => undefined | Readonly<MarketEventStore>;
  getRegisteredMarkets: () => Readonly<EventState["markets"]>;
  loadMarketStateFromServer: (states: DatabaseModels["market_state"][]) => void;
  loadEventsFromServer: (events: BrokerEventModels[]) => void;
  pushEventsFromClient: (event: BrokerEventModels[], pushToLocalStorage?: boolean) => void;
  setLatestBars: ({ marketMetadata, latestBars }: SetLatestBarsArgs) => void;
  subscribeToPeriod: ({ marketEmojis, period, cb }: PeriodSubscription) => void;
  unsubscribeFromPeriod: ({ marketEmojis, period }: Omit<PeriodSubscription, "cb">) => void;
};

export type EventStore = EventState & EventActions & ArenaState & ArenaActions;

export type EventAndClientStore = EventState &
  EventActions &
  ClientState &
  ClientActions &
  ArenaState;

export type ImmerSetEventAndClientStore = (
  nextStateOrUpdater:
    | EventAndClientStore
    | Partial<EventAndClientStore>
    | ((state: WritableDraft<EventAndClientStore>) => void),
  shouldReplace?: boolean | undefined
) => void;

export type ImmerGetEventAndClientStore = () => EventAndClientStore;
