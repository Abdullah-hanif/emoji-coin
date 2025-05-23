/* eslint-disable max-classes-per-file */
import {
  type Account,
  AccountAddress,
  type AccountAddressInput,
  type Aptos,
  type AptosConfig,
  Bool,
  buildTransaction,
  type HexInput,
  type InputGenerateTransactionOptions,
  type LedgerVersionArg,
  MoveVector,
  parseTypeTag,
  type PublicKey,
  SimpleTransaction,
  type TypeTag,
  U8,
  U64,
  type UserTransactionResponse,
  type WaitForTransactionOptions,
} from "@aptos-labs/ts-sdk";

import { MODULE_ADDRESS, REWARDS_MODULE_ADDRESS } from "../../const";
import type { JsonTypes } from "../../types/json-types";
import { getAptosClient } from "../../utils/aptos-client";
import {
  EntryFunctionPayloadBuilder,
  EntryFunctionTransactionBuilder,
  ViewFunctionPayloadBuilder,
} from "../payload-builders";
import type {
  AccountAddressString,
  HexString,
  Option,
  TypeTagInput,
  Uint8,
  Uint64,
} from "../types";

export type ChatPayloadMoveArguments = {
  marketAddress: AccountAddress;
  emojiBytes: MoveVector<MoveVector<U8>>;
  emojiIndicesSequence: MoveVector<U8>;
};

/**
 *```
 *  public entry fun chat<Emojicoin, EmojicoinLP>(
 *     user: &signer,
 *     market_address: address,
 *     emoji_bytes: vector<vector<u8>>,
 *     emoji_indices_sequence: vector<u8>,
 *  )
 *```
 * */

export class Chat extends EntryFunctionPayloadBuilder {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "chat";

  public readonly args: ChatPayloadMoveArguments;

  public readonly typeTags: [TypeTag, TypeTag]; // [Emojicoin, EmojicoinLP]

  public readonly primarySender: AccountAddress;

  public readonly secondarySenders: [] = [];

  public readonly feePayer?: AccountAddress;

  private constructor(args: {
    user: AccountAddressInput; // &signer
    marketAddress: AccountAddressInput; // address
    emojiBytes: Array<HexInput>; // vector<vector<u8>>
    emojiIndicesSequence: HexInput; // vector<u8>
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
    feePayer?: AccountAddressInput; // Optional fee payer account to pay gas fees.
  }) {
    super();
    const { user, marketAddress, emojiBytes, emojiIndicesSequence, typeTags, feePayer } = args;
    this.primarySender = AccountAddress.from(user);

    this.args = {
      marketAddress: AccountAddress.from(marketAddress),
      emojiBytes: new MoveVector(emojiBytes.map((argA) => MoveVector.U8(argA))),
      emojiIndicesSequence: MoveVector.U8(emojiIndicesSequence),
    };
    this.typeTags = typeTags.map((typeTag) =>
      typeof typeTag === "string" ? parseTypeTag(typeTag) : typeTag
    ) as [TypeTag, TypeTag];
    this.feePayer = feePayer !== undefined ? AccountAddress.from(feePayer) : undefined;
  }

  static async builder(args: {
    aptosConfig: AptosConfig;
    user: AccountAddressInput; // &signer
    marketAddress: AccountAddressInput; // address
    emojiBytes: Array<HexInput>; // vector<vector<u8>>
    emojiIndicesSequence: HexInput; // vector<u8>
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP],
    feePayer?: AccountAddressInput;
    options?: InputGenerateTransactionOptions;
  }): Promise<EntryFunctionTransactionBuilder> {
    const { aptosConfig, options, feePayer } = args;
    const payloadBuilder = new this(args);
    const rawTransactionInput = await buildTransaction({
      aptosConfig,
      sender: payloadBuilder.primarySender,
      payload: payloadBuilder.createPayload(),
      options,
      feePayerAddress: feePayer,
    });
    const aptos = getAptosClient(aptosConfig);
    return new EntryFunctionTransactionBuilder(payloadBuilder, aptos, rawTransactionInput);
  }

  static async submit(args: {
    aptosConfig: AptosConfig;
    user: Account; // &signer
    marketAddress: AccountAddressInput; // address
    emojiBytes: Array<HexInput>; // vector<vector<u8>>
    emojiIndicesSequence: HexInput; // vector<u8>
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
    feePayer?: Account;
    options?: InputGenerateTransactionOptions;
    waitForTransactionOptions?: WaitForTransactionOptions;
  }): Promise<UserTransactionResponse> {
    const { user: primarySigner, waitForTransactionOptions, feePayer } = args;

    const transactionBuilder = await Chat.builder({
      ...args,
      feePayer: feePayer ? feePayer.accountAddress : undefined,
      user: primarySigner.accountAddress,
    });
    const response = await transactionBuilder.submit({
      primarySigner,
      feePayer,
      options: waitForTransactionOptions,
    });
    return response;
  }
}

export type ProvideLiquidityPayloadMoveArguments = {
  marketAddress: AccountAddress;
  quoteAmount: U64;
  minLpCoinsOut: U64;
};

/**
 *```
 *  public entry fun provide_liquidity<Emojicoin, EmojicoinLP>(
 *     provider: &signer,
 *     market_address: address,
 *     quote_amount: u64,
 *     min_lp_coins_out: u64,
 *  )
 *```
 * */

