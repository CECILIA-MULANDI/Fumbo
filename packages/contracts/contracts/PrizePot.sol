// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

contract PrizePot is ZamaEthereumConfig {
    IERC7984 public immutable token;
    address public immutable deployer;

    euint64 private _encReserve;
    euint64 private _encPot;
    euint64 private _encTotalYieldAccrued;

    address public pool;
    address public drawRegistry;
    bool public wired;

    event ReserveFunded(uint64 amount);
    event Accrued();
    event Snapshot();
    event Released(address indexed recipient);
    event Rolledover();

    error AlreadyWired();
    error NotDeployer();
    error NotAuthorized();

    constructor(IERC7984 token_) {
        token = token_;
        deployer = msg.sender;
        _encReserve = FHE.asEuint64(uint64(0));
        _encPot = FHE.asEuint64(uint64(0));
        _encTotalYieldAccrued = FHE.asEuint64(uint64(0));
        FHE.allowThis(_encReserve);
        FHE.allowThis(_encPot);
        FHE.allowThis(_encTotalYieldAccrued);
    }

    modifier onlyDeployer() {
        if (msg.sender != deployer) revert NotDeployer();
        _;
    }

    modifier onlyPool() {
        if (msg.sender != pool) revert NotAuthorized();
        _;
    }

    modifier onlyDrawRegistry() {
        if (msg.sender != drawRegistry) revert NotAuthorized();
        _;
    }

    /// @notice One-shot setter for Pool and DrawRegistry addresses; resolves the deployment cycle.
    function wire(address pool_, address drawRegistry_) external onlyDeployer {
        if (wired) revert AlreadyWired();
        pool = pool_;
        drawRegistry = drawRegistry_;
        wired = true;
    }

    /// @notice Admin adds `amount` cUSDT to the reserve; amount is publicly broadcast (documented leakage on initial funding).
    /// @dev Admin must have separately transferred `amount` cUSDT to this contract via confidentialTransfer.
    function fundReserve(uint64 amount) external onlyDeployer {
        _encReserve = FHE.add(_encReserve, FHE.asEuint64(amount));
        FHE.allowThis(_encReserve);
        emit ReserveFunded(amount);
    }

    /// @notice DrawRegistry moves simulated yield from reserve into pot; clamps to available reserve via FHE.min.
    function accrue(euint64 encAmount) external onlyDrawRegistry {
        euint64 credited = FHE.min(encAmount, _encReserve);
        _encReserve = FHE.sub(_encReserve, credited);
        _encPot = FHE.add(_encPot, credited);
        _encTotalYieldAccrued = FHE.add(_encTotalYieldAccrued, credited);
        FHE.allowThis(_encReserve);
        FHE.allowThis(_encPot);
        FHE.allowThis(_encTotalYieldAccrued);
        emit Accrued();
    }

    /// @notice DrawRegistry snapshots the current pot as this draw's prize; drains _encPot to zero.
    /// @dev Grants ACL to caller (DrawRegistry) so it can store and later re-grant to Pool.
    function snapshot() external onlyDrawRegistry returns (euint64 amount) {
        amount = _encPot;
        _encPot = FHE.asEuint64(uint64(0));
        FHE.allowThis(_encPot);
        FHE.allowThis(amount);
        FHE.allow(amount, msg.sender);
        emit Snapshot();
    }

    /// @notice Pool credits the prize to `recipient` iff `isWinner` is true; losers silently receive 0.
    /// @dev encPrizeAmount is the per-draw snapshot; identical for all claimers so leaks nothing about winner.
    function release(address recipient, ebool isWinner, euint64 encPrizeAmount) external onlyPool {
        euint64 encPrize = FHE.select(isWinner, encPrizeAmount, FHE.asEuint64(uint64(0)));
        FHE.allowThis(encPrize);
        FHE.allow(encPrize, address(token));
        token.confidentialTransfer(recipient, encPrize);
        emit Released(recipient);
    }

    /// @notice DrawRegistry returns an expired-draw snapshot to the pot for the next draw.
    function rollover(euint64 encAmount) external onlyDrawRegistry {
        _encPot = FHE.add(_encPot, encAmount);
        FHE.allowThis(_encPot);
        emit Rolledover();
    }

    function encReserve() external view returns (euint64) {
        return _encReserve;
    }

    function encPot() external view returns (euint64) {
        return _encPot;
    }

    function encTotalYieldAccrued() external view returns (euint64) {
        return _encTotalYieldAccrued;
    }
}
