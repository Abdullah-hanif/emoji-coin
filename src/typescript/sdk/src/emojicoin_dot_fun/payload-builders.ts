/* eslint-disable no-prototype-builtins */
/* eslint-disable no-await-in-loop */
import {
  type Account,
  type AccountAddress,
  type AccountAddressInput,
  AccountAuthenticator,
  type AnyRawTransaction,
  type Aptos,
  type AptosConfig,
  EntryFunction,
  type EntryFunctionArgumentTypes,
  type InputEntryFunctionData,
  type InputGenerateTransactionOptions,
  type InputViewFunctionData,
  type LedgerVersionArg,
  type MoveValue,
  MultiSig,
  MultiSigTransactionPayload,
  Serializable,
  type Serializer,
  TransactionPayloadEntryFunction,
  TransactionPayloadMultiSig,
  type TypeTag,
  type UserTransactionResponse,
  type WaitForTransactionOptions,
} from "@aptos-labs/ts-sdk";

import type { StructTagString } from "../utils/type-tags";
import { postBCSViewFunction } from "./post-bcs-view-function";
import serializeEntryArgsToJsonArray from "./serialize-entry-args-to-json";

export class EntryFunctionTransactionBuilder {
  public readonly payloadBuilder: EntryFunctionPayloadBuilder;

  public readonly aptos: Aptos;

  public readonly rawTransactionInput: AnyRawTransaction;

  // TODO: This should probably be private, if it's possible.
  constructor(
    payloadBuilder: EntryFunctionPayloadBuilder,
    aptos: Aptos,
    rawTransactionInput: AnyRawTransaction
  ) {
    this.payloadBuilder = payloadBuilder;
    this.aptos = aptos;
    this.rawTransactionInput = rawTransactionInput;
  }

  /**
   *
   * @param signer a local Account or a callback function that returns an AccountAuthenticator.
   * @param asFeePayer whether or not the signer is the fee payer.
   * @returns a Promise<AccountAuthenticator>
   */
  async sign(signer: Account, asFeePayer?: boolean): Promise<AccountAuthenticator> {
    const signingFunction = asFeePayer
      ? this.aptos.transaction.signAsFeePayer
      : this.aptos.transaction.sign;
    const accountAuthenticator = signingFunction({
      signer: signer as Account,
      transaction: this.rawTransactionInput,
    });
    return Promise.resolve(accountAuthenticator);
  }

  // To be used by a static `submit` where the user enters named signer arguments.
  async submit(args: {
    primarySigner: Account | AccountAuthenticator;
    secondarySigners?: Array<Account | AccountAuthenticator>;
    feePayer?: Account | AccountAuthenticator;
    options?: WaitForTransactionOptions;
  }): Promise<UserTransactionResponse> {
    const { primarySigner, secondarySigners, feePayer, options } = args;
    let primarySenderAuthenticator: AccountAuthenticator;
    let secondarySendersAuthenticators: Array<AccountAuthenticator> | undefined;
    let feePayerAuthenticator: AccountAuthenticator | undefined;
    if (primarySigner instanceof AccountAuthenticator) {
      primarySenderAuthenticator = primarySigner;
    } else {
      primarySenderAuthenticator = await this.sign(primarySigner);
    }
    if (secondarySigners) {
      secondarySendersAuthenticators = new Array<AccountAuthenticator>();
      for (const signer of secondarySigners) {
        if (signer instanceof AccountAuthenticator) {
          secondarySendersAuthenticators.push(signer);
        } else {
          /* eslint-disable-next-line no-await-in-loop */
          secondarySendersAuthenticators.push(await this.sign(signer));
        }
      }
    }
    if (feePayer) {
      if (feePayer instanceof AccountAuthenticator) {
        feePayerAuthenticator = feePayer;
      } else {
        feePayerAuthenticator = await this.sign(feePayer, true);
      }
    }

    const pendingTransaction = await this.aptos.transaction.submit.multiAgent({
      transaction: this.rawTransactionInput,
      senderAuthenticator: primarySenderAuthenticator,
      feePayerAuthenticator,
      additionalSignersAuthenticators: secondarySendersAuthenticators ?? [],
    });

    const userTransactionResponse = (await this.aptos.waitForTransaction({
      transactionHash: pendingTransaction.hash,
      options,
    })) as UserTransactionResponse;

    return userTransactionResponse;
  }
}

