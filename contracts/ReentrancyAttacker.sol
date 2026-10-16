
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "./SimpleEscrow.sol";

contract ReentrancyAttacker {
    SimpleEscrow public escrow;

    uint256 public reentryAttempts;
    bool public reentrySucceeded;

    constructor(address _freelancer) {
        // Ce contrat crée l'escrow :
        // il en sera donc le client.
        escrow = new SimpleEscrow(_freelancer);
    }

    function attack() external payable {
        require(msg.value > 0, "Send ETH");

        // Le contrat dépose l'argent dans l'escrow.
        escrow.fund{value: msg.value}();

        // Il annule puis réclame son remboursement.
        escrow.cancel();
        escrow.withdraw();
    }

    receive() external payable {
        // À la réception de l'ETH, on tente de retirer une
        // deuxième fois avant la fin du premier retrait.
        reentryAttempts++;

        (bool success, ) = address(escrow).call(
            abi.encodeWithSignature("withdraw()")
        );

        if (success) {
            reentrySucceeded = true;
        }
    }
}
