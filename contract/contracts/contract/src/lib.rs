#![no_std]
use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype, symbol_short, Address, Env, String,
    Symbol,
};

const COUNT_KEY: Symbol = symbol_short!("COUNT");
const TREASURY_KEY: Symbol = symbol_short!("TREASURY");

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

/// Minimal Treasury interface for cross-contract calls.
/// The `#[contractclient]` macro generates `TreasuryClient` from this trait.
#[contractclient(name = "TreasuryClient")]
pub trait TreasuryTrait {
    fn deposit_fee(env: Env, from_contract: Address, listing_id: u64, amount: i128);
}

#[contract]
pub struct LeaseNFT;

#[contractimpl]
impl LeaseNFT {
    /// Initialize the contract listing counter.
    ///
    /// Idempotent — safe to call multiple times. Returns immediately without
    /// overwriting state if the contract is already initialized.
    /// This prevents the WASM `UnreachableCodeReached` trap that `panic!` would cause.
    /// If a treasury address is provided it is registered for cross-contract fee
    /// forwarding in `lease_nft`.
    pub fn init(env: Env, treasury: Option<Address>) {
        // Guard: if already initialized, return silently (idempotent).
        // Using panic!() here would produce Error(WasmVm, InvalidAction) /
        // UnreachableCodeReached in the Soroban VM — we return instead.
        if env.storage().instance().has(&COUNT_KEY) {
            return;
        }
        env.storage().instance().set(&COUNT_KEY, &0u64);
        if let Some(addr) = treasury {
            env.storage().instance().set(&TREASURY_KEY, &addr);
        }
        env.events().publish(
            (symbol_short!("leasenft"), symbol_short!("init")),
            env.ledger().sequence(),
        );
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
                owner: owner.clone(),
                token_id: token_id.clone(),
                token_address: token_address.clone(),
                daily_rate,
                max_duration,
                active: true,
            },
        );
        // Emit listing created event
        env.events().publish(
            (symbol_short!("leasenft"), symbol_short!("listed")),
            (count, owner, token_id, daily_rate, max_duration),
        );
        count
    }

    /// Lease a listed NFT for a given number of days.
    ///
    /// If a Treasury contract is registered, this calls `Treasury.deposit_fee()`
    /// via cross-contract invocation — this is the inter-contract communication
    /// pattern required for Orange Belt certification.
    pub fn lease_nft(env: Env, renter: Address, listing_id: u64, duration_days: u64) {
        renter.require_auth();
        let mut listing: Listing = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .expect("listing not found");
        assert!(listing.active, "listing is not active");
        assert!(
            duration_days <= listing.max_duration,
            "duration exceeds max"
        );

        let now = env.ledger().timestamp();
        let total_fee = listing.daily_rate * (duration_days as i128);
        listing.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
        env.storage().persistent().set(
            &DataKey::ActiveLease(listing_id),
            &ActiveLease {
                renter: renter.clone(),
                start_time: now,
                end_time: now + duration_days * 86400,
                total_fee,
            },
        );

        // Emit lease event
        env.events().publish(
            (symbol_short!("leasenft"), symbol_short!("leased")),
            (listing_id, renter.clone(), duration_days, total_fee),
        );

        // ─── Inter-contract communication ──────────────────────────────────
        // If a Treasury contract was registered during init(), forward the fee
        // to it via cross-contract invocation. This demonstrates Soroban's
        // invoke_contract pattern for inter-contract communication.
        if let Some(treasury_id) = env
            .storage()
            .instance()
            .get::<Symbol, Address>(&TREASURY_KEY)
        {
            let treasury = TreasuryClient::new(&env, &treasury_id);
            treasury.deposit_fee(&env.current_contract_address(), &listing_id, &total_fee);
        }
    }

    /// End an active lease. Can be called by owner or renter.
    pub fn end_lease(env: Env, caller: Address, listing_id: u64) {
        caller.require_auth();

        let mut listing: Listing = env
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

        // Remove active lease
        env.storage()
            .persistent()
            .remove(&DataKey::ActiveLease(listing_id));

        // Make listing available again
        listing.active = true;

        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);

        // Emit end_lease event
        env.events().publish(
            (symbol_short!("leasenft"), symbol_short!("ended")),
            (listing_id, caller),
        );
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

    /// Get total listing count.
    pub fn get_listing_count(env: Env) -> u64 {
        env.storage().instance().get(&COUNT_KEY).unwrap_or(0)
    }

    /// Get the registered Treasury contract address (if set during init).
    pub fn get_treasury(env: Env) -> Option<Address> {
        env.storage().instance().get(&TREASURY_KEY)
    }
}

mod test;
