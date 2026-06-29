#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::{Address, Env, String};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn make_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env
}

fn register_lease_nft(env: &Env) -> (LeaseNFTClient, Address) {
    let id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(env, &id);
    client.init(&None);
    let contract_addr = id;
    (client, contract_addr)
}

fn init_with_listing(
    env: &Env,
    daily_rate: i128,
    max_duration: u64,
) -> (LeaseNFTClient, u64, Address, Address) {
    let (client, _) = register_lease_nft(env);
    let owner = Address::generate(env);
    let token_addr = Address::generate(env);
    let lid = client.list_nft(
        &owner,
        &String::from_str(env, "NFT-TEST"),
        &token_addr,
        &daily_rate,
        &max_duration,
    );
    (client, lid, owner, token_addr)
}

// ---------------------------------------------------------------------------
// Core lifecycle tests (existing — preserved & updated for new init signature)
// ---------------------------------------------------------------------------

#[test]
fn test_full_lease_lifecycle() {
    let env = make_env();
    env.ledger().set_timestamp(1_000_000);

    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let renter = Address::generate(&env);
    let token_addr = Address::generate(&env);
    let token_id = String::from_str(&env, "LEASED_NFT_001");
    let daily_rate: i128 = 100;
    let max_duration: u64 = 30;

    client.init(&None);
    assert_eq!(client.get_listing_count(), 0);

    let listing_id = client.list_nft(
        &owner,
        &token_id,
        &token_addr,
        &daily_rate,
        &max_duration,
    );
    assert_eq!(listing_id, 1);
    assert_eq!(client.get_listing_count(), 1);

    let listing = client.get_listing(&listing_id);
    assert_eq!(listing.owner, owner);
    assert_eq!(listing.token_id, token_id);
    assert!(listing.active);

    client.lease_nft(&renter, &listing_id, &7);

    let lease = client.get_lease(&listing_id);
    assert_eq!(lease.renter, renter);
    assert_eq!(lease.start_time, 1_000_000);
    assert_eq!(lease.end_time, 1_000_000 + 7 * 86400);
    assert_eq!(lease.total_fee, 700);

    let listing = client.get_listing(&listing_id);
    assert!(!listing.active);

    client.end_lease(&owner, &listing_id);

    // Lease should be removed
    let result = client.try_get_lease(&listing_id);
    assert!(result.is_err());

    // Listing should be active again after ending
    let listing = client.get_listing(&listing_id);
    assert!(listing.active);
}

#[test]
fn test_renter_can_end_lease() {
    let env = make_env();
    env.ledger().set_timestamp(1_000_000);

    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init(&None);

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

    client.end_lease(&renter, &lid);
    let result = client.try_get_lease(&lid);
    assert!(result.is_err());
}

#[test]
#[should_panic(expected = "listing not found")]
fn test_get_nonexistent_listing() {
    let env = make_env();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init(&None);
    client.get_listing(&999);
}

#[test]
#[should_panic(expected = "listing is not active")]
fn test_lease_inactive_listing() {
    let env = make_env();
    env.ledger().set_timestamp(1_000_000);

    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init(&None);

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
    // Try to lease again — should panic
    client.lease_nft(&renter2, &lid, &3);
}

#[test]
fn test_multiple_listings() {
    let env = make_env();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init(&None);

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
    assert_eq!(client.get_listing(&lid1).daily_rate, 50);
    assert_eq!(client.get_listing(&lid2).daily_rate, 200);
}

