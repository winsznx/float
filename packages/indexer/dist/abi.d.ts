/**
 * Event ABIs, copied from the deployed contracts. Only the events matter here
 * — the indexer never writes to the chain.
 */
export declare const LEASH_EVENTS: readonly [{
    readonly type: "event";
    readonly name: "LeashCreated";
    readonly inputs: readonly [{
        readonly name: "leashId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "owner";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "beneficiary";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "token";
        readonly type: "address";
        readonly indexed: false;
    }, {
        readonly name: "spendLimit";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "expiry";
        readonly type: "uint64";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "LeashSpent";
    readonly inputs: readonly [{
        readonly name: "leashId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "beneficiary";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "to";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "remaining";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "LeashRevoked";
    readonly inputs: readonly [{
        readonly name: "leashId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "owner";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "unspent";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}];
export declare const PLEDGE_EVENTS: readonly [{
    readonly type: "event";
    readonly name: "PledgeCreated";
    readonly inputs: readonly [{
        readonly name: "pledgeId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "pledger";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "witness";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "token";
        readonly type: "address";
        readonly indexed: false;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "deadline";
        readonly type: "uint64";
        readonly indexed: false;
    }, {
        readonly name: "failureDestination";
        readonly type: "address";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "PledgeSucceeded";
    readonly inputs: readonly [{
        readonly name: "pledgeId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "witness";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amountReturned";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "PledgeFailed";
    readonly inputs: readonly [{
        readonly name: "pledgeId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "witness";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "failureDestination";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amountSlashed";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "PledgeExpiredSlashed";
    readonly inputs: readonly [{
        readonly name: "pledgeId";
        readonly type: "bytes32";
        readonly indexed: true;
    }, {
        readonly name: "caller";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "failureDestination";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amountSlashed";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}];
