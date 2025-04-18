import Big from "big.js";

import { type Period, toArenaPeriod, toPeriod, toTrigger, type Trigger } from "../../const";
import { type MarketEmojiData, type SymbolEmoji, toMarketEmojiData } from "../../emoji_data";
import type { AccountAddressString, Uint64String } from "../../emojicoin_dot_fun";
import { calculateCurvePrice, type ReservesAndBondingCurveState } from "../../markets";
import {
  type AnyNumberString,
  CANDLESTICK_NAME,
  EVENT_NAMES,
  type Flatten,
  toCumulativeStats,
  toInstantaneousStats,
  toLastSwap,
  toReserves,
  type Types,
} from "../../types";
import {
  type AnyArenaEvent,
  ARENA_CANDLESTICK_NAME,
  safeParseBigIntOrPostgresTimestamp,
} from "../../types/arena-types";
import { deserializeToHexString, toAccountAddressString } from "../../utils";
import { q64ToBig } from "../../utils/nominal-price";
import {
  type BlockAndEventIndexMetadata,
  type DatabaseJsonType,
  DatabaseRpc,
  type DatabaseStructType,
  postgresTimestampToDate,
  postgresTimestampToMicroseconds,
  type ProcessedFields,
  TableName,
  type WithEmitTime,
} from "./json-types";

export type TransactionMetadata = {
  version: bigint;
  sender: AccountAddressString;
  entryFunction?: string | null;
  time: bigint;
  timestamp: Date;
  insertedAt: Date;
};

const toTransactionMetadata = (
  data: DatabaseStructType["TransactionMetadata"]
): TransactionMetadata => ({
  version: BigInt(data.transaction_version),
  sender: data.sender,
  entryFunction: data.entry_function,
  // The number of microseconds since the Unix epoch.
  time: postgresTimestampToMicroseconds(data.transaction_timestamp),
  // Note that we lose microsecond precision on the two `Date` fields; they're intended to be used
  // for bookkeeping and debug logs.
  timestamp: postgresTimestampToDate(data.transaction_timestamp),
  insertedAt: data.inserted_at ? postgresTimestampToDate(data.inserted_at) : new Date(0),
});

const toBlockAndEventIndex = (data: BlockAndEventIndexMetadata) =>
  data && data.block_number
    ? {
        blockNumber: BigInt(data.block_number),
        eventIndex: BigInt(data.event_index),
      }
    : undefined;

export type MarketMetadataModel = Flatten<
  {
    marketID: bigint;
    time: bigint;
    marketNonce: bigint;
    trigger: Trigger;
    symbolEmojis: Array<SymbolEmoji>;
    marketAddress: AccountAddressString;
  } & MarketEmojiData
>;

// To make things simpler, convert bumpTime and emitTime to `time`, and add the symbol data
// to the metadata.
const toMarketMetadataModel = (
  data:
    | DatabaseStructType["MarketAndStateMetadata"]
    | WithEmitTime<DatabaseStructType["MarketAndStateMetadata"]>
): MarketMetadataModel => {
  const symbolBytes = deserializeToHexString(data.symbol_bytes);

  return {
    marketID: BigInt(data.market_id),
    time: postgresTimestampToMicroseconds("bump_time" in data ? data.bump_time : data.emit_time),
    marketNonce: BigInt(data.market_nonce),
    trigger: toTrigger(data.trigger),
    marketAddress: toAccountAddressString(data.market_address),
    ...toMarketEmojiData(symbolBytes),
  };
};

const toLastSwapFromDatabase = (data: DatabaseStructType["LastSwapData"]): Types["LastSwap"] =>
  toLastSwap({
    is_sell: data.last_swap_is_sell,
    avg_execution_price_q64: data.last_swap_avg_execution_price_q64,
    base_volume: data.last_swap_base_volume,
    quote_volume: data.last_swap_quote_volume,
    nonce: data.last_swap_nonce,
    time: postgresTimestampToMicroseconds(data.last_swap_time).toString(),
  });

type WithoutEventNameIndexAndVersion<T extends AnyArenaEvent> = Omit<
  T,
  "eventName" | "eventIndex" | "version"
>;

const toArenaMeleeFromDatabase = (
  data: DatabaseStructType["ArenaMelee"]
): WithoutEventNameIndexAndVersion<Types["ArenaMeleeEvent"]> => ({
  meleeID: BigInt(data.melee_id),
  emojicoin0MarketAddress: toAccountAddressString(data.emojicoin_0_market_address),
  emojicoin1MarketAddress: toAccountAddressString(data.emojicoin_1_market_address),
  startTime: postgresTimestampToDate(data.start_time),
  duration: BigInt(data.duration),
  maxMatchPercentage: BigInt(data.max_match_percentage),
  maxMatchAmount: BigInt(data.max_match_amount),
  availableRewards: BigInt(data.available_rewards),
});

const toArenaEnterFromDatabase = (
  data: DatabaseStructType["ArenaEnter"]
): WithoutEventNameIndexAndVersion<Types["ArenaEnterEvent"]> => ({
  user: toAccountAddressString(data.user),
  meleeID: BigInt(data.melee_id),
  inputAmount: BigInt(data.input_amount),
  quoteVolume: BigInt(data.quote_volume),
  integratorFee: BigInt(data.integrator_fee),
  matchAmount: BigInt(data.match_amount),
  emojicoin0Proceeds: BigInt(data.emojicoin_0_proceeds),
  emojicoin1Proceeds: BigInt(data.emojicoin_1_proceeds),
  emojicoin0ExchangeRateBase: BigInt(data.emojicoin_0_exchange_rate_base),
  emojicoin0ExchangeRateQuote: BigInt(data.emojicoin_0_exchange_rate_quote),
  emojicoin1ExchangeRateBase: BigInt(data.emojicoin_1_exchange_rate_base),
  emojicoin1ExchangeRateQuote: BigInt(data.emojicoin_1_exchange_rate_quote),
});

const toArenaExitFromDatabase = (
  data: DatabaseStructType["ArenaExit"]
): WithoutEventNameIndexAndVersion<Types["ArenaExitEvent"]> => ({
  user: toAccountAddressString(data.user),
  meleeID: BigInt(data.melee_id),
  tapOutFee: BigInt(data.tap_out_fee),
  emojicoin0Proceeds: BigInt(data.emojicoin_0_proceeds),
  emojicoin1Proceeds: BigInt(data.emojicoin_1_proceeds),
  aptProceeds: BigInt(data.apt_proceeds),
  emojicoin0ExchangeRateBase: BigInt(data.emojicoin_0_exchange_rate_base),
  emojicoin0ExchangeRateQuote: BigInt(data.emojicoin_0_exchange_rate_quote),
  emojicoin1ExchangeRateBase: BigInt(data.emojicoin_1_exchange_rate_base),
  emojicoin1ExchangeRateQuote: BigInt(data.emojicoin_1_exchange_rate_quote),
  duringMelee: data.during_melee,
});

