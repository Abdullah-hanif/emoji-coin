import type { Aptos } from "@aptos-labs/ts-sdk";
import { useQuery } from "@tanstack/react-query";
import { useAptos } from "context/wallet-context/AptosContextProvider";
import { withResponseError } from "lib/hooks/queries/client";

import {
  SimulateProvideLiquidity,
  SimulateRemoveLiquidity,
} from "@/move-modules/emojicoin-dot-fun";
import type { AccountAddressString, AnyNumber, TypeTagInput } from "@/sdk/emojicoin_dot_fun";

const simulateProvideLiquidity = async (args: {
  aptos: Aptos;
  marketAddress: AccountAddressString;
  quoteAmount: AnyNumber;
}) => {
  return withResponseError(
    SimulateProvideLiquidity.view({
      ...args,
      provider: "0x0",
    })
  );
};

/**
 * Simulate a liquidity provision with the view function.
 * The only two params that the user can change are the marketAddress, and quoteAmount
 */
export const useSimulateProvideLiquidity = (args: {
  marketAddress: AccountAddressString | undefined;
  quoteAmount: bigint | number | string;
}) => {
  const { marketAddress } = args;
  const { aptos } = useAptos();
  const quoteAmount = BigInt(args.quoteAmount);
  const invalid = quoteAmount === 0n || isNaN(Number(quoteAmount)) || marketAddress === undefined;

  const { data } = useQuery({
    queryKey: [
      "simulate_provide_liquidity",
      aptos.config.network,
      marketAddress,
      quoteAmount.toString(),
    ],
    queryFn: () =>
      invalid
        ? {
            base_amount: "0",
            lp_coin_amount: "0",
          }
        : simulateProvideLiquidity({ aptos, ...args, marketAddress, quoteAmount }),
    staleTime: Infinity,
  });

  return data;
};

const simulateRemoveLiquidity = async (args: {
  aptos: Aptos;
  marketAddress: AccountAddressString;
  lpCoinAmount: AnyNumber;
  typeTags: [TypeTagInput];
}) => {
  return withResponseError(
    SimulateRemoveLiquidity.view({
      ...args,
      provider: "0x0",
    })
  );
};

/**
 * Simulate a liquidity provision with the view function.
 * The only two params that the user can change are the marketAddress, and quoteAmount
 */
export const useSimulateRemoveLiquidity = (args: {
  marketAddress: AccountAddressString | undefined;
  lpCoinAmount: bigint | number | string;
  typeTags: [TypeTagInput];
}) => {
  const { marketAddress } = args;
  const { aptos } = useAptos();
  const lpCoinAmount = BigInt(args.lpCoinAmount);
  const invalid = lpCoinAmount === 0n || isNaN(Number(lpCoinAmount)) || marketAddress === undefined;

  const { data } = useQuery({
    queryKey: [
      "simulate_remove_liquidity",
      aptos.config.network,
      marketAddress,
      lpCoinAmount.toString(),
    ],
    queryFn: () =>
      invalid
        ? {
            base_amount: "0",
            quote_amount: "0",
          }
        : simulateRemoveLiquidity({ aptos, ...args, marketAddress, lpCoinAmount }),
    staleTime: Infinity,
  });

  return data;
};
