import {
  Aes,
  FetchChain,
  PrivateKey,
  PublicKey,
  TransactionHelper
} from "cybexjs";
import { getLogger } from "./../utils/logger";
import { PublicKeys, PublicKeysToCheck, TransferObject } from "./types";

export const logger = getLogger("CybexDaemon");

export const getIndexSuffixdArray: (
  strOrArray: string | string[]
) => Array<string | number> = strOrArray =>
  Array.isArray(strOrArray)
    ? strOrArray.map((item, index) => item)
    : [strOrArray];

type MemoObject = {
  from: string;
  to: string;
  nonce: string;
  message: string;
};
type AssetAmount = {
  amount: number;
  asset_id: string;
};

export type TransferOp = {
  id?: string;
  amount: AssetAmount;
  extensions: any;
  fee: AssetAmount;
  from: string;
  to: string;
  memo?: MemoObject;
  memoContent?: string;
  [x: string]: any;
};

type HistoryEntry = {
  id: string;
  op: [number, TransferOp];
  result: [number, any];
  block_num: number;
  trx_in_block: number;
  op_in_trx: number;
  virtual_op: number;
};

export const genKeysFromWif = (wifMap: { [role: string]: string }) => {
  let privKeys = {};
  let pubKeys = {};
  for (let role of Object.getOwnPropertyNames(wifMap)) {
    privKeys[role] = PrivateKey.fromWif(wifMap[role]);
    pubKeys[role] = privKeys[role].toPublicKey().toString();
  }
  return {
    privKeys,
    pubKeys
  };
};

export const getAuthsFromPubkeys: (
  pubKeys: PublicKeys,
  rolesToAuth?: string[]
) => PublicKeysToCheck = (pubKeys, rolesToAuth = ["active", "owner", "memo"]) =>
  Object.keys(pubKeys)
    .filter(role => rolesToAuth.indexOf(role) !== -1)
    .reduce(
      (auths: { [x: string]: any }, pubkeyRole) =>
        pubkeyRole in auths
          ? {
              ...auths,
              [pubkeyRole]: [
                ...auths[pubkeyRole],
                getIndexSuffixdArray(pubKeys[pubkeyRole])
              ]
            }
          : {
              ...auths,
              [pubkeyRole]: [getIndexSuffixdArray(pubKeys[pubkeyRole])]
            },
      {}
    );

export const genMemo: (
  from_account: string,
  to_account: string,
  memoContent: string,
  keyMaps: { [pubkey: string]: any }
) => any = async (from_account, to_account, memoContent, keyMaps) => {
  let [memo_sender, memo_to] = await Promise.all([
    FetchChain("getAccount", from_account),
    FetchChain("getAccount", to_account)
  ]);

  // 检查双方公钥存在
  let memo_from_public = memo_sender.getIn(["options", "memo_key"]);
  // The 1s are base58 for all zeros (null)
  if (/111111111111111111111/.test(memo_from_public)) {
    memo_from_public = null;
  }
  let memo_to_public = memo_to.getIn(["options", "memo_key"]);
  if (/111111111111111111111/.test(memo_to_public)) {
    memo_to_public = null;
  }
  if (!memo_from_public || !memo_to_public) {
    return undefined;
  }
  let privKey = keyMaps[memo_from_public];

  let nonce = TransactionHelper.unique_nonce_uint64();
  return {
    from: memo_from_public,
    to: memo_to_public,
    nonce,
    message: Aes.encrypt_with_checksum(
      privKey,
      memo_to_public,
      nonce,
      new Buffer(memoContent, "utf-8")
    )
  };
};

export const buildTransfer = async (
  { from_account, to_account, amount, asset, memo }: TransferObject,
  keyMaps: any
) => {
  let memoObject;
  if (memo) {
    memoObject = await genMemo(from_account, to_account, memo, keyMaps);
  }
  return {
    fee: {
      amount: 0,
      asset_id: "1.3.0"
    },
    from: from_account,
    to: to_account,
    amount: {
      amount,
      asset_id: asset
    },
    memo: memoObject
  };
};

export const filterHistoryByOp = (
  oriHistory: HistoryEntry[],
  opToRemained: string | number
) => oriHistory.filter(hisEntry => hisEntry.op[0] === opToRemained);

export type TransferOpWithMemo = TransferOp & { id: string; [s: string]: any };
export const getOpFromHistory: (
  history: HistoryEntry
) => TransferOpWithMemo = history => ({ ...history.op[1], id: history.id });

export const getTransferOpWithMemo = (
  history: HistoryEntry,
  privKeys?: string[]
) => {
  let op = getOpFromHistory(history);
  if (op.memo && privKeys && privKeys.length) {
    try {
      op.memoContent = decodeMemo(op.memo, privKeys);
    } catch (e) {
      op.memoContent = "***";
    }
  }
  return op;
};

export const decodeMemo: (memo: MemoObject, privKeys: string[]) => string = (
  memo,
  privKeys
) => {
  let memoContent;
  try {
    memoContent = decodeMemoImpl(memo, privKeys[0]);
  } catch (e) {
    memoContent = decodeMemoImpl(memo, privKeys[1]);
  }
  return memoContent;
};

export const decodeMemoImpl: (memo: MemoObject, privKey: any) => string = (memo, privKey) => {
  let publicKeyString = privKey.toPublicKey().toPublicKeyString();
  if (publicKeyString !== memo.to && publicKeyString !== memo.from) {
    throw "Not valid privKey";
  }
  let pubToBeUsed = publicKeyString === memo.to ? memo.from : memo.to;
  let memoContent;
  try {
    memoContent = Aes.decrypt_with_checksum(
      privKey,
      pubToBeUsed,
      memo.nonce,
      memo.message,
      false
    ).toString("utf-8");
  } catch (e) {
    memoContent = Aes.decrypt_with_checksum(
      privKey,
      pubToBeUsed,
      memo.nonce,
      memo.message,
      true
    ).toString("utf-8");
  }
  return memoContent;
};

export const getRealIdNumber = (id: string) => parseInt(id.split(".")[2], 10);

export const sortOpsAscend = (preOp, nextOp) =>
  getRealIdNumber(preOp.id) - getRealIdNumber(nextOp.id);