const toArenaSwapFromDatabase = (
  data: DatabaseStructType["ArenaSwap"]
): WithoutEventNameIndexAndVersion<Types["ArenaSwapEvent"]> => ({
  meleeID: BigInt(data.melee_id),
  user: toAccountAddressString(data.user),
  quoteVolume: BigInt(data.quote_volume),
  integratorFee: BigInt(data.integrator_fee),
  emojicoin0Proceeds: BigInt(data.emojicoin_0_proceeds),
  emojicoin1Proceeds: BigInt(data.emojicoin_1_proceeds),
  emojicoin0ExchangeRateBase: BigInt(data.emojicoin_0_exchange_rate_base),
  emojicoin0ExchangeRateQuote: BigInt(data.emojicoin_0_exchange_rate_quote),
  emojicoin1ExchangeRateBase: BigInt(data.emojicoin_1_exchange_rate_base),
  emojicoin1ExchangeRateQuote: BigInt(data.emojicoin_1_exchange_rate_quote),
  duringMelee: data.during_melee,
});

const toArenaVaultBalanceUpdateFromDatabase = (
  data: DatabaseStructType["ArenaVaultBalanceUpdate"]
): WithoutEventNameIndexAndVersion<Types["ArenaVaultBalanceUpdateEvent"]> => ({
  newBalance: BigInt(data.new_balance),
});

const toArenaPositionFromDatabase = (
  data: DatabaseStructType["ArenaPosition"]
): Types["ArenaPosition"] => ({
  meleeID: BigInt(data.melee_id),
  version: BigInt(data.last_transaction_version),
  user: toAccountAddressString(data.user),
  open: data.open,
  emojicoin0Balance: BigInt(data.emojicoin_0_balance),
  emojicoin1Balance: BigInt(data.emojicoin_1_balance),
  withdrawals: BigInt(data.withdrawals),
  deposits: BigInt(data.deposits),
  lastExit0: data.last_exit_0,
  matchAmount: BigInt(data.match_amount),
});

const toArenaLeaderboardFromDatabase = (
  data: DatabaseStructType["ArenaLeaderboard"]
): Types["ArenaLeaderboard"] => ({
  user: toAccountAddressString(data.user),
  version: BigInt(data.last_transaction_version),
  open: data.open,
  emojicoin0Balance: BigInt(data.emojicoin_0_balance),
  emojicoin1Balance: BigInt(data.emojicoin_1_balance),
  profits: BigInt(data.profits),
  losses: BigInt(data.losses),
  pnlPercent: data.pnl_percent,
  pnlOctas: data.pnl_octas,
  withdrawals: BigInt(data.withdrawals),
});

const toAptLocked = (reserves: ReservesAndBondingCurveState, locked: bigint) => {
  const curvePrice = calculateCurvePrice(reserves);
  const bigLocked = Big(locked.toString());
  const roundedResult = curvePrice.mul(bigLocked).round(0, Big.roundHalfEven);
  return BigInt(roundedResult.toString());
};

export const toTotalAptLocked = (args: {
  market0: {
    state: MarketStateModel["state"];
    locked: ArenaInfoModel["emojicoin0Locked"];
  };
  market1: {
    state: MarketStateModel["state"];
    locked: ArenaInfoModel["emojicoin1Locked"];
  };
}): bigint => {
  const { market0, market1 } = args;
  return toAptLocked(market0.state, market0.locked) + toAptLocked(market1.state, market1.locked);
};

const toArenaInfoFromDatabase = (data: DatabaseStructType["ArenaInfo"]): Types["ArenaInfo"] => ({
  meleeID: BigInt(data.melee_id),
  version: BigInt(data.last_transaction_version),
  volume: BigInt(data.volume),
  rewardsRemaining: BigInt(data.rewards_remaining),
  emojicoin0Locked: BigInt(data.emojicoin_0_locked),
  emojicoin1Locked: BigInt(data.emojicoin_1_locked),
  emojicoin0MarketAddress: toAccountAddressString(data.emojicoin_0_market_address),
  emojicoin0Symbols: data.emojicoin_0_symbols,
  emojicoin0MarketID: BigInt(data.emojicoin_0_market_id),
  emojicoin1MarketAddress: toAccountAddressString(data.emojicoin_1_market_address),
  emojicoin1Symbols: data.emojicoin_1_symbols,
  emojicoin1MarketID: BigInt(data.emojicoin_1_market_id),
  startTime: postgresTimestampToDate(data.start_time),
  duration: BigInt(data.duration),
  maxMatchPercentage: BigInt(data.max_match_percentage),
  maxMatchAmount: BigInt(data.max_match_amount),
});

const toArenaCandlestickFromDatabase = (
  data: DatabaseStructType["ArenaCandlestick"]
): Types["ArenaCandlestick"] => ({
  meleeID: BigInt(data.melee_id),
  version: BigInt(data.last_transaction_version),
  volume: BigInt(data.volume),
  period: toArenaPeriod(data.period),
  startTime: safeParseBigIntOrPostgresTimestamp(data.start_time),
  openPrice: Number(data.open_price),
  closePrice: Number(data.close_price),
  highPrice: Number(data.high_price),
  lowPrice: Number(data.low_price),
  nSwaps: BigInt(data.n_swaps),
});

const toArenaLeaderboardHistoryFromDatabase = (
  data: DatabaseStructType["ArenaLeaderboardHistory"]
): Types["ArenaLeaderboardHistory"] => ({
  user: toAccountAddressString(data.user),
  version: BigInt(data.last_transaction_version),
  meleeID: BigInt(data.melee_id),
  profits: BigInt(data.profits),
  losses: BigInt(data.losses),
  lastExit0: data.last_exit_0,
  exited: data.exited,
  withdrawals: BigInt(data.withdrawals),
  emojicoin0Balance: BigInt(data.emojicoin_0_balance),
  emojicoin1Balance: BigInt(data.emojicoin_1_balance),
});

type GlobalStateEventData = {
  emitTime: bigint;
  registryNonce: bigint;
  trigger: Trigger;
  cumulativeQuoteVolume: bigint;
  totalQuoteLocked: bigint;
  totalValueLocked: bigint;
  marketCap: bigint;
  fullyDilutedValue: bigint;
  cumulativeIntegratorFees: bigint;
  cumulativeSwaps: bigint;
  cumulativeChatMessages: bigint;
};

