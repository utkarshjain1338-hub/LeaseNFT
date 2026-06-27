import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CA3Z2A63KCHNDB37NDWEBJ6ACFXKIOGT3FVRD7FFX36MD2UYINAN5F6X",
  }
} as const

export type DataKey = {tag: "Listing", values: readonly [u64]} | {tag: "ActiveLease", values: readonly [u64]};


export interface Listing {
  active: boolean;
  daily_rate: i128;
  max_duration: u64;
  owner: string;
  token_address: string;
  token_id: string;
}


export interface ActiveLease {
  end_time: u64;
  renter: string;
  start_time: u64;
  total_fee: i128;
}

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the contract listing counter.
   */
  init: (options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a list_nft transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * List an NFT for lease. Returns the new listing ID.
   */
  list_nft: ({owner, token_id, token_address, daily_rate, max_duration}: {owner: string, token_id: string, token_address: string, daily_rate: i128, max_duration: u64}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a end_lease transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * End an active lease. Can be called by owner or renter.
   */
  end_lease: ({caller, listing_id}: {caller: string, listing_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_lease transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the active lease for a listing.
   */
  get_lease: ({listing_id}: {listing_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<ActiveLease>>

  /**
   * Construct and simulate a lease_nft transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Lease a listed NFT for a given number of days.
   */
  lease_nft: ({renter, listing_id, duration_days}: {renter: string, listing_id: u64, duration_days: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_listing transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get listing details.
   */
  get_listing: ({listing_id}: {listing_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Listing>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAChJbml0aWFsaXplIHRoZSBjb250cmFjdCBsaXN0aW5nIGNvdW50ZXIuAAAABGluaXQAAAAAAAAAAA==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAgAAAAEAAAAAAAAAB0xpc3RpbmcAAAAAAQAAAAYAAAABAAAAAAAAAAtBY3RpdmVMZWFzZQAAAAABAAAABg==",
        "AAAAAQAAAAAAAAAAAAAAB0xpc3RpbmcAAAAABgAAAAAAAAAGYWN0aXZlAAAAAAABAAAAAAAAAApkYWlseV9yYXRlAAAAAAALAAAAAAAAAAxtYXhfZHVyYXRpb24AAAAGAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAADXRva2VuX2FkZHJlc3MAAAAAAAATAAAAAAAAAAh0b2tlbl9pZAAAABA=",
        "AAAAAAAAADJMaXN0IGFuIE5GVCBmb3IgbGVhc2UuIFJldHVybnMgdGhlIG5ldyBsaXN0aW5nIElELgAAAAAACGxpc3RfbmZ0AAAABQAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAh0b2tlbl9pZAAAABAAAAAAAAAADXRva2VuX2FkZHJlc3MAAAAAAAATAAAAAAAAAApkYWlseV9yYXRlAAAAAAALAAAAAAAAAAxtYXhfZHVyYXRpb24AAAAGAAAAAQAAAAY=",
        "AAAAAAAAADZFbmQgYW4gYWN0aXZlIGxlYXNlLiBDYW4gYmUgY2FsbGVkIGJ5IG93bmVyIG9yIHJlbnRlci4AAAAAAAllbmRfbGVhc2UAAAAAAAACAAAAAAAAAAZjYWxsZXIAAAAAABMAAAAAAAAACmxpc3RpbmdfaWQAAAAAAAYAAAAA",
        "AAAAAAAAACNHZXQgdGhlIGFjdGl2ZSBsZWFzZSBmb3IgYSBsaXN0aW5nLgAAAAAJZ2V0X2xlYXNlAAAAAAAAAQAAAAAAAAAKbGlzdGluZ19pZAAAAAAABgAAAAEAAAfQAAAAC0FjdGl2ZUxlYXNlAA==",
        "AAAAAAAAAC5MZWFzZSBhIGxpc3RlZCBORlQgZm9yIGEgZ2l2ZW4gbnVtYmVyIG9mIGRheXMuAAAAAAAJbGVhc2VfbmZ0AAAAAAAAAwAAAAAAAAAGcmVudGVyAAAAAAATAAAAAAAAAApsaXN0aW5nX2lkAAAAAAAGAAAAAAAAAA1kdXJhdGlvbl9kYXlzAAAAAAAABgAAAAA=",
        "AAAAAQAAAAAAAAAAAAAAC0FjdGl2ZUxlYXNlAAAAAAQAAAAAAAAACGVuZF90aW1lAAAABgAAAAAAAAAGcmVudGVyAAAAAAATAAAAAAAAAApzdGFydF90aW1lAAAAAAAGAAAAAAAAAAl0b3RhbF9mZWUAAAAAAAAL",
        "AAAAAAAAABRHZXQgbGlzdGluZyBkZXRhaWxzLgAAAAtnZXRfbGlzdGluZwAAAAABAAAAAAAAAApsaXN0aW5nX2lkAAAAAAAGAAAAAQAAB9AAAAAHTGlzdGluZwA=" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<null>,
        list_nft: this.txFromJSON<u64>,
        end_lease: this.txFromJSON<null>,
        get_lease: this.txFromJSON<ActiveLease>,
        lease_nft: this.txFromJSON<null>,
        get_listing: this.txFromJSON<Listing>
  }
}