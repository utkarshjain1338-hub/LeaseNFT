#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn setup(env: &Env) -> (Address, TreasuryClient<'_>) {
    let contract_id = env.register(Treasury, ());
    let client = TreasuryClient::new(env, &contract_id);
    let admin = Address::generate(env);
    client.init(&admin);
    (admin, client)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[test]
fn test_init_and_balance() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, client) = setup(&env);
    assert_eq!(client.get_balance(), 0i128);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_init_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    client.init(&admin);
}

#[test]
fn test_deposit_fee_accumulates() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, client) = setup(&env);
    let lease_contract = Address::generate(&env);

    client.deposit_fee(&lease_contract, &1u64, &500i128);
    assert_eq!(client.get_balance(), 500i128);

    client.deposit_fee(&lease_contract, &2u64, &300i128);
    assert_eq!(client.get_balance(), 800i128);
}

#[test]
#[should_panic(expected = "amount must be positive")]
fn test_deposit_fee_zero_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, client) = setup(&env);
    let lease_contract = Address::generate(&env);
    client.deposit_fee(&lease_contract, &1u64, &0i128);
}

#[test]
#[should_panic(expected = "amount must be positive")]
fn test_deposit_negative_fee_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, client) = setup(&env);
    let lease_contract = Address::generate(&env);
    client.deposit_fee(&lease_contract, &1u64, &-100i128);
}

#[test]
fn test_withdraw_by_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let lease_contract = Address::generate(&env);

    client.deposit_fee(&lease_contract, &1u64, &1000i128);
    let remaining = client.withdraw(&admin, &400i128);
    assert_eq!(remaining, 600i128);
    assert_eq!(client.get_balance(), 600i128);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn test_withdraw_more_than_balance_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let lease_contract = Address::generate(&env);

    client.deposit_fee(&lease_contract, &1u64, &200i128);
    client.withdraw(&admin, &500i128);
}

#[test]
#[should_panic(expected = "unauthorized")]
fn test_withdraw_non_admin_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, client) = setup(&env);
    let not_admin = Address::generate(&env);
    let lease_contract = Address::generate(&env);

    client.deposit_fee(&lease_contract, &1u64, &1000i128);
    client.withdraw(&not_admin, &100i128);
}

#[test]
fn test_get_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    assert_eq!(client.get_admin(), admin);
}

#[test]
#[should_panic(expected = "not initialized")]
fn test_deposit_without_init_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Treasury, ());
    let client = TreasuryClient::new(&env, &contract_id);
    let lease_contract = Address::generate(&env);
    client.deposit_fee(&lease_contract, &1u64, &100i128);
}

#[test]
fn test_withdraw_entire_balance() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let lease_contract = Address::generate(&env);

    client.deposit_fee(&lease_contract, &1u64, &500i128);
    let remaining = client.withdraw(&admin, &500i128);
    assert_eq!(remaining, 0i128);
    assert_eq!(client.get_balance(), 0i128);
}

#[test]
fn test_multiple_deposits_from_different_listings() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, client) = setup(&env);
    let lease_contract = Address::generate(&env);

    for i in 1u64..=5 {
        client.deposit_fee(&lease_contract, &i, &100i128);
    }
    assert_eq!(client.get_balance(), 500i128);
}
