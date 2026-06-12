// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentTraceProofRegistry
 * @notice Minimal on-chain anchor for AgentTrace Proof-of-Execution receipts.
 *
 * The contract exists ONLY to emit an event recording that a given
 * `receiptHash` and `publicReportUrl` were registered by a particular
 * submitter at a given block timestamp. AgentTrace builds receipt hashes
 * off-chain; this contract is a public, append-only index that lets
 * anyone trace a hash back to the original public report URL.
 *
 * Design notes:
 *  - The contract holds NO funds and CANNOT transfer funds.
 *  - There is NO owner, NO upgrade path, NO admin functions.
 *  - There is no storage write; only an event emit. Gas is bounded by the
 *    URL string size.
 *  - Anyone can call registerProof. The registry is a notarisation index,
 *    not an authorisation gate. Authentication / authorship of the
 *    underlying receipt is enforced off-chain (receipt hash + public link).
 *  - Intended deployment: Base Sepolia (chainId 84532) for testnet demo.
 *    Do not deploy to mainnet without an explicit access-control review.
 */
contract AgentTraceProofRegistry {
    /// @notice Emitted whenever a receipt hash is anchored on-chain.
    /// @param receiptHash    sha256 (or any 32-byte digest) of the off-chain receipt JSON
    /// @param publicReportUrl Public URL of the AgentTrace report
    /// @param submitter      Address that submitted the registration tx
    /// @param timestamp      block.timestamp at registration
    event ProofRegistered(
        bytes32 indexed receiptHash,
        string publicReportUrl,
        address indexed submitter,
        uint256 timestamp
    );

    /**
     * @notice Anchor a receipt hash and its public report URL on-chain.
     * @dev Emits ProofRegistered. Performs no storage writes and no value
     *      transfer. The caller (msg.sender) is recorded as the submitter.
     * @param receiptHash      Off-chain receipt digest (e.g. sha256 of canonical JSON).
     * @param publicReportUrl  Public AgentTrace report URL.
     */
    function registerProof(bytes32 receiptHash, string calldata publicReportUrl) external {
        emit ProofRegistered(receiptHash, publicReportUrl, msg.sender, block.timestamp);
    }
}
