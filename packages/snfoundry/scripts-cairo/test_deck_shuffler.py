# test_deck_shuffler.py  – Starknet Foundry / pytest
import asyncio, pytest
from nile_pytest import DevnetAccount, deploy_contract

@pytest.mark.asyncio
async def test_oracle_flow(devnet, accounts: DevnetAccount):
    user   = accounts[0]
    oracle = accounts[1]

    shuffler = await deploy_contract("src/DeckShuffler.cairo", account=user)

    server_seed   = 12345678901234567890
    commit_hash   = (server_seed ** 2) % (2**251)  # simple stand-in
    tx = await user.send(shuffler.request_random_deck(commit_hash))
    req_id = tx.result

    # Simulate VRF callback
    rand = [i for i in range(100,152)]  # deterministic stub
    await oracle.send(
        shuffler.fulfill_random_deck(req_id, server_seed, rand)
    )

    deck = await shuffler.get_deck(req_id)
    assert len(deck) == 104
