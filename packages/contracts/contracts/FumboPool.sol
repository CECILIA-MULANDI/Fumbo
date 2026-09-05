// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

interface IPrizePot {
    function release(address recipient, ebool isWinner, euint64 encPrizeAmount) external;
}

interface IDrawRegistry {
    function didIWin(uint32 drawId, address user) external returns (ebool);
    function encPrizeAmount(uint32 drawId) external view returns (euint64);
    function markClaimed(uint32 drawId, address user) external;
    function claimed(uint32 drawId, address user) external view returns (bool);
}

contract FumboPool is ZamaEthereumConfig {
    IERC7984 public immutable token;
    IPrizePot public immutable prizePot;
    uint64 public immutable poolCapPow2;
    uint32 public immutable maxDepositors;
    address public immutable deployer;

    IDrawRegistry public drawRegistry;
    bool public wired;

    mapping(address => euint64) private _encBalance;
    euint64 private _encTotalDeposits;

    address[] public depositors;
    mapping(address => uint32) public indexOf;

    event Deposited(address indexed user, euint64 indexed encAmount);
    event Withdrawn(address indexed user, euint64 indexed encAmount);
    event Claimed(uint32 indexed drawId, address indexed user, ebool indexed isWinner);

    error AlreadyWired();
    error NotWired();
    error NotDeployer();
    error CapExceeded();
    error AlreadyClaimed();

    constructor(IERC7984 token_, IPrizePot prizePot_, uint64 poolCapPow2_, uint32 maxDepositors_) {
        require(poolCapPow2_ > 0 && (poolCapPow2_ & (poolCapPow2_ - 1)) == 0, "cap must be power of 2");
        token = token_;
        prizePot = prizePot_;
        poolCapPow2 = poolCapPow2_;
        maxDepositors = maxDepositors_;
        deployer = msg.sender;
        _encTotalDeposits = FHE.asEuint64(uint64(0));
        FHE.allowThis(_encTotalDeposits);
        FHE.makePubliclyDecryptable(_encTotalDeposits);
    }

    modifier onlyDeployer() {
        if (msg.sender != deployer) revert NotDeployer();
        _;
    }

    /// @notice One-shot setter for DrawRegistry address; deployer-only.
    function setDrawRegistry(IDrawRegistry drawRegistry_) external onlyDeployer {
        if (wired) revert AlreadyWired();
        drawRegistry = drawRegistry_;
        wired = true;
        FHE.allow(_encTotalDeposits, address(drawRegistry_));
    }

    /// @notice Deposit encrypted `encAmount` cUSDT into the pool. Requires prior `token.setOperator(this, until)` by caller.
    function deposit(externalEuint64 encAmount, bytes calldata proof) external {
        if (!wired) revert NotWired();

        euint64 requested = FHE.fromExternal(encAmount, proof);
        FHE.allowTransient(requested, address(token));
        euint64 transferred = token.confidentialTransferFrom(msg.sender, address(this), requested);

        if (indexOf[msg.sender] == 0) {
            if (depositors.length >= maxDepositors) revert CapExceeded();
            depositors.push(msg.sender);
            indexOf[msg.sender] = uint32(depositors.length);
            _encBalance[msg.sender] = transferred;
        } else {
            _encBalance[msg.sender] = FHE.add(_encBalance[msg.sender], transferred);
        }
        _encTotalDeposits = FHE.add(_encTotalDeposits, transferred);

        FHE.allowThis(_encBalance[msg.sender]);
        FHE.allow(_encBalance[msg.sender], msg.sender);
        FHE.allow(_encBalance[msg.sender], address(drawRegistry));
        FHE.allowThis(_encTotalDeposits);
        FHE.allow(_encTotalDeposits, address(drawRegistry));
        FHE.makePubliclyDecryptable(_encTotalDeposits);

        emit Deposited(msg.sender, transferred);
    }

    /// @notice Withdraw up to `encAmount` cUSDT of principal. Clamps to current balance via FHE.min; no loss.
    function withdraw(externalEuint64 encAmount, bytes calldata proof) external {
        if (!wired) revert NotWired();
        if (indexOf[msg.sender] == 0) return;

        euint64 requested = FHE.fromExternal(encAmount, proof);
        euint64 credited = FHE.min(requested, _encBalance[msg.sender]);

        _encBalance[msg.sender] = FHE.sub(_encBalance[msg.sender], credited);
        _encTotalDeposits = FHE.sub(_encTotalDeposits, credited);

        FHE.allowThis(credited);
        FHE.allow(credited, address(token));
        token.confidentialTransfer(msg.sender, credited);

        FHE.allowThis(_encBalance[msg.sender]);
        FHE.allow(_encBalance[msg.sender], msg.sender);
        FHE.allow(_encBalance[msg.sender], address(drawRegistry));
        FHE.allowThis(_encTotalDeposits);
        FHE.allow(_encTotalDeposits, address(drawRegistry));
        FHE.makePubliclyDecryptable(_encTotalDeposits);

        emit Withdrawn(msg.sender, credited);
    }

    /// @notice Claim for `drawId`. Winner gets encrypted prize; non-winners silently receive zero.
    function claim(uint32 drawId) external {
        if (!wired) revert NotWired();
        if (drawRegistry.claimed(drawId, msg.sender)) revert AlreadyClaimed();
        ebool isWinner = drawRegistry.didIWin(drawId, msg.sender);
        euint64 encPrize = drawRegistry.encPrizeAmount(drawId);
        FHE.allowTransient(isWinner, address(prizePot));
        FHE.allowTransient(encPrize, address(prizePot));
        prizePot.release(msg.sender, isWinner, encPrize);
        drawRegistry.markClaimed(drawId, msg.sender);
        emit Claimed(drawId, msg.sender, isWinner);
    }

    function encBalanceOf(address user) external view returns (euint64) {
        return _encBalance[user];
    }

    function encTotalDeposits() external view returns (euint64) {
        return _encTotalDeposits;
    }

    function depositorCount() external view returns (uint32) {
        return uint32(depositors.length);
    }

    function depositorAt(uint32 index) external view returns (address) {
        return depositors[index];
    }

    function isDepositor(address user) external view returns (bool) {
        return indexOf[user] != 0;
    }
}
