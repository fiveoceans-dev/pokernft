#[starknet::contract]
mod DeckShuffler {
    use core::array::ArrayTrait;
    use starknet::storage::legacy::LegacyMap;
    use starknet::syscalls::{get_block_hash, get_contract_address};

    #[storage]
    struct Storage {
        commit: LegacyMap<felt252, felt252>,
        deck: LegacyMap<felt252, Array<felt252>>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct DeckRequested {
        request_id: felt252,
        server_seed_hash: felt252,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct DeckFulfilled {
        request_id: felt252,
    }

    fn hash2(a: felt252, b: felt252) -> felt252 {
        a + b
    }

    fn shuffle_fisher_yates(rands: Array<felt252>) -> Array<felt252> {
        let mut deck = Array::<felt252>::new();
        for i in 0..52 {
            deck.append(i % 13);
            deck.append(i / 13);
        }
        for i in 0..51 {
            let k = rands[i] % (52 - i);
            let a0 = deck[2 * i];
            let a1 = deck[2 * i + 1];
            let b0 = deck[2 * (i + k)];
            let b1 = deck[2 * (i + k) + 1];
            deck[2 * i] = b0;
            deck[2 * i + 1] = b1;
            deck[2 * (i + k)] = a0;
            deck[2 * (i + k) + 1] = a1;
        }
        deck
    }

    #[external]
    fn request_random_deck(ref self: ContractState, server_seed_hash: felt252) -> felt252 {
        let request_id = get_block_hash(0) + get_contract_address();
        self.commit.write(request_id, server_seed_hash);
        emit!(DeckRequested { request_id, server_seed_hash });
        request_id
    }

    #[external]
    fn fulfill_random_deck(
        ref self: ContractState,
        request_id: felt252,
        server_seed_preimage: felt252,
        vrf_random: Array<felt252>,
    ) {
        let stored = self.commit.read(request_id);
        assert(stored == hash2(server_seed_preimage, 0));
        let deck = shuffle_fisher_yates(vrf_random);
        self.deck.write(request_id, deck);
        emit!(DeckFulfilled { request_id });
    }

    #[view]
    fn get_deck(self: @ContractState, request_id: felt252) -> Array<felt252> {
        self.deck.read(request_id)
    }
}
