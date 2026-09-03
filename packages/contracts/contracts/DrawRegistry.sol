// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IFumboPool {
    function encTotalDeposits() external view returns (euint64);
    function depositorCount() external view returns (uint32);
    function depositorAt(uint32 index) external view returns (address);
    function encBalanceOf(address user) external view returns (euint64);
    function isDepositor(address user) external view returns (bool);
    function indexOf(address user) external view returns (uint32);
    function poolCapPow2() external view returns (uint64);
}

interface IPrizePot {
    function accrue(euint64 encAmount) external;
    function snapshot() external returns (euint64);
    function rollover(euint64 encAmount) external;
}

contract DrawRegistry is ZamaEthereumConfig {
    IFumboPool public immutable pool;
    IPrizePot public immutable prizePot;
    uint64 public immutable drawInterval;
    uint64 public immutable claimTimeout;
    uint16 public immutable aprBps;

    uint32 private constant NO_WINNER = type(uint32).max;
    uint64 private constant SECONDS_PER_YEAR = 365 days;
    uint64 private constant BPS = 10000;

    enum Status {
        Pending,
        Expired
    }

    struct Draw {
        uint64 timestamp;
        uint256 prevrandaoAtDraw;
        Status status;
        bool hasAnyClaim;
    }

    Draw[] public draws;
    uint64 public lastDrawTime;
    mapping(uint32 => euint32) private _encWinnerIndex;
    mapping(uint32 => euint64) private _encPrizeAmount;
    mapping(uint32 => mapping(address => bool)) public claimed;
    mapping(uint32 => mapping(address => ebool)) public revealedIsWinner;

    event DrawTriggered(uint32 indexed drawId, uint256 prevrandao, euint64 indexed encPrizeAmount, euint32 indexed encWinnerIndex);
    event ClaimMarked(uint32 indexed drawId, address indexed user);
    event DrawExpired(uint32 indexed drawId, bool hadClaim);
    event WinnerRevealed(uint32 indexed drawId, address indexed user, ebool indexed result);

    error DrawNotReady();
    error DrawNotExpirable();
    error NotPool();
    error InvalidDraw();
    error NoDepositors();
    error AlreadyExpired();

    constructor(
        IFumboPool pool_,
        IPrizePot prizePot_,
        uint64 drawInterval_,
        uint64 claimTimeout_,
        uint16 aprBps_
    ) {
        pool = pool_;
        prizePot = prizePot_;
        drawInterval = drawInterval_;
        claimTimeout = claimTimeout_;
        aprBps = aprBps_;
        lastDrawTime = uint64(block.timestamp);
    }

    modifier onlyPool() {
        if (msg.sender != address(pool)) revert NotPool();
        _;
    }

    /// @notice Permissionless. Accrues yield, snapshots prize, samples encrypted RNG, runs weighted sweep, stores winner.
    function triggerDraw() external {
        if (block.timestamp < lastDrawTime + drawInterval) revert DrawNotReady();
        uint32 n = pool.depositorCount();
        if (n == 0) revert NoDepositors();

        uint64 elapsed = uint64(block.timestamp) - lastDrawTime;
        euint64 encTotal = pool.encTotalDeposits();
        euint64 encYield = FHE.div(FHE.mul(encTotal, uint64(aprBps) * elapsed), BPS * SECONDS_PER_YEAR);
        FHE.allowTransient(encYield, address(prizePot));
        prizePot.accrue(encYield);

        euint64 encPrizeAmt = prizePot.snapshot();
        FHE.makePubliclyDecryptable(encPrizeAmt);
        FHE.allow(encPrizeAmt, address(prizePot));
        FHE.allow(encPrizeAmt, address(pool));

        uint64 cap = pool.poolCapPow2();
        euint64 encR = FHE.randEuint64(cap);
        uint64 pubR = uint64(uint256(block.prevrandao)) & (cap - 1);
        euint64 r = FHE.xor(encR, FHE.asEuint64(pubR));

        euint64 cumsum = FHE.asEuint64(uint64(0));
        euint32 winnerIdx = FHE.asEuint32(NO_WINNER);
        ebool foundYet = FHE.asEbool(false);
        for (uint32 i = 0; i < n; i++) {
            address user = pool.depositorAt(i);
            euint64 bal = pool.encBalanceOf(user);
            cumsum = FHE.add(cumsum, bal);
            ebool rBelow = FHE.lt(r, cumsum);
            ebool thisIsWinner = FHE.and(rBelow, FHE.not(foundYet));
            winnerIdx = FHE.select(thisIsWinner, FHE.asEuint32(i + 1), winnerIdx);
            foundYet = FHE.or(foundYet, thisIsWinner);
        }

        uint32 drawId = uint32(draws.length);
        draws.push(Draw({
            timestamp: uint64(block.timestamp),
            prevrandaoAtDraw: block.prevrandao,
            status: Status.Pending,
            hasAnyClaim: false
        }));

        _encWinnerIndex[drawId] = winnerIdx;
        _encPrizeAmount[drawId] = encPrizeAmt;
        FHE.allowThis(winnerIdx);
        FHE.allowThis(encPrizeAmt);

        lastDrawTime = uint64(block.timestamp);
        emit DrawTriggered(drawId, block.prevrandao, encPrizeAmt, winnerIdx);
    }

    /// @notice Returns encrypted true/false for whether `user` won `drawId`. Grants ACL to caller for EIP-712 decrypt.
    function didIWin(uint32 drawId, address user) external returns (ebool) {
        if (drawId >= draws.length) revert InvalidDraw();
        ebool result;
        if (!pool.isDepositor(user)) {
            result = FHE.asEbool(false);
        } else {
            uint32 idx = pool.indexOf(user);
            result = FHE.eq(_encWinnerIndex[drawId], FHE.asEuint32(idx));
        }
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        revealedIsWinner[drawId][user] = result;
        emit WinnerRevealed(drawId, user, result);
        return result;
    }

    /// @notice Returns the encrypted prize amount for a draw. Publicly decryptable (set at trigger time).
    function encPrizeAmount(uint32 drawId) external view returns (euint64) {
        if (drawId >= draws.length) revert InvalidDraw();
        return _encPrizeAmount[drawId];
    }

    /// @notice Pool marks a claim; prevents double-claim and gates rollover on expiry.
    function markClaimed(uint32 drawId, address user) external onlyPool {
        if (drawId >= draws.length) revert InvalidDraw();
        claimed[drawId][user] = true;
        draws[drawId].hasAnyClaim = true;
        emit ClaimMarked(drawId, user);
    }

    /// @notice Permissionless after claim window. Rolls over only if nobody attempted to claim.
    function expireDraw(uint32 drawId) external {
        if (drawId >= draws.length) revert InvalidDraw();
        Draw storage d = draws[drawId];
        if (d.status != Status.Pending) revert AlreadyExpired();
        if (block.timestamp <= d.timestamp + claimTimeout) revert DrawNotExpirable();
        if (!d.hasAnyClaim) {
            prizePot.rollover(_encPrizeAmount[drawId]);
        }
        d.status = Status.Expired;
        emit DrawExpired(drawId, d.hasAnyClaim);
    }

    function drawCount() external view returns (uint32) {
        return uint32(draws.length);
    }
}
