#[starknet::contract]
mod ProtocolTreasury {
    use starknet::math::uint256::Uint256;
    use starknet::syscalls::{get_caller_address, get_contract_address};

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn balance_of(self: @TContractState, owner: felt252) -> Uint256;
        fn transfer(ref self: TContractState, recipient: felt252, amount: Uint256) -> bool;
    }

    #[storage]
    struct Storage {
        owner: felt252,
        token: felt252,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct FeeWithdrawn {
        to: felt252,
        amount: Uint256,
    }

    fn only_owner(self: @ContractState) {
        let caller = get_caller_address();
        assert(caller == self.owner.read());
    }

    #[constructor]
    fn constructor(ref self: ContractState, token: felt252) {
        let caller = get_caller_address();
        self.owner.write(caller);
        self.token.write(token);
    }

    #[external]
    fn withdraw_all(ref self: ContractState, to: felt252) {
        self.only_owner();
        let token = self.token.read();
        let erc20 = IERC20Dispatcher { contract_address: token };
        let bal = erc20.balance_of(get_contract_address());
        erc20.transfer(to, bal);
        emit!(FeeWithdrawn { to, amount: bal });
    }

    #[view]
    fn get_balance(self: @ContractState) -> Uint256 {
        let token = self.token.read();
        let erc20 = IERC20Dispatcher { contract_address: token };
        erc20.balance_of(get_contract_address())
    }
}