export class ProvideLiquidity extends EntryFunctionPayloadBuilder {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "provide_liquidity";

  public readonly args: ProvideLiquidityPayloadMoveArguments;

  public readonly typeTags: [TypeTag, TypeTag]; // [Emojicoin, EmojicoinLP]

  public readonly primarySender: AccountAddress;

  public readonly secondarySenders: [] = [];

  public readonly feePayer?: AccountAddress;

  private constructor(args: {
    provider: AccountAddressInput; // &signer
    marketAddress: AccountAddressInput; // address
    quoteAmount: Uint64; // u64
    minLpCoinsOut: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
    feePayer?: AccountAddressInput; // Optional fee payer account to pay gas fees.
  }) {
    super();
    const { provider, marketAddress, quoteAmount, typeTags, feePayer, minLpCoinsOut } = args;
    this.primarySender = AccountAddress.from(provider);

    this.args = {
      marketAddress: AccountAddress.from(marketAddress),
      quoteAmount: new U64(quoteAmount),
      minLpCoinsOut: new U64(minLpCoinsOut),
    };
    this.typeTags = typeTags.map((typeTag) =>
      typeof typeTag === "string" ? parseTypeTag(typeTag) : typeTag
    ) as [TypeTag, TypeTag];
    this.feePayer = feePayer !== undefined ? AccountAddress.from(feePayer) : undefined;
  }

  static async builder(args: {
    aptosConfig: AptosConfig;
    provider: AccountAddressInput; // &signer
    marketAddress: AccountAddressInput; // address
    quoteAmount: Uint64; // u64
    minLpCoinsOut: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP],
    feePayer?: AccountAddressInput;
    options?: InputGenerateTransactionOptions;
  }): Promise<EntryFunctionTransactionBuilder> {
    const { aptosConfig, options, feePayer } = args;
    const payloadBuilder = new this(args);
    const rawTransactionInput = await buildTransaction({
      aptosConfig,
      sender: payloadBuilder.primarySender,
      payload: payloadBuilder.createPayload(),
      options,
      feePayerAddress: feePayer,
    });
    const aptos = getAptosClient(aptosConfig);
    return new EntryFunctionTransactionBuilder(payloadBuilder, aptos, rawTransactionInput);
  }

  static async submit(args: {
    aptosConfig: AptosConfig;
    provider: Account; // &signer
    marketAddress: AccountAddressInput; // address
    quoteAmount: Uint64; // u64
    minLpCoinsOut: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
    feePayer?: Account;
    options?: InputGenerateTransactionOptions;
    waitForTransactionOptions?: WaitForTransactionOptions;
  }): Promise<UserTransactionResponse> {
    const { provider: primarySigner, waitForTransactionOptions, feePayer } = args;

    const transactionBuilder = await ProvideLiquidity.builder({
      ...args,
      feePayer: feePayer ? feePayer.accountAddress : undefined,
      provider: primarySigner.accountAddress,
    });
    const response = await transactionBuilder.submit({
      primarySigner,
      feePayer,
      options: waitForTransactionOptions,
    });
    return response;
  }
}

export type RegisterMarketPayloadMoveArguments = {
  emojis: MoveVector<MoveVector<U8>>;
  integrator: AccountAddress;
};

/**
 *```
 *  public entry fun register_market(
 *     registrant: &signer,
 *     emojis: vector<vector<u8>>,
 *     integrator: address,
 *  )
 *```
 * */

export class RegisterMarket extends EntryFunctionPayloadBuilder {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "register_market";

  public readonly args: RegisterMarketPayloadMoveArguments;

  public readonly typeTags: [] = [];

  public readonly primarySender: AccountAddress;

  public readonly secondarySenders: [] = [];

  public readonly feePayer?: AccountAddress;

  private constructor(args: {
    registrant: AccountAddressInput; // &signer
    emojis: Array<HexInput>; // vector<vector<u8>>
    integrator: AccountAddressInput; // address
    feePayer?: AccountAddressInput; // Optional fee payer account to pay gas fees.
  }) {
    super();
    const { registrant, emojis, integrator, feePayer } = args;
    this.primarySender = AccountAddress.from(registrant);

    this.args = {
      emojis: new MoveVector(emojis.map((argA) => MoveVector.U8(argA))),
      integrator: AccountAddress.from(integrator),
    };
    this.feePayer = feePayer !== undefined ? AccountAddress.from(feePayer) : undefined;
  }

  static async getGasCost(args: {
    aptosConfig: AptosConfig;
    registrant: AccountAddressInput; // &signer
    registrantPubKey: PublicKey;
    emojis: Array<HexInput>; // vector<vector<u8>>
  }): Promise<{ data: { amount: number; unitPrice: number }; error: boolean }> {
    const { aptosConfig } = args;

    const aptos = getAptosClient(aptosConfig);
    const rawTransaction = await this.builder({
      ...args,
      integrator: AccountAddress.ONE,
      // It's necessary to pass `accountSequenceNumber: 0` or it will be needlessly fetched.
      options: {
        accountSequenceNumber: 0,
      },
    }).then((res) => res.rawTransactionInput.rawTransaction);
    const transaction = new SimpleTransaction(rawTransaction);
    const [userTransactionResponse] = await aptos.transaction.simulate.simple({
      signerPublicKey: args.registrantPubKey,
      transaction,
      options: {
        estimateGasUnitPrice: true,
        estimateMaxGasAmount: true,
      },
    });
    return {
      data: {
        amount: Number(userTransactionResponse.gas_used),
        unitPrice: Number(userTransactionResponse.gas_unit_price),
      },
      error: !userTransactionResponse.success,
    };
  }

