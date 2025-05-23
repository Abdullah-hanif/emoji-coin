import {
  Ed25519PublicKey,
  isUserTransactionResponse,
  type PendingTransactionResponse,
  type UserTransactionResponse,
} from "@aptos-labs/ts-sdk";
import type { AccountInfo } from "@aptos-labs/wallet-adapter-core";
import { useQuery } from "@tanstack/react-query";
import { useEmojiPicker } from "context/emoji-picker-context";
import { useAptos } from "context/wallet-context/AptosContextProvider";
import { useNumMarkets } from "lib/hooks/queries/use-num-markets";
import { useMarketRegisterTransactionBuilder } from "lib/hooks/transaction-builders/use-market-register-builder";
import { useCallback, useMemo } from "react";

import { RegisterMarket } from "@/move-modules/emojicoin-dot-fun";
import {
  MARKET_REGISTRATION_FEE,
  MARKET_REGISTRATION_GAS_ESTIMATION_FIRST,
  MARKET_REGISTRATION_GAS_ESTIMATION_NOT_FIRST,
} from "@/sdk/const";
import { SYMBOL_EMOJI_DATA } from "@/sdk/emoji_data";

export const tryEd25519PublicKey = (account: AccountInfo) => {
  try {
    return new Ed25519PublicKey(
      typeof account.publicKey === "string" ? account.publicKey : account.publicKey[0]
    );
  } catch (_) {
    return undefined;
  }
};

export const useRegisterMarket = (sequenceNumber: bigint | null) => {
  const emojis = useEmojiPicker((state) => state.emojis);
  const setIsLoadingRegisteredMarket = useEmojiPicker(
    (state) => state.setIsLoadingRegisteredMarket
  );
  const clear = useEmojiPicker((state) => state.clear);
  const setPickerInvisible = useEmojiPicker((state) => state.setPickerInvisible);
  const { aptos, account, signThenSubmit } = useAptos();

  const { data: numMarkets } = useNumMarkets();

  const emojiBytes = useMemo(
    () => emojis.map((e) => SYMBOL_EMOJI_DATA.byEmoji(e)!.bytes),
    [emojis]
  );

  const { data: gasResult } = useQuery({
    queryKey: ["register-market-cost", numMarkets, account?.address, emojiBytes],
    queryFn: async () => {
      if (account === null) {
        return undefined;
      }
      const publicKey = tryEd25519PublicKey(account);
      if (!publicKey) {
        return {
          error: true,
          data: {
            amount: 0,
            unitPrice: 0,
          },
        };
      }
      try {
        const r = await RegisterMarket.getGasCost({
          aptosConfig: aptos.config,
          registrant: account.address,
          registrantPubKey: publicKey,
          emojis: numMarkets === 0 ? [SYMBOL_EMOJI_DATA.byName("Virgo")!.bytes] : emojiBytes,
        });
        return r;
      } catch (e) {
        console.error(e);
        return undefined;
      }
    },
    staleTime: 2000,
    enabled:
      numMarkets !== undefined && account !== null && (numMarkets === 0 || emojis.length > 0),
  });

  let amount: number, unitPrice: number;

  if (gasResult && !gasResult.error) {
    amount = gasResult.data.amount;
    unitPrice = gasResult.data.unitPrice;
  } else {
    // If numMarkets is undefined (request not completed yet), we are ok with displaying the bigger number.
    // And in most cases (every time except for the first market), it will actually be the correct one.
    amount =
      numMarkets === 0
        ? MARKET_REGISTRATION_GAS_ESTIMATION_FIRST / 100
        : MARKET_REGISTRATION_GAS_ESTIMATION_NOT_FIRST / 100;
    unitPrice = 100;
  }

  const transactionBuilder = useMarketRegisterTransactionBuilder(sequenceNumber, amount, unitPrice);

  const registerMarket = useCallback(async () => {
    if (!account) return;
    setPickerInvisible(true);
    let res: PendingTransactionResponse | UserTransactionResponse | undefined | null;
    let error: unknown;
    await signThenSubmit(transactionBuilder).then((r) => {
      res = r?.response ?? null;
      error = r?.error;
    });

    if (res && isUserTransactionResponse(res)) {
      clear();
      // The event is parsed and added as a registered market in `event-store.ts`,
      // we don't need to do anything here other than set the loading state.
      setIsLoadingRegisteredMarket(true);
    } else {
      // If the transaction fails or the user cancels the transaction, we unset the loading state
      // and set the picker visible.
      // Note that we don't clear the input here, because the user may want to alter it to make it
      // correct and try again.
      setPickerInvisible(false);
      console.error("Error registering market:", error);
      setIsLoadingRegisteredMarket(false);
    }
  }, [
    signThenSubmit,
    account,
    transactionBuilder,
    clear,
    setPickerInvisible,
    setIsLoadingRegisteredMarket,
  ]);

  // By default, just consider that this is the price, since in 99.99% of cases, this will be the most accurate estimate.
  let cost: number = Number(MARKET_REGISTRATION_FEE);

  // If numMarkets is undefined (request not completed yet), we are ok with choosing the second option.
  // And in most cases (every time except for the first market), it will actually be the correct one.
  if (numMarkets === 0) {
    cost = amount * unitPrice;
  } else {
    cost += amount * unitPrice;
  }

  return {
    registerMarket,
    cost,
  };
};
