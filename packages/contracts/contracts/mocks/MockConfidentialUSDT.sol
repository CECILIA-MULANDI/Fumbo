// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @notice Open-mint ERC-7984 for local tests
contract MockConfidentialUSDT is ERC7984, ZamaEthereumConfig {
    constructor() ERC7984("Mock Confidential USDT", "cUSDT", "") {}

    function mint(address to, uint64 amount) external {
        euint64 encAmount = FHE.asEuint64(amount);
        FHE.allowThis(encAmount);
        _mint(to, encAmount);
    }
}