#[test]
#[should_panic(expected = "no active lease for this listing")]
fn test_end_lease_without_active_lease() {
    let env = make_env();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init(&None);

    let owner = Address::generate(&env);
    let token_addr = Address::generate(&env);

    let lid = client.list_nft(
        &owner,
        &String::from_str(&env, "NFT-001"),
        &token_addr,
        &100i128,
        &30u64,
    );
    client.end_lease(&owner, &lid);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_init() {
    let env = make_env();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init(&None);
    client.init(&None);
}

#[test]
#[should_panic(expected = "duration exceeds max")]
fn test_lease_exceeds_max_duration() {
    let env = make_env();
    env.ledger().set_timestamp(1_000_000);

    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init(&None);

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

// ---------------------------------------------------------------------------
// Extended coverage tests for Orange Belt
// ---------------------------------------------------------------------------

/// Verify fee = daily_rate × duration_days.
#[test]
fn test_fee_calculation() {
    let env = make_env();
    env.ledger().set_timestamp(2_000_000);
    let (client, lid, _, _) = init_with_listing(&env, 250, 60);
    let renter = Address::generate(&env);

    client.lease_nft(&renter, &lid, &14);
    let lease = client.get_lease(&lid);
    assert_eq!(lease.total_fee, 250 * 14); // 3500
}

/// A stranger (not owner, not renter) cannot end a lease.
#[test]
#[should_panic(expected = "only owner or renter can end lease")]
fn test_unauthorized_end_lease() {
    let env = make_env();
    env.ledger().set_timestamp(1_000_000);
    let (client, lid, _, _) = init_with_listing(&env, 100, 30);
    let renter = Address::generate(&env);
    let stranger = Address::generate(&env);

    client.lease_nft(&renter, &lid, &5);
    client.end_lease(&stranger, &lid);
}

/// max_duration = 1: accepts 1 day.
#[test]
fn test_single_day_max_duration() {
    let env = make_env();
    env.ledger().set_timestamp(1_000_000);
    let (client, lid, _, _) = init_with_listing(&env, 100, 1);
    let renter = Address::generate(&env);
    client.lease_nft(&renter, &lid, &1);
    assert_eq!(client.get_lease(&lid).total_fee, 100);
}

/// max_duration = 1: rejects 2 days.
#[test]
#[should_panic(expected = "duration exceeds max")]
fn test_single_day_max_duration_overflow() {
    let env = make_env();
    env.ledger().set_timestamp(1_000_000);
    let (client, lid, _, _) = init_with_listing(&env, 100, 1);
    let renter = Address::generate(&env);
    client.lease_nft(&renter, &lid, &2);
}

/// After ending a lease, the listing can be leased again by a new renter.
#[test]
fn test_release_after_end() {
    let env = make_env();
    env.ledger().set_timestamp(1_000_000);
    let (client, lid, owner, _) = init_with_listing(&env, 100, 30);
    let renter1 = Address::generate(&env);
    let renter2 = Address::generate(&env);

    client.lease_nft(&renter1, &lid, &5);
    client.end_lease(&owner, &lid);

    env.ledger().set_timestamp(1_500_000);
    client.lease_nft(&renter2, &lid, &10);
    let lease = client.get_lease(&lid);
    assert_eq!(lease.renter, renter2);
    assert_eq!(lease.total_fee, 1000);
}

/// Multiple concurrent listings can be independently leased.
#[test]
fn test_multiple_concurrent_listings_and_leases() {
    let env = make_env();
    env.ledger().set_timestamp(1_000_000);
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init(&None);

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owner3 = Address::generate(&env);
    let renter1 = Address::generate(&env);
    let renter2 = Address::generate(&env);
    let token_addr = Address::generate(&env);

    let lid1 = client.list_nft(&owner1, &String::from_str(&env, "A"), &token_addr, &10, &5);
    let lid2 = client.list_nft(&owner2, &String::from_str(&env, "B"), &token_addr, &20, &10);
    let lid3 = client.list_nft(&owner3, &String::from_str(&env, "C"), &token_addr, &30, &20);

    assert_eq!(client.get_listing_count(), 3);

    client.lease_nft(&renter1, &lid1, &3);
    client.lease_nft(&renter2, &lid3, &7);

    // lid2 still available (not leased)
    assert!(client.get_listing(&lid2).active);
    assert!(!client.get_listing(&lid1).active);
    assert!(!client.get_listing(&lid3).active);

    assert_eq!(client.get_lease(&lid1).total_fee, 30);  // 10 * 3
    assert_eq!(client.get_lease(&lid3).total_fee, 210); // 30 * 7
}

/// Listing count increments correctly.
#[test]
fn test_listing_count_accuracy() {
    let env = make_env();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init(&None);

    assert_eq!(client.get_listing_count(), 0);
    let owner = Address::generate(&env);
    let token_addr = Address::generate(&env);

    for _ in 0..10 {
        client.list_nft(
            &owner,
            &String::from_str(&env, "NFT"),
            &token_addr,
            &100,
            &30,
        );
    }
    assert_eq!(client.get_listing_count(), 10);
}

/// get_lease on a listing that was never leased returns error.
#[test]
fn test_get_lease_never_leased() {
    let env = make_env();
    let (client, lid, _, _) = init_with_listing(&env, 100, 30);
    let result = client.try_get_lease(&lid);
    assert!(result.is_err());
}

/// get_listing_count returns 0 before any listings.
#[test]
fn test_listing_count_zero_before_list() {
    let env = make_env();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init(&None);
    assert_eq!(client.get_listing_count(), 0);
}

/// After init with treasury address, get_treasury returns it.
#[test]
fn test_get_treasury_after_init() {
    let env = make_env();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    let treasury_addr = Address::generate(&env);
    client.init(&Some(treasury_addr.clone()));
    assert_eq!(client.get_treasury(), Some(treasury_addr));
}

/// Without treasury, get_treasury returns None.
#[test]
fn test_get_treasury_none_without_treasury() {
    let env = make_env();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init(&None);
    assert_eq!(client.get_treasury(), None);
}

/// Minimum possible fee: daily_rate = 1, duration = 1.
#[test]
fn test_minimum_fee() {
    let env = make_env();
    env.ledger().set_timestamp(1_000_000);
    let (client, lid, _, _) = init_with_listing(&env, 1, 1);
    let renter = Address::generate(&env);
    client.lease_nft(&renter, &lid, &1);
    assert_eq!(client.get_lease(&lid).total_fee, 1);
}

/// Large fee does not overflow i128.
#[test]
fn test_large_fee_no_overflow() {
    let env = make_env();
    env.ledger().set_timestamp(1_000_000);
    // 1_000_000 stroops/day × 365 days = 365_000_000
    let (client, lid, _, _) = init_with_listing(&env, 1_000_000, 365);
    let renter = Address::generate(&env);
    client.lease_nft(&renter, &lid, &365);
    assert_eq!(client.get_lease(&lid).total_fee, 365_000_000);
}

/// End time = start_time + duration_days * 86400.
#[test]
fn test_end_time_calculation() {
    let env = make_env();
    env.ledger().set_timestamp(5_000_000);
    let (client, lid, _, _) = init_with_listing(&env, 100, 30);
    let renter = Address::generate(&env);
    client.lease_nft(&renter, &lid, &10);
    let lease = client.get_lease(&lid);
    assert_eq!(lease.start_time, 5_000_000);
    assert_eq!(lease.end_time, 5_000_000 + 10 * 86400);
}

/// Owner data is preserved correctly in listing.
#[test]
fn test_listing_owner_preserved() {
    let env = make_env();
    let (client, lid, owner, _) = init_with_listing(&env, 100, 30);
    let listing = client.get_listing(&lid);
    assert_eq!(listing.owner, owner);
    assert_eq!(listing.daily_rate, 100);
    assert_eq!(listing.max_duration, 30);
    assert!(listing.active);
}

/// Listing ID is 1-indexed and sequential.
#[test]
fn test_listing_ids_sequential() {
    let env = make_env();
    let contract_id = env.register(LeaseNFT, ());
    let client = LeaseNFTClient::new(&env, &contract_id);
    client.init(&None);
    let owner = Address::generate(&env);
    let token_addr = Address::generate(&env);
    for expected_id in 1u64..=5 {
        let lid = client.list_nft(
            &owner,
            &String::from_str(&env, "NFT"),
            &token_addr,
            &100,
            &30,
        );
        assert_eq!(lid, expected_id);
    }
}
