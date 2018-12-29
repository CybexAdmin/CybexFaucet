declare module "Cybex" {
  class AssetAmount {
    amount: number;
    asset_id: string;
  }

  type AuthWithWeight = [string, number];

  class AccountAuthority {
    weight_threshold: number;
    account_auths: AuthWithWeight[];
    key_auths: AuthWithWeight[];
    address_auths: AuthWithWeight[];
  }

  class AccountOptions {
    memo_key: string;
    voting_account: string;
    num_witness: number;
    num_committee: number;
    votes: string[];
    extensions?: any[];
  }

  class CreateAccountOp {
    fee: AssetAmount;
    registrar: string;
    referrer: string;
    referrer_percent: number;
    name: string;
    owner: AccountAuthority;
    active: AccountAuthority;
  }

  type Operation = CreateAccountOp;
  type OperationID = number;
  type OperationResult = [number, any];

  class Trx<T extends Operation> {
    ref_block_num: number;
    ref_block_ref_block_prefix: number;
    expiration: string;
    operations: [OperationID, T][];
  }

  class TrxWithSignature<T extends Operation> extends Trx<T> {
    extensions: any[];
    signatures: string[];
  }
  class TrxWithResult<T extends Operation> extends Trx<T> {
    operation_results: OperationResult[];
  }

  class TrxBroadcastResult<T extends Operation> {
    id: string;
    block_num: number;
    trx_num: number;
    trx: TrxWithResult<T>;
  }
}

declare module "CybexFaucet" {
  import "Cybex";
  class IPAddress {
    static IPOrigin: {
      CloudFlare: "CloudFlare";
      Other: "Other";
    };

    timeStamp: Date;
    address: string;
    type: string;
    constructor(address: string, type: string);
    toString(): string;
  }

  class RegisterRecord<T> {
    ip: IPAddress;
    account_name: string;
    account_id: string;
    trx: T;
    is_wookong_done: 0 | 1 | 2;
    black_res?: any;
    libConfirmed?: any;
    [other: string]: any;
  }
  class RegisterRequest {
    cap: {
      captcha;
      id;
      fp?;
    };
    account: {};
    isWooKong?: boolean;
  }
}
