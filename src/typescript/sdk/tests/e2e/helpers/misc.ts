import type { UserTransactionResponse } from "@aptos-labs/ts-sdk";
import Big from "big.js";

import { type AnyNumberString, BASIS_POINTS_PER_UNIT, INTEGRATOR_FEE_RATE_BPS } from "../../../src";
import { waitForEmojicoinIndexer } from "../../../src/indexer-v2";
import { EXACT_TRANSITION_INPUT_AMOUNT } from "../../utils";

/**
 * NOTE: This function *WILL NOT* work if the INTEGRATOR_FEE_RATE_BPS results in a fee output that
 * can only be represented with repeating decimals. The rounding errors are cumbersome to account
 * for and we will only use reasonably "nice" numbers like 100 or 250 for the integrator fee.
 *
 * Calculates the exact transition input amount including integrator fees.
 *
 * The calculation solves for the total input amount (i) given:
 * - Known exact transition amount (E) without fees
 * - Integrator fee percentage (FEE_PERCENTAGE) @see get_bps_fee in the Move module.
 *
 * Mathematical derivation:
 * 1. E = i - (i * FEE_PERCENTAGE)    // Base equation
 * 2. E = i * (1 - FEE_PERCENTAGE)    // Factor out i
 * 3. i = E / (1 - FEE_PERCENTAGE)    // Solve for i
 *
 * Where:
 * - E = EXACT_TRANSITION_INPUT_AMOUNT
 * - i = total input amount including fees
 * - FEE_PERCENTAGE = INTEGRATOR_FEE_RATE_BPS / BASIS_POINTS_PER_UNIT
 *
 * @returns {bigint} The whole number `bigint` ceiling of the exact input amount needed to exit the
 * bonding curve, including integrator fees.
 */
export const getExactTransitionInputAmount = (
  integratorFeeRateBPs: number = INTEGRATOR_FEE_RATE_BPS
) => {
  // prettier-ignore
  const FEE_PERCENTAGE = Big(integratorFeeRateBPs)
    .div(BASIS_POINTS_PER_UNIT.toString());

  const exactAmount = Big(EXACT_TRANSITION_INPUT_AMOUNT.toString()).div(
    Big(1).minus(FEE_PERCENTAGE)
  );

  const rounded = exactAmount.round(0, Big.roundDown);

  return BigInt(rounded.toString());
};

const PROCESSING_WAIT_TIME = 2 * 1000;

export const waitForProcessor = <
  T extends { version: AnyNumberString } | { response: UserTransactionResponse },
>(
  res: T
) =>
  waitForEmojicoinIndexer(
    "version" in res ? res.version : res.response.version,
    PROCESSING_WAIT_TIME
  );
