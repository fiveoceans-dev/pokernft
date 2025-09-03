#[starknet::contract]
mod Lobby {
    use starknet::storage::legacy::LegacyMap;
    use starknet::syscalls::get_caller_address;

    #[storage]
    struct Storage {
        owner: felt252,
        creator_of: LegacyMap<felt252, felt252>,
        auction_of: LegacyMap<felt252, felt252>,
        ticket_nft_of: LegacyMap<felt252, felt252>,
        escrow_of: LegacyMap<felt252, felt252>,
        status_of: LegacyMap<felt252, felt252>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct TournamentCreated {
        tour_id: felt252,
        creator: felt252,
        auction: felt252,
        ticket_nft: felt252,
        escrow: felt252,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct TournamentFinalized {
        tour_id: felt252,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct TournamentCancelled {
        tour_id: felt252,
    }

    fn only_owner(self: @ContractState) {
        let caller = get_caller_address();
        assert(caller == self.owner.read());
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        let caller = get_caller_address();
        self.owner.write(caller);
    }

    #[external]
    fn create_tournament(
        ref self: ContractState,
        tour_id: felt252,
        auction_addr: felt252,
        ticket_nft_addr: felt252,
        escrow_addr: felt252,
    ) {
        let caller = get_caller_address();
        assert(self.creator_of.read(tour_id) == 0);
        self.creator_of.write(tour_id, caller);
        self.auction_of.write(tour_id, auction_addr);
        self.ticket_nft_of.write(tour_id, ticket_nft_addr);
        self.escrow_of.write(tour_id, escrow_addr);
        self.status_of.write(tour_id, 0);
        emit!(
            TournamentCreated {
                tour_id,
                creator: caller,
                auction: auction_addr,
                ticket_nft: ticket_nft_addr,
                escrow: escrow_addr,
            },
        );
    }

    #[external]
    fn finalize_tournament(ref self: ContractState, tour_id: felt252) {
        let caller = get_caller_address();
        assert(self.creator_of.read(tour_id) == caller);
        self.status_of.write(tour_id, 1);
        emit!(TournamentFinalized { tour_id });
    }

    #[external]
    fn cancel_tournament(ref self: ContractState, tour_id: felt252) {
        let caller = get_caller_address();
        assert(self.creator_of.read(tour_id) == caller);
        self.status_of.write(tour_id, 2);
        emit!(TournamentCancelled { tour_id });
    }
}
