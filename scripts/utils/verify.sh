sourceCode=$(cat flattened_contracts)

echo $sourceCode

curl -d '{"addressHash":"0x8C6ADdEd28774DbbC702C46d83d51815c27F3f81","compilerVersion":"0.8.6+commit.11564f7e", "contractSourceCode":sourceCode,"name":"StakingPool","optimization":false}' -H "Content-Type: application/json" -X POST "https://blockscout.com/poa/sokol/api?module=contract&action=verify"