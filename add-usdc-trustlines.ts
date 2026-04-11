import * as StellarSdk from '@stellar/stellar-sdk';

const USDC_ASSET = new StellarSdk.Asset(
  'USDC',
  'GBBD47IF6LWK7P7MDEVSCWTTCJM4TWCH6TZZRVOSNW1EV1SUNX6JZIGT'
);

async function addTrustline(secretKey: string, name: string) {
  const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
  const keypair = StellarSdk.Keypair.fromSecret(secretKey);
  const publicKey = keypair.publicKey();

  console.log(`Checking ${name} (${publicKey})...`);
  
  try {
    const account = await server.loadAccount(publicKey);
    const hasTrustline = account.balances.some(
      (b: any) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ASSET.issuer
    );

    if (hasTrustline) {
      console.log(`✅ ${name} already has a USDC trustline.`);
      return;
    }

    console.log(`Adding USDC trustline for ${name}...`);
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: USDC_ASSET,
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    const response = await server.submitTransaction(tx);
    console.log(`✅ Success! Trustline added for ${name}. Hash: ${response.hash}`);
  } catch (error: any) {
    console.error(`❌ Failed to add trustline for ${name}:`, error?.response?.data?.extras?.result_codes || error.message);
  }
}

async function main() {
  const keys = {
    Facilitator: process.env.FACILITATOR_SECRET,
    Receiver: process.env.RECEIVER_SECRET,
    TestAgent: process.env.AGENT_SECRET,
  };

  for (const [name, secret] of Object.entries(keys)) {
    if (!secret) {
      console.log(`⚠️ Skipping ${name}: Secret key not provided in environment.`);
      continue;
    }
    await addTrustline(secret, name);
  }
}

main();
