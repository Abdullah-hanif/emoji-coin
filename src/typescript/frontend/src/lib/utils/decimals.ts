import Big from "big.js";

import { DECIMALS } from "@/sdk/const";
import type { AnyNumberString } from "@/sdk-types";

// Converts a number to its representation in coin decimals.
// Both APT and emojicoins use a fixed number of decimals: 8.
export const toCoinDecimalString = (num: AnyNumberString, displayDecimals?: number): string => {
  return toDisplayCoinDecimals({
    num,
    decimals: displayDecimals,
  });
};

/**
 * Convert a number from its readable display value to an actual value.
 * That is, multiply by 10^DECIMALS, aka 10^8.
 * @param num
 * @returns string
 *
 * @example
 * 1 APT => 100000000
 */
const toActualCoinDecimals = ({ num }: { num: AnyNumberString }): bigint => {
  if (typeof num === "string" && isNaN(parseFloat(num))) {
    return 0n;
  }
  const res = Big(num.toString()).mul(Big(10 ** DECIMALS));
  return BigInt(res.toString());
};

/**
 * Convert a number from its actual on-chain value to a readable display value.
 * That is, divide by 10^DECIMALS, aka 10^8.
 * @param num
 * @returns string
 *
 * @example
 * 100000000 APT => 1
 */
function toDisplayCoinDecimals({
  num,
  round,
  decimals,
}: {
  num: AnyNumberString;
  round?: number;
  decimals?: number;
}): string {
  if (typeof num === "string" && isNaN(parseFloat(num))) {
    return "0";
  }
  let res = Big(num.toString()).div(Big(10 ** DECIMALS));
  if (typeof round !== "undefined") {
    res = res.round(round);
  }
  if (typeof decimals !== "undefined") {
    if (res < Big(1)) {
      return res.toPrecision(decimals).replace(/\.?0+$/, "");
    }
    return res.toFixed(decimals).replace(/\.?0+$/, "");
  }
  return res.toString();
}

export { toActualCoinDecimals, toDisplayCoinDecimals };