  static async builder(args: {
    aptosConfig: AptosConfig;
    registrant: AccountAddressInput; // &signer
    emojis: Array<HexInput>; // vector<vector<u8>>
    integrator: AccountAddressInput; // address
    feePayer?: AccountAddressInput;
    options?: InputGenerateTransactionOptions;
  }): Promise<EntryFunctionTransactionBuilder> {
    const { aptosConfig, options, feePayer } = args;
    const payloadBuilder = new this(args);
    const rawTransactionInput = await buildTransaction({
      aptosConfig,
      sender: payloadBuilder.primarySender,
      payload: payloadBuilder.createPayload(),
      options,
      feePayerAddress: feePayer,
    });
    const aptos = getAptosClient(aptosConfig);
    return new EntryFunctionTransactionBuilder(payloadBuilder, aptos, rawTransactionInput);
  }

  static async submit(args: {
    aptosConfig: AptosConfig;
    registrant: Account; // &signer
    emojis: Array<HexInput>; // vector<vector<u8>>
    integrator: AccountAddressInput; // address
    feePayer?: Account;
    options?: InputGenerateTransactionOptions;
    waitForTransactionOptions?: WaitForTransactionOptions;
  }): Promise<UserTransactionResponse> {
    const { registrant: primarySigner, waitForTransactionOptions, feePayer } = args;

    const transactionBuilder = await RegisterMarket.builder({
      ...args,
      feePayer: feePayer ? feePayer.accountAddress : undefined,
      registrant: primarySigner.accountAddress,
    });
    const response = await transactionBuilder.submit({
      primarySigner,
      feePayer,
      options: waitForTransactionOptions,
    });
    return response;
  }
}

export type RemoveLiquidityPayloadMoveArguments = {
  marketAddress: AccountAddress;
  lpCoinAmount: U64;
  minQuoteOut: U64;
};

/**
 *```
 *  public entry fun remove_liquidity<Emojicoin, EmojicoinLP>(
 *     provider: &signer,
 *     market_address: address,
 *     lp_coin_amount: u64,
 *     min_quote_out: u64,
 *  )
 *```
 * */

export class RemoveLiquidity extends EntryFunctionPayloadBuilder {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "remove_liquidity";

  public readonly args: RemoveLiquidityPayloadMoveArguments;

  public readonly typeTags: [TypeTag, TypeTag]; // [Emojicoin, EmojicoinLP]

  public readonly primarySender: AccountAddress;

  public readonly secondarySenders: [] = [];

  public readonly feePayer?: AccountAddress;

  private constructor(args: {
    provider: AccountAddressInput; // &signer
    marketAddress: AccountAddressInput; // address
    lpCoinAmount: Uint64; // u64
    minQuoteOut: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
    feePayer?: AccountAddressInput; // Optional fee payer account to pay gas fees.
  }) {
    super();
    const { provider, marketAddress, lpCoinAmount, typeTags, feePayer, minQuoteOut } = args;
    this.primarySender = AccountAddress.from(provider);

    this.args = {
      marketAddress: AccountAddress.from(marketAddress),
      lpCoinAmount: new U64(lpCoinAmount),
      minQuoteOut: new U64(minQuoteOut),
    };
    this.typeTags = typeTags.map((typeTag) =>
      typeof typeTag === "string" ? parseTypeTag(typeTag) : typeTag
    ) as [TypeTag, TypeTag];
    this.feePayer = feePayer !== undefined ? AccountAddress.from(feePayer) : undefined;
  }

  static async builder(args: {
    aptosConfig: AptosConfig;
    provider: AccountAddressInput; // &signer
    marketAddress: AccountAddressInput; // address
    lpCoinAmount: Uint64; // u64
    minQuoteOut: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP],
    feePayer?: AccountAddressInput;
    options?: InputGenerateTransactionOptions;
  }): Promise<EntryFunctionTransactionBuilder> {
    const { aptosConfig, options, feePayer } = args;
    const payloadBuilder = new this(args);
    const rawTransactionInput = await buildTransaction({
      aptosConfig,
      sender: payloadBuilder.primarySender,
      payload: payloadBuilder.createPayload(),
      options,
      feePayerAddress: feePayer,
    });
    const aptos = getAptosClient(aptosConfig);
    return new EntryFunctionTransactionBuilder(payloadBuilder, aptos, rawTransactionInput);
  }

  static async submit(args: {
    aptosConfig: AptosConfig;
    provider: Account; // &signer
    marketAddress: AccountAddressInput; // address
    lpCoinAmount: Uint64; // u64
    minQuoteOut: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
    feePayer?: Account;
    options?: InputGenerateTransactionOptions;
    waitForTransactionOptions?: WaitForTransactionOptions;
  }): Promise<UserTransactionResponse> {
    const { provider: primarySigner, waitForTransactionOptions, feePayer } = args;

    const transactionBuilder = await RemoveLiquidity.builder({
      ...args,
      feePayer: feePayer ? feePayer.accountAddress : undefined,
      provider: primarySigner.accountAddress,
    });
    const response = await transactionBuilder.submit({
      primarySigner,
      feePayer,
      options: waitForTransactionOptions,
    });
    return response;
  }
}