const toGlobalStateEventData = (
  data: DatabaseStructType["GlobalStateEventData"]
): GlobalStateEventData => ({
  emitTime: postgresTimestampToMicroseconds(data.emit_time),
  registryNonce: BigInt(data.registry_nonce),
  trigger: toTrigger(data.trigger),
  cumulativeQuoteVolume: BigInt(data.cumulative_quote_volume),
  totalQuoteLocked: BigInt(data.total_quote_locked),
  totalValueLocked: BigInt(data.total_value_locked),
  marketCap: BigInt(data.market_cap),
  fullyDilutedValue: BigInt(data.fully_diluted_value),
  cumulativeIntegratorFees: BigInt(data.cumulative_integrator_fees),
  cumulativeSwaps: BigInt(data.cumulative_swaps),
  cumulativeChatMessages: BigInt(data.cumulative_chat_messages),
});

type PeriodicStateMetadata = {
  period: Period;
  startTime: bigint;
};

const toPeriodicStateMetadata = (
  data: DatabaseStructType["PeriodicStateMetadata"]
): PeriodicStateMetadata => ({
  period: toPeriod(data.period),
  startTime: postgresTimestampToMicroseconds(data.start_time),
});

type PeriodicStateEventData = {
  openPriceQ64: bigint;
  highPriceQ64: bigint;
  lowPriceQ64: bigint;
  closePriceQ64: bigint;
  volumeBase: bigint;
  volumeQuote: bigint;
  integratorFees: bigint;
  poolFeesBase: bigint;
  poolFeesQuote: bigint;
  numSwaps: bigint;
  numChatMessages: bigint;
  startsInBondingCurve: boolean;
  endsInBondingCurve: boolean;
  tvlPerLPCoinGrowthQ64: bigint;
};

const toPeriodicStateEventData = (
  data: DatabaseStructType["PeriodicStateEventData"]
): PeriodicStateEventData => ({
  openPriceQ64: BigInt(data.open_price_q64),
  highPriceQ64: BigInt(data.high_price_q64),
  lowPriceQ64: BigInt(data.low_price_q64),
  closePriceQ64: BigInt(data.close_price_q64),
  volumeBase: BigInt(data.volume_base),
  volumeQuote: BigInt(data.volume_quote),
  integratorFees: BigInt(data.integrator_fees),
  poolFeesBase: BigInt(data.pool_fees_base),
  poolFeesQuote: BigInt(data.pool_fees_quote),
  numSwaps: BigInt(data.n_swaps),
  numChatMessages: BigInt(data.n_chat_messages),
  startsInBondingCurve: data.starts_in_bonding_curve,
  endsInBondingCurve: data.ends_in_bonding_curve,
  tvlPerLPCoinGrowthQ64: BigInt(data.tvl_per_lp_coin_growth_q64),
});

type MarketRegistrationEventData = {
  registrant: AccountAddressString;
  integrator: AccountAddressString;
  integratorFee: bigint;
};

const toMarketRegistrationEventData = (
  data: DatabaseStructType["MarketRegistrationEventData"]
): MarketRegistrationEventData => ({
  registrant: data.registrant,
  integrator: data.integrator,
  integratorFee: BigInt(data.integrator_fee),
});

type SwapEventData = {
  swapper: AccountAddressString;
  sender: AccountAddressString;
  integrator: AccountAddressString;
  integratorFee: bigint;
  inputAmount: bigint;
  isSell: boolean;
  integratorFeeRateBPs: number;
  netProceeds: bigint;
  baseVolume: bigint;
  quoteVolume: bigint;
  avgExecutionPriceQ64: bigint;
  poolFee: bigint;
  startsInBondingCurve: boolean;
  resultsInStateTransition: boolean;
  balanceAsFractionOfCirculatingSupplyBeforeQ64: bigint;
  balanceAsFractionOfCirculatingSupplyAfterQ64: bigint;
};

const toSwapEventData = (data: DatabaseStructType["SwapEventData"]): SwapEventData => ({
  swapper: data.swapper,
  sender: data.sender,
  integrator: data.integrator,
  integratorFee: BigInt(data.integrator_fee),
  inputAmount: BigInt(data.input_amount),
  isSell: data.is_sell,
  integratorFeeRateBPs: Number(data.integrator_fee_rate_bps),
  netProceeds: BigInt(data.net_proceeds),
  baseVolume: BigInt(data.base_volume),
  quoteVolume: BigInt(data.quote_volume),
  avgExecutionPriceQ64: BigInt(data.avg_execution_price_q64),
  poolFee: BigInt(data.pool_fee),
  startsInBondingCurve: data.starts_in_bonding_curve,
  resultsInStateTransition: data.results_in_state_transition,
  balanceAsFractionOfCirculatingSupplyBeforeQ64: BigInt(
    data.balance_as_fraction_of_circulating_supply_before_q64
  ),
  balanceAsFractionOfCirculatingSupplyAfterQ64: BigInt(
    data.balance_as_fraction_of_circulating_supply_after_q64
  ),
});

type LiquidityEventData = {
  provider: AccountAddressString;
  baseAmount: bigint;
  quoteAmount: bigint;
  lpCoinAmount: bigint;
  liquidityProvided: boolean;
  baseDonationClaimAmount: bigint;
  quoteDonationClaimAmount: bigint;
};

const toLiquidityEventData = (
  data: DatabaseStructType["LiquidityEventData"]
): LiquidityEventData => ({
  provider: data.provider,
  baseAmount: BigInt(data.base_amount),
  quoteAmount: BigInt(data.quote_amount),
  lpCoinAmount: BigInt(data.lp_coin_amount),
  liquidityProvided: data.liquidity_provided,
  baseDonationClaimAmount: BigInt(data.base_donation_claim_amount),
  quoteDonationClaimAmount: BigInt(data.quote_donation_claim_amount),
});

type ChatEventData = {
  user: AccountAddressString;
  message: string;
  userEmojicoinBalance: bigint;
  circulatingSupply: bigint;
  balanceAsFractionOfCirculatingSupplyQ64: bigint;
};

const toChatEventData = (data: DatabaseStructType["ChatEventData"]): ChatEventData => ({
  user: toAccountAddressString(data.user),
  message: data.message,
  userEmojicoinBalance: BigInt(data.user_emojicoin_balance),
  circulatingSupply: BigInt(data.circulating_supply),
  balanceAsFractionOfCirculatingSupplyQ64: BigInt(
    data.balance_as_fraction_of_circulating_supply_q64
  ),
});

