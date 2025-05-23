/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import type {
  PostgrestBuilder,
  PostgrestFilterBuilder,
  PostgrestSingleResponse,
  PostgrestTransformBuilder,
} from "@supabase/postgrest-js";

import type { AnyNumberString } from "../../types/types";
import { type DatabaseJsonType, postgresTimestampToDate, TableName } from "../types/json-types";
import { postgrest } from "./client";

type EnumLiteralType<T extends TableName> = T extends TableName ? `${T}` : never;

type GenericSchema = {
  Tables: Record<string, never>;
  Views: Record<string, never>;
  Functions: Record<string, never>;
};

type QueryFunction<
  Row extends Record<string, unknown>,
  Result,
  RelationName,
  Relationships extends EnumLiteralType<TableName>,
  QueryArgs extends Record<string, any> | undefined,
  Schema extends GenericSchema = never,
> = (
  args: QueryArgs
) =>
  | PostgrestFilterBuilder<Schema, Row, Result, RelationName, Relationships>
  | PostgrestTransformBuilder<Schema, Row, Result, RelationName, Relationships>;

type WithConfig<T> = T & { minimumVersion?: AnyNumberString };

// This is primarily used for testing purposes, otherwise this interval might be too short.
const POLLING_INTERVAL = 500;
const POLLING_TIMEOUT = 5000;

const extractRow = <T>(res: PostgrestSingleResponse<T>) => res.data;
const extractRows = <T>(res: PostgrestSingleResponse<Array<T>>) => res.data ?? ([] as T[]);

// NOTE: If we ever add another processor type to the indexer processor stack, this will need to be
// updated, because it is assumed here that there is a single row returned. Multiple processors
// would mean there would be multiple rows.
export const getProcessorStatus = async () =>
  postgrest
    .from(TableName.ProcessorStatus)
    .select("processor, last_success_version, last_updated, last_transaction_timestamp")
    .limit(1)
    .single()
    .then((r) => {
      const row = extractRow(r);
      if (!row) {
        console.error(r);
        throw new Error("No processor status row found.");
      }
      if (
        !(
          "processor" in row &&
          "last_success_version" in row &&
          "last_updated" in row &&
          "last_transaction_timestamp" in row
        )
      ) {
        console.warn("Couldn't find all fields in the row response data.", r);
      }
      return {
        processor: row.processor,
        lastSuccessVersion: BigInt(row.last_success_version),
        lastUpdated: postgresTimestampToDate(row.last_updated),
        lastTransactionTimestamp: row.last_transaction_timestamp
          ? postgresTimestampToDate(row.last_transaction_timestamp)
          : new Date(0), // Provide a default, because this field is nullable.
      };
    });

export const getLatestProcessedEmojicoinVersion = async () =>
  getProcessorStatus().then((r) => r.lastSuccessVersion);

export const getLatestProcessedEmojicoinTimestamp = async () =>
  getProcessorStatus().then((r) => r.lastTransactionTimestamp);

/**
 * Wait for the processed version of a table or view to be at least the given version.
 */
export const waitForEmojicoinIndexer = async (
  minimumVersion: AnyNumberString,
  maxWaitTimeMs?: number
) =>
  new Promise<void>((resolve, reject) => {
    let i = 0;
    const maxTries = Math.floor((maxWaitTimeMs ?? POLLING_TIMEOUT) / POLLING_INTERVAL);

    const check = async () => {
      try {
        const latestVersion = await getLatestProcessedEmojicoinVersion();
        if (latestVersion >= BigInt(minimumVersion)) {
          resolve();
        } else if (i > maxTries) {
          reject(new Error("Timeout waiting for processed version."));
        } else {
          setTimeout(() => {
            check();
          }, POLLING_INTERVAL);
        }
        i += 1;
      } catch (e) {
        reject(e);
      }
    };

    check();
  });

/**
 * Return the curried version of queryHelperWithCount that extracts just the rows.
 *
 * @see queryHelperWithCount
 */
export function queryHelper<
  Row extends Record<string, unknown>,
  Result extends Row[],
  RelationName,
  Relationships extends TableName,
  QueryArgs extends Record<string, any> | undefined,
  OutputType = Result[number],
>(
  queryFn: QueryFunction<Row, Result, RelationName, EnumLiteralType<Relationships>, QueryArgs>,
  // Default to (v) => v if no conversion function is passed.
  convert: (row: Row) => OutputType = (v) => v as unknown as OutputType
): (args: WithConfig<QueryArgs>) => Promise<OutputType[]> {
  // Return the curried version of queryHelperWithCount that extracts just the rows.
  return async (args) => (await queryHelperWithCount(queryFn, convert)(args)).rows;
}

export function queryHelperSingle<
  T extends TableName,
  Row extends DatabaseJsonType[T] | null,
  QueryArgs extends Record<string, any> | Record<string, never> | undefined,
  OutputType = Row,
>(
  queryFn: (args: QueryArgs) => PostgrestBuilder<Row>,
  // Default to (v) => v if no conversion function is passed.
  convert: (row: NonNullable<Row>) => OutputType = (v) => v as unknown as OutputType
) {
  const query = async (args?: WithConfig<QueryArgs>) => {
    const { minimumVersion, ...queryArgs } = args ?? {};
    const innerQuery = queryFn(queryArgs as QueryArgs);

    if (minimumVersion) {
      await waitForEmojicoinIndexer(minimumVersion);
    }

    const res = await innerQuery;

    if (res.error) {
      console.error(res.error);
      throw new Error(JSON.stringify(res.error));
    }

    const row = extractRow<Row>(res);
    return row ? convert(row) : null;
  };

  return query;
}

/**
 *
 * @param queryFn Takes in a query function that's used to be called after waiting for the indexer
 * to reach a certain version. Then it extracts the row data and returns it.
 * @param convert A function that converts the raw row data into the desired output, usually
 * by converting it into a camelCased representation of the database row. If no conversion function
 * is passed, this simply returns the input value.
 * @returns A curried function that applies the logic to the new query function.
 */
export function queryHelperWithCount<
  Row extends Record<string, unknown>,
  Result extends Row[],
  RelationName,
  Relationships extends TableName,
  QueryArgs extends Record<string, any> | undefined,
  OutputType = Result[number],
>(
  queryFn: QueryFunction<Row, Result, RelationName, EnumLiteralType<Relationships>, QueryArgs>,
  // Default to (v) => v if no conversion function is passed.
  convert: (row: Row) => OutputType = (v) => v as unknown as OutputType
): (
  args: WithConfig<QueryArgs>
) => Promise<{ rows: OutputType[]; count: number | null; error: unknown }> {
  const query = async (args?: WithConfig<QueryArgs>) => {
    const { minimumVersion, ...queryArgs } = args ?? {};
    const innerQuery = queryFn(queryArgs as QueryArgs);

    if (minimumVersion) {
      await waitForEmojicoinIndexer(minimumVersion);
    }

    try {
      const res = await innerQuery;
      if (res.error) {
        console.error("[Failed row conversion]:\n");
        throw new Error(JSON.stringify(res));
      }
      const rows = extractRows<Row>(res);
      return { rows: rows.map(convert), count: res.count, error: res.error };
    } catch (e) {
      console.error(e);
      return { rows: [], count: null, error: e };
    }
  };

  return query;
}