export type SwapPayloadMoveArguments = {
  marketAddress: AccountAddress;
  inputAmount: U64;
  isSell: Bool;
  integrator: AccountAddress;
  integratorFeeRateBPs: U8;
  minOutputAmount: U64;
};

/**
 *```
 *  public entry fun swap<Emojicoin, EmojicoinLP>(
 *     swapper: &signer,
 *     market_address: address,
 *     input_amount: u64,
 *     is_sell: bool,
 *     integrator: address,
 *     integrator_fee_rate_bps: u8,
 *     min_output_amount: u64,
 *  )
 *```
 * */

export class Swap extends EntryFunctionPayloadBuilder {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "swap";

  public readonly args: SwapPayloadMoveArguments;

  public readonly typeTags: [TypeTag, TypeTag]; // [Emojicoin, EmojicoinLP]

  public readonly primarySender: AccountAddress;

  public readonly secondarySenders: [] = [];

  public readonly feePayer?: AccountAddress;

  private constructor(args: {
    swapper: AccountAddressInput; // &signer
    marketAddress: AccountAddressInput; // address
    inputAmount: Uint64; // u64
    isSell: boolean; // bool
    integrator: AccountAddressInput; // address
    integratorFeeRateBPs: Uint8; // u8
    minOutputAmount: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
    feePayer?: AccountAddressInput; // Optional fee payer account to pay gas fees.
  }) {
    super();
    const {
      swapper,
      marketAddress,
      inputAmount,
      isSell,
      integrator,
      integratorFeeRateBPs,
      minOutputAmount,
      typeTags,
      feePayer,
    } = args;
    this.primarySender = AccountAddress.from(swapper);

    this.args = {
      marketAddress: AccountAddress.from(marketAddress),
      inputAmount: new U64(inputAmount),
      isSell: new Bool(isSell),
      integrator: AccountAddress.from(integrator),
      integratorFeeRateBPs: new U8(integratorFeeRateBPs),
      minOutputAmount: new U64(minOutputAmount),
    };
    this.typeTags = typeTags.map((typeTag) =>
      typeof typeTag === "string" ? parseTypeTag(typeTag) : typeTag
    ) as [TypeTag, TypeTag];
    this.feePayer = feePayer !== undefined ? AccountAddress.from(feePayer) : undefined;
  }

  static async builder(args: {
    aptosConfig: AptosConfig;
    swapper: AccountAddressInput; // &signer
    marketAddress: AccountAddressInput; // address
    inputAmount: Uint64; // u64
    isSell: boolean; // bool
    integrator: AccountAddressInput; // address
    integratorFeeRateBPs: Uint8; // u8
    minOutputAmount: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP],
    feePayer?: AccountAddressInput;
    options?: InputGenerateTransactionOptions;
  }): Promise<EntryFunctionTransactionBuilder> {
    const { aptosConfig, options, feePayer } = args;
    const payloadBuilder = new this(args);
    const rawTransactionInput = await buildTransaction({
      aptosConfig,
      sender: payloadBuilder.primarySender,
      payload: payloadBuilder.createPayload(),
      options,
      feePayerAddress: feePayer,
    });
    const aptos = getAptosClient(aptosConfig);
    return new EntryFunctionTransactionBuilder(payloadBuilder, aptos, rawTransactionInput);
  }

  static async submit(args: {
    aptosConfig: AptosConfig;
    swapper: Account; // &signer
    marketAddress: AccountAddressInput; // address
    inputAmount: Uint64; // u64
    isSell: boolean; // bool
    integrator: AccountAddressInput; // address
    integratorFeeRateBPs: Uint8; // u8
    minOutputAmount: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
    feePayer?: Account;
    options?: InputGenerateTransactionOptions;
    waitForTransactionOptions?: WaitForTransactionOptions;
  }): Promise<UserTransactionResponse> {
    const { swapper: primarySigner, waitForTransactionOptions, feePayer } = args;

    const transactionBuilder = await Swap.builder({
      ...args,
      feePayer: feePayer ? feePayer.accountAddress : undefined,
      swapper: primarySigner.accountAddress,
    });
    const response = await transactionBuilder.submit({
      primarySigner,
      feePayer,
      options: waitForTransactionOptions,
    });
    return response;
  }

  static async simulate(args: {
    aptosConfig: AptosConfig;
    swapper: AccountAddressInput; // &signer
    swapperPubKey: PublicKey; // &signer
    marketAddress: AccountAddressInput; // address
    inputAmount: Uint64; // u64
    isSell: boolean; // bool
    integrator: AccountAddressInput; // address
    integratorFeeRateBPs: Uint8; // u8
    minOutputAmount: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP],
    feePayer?: AccountAddressInput;
    options?: InputGenerateTransactionOptions;
  }): Promise<UserTransactionResponse> {
    const { aptosConfig } = args;

    const aptos = getAptosClient(aptosConfig);
    const rawTransaction = await this.builder({
      ...args,
      // It's necessary to pass `accountSequenceNumber: 0` or it will be needlessly fetched.
      options: {
        accountSequenceNumber: 0,
      },
      integrator: AccountAddress.ONE,
    }).then((res) => res.rawTransactionInput.rawTransaction);
    const transaction = new SimpleTransaction(rawTransaction);
    const [userTransactionResponse] = await aptos.transaction.simulate.simple({
      signerPublicKey: args.swapperPubKey,
      transaction,
      options: {
        estimateGasUnitPrice: true,
        estimateMaxGasAmount: true,
      },
    });
    return userTransactionResponse;
  }
}

