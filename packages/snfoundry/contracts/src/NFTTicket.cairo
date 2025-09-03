#[starknet::contract]
mod NFTTicket {
    use core::array::ArrayTrait;
    use starknet::storage::legacy::LegacyMap;
    use starknet::syscalls::{get_block_timestamp, get_caller_address};

    #[storage]
    struct Storage {
        owner: felt252,
        minter: felt252,
        user_of: LegacyMap<u256, felt252>,
        expires: LegacyMap<u256, felt252>,
        tour_of: LegacyMap<u256, felt252>,
        token_owner: LegacyMap<u256, felt252>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, _name: felt252, _symbol: felt252, minter: felt252) {
        let caller = get_caller_address();
        self.owner.write(caller);
        self.minter.write(minter);
    }

    #[external]
    fn safe_mint(ref self: ContractState, to: felt252, token_id: u256, tournament_id: felt252) {
        assert(get_caller_address() == self.minter.read());
        // Prevent accidental or malicious reminting of an existing token.
        assert(self.token_owner.read(token_id) == 0);
        self.token_owner.write(token_id, to);
        self.tour_of.write(token_id, tournament_id);
    }

    #[external]
    fn batch_transfer(ref self: ContractState, to: felt252, token_ids: Array<u256>) {
        let caller = get_caller_address();
        for tkn in token_ids.iter() {
            assert(self.token_owner.read(tkn) == caller);
            self.token_owner.write(tkn, to);
        };
    }

    #[external]
    fn set_user(ref self: ContractState, token_id: u256, user: felt252, expires: felt252) {
        let owner = self.token_owner.read(token_id);
        assert(owner == get_caller_address());
        self.user_of.write(token_id, user);
        self.expires.write(token_id, expires);
    }

    #[view]
    fn user_of(self: @ContractState, token_id: u256) -> felt252 {
        let exp = self.expires.read(token_id);
        let now = get_block_timestamp();
        if exp < now {
            0
        } else {
            self.user_of.read(token_id)
        }
    }

    #[view]
    fn token_uri(self: @ContractState, token_id: u256) -> felt252 {
        self.tour_of.read(token_id)
    }
}
