// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DemoToken
 * @notice 平台自己发行的 ERC20：本地链演示代币 ALC/BOB、单元测试，以及老师的 GR001~GR005。
 *         学生交易用的是各自在实验 2 手写的代币，不使用本合约。
 */
contract DemoToken is ERC20, Ownable {
    constructor(string memory name_, string memory symbol_, address owner_) ERC20(name_, symbol_) Ownable(owner_) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
