import React, { useState } from "react";
import algosdk from "algosdk";

// sandbox
const token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const server = "http://localhost";
const port = 4001;

function App() {
	const [accOne, setAccOne] = useState();
	const [accTwo, setAccTwo] = useState();

	function inputAccountOne(event) {
		setAccOne(event.target.value);
	}

	function inputAccountTwo(event) {
		setAccTwo(event.target.value);
	}

	// Function used to print created asset for account and assetid
	const printCreatedAsset = async function (algodclient, account, assetid) {
		let accountInfo = await algodclient.accountInformation(account).do();
		for (var idx = 0; idx < accountInfo["created-assets"].length; idx++) {
			let scrutinizedAsset = accountInfo["created-assets"][idx];
			if (scrutinizedAsset["index"] === assetid) {
				console.log("AssetID = " + scrutinizedAsset["index"]);
				let myparms = JSON.stringify(scrutinizedAsset["params"], undefined, 2);
				console.log("parms = " + myparms);
				break;
			}
		}
	};
	// Function used to print asset holding for account and assetid
	const printAssetHolding = async function (algodclient, account, assetid) {
		let accountInfo = await algodclient.accountInformation(account).do();
		for (var idx = 0; idx < accountInfo["assets"].length; idx++) {
			let scrutinizedAsset = accountInfo["assets"][idx];
			if (scrutinizedAsset["asset-id"] === assetid) {
				let myassetholding = JSON.stringify(scrutinizedAsset, undefined, 2);
				console.log("assetholdinginfo = " + myassetholding);
				break;
			}
		}
	};

	async function transferAssets() {
		//COPIED CODE FROM HERE
		var recoveredAccount1 = algosdk.mnemonicToSecretKey(accOne);
		var recoveredAccount2 = algosdk.mnemonicToSecretKey(
			"salt duck brain humble awesome clown short iron inherit ugly spatial choose tragic junk require truth find young expand chaos drift whip year about advance"
		);
		var recoveredAccount3 = algosdk.mnemonicToSecretKey(accTwo);
		console.log(recoveredAccount1.addr);
		console.log(recoveredAccount2.addr);
		console.log(recoveredAccount3.addr);

		// Instantiate the algod wrapper
		let algodclient = new algosdk.Algodv2(token, server, port);

		// Asset Creation:
		// The first transaciton is to create a new asset
		// Get last round and suggested tx fee
		// We use these to get the latest round and tx fees
		// These parameters will be required before every
		// Transaction
		// We will account for changing transaction parameters
		// before every transaction in this example
		let params = await algodclient.getTransactionParams().do();
		console.log(params);
		let note = undefined; // arbitrary data to be stored in the transaction; here, none is stored
		// Asset creation specific parameters
		// The following parameters are asset specific
		// Throughout the example these will be re-used.
		// We will also change the manager later in the example
		let addr = recoveredAccount1.addr;
		// Whether user accounts will need to be unfrozen before transacting
		let defaultFrozen = false;
		// integer number of decimals for asset unit calculation
		let decimals = 0;
		// total number of this asset available for circulation
		let totalIssuance = 1000;
		// Used to display asset units to user
		let unitName = "LATINUM";
		// Friendly name of the asset
		let assetName = "Grapes";
		// Optional string pointing to a URL relating to the asset
		let assetURL = "http://someurl";
		// Optional hash commitment of some sort relating to the asset. 32 character length.
		let assetMetadataHash = "16efaa3924a6fd9d3a4824799a4ac65d";
		// The following parameters are the only ones
		// that can be changed, and they have to be changed
		// by the current manager
		// Specified address can change reserve, freeze, clawback, and manager
		let manager = recoveredAccount2.addr;
		// Specified address is considered the asset reserve
		// (it has no special privileges, this is only informational)
		let reserve = recoveredAccount2.addr;
		// Specified address can freeze or unfreeze user asset holdings
		let freeze = recoveredAccount2.addr;
		// Specified address can revoke user asset holdings and send
		// them to other addresses
		let clawback = recoveredAccount2.addr;

		// signing and sending "txn" allows "addr" to create an asset
		let txn = algosdk.makeAssetCreateTxnWithSuggestedParams(
			addr,
			note,
			totalIssuance,
			decimals,
			defaultFrozen,
			manager,
			reserve,
			freeze,
			clawback,
			unitName,
			assetName,
			assetURL,
			assetMetadataHash,
			params
		);

		let rawSignedTxn = txn.signTxn(recoveredAccount1.sk);
		let tx = await algodclient.sendRawTransaction(rawSignedTxn).do();

		let assetID = null;
		// wait for transaction to be confirmed
		const ptx = await algosdk.waitForConfirmation(algodclient, tx.txId, 4);
		// Get the new asset's information from the creator account
		// let ptx = await algodclient.pendingTransactionInformation(tx.txId).do();
		assetID = ptx["asset-index"];
		//Get the completed Transaction
		console.log("Transaction " + tx.txId + " confirmed in round " + ptx["confirmed-round"]);

		// console.log("AssetID = " + assetID);

		await printCreatedAsset(algodclient, recoveredAccount1.addr, assetID);
		await printAssetHolding(algodclient, recoveredAccount1.addr, assetID);

		// Change Asset Configuration:
		// Change the manager using an asset configuration transaction

		// First update changing transaction parameters
		// We will account for changing transaction parameters
		// before every transaction in this example

		params = await algodclient.getTransactionParams().do();
		// Asset configuration specific parameters all other values are the same so we leave Them set.
		// specified address can change reserve, freeze, clawback, and manager
		manager = recoveredAccount1.addr;

		// Note that the change has to come from the existing manager
		let ctxn = algosdk.makeAssetConfigTxnWithSuggestedParams(recoveredAccount2.addr, note, assetID, manager, reserve, freeze, clawback, params);

		// This transaction must be signed by the current manager
		rawSignedTxn = ctxn.signTxn(recoveredAccount2.sk);
		let ctx = await algodclient.sendRawTransaction(rawSignedTxn).do();
		// Wait for confirmation
		let confirmedTxn = await algosdk.waitForConfirmation(algodclient, ctx.txId, 4);
		//Get the completed Transaction
		console.log("Transaction " + ctx.txId + " confirmed in round " + confirmedTxn["confirmed-round"]);

		// Get the asset information for the newly changed asset
		// use indexer or utiltiy function for Account info

		// The manager should now be the same as the creator
		await printCreatedAsset(algodclient, recoveredAccount1.addr, assetID);

		// Opting in to an Asset:
		// Opting in to transact with the new asset Allow accounts that want recieve the new asset
		// Have to opt in. To do this they send an asset transfer of the new asset to themseleves
		// In this example we are setting up the 3rd recovered account to receive the new asset
		params = await algodclient.getTransactionParams().do();

		let sender = recoveredAccount3.addr;
		let recipient = sender;
		// We set revocationTarget to undefined as
		// This is not a clawback operation
		let revocationTarget = undefined;
		// CloseReaminerTo is set to undefined as
		// we are not closing out an asset
		let closeRemainderTo = undefined;
		// We are sending 0 assets
		let amount = 0;

		// signing and sending "txn" allows sender to begin accepting asset specified by creator and index
		let opttxn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget, amount, note, assetID, params);

		// Must be signed by the account wishing to opt in to the asset
		rawSignedTxn = opttxn.signTxn(recoveredAccount3.sk);
		let opttx = await algodclient.sendRawTransaction(rawSignedTxn).do();
		// Wait for confirmation
		confirmedTxn = await algosdk.waitForConfirmation(algodclient, opttx.txId, 4);
		//Get the completed Transaction
		console.log("Transaction " + opttx.txId + " confirmed in round " + confirmedTxn["confirmed-round"]);

		//You should now see the new asset listed in the account information
		console.log("Account 3 = " + recoveredAccount3.addr);
		await printAssetHolding(algodclient, recoveredAccount3.addr, assetID);

		// Transfer New Asset:
		// Now that account3 can recieve the new tokens we can tranfer tokens in from the creator to account3
		// First update changing transaction parameters We will account for changing transaction parameters
		// before every transaction in this example

		params = await algodclient.getTransactionParams().do();
		sender = recoveredAccount1.addr;
		recipient = recoveredAccount3.addr;
		revocationTarget = undefined;
		closeRemainderTo = undefined;
		//Amount of the asset to transfer
		amount = 10;

		// signing and sending "txn" will send "amount" assets from "sender" to "recipient"
		let xtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget, amount, note, assetID, params);
		// Must be signed by the account sending the asset
		rawSignedTxn = xtxn.signTxn(recoveredAccount1.sk);
		let xtx = await algodclient.sendRawTransaction(rawSignedTxn).do();

		// Wait for confirmation
		confirmedTxn = await algosdk.waitForConfirmation(algodclient, xtx.txId, 4);
		//Get the completed Transaction
		console.log("Transaction " + xtx.txId + " confirmed in round " + confirmedTxn["confirmed-round"]);

		// You should now see the 10 assets listed in the account information
		console.log("Account 3 = " + recoveredAccount3.addr);
		await printAssetHolding(algodclient, recoveredAccount3.addr, assetID);
	}

	return (
		<div className="App">
			<div className="container">
				<h1 className="heading">Transfer Assets Application</h1>
				<div className="accounts">
					<div className="accounts-a">
						<p className="mnemonic--text">Account 1 Mnemonic</p>
						<input type="text" className="mnemonic" onChange={inputAccountOne} />
						<p className="withdraw--info">Withdraw Asset</p>
					</div>
					<div className="arrow">
						<span className="arrow-text">--{">"}</span>
					</div>
					<div className="accounts-b">
						<p className="mnemonic--text">Account 2 Mnemonic</p>
						<input type="text" className="mnemonic" onChange={inputAccountTwo} />
						<p className="deposit--info">Deposit Asset</p>
					</div>
				</div>
				<div className="btn--container">
					<button className="btn" onClick={transferAssets}>
						Submit
					</button>
				</div>
			</div>
		</div>
	);
}

export default App;
