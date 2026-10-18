// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PotosDEX
 * @notice 课堂用的 ERC20 挂单簿：任何人挂单（卖出 A 换取 B），任何人整单吃单，一笔交易内完成原子互换。
 *
 * 设计取舍（面向零基础学生的教学场景）：
 * - 挂单时把卖出的代币托管进本合约，保证每个挂单都能被吃，撤单原路退回。
 * - 只支持整单成交，不支持部分成交，界面和讲解都更简单。
 * - 不收手续费、没有管理员、任何 ERC20 都能挂，本合约不持有任何特权。
 */
contract PotosDEX is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        Open,
        Filled,
        Cancelled
    }

    struct Order {
        address maker;
        address tokenGive; // maker 卖出的代币
        uint256 amountGive;
        address tokenWant; // maker 想要的代币
        uint256 amountWant;
        Status status;
        address taker; // 成交后记录吃单者
    }

    uint256 public orderCount;
    mapping(uint256 => Order) private _orders;

    event OrderPosted(
        uint256 indexed id,
        address indexed maker,
        address indexed tokenGive,
        uint256 amountGive,
        address tokenWant,
        uint256 amountWant
    );
    event OrderFilled(uint256 indexed id, address indexed taker, address indexed maker);
    event OrderCancelled(uint256 indexed id, address indexed maker);

    error InvalidToken();
    error InvalidAmount();
    error OrderNotOpen(uint256 id);
    error NotMaker(uint256 id);
    error OrderDoesNotExist(uint256 id);

    /**
     * @notice 挂单：把 amountGive 个 tokenGive 托管进合约，换取 amountWant 个 tokenWant。
     * @dev 调用前 maker 必须先在 tokenGive 上 approve 本合约至少 amountGive。
     */
    function postOrder(
        address tokenGive,
        uint256 amountGive,
        address tokenWant,
        uint256 amountWant
    ) external nonReentrant returns (uint256 id) {
        if (tokenGive == address(0) || tokenWant == address(0) || tokenGive == tokenWant) revert InvalidToken();
        if (amountGive == 0 || amountWant == 0) revert InvalidAmount();

        id = orderCount++;
        _orders[id] = Order({
            maker: msg.sender,
            tokenGive: tokenGive,
            amountGive: amountGive,
            tokenWant: tokenWant,
            amountWant: amountWant,
            status: Status.Open,
            taker: address(0)
        });

        IERC20(tokenGive).safeTransferFrom(msg.sender, address(this), amountGive);

        emit OrderPosted(id, msg.sender, tokenGive, amountGive, tokenWant, amountWant);
    }

    /**
     * @notice 吃单：taker 付出 amountWant 个 tokenWant 给 maker，同时收到托管的 amountGive 个 tokenGive。
     * @dev 调用前 taker 必须先在 tokenWant 上 approve 本合约至少 amountWant。两次转账在同一笔交易内，要么都成功要么都回滚。
     */
    function fillOrder(uint256 id) external nonReentrant {
        Order storage o = _order(id);
        if (o.status != Status.Open) revert OrderNotOpen(id);

        o.status = Status.Filled;
        o.taker = msg.sender;

        IERC20(o.tokenWant).safeTransferFrom(msg.sender, o.maker, o.amountWant);
        IERC20(o.tokenGive).safeTransfer(msg.sender, o.amountGive);

        emit OrderFilled(id, msg.sender, o.maker);
    }

    /// @notice 撤单：只有 maker 能撤，托管的代币原路退回。
    function cancelOrder(uint256 id) external nonReentrant {
        Order storage o = _order(id);
        if (o.status != Status.Open) revert OrderNotOpen(id);
        if (o.maker != msg.sender) revert NotMaker(id);

        o.status = Status.Cancelled;
        IERC20(o.tokenGive).safeTransfer(msg.sender, o.amountGive);

        emit OrderCancelled(id, msg.sender);
    }

    function getOrder(uint256 id) external view returns (Order memory) {
        return _order(id);
    }

    /// @notice 分页读取订单，供前端一次拉取订单簿。start 越界返回空数组。
    function getOrders(uint256 start, uint256 count) external view returns (Order[] memory page) {
        if (start >= orderCount) return page;
        uint256 end = start + count;
        if (end > orderCount) end = orderCount;
        page = new Order[](end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = _orders[i];
        }
    }

    function _order(uint256 id) private view returns (Order storage) {
        if (id >= orderCount) revert OrderDoesNotExist(id);
        return _orders[id];
    }
}
