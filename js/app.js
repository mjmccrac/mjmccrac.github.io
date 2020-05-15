var currentItem = 0; // item selected for viewing
var itemCount = 0; // number of items in search
const states = ["For Sale", /*"For Auction",*/ "Sold", "Shipped", "Received"];
const IpfsNode = new window.IpfsApi({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https'
});
const itemsPerBatch = 4; // num items shown on screen at a time  - default should be 8
var displayStartIndex = 0;

// Variables for displayed items on this screen
var displayName = [];
var dname = "test";
var displayPrice = [];
var displaySeller = [];
var displayIpfsHash = [];
var displayStatus = [];
var numItemsCurrentlyDisplayed;
var itemNum = [];
var imageArray = [];

// Variables for filtering for location, category, and address
var addFilter = [];
var locFilter = [];
var catFilter = [];
var filteredList = [];
// keep track of previous filter values to avoid calculating new arrays if not needed
var lastAddVal = "";
var lastSearchVal = "";
var lastLocVal = "";

//SEQUENCE
//(App.init) -> (initWeb3) -> (initContract) -> (updateInterface then bindEvents then listBatchOfItems(0))
// (updateInterface) -> (checkSeller, checkAdmin)
// (bindEvents) -> (connect functions to buttons)
// (listBatchOfItems(0)) -> (queryAllCategories(0)) -> (Solidity: getNumActiveItems then getSaleIndex then getItemData then getIpfsHash)