export type StateEventData = {
  clammVirtualReserves: Types["Reserves"];
  cpammRealReserves: Types["Reserves"];
  lpCoinSupply: bigint;
  cumulativeStats: Types["CumulativeStats"];
  instantaneousStats: Types["InstantaneousStats"];
};

const toStateEventData = (data: DatabaseStructType["StateEventData"]): StateEventData => ({
  clammVirtualReserves: toReserves({
    base: data.clamm_virtual_reserves_base,
    quote: data.clamm_virtual_reserves_quote,
  }),
  cpammRealReserves: toReserves({
    base: data.cpamm_real_reserves_base,
    quote: data.cpamm_real_reserves_quote,
  }),
  lpCoinSupply: BigInt(data.lp_coin_supply),
  cumulativeStats: toCumulativeStats({
    base_volume: data.cumulative_stats_base_volume,
    quote_volume: data.cumulative_stats_quote_volume,
    integrator_fees: data.cumulative_stats_integrator_fees,
    pool_fees_base: data.cumulative_stats_pool_fees_base,
    pool_fees_quote: data.cumulative_stats_pool_fees_quote,
    n_swaps: data.cumulative_stats_n_swaps,
    n_chat_messages: data.cumulative_stats_n_chat_messages,
  }),
  instantaneousStats: toInstantaneousStats({
    total_quote_locked: data.instantaneous_stats_total_quote_locked,
    total_value_locked: data.instantaneous_stats_total_value_locked,
    market_cap: data.instantaneous_stats_market_cap,
    fully_diluted_value: data.instantaneous_stats_fully_diluted_value,
  }),
});

export type GlobalStateEventModel = ReturnType<typeof toGlobalStateEventModel>;
export type PeriodicStateEventModel = ReturnType<typeof toPeriodicStateEventModel>;
export type MarketRegistrationEventModel = ReturnType<typeof toMarketRegistrationEventModel>;
export type SwapEventModel = ReturnType<typeof toSwapEventModel>;
export type ChatEventModel = ReturnType<typeof toChatEventModel>;
export type LiquidityEventModel = ReturnType<typeof toLiquidityEventModel>;
export type MarketLatestStateEventModel = ReturnType<typeof toMarketLatestStateEventModel>;
export type UserLiquidityPoolsModel = ReturnType<typeof toUserLiquidityPoolsModel>;
export type MarketDailyVolumeModel = ReturnType<typeof toMarketDailyVolumeModel>;
export type Market1MPeriodsInLastDayModel = ReturnType<typeof toMarket1MPeriodsInLastDay>;
export type MarketStateModel = ReturnType<typeof toMarketStateModel>;
export type ProcessorStatusModel = ReturnType<typeof toProcessorStatus>;
export type PriceFeedModel = ReturnType<typeof toPriceFeed>;
export type CandlestickModel = ReturnType<typeof toCandlestickModel>;
export type ArenaMeleeModel = ReturnType<typeof toArenaMeleeModel>;
export type ArenaEnterModel = ReturnType<typeof toArenaEnterModel>;
export type ArenaExitModel = ReturnType<typeof toArenaExitModel>;
export type ArenaSwapModel = ReturnType<typeof toArenaSwapModel>;
export type ArenaVaultBalanceUpdateModel = ReturnType<typeof toArenaVaultBalanceUpdateModel>;
export type ArenaPositionModel = ReturnType<typeof toArenaPositionModel>;
export type ArenaLeaderboardModel = ReturnType<typeof toArenaLeaderboardModel>;
export type ArenaLeaderboardHistoryModel = ReturnType<typeof toArenaLeaderboardHistoryModel>;
export type ArenaInfoModel = ReturnType<typeof toArenaInfoModel>;
export type ArenaCandlestickModel = ReturnType<typeof toArenaCandlestickModel>;
export type UserPoolsRPCModel = ReturnType<typeof toUserPoolsRPCResponse>;
export type AggregateMarketStateModel = ReturnType<typeof toAggregateMarketState>;
export type ArenaLeaderboardHistoryWithArenaInfoModel = ReturnType<
  typeof toArenaLeaderboardHistoryWithArenaInfo
>;

/**
 * Converts a function that converts a type to another type into a function that converts the type
 * to an object with a single key.
 *
 * We do this for the database Model conversion functions.
 *
 * See the example for a better understanding.
 * @example
 * ```ts
 * const toBigInt = (data: string) => BigInt(data);
 * const toNamedBigInt = curryToNamedType(toBigInt, "bigInt");
 * const data = "123";
 * const result = toNamedBigInt(data);
 *
 * assert!(result.bigInt === 123n);
 * ```
 */
const curryToNamedType =
  <T, U, K extends string>(to: (data: T) => U, name: K) =>
  (data: T): { [P in K]: U } =>
    ({ [name]: to(data) }) as { [P in K]: U };

export const withTransactionMetadata = curryToNamedType(toTransactionMetadata, "transaction");
export const withMarketAndStateMetadataAndBumpTime = curryToNamedType(
  toMarketMetadataModel,
  "market"
);
export const withMarketAndStateMetadataAndEmitTime = curryToNamedType(
  toMarketMetadataModel,
  "market"
);
/// The `blockAndEvent` field is only set when fetched from the DB- otherwise it's `undefined`.
export const withBlockAndEventIndex = curryToNamedType(toBlockAndEventIndex, "blockAndEvent");
export const withLastSwap = curryToNamedType(toLastSwapFromDatabase, "lastSwap");
export const withGlobalStateEventData = curryToNamedType(toGlobalStateEventData, "globalState");
export const withPeriodicStateMetadata = curryToNamedType(
  toPeriodicStateMetadata,
  "periodicMetadata"
);
export const withPeriodicStateEventData = curryToNamedType(
  toPeriodicStateEventData,
  "periodicState"
);
export const withMarketRegistrationEventData = curryToNamedType(
  toMarketRegistrationEventData,
  "marketRegistration"
);
export const withSwapEventData = curryToNamedType(toSwapEventData, "swap");
export const withChatEventData = curryToNamedType(toChatEventData, "chat");
export const withLiquidityEventData = curryToNamedType(toLiquidityEventData, "liquidity");
export const withStateEventData = curryToNamedType(toStateEventData, "state");
export const withLastSwapData = curryToNamedType(toLastSwapFromDatabase, "lastSwap");
export const withArenaMeleeData = curryToNamedType(toArenaMeleeFromDatabase, "melee");
export const withArenaEnterData = curryToNamedType(toArenaEnterFromDatabase, "enter");
export const withArenaExitData = curryToNamedType(toArenaExitFromDatabase, "exit");
export const withArenaSwapData = curryToNamedType(toArenaSwapFromDatabase, "swap");
export const withArenaVaultBalanceUpdateData = curryToNamedType(
  toArenaVaultBalanceUpdateFromDatabase,
  "arenaVaultBalanceUpdate"
);

const formatEmojis = <T extends { symbol_emojis: SymbolEmoji[] } | { symbolEmojis: SymbolEmoji[] }>(
  data: T
) => {
  if ("symbol_emojis" in data) {
    return `${data.symbol_emojis.join("")}` as const;
  }
  return `${data.symbolEmojis.join("")}` as const;
};

const getMarketNonce = <T extends { market_nonce: string } | { marketNonce: bigint }>(data: T) => {
  if ("market_nonce" in data) {
    return data.market_nonce;
  }
  return data.marketNonce;
};

type TxnVersionAndIndex<
  T extends
    | TableName.ArenaEnterEvents
    | TableName.ArenaExitEvents
    | TableName.ArenaMeleeEvents
    | TableName.ArenaSwapEvents,
> = Pick<DatabaseJsonType[T], "transaction_version" | "event_index" | "melee_id">;

export const GuidGetters = {
  globalStateEvent: (data: DatabaseJsonType["global_state_events"] | GlobalStateEventData) => {
    const eventName = EVENT_NAMES.GlobalState;
    const registryNonce = "registry_nonce" in data ? data.registry_nonce : data.registryNonce;
    return {
      eventName,
      guid: `${eventName}::${registryNonce}` as const,
    };
  },
  periodicStateEvent: (
    data: DatabaseJsonType["periodic_state_events"] | (MarketMetadataModel & { period: Period })
  ) => {
    const eventName = EVENT_NAMES.PeriodicState;
    const periodAndMarketNonce = `${toPeriod(data.period)}::${getMarketNonce(data)}` as const;
    return {
      eventName,
      guid: `${formatEmojis(data)}::${eventName}::${periodAndMarketNonce}` as const,
    };
  },
  marketRegistrationEvent: (
    data: DatabaseJsonType["market_registration_events"] | MarketMetadataModel
  ) => ({
    eventName: EVENT_NAMES.MarketRegistration,
    guid: `${formatEmojis(data)}::${EVENT_NAMES.MarketRegistration}::` as const,
  }),
  swapEvent: (data: DatabaseJsonType["swap_events"] | MarketMetadataModel) => ({
    eventName: EVENT_NAMES.Swap,
    guid: `${formatEmojis(data)}::${EVENT_NAMES.Swap}::${getMarketNonce(data)}` as const,
  }),
  chatEvent: (data: DatabaseJsonType["chat_events"] | MarketMetadataModel) => ({
    eventName: EVENT_NAMES.Chat,
    guid: `${formatEmojis(data)}::${EVENT_NAMES.Chat}::${getMarketNonce(data)}` as const,
  }),
  liquidityEvent: (data: DatabaseJsonType["liquidity_events"] | MarketMetadataModel) => ({
    eventName: EVENT_NAMES.Liquidity,
    guid: `${formatEmojis(data)}::${EVENT_NAMES.Liquidity}::${getMarketNonce(data)}` as const,
  }),
  marketLatestStateEvent: <
    T extends DatabaseJsonType["market_latest_state_event"] | MarketMetadataModel,
  >(
    data: T
  ) => ({
    eventName: EVENT_NAMES.State,
    guid: `${formatEmojis(data)}::${EVENT_NAMES.State}::${getMarketNonce(data)}` as const,
  }),
  candlestick: ({ market_id, start_time, period }: DatabaseJsonType["candlesticks"]) => ({
    // Not a real module-emitted event, but used to classify the type of data.
    eventName: CANDLESTICK_NAME,
    guid: `${CANDLESTICK_NAME}::${market_id}::${period}::${start_time}`,
  }),
  arenaEnterEvent: ({
    melee_id,
    transaction_version: version,
    event_index,
  }: TxnVersionAndIndex<TableName.ArenaEnterEvents>) => ({
    eventName: EVENT_NAMES.ArenaEnter,
    guid: `${EVENT_NAMES.ArenaEnter}::${melee_id}::${version}::${event_index}` as const,
  }),
  arenaExitEvent: ({
    melee_id,
    transaction_version: version,
    event_index,
  }: TxnVersionAndIndex<TableName.ArenaExitEvents>) => ({
    eventName: EVENT_NAMES.ArenaExit,
    guid: `${EVENT_NAMES.ArenaExit}::${melee_id}::${version}::${event_index}` as const,
  }),
  arenaMeleeEvent: ({
    melee_id,
    transaction_version: version,
    event_index,
  }: TxnVersionAndIndex<TableName.ArenaMeleeEvents>) => ({
    eventName: EVENT_NAMES.ArenaMelee,
    guid: `${EVENT_NAMES.ArenaMelee}::${melee_id}::${version}::${event_index}` as const,
  }),
  arenaSwapEvent: ({
    melee_id,
    transaction_version: version,
    event_index,
  }: TxnVersionAndIndex<TableName.ArenaSwapEvents>) => ({
    eventName: EVENT_NAMES.ArenaSwap,
    guid: `${EVENT_NAMES.ArenaSwap}::${melee_id}::${version}::${event_index}` as const,
  }),
  arenaVaultBalanceUpdate: ({
    sender,
    transaction_version: version,
    event_index,
  }: Pick<
    DatabaseJsonType["arena_vault_balance_update_events"],
    "sender" | "transaction_version" | "event_index"
  >) => ({
    eventName: EVENT_NAMES.ArenaVaultBalanceUpdate,
    guid: `${EVENT_NAMES.ArenaVaultBalanceUpdate}::${sender}::${version}::${event_index}` as const,
  }),
  arenaCandlestick: ({
    melee_id,
    start_time,
    period,
    last_transaction_version: version,
  }: DatabaseJsonType["arena_candlesticks"]) => ({
    // Not a real module-emitted event, but used to classify the type of data.
    eventName: ARENA_CANDLESTICK_NAME,
    guid: `${ARENA_CANDLESTICK_NAME}::${melee_id}::${period}::${start_time}::${version}`,
  }),
};

export const toGlobalStateEventModel = (data: DatabaseJsonType["global_state_events"]) => ({
  ...withTransactionMetadata(data),
  ...withGlobalStateEventData(data),
  ...GuidGetters.globalStateEvent(data),
});

export const toPeriodicStateEventModel = (data: DatabaseJsonType["periodic_state_events"]) => ({
  ...withTransactionMetadata(data),
  ...withMarketAndStateMetadataAndEmitTime(data),
  ...withLastSwap(data),
  ...withPeriodicStateMetadata(data),
  ...withPeriodicStateEventData(data),
  ...withLastSwapData(data),
  ...GuidGetters.periodicStateEvent(data),
});

