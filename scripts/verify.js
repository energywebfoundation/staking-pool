const path = require('path');
const axios = require("axios");
const { readFileSync } = require('fs');

const flattenedContract = path.join(__dirname, '/utils/flattened_contracts');

const verifyContract = async (_verifyParameters) => {
    const baseUrlApi = "https://volta-explorer.energyweb.org/api/";
    const result = await axios({
        method: 'post',
        url:`${baseUrlApi}`,
        data: JSON.stringify(_verifyParameters),
        headers: {
            'Content-Type': 'application/json',
        }
        
     });

   return result;
}

const getSourceCode = () => {
    const sourceCode = readFileSync(flattenedContract, {encoding: 'utf-8'});
    console.log("SOURCE Code >>> ", sourceCode);
    return sourceCode;
}

const verifyParameters = {
    module: "contract",
    action: "verify",
    addressHash: "0x75006AB5f8f41A73a0E512E0E73dde793cd0378B",
    name: "StakingPool",
    compilerVersion: "0.8.6+commit.11564f7e",
    optimization: false,
    contractSourceCode: getSourceCode(),
};

(async function verify(){
    const verificationReport = await verifyContract(verifyParameters);

   console.log("Verification Report : ", verificationReport);
})()
