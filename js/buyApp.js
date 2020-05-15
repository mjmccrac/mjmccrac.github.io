var currentItem = 0;
var itemCount = 0;
const states = ["For Sale", /*"For Auction",*/ "Sold", "Shipped", "Received"];
const IpfsNode = new window.IpfsApi({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
const maxPriceInEth = 1000;
const minSaleQty = 1;
const maxSaleQty = 100000000;
const maxStringLength = 36; // Arbitrary for now. Optimize later


App = {

    // general global variables
    web3Provider: null,
    userAddress:null,
    userBalance:0,
    adminPriv: false,
    sellPriv: false,
    buffer: '',
    img: [],
    contracts: {},
    ipfsHash:"",

    // specific item variables
    item_name:null,
    item_price:0,
    item_state:0,
    item_seller:null,
    item_qty: 0,
    item_cat: "",
    slr_Rating:0,
    slr_numRat:0,
    slr_jDate: 0,
    slr_numSale:0,
    slr_email:"",
    item_ipfsHash:"",
  //  auction_or_sell:0,


    inputShipping: document.getElementById("item_shipping"),
    buttonFinalize: document.getElementById("btn-finalize"),


    checkEmails: function(){

      App.updateAccount();
      var existingEmail;
      var inputEmail;
      var buyerEmail = "";
      var zeros = "0x0000000000000000000000000000000000000000000000000000000000000000";

        App.contracts.Final.deployed().then(function(instance) {
          FinalInstance = instance;
          // Check - does account already have an email address? If so, skip
          // Check - does item_shipping contain text? If so, use this as email address
          // Does account's existing email address differ from one in item_shipping? if so, prompt which to use
          // If item_shipping is blank, and no existing address --> prompt for address
          return FinalInstance.getEmail(userAddress);
        }).then(function(res){
          existingEmail = web3.toAscii(res);
          if (res == zeros){alert("no email");}
          var inputShipping = document.getElementById("item_shipping");
          inputEmail = inputShipping.value;
          if (res == zeros && inputEmail.length>0){
            buyerEmail = inputEmail;
          }
          else if (res == zeros && inputEmail.length == 0){
              buyerEmail = prompt("Please enter your email address", "");
          }
          else if (res != zeros && inputEmail.length > 0){
            if(inputEmail == existingEmail){
              buyerEmail = existingEmail;
            }
            else{
            if (confirm("Replace existing email: " + existingEmail + " with new email: " + inputEmail + "?")){
              buyerEmail = inputEmail;
            }
            else{
              buyerEmail = existingEmail;
            }
          }
          }

          else if (res != zeros && inputEmail.length == 0){

            buyerEmail = existingEmail;
          }

        }).then(function(){
          if (buyerEmail != existingEmail){
            alert("changing buyer email to " + buyerEmail + " and will then process payment (2 transactions)");
            FinalInstance.addEmail(buyerEmail);

          }

        }).then(function(){
          FinalInstance.buyItem(currentItem, {
            from: web3.eth.accounts[0],
            value: web3.toWei(item_price, 'ether'),
          });
          App.returnToIndex();
        });

    },

    returnToIndex:function(){
      var w = window.open("index.html", "_top");
    },

    editItem:function() {
      if (userAddress == item_seller){
          sessionStorage.setItem("currentItem", currentItem);
          var w = window.open("editItem.html", "_top");
      }
    },

    deleteItem:function() {
      if (userAddress == item_seller){
        App.contracts.Final.deployed().then(function(instance) {
          FinalInstance = instance;
          FinalInstance.deleteItem(currentItem);
        }).then(function(){
          var w = window.open("index.html", "_top");
        });
      }
    },

    buyItem: function() {
      App.updateAccount();
      var inputShipping = document.getElementById("item_shipping");
      if (inputShipping.value != ""){
      var existingEmail;
      var inputEmail;
      var buyerEmail = "";
      if ((userBalance > item_price) &&
        (item_state == 0) &&
        (userAddress != item_seller)) {
        App.contracts.Final.deployed().then(function(instance) {
          FinalInstance = instance;
        }).then(function(){
          App.checkEmails();
        }).then(function(){
        });
      } else {
        alert("Error: Can't buy. User address = " + userAddress + ", and seller address = " + item_seller + ", and item_state = " + item_state +
            ", and userBalance = " + userBalance + ", and item price = " + item_price);
      }
    }
    else{
      alert ("Buyer email / address cannot be blank");
    }
    },

      updateSellerInfo: function(){
        var FinalInstance;
        var timeUp;
        var fieldHash = document.getElementById("_add_pic");
        var fieldPrice = document.getElementById("_price");
        var fieldName = document.getElementById("_name");

        var fieldSeller = document.getElementById("_Seller");
        var fieldSellerRating = document.getElementById("_SellerRating");
        var fieldSellerReviews = document.getElementById("_SellerReviews");
        var fieldJoinDate = document.getElementById("_JoinDate");
        var fieldNumSales = document.getElementById("_NumSales");
        var fieldQuantity =  document.getElementById("_sale_quantity");
        var fieldCategory = document.getElementById("_keyword");
        var fieldEmail = document.getElementById("_sellerEmail");

        var finalizeButton = document.getElementById("btn-finalize");


        App.contracts.Final.deployed().then(function(instance) {
          FinalInstance = instance;
          return FinalInstance.getItemData(currentItem);
          }).then(function(res) {
            item_name = res[0];

            item_price = parseFloat(web3.fromWei(parseInt(res[1]), 'ether'));
            item_state = parseInt(res[2]);
            item_seller = res[3];

            fieldPrice.value = item_price;
            fieldName.value = item_name;
            fieldSeller.value = item_seller;

            if (userAddress == item_seller){
              document.getElementById("btn-delete").style.visibility = "visible";
              document.getElementById("btn-edit").style.visibility = "visible";
              document.getElementById("btn-finalize").style.visibility = "hidden";
            }
            else{
              document.getElementById("btn-delete").style.visibility = "hidden";
              document.getElementById("btn-edit").style.visibility = "hidden";
              document.getElementById("btn-finalize").style.visibility = "visible";
            }


              auctionString = "Item for sale";
              finalizeButton.innerHTML = "Buy";
              fieldPrice.innerHTML = item_price;
              return FinalInstance.sellerInfo(item_seller);
            }).then(function(res) {
              slr_Rating = parseFloat(res[0]);
              slr_numRat = parseInt(res[1]);
              slr_numSale = parseInt(res[2]);
              slr_jDate = parseInt(res[3]);
              var joinDate = new Date(slr_jDate*1000);
              fieldSellerRating.value = slr_Rating;
              fieldSellerReviews.value = slr_numRat;
              fieldJoinDate.value = joinDate;
              fieldNumSales.value = slr_numSale;
              return FinalInstance.getEmail(item_seller);
            }).then(function(res){
              slr_email = web3.toAscii(res);
              fieldEmail.value = slr_email;
              return FinalInstance.getEmail(userAddress);
            }).then(function(res){
              if (res != 0){
                inputShipping = document.getElementById("item_shipping");
                inputShipping.value = web3.toAscii(res);
              }
              return FinalInstance.getQuantity(currentItem);
            }).then(function(res) {
              item_qty = parseInt(res);
              fieldQuantity.value = parseInt(res);

              return FinalInstance.getCategory(currentItem);
            }).then(function(res) {
              item_cat = res;
              fieldCategory.value = res;
              return FinalInstance.getLocation(currentItem);
            }).then(function(res){
              var item_loc = res;
              if (item_loc != "") document.getElementById("_location").value = item_loc;
              return FinalInstance.getIpfsHash(currentItem);
            }).then(function(res) {
              item_ipfsHash = res;
              fieldHash.value = item_ipfsHash;
              App.IPFSdisplay(item_ipfsHash);
        });
      },

      init: async function() {

        currentItem = sessionStorage.getItem("currentItem");

        return await App.initWeb3();
      },

      initFields: function(){
        var fieldHash = document.getElementById("_add_pic");
        var fieldPrice = document.getElementById("_price");
        var fieldName = document.getElementById("_name");
        var fieldSeller = document.getElementById("_Seller");
        fieldHash.value = item_ipfsHash;
        fieldPrice.value = item_price;
        fieldName.value = item_name;
        fieldSeller.value = item_seller;

        App.IPFSdisplay(item_ipfsHash);
      },

      initWeb3: async function() {

        if (window.ethereum) {
          App.web3Provider = window.ethereum;
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
          App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
        }
        web3 = new Web3(App.web3Provider);

        return App.initContract();
      },

      initContract: function() {
        $.getJSON('Final.json', function(data) {
          var FinalArtifact = data;
          App.contracts.Final = TruffleContract(FinalArtifact);
          App.contracts.Final.setProvider(App.web3Provider);
          return App.updateInterface();
        });
        return App.bindEvents();
      },

      bindEvents: function() {

        var editButton = document.getElementById("btn-edit");
        editButton.addEventListener('click', function(){
          App.editItem();
          });

        var deleteButton = document.getElementById("btn-delete");
        deleteButton.addEventListener('click', function(){
          App.deleteItem();
          });

        var finalizeButton = document.getElementById("btn-finalize");
        finalizeButton.addEventListener('click', function() {
          switch (item_state) {
            case 0:
              App.buyItem();
              break;
            default:
              alert("Can't buy at this time");
              break;
          }
        });

      },

      updateInterface: function(isSeller, isAdmin) {

        App.updateAccount();

        var element = document.getElementById("permissions");
        var FinalInstance;

        App.contracts.Final.deployed().then(function(instance) {
          element.innerHTML = "Shopper";
          FinalInstance = instance;
          return FinalInstance.checkSeller(userAddress);
        }).then(function(isSeller) {
          if (isSeller != 0) {
            sellerPriv = true;
            element.innerHTML += ", Seller";
          } else {
            sellerPriv = false;
          }


        }).then(function() {
          return FinalInstance.checkAdmin.call(userAddress);
        }).then(function(isAdmin) {
          if (isAdmin != 0) {
            adminPriv = true;
            element.innerHTML += ", Admin";
          } else {
            adminPriv = false;
          }

        }).then(function(){
          App.updateSellerInfo();

        }).catch(function(err) {
          console.log(err.message);
          alert (err.message);
          var element = document.getElementById("test2");
          element.innerHTML = err.message;
        });

      },
      updateAccount: function(){
        var addressElement = document.getElementById("userAddress");
        userAddress = web3.eth.accounts[0];
        addressElement.innerHTML = userAddress;

        var balanceElement = document.getElementById("userBalance");
        web3.eth.getBalance(userAddress, (err, wei) => {
          userBalance = web3.fromWei(wei, 'ether');
          balanceElement.innerHTML = userBalance;
        });
      },

      //---------------------------------------------------------------------

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

        var buf =[];

        App.contracts.Final.deployed().then(function(instance) {
          // download image
          ipfs.on('ready', async () => {
              const version = await node.version();
              element.innerHTML = version.version;
          });
      }); // deployed

    },


    IPFSdisplay: function(hash){

      var fieldPicture = document.getElementById("design_display");
      var buf = [];

      IpfsNode.files.cat(hash).then(function(stream) {
        stream.on('data', (file) => {
          data = Array.prototype.slice.call(file);
          buf = buf.concat(data);
        });
        stream.on('end', (file) => {
          if (typeof blob !== 'undefined') {
          }
          buf = window.IpfsApi().Buffer(buf);
          blob = new Blob([buf], {type: "image/jpg" });
          img = window.URL.createObjectURL(blob);
          fieldPicture.src = img;
        });
      }).catch(function(err){
        fieldPicture.innerHTML = err;
      });
    },
};


$(function() {
  $(window).load(function() {
    App.init();
  });
});