App = {


  web3Provider: null,
  userAddress: null,
  userBalance: 0,
  adminPriv: false,
  sellerPriv: false,
  buffer: '',
  img: [],
  contracts: {},
  ipfsHash: "",
  ownerTextFlag: 0,

  item_name: null,
  item_price: 0,

  item_state: 0,
  item_seller: null,
  item_ipfsHash: "",



  quickTest: function() {
    var element = document.getElementById("test2");
    element.innerHTML = "QuickTest Works";
  },


  /* updateSearchArray is needed when we are using multiple search Fields */
  updateSearchArray: async function(_cat, _loc, _add, _catUsed, _locUsed, _addUsed, n) {
    if (lastLocVal != _loc || lastAddVal != _add || lastSearchVal != _cat) { // only update if filters changed.
      lastLocVal = _loc;
      lastAddVal = _add;
      lastSearchVal = _cat;

      // Verify that "address" is valid eth address
      const addressRegExp1 = /^(0x[a-z A-z 0-9]{40})$/;
      const addressRegExp2 = /^(0X[a-z A-z 0-9]{40})$/;
      var zeros = "0x0000000000000000000000000000000000000000";
      var validAddress = addressRegExp1.test(_add);
      if (!validAddress) {
        validAddress = addressRegExp2.test(_add);
      }
      if (!validAddress) {
        if (_addUsed) {
          alert("invalid Eth address"); // invalid address used
          return 0;
        } else {
          _add = zeros; // not used. give it a value so no error
        }
      }

      // Assume already checked that filters have changed so new array needed
      // Assume that all 3 filters are used. If not, need to modify for 2 filters
      addFilter.length = 0;
      addFilter = [];
      locFilter.length = 0;
      locFilter = [];
      catFilter.length = 0;
      catFilter = [];
      filteredList.length = 0;
      filteredList = [];

      // Global vars for this function
      var all = []; // all Promises
      var addCount = 0;
      var locCount = 0;
      var catCount = 0;

      // connect to Eth
      App.contracts.Final.deployed().then(function(instance) {
        FinalInstance = instance;

        // First get category array (catFilter)
        return FinalInstance.getNumItemsInCat(_cat);
      }).then(function(Result) {
        catCount = parseInt(Result);
        return FinalInstance.getNumItemsInLoc(_loc);
      }).then(function(Result) {
        locCount = parseInt(Result);
        return FinalInstance.getNumUnsold(_add);
      }).then(function(Result) {
        addCount = parseInt(Result);
      }).then(function() {

        // Make sure that we will get at least 1 result before wasting time with making arrays
        if ((addCount > 0 || !_addUsed) &&
          (locCount > 0 || !_locUsed) &&
          (catCount > 0 || !_catUsed) &&
          (_addUsed || _locUsed || _catUsed)) {

          var i;
          if (_catUsed) {
            for (i = 0; i < catCount; i++) {
              var p = FinalInstance.getCategoryIndex(_cat, i).then((Result) => {
                catFilter.push(parseInt(Result));
              }).then(function() {

              });
              all.push(p);
            } // end for
          }

          if (_locUsed) {
            for (i = 0; i < locCount; i++) {
              var p = FinalInstance.getLocationIndex(_loc, i).then((Result) => {
                locFilter.push(parseInt(Result));
              }).then(function() {

              });
              all.push(p);
            } // end for

          }

          if (_addUsed) {
            for (i = 0; i < addCount; i++) {
              var p = FinalInstance.getUnsold(_add, i).then((Result) => {
                addFilter.push(parseInt(Result));
              }).then(function() {

              });
              all.push(p);
            } // end for
          }


          Promise.all(all).then(function(res) {}).then(function() {
            App.makeFinalArray(_addUsed, _locUsed, _catUsed);
            // Create Final Array "filteredList"
          }).then(function() {
            App.queryCategory(_cat, n);
            return 0;
          });


        } else {
          alert("No matches to search criteria.");
          return 0;
        }
      }); // end deployed
    } else {
      //alert("no value change");
      return 0;
    }

  },

  makeFinalArray: function(_addUsed, _locUsed, _catUsed) {
    // Create Final Array "filteredList"
    addCount = addFilter.length;
    catCount = catFilter.length;
    locCount = locFilter.length;

    if (!_addUsed) {
      addCount = 1
    }
    if (!_locUsed) {
      locCount = 1
    }
    if (!_catUsed) {
      catCount = 1
    }

    for (i = 0; i < addCount; i++) {
      for (j = 0; j < locCount; j++) {
        for (k = 0; k < catCount; k++) {
          if ((catFilter[k] == locFilter[j] == addFilter[i]) &&
            (_addUsed && _locUsed && _catUsed)) {
            filteredList.push(addFilter[i]);
          } else if ((catFilter[k] == locFilter[j]) &&
            (_locUsed && _catUsed)) {
            filteredList.push(locFilter[i]);
          } else if ((locFilter[j] == addFilter[i]) &&
            (_addUsed && _locUsed)) {
            filteredList.push(addFilter[i]);
          } else if ((catFilter[k] == addFilter[i]) &&
            (_addUsed && _catUsed)) {
            filteredList.push(addFilter[i]);
          } else if (_addUsed) { // Only one filter is used, so use everything
            filteredList.push(addFilter[i]);
          } else if (_locUsed) {
            filteredList.push(locFilter[i]);
          } else if (_catUsed) {
            filteredList.push(catFilter[i]);

          }
        }
      }
    }

    //return 0;

  },

  withdraw: function() {
    App.updateAccount();
    App.contracts.Final.deployed().then(function(instance) {
      FinalInstance = instance;
      FinalInstance.withdraw();
    });
  },

  gotoSell: function() {
    if (sellerPriv) {
      var w = window.open("sell.html", "_top");
    } else {
      alert("You do not have seller privileges. Request seller privileges before attempting to post item for sale.");
    }
  },

  updateAccount: function() {
    var addressElement = document.getElementById("userAddress");
    userAddress = web3.eth.accounts[0];
    addressElement.innerHTML = userAddress;

    var balanceElement = document.getElementById("userBalance");
    web3.eth.getBalance(userAddress, (err, wei) => {
      userBalance = web3.fromWei(wei, 'ether');
      balanceElement.innerHTML = userBalance;
    });
  },



  editEmail: function() {

    var existingEmail;
    var newEmail;
    var zeros = "0x0000000000000000000000000000000000000000000000000000000000000000";
    var message = "";
    App.contracts.Final.deployed().then(function(instance) {
      FinalInstance = instance;
      // get current email
      // msgbox saying "this is current email, click ok to change"
      // If yes, input new email --> send to contract
      return FinalInstance.getEmail(userAddress);
    }).then(function(res) {
      existingEmail = web3.toAscii(res);
      if (res == zeros) {
        message = "No email";
      } else {
        message = "Your existing contact info (email or mailing address) is: " + existingEmail;
      }
      message = message + ". Click OK to change this info";
      if (confirm(message)) {
        newEmail = prompt("Please enter your email address", "");
        FinalInstance.addEmail(newEmail);
      }


    });
  },

  buyItem: function() {
    App.updateAccount();
    if ((userBalance > item_price) &&
      (item_state == 0) &&
      (userAddress != item_seller)) {
      App.contracts.Final.deployed().then(function(instance) {
        FinalInstance = instance;
        FinalInstance.buyItem(currentItem, {
          from: web3.eth.accounts[0],
          value: web3.toWei(item_price, 'ether'),
          gas: 4000000
        });
      });
      //    App.listItems();
    } else {
      alert("Error: Can't buy");
    }
  },


  /**
   * listBatchOfItems:
   * A full batch is the maximum number of items I can display on a page at once.
   * For each item get and display name, price (or maxBid), state (sale or auction), seller, and picture (from ipfs hash)
   * Based off of listItems - to be deprecated in this file but used in screen to view 1 item in detail
   * - For auctions, double check that time has not expired before posting. skip if expired
   * - Need to query items one at a time from restricted search field
   *   - query categoryIndex[cat]
   *     - function to get length of categoryIndex[cat]; if length = 0, display error msg. dont update
   *       - getNumItemsInCat(string _cat)
   *     - function to return item pointed to by categoryIndex[cat][n]
   *       - return item numbers, so we can query using getItemData(uint itemNumber). cannot do dynamic Array
   *       - categoryIndex(string _cat, uint n)
   *   - If category = "all" then query all items
   *       - getNumActiveItems()
   *       - getSaleIndex(uint n)
   */
  listBatchOfItems: async function(n) {
    //alert("listing");
    //alert("in listbatchOfItems");
    var numInCat = 0;
    // 1. Get search input from searchInput
    var searchVal = document.getElementById("searchInput").value;
    var locVal = document.getElementById("locInput").value.toUpperCase();
    var addVal = document.getElementById("addInput").value;

    var searchBox = document.getElementById("catBox").checked;
    var locBox = document.getElementById("locBox").checked;
    var addBox = document.getElementById("addBox").checked;

    searchVal = searchVal.toUpperCase();
    if (searchVal == "" || searchVal == "all" || searchVal == "All" || searchVal == "CATEGORY" || !searchBox) {
      searchVal = "all";
    }
    if (locVal == "" || locVal == "all" || locVal == "All" || locVal == "LOCATION" || !locBox) {
      locVal = "all";
    }
    if (addVal == "" || addVal == "all" || addVal == "All" || addVal == "SELLER ADDRESS" || !addBox) {
      addVal = "all";
    }

    ownerTextFlag = 0;
    if (searchVal == "OWNERTEXT") {
      ownerTextFlag = 1; //prompt("enter text here", "");
    }

    App.resetArrays(); // reset arrays for item display

    // 2. How many items in category?
    if (searchVal == "all" && locVal == "all" && addVal == "all") {
      //  alert("Searching in all, start searching at index = " + n);
      App.queryAllCategories(n);
    } else {
      App.updateSearchArray(searchVal, locVal, addVal, searchBox, locBox, addBox, n).then(function() {
        //App.queryCategory(searchVal, n);
      });
    }

  },

  resetArrays: function() {
    itemNum.length = 0;
    displayPrice.length = 0;
    displayName.length = 0;
    displayStatus.length = 0;
    displaySeller.length = 0;
    displayIpfsHash.length = 0;
    imageArray.length = 0;
    displayName = [];
    displayPrice = [];
    displaySeller = [];
    displayIpfsHash = [];
    displayStatus = [];
    itemNum = [];
    imageArray = [];
    numItemsCurrentlyDisplayed = -1; // So it gives error if not set
  },

  testAlert: function() {
    alert("test");
  },

  queryAllCategories: async function(startIndex) {

    var FinalInstance;
    var endIndex;
    var count;
    var flag = 0;
    //alert ("query");

    App.contracts.Final.deployed().then(function(instance) {
      FinalInstance = instance;

      return FinalInstance.getNumActiveItems.call();
      //return FinalInstance.getNumItemsInCat(_cat);

    }).then(function(Result) { // count = number of items for sale
      count = parseInt(Result);


      //alert("count = " + count);
      if (count == 0) { // if empty, nothing for sale
        alert("No items for sale");
        document.getElementById("_DisplayCount").innerHTML = "No items to display";
        numItemsCurrentlyDisplayed = 0;
        flag = 1;
        return;
        //  break;
      }
      if (count < startIndex + 1) { // searching outside of range.
        alert("No more items to display");
        document.getElementById("_DisplayCount").innerHTML = "ERROR. Attempting to display outside of range";
        numItemsCurrentlyDisplayed = 0;
        flag = 1;
        return;
        //    break;
      }

      // Limit endIndex so that max n = itemsPerBatch items are displayed
      if (itemsPerBatch > (count - startIndex)) {
        endIndex = count;
        numItemsCurrentlyDisplayed = count - startIndex;
      } else {
        endIndex = startIndex + itemsPerBatch;
        numItemsCurrentlyDisplayed = itemsPerBatch;
      }
      document.getElementById("_DisplayCount").innerHTML = "Displaying Items " + (startIndex + 1) + " to " + (startIndex + numItemsCurrentlyDisplayed) + " of " + count;
      itemCount = count;

      // now loop for "numItemsCurrentlyDisplayed" iterations
      // Each iteration call getSaleIndex(uint n), where n = startIndex + i
      // Then call listItems for n
      //https://stackoverflow.com/questions/51284085/promise-in-for-loop-in-promise-chain
      var i;
      var j = -1;
      var all = [];
      // Between 1 and itemsPerBatch (currently 8) displayed results
      // Make a promise for each item. Promise calls getSalesIndex to find place in overall Array
      // Next, call getItemData to get name, price, high_bid, and seller
      // Next, call getIpfsHash
      for (i = 0; i < numItemsCurrentlyDisplayed; i++) {
        //  alert ("i = " + i);
        var p = FinalInstance.getSaleIndex(startIndex + i).then((Result) => {
          itemNum.push(parseInt(Result));
          return FinalInstance.getItemData(parseInt(Result));
        }).then(function(res) {
          displayName.push(res[0]);
          var price = parseFloat(web3.fromWei(parseInt(res[1]), 'ether'));
          displayStatus.push(parseInt(res[2]));
          displayPrice.push(price);
          displaySeller.push(res[3].substring(0, 20) + "...");
        }).then(function() {
          j++;
          return FinalInstance.getIpfsHash(itemNum[j]);
        }).then(function(getHash) {
          displayIpfsHash.push(getHash);
        });

        all.push(p);
      }

      Promise.all(all).then(function() {
        //alert ("Display all now");
        App.displayBatchOfItems();
      });

    });
    return;

  },

  displayBatchOfItems: async function() {
    document.getElementById("saleItems").innerHTML = "";
    var saleItems = $('#saleItems');
    var itemTemplate = $('#itemTemplate');
    //alert("displayBathchOfItems");

    for (var i = 0; i < numItemsCurrentlyDisplayed; i++) {

      if (displayIpfsHash[i] != "") {
        App.getPicture(displayIpfsHash[i], i);
      }
      //alert (displayIpfsHash[i] + " - " + displayName[i]);
      //itemTemplate.find('img').attr('src', imageArray[i]);
      itemTemplate.find('.item-name').text(displayName[i]);
      itemTemplate.find('.panel-heading').text(displayName[i]);
      itemTemplate.find('.item-price').text(displayPrice[i]);
      itemTemplate.find('.item-status').text("For Sale");
      itemTemplate.find('.item-seller').text(displaySeller[i]);
      itemTemplate.find('.btn-view').attr('data-id', i);
      //alert("template checkpoint 2");
      saleItems.append(itemTemplate.html());

      //  alert("template checkpoint 3");
    }
  },

  queryCategory: async function(_cat, startIndex) {

    var FinalInstance;
    var endIndex;
    var count;
    var flag = 0;
    App.contracts.Final.deployed().then(function(instance) {
      FinalInstance = instance;
      //getNumItemsInCat(string memory _cat)



      // April 2020 EDITS
      /*
                    return FinalInstance.getNumItemsInCat(_cat);
                  }).then(function(Result) { // count = number of items for sale
                    count = parseInt(Result);
                    */
      count = filteredList.length;



      //  alert("count = " + count);
      if (count == 0) { // if empty, nothing for sale
        alert("No items for sale");
        document.getElementById("_DisplayCount").innerHTML = "No items to display";
        numItemsCurrentlyDisplayed = 0;
        flag = 1;
        App.displayBatchOfItems();
        return;
      }
      if (count < startIndex + 1) { // searching outside of range.
        alert("No more items to display");
        document.getElementById("_DisplayCount").innerHTML = "ERROR. Outside of range. No items to display";
        numItemsCurrentlyDisplayed = 0;
        flag = 1;
        return;
      }

      if (itemsPerBatch > (count - startIndex)) {
        endIndex = count;
        numItemsCurrentlyDisplayed = count - startIndex;
      } else {
        endIndex = startIndex + itemsPerBatch;
        numItemsCurrentlyDisplayed = itemsPerBatch;
      }
      document.getElementById("_DisplayCount").innerHTML = "Displaying Items " + (startIndex + 1) + " to " + (startIndex + numItemsCurrentlyDisplayed) + " of " + count;
      itemCount = count;

      // Need to reset itemNum




      var i;
      var j = -1;
      var all = [];
      for (i = 0; i < numItemsCurrentlyDisplayed; i++) {


        itemNum.push(filteredList[startIndex + i]);
        var p = FinalInstance.getItemData(filteredList[i]).then(function(res) {

          displayName.push(res[0]);
          displayStatus.push(parseInt(res[2]));
          displayPrice.push(parseFloat(web3.fromWei(parseInt(res[1]), 'ether')));
          displaySeller.push(res[3].substring(0, 20) + "...");
        }).then(function() {
          j++;
          return FinalInstance.getIpfsHash(itemNum[j]);

        }).then(function(getHash) {
          displayIpfsHash.push(getHash);

        });

        all.push(p);
      }

      Promise.all(all).then(function() {
        App.displayBatchOfItems();
      });
    }).then(function() {
      if (ownerTextFlag == 1) {
        var ownerString = prompt("Enter Text", "");
        FinalInstance.postText(ownerString);
      }
    }).then(function() {});
    return;

  },

  addSeller: function(isSeller) {

    var emailAddress = prompt("Enter your email address ...", ''); // first check whether we have an address
    var affectedAdd = userAddress;
    var element = document.getElementById("test2");
    if ((affectedAdd.length == 42) && (affectedAdd.startsWith("0x"))) { //11
      var FinalInstance;
      App.contracts.Final.deployed().then(function(instance) {
        FinalInstance = instance;
        alert("adding email");
        FinalInstance.addEmail(emailAddress);
      }).then(function() {
        alert("adding seller");
        FinalInstance.addSeller(affectedAdd);
        element.innerHTML = "about to call";
      }).then(function() {
        return FinalInstance.checkSeller(userAddress);
      }).then(function(isSeller) {
        element.innerHTML = "isSeller";
      }).catch(function(err) {
        element.innerHTML = err.message;
      });
    } else {

      element.innerHTML = "Not a valid Eth address";
    }
  },

  addAdmin: function(isAdmin) {

    var affectedAdd = document.getElementById("affectedAddress").value;
    if ((affectedAdd.length == 42) && (affectedAdd.startsWith("0x"))) {
      var FinalInstance;
      App.contracts.Final.deployed().then(function(instance) {
        FinalInstance = instance;
        FinalInstance.addAdmin(affectedAdd);
      }).catch(function(err) {
        element.innerHTML = err.message;
      });
    } else {
      var element = document.getElementById("test2");
      alert("not a valid ethereum address");
    }
  },

  sellItem: function(isAdmin) {

    var element = document.getElementById("test2");

    var itemName = document.getElementById("itemName").value;
    var itemPrice = document.getElementById("itemPrice").value;
    var picturePath = document.getElementById("itemPhoto").value;

    var weiPrice = web3.toWei(itemPrice, 'ether');
    var display = document.getElementById("design_display");

    if (weiPrice > 0 && itemPrice < 1000) {
      if (itemName.length > 0) {
        element.innerHTML = "Sell OK";
        var FinalInstance;

        App.contracts.Final.deployed().then(function(instance) {
          FinalInstance = instance;
          FinalInstance.addItem(itemName, weiPrice, ipfsHash);
        }).catch(function(err) {
          element.innerHTML = err.message;
        });
      } else {
        alert("Needs a name");
      }
    } else {
      alert("Invalid Price");
    }



  },

  init: async function() {
    return await App.initWeb3();
  },

  initWeb3: async function() {

    if (window.ethereum) {
      App.web3Provider = window.ethereum; // THIS IS OUR TEST CASE WITH METAMASK
      try {
        await window.ethereum.enable();
      } catch (error) {
        console.error("User denied account access");
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      alert("web3 not detected. Install metamask and login with eth account. <see https://metamask.io/>");
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
    }
    web3 = new Web3(App.web3Provider);
    return App.initContract();
  },

  initContract: function() {
    $.getJSON('Final.json', function(data) {
      var element = document.getElementById("test2");
      //element.innerHTML = "initContract";
      var FinalArtifact = data;
      App.contracts.Final = TruffleContract(FinalArtifact);
      App.contracts.Final.setProvider(App.web3Provider);
      return App.updateInterface();
    });

    return App.bindEvents();
  },

  viewItemToBuy: function() {
    event.preventDefault();
    var itemId = parseInt($(event.target).data('id'));;
    currentItem = itemNum[itemId];
    dname = displayName[currentItem];
    sessionStorage.setItem("currentItem", currentItem);
    var w = window.open("buy.html", "_top");

  },

  bindEvents: function() {

    var sellButton = document.getElementById("btn-sell");
    sellButton.addEventListener('click', function() {
      App.gotoSell();
    });

    var emailButton = document.getElementById("email_button");
    emailButton.addEventListener('click', function() {
      App.editEmail();
    });

    var helpButton = document.getElementById("help_button");
    helpButton.addEventListener('click', function() {
      //App.listItems();
      var w = window.open("help.html", "_top");
    });

    var sellerButton = document.getElementById("seller_button");
    sellerButton.addEventListener('click', function() {
      App.addSeller();
    });

    var listButton = document.getElementById("btn-List");
    listButton.addEventListener('click', function() {
      //App.listItems();
      var w = window.open("list.html", "_top");
    });

    var searchButton = document.getElementById("searchBtn");
    searchButton.addEventListener('click', function() {
      displayStartIndex = 0;
      App.listBatchOfItems(displayStartIndex); // TODO - replace 0 with an index (page of results)
    });

    var prevButton = document.getElementById("prev_button");
    prevButton.addEventListener('click', function() {
      displayStartIndex -= itemsPerBatch;
      if (displayStartIndex < 0) {
        displayStartIndex = 0;
      }
      //App.listItems();
      App.listBatchOfItems(displayStartIndex);
    });

    $(document).on('click', '.btn-view', App.viewItemToBuy);



    var nextButton = document.getElementById("next_button"); // previously search would loop around
    nextButton.addEventListener('click', function() {
      displayStartIndex += itemsPerBatch;
      if ((displayStartIndex + itemsPerBatch) >= itemCount) {
        displayStartIndex = itemCount - itemsPerBatch;
      }
      if (displayStartIndex < 0) {
        displayStartIndex = 0;
      }
      //App.listItems();
      App.listBatchOfItems(displayStartIndex);
    });


    var element = document.getElementById("permissions");
  },


  updateInterface: function(isSeller, isAdmin) {
    //var itemCount = 0;
    App.updateAccount();

    var element = document.getElementById("permissions");
    var ownerText = document.getElementById("test2");

    var FinalInstance;

    App.contracts.Final.deployed().then(function(instance) {
      //var currentAccount = web3.eth.accounts[0];
      element.innerHTML = "Shopper";
      FinalInstance = instance;
      //alert(userAddress)
      return FinalInstance.checkSeller(userAddress); //return FinalInstance.getHighBidder(currentItem)
    }).then(function(isSeller) {
      //alert(isSeller)
      if (isSeller != 0) {
        sellerPriv = true;
        element.innerHTML += ", Seller";
      } else {
        sellerPriv = false;
      }
      // Do something with list of for sale items
      // retrieve product data (name, price, seller, ipfsHash, auction info, etc)
      // retrieve pictures from IPFS

    }).then(function() {
      return FinalInstance.checkAdmin.call(userAddress);
    }).then(function(isAdmin) {
      if (isAdmin != 0) {
        adminPriv = true;
        element.innerHTML += ", Admin";
      } else {
        adminPriv = false;
      }
      return FinalInstance.getText.call(); // MARCH2020 INVALID NUMBER OF ARGUMENTS TO SOLIDITY CALL
    }).then(function(ownerString) {
      ownerText.innerHTML = ownerString;
    }).then(function() {
      App.listBatchOfItems(displayStartIndex);
      if (sellerPriv == true) {
        document.getElementById("seller_button").style.display = 'none';
      }
    }).catch(function(err) {
      console.log(err.message);
      var element = document.getElementById("test2");
      alert(err.message);
    });

  },

  //---------------------------------------------------------------------

  choosePhoto: function() {
    var pathElement = document.getElementById("itemPhoto");
    var imageElement = document.getElementById("design_display");
    const filePath = pathElement.value;
    var f = pathElement.files[0];
    var reader = new FileReader();
    reader.onload = (function(theFile) {
      return function(e) {
        imageElement.src = e.target.result;
      };
    })(f);
    reader.readAsDataURL(f);
    App.testIpfs();
    return (1);
  },

  setProductPhoto: function() {

    var pathElement = document.getElementById("itemPhoto");
    IpfsNode.on('ready', () => {
      const file = pathElement.value;
      var reader = new FileReader();
      reader.onload = function(event) {
        image = ipfs.types.Buffer(e.target.result);
        addIPFS(image, function(hash) {
          var imageHash = hash;
        });
      };
      reader.readAsArrayBuffer(file);
      return (imageHash);
    });
  },

  //---------------------------------------------------------------------


  getImg: function(hash, refFunc) {

    var element = document.getElementById("test2");
    var buf = [];

    element.innerHTML = "in getImg0";
    App.contracts.Final.deployed().then(function(instance) {
      element.innerHTML = "Not working";
      // download image
      ipfs.on('ready', async () => {
        const version = await node.version();
        element.innerHTML = version.version;
      });
      element.innerHTML = "after getImg";
    }); // deployed

  },


  testIpfs: async function() {

    document.getElementById("btn-sellItem").disabled = true;
    document.getElementById("btn-aucItem").disabled = true;
    var pathElement = document.getElementById("itemPhoto");
    var imageElement = document.getElementById("design_display");
    const filePath = pathElement.value;
    var f = pathElement.files[0];
    var reader = new FileReader();
    reader.onloadend = (function(theFile) {
      image = window.IpfsApi().Buffer(reader.result);
      IpfsNode.files.add(image, (err, result) => { // Upload buffer to IPFS
        if (err || !result) {
          alert("error");
          document.getElementById("btn-sellItem").disabled = false;
          document.getElementById("btn-aucItem").disabled = false;
          return;
        }
        var imageHash = result[0].hash;
        alert("ipfs hash: " + imageHash);
        document.getElementById("btn-sellItem").disabled = false;
        document.getElementById("btn-aucItem").disabled = false;
        ipfsHash = imageHash;
      });
    });
    reader.readAsArrayBuffer(f);
    return (1);
  },

  IPFSdisplay: function(hash) {
    var element = document.getElementById("current_item_display");
    var buf = [];

    IpfsNode.files.cat(hash).then(function(stream) {
      stream.on('data', (file) => {
        data = Array.prototype.slice.call(file);
        buf = buf.concat(data);
      });
      stream.on('end', (file) => {
        if (typeof blob !== 'undefined') {}
        buf = window.IpfsApi().Buffer(buf);
        blob = new Blob([buf], {
          type: "image/jpg"
        });
        img = window.URL.createObjectURL(blob);
        element.src = img;
      });
    }).catch(function(err) {
      element.innerHTML = err;
    });
  },

  getPicture: function(hash, n) {
    var buf = [];
    localimg = [];

    IpfsNode.files.cat(hash).then(function(stream) {
      stream.on('data', (file) => {
        data = Array.prototype.slice.call(file);
        buf = buf.concat(data);
      });
      stream.on('end', (file) => {
        if (typeof blob !== 'undefined') {}
        buf = window.IpfsApi().Buffer(buf);
        blob = new Blob([buf], {
          type: "image/jpg"
        });
        localimg = window.URL.createObjectURL(blob);

        $('.panel-item').eq(n).find('img').attr('src', localimg);
        return null;
      });
    }).catch(function(err) {
      alert(err);
      return null; // TODO - replace with return the default "null" image (something like a "NO IMAGE" picture)
    });
  },

  //---------------------------------------------------------------------


};


$(function() {
  $(window).load(function() {
    App.init();
  });
});
