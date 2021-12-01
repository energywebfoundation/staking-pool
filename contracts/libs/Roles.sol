// SPDX Licence-Identifier: MIT
pragma solidity 0.8.6;

import { ClaimManager as TrustedClaimManager } from "@energyweb/iam-contracts/dist/contracts/roles/ClaimManager.sol";


library RolesLibrary {

    function hasRole(
        address _userAddress,
        address _claimManagerAddress,
        bytes32[] memory _roles,
        uint256 _roleVersion
    ) internal view returns (bool) {
        if (_roles.length == 0) {
            return true;
        }
        TrustedClaimManager claimManager = TrustedClaimManager(_claimManagerAddress); // Contract deployed and maintained by EnergyWeb Fondation
        for (uint i = 0; i < _roles.length; i++) {
            if (claimManager.hasRole(_userAddress, _roles[i], _roleVersion)) {
                return true;
            }
        }
        return false;
    }

    function isOwner(address _user, address _claimManagerAddress, bytes32 _ownerRole, uint256 _roleVersion) internal view returns (bool){
        TrustedClaimManager claimManager = TrustedClaimManager(_claimManagerAddress); // Contract deployed and maintained by EnergyWeb Fondation

        return (claimManager.hasRole(_user, _ownerRole, _roleVersion));
    }
}
