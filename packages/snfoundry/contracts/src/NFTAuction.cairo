#[starknet::contract]
mod NFTAuction {
    use starknet::math::uint256::{Uint256, uint256_add, uint256_div, uint256_mul, uint256_sub};
    use starknet::storage::legacy::LegacyMap;
    use starknet::syscalls::{get_caller_address, get_contract_address};

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer_from(
            ref self: TContractState, sender: felt252, recipient: felt252, amount: Uint256,
        ) -> bool;
        fn transfer(ref self: TContractState, recipient: felt252, amount: Uint256) -> bool;
    }

    #[starknet::interface]
    trait INFTTicket<TContractState> {
        fn safe_mint(
            ref self: TContractState, to: felt252, token_id: Uint256, tournament_id: felt252,
        );
    }

    #[storage]
    struct Storage {
        price: Uint256,
        token: felt252,
        ticket_nft: felt252,
        fee_vault: felt252,
        creator_escrow: felt252,
        bank: felt252,
        tournament_id: felt252,
        next_id: Uint256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct TicketSold {
        ticket_id: Uint256,
        buyer: felt252,
        price: Uint256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        price: Uint256,
        token: felt252,
        ticket_nft: felt252,
        fee_vault: felt252,
        creator_escrow: felt252,
        bank: felt252,
        tournament_id: felt252,
    ) {
        self.price.write(price);
        self.token.write(token);
        self.ticket_nft.write(ticket_nft);
        self.fee_vault.write(fee_vault);
        self.creator_escrow.write(creator_escrow);
        self.bank.write(bank);
        self.tournament_id.write(tournament_id);
        self.next_id.write(Uint256 { low: 1, high: 0 });
    }

    #[external]
    fn buy_ticket(ref self: ContractState) -> Uint256 {
        let buyer = get_caller_address();
        let price = self.price.read();
        let erc20_addr = self.token.read();
        let erc20 = IERC20Dispatcher { contract_address: erc20_addr };

        let mut next = self.next_id.read();
        // Effects: update state before external calls to mitigate re-entrancy.
        self.next_id.write(uint256_add(next, Uint256 { low: 1, high: 0 }));

        let this = get_contract_address();
        assert(erc20.transfer_from(buyer, this, price));

        let fee = uint256_div(price, Uint256 { low: 10, high: 0 });
        let two_fee = uint256_mul(fee, Uint256 { low: 2, high: 0 });
        let pool = uint256_sub(price, two_fee);

        let fee_vault = self.fee_vault.read();
        let creator_escrow = self.creator_escrow.read();
        let bank = self.bank.read();

        assert(erc20.transfer(fee_vault, fee));
        assert(erc20.transfer(creator_escrow, fee));
        assert(erc20.transfer(bank, pool));

        let ticket_nft = INFTTicketDispatcher { contract_address: self.ticket_nft.read() };
        let tour_id = self.tournament_id.read();
        ticket_nft.safe_mint(buyer, next, tour_id);

        emit!(TicketSold { ticket_id: next, buyer, price });
        next
    }
}
