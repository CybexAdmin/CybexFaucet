# CybexFaucet
a minimal service for Cybex registration.

## System Requirment
* Node.js >= 8.9
* MongoDB >= 3.4
* [PM2](https://pm2.keymetrics.io/) >= 2

## How to run
1. Clone this repository.
2. `npm i` or `yarn`.
3. Edit `pm2.json`, adding your faucet account and the database information. The faucet account must be a lifetime member of CybexDEX, who will be the registrar of those accounts registered by this service.
4. run `yarn start` for development & `yarn start:prod` for production.

## API
Once the service started, it would listen to the port which you added into the pm2.json or the default port - 3050. As the minimal version of the faucet, there are only two routes should be used.

* `POST /register/`

  Content-Type: application 
  
  Body:
  
  |Property|Type|Description
  | --- | --- | --- |
  | account | `Object` |  The object containing the register information |
  | account.name  | `string`  | The account name should be resigered |
  | account.owner_key | `string`  | The owner public key of new account |
  | account.active_key | `string`  | The active public key of new account |
  | account.memo_key | `string` | The memo public key of new account |
  
  Response:
  
  |Property|Type|Description|
  | --- | --- | --- |
  | account | `Object` |  A broadcasted transaction, which contains the whole transaction information and the register result |
  | account.id  | `string`  | The transaction's id in hex |
  | account.block_num | `number`  | The block number which the register occurred |
  | account.trx_num | `number`  | The sequence of the tx |
  | account.trx | `Object`  | The details of the tx |
  | account.trx.operation_results | `array`  | The result of the tx, it contains the new account's id which is used to query the status of this registration |
  | ...|| |
  
* `Get /register/status`

  Content-Type: application 
  
  Query Params:
  
  |Property | Required |Description
  | --- | ---  | --- |
  | name | true | The account name you're querying |
  | id | true | The account id you're querying, it should points to the same account as the the name field points to. |
  
  Response:
  
  |Property|Type|Description|
  | --- | --- | --- |
  | account | `Object` |  The same as the result of register API |
  | ...|
  | libConfirmed | `boolean`\| `undefined`  | `true` means the register tx has been confirmed by the chain |

  
  
