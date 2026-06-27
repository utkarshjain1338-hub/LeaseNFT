#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::{Address, Env, String};

#[test]
fn test_full_lease_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000_000);

    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let renter = Address::generate(&env);
    let token_addr = Address::generate(&env);
    let token_id = String::from_str(&env, "LEASED_NFT_001");
    let daily_rate: i128 = 100;
    let max_duration: u64 = 30;

    // Initialize
    client.init();
    assert_eq!(client.get_listing_count(), 0);

    // List NFT
    let listing_id = client.list_nft(
        &owner,
        &token_id,
        &token_addr,
        &daily_rate,
        &max_duration,
    );
    assert_eq!(listing_id, 1);
    assert_eq!(client.get_listing_count(), 1);

    // Check listing
    let listing = client.get_listing(&listing_id);
    assert_eq!(listing.owner, owner);
    assert_eq!(listing.token_id, token_id);
    assert!(listing.active);

    // Lease the NFT for 7 days
    client.lease_nft(&renter, &listing_id, &7);

    let lease = client.get_lease(&listing_id);
    assert_eq!(lease.renter, renter);
    assert_eq!(lease.start_time, 1_000_000);
    assert_eq!(lease.end_time, 1_000_000 + 7 * 86400);
    assert_eq!(lease.total_fee, 700);

    // Listing should no longer be active
    let listing = client.get_listing(&listing_id);
    assert!(!listing.active);

    // End the lease (owner calls end)
    client.end_lease(&owner, &listing_id);

    // Lease should be removed
    let result = client.try_get_lease(&listing_id);
    assert!(result.is_err());
}

#[test]
fn test_renter_can_end_lease() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000_000);

    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init();

    let owner = Address::generate(&env);
    let renter = Address::generate(&env);
    let token_addr = Address::generate(&env);

    let lid = client.list_nft(
        &owner,
        &String::from_str(&env, "NFT-001"),
        &token_addr,
        &100i128,
        &30u64,
    );
    client.lease_nft(&renter, &lid, &5);

    // Renter ends lease
    client.end_lease(&renter, &lid);
    let result = client.try_get_lease(&lid);
    assert!(result.is_err());
}

#[test]
#[should_panic(expected = "listing not found")]
fn test_get_nonexistent_listing() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init();

    client.get_listing(&999);
}

#[test]
#[should_panic(expected = "listing is not active")]
fn test_lease_inactive_listing() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000_000);

    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init();

    let owner = Address::generate(&env);
    let renter1 = Address::generate(&env);
    let renter2 = Address::generate(&env);
    let token_addr = Address::generate(&env);

    let lid = client.list_nft(
        &owner,
        &String::from_str(&env, "NFT-001"),
        &token_addr,
        &100i128,
        &30u64,
    );
    client.lease_nft(&renter1, &lid, &5);
    // Try to lease again - should panic
    client.lease_nft(&renter2, &lid, &3);
}

#[test]
fn test_multiple_listings() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init();

    let owner = Address::generate(&env);
    let token_addr = Address::generate(&env);

    let lid1 = client.list_nft(
        &owner,
        &String::from_str(&env, "NFT-A"),
        &token_addr,
        &50i128,
        &10u64,
    );
    let lid2 = client.list_nft(
        &owner,
        &String::from_str(&env, "NFT-B"),
        &token_addr,
        &200i128,
        &7u64,
    );

    assert_eq!(lid1, 1);
    assert_eq!(lid2, 2);

    assert_eq!(
        client.get_listing(&lid1).daily_rate,
        50
    );
    assert_eq!(
        client.get_listing(&lid2).daily_rate,
        200
    );
}

#[test]
#[should_panic(expected = "no active lease for this listing")]
fn test_end_lease_without_active_lease() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init();

    let owner = Address::generate(&env);
    let token_addr = Address::generate(&env);

    let lid = client.list_nft(
        &owner,
        &String::from_str(&env, "NFT-001"),
        &token_addr,
        &100i128,
        &30u64,
    );
    // Try to end lease when none is active
    client.end_lease(&owner, &lid);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_init() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init();
    client.init();
}

#[test]
#[should_panic(expected = "duration exceeds max")]
fn test_lease_exceeds_max_duration() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000_000);

    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init();

    let owner = Address::generate(&env);
    let renter = Address::generate(&env);
    let token_addr = Address::generate(&env);

    let lid = client.list_nft(
        &owner,
        &String::from_str(&env, "NFT-001"),
        &token_addr,
        &100i128,
        &5u64,
    );
    client.lease_nft(&renter, &lid, &10);
}
