// SPDX Licence-Identifier: MIT
pragma solidity 0.8.6;

import "@energyweb/iam-contracts/dist/contracts/roles/ClaimManager.sol";
// import { ClaimManager as TrustedClaimManager } from "@energyweb/iam-contracts/dist/contracts/roles/ClaimManager.sol";


library RolesLibrary {

    function hasRole(
        address _userAddress,
        address _claimManagerAddress,
        bytes32[] memory _roles
    ) internal view returns (bool) {
        if (_roles.length == 0) {
            return true;
        }
        ClaimManager claimManager = ClaimManager(_claimManagerAddress); // Contract deployed and maintained by EnergyWeb Fondation
        for (uint i = 0; i < _roles.length; i++) {
            if (claimManager.hasRole(_userAddress, _roles[i], 1)) {
                return true;
            }
        }
        return false;
    }

    function isOwner(address _user, address _claimManagerAddress, bytes32 _ownerRole) internal view returns (bool){
        ClaimManager claimManager = ClaimManager(_claimManagerAddress); // Contract deployed and maintained by EnergyWeb Fondation

        return (claimManager.hasRole(_user, _ownerRole, 1));
    }
}
