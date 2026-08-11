// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Instrumentation contract for verifying that FHE.randEuint64 is not
/// predictable from public block state. Not a production contract; delete once
/// the empirical test has run.
contract RngGrindTest is ZamaEthereumConfig {
    struct Draw {
        euint64 value;
        uint64 blockNumber;
        uint64 blockTimestamp;
        uint256 prevrandao;
        bytes32 prevBlockhash;
        address caller;
    }

    // Matches FumboPool's intended value cap so we exercise the same bound
    // the pool will use later.
    uint8 public constant BOUND_POW2 = 40;

    Draw[] private _draws;

    function generate() external returns (uint256 drawId) {
        euint64 r = FHE.randEuint64(uint64(1) << BOUND_POW2);
        FHE.allowThis(r);
        FHE.allow(r, msg.sender);

        drawId = _draws.length;
        _draws.push(
            Draw({
                value: r,
                blockNumber: uint64(block.number),
                blockTimestamp: uint64(block.timestamp),
                prevrandao: block.prevrandao,
                prevBlockhash: blockhash(block.number - 1),
                caller: msg.sender
            })
        );
    }

    function getRandom(uint256 drawId) external view returns (euint64) {
        return _draws[drawId].value;
    }

    function getContext(uint256 drawId)
        external
        view
        returns (uint64 blockNumber, uint64 blockTimestamp, uint256 prevrandao, bytes32 prevBlockhash, address caller)
    {
        Draw storage d = _draws[drawId];
        return (d.blockNumber, d.blockTimestamp, d.prevrandao, d.prevBlockhash, d.caller);
    }

    function drawCount() external view returns (uint256) {
        return _draws.length;
    }
}