export const toMarketRegistrationEventModel = (
  data: DatabaseJsonType["market_registration_events"]
) => ({
  ...withTransactionMetadata(data),
  ...withMarketAndStateMetadataAndBumpTime(data),
  ...withMarketRegistrationEventData(data),
  ...GuidGetters.marketRegistrationEvent(data),
});

export const toSwapEventModel = (data: DatabaseJsonType["swap_events"]) => ({
  ...withTransactionMetadata(data),
  ...withMarketAndStateMetadataAndBumpTime(data),
  ...withSwapEventData(data),
  ...withStateEventData(data),
  ...withBlockAndEventIndex(data),
  ...GuidGetters.swapEvent(data),
});

export const toChatEventModel = (data: DatabaseJsonType["chat_events"]) => ({
  ...withTransactionMetadata(data),
  ...withMarketAndStateMetadataAndBumpTime(data),
  ...withChatEventData(data),
  ...withStateEventData(data),
  ...withLastSwapData(data),
  ...GuidGetters.chatEvent(data),
});

export const toLiquidityEventModel = (data: DatabaseJsonType["liquidity_events"]) => ({
  ...withTransactionMetadata(data),
  ...withMarketAndStateMetadataAndBumpTime(data),
  ...withLiquidityEventData(data),
  ...withStateEventData(data),
  ...withLastSwapData(data),
  ...withBlockAndEventIndex(data),
  ...GuidGetters.liquidityEvent(data),
});

// Note that daily TVL defaults to `0` since that's the initial value in the database.
export const toProcessedData = (
  data: ProcessedFields & { daily_tvl_per_lp_coin_growth_q64?: string }
) => ({
  dailyTvlPerLPCoinGrowth: Big(data.daily_tvl_per_lp_coin_growth ?? 0).toString(),
  inBondingCurve: data.in_bonding_curve,
  volumeIn1MStateTracker: BigInt(data.volume_in_1m_state_tracker),
  baseVolumeIn1MStateTracker: BigInt(data.base_volume_in_1m_state_tracker),
});

export const toMarketLatestStateEventModel = (
  data: DatabaseJsonType["market_latest_state_event"]
) => ({
  ...withTransactionMetadata(data),
  ...withMarketAndStateMetadataAndBumpTime(data),
  ...withStateEventData(data),
  ...withLastSwapData(data),
  ...toProcessedData(data),
  ...GuidGetters.marketLatestStateEvent(data),
});

export const toMarketStateModel = (data: DatabaseJsonType["market_state"]) => ({
  ...toMarketLatestStateEventModel(data),
  dailyVolume: BigInt(data.daily_volume),
  dailyBaseVolume: BigInt(data.daily_base_volume),
});

const toCandlestickFromDatabase = (
  data: DatabaseStructType["Candlestick"]
): Types["Candlestick"] => ({
  marketID: BigInt(data.market_id),
  version: BigInt(data.last_transaction_version),
  volume: BigInt(data.volume),
  period: toArenaPeriod(data.period),
  startTime: safeParseBigIntOrPostgresTimestamp(data.start_time),
  openPrice: Number(data.open_price),
  closePrice: Number(data.close_price),
  highPrice: Number(data.high_price),
  lowPrice: Number(data.low_price),
  symbolEmojis: data.symbol_emojis,
});

export const toTransactionMetadataForUserLiquidityPools = (
  transaction: TransactionMetadata
): Omit<TransactionMetadata, "sender" | "entryFunction"> => ({
  time: transaction.time,
  version: transaction.version,
  timestamp: transaction.timestamp,
  insertedAt: transaction.insertedAt,
});

export const withLPCoinBalance = <T extends { lp_coin_balance: Uint64String }>(data: T) => ({
  lpCoinBalance: BigInt(data.lp_coin_balance),
});

export const toUserLiquidityPoolsModel = (data: DatabaseJsonType["user_liquidity_pools"]) => {
  const { transaction: withExtraFields } = withTransactionMetadata({
    ...data,
    sender: "0x",
    entry_function: "",
  });

  const transaction = toTransactionMetadataForUserLiquidityPools(withExtraFields);

  return {
    transaction,
    ...withMarketAndStateMetadataAndEmitTime(data),
    ...withLiquidityEventData(data),
    ...withLPCoinBalance(data),
  };
};

export const toMarketDailyVolumeModel = (data: DatabaseJsonType["market_daily_volume"]) => ({
  marketID: BigInt(data.market_id),
  dailyVolume: BigInt(data.daily_volume),
});

export const toMarket1MPeriodsInLastDay = (
  data: DatabaseJsonType["market_1m_periods_in_last_day"]
) => ({
  marketID: BigInt(data.market_id),
  transactionVersion: BigInt(data.transaction_version),
  insertedAt: data.inserted_at ? postgresTimestampToDate(data.inserted_at) : new Date(0),
  nonce: BigInt(data.nonce),
  volume: BigInt(data.volume),
  baseVolume: BigInt(data.base_volume),
  startTime: postgresTimestampToDate(data.start_time),
});

export const toProcessorStatus = (data: DatabaseJsonType["processor_status"]) => ({
  processor: data.processor,
  lastSuccessVersion: data.last_success_version,
  lastUpdated: postgresTimestampToDate(data.last_updated),
  lastTransactionTimestamp: postgresTimestampToDate(data.last_transaction_timestamp),
});

export const toUserPoolsRPCResponse = (data: DatabaseJsonType["user_pools"]) => ({
  ...withTransactionMetadata(data),
  ...withMarketAndStateMetadataAndBumpTime(data),
  ...withStateEventData(data),
  ...toProcessedData(data),
  ...withLPCoinBalance(data),
  dailyVolume: BigInt(data.daily_volume),
});

export const toArenaLeaderboardHistoryWithArenaInfo = (
  data: DatabaseJsonType["arena_leaderboard_history_with_arena_info"]
): Types["ArenaLeaderboardHistoryWithArenaInfo"] => ({
  user: data.user,
  meleeID: BigInt(data.melee_id),
  profits: BigInt(data.profits),
  losses: BigInt(data.losses),
  withdrawals: BigInt(data.withdrawals),
  emojicoin0Balance: BigInt(data.emojicoin_0_balance),
  emojicoin1Balance: BigInt(data.emojicoin_1_balance),
  lastExit0: data.last_exit_0,
  exited: data.exited,

  emojicoin0Symbols: data.emojicoin_0_symbols,
  emojicoin1Symbols: data.emojicoin_1_symbols,
  emojicoin0MarketAddress: data.emojicoin_0_market_address,
  emojicoin1MarketAddress: data.emojicoin_1_market_address,
  emojicoin0MarketID: BigInt(data.emojicoin_0_market_id),
  emojicoin1MarketID: BigInt(data.emojicoin_1_market_id),
  startTime: postgresTimestampToDate(data.start_time),
  duration: BigInt(data.duration),

  leaderboardHistoryLastTransactionVersion: BigInt(
    data.leaderboard_history_last_transaction_version
  ),
  arenaInfoLastTransactionVersion: BigInt(data.arena_info_last_transaction_version),
});

