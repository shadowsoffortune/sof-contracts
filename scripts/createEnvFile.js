const fs = require('fs');

const envContent = `
SONIC_PRIVATE_KEY=${process.env.SONIC_PRIVATE_KEY}
SONIC_TESTNET_URL=${process.env.SONIC_TESTNET_URL}
LOCALHOST_PRIVATE_KEY=${process.env.LOCALHOST_PRIVATE_KEY}
`;
fs.writeFileSync('.env', envContent.trim());