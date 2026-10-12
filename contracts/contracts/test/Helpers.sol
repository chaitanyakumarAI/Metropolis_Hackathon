// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IFirstFan {
    function registerCreator(
        string calldata handle,
        string calldata name,
        string calldata bio,
        string calldata avatarURI,
        string calldata category,
        uint32 foundingSlots,
        Tier[] calldata tiers
    ) external;
    function withdraw(address payable to) external;
    struct Tier {
        string name;
        uint128 minTotal;
        string perk;
    }
}

/// @dev Test-only creator that tries to re-enter withdraw() when paid.
contract ReentrantCreator {
    IFirstFan public immutable target;
    uint256 public reentryAttempts;
    bool public reentrySucceeded;

    constructor(address _target) {
        target = IFirstFan(_target);
    }

    function register() external {
        IFirstFan.Tier[] memory tiers = new IFirstFan.Tier[](0);
        target.registerCreator("attacker", "Attacker", "", "", "test", 10, tiers);
    }

    function attack() external {
        target.withdraw(payable(address(this)));
    }

    receive() external payable {
        reentryAttempts++;
        if (reentryAttempts == 1) {
            try target.withdraw(payable(address(this))) {
                reentrySucceeded = true;
            } catch {}
        }
    }
}

/// @dev Test-only recipient that rejects ETH.
contract RejectingReceiver {
    receive() external payable {
        revert("no");
    }
}