export const toArenaMeleeModel = (data: DatabaseJsonType["arena_melee_events"]) => ({
  ...withTransactionMetadata(data),
  ...withArenaMeleeData(data),
  ...GuidGetters.arenaMeleeEvent(data),
});

export const toArenaEnterModel = (data: DatabaseJsonType["arena_enter_events"]) => ({
  ...withTransactionMetadata(data),
  ...withArenaEnterData(data),
  ...GuidGetters.arenaEnterEvent(data),
});

export const toArenaExitModel = (data: DatabaseJsonType["arena_exit_events"]) => ({
  ...withTransactionMetadata(data),
  ...withArenaExitData(data),
  ...GuidGetters.arenaExitEvent(data),
});

export const toArenaSwapModel = (data: DatabaseJsonType["arena_swap_events"]) => ({
  ...withTransactionMetadata(data),
  ...withArenaSwapData(data),
  ...GuidGetters.arenaSwapEvent(data),
});

export const toArenaVaultBalanceUpdateModel = (
  data: DatabaseJsonType["arena_vault_balance_update_events"]
) => ({
  ...withTransactionMetadata(data),
  ...withArenaVaultBalanceUpdateData(data),
  ...GuidGetters.arenaVaultBalanceUpdate(data),
});

export const toArenaPositionModel = toArenaPositionFromDatabase;
export const toArenaLeaderboardModel = toArenaLeaderboardFromDatabase;
export const toArenaLeaderboardHistoryModel = toArenaLeaderboardHistoryFromDatabase;
export const toArenaInfoModel = toArenaInfoFromDatabase;
export const toArenaCandlestickModel = (data: DatabaseJsonType["arena_candlesticks"]) => ({
  ...toArenaCandlestickFromDatabase(data),
  ...GuidGetters.arenaCandlestick(data),
});

export const calculateDeltaPercentageForQ64s = (open: AnyNumberString, close: AnyNumberString) =>
  q64ToBig(close.toString()).div(q64ToBig(open.toString())).mul(100).sub(100).toNumber();

export const toPriceFeedData = (
  data: Pick<DatabaseJsonType["price_feed"], "open_price_q64" | "close_price_q64">
) => ({
  openPrice: q64ToBig(data.open_price_q64).toNumber(),
  closePrice: q64ToBig(data.close_price_q64).toNumber(),
  deltaPercentage: calculateDeltaPercentageForQ64s(data.open_price_q64, data.close_price_q64),
});

export const toPriceFeed = (data: DatabaseJsonType["price_feed"]) => ({
  ...toMarketStateModel(data),
  ...toPriceFeedData(data),
});

export const toCandlestickModel = (data: DatabaseJsonType["candlesticks"]) => ({
  ...toCandlestickFromDatabase(data),
  ...GuidGetters.candlestick(data),
});

export const toAggregateMarketState = (data: DatabaseJsonType["aggregate_market_state"]) => ({
  lastEmojicoinTransactionVersion: BigInt(data.last_emojicoin_transaction_version),
  cumulativeChatMessages: BigInt(data.cumulative_chat_messages),
  cumulativeIntegratorFees: BigInt(data.cumulative_integrator_fees),
  cumulativeQuoteVolume: BigInt(data.cumulative_quote_volume),
  cumulativeSwaps: BigInt(data.cumulative_swaps),
  fullyDilutedValue: BigInt(data.fully_diluted_value),
  lastBumpTime: postgresTimestampToMicroseconds(data.last_bump_time),
  marketCap: BigInt(data.market_cap),
  numMarkets: BigInt(data.n_markets),
  nonce: BigInt(data.nonce),
  totalQuoteLocked: BigInt(data.total_quote_locked),
  totalValueLocked: BigInt(data.total_value_locked),
  numMarketsInBondingCurve: BigInt(data.n_markets_in_bonding_curve),
  numMarketsPostBondingCurve: BigInt(data.n_markets_post_bonding_curve),
  numGlobalStateEvents: BigInt(data.n_global_state_events),
  numMarketRegistrationEvents: BigInt(data.n_market_registration_events),
  numSwapEvents: BigInt(data.n_swap_events),
  numChatEvents: BigInt(data.n_chat_events),
  numLiquidityEvents: BigInt(data.n_liquidity_events),
});

export const DatabaseTypeConverter = {
  [TableName.GlobalStateEvents]: toGlobalStateEventModel,
  [TableName.PeriodicStateEvents]: toPeriodicStateEventModel,
  [TableName.MarketRegistrationEvents]: toMarketRegistrationEventModel,
  [TableName.SwapEvents]: toSwapEventModel,
  [TableName.ChatEvents]: toChatEventModel,
  [TableName.LiquidityEvents]: toLiquidityEventModel,
  [TableName.MarketLatestStateEvent]: toMarketLatestStateEventModel,
  [TableName.UserLiquidityPools]: toUserLiquidityPoolsModel,
  [TableName.MarketDailyVolume]: toMarketDailyVolumeModel,
  [TableName.Market1MPeriodsInLastDay]: toMarket1MPeriodsInLastDay,
  [TableName.MarketState]: toMarketStateModel,
  [TableName.ProcessorStatus]: toProcessorStatus,
  [TableName.PriceFeed]: toPriceFeed,
  [TableName.Candlesticks]: toCandlestickModel,
  [TableName.ArenaEnterEvents]: toArenaEnterModel,
  [TableName.ArenaMeleeEvents]: toArenaMeleeModel,
  [TableName.ArenaExitEvents]: toArenaExitModel,
  [TableName.ArenaSwapEvents]: toArenaSwapModel,
  [TableName.ArenaInfo]: toArenaInfoModel,
  [TableName.ArenaCandlesticks]: toArenaCandlestickModel,
  [TableName.ArenaPosition]: toArenaPositionModel,
  [TableName.ArenaVaultBalanceUpdateEvents]: toArenaVaultBalanceUpdateModel,
  [TableName.ArenaLeaderboard]: toArenaLeaderboardModel,
  [TableName.ArenaLeaderboardHistory]: toArenaLeaderboardHistoryModel,
  [TableName.ArenaLeaderboardHistoryWithArenaInfo]: toArenaLeaderboardHistoryWithArenaInfo,
  [DatabaseRpc.UserPools]: toUserPoolsRPCResponse,
  [DatabaseRpc.AggregateMarketState]: toAggregateMarketState,
};