export type SwapWithRewardsPayloadMoveArguments = {
  marketAddress: AccountAddress;
  inputAmount: U64;
  isSell: Bool;
  minOutputAmount: U64;
};

/**
 *```
 *  public entry fun swap_with_rewards<Emojicoin, EmojicoinLP>(
 *     swapper: &signer,
 *     market_address: address,
 *     input_amount: u64,
 *     is_sell: bool,
 *     min_output_amount: u64,
 *  )
 *```
 * */

export class SwapWithRewards extends EntryFunctionPayloadBuilder {
  public readonly moduleAddress = REWARDS_MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun_rewards";

  public readonly functionName = "swap_with_rewards";

  public readonly args: SwapWithRewardsPayloadMoveArguments;

  public readonly typeTags: [TypeTag, TypeTag]; // [Emojicoin, EmojicoinLP]

  public readonly primarySender: AccountAddress;

  public readonly secondarySenders: [] = [];

  public readonly feePayer?: AccountAddress;

  private constructor(args: {
    swapper: AccountAddressInput; // &signer
    marketAddress: AccountAddressInput; // address
    inputAmount: Uint64; // u64
    isSell: boolean; // bool
    minOutputAmount: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
    feePayer?: AccountAddressInput; // Optional fee payer account to pay gas fees.
  }) {
    super();
    const { swapper, marketAddress, inputAmount, isSell, minOutputAmount, typeTags, feePayer } =
      args;
    this.primarySender = AccountAddress.from(swapper);

    this.args = {
      marketAddress: AccountAddress.from(marketAddress),
      inputAmount: new U64(inputAmount),
      isSell: new Bool(isSell),
      minOutputAmount: new U64(minOutputAmount),
    };
    this.typeTags = typeTags.map((typeTag) =>
      typeof typeTag === "string" ? parseTypeTag(typeTag) : typeTag
    ) as [TypeTag, TypeTag];
    this.feePayer = feePayer !== undefined ? AccountAddress.from(feePayer) : undefined;
  }

  static async builder(args: {
    aptosConfig: AptosConfig;
    swapper: AccountAddressInput; // &signer
    marketAddress: AccountAddressInput; // address
    inputAmount: Uint64; // u64
    isSell: boolean; // bool
    minOutputAmount: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP],
    feePayer?: AccountAddressInput;
    options?: InputGenerateTransactionOptions;
  }): Promise<EntryFunctionTransactionBuilder> {
    const { aptosConfig, options, feePayer } = args;
    const payloadBuilder = new this(args);
    const rawTransactionInput = await buildTransaction({
      aptosConfig,
      sender: payloadBuilder.primarySender,
      payload: payloadBuilder.createPayload(),
      options,
      feePayerAddress: feePayer,
    });
    const aptos = getAptosClient(aptosConfig);
    return new EntryFunctionTransactionBuilder(payloadBuilder, aptos, rawTransactionInput);
  }

  static async submit(args: {
    aptosConfig: AptosConfig;
    swapper: Account; // &signer
    marketAddress: AccountAddressInput; // address
    inputAmount: Uint64; // u64
    isSell: boolean; // bool
    minOutputAmount: Uint64; // u64
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
    feePayer?: Account;
    options?: InputGenerateTransactionOptions;
    waitForTransactionOptions?: WaitForTransactionOptions;
  }): Promise<UserTransactionResponse> {
    const { swapper: primarySigner, waitForTransactionOptions, feePayer } = args;

    const transactionBuilder = await SwapWithRewards.builder({
      ...args,
      feePayer: feePayer ? feePayer.accountAddress : undefined,
      swapper: primarySigner.accountAddress,
    });
    const response = await transactionBuilder.submit({
      primarySigner,
      feePayer,
      options: waitForTransactionOptions,
    });
    return response;
  }
}

export type IsASupplementalChatEmojiPayloadMoveArguments = {
  hexBytes: MoveVector<U8>;
};

/**
 *```
 *  #[view]
 *  public fun is_a_supplemental_chat_emoji(
 *     hex_bytes: vector<u8>,
 *  ): bool
 *```
 * */

export class IsASupplementalChatEmoji extends ViewFunctionPayloadBuilder<[boolean]> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "is_a_supplemental_chat_emoji";

  public readonly args: IsASupplementalChatEmojiPayloadMoveArguments;

  public readonly typeTags: [] = [];

  constructor(args: {
    hexBytes: HexInput; // vector<u8>
  }) {
    super();
    const { hexBytes } = args;

    this.args = {
      hexBytes: MoveVector.U8(hexBytes),
    };
  }

  static async view(args: {
    aptos: Aptos | AptosConfig;
    hexBytes: HexInput; // vector<u8>
    options?: LedgerVersionArg;
  }): Promise<boolean> {
    const [res] = await new IsASupplementalChatEmoji(args).view(args);
    return res;
  }
}

export type IsASupportedChatEmojiPayloadMoveArguments = {
  hexBytes: MoveVector<U8>;
};