/* eslint-disable-next-line import/no-unused-modules */
export type WalletInputTransactionData = {
  sender?: AccountAddressInput;
  // For now we only use entry functions. Eventually we could support script functions, too.
  data: InputEntryFunctionData;
  options?: InputGenerateTransactionOptions;
};

export abstract class EntryFunctionPayloadBuilder extends Serializable {
  public abstract readonly moduleAddress: AccountAddress;

  public abstract readonly moduleName: string;

  public abstract readonly functionName: string;

  public abstract readonly args: Record<string, EntryFunctionArgumentTypes>;

  public abstract readonly typeTags: Array<TypeTag>;

  public abstract readonly primarySender: AccountAddress;

  public abstract readonly secondarySenders?: Array<AccountAddress>;

  public abstract readonly feePayer?: AccountAddress;

  createPayload(
    multisigAddress?: AccountAddress
  ): TransactionPayloadEntryFunction | TransactionPayloadMultiSig {
    const entryFunction = EntryFunction.build(
      `${this.moduleAddress.toString()}::${this.moduleName}`,
      this.functionName,
      this.typeTags,
      this.argsToArray()
    );
    if (multisigAddress) {
      return new TransactionPayloadMultiSig(
        new MultiSig(multisigAddress, new MultiSigTransactionPayload(entryFunction))
      );
    }
    return new TransactionPayloadEntryFunction(entryFunction);
  }

  toInputPayload(args?: { multisigAddress?: AccountAddress }): WalletInputTransactionData {
    const { multisigAddress } = args ?? {};
    const multiSigData =
      typeof multisigAddress !== "undefined"
        ? {
            multisigAddress: multisigAddress.toString(),
          }
        : {};

    return {
      sender: this.primarySender,
      data: {
        ...multiSigData,
        function: `${this.moduleAddress.toString()}::${this.moduleName}::${this.functionName}`,
        typeArguments: this.typeTags.map((t) => t.toString()),
        functionArguments: serializeEntryArgsToJsonArray(this.args),
        // abi: undefined, // TODO: Add pre-defined ABIs.
      },
      // options are ignored here by the wallet adapter, so there's no need to pretend it's possible
      // to set them. The only way to use them is to use the sign then submit flow, not sign *and*
      // submit, since the signing is handled by the wallet adapter and the txn args are ignored.
    };
  }

  argsToArray(): Array<EntryFunctionArgumentTypes> {
    return Object.keys(this.args).map((field) => this.args[field as keyof typeof this.args]);
  }

  serialize(serializer: Serializer): void {
    this.createPayload().serialize(serializer);
  }
}

export abstract class ViewFunctionPayloadBuilder<T extends Array<MoveValue>> {
  public abstract readonly moduleAddress: AccountAddress;

  public abstract readonly moduleName: string;

  public abstract readonly functionName: string;

  public abstract readonly args: Record<string, EntryFunctionArgumentTypes>;

  public abstract readonly typeTags: Array<TypeTag>;

  toPayload(): InputViewFunctionData {
    return {
      function: `${this.moduleAddress.toString()}::${this.moduleName}::${this.functionName}`,
      typeArguments: this.typeTags.map((type) => type.toString() as StructTagString),
      functionArguments: this.argsToArray(),
    };
  }

  async view(args: { aptos: Aptos | AptosConfig; options?: LedgerVersionArg }): Promise<T> {
    const entryFunction = EntryFunction.build(
      `${this.moduleAddress.toString()}::${this.moduleName}`,
      this.functionName,
      this.typeTags,
      this.argsToArray()
    );
    const { aptos, options } = args;
    const viewRequest = await postBCSViewFunction<T>({
      aptosConfig: aptos,
      payload: entryFunction,
      options,
    });
    return viewRequest as T;
  }

  argsToArray(): Array<EntryFunctionArgumentTypes> {
    return Object.keys(this.args).map((field) => this.args[field as keyof typeof this.args]);
  }
}
