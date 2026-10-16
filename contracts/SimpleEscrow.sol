
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract SimpleEscrow {
    enum State {
        None,
        Funded,
        Delivered,
        Released,
        Cancelled
    }

    address public client;
    address public freelancer;

    uint256 public amount;
    uint256 public owed;

    State public state;

    event EscrowFunded(
        address indexed client,
        address indexed freelancer,
        uint256 amount
    );

    event WorkDelivered();

    event PaymentReleased(uint256 amount);

    event Refunded(uint256 amount);

    event Withdrawal(address indexed recipient, uint256 amount);

    constructor(address _freelancer) {
        require(_freelancer != address(0), "Invalid freelancer");
        require(_freelancer != msg.sender, "Client cannot be freelancer");

        client = msg.sender;
        freelancer = _freelancer;
        state = State.None;
    }

    function fund() external payable {
        require(msg.sender == client, "Only client");
        require(state == State.None, "Invalid state");
        require(msg.value > 0, "Amount must be positive");

        amount = msg.value;
        state = State.Funded;

        emit EscrowFunded(client, freelancer, amount);
    }

    function markDelivered() external {
        require(msg.sender == freelancer, "Only freelancer");
        require(state == State.Funded, "Invalid state");

        state = State.Delivered;

        emit WorkDelivered();
    }

    function releasePayment() external {
        require(msg.sender == client, "Only client");
        require(state == State.Delivered, "Invalid state");

        state = State.Released;
        owed = amount;

        emit PaymentReleased(amount);
    }

    function cancel() external {
        require(msg.sender == client, "Only client");
        require(state == State.Funded, "Invalid state");

        state = State.Cancelled;
        owed = amount;

        emit Refunded(amount);
    }

    function withdraw() external {
        require(owed > 0, "Nothing to withdraw");

        uint256 payment = owed;
        owed = 0;

        if (state == State.Released) {
            require(msg.sender == freelancer, "Only freelancer");
        } else if (state == State.Cancelled) {
            require(msg.sender == client, "Only client");
        } else {
            revert("Invalid state");
        }

        (bool success, ) = payable(msg.sender).call{value: payment}("");
        require(success, "Transfer failed");

        emit Withdrawal(msg.sender, payment);
    }
}
