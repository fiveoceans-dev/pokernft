#[starknet::contract]
mod TableState {
    use core::array::ArrayTrait;
    use starknet::storage::legacy::LegacyMap;
    use starknet::syscalls::get_caller_address;

    #[starknet::interface]
    trait IShuffler<TContractState> {
        fn request_random_deck(ref self: TContractState, server_seed_hash: felt252) -> felt252;
        fn get_deck(self: @TContractState, req_id: felt252) -> Array<felt252>;
    }

    #[starknet::interface]
    trait IEvaluator<TContractState> {
        fn rank7(self: @TContractState, cards: Array<felt252>) -> felt252;
    }

    #[starknet::interface]
    trait IBank<TContractState> {
        fn payout(
            ref self: TContractState,
            table_id: felt252,
            to: Array<felt252>,
            amounts: Array<felt252>,
        );
    }

    enum Phase {
        Waiting,
        Preflop,
        Flop,
        Turn,
        River,
        Showdown,
        Settled,
    }

    #[storage]
    struct Storage {
        creator: felt252,
        phase: Phase,
        deck_req_id: felt252,
        seat_player: LegacyMap<felt252, felt252>,
        seat_stack: LegacyMap<felt252, felt252>,
        seat_cards: LegacyMap<felt252, felt252>,
        community: felt252,
        pot: felt252,
        highest_rank: felt252,
        winner: felt252,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct PhaseAdvanced {
        phase: Phase,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct SeatTaken {
        seat: felt252,
        player: felt252,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct Winner {
        seat: felt252,
        rank: felt252,
        amount: felt252,
    }

    fn only_creator(self: @ContractState) {
        let caller = get_caller_address();
        assert(caller == self.creator.read());
    }

    #[external]
    fn init_table(ref self: ContractState, creator: felt252, _server_seed_hash: felt252) {
        assert(self.phase.read() == Phase::Waiting);
        self.creator.write(creator);
        // deck request omitted
    }

    #[external]
    fn take_seat(ref self: ContractState, seat: felt252) {
        assert(self.phase.read() == Phase::Waiting);
        let caller = get_caller_address();
        assert(self.seat_player.read(seat) == 0);
        self.seat_player.write(seat, caller);
        emit!(SeatTaken { seat, player: caller });
    }

    #[external]
    fn start_hand(ref self: ContractState) {
        self.only_creator();
        // shuffler interaction omitted
        self.phase.write(Phase::Preflop);
        emit!(PhaseAdvanced { phase: Phase::Preflop });
    }

    #[external]
    fn next_phase(ref self: ContractState) {
        let current = self.phase.read();
        let next = match current {
            Phase::Preflop => Phase::Flop,
            Phase::Flop => Phase::Turn,
            Phase::Turn => Phase::River,
            Phase::River => Phase::Showdown,
            _ => panic!("bad phase"),
        };
        self.phase.write(next);
        emit!(PhaseAdvanced { phase: next });
    }

    #[external]
    fn settle(ref self: ContractState) {
        assert(self.phase.read() == Phase::Showdown);
        // evaluation and payout omitted
        self.phase.write(Phase::Settled);
    }
}
