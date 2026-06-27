#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol};

const COUNT_KEY: Symbol = symbol_short!("COUNT");

#[contracttype]
pub enum DataKey {
    Listing(u64),
    ActiveLease(u64),
}

#[contracttype]
#[derive(Clone)]
pub struct Listing {
    pub owner: Address,
    pub token_id: String,
    pub token_address: Address,
    pub daily_rate: i128,
    pub max_duration: u64,
    pub active: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct ActiveLease {
    pub renter: Address,
    pub start_time: u64,
    pub end_time: u64,
    pub total_fee: i128,
}

#[contract]
pub struct LeaseNFT;

#[contractimpl]
impl LeaseNFT {
    /// Initialize the contract listing counter.
    pub fn init(env: Env) {
        if env.storage().instance().has(&COUNT_KEY) {
            panic!("already initialized");
        }
        env.storage().instance().set(&COUNT_KEY, &0u64);
    }

    /// List an NFT for lease. Returns the new listing ID.
    pub fn list_nft(
        env: Env,
        owner: Address,
        token_id: String,
        token_address: Address,
        daily_rate: i128,
        max_duration: u64,
    ) -> u64 {
        owner.require_auth();
        let mut count: u64 = env.storage().instance().get(&COUNT_KEY).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&COUNT_KEY, &count);
        env.storage().persistent().set(
            &DataKey::Listing(count),
            &Listing {
                owner,
                token_id,
                token_address,
                daily_rate,
                max_duration,
                active: true,
            },
        );
        count
    }

    /// Lease a listed NFT for a given number of days.
    pub fn lease_nft(env: Env, renter: Address, listing_id: u64, duration_days: u64) {
        renter.require_auth();
        let mut listing: Listing = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .expect("listing not found");
        assert!(listing.active, "listing is not active");
        assert!(duration_days <= listing.max_duration, "duration exceeds max");

        let now = env.ledger().timestamp();
        let total_fee = listing.daily_rate * (duration_days as i128);
        listing.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
        env.storage().persistent().set(
            &DataKey::ActiveLease(listing_id),
            &ActiveLease {
                renter,
                start_time: now,
                end_time: now + duration_days * 86400,
                total_fee,
            },
        );
    }

    /// End an active lease. Can be called by owner or renter.
    pub fn end_lease(env: Env, caller: Address, listing_id: u64) {
        caller.require_auth();
        let listing: Listing = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .expect("listing not found");
        let lease: ActiveLease = env
            .storage()
            .persistent()
            .get(&DataKey::ActiveLease(listing_id))
            .expect("no active lease for this listing");
        assert!(
            caller == listing.owner || caller == lease.renter,
            "only owner or renter can end lease"
        );
        env.storage()
            .persistent()
            .remove(&DataKey::ActiveLease(listing_id));
    }

    /// Get listing details.
    pub fn get_listing(env: Env, listing_id: u64) -> Listing {
        env.storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .expect("listing not found")
    }

    /// Get the active lease for a listing.
    pub fn get_lease(env: Env, listing_id: u64) -> ActiveLease {
        env.storage()
            .persistent()
            .get(&DataKey::ActiveLease(listing_id))
            .expect("no active lease")
    }
}

mod test;
