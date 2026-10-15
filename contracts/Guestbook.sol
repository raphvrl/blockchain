
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract Guestbook {
    struct Entry {
        address sender;
        string message;
        uint256 timestamp;
    }

    Entry[] private entries;

    mapping(address => uint256) public lastPostedAt;
    mapping(address => bool) private hasPosted;

    event MessagePosted(
        address indexed sender,
        string message,
        uint256 timestamp
    );

    function postMessage(string calldata _message) external {
        require(bytes(_message).length > 0, "Message cannot be empty");

        require(
            !hasPosted[msg.sender] ||
            block.timestamp >= lastPostedAt[msg.sender] + 1 days,
            "Wait 24 hours"
        );

        entries.push(
            Entry({
                sender: msg.sender,
                message: _message,
                timestamp: block.timestamp
            })
        );

        lastPostedAt[msg.sender] = block.timestamp;
        hasPosted[msg.sender] = true;

        emit MessagePosted(msg.sender, _message, block.timestamp);
    }

    function getEntryCount() external view returns (uint256) {
        return entries.length;
    }

    function getEntry(uint256 index)
        external
        view
        returns (address sender, string memory message, uint256 timestamp)
    {
        require(index < entries.length, "Entry does not exist");

        Entry storage entry = entries[index];

        return (entry.sender, entry.message, entry.timestamp);
    }
}