export type DatabaseModels = {
  [TableName.GlobalStateEvents]: GlobalStateEventModel;
  [TableName.PeriodicStateEvents]: PeriodicStateEventModel;
  [TableName.MarketRegistrationEvents]: MarketRegistrationEventModel;
  [TableName.SwapEvents]: SwapEventModel;
  [TableName.ChatEvents]: ChatEventModel;
  [TableName.LiquidityEvents]: LiquidityEventModel;
  [TableName.MarketLatestStateEvent]: MarketLatestStateEventModel;
  [TableName.UserLiquidityPools]: UserLiquidityPoolsModel;
  [TableName.MarketDailyVolume]: MarketDailyVolumeModel;
  [TableName.Market1MPeriodsInLastDay]: Market1MPeriodsInLastDayModel;
  [TableName.MarketState]: MarketStateModel;
  [TableName.ProcessorStatus]: ProcessorStatusModel;
  [TableName.PriceFeed]: PriceFeedModel;
  [TableName.Candlesticks]: CandlestickModel;
  [TableName.ArenaMeleeEvents]: ArenaMeleeModel;
  [TableName.ArenaEnterEvents]: ArenaEnterModel;
  [TableName.ArenaExitEvents]: ArenaExitModel;
  [TableName.ArenaSwapEvents]: ArenaSwapModel;
  [TableName.ArenaVaultBalanceUpdateEvents]: ArenaVaultBalanceUpdateModel;
  [TableName.ArenaPosition]: ArenaPositionModel;
  [TableName.ArenaInfo]: ArenaInfoModel;
  [TableName.ArenaCandlesticks]: ArenaCandlestickModel;
  [TableName.ArenaLeaderboard]: ArenaLeaderboardModel;
  [TableName.ArenaLeaderboardHistory]: ArenaLeaderboardHistoryModel;
  [TableName.ArenaLeaderboardHistoryWithArenaInfo]: ArenaLeaderboardHistoryWithArenaInfoModel;
  [DatabaseRpc.UserPools]: UserPoolsRPCModel;
  [DatabaseRpc.AggregateMarketState]: AggregateMarketStateModel;
};

export type AnyEventTable =
  | TableName.SwapEvents
  | TableName.ChatEvents
  | TableName.MarketRegistrationEvents
  | TableName.PeriodicStateEvents
  | TableName.MarketLatestStateEvent
  | TableName.LiquidityEvents
  | TableName.GlobalStateEvents;

export type BrokerEventModels =
  | DatabaseModels[TableName.SwapEvents]
  | DatabaseModels[TableName.ChatEvents]
  | DatabaseModels[TableName.MarketRegistrationEvents]
  | DatabaseModels[TableName.PeriodicStateEvents]
  | DatabaseModels[TableName.MarketLatestStateEvent]
  | DatabaseModels[TableName.LiquidityEvents]
  | DatabaseModels[TableName.GlobalStateEvents]
  | DatabaseModels[TableName.Candlesticks]
  | DatabaseModels[TableName.ArenaEnterEvents]
  | DatabaseModels[TableName.ArenaMeleeEvents]
  | DatabaseModels[TableName.ArenaExitEvents]
  | DatabaseModels[TableName.ArenaSwapEvents]
  | DatabaseModels[TableName.ArenaVaultBalanceUpdateEvents]
  | DatabaseModels[TableName.ArenaCandlesticks];

export type EventModelWithMarket =
  | DatabaseModels[TableName.SwapEvents]
  | DatabaseModels[TableName.ChatEvents]
  | DatabaseModels[TableName.MarketRegistrationEvents]
  | DatabaseModels[TableName.PeriodicStateEvents]
  | DatabaseModels[TableName.MarketLatestStateEvent]
  | DatabaseModels[TableName.LiquidityEvents];

export type ArenaEventModels =
  | DatabaseModels[TableName.ArenaEnterEvents]
  | DatabaseModels[TableName.ArenaMeleeEvents]
  | DatabaseModels[TableName.ArenaExitEvents]
  | DatabaseModels[TableName.ArenaSwapEvents]
  | DatabaseModels[TableName.ArenaVaultBalanceUpdateEvents];

export type ArenaModelWithMeleeID =
  | Exclude<ArenaEventModels, ArenaVaultBalanceUpdateModel>
  | ArenaCandlestickModel;

export const isSwapEventModel = (d: BrokerEventModels): d is SwapEventModel =>
  d.eventName === "Swap";
export const isChatEventModel = (d: BrokerEventModels): d is ChatEventModel =>
  d.eventName === "Chat";
export const isMarketRegistrationEventModel = (
  d: BrokerEventModels
): d is MarketRegistrationEventModel => d.eventName === "MarketRegistration";
export const isPeriodicStateEventModel = (d: BrokerEventModels): d is PeriodicStateEventModel =>
  d.eventName === "PeriodicState";
export const isMarketLatestStateEventModel = (
  d: BrokerEventModels
): d is MarketLatestStateEventModel => d.eventName === "State";
export const isMarketStateModel = (d: BrokerEventModels): d is MarketStateModel =>
  isMarketLatestStateEventModel(d) && "dailyVolume" in d;
export const isLiquidityEventModel = (d: BrokerEventModels): d is LiquidityEventModel =>
  d.eventName === "Liquidity";
export const isGlobalStateEventModel = (d: BrokerEventModels): d is GlobalStateEventModel =>
  d.eventName === "GlobalState";

/**
 * Non-arena event models with markets.
 */
export const isEventModelWithMarket = (data: BrokerEventModels): data is EventModelWithMarket =>
  isSwapEventModel(data) ||
  isChatEventModel(data) ||
  isMarketRegistrationEventModel(data) ||
  isPeriodicStateEventModel(data) ||
  isMarketLatestStateEventModel(data) ||
  isMarketStateModel(data) ||
  isLiquidityEventModel(data);

/**
 * Event models that are emitted in a transaction and thus always have transaction metadata.
 */
export type TransactionEventModels = Extract<
  BrokerEventModels,
  { transaction: TransactionMetadata }
>;
export const isTransactionEventModel = (data: BrokerEventModels): data is TransactionEventModels =>
  "transaction" in data;

export * from "./common";
export * from "./json-types";
export * from "./postgres-numeric-types";
