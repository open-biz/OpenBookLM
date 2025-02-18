import { ethers } from "ethers";

const url =
  "https://rpc.testnet.tryradi.us/ac030419463f6b74251f4b090c743b051b3624eaf6d9e7c0";

const provider = new ethers.JsonRpcProvider(url);

provider
  .getBlockNumber()
  .then((blockNumber) => {
    console.log(blockNumber);
  })
  .catch((error) => {
    console.error(error);
  });
