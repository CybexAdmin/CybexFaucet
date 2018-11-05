/// < reference types="node" />
// declare module "cybexjs" {

//   type ParamsOfCheck = {
//     accountName: string;
//     password: string
//     auths: {[x: string]: [string, number][]}
//   };
//   class AccountLogin {
//     checkKeys: (paramsToCheck: ParamsOfCheck) => boolean;
//     generateKeys(accountName: string, password: string, roles?: string[], prefix?: string): any;
//     signTransaction(tr: any): void;
//   }
//   const Login: AccountLogin;
//   class ChainStoreClass {
//     resetCache(): void;
//     init: () => Promise<any>;
//     subscribe(handler: (obj: object) => any): void;
//     unsubscribe(handler: (obj: object) => any): void;
//     getObject(id: string): any;
//     getAccount(name_or_id: string, autosubscribe?: boolean): any;
//   }
//   const ChainStore: ChainStoreClass;
//   const TransactionBuilder: any;
//   const FetchChain: (apiMethod: string, ...args: any[]) => Promise<any>;
//   const TransactionHelper: any;
//   const Aes: any;
//   const PublicKey: any;
// }
// declare module "cybexjs-ws" {
//   class Apis {
//     static setRpcConnectionStatusCallback(handler: (status: any) => any): void;
//     static instance(cs: string, connect: boolean, connectTimeout?: number, enableCrypto?: boolean): Apis;
//     init_promise: Promise<any>
//   }
// }

// Some common types
export type PublicKeys = {
  [x: string]: string | string[]
};
export type PublicKeysToCheck = {
  [x: string]: [string, number][]
};
export type TransferObject = {
  from_account?: string,
  to_account: string,
  amount: number,
  asset: string,
  memo?: string
};

export type GlobalDynamicObject = {
  id: '2.1.0',
  head_block_number: number,
  head_block_id: string,
  time: string,
  current_witness: string,
  next_maintenance_time: string,
  last_budget_time: string,
  witness_budget: number,
  accounts_registered_this_interval: number,
  recently_missed_count: number,
  current_aslot: number,
  recent_slots_filled: string,
  dynamic_flags: number,
  last_irreversible_block_num: number
};
export type Operation = {

}
export type HistoryEntry =
  {
    id: string,
    block_num: number,
    trx_num: number,
    trx:
    {
      ref_block_num: number,
      ref_block_prefix: number,
      expiration: string,
      operations: [number, Operation],
      extensions: any[],
      signatures: string[],
      operation_results: any[]
    }
  };