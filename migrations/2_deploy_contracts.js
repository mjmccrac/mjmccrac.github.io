var Final = artifacts.require("Final");
var FinalLibrary = artifacts.require("Lib"); // NEW
//var registry = artifacts.require("Registry");


module.exports = function(deployer) {
  deployer.deploy(FinalLibrary); // NEW
  deployer.link(FinalLibrary, Final);
  deployer.deploy(Final);
  //deployer.deploy(registry);
};
