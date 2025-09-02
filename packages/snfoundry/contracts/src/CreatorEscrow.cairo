#[starknet::contract]
mod CreatorEscrow {
    use starknet::math::uint256::Uint256;
    use starknet::storage::legacy::LegacyMap;
    use starknet::syscalls::{get_caller_address, get_contract_address};

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: felt252, amount: Uint256) -> bool;
        fn balance_of(self: @TContractState, owner: felt252) -> Uint256;
    }

    #[storage]
    struct Storage {
        owner: felt252,
        token: felt252,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct CreatorWithdrawn {
        to: felt252,
        amount: Uint256,
    }

    fn only_owner(self: @ContractState) {
        let caller = get_caller_address();
        assert(caller == self.owner.read());
    }

    #[constructor]
    fn constructor(ref self: ContractState, token: felt252, creator: felt252) {
        self.owner.write(creator);
        self.token.write(token);
    }

    #[external]
    fn withdraw_all(ref self: ContractState, to: felt252) {
        self.only_owner();
        let token = self.token.read();
        let erc20 = IERC20Dispatcher { contract_address: token };
        let this = get_contract_address();
        let bal = erc20.balance_of(this);
        erc20.transfer(to, bal);
        emit!(CreatorWithdrawn { to, amount: bal });
    }

    #[view]
    fn get_balance(self: @ContractState) -> Uint256 {
        let token = self.token.read();
        let erc20 = IERC20Dispatcher { contract_address: token };
        let this = get_contract_address();
        erc20.balance_of(this)
    }
}
