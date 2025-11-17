import "@stdlib/deploy";
import "@stdlib/ownable";

// NFT Item Contract - Standard TON NFT
// Implements get_nft_data() for compatibility with wallets and explorers
message Transfer {
    queryId: Int as uint64;
    newOwner: Address;
    responseDestination: Address?;
    customPayload: Cell?;
    forwardAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

// Message sent by NftCollection at deployment to finalize owner and content
message InitFromCollection {
    collection: Address;
    index: Int as uint64;
    to: Address;
    content: Cell;
}

extend NftItem {
    // Initialize item data after deployment. Body layout matches NftCollection send:
    // .storeAddress(myAddress())
    // .storeUint(self.nextIndex, 64)
    // .storeAddress(msg.to)
    // .storeRef(msg.content)
    receive(msg: InitFromCollection) {
        let ctx: Context = context();
        // Only collection can initialize
        require(ctx.sender == self.collection, "Only collection can init item");
        self.owner = msg.to;
        self.content = msg.content;
    }
}

contract NftItem with Deployable {
    collection: Address;
    index: Int as uint64;
    owner: Address;
    content: Cell;
    isInitialized: Bool = false;

    init(collection: Address, index: Int, owner: Address, content: Cell) {
        self.collection = collection;
        self.index = index;
        self.owner = owner;
        self.content = content;
        self.isInitialized = true;
    }

    // Transfer NFT - op: 0x5fcc3d14
    receive(msg: Transfer) {
        let ctx: Context = context();
        
        // Only owner or collection can transfer
        require(
            ctx.sender == self.owner || ctx.sender == self.collection,
            "Unauthorized: Only owner or collection can transfer"
        );

        self.owner = msg.newOwner;

        // If there's a response destination, send notification
        if (msg.responseDestination != null) {
            send(SendParameters{
                to: msg.responseDestination!!,
                value: 0,
                mode: SendRemainingValue,
                body: beginCell()
                    .storeUint(0x05138d91, 32) // ownership_assigned
                    .storeUint(msg.queryId, 64)
                    .storeAddress(self.owner)
                    .storeRef(msg.forwardPayload.asCell())
                    .endCell()
            });
        }
    }

    // Standard getter for NFT data
    // Returns: (init, index, collection, owner, content)
    get fun get_nft_data(): GetNftData {
        return GetNftData{
            isInitialized: self.isInitialized,
            index: self.index,
            collectionAddress: self.collection,
            ownerAddress: self.owner,
            individualContent: self.content
        };
    }
}

// Standard NFT data structure
struct GetNftData {
    isInitialized: Bool;
    index: Int;
    collectionAddress: Address;
    ownerAddress: Address;
    individualContent: Cell;
}
