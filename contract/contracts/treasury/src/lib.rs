#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");
const BALANCE_KEY: Symbol = symbol_short!("BALANCE");

/// Deposit event data emitted on each fee deposit.
#[contracttype]
#[derive(Clone)]
pub struct FeeDeposited {
    pub from_contract: Address,
    pub listing_id: u64,
    pub amount: i128,
    pub ledger: u32,
}

#[contract]
pub struct Treasury;

#[contractimpl]
impl Treasury {
    /// Initialize the treasury with an admin address.
    /// Can only be called once.
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&BALANCE_KEY, &0i128);
        env.events()
            .publish((symbol_short!("treasury"), symbol_short!("init")), admin);
    }

    /// Deposit a lease fee into the treasury.
    ///
    /// Called by the LeaseNFT contract during `lease_nft` via cross-contract
    /// invocation. Any caller may deposit — this is intentional for open
    /// integration with the LeaseNFT contract.
    ///
    /// Design note: Soroban does not have a built-in "send XLM" primitive.
    /// Actual token flows require invoking a token contract (e.g. the Stellar
    /// Asset Contract). Here we track fee accounting in contract storage and
    /// emit events so the frontend can display treasury state. In production,
    /// the LeaseNFT contract would also invoke the SAC to transfer tokens.
    pub fn deposit_fee(env: Env, from_contract: Address, listing_id: u64, amount: i128) {
        if amount <= 0 {
            panic!("amount must be positive");
        }
        if !env.storage().instance().has(&ADMIN_KEY) {
            panic!("not initialized");
        }

        let current: i128 = env.storage().instance().get(&BALANCE_KEY).unwrap_or(0i128);
        env.storage()
            .instance()
            .set(&BALANCE_KEY, &(current + amount));

        // Emit a fee_deposited event for indexers and the frontend
        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("deposit")),
            FeeDeposited {
                from_contract,
                listing_id,
                amount,
                ledger: env.ledger().sequence(),
            },
        );
    }

    /// Withdraw accumulated fees. Only callable by the admin.
    /// Returns the remaining balance after withdrawal.
    pub fn withdraw(env: Env, admin: Address, amount: i128) -> i128 {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("not initialized");
        if admin != stored_admin {
            panic!("unauthorized");
        }

        let balance: i128 = env.storage().instance().get(&BALANCE_KEY).unwrap_or(0i128);
        if amount > balance {
            panic!("insufficient balance");
        }

        let new_balance = balance - amount;
        env.storage().instance().set(&BALANCE_KEY, &new_balance);

        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("withdraw")),
            (admin, amount, new_balance),
        );

        new_balance
    }

    /// Get the current treasury balance (total fees deposited minus withdrawals).
    pub fn get_balance(env: Env) -> i128 {
        env.storage().instance().get(&BALANCE_KEY).unwrap_or(0i128)
    }

    /// Get the admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("not initialized")
    }
}

mod test;
