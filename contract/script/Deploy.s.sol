// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/EzEarnFactory.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the factory contract
        EzEarnFactory factory = new EzEarnFactory();
        
        console.log("EzEarnFactory deployed at:", address(factory));

        vm.stopBroadcast();
    }
}