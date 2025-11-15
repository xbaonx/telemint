import "@stdlib/deploy";
import "@stdlib/ownable";
import "./NftItem";

// ============== GAS CONSTANTS (Adjustable) ==============
const GAS_BUFFER: Int = 50000000;        // 0.05 TON - Buffer for computation
const DEPLOY_ITEM_VALUE: Int = 300000000; // 0.3 TON - Gas for NFT Item deployment
const MIN_TON_RESERVE: Int = 10000000;   // 0.01 TON - Min balance to keep in collection

// ============== OPCODES ==============
const OP_MINT: Int = 0x01;               // Custom op for minting

// Mint message structure
message Mint {
    to: Address;          // Who receives the NFT
    content: Cell;        // Metadata content (IPFS URI)
}

contract NftCollection with Deployable, Ownable {
    owner: Address;
    nextIndex: Int as uint64 = 0;
    mintFee: Int as coins;
    itemCode: Cell;

    init(owner: Address, itemCode: Cell, initialFee: Int) {
        self.owner = owner;
        self.itemCode = itemCode;
        self.mintFee = initialFee;
        self.nextIndex = 0;
    }

    // ============== MINT FUNCTION ==============
    // Receives mint request with payment
    receive(msg: Mint) {
        let ctx: Context = context();
        
        // Validate payment: must cover mint fee + gas for deployment + buffer
        let requiredAmount: Int = self.mintFee + DEPLOY_ITEM_VALUE + GAS_BUFFER;
        require(
            ctx.value >= requiredAmount,
            "Insufficient payment: need at least mintFee + deployment gas"
        );

        // Build NFT Item state init
        let itemInit: StateInit = self.getNftItemInit(self.nextIndex);
        let itemAddress: Address = contractAddress(itemInit);

        // Deploy NFT Item with initialization message
        send(SendParameters{
            to: itemAddress,
            value: DEPLOY_ITEM_VALUE,
            mode: SendPayGasSeparately,
            bounce: false,
            code: itemInit.code,
            data: itemInit.data,
            body: beginCell()
                .storeAddress(myAddress())
                .storeUint(self.nextIndex, 64)
                .storeAddress(msg.to)
                .storeRef(msg.content)
                .endCell()
        });

        // Increment index for next NFT
        self.nextIndex = self.nextIndex + 1;

        // Keep remaining value as revenue (no refund)
        // This is the collection's earnings
    }

    // ============== ADMIN FUNCTIONS ==============
    
    // Set new mint fee (only owner)
    receive("set_fee") {
        self.requireOwner();
    }

    receive(msg: SetFee) {
        self.requireOwner();
        self.mintFee = msg.newFee;
    }

    // Withdraw collected fees (only owner)
    receive(msg: Withdraw) {
        self.requireOwner();
        
        require(msg.amount > 0, "Amount must be positive");
        
        // Keep minimum reserve for contract operations
        let balance: Int = myBalance();
        require(
            balance - msg.amount >= MIN_TON_RESERVE,
            "Cannot withdraw: must keep minimum reserve"
        );

        send(SendParameters{
            to: msg.to,
            value: msg.amount,
            mode: SendPayGasSeparately,
            bounce: false,
            body: beginCell()
                .storeUint(0, 32)
                .storeSlice("Withdrawal from NFT Collection".asSlice())
                .endCell()
        });
    }

    // ============== GETTERS ==============
    
    get fun get_collection_data(): CollectionData {
        return CollectionData{
            nextItemIndex: self.nextIndex,
            collectionContent: beginCell().endCell(), // Can add collection metadata here
            ownerAddress: self.owner
        };
    }

    get fun get_nft_address_by_index(index: Int): Address {
        let itemInit: StateInit = self.getNftItemInit(index);
        return contractAddress(itemInit);
    }

    get fun get_mint_fee(): Int {
        return self.mintFee;
    }

    get fun get_next_index(): Int {
        return self.nextIndex;
    }

    // ============== INTERNAL HELPERS ==============
    
    fun getNftItemInit(index: Int): StateInit {
        return initOf NftItem(
            myAddress(),
            index,
            self.owner, // Temporary, will be overridden on mint
            beginCell().endCell() // Temporary content
        );
    }
}

// ============== MESSAGE STRUCTURES ==============

message SetFee {
    newFee: Int as coins;
}

message Withdraw {
    to: Address;
    amount: Int as coins;
}

struct CollectionData {
    nextItemIndex: Int;
    collectionContent: Cell;
    ownerAddress: Address;
}
