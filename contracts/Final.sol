pragma solidity ^0.5.0;

import "./FinalLibrary.sol";

/** Main contract for ethereum store **/
contract Final {
  // State variables
  address owner;
  uint adminCount;
  string ownerText;
  uint sellerCount;
  uint blacklistCount;
  uint itemCount; // total number of items posted
  uint constant minGasCost = 20000; //
  uint constant MaxRating = 100;  //

  // Flag for circuit breaker pattern
  bool private stopped;

  /** Start contract by defining owner and making him an admin**/
  constructor() public {
    stopped = false;
    owner = msg.sender;
    ownerText = "";
    bytes32 ownerEmail = "ethbazaar@gmail.com";
    admins [owner] = 1;  adminCount = 1;
    itemCount = 0;
    addEmail(ownerEmail);
    addSeller(owner);
    blacklistCount = 0;
  }

  // Make reader-friendly enum for state of a sale
  enum State{ForSale, Sold, Shipped, Received}

  // Events emitted when the state of a sale changes
  event ForSale(uint itemNumber);
  event Sold (uint itemNumber);
  event Shipped(uint itemNumber);
  event Received (uint itemNumber);

  /** Only one item type
  * reused for both sales and auctions
  * to reduce complexity of code.
  * Simplicity is prioritized to minimize
  * possible security flaws
  **/

  struct Transaction{
    uint itemIndex; // can get seller from here
    address buyer; // March 31, 2019
    State txState;
    uint rating;
  }

  struct Item{
    uint itemNumber;
    string name;
    string category;
    string location;
    uint catIndex;
    uint locIndex;
    uint price;
    State state;
    address payable seller;
    uint itemQuantity;
    uint indexInSaleTracker;
    uint indexInUnsold;
    string ipfsHash;
  }

//------------------------------------------------------------------------
/** List all modifiers **/
  /** Circuit Breaker Modifiers **/
  modifier stopInEmergency { if (!stopped) _; }
  modifier onlyInEmergency { if (stopped) _; }

  /** Permission modifiers **/
  modifier isOwner{require(msg.sender == owner);_;}
  modifier isAdmin{require (admins[msg.sender]==1);_;}
  modifier isSeller{require (sellers[msg.sender][0]==1);  _;  } // March 31, 2019
  modifier isNotBlacklisted{require(blacklist[msg.sender] ==0); _;}

  /** Verify sales have correct inputs **/
  modifier verifyCaller (address _address) { require (msg.sender == _address); _;}
  modifier isEnoughMoney(uint _price){require(_price <= msg.value); _;}

  /** Verify correct item state **/
  modifier isForSale(State _state){require(_state == State.ForSale); _;}
  modifier isSold (Transaction memory TX) { require(TX.txState == State.Sold); _;}
  modifier isSoldOrShipped(Transaction memory TX) { require(TX.txState == State.Sold || TX.txState == State.Shipped); _;}
  modifier isShipped (Transaction memory TX) { require(TX.txState == State.Shipped); _;}
  modifier isReceived (Transaction memory TX) { require(TX.txState == State.Received); _;}
  modifier isNotRated (Transaction memory TX) {require (TX.rating == 0); _;}

//------------------------------------------------------------------------
  /** Circuit Breaker can be triggered by owner **/
  function toggleStop() isAdmin public {
      stopped = !stopped;
  }

  /** Total number of items that have ever been sold **/
  function getNumItems() public view returns (uint){
    return(itemCount);
  }

  /**Number of Active Items for sale  **/
  function getNumActiveItems() public view returns (uint){
    return(itemsForSale.length);
  }

  /** return requested index from itemsForSale **/
  function getSaleIndex(uint n) public view returns (uint){
    require (itemsForSale.length > n);
    return itemsForSale[n];
  }

  /**Number of Active Items in a category **/
  function getNumItemsInCat(string memory _cat) public view returns (uint){
    return(categoryIndex[_cat].length);
  }

  /**Number of Active Items in a location **/ // April 2020
  function getNumItemsInLoc(string memory _loc) public view returns (uint){
    return(locationIndex[_loc].length);
  }


  /** return the array categoryIndex[cat][a, ..., n] so app can reference
  *   items with getItemData(uint itemNumber)
  * Unfortunately, solidity cannot return a dynamic array, so need to do the loop
  * in javascript and call this view function to return values one iteration at a time
  **/
  function getCategoryIndex(string memory _cat, uint n) public view returns (uint){
    require (categoryIndex[_cat].length > n);
    return categoryIndex[_cat][n];
  }

  /* similar to getCategoryIndex - returns item from locIndex array */
  function getLocationIndex(string memory _loc, uint n) public view returns (uint){
    require (locationIndex[_loc].length > n);
    return locationIndex[_loc][n];
  }

  /** Next several functions check and set permissions **/
  /** verify whether address is an admin */
  function checkAdmin (address addr) public view returns (uint){
    return(admins[addr]);
  }

  /** verify whether an address is a seller*/
  function checkSeller(address addr) public view returns (uint){
    if (sellers[addr].length == 0){return 0;}
    return(sellers[addr][0]);
  }

  /** verifies whether an address is blacklisted*/
  function checkBlacklist(address addr) public view returns (uint){
    return(blacklist[addr]);
  }

  /** add or remove an admin */
  function addAdmin (address newAdmin) public payable isAdmin{
    require(admins[newAdmin] ==0 && blacklist[newAdmin] ==0);
    admins[newAdmin] = 1; adminCount++;
  }
  function removeAdmin (address newAdmin) public isAdmin{
    require(admins[newAdmin] == 1 && adminCount > 0);
    admins [newAdmin] = 0;adminCount--;
  }

  /** Add or remove a seller*/
  function addSeller (address newSeller) public payable { // June 1 2019 - removed isAdmin qualifier
    require(email[newSeller].length > 0); //11
    require(sellers[newSeller].length == 0 && blacklist[newSeller] ==0);
    sellers[newSeller].push(1);
    sellerCount++;
    Lib.setJoinDate(sellerProfiles, now, newSeller);
  }
  function removeSeller (address newSeller) public isAdmin{
    require(sellers[newSeller][0] == 1 && sellerCount > 0);
    sellers [newSeller][1] != 1; sellerCount--;
  }

  /** Add or remove someone from the blacklist*/
  function addBlacklist (address newBlacklist) public isAdmin{
    require(blacklist[newBlacklist] ==0);
    blacklist[newBlacklist] = 1; blacklistCount++;
  }
  function removeBlacklist (address newBlacklist) public isAdmin{
    require(blacklist[newBlacklist] ==1);
    blacklist[newBlacklist] = 0; blacklistCount--;
  }

  function addEmail (bytes32 _email) public {
    require(_email.length > 0 && _email.length < 100);
    email[msg.sender] = _email;
  }

  function getEmail (address _user) public view returns (bytes32){
    return email[_user];
  }


  /** mappings*/
  mapping (address => bytes32) email; //11
  mapping (address=>uint) admins; // 1 or 0 to keep track of admins // TODO change from uint to bool
  mapping (address=>uint[]) sellers; // change from uint to uint[] --> element 0 is seller or not, remaining elements point to transactions index
  mapping (address=>uint[]) buyers; // indices of transactions
  Lib.SellerList sellerProfiles;
  mapping (address=>uint) blacklist; // TODO change from uint to bool
  mapping (uint=>Item) items; // Map might not be most efficient structure. Linked List better.
  uint[] itemsForSale; // March 31 2019 - list of active items for sale
  // each category name points to an array of items in the category
  mapping (string => uint[]) categoryIndex; // need to remove item from array when sold out
  mapping (string => uint[]) locationIndex; // need to remove item from array when sold out
  Transaction[] purchase;
  mapping (address=>uint) pendingReturns;
  mapping (address=>uint[]) unsoldItems; // March2020 track each user's unsold items

  //------------------------------------------------------------------------


  //------------------------------------------------------------------------

  /**  addItem puts an item up for either sale or auction
  * Ony seller can add items
  * Can be either auction or straight up sale
  * Auctions start immediately with no minimum bid
  */
  function addItem(string memory _name, uint _price, /*State _state, uint _auctionLengthTime,*/ string memory _ipfsHash, uint _quantity, string memory _category, string memory _location) // quantity added March 31 2019
  isSeller isNotBlacklisted stopInEmergency public returns(bool){
    require (_quantity > 0 && _price > 0);
    items[itemCount] = Item({
      name: _name,
      itemNumber: itemCount,
      category: _category, // store in Item as well for cross referencing
      location: _location,
      catIndex: categoryIndex[_category].length,
      locIndex: locationIndex[_location].length,
      price: _price,
      state: State.ForSale,
      seller: msg.sender,
      ipfsHash: _ipfsHash,
      itemQuantity: _quantity,
      indexInSaleTracker: itemsForSale.length,
      indexInUnsold: unsoldItems[msg.sender].length
    });

    categoryIndex[_category].push(itemCount);
    locationIndex[_location].push(itemCount);
    unsoldItems[msg.sender].push(itemCount);

    itemsForSale.push(itemCount);
    itemCount++;
    return true;
  }


  function makeItemUnavailable (uint itemNumber) internal{  // added March 31, 2019
  // 1. Delete in general itemsForSale list
    uint index = items[itemNumber].indexInSaleTracker;
    require(index < itemsForSale.length);
    itemsForSale[index] = itemsForSale[itemsForSale.length-1];
    delete itemsForSale[itemsForSale.length-1];
    itemsForSale.length--;
  // 2a. remove from categoryIndex so it does not appear in Search
    index = items[itemNumber].catIndex;
    string memory cat = items[itemNumber].category;
    require(index < categoryIndex[cat].length);
    categoryIndex[cat][index] = categoryIndex[cat][categoryIndex[cat].length - 1];
    delete categoryIndex[cat][categoryIndex[cat].length - 1];
    categoryIndex[cat].length--;
  // 2b. remove from unsoldindex so it does not appear in search
     index = items[itemNumber].indexInUnsold;
     address itemSender = items[itemNumber].seller;
     require(index < unsoldItems[itemSender].length);
     unsoldItems[itemSender][index] = unsoldItems[itemSender][unsoldItems[itemSender].length - 1];
     delete unsoldItems[itemSender][unsoldItems[itemSender].length - 1];
     unsoldItems[itemSender].length--;
  // 2c. remove from getLocationIndex
    index = items[itemNumber].locIndex;
    string memory loc = items[itemNumber].location;
    require(index < locationIndex[loc].length);
    locationIndex[loc][index] = locationIndex[loc][locationIndex[loc].length - 1];
    delete locationIndex[loc][locationIndex[loc].length - 1];
    locationIndex[loc].length--;
  // 3. set state to Sold
    items[itemNumber].state = State.Sold;
  }

  /**
  *  withdraw
  * If you did not win the auction, you can withdraw
  * your losing bid
  */
  function withdraw() public payable {
      uint amount = pendingReturns[msg.sender];
      if (amount > 0) {
        pendingReturns[msg.sender] = 0;
        msg.sender.transfer(amount);
      }
  }

  /**
  *  buyItem
  * purchase for a fixeed Price
  * Money goes directly to seller
  */
  function buyItem(uint itemNumber) public payable //Can be public because of isForSale modiier
  isNotBlacklisted
  isForSale(items[itemNumber].state)
  isEnoughMoney(items[itemNumber].price)
  stopInEmergency
  {
    // change this to use withdrawal pattern
    items[itemNumber].seller.transfer(items[itemNumber].price); // transfer money from buyer to seller first
    items[itemNumber].itemQuantity--; // reduce quantity by 1
    if (items[itemNumber].itemQuantity < 1) makeItemUnavailable(itemNumber); // If out of stock, make unavailable

    /*
    * sellers(address->uint[])
    * sellers(myAddress) is mapped to array. First index (0) = 1 if i am a seller
    * Next indices (2)...(n) are references to transactions in which i am seller - current transaction is at purchase._length
    *
    * buyers (address->uint[])
    * buyers(myaddress) is mapped to array.
    * Each index is reference to tx where i am a buyer
    */
    sellers[items[itemNumber].seller].push(purchase.length);
    buyers[msg.sender].push(purchase.length);


    purchase.push(Transaction({
      itemIndex:itemNumber,
      rating: 0,
      buyer:msg.sender,
      txState: State.Sold
      }));

    emit Sold(itemNumber);
    Lib.addSale(sellerProfiles, items[itemNumber].seller);

    uint _price = items[itemNumber].price;
    uint amountToRefund = msg.value - _price;
    msg.sender.transfer(amountToRefund);

  }

  function sellerInfo(address a) public view returns (uint, uint, uint, uint){
     return Lib.getSellerInfo(sellerProfiles, a);
  }

  function shipItem(uint transactionNumber) public
  isSold (purchase[transactionNumber]) verifyCaller(items[purchase[transactionNumber].itemIndex].seller){
    purchase[transactionNumber].txState = State.Shipped;
    emit Shipped(transactionNumber);
  }

  /**
  *  receiveItem
  * Update supply chain information
  * Allow the buyer to rate the seller once item is received
  * Maybe change this - rate any time - item may never get sent / received
  */
  function receiveItem(uint transactionNumber, bool rateSeller, uint _sellerRating)
  public isSoldOrShipped (purchase[transactionNumber]) verifyCaller(purchase[transactionNumber].buyer) {
    purchase[transactionNumber].txState = State.Received;
    emit Received(transactionNumber);
    // TODO get rid of the following
    if (rateSeller == true && purchase[transactionNumber].rating == 0){
      require (_sellerRating >= 1 && _sellerRating <= MaxRating);
      purchase[transactionNumber].rating = _sellerRating;
      Lib.addRating(sellerProfiles, items[purchase[transactionNumber].itemIndex].seller, _sellerRating);
    }
    // reset variables to 0 to free up memory and get back Eth
  }

  function rateSeller(uint transactionNumber, uint _sellerRating)
  public verifyCaller (purchase[transactionNumber].buyer)
  isNotRated (purchase[transactionNumber]){
    require (_sellerRating >= 1 && _sellerRating <= MaxRating);
    purchase[transactionNumber].rating = _sellerRating;
    Lib.addRating(sellerProfiles, items[purchase[transactionNumber].itemIndex].seller, _sellerRating);
  }

  // get rid of this function - covered in getTxInfo
  function isRated (uint transactionNumber) public view returns (bool){
    if (purchase[transactionNumber].rating == 0){
      return true;
    }
    return false;
  }

  /**
  *  getIpfsHash
  * Return the ipfs hash of the image of the product for sale
  */
  function getIpfsHash(uint itemNumber) public view returns(string memory){
    require(itemNumber <= itemCount);
    return items[itemNumber].ipfsHash;
  }

  function getQuantity(uint itemNumber) public view returns(uint){
    require(itemNumber <= itemCount);
    return items[itemNumber].itemQuantity;
  }

  function getCategory(uint itemNumber) public view returns(string memory){
    require(itemNumber <= itemCount);
    return items[itemNumber].category;
  }

  function getLocation(uint itemNumber) public view returns(string memory){
    require(itemNumber <= itemCount);
    return items[itemNumber].location;
  }

  /**
  *  getItemData
  * Return as much of the item data as Solidity's stack can hold
  * Have to return highest bidder and ipfsHash separately
  */
  function getItemData(uint itemNumber) public view
    returns (string memory _name, uint _price, State _state, address _seller){
    require(itemNumber <= itemCount);
    return(items[itemNumber].name,
      items[itemNumber].price,
      items[itemNumber].state,
      items[itemNumber].seller);
  }


  function getNumPurchases(address addr) public view returns (uint){
    return buyers[addr].length;
  }

  function getNumUnsold (address addr) public view returns (uint){
    return (unsoldItems[addr].length);
  }

  function getUnsold (address addr, uint i) public view returns (uint){
    require (i < unsoldItems[addr].length);
    return unsoldItems[addr][i];
  }

  function getNumSales(address addr) public view returns (uint){
    if (sellers[addr].length == 0) return 0;
    return sellers[addr].length - 1;
  }

  /** Get index of transaction from buyers array */
  function getBuy (address addr, uint i) public view returns (uint){
    require(i < buyers[addr].length);
    return buyers[addr][i];
  }

  /** Get index of transaction from sellers array */
  function getSell (address addr, uint i) public view returns (uint){
    require(i < sellers[addr].length);
    return sellers[addr][i];
  }

  function getTxInfo(uint n) public view returns (address _buyer, State _txState, uint _itemIndex, uint _rating){
    require(purchase.length > n);
    return (purchase[n].buyer,
      purchase[n].txState,
      purchase[n].itemIndex,
      purchase[n].rating);
  }

  function postText(string memory _ownerText) public isOwner{
    ownerText = _ownerText;
  }

  function getText() public view returns (string memory) {
    return ownerText;
  }

  function deleteItem (uint itemNumber) isForSale(items[itemNumber].state) public  {
    require(msg.sender == items[itemNumber].seller);
    items[itemNumber].itemQuantity = 0;
    makeItemUnavailable(itemNumber);
  }

  function editItem(string memory _name, uint _price, string memory _ipfsHash, uint _quantity, string memory _category, uint itemNumber, string memory _location)
  isSeller isNotBlacklisted stopInEmergency public returns(bool){
    require (
      _quantity > 0 && _price > 0);
    require (msg.sender == items[itemNumber].seller);

    items[itemNumber] = Item({
      name: _name,
      itemNumber: itemCount,
      category:_category, // store in Item as well for cross referencing
      location: _location,
      catIndex: categoryIndex[_category].length,
      locIndex: locationIndex[_location].length,
      price: _price,
      state: State.ForSale,
      seller: msg.sender,
      ipfsHash: _ipfsHash,
      itemQuantity: _quantity,
      indexInSaleTracker: items[itemNumber].indexInSaleTracker, 
      indexInUnsold: items[itemNumber].indexInUnsold
    });

    return true;
  }

}
