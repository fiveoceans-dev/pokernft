#[starknet::contract]
mod Bank {
    use core::array::ArrayTrait;
    use starknet::math::uint256::{Uint256, uint256_add, uint256_sub};
    use starknet::storage::legacy::LegacyMap;
    use starknet::syscalls::get_caller_address;

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: felt252, amount: Uint256) -> bool;
    }

    #[storage]
    struct Storage {
        token: felt252,
        depositor_role: LegacyMap<felt252, felt252>,
        payer_role: LegacyMap<felt252, felt252>,
        total_deposited: LegacyMap<felt252, Uint256>,
        player_deposit: LegacyMap<(felt252, felt252), Uint256>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct DepositRecorded {
        tour_id: felt252,
        player: felt252,
        amount: Uint256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct Refunded {
        tour_id: felt252,
        player: felt252,
        amount: Uint256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct PayoutMade {
        tour_id: felt252,
        player: felt252,
        amount: Uint256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, token: felt252, initial_depositor: felt252, initial_payer: felt252,
    ) {
        self.token.write(token);
        self.depositor_role.write(initial_depositor, 1);
        self.payer_role.write(initial_payer, 1);
    }

    fn only_depositor(self: @ContractState) {
        let caller = get_caller_address();
        let ok = self.depositor_role.read(caller);
        assert(ok == 1);
    }

    fn only_payer(self: @ContractState) {
        let caller = get_caller_address();
        let ok = self.payer_role.read(caller);
        assert(ok == 1);
    }

    #[external]
    fn record_deposit(ref self: ContractState, tour_id: felt252, player: felt252, amount: Uint256) {
        self.only_depositor();
        let prev_total = self.total_deposited.read(tour_id);
        let new_total = uint256_add(prev_total, amount);
        self.total_deposited.write(tour_id, new_total);

        let key = (tour_id, player);
        let prev_pd = self.player_deposit.read(key);
        let new_pd = uint256_add(prev_pd, amount);
        self.player_deposit.write(key, new_pd);

        emit!(DepositRecorded { tour_id, player, amount });
    }

    #[external]
    fn refund_all(ref self: ContractState, tour_id: felt252, players: Array<felt252>) {
        self.only_depositor();
        let token = self.token.read();
        let erc20 = IERC20Dispatcher { contract_address: token };

        for player in players.iter() {
            let key = (tour_id, player);
            let deposited = self.player_deposit.read(key);
            self.player_deposit.write(key, Uint256 { low: 0, high: 0 });

            let prev_total = self.total_deposited.read(tour_id);
            let new_total = uint256_sub(prev_total, deposited);
            self.total_deposited.write(tour_id, new_total);

            erc20.transfer(player, deposited);
            emit!(Refunded { tour_id, player, amount: deposited });
        }
    }

    #[external]
    fn payout(
        ref self: ContractState, tour_id: felt252, players: Array<felt252>, amounts: Array<Uint256>,
    ) {
        self.only_payer();
        let token = self.token.read();
        let erc20 = IERC20Dispatcher { contract_address: token };
        let len = players.len();
        assert(len == amounts.len());
        let mut i = 0;
        while i < len {
            let player = players.at(i);
            let amt = amounts.at(i);
            let prev_total = self.total_deposited.read(tour_id);
            let new_total = uint256_sub(prev_total, amt);
            self.total_deposited.write(tour_id, new_total);
            // Clear any recorded deposit for the player to prevent later refunds.
            let key = (tour_id, player);
            self.player_deposit.write(key, Uint256 { low: 0, high: 0 });
            erc20.transfer(player, amt);
            emit!(PayoutMade { tour_id, player, amount: amt });
            i = i + 1;
        }
    }

    #[view]
    fn get_total_deposited(self: @ContractState, tour_id: felt252) -> Uint256 {
        self.total_deposited.read(tour_id)
    }

    #[view]
    fn get_player_deposit(self: @ContractState, tour_id: felt252, player: felt252) -> Uint256 {
        self.player_deposit.read((tour_id, player))
    }
}
