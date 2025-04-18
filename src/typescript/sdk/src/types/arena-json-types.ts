import type { ARENA_MODULE_NAME } from "../const";
import type { AccountAddressString, Uint64String } from "../emojicoin_dot_fun";
import type { DatabaseStructType } from "../indexer-v2";
import type { JsonTypes } from "./json-types";

// The generics on the Escrow resource type.
type Escrow = `0x${string}::${typeof ARENA_MODULE_NAME}::Escrow`;
type Coin = `0x${string}::coin_factory::Emojicoin`;
type LP = `${Coin}LP`;
type EscrowResourceGenerics = `${Escrow}<${Coin}, ${LP}, ${Coin}, ${LP}>`;

export type ArenaJsonTypes = {
  ExchangeRate: {
    base: Uint64String;
    quote: Uint64String;
  };

  BothEmojicoinExchangeRates: {
    emojicoin_0_exchange_rate: ArenaJsonTypes["ExchangeRate"];
    emojicoin_1_exchange_rate: ArenaJsonTypes["ExchangeRate"];
  };

  /**
   * #[event]
   * ___::emojicoin_arena::Melee
   */
  ArenaMeleeEvent: {
    melee_id: Uint64String;
    emojicoin_0_market_address: AccountAddressString;
    emojicoin_1_market_address: AccountAddressString;
    start_time: Uint64String;
    duration: Uint64String;
    max_match_percentage: Uint64String;
    max_match_amount: Uint64String;
    available_rewards: Uint64String;
  };

  /**
   * #[event]
   * ___::emojicoin_arena::Enter
   */
  ArenaEnterEvent: {
    user: AccountAddressString;
    melee_id: Uint64String;
    input_amount: Uint64String;
    quote_volume: Uint64String;
    integrator_fee: Uint64String;
    match_amount: Uint64String;
    emojicoin_0_proceeds: Uint64String;
    emojicoin_1_proceeds: Uint64String;
  } & JsonTypes["BothEmojicoinExchangeRates"];

  /**
   * #[event]
   * ___::emojicoin_arena::Exit
   */
  ArenaExitEvent: {
    user: AccountAddressString;
    melee_id: Uint64String;
    tap_out_fee: Uint64String;
    emojicoin_0_proceeds: Uint64String;
    emojicoin_1_proceeds: Uint64String;
  } & JsonTypes["BothEmojicoinExchangeRates"];

  /**
   * #[event]
   * ___::emojicoin_arena::Swap
   */
  ArenaSwapEvent: {
    user: AccountAddressString;
    melee_id: Uint64String;
    quote_volume: Uint64String;
    integrator_fee: Uint64String;
    emojicoin_0_proceeds: Uint64String;
    emojicoin_1_proceeds: Uint64String;
  } & JsonTypes["BothEmojicoinExchangeRates"];

  /**
   * #[event]
   * ___::emojicoin_arena::VaultBalanceUpdate
   */
  ArenaVaultBalanceUpdateEvent: {
    new_balance: Uint64String;
  };

  /**
   * Resource/struct
   * ___::emojicoin_arena::Registry
   */
  ArenaRegistry: {
    n_melees: Uint64String;
    vault_address: AccountAddressString;
    vault_balance: Uint64String;
    next_melee_duration: Uint64String;
    next_melee_available_rewards: Uint64String;
    next_melee_max_match_percentage: Uint64String;
    next_melee_max_match_amount: Uint64String;
  };

  /**
   * Only exists as JSON data from the database or broker.
   */
  ArenaCandlestick: DatabaseStructType["ArenaCandlestick"];

  /**
   * Resource/struct
   * ___::emojicoin_arena::Escrow
   */
  Escrow: {
    data: {
      melee_id: Uint64String;
      emojicoin_0: {
        value: Uint64String;
      };
      emojicoin_1: {
        value: Uint64String;
      };
      match_amount: Uint64String;
    };
    type: EscrowResourceGenerics;
  };

  /**
   * #[view]
   * ___::emojicoin_arena::EscrowView
   *
   * Return value of `public fun escrow`
   */
  EscrowView: {
    melee_id: Uint64String;
    emojicoin_0: Uint64String;
    emojicoin_1: Uint64String;
    match_amount: Uint64String;
  };
};