/**
 *```
 *  #[view]
 *  public fun is_a_supported_chat_emoji(
 *     hex_bytes: vector<u8>,
 *  ): bool
 *```
 * */

export class IsASupportedChatEmoji extends ViewFunctionPayloadBuilder<[boolean]> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "is_a_supported_chat_emoji";

  public readonly args: IsASupportedChatEmojiPayloadMoveArguments;

  public readonly typeTags: [] = [];

  constructor(args: {
    hexBytes: HexInput; // vector<u8>
  }) {
    super();
    const { hexBytes } = args;

    this.args = {
      hexBytes: MoveVector.U8(hexBytes),
    };
  }

  static async view(args: {
    aptos: Aptos | AptosConfig;
    hexBytes: HexInput; // vector<u8>
    options?: LedgerVersionArg;
  }): Promise<boolean> {
    const [res] = await new IsASupportedChatEmoji(args).view(args);
    return res;
  }
}

export type IsASupportedSymbolEmojiPayloadMoveArguments = {
  hexBytes: MoveVector<U8>;
};

/**
 *```
 *  #[view]
 *  public fun is_a_supported_symbol_emoji(
 *     hex_bytes: vector<u8>,
 *  ): bool
 *```
 * */

export class IsASupportedSymbolEmoji extends ViewFunctionPayloadBuilder<[boolean]> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "is_a_supported_symbol_emoji";

  public readonly args: IsASupportedSymbolEmojiPayloadMoveArguments;

  public readonly typeTags: [] = [];

  constructor(args: {
    hexBytes: HexInput; // vector<u8>
  }) {
    super();
    const { hexBytes } = args;

    this.args = {
      hexBytes: MoveVector.U8(hexBytes),
    };
  }

  static async view(args: {
    aptos: Aptos | AptosConfig;
    hexBytes: HexInput; // vector<u8>
    options?: LedgerVersionArg;
  }): Promise<boolean> {
    const [res] = await new IsASupportedSymbolEmoji(args).view(args);
    return res;
  }
}

export type MarketMetadataByEmojiBytesPayloadMoveArguments = {
  emojiBytes: MoveVector<U8>;
};

/**
 *```
 *  #[view]
 *  public fun market_metadata_by_emoji_bytes(
 *     emoji_bytes: vector<u8>,
 *  ): Option<emojicoin_dot_fun::emojicoin_dot_fun::MarketMetadata>
 *```
 * */

export class MarketMetadataByEmojiBytes extends ViewFunctionPayloadBuilder<
  [Option<JsonTypes["MarketMetadata"]>]
> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "market_metadata_by_emoji_bytes";

  public readonly args: MarketMetadataByEmojiBytesPayloadMoveArguments;

  public readonly typeTags: [] = [];

  constructor(args: {
    emojiBytes: HexInput; // vector<u8>
  }) {
    super();
    const { emojiBytes } = args;

    this.args = {
      emojiBytes: MoveVector.U8(emojiBytes),
    };
  }

  static async view(args: {
    aptos: Aptos | AptosConfig;
    emojiBytes: HexInput; // vector<u8>
    options?: LedgerVersionArg;
  }): Promise<Option<JsonTypes["MarketMetadata"]>> {
    const [res] = await new MarketMetadataByEmojiBytes(args).view(args);
    return res;
  }
}

export type MarketMetadataByMarketAddressPayloadMoveArguments = {
  marketAddress: AccountAddress;
};

/**
 *```
 *  #[view]
 *  public fun market_metadata_by_market_address(
 *     market_address: address,
 *  ): Option<emojicoin_dot_fun::emojicoin_dot_fun::MarketMetadata>
 *```
 * */

export class MarketMetadataByMarketAddress extends ViewFunctionPayloadBuilder<
  [Option<JsonTypes["MarketMetadata"]>]
> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "market_metadata_by_market_address";

  public readonly args: MarketMetadataByMarketAddressPayloadMoveArguments;

  public readonly typeTags: [] = [];

  constructor(args: {
    marketAddress: AccountAddressInput; // address
  }) {
    super();
    const { marketAddress } = args;

    this.args = {
      marketAddress: AccountAddress.from(marketAddress),
    };
  }

  static async view(args: {
    aptos: Aptos | AptosConfig;
    marketAddress: AccountAddressInput; // address
    options?: LedgerVersionArg;
  }): Promise<Option<JsonTypes["MarketMetadata"]>> {
    const [res] = await new MarketMetadataByMarketAddress(args).view(args);
    return res;
  }
}

export type MarketMetadataByMarketIDPayloadMoveArguments = {
  marketID: U64;
};

/**
 *```
 *  #[view]
 *  public fun market_metadata_by_market_id(
 *     market_id: u64,
 *  ): Option<emojicoin_dot_fun::emojicoin_dot_fun::MarketMetadata>
 *```
 * */

export class MarketMetadataByMarketID extends ViewFunctionPayloadBuilder<
  [Option<JsonTypes["MarketMetadata"]>]
> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "market_metadata_by_market_id";

  public readonly args: MarketMetadataByMarketIDPayloadMoveArguments;

  public readonly typeTags: [] = [];

  constructor(args: {
    marketID: Uint64; // u64
  }) {
    super();
    const { marketID } = args;

    this.args = {
      marketID: new U64(marketID),
    };
  }

  static async view(args: {
    aptos: Aptos | AptosConfig;
    marketID: Uint64; // u64
    options?: LedgerVersionArg;
  }): Promise<Option<JsonTypes["MarketMetadata"]>> {
    const [res] = await new MarketMetadataByMarketID(args).view(args);
    return res;
  }
}

export type MarketViewPayloadMoveArguments = {
  marketAddress: AccountAddress;
};

/**
 *```
 *  #[view]
 *  public fun market_view<Emojicoin, EmojicoinLP>(
 *     market_address: address,
 *  ): emojicoin_dot_fun::emojicoin_dot_fun::MarketView
 *```
 * */

export class MarketView extends ViewFunctionPayloadBuilder<[JsonTypes["MarketView"]]> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "market_view";

  public readonly args: MarketViewPayloadMoveArguments;

  public readonly typeTags: [TypeTag, TypeTag]; // [Emojicoin, EmojicoinLP]

  constructor(args: {
    marketAddress: AccountAddressInput; // address
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
  }) {
    super();
    const { marketAddress, typeTags } = args;

    this.args = {
      marketAddress: AccountAddress.from(marketAddress),
    };
    this.typeTags = typeTags.map((typeTag) =>
      typeof typeTag === "string" ? parseTypeTag(typeTag) : typeTag
    ) as [TypeTag, TypeTag];
  }

  static async view(args: {
    aptos: Aptos | AptosConfig;
    marketAddress: AccountAddressInput; // address
    options?: LedgerVersionArg;
  }): Promise<JsonTypes["MarketView"]> {
    const marketAddress = AccountAddress.from(args.marketAddress);
    const emojicoin = parseTypeTag(`${marketAddress.toString()}::coin_factory::Emojicoin`);
    const emojicoinLP = parseTypeTag(`${marketAddress.toString()}::coin_factory::EmojicoinLP`);
    const [res] = await new MarketView({
      ...args,
      typeTags: [emojicoin, emojicoinLP],
    }).view(args);
    return res;
  }
}

/**
 *```
 *  #[view]
 *  public fun registry_address(): address
 *```
 * */

export class RegistryAddress extends ViewFunctionPayloadBuilder<[AccountAddressString]> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "registry_address";

  public readonly args: Record<string, never>;

  public readonly typeTags: [] = [];

  constructor() {
    super();

    this.args = {};
  }

  static async view(args: { aptos: Aptos | AptosConfig; options?: LedgerVersionArg }) {
    const [res] = await new RegistryAddress().view(args);
    return res;
  }
}

/**
 *```
 *  #[view]
 *  public fun registry_view(): emojicoin_dot_fun::emojicoin_dot_fun::RegistryView
 *```
 * */

export class RegistryView extends ViewFunctionPayloadBuilder<[JsonTypes["RegistryView"]]> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "registry_view";

  public readonly args: Record<string, never>;

  public readonly typeTags: [] = [];

  constructor() {
    super();

    this.args = {};
  }

  static async view(args: {
    aptos: Aptos | AptosConfig;
    options?: LedgerVersionArg;
  }): Promise<JsonTypes["RegistryView"]> {
    const [res] = await new RegistryView().view(args);
    return res;
  }
}

export type SimulateProvideLiquidityPayloadMoveArguments = {
  provider: AccountAddress;
  marketAddress: AccountAddress;
  quoteAmount: U64;
};

/**
 *```
 *  #[view]
 *  public fun simulate_provide_liquidity(
 *     provider: address,
 *     market_address: address,
 *     quote_amount: u64,
 *  ): emojicoin_dot_fun::emojicoin_dot_fun::Liquidity
 *```
 * */

export class SimulateProvideLiquidity extends ViewFunctionPayloadBuilder<
  [JsonTypes["LiquidityEvent"]]
> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "simulate_provide_liquidity";

  public readonly args: SimulateProvideLiquidityPayloadMoveArguments;

  public readonly typeTags: [] = [];

  constructor(args: {
    provider: AccountAddressInput; // address
    marketAddress: AccountAddressInput; // address
    quoteAmount: Uint64; // u64
  }) {
    super();
    const { provider, marketAddress, quoteAmount } = args;

    this.args = {
      provider: AccountAddress.from(provider),
      marketAddress: AccountAddress.from(marketAddress),
      quoteAmount: new U64(quoteAmount),
    };
  }

  static async view(args: {
    aptos: Aptos | AptosConfig;
    provider: AccountAddressInput; // address
    marketAddress: AccountAddressInput; // address
    quoteAmount: Uint64; // u64
    options?: LedgerVersionArg;
  }): Promise<JsonTypes["LiquidityEvent"]> {
    const [res] = await new SimulateProvideLiquidity(args).view(args);
    return res;
  }
}

export type SimulateRemoveLiquidityPayloadMoveArguments = {
  provider: AccountAddress;
  marketAddress: AccountAddress;
  lpCoinAmount: U64;
};

/**
 *```
 *  #[view]
 *  public fun simulate_remove_liquidity<Emojicoin>(
 *     provider: address,
 *     market_address: address,
 *     lp_coin_amount: u64,
 *  ): emojicoin_dot_fun::emojicoin_dot_fun::Liquidity
 *```
 * */

export class SimulateRemoveLiquidity extends ViewFunctionPayloadBuilder<
  [JsonTypes["LiquidityEvent"]]
> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "simulate_remove_liquidity";

  public readonly args: SimulateRemoveLiquidityPayloadMoveArguments;

  public readonly typeTags: [TypeTag]; // [Emojicoin]

  constructor(args: {
    provider: AccountAddressInput; // address
    marketAddress: AccountAddressInput; // address
    lpCoinAmount: Uint64; // u64
    typeTags: [TypeTagInput]; // [Emojicoin]
  }) {
    super();
    const { provider, marketAddress, lpCoinAmount, typeTags } = args;

    this.args = {
      provider: AccountAddress.from(provider),
      marketAddress: AccountAddress.from(marketAddress),
      lpCoinAmount: new U64(lpCoinAmount),
    };
    this.typeTags = typeTags.map((typeTag) =>
      typeof typeTag === "string" ? parseTypeTag(typeTag) : typeTag
    ) as [TypeTag];
  }

  static async view(args: {
    aptos: Aptos | AptosConfig;
    provider: AccountAddressInput; // address
    marketAddress: AccountAddressInput; // address
    lpCoinAmount: Uint64; // u64
    typeTags: [TypeTagInput]; // [Emojicoin]
    options?: LedgerVersionArg;
  }): Promise<JsonTypes["LiquidityEvent"]> {
    const [res] = await new SimulateRemoveLiquidity(args).view(args);
    return res;
  }
}

export type SimulateSwapPayloadMoveArguments = {
  swapper: AccountAddress;
  marketAddress: AccountAddress;
  inputAmount: U64;
  isSell: Bool;
  integrator: AccountAddress;
  integratorFeeRateBPs: U8;
};

/**
 *```
 *  #[view]
 *  public fun simulate_swap<Emojicoin, EmojicoinLP>(
 *     swapper: address,
 *     market_address: address,
 *     input_amount: u64,
 *     is_sell: bool,
 *     integrator: address,
 *     integrator_fee_rate_bps: u8,
 *  ): emojicoin_dot_fun::emojicoin_dot_fun::Swap
 *```
 * */

export class SimulateSwap extends ViewFunctionPayloadBuilder<[JsonTypes["SwapEvent"]]> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "simulate_swap";

  public readonly args: SimulateSwapPayloadMoveArguments;

  public readonly typeTags: [TypeTag, TypeTag]; // [Emojicoin, EmojicoinLP]

  constructor(args: {
    swapper: AccountAddressInput; // address
    marketAddress: AccountAddressInput; // address
    inputAmount: Uint64; // u64
    isSell: boolean; // bool
    integrator: AccountAddressInput; // address
    integratorFeeRateBPs: Uint8; // u8
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
  }) {
    super();
    const {
      swapper,
      marketAddress,
      inputAmount,
      isSell,
      integrator,
      integratorFeeRateBPs,
      typeTags,
    } = args;

    this.args = {
      swapper: AccountAddress.from(swapper),
      marketAddress: AccountAddress.from(marketAddress),
      inputAmount: new U64(inputAmount),
      isSell: new Bool(isSell),
      integrator: AccountAddress.from(integrator),
      integratorFeeRateBPs: new U8(integratorFeeRateBPs),
    };
    this.typeTags = typeTags.map((typeTag) =>
      typeof typeTag === "string" ? parseTypeTag(typeTag) : typeTag
    ) as [TypeTag, TypeTag];
  }

  static async view(args: {
    aptos: Aptos | AptosConfig;
    swapper: AccountAddressInput; // address
    marketAddress: AccountAddressInput; // address
    inputAmount: Uint64; // u64
    isSell: boolean; // bool
    integrator: AccountAddressInput; // address
    integratorFeeRateBPs: Uint8; // u8
    typeTags: [TypeTagInput, TypeTagInput]; // [Emojicoin, EmojicoinLP]
    options?: LedgerVersionArg;
  }): Promise<JsonTypes["SwapEvent"]> {
    const [res] = await new SimulateSwap(args).view(args);
    return res;
  }
}

export type VerifiedSymbolEmojiBytesPayloadMoveArguments = {
  emojis: MoveVector<MoveVector<U8>>;
};

/**
 *```
 *  #[view]
 *  public fun verified_symbol_emoji_bytes(
 *     emojis: vector<vector<u8>>,
 *  ): vector<u8>
 *```
 * */

export class VerifiedSymbolEmojiBytes extends ViewFunctionPayloadBuilder<[HexString]> {
  public readonly moduleAddress = MODULE_ADDRESS;

  public readonly moduleName = "emojicoin_dot_fun";

  public readonly functionName = "verified_symbol_emoji_bytes";

  public readonly args: VerifiedSymbolEmojiBytesPayloadMoveArguments;

  public readonly typeTags: [] = [];

  constructor(args: {
    emojis: Array<HexInput>; // vector<vector<u8>>
  }) {
    super();
    const { emojis } = args;

    this.args = {
      emojis: new MoveVector(emojis.map((argA) => MoveVector.U8(argA))),
    };
  }

  static async view(args: {
    aptos: Aptos | AptosConfig;
    emojis: Array<HexInput>; // vector<vector<u8>>
    options?: LedgerVersionArg;
  }): Promise<HexString> {
    const [res] = await new VerifiedSymbolEmojiBytes(args).view(args);
    return res;
  }
}
