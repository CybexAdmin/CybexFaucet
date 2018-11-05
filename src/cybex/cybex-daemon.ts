/// <reference types="node" />
import { ChainStore, FetchChain, Login, TransactionBuilder } from "cybexjs";
import { Apis } from "cybexjs-ws";
import { List } from "immutable";
import { differenceBy } from "lodash";
import { EVENT_ON_NEW_HISTORY } from "./Constants";
import {
  buildTransfer,
  genKeysFromWif,
  getAuthsFromPubkeys,
  logger,
  sortOpsAscend
} from "./Utils";
import {
  GlobalDynamicObject,
  HistoryEntry,
  PublicKeysToCheck,
  TransferObject
} from "./types";
import events = require("events");
import { TrxBroadcastResult, CreateAccountOp } from "Cybex";

export enum KEY_MODE {
  PASSWORD,
  WIF
}

interface WifSet {
  [role: string]: string;
}

class CybexDaemon extends events.EventEmitter {
  public newDaemon: boolean;
  public privKeys: any;
  public pubKeys: any;
  public keyMap: any;
  public history: any[];
  public daemonAccountInfo: any;
  public Apis: any;
  public get privKey() {
    return this.privKeys.active;
  }
  public get pubKey() {
    return this.pubKeys.active;
  }
  constructor(
    private nodeAddress: string,
    private daemonUser: string,
    private daemonPassword: string | WifSet,
    private mode = KEY_MODE.PASSWORD
  ) {
    super();
    this.history = [];
  }

  /**
   * 初始化ChainStore，转账操作前需执行
   *
   * @memberof CybexDaemon
   */
  async init() {
    let starter = Date.now();
    let { nodeAddress } = this;
    try {
      let instanceRes = await Apis.instance(nodeAddress, true).init_promise;
    } catch (e) {
      process.exit(1);
    }
    this.Apis = Apis;
    // get_recent_transaction_by_id
    logger.info("connected to:", nodeAddress);
    await ChainStore.init();
    this.daemonAccountInfo = await FetchChain("getAccount", this.daemonUser);
    this.newDaemon = true;
    // ChainStore.subscribe(this.listenDaemonAccount);
    (Apis.instance() as any).ws_rpc.ws.on("close", async e => {
      logger.error("Ws connection has been broken. Reconnect to ws server");
      await this.init();
    });
    this.configKeys();
    this.updateAuthForOp(["active"]);
    this.listenDaemonAccount();
    // this.signForWork();
    console.log("Init Done: ", Date.now() - starter + "ms");
  }

  configKeys() {
    switch (this.mode) {
      default:
      case KEY_MODE.PASSWORD:
        let res = Login.generateKeys(this.daemonUser, this
          .daemonPassword as string);
        this.privKeys = res.privKeys;
        this.pubKeys = res.pubKeys;
        break;
      case KEY_MODE.WIF:
        let { privKeys, pubKeys } = genKeysFromWif({
          active: this.daemonPassword
        } as WifSet);
        this.privKeys = privKeys;
        this.pubKeys = pubKeys;
        break;
    }
    this.keyMap = {};
    for (let role of Object.getOwnPropertyNames(this.pubKeys)) {
      this.keyMap[this.pubKeys[role]] = this.privKeys[role];
    }
    logger.debug("[DaemonInit]", "[KeyMap]", Object.keys(this.keyMap));
  }
  async listenDaemonAccount() {
    logger.info("[Cybex Tick]");
    this.daemonAccountInfo = await FetchChain("getAccount", this.daemonUser);
    logger.info("[Cybex Tick] Update Account");
    // let historyList: List<HistoryEntry> = this.daemonAccountInfo.get("history");
    // if (!historyList) return;
    let history: HistoryEntry[];
    if (this.newDaemon) {
      history = await this.getAccountFullHistory();
      this.newDaemon = false;
    } else {
      history = await this.getAccountHistory();
    }

    // wait to
    // Filter irreversible history
    let globalObject: GlobalDynamicObject = await this.Apis.instance()
      .db_api()
      .exec("get_dynamic_global_properties", []);
    logger.info(
      "[Cybex Tick]",
      "[Head Block]",
      globalObject.head_block_number,
      "[Irreversible Block]",
      globalObject.last_irreversible_block_num
    );
    logger.debug("[Cybex Tick]", globalObject);
    history = history.filter(
      his => his.block_num <= globalObject.last_irreversible_block_num
    );
    let newAdded = differenceBy(history, this.history, "id").sort(
      sortOpsAscend
    );
    // logger.debug("New Transfer: ", JSON.stringify(newAdded));
    if (newAdded.length) {
      this.history = [...this.history, ...newAdded];
      logger.debug("New Transfer: ", newAdded.length);
      this.emit(EVENT_ON_NEW_HISTORY, newAdded);
    }
  }

  async signForWork() {
    return this.performTransfer({
      to_account: "1.2.7",
      asset: "1.3.0",
      amount: 1,
      memo: `Gateway Online at ${new Date()}`
    });
  }
  // Database API:

  async lookupAssetSymbols(assetSymbols: string[]) {
    return await this.Apis.instance()
      .db_api()
      .exec("lookup_asset_symbols", [assetSymbols]);
  }

  async getAccountByName(name: string) {
    return await this.Apis.instance()
      .db_api()
      .exec("get_account_by_name", [name]);
  }
  async getAccountsById(ids: string[]) {
    return await this.Apis.instance()
      .db_api()
      .exec("get_accounts", [ids]);
  }

  async getAccountHistory() {
    return await this.Apis.instance()
      .history_api()
      .exec("get_account_history", [
        this.daemonAccountInfo.get("id"),
        "1.11.1",
        100,
        "1.11.0"
      ]);
  }

  async getAccountFullHistory(
    accountId = this.daemonAccountInfo.get("id"),
    numOfRecord = 100
  ) {
    let res = await this.Apis.instance()
      .history_api()
      .exec("get_account_history", [
        accountId,
        "1.11.1",
        numOfRecord,
        "1.11.0"
      ]);
    if (res.length < numOfRecord) {
      return res;
    }
    let then;
    do {
      let lastId = parseInt(res[res.length - 1].id.split(".")[2], 10) - 1;
      then = await this.Apis.instance()
        .history_api()
        .exec("get_account_history", [
          accountId,
          "1.11.1",
          numOfRecord,
          "1.11." + lastId
        ]);
      res = [...res, ...then];
    } while (then.length);
    return res;
  }

  async createAccount({
    active_key,
    memo_key,
    name,
    owner_key
  }: {
    active_key: string;
    memo_key: string;
    name: string;
    owner_key: string;
  }): Promise<TrxBroadcastResult<CreateAccountOp>[]> {
    let createParams = {
      fee: {
        amount: 0,
        asset_id: 0
      },
      registrar: this.daemonAccountInfo.get("id"),
      referrer: this.daemonAccountInfo.get("id"),
      referrer_percent: 0,
      name: name,
      owner: {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[owner_key, 1]],
        address_auths: []
      },
      active: {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[active_key, 1]],
        address_auths: []
      },
      options: {
        memo_key: memo_key,
        voting_account: "1.2.5",
        num_witness: 0,
        num_committee: 0,
        votes: []
      }
    };
    let tr = new TransactionBuilder();
    let op = tr.get_type_operation("account_create", createParams);
    return await this.performTransaction(tr, op);
  }

  async updateAccountWhitelist(account_to_list, new_listing) {
    let createParams = {
      fee: {
        amount: 0,
        asset_id: 0
      },
      new_listing,
      account_to_list,
      authorizing_account: this.daemonAccountInfo.get("id")
    };

    let tr = new TransactionBuilder();
    let op = tr.get_type_operation("account_whitelist", createParams);
    return await this.performTransaction(tr, op);
  }

  /**
   * 实现一次Transfer操作
   * @param {TransferObject} transferObj
   * @memberof CybexDaemon
   */
  async performTransfer(transferObj: TransferObject) {
    if (this.mode === KEY_MODE.PASSWORD && !this.updateAuthForOp(["active"])) {
      throw new Error("Cannot update auths for transfer");
    }
    if (!transferObj.from_account) {
      transferObj.from_account = this.daemonAccountInfo.get("id");
    }
    // 建立一个用于转账操作的Tranaction, 并配置操作/费用/签名
    let tr = new TransactionBuilder();
    let transfer_op = tr.get_type_operation(
      "transfer",
      await buildTransfer(transferObj, this.keyMap)
    );
    try {
      return await this.performTransaction(tr, transfer_op);
    } catch (e) {
      logger.error("Tranfer Error: ", e);
      throw e;
    }
  }

  async performTransaction(tr, op: any, loginInstance = Login) {
    try {
      await tr.update_head_block();
      tr.add_operation(op);
      await tr.set_required_fees();
      await tr.update_head_block();
      if (this.mode === KEY_MODE.PASSWORD) {
        loginInstance.signTransaction(tr);
      } else {
        tr.add_signer(this.privKey);
      }
      logger.info("[Transaction to broadcast]", JSON.stringify(tr.serialize()));
      let retry = 0;
      try {
        let res = await tr.broadcast();
        logger.info("[Broadcast Tx Failed]", "[Retry Done]", res);
        return res;
      } catch (e) {
        logger.warn("[Broadcast Tx Failed]", e);
        if (retry++ === 0) {
          logger.info("[Broadcast Tx Failed]", "[Reinit Daemon]", e);
          await this.init();
          logger.info("[Broadcast Tx Failed]", "[Reinit Daemon Done]");
          logger.info(
            "[Broadcast Tx Failed]",
            "[Retry Boradcast]",
            JSON.stringify(tr.serialize())
          );
          let res = await tr.broadcast();
          logger.info("[Broadcast Tx Failed]", "[Retry Done]", res);
          return res;
        } else {
          logger.error("[Broadcast Tx Failed]", "[Retry Failed!]", e);
          throw e;
        }
      }
    } catch (e) {
      await this.init();
      logger.error("[Perform Transaction error]", e);
      throw new Error(e);
    }
  }

  /**
   * 检测并更新当前Login中存有的auth
   *
   * @public
   * @param {TransferObject} transferObj
   * @param {string[]} [roles=["active", "memo", "owner"]] 更新哪些role，一般操作通常仅需要active
   * @returns {boolean}
   * @memberof CybexDaemon
   */
  public updateAuthForOp(
    roles: string[] = ["active", "memo", "owner"],
    loginInstance = Login
  ): boolean {
    if (!this.pubKeys || !this.pubKeys.active) {
      throw new Error("No active auth founded");
    }
    let authToTransfer: PublicKeysToCheck = getAuthsFromPubkeys(
      this.pubKeys,
      roles
    );
    return loginInstance.checkKeys({
      accountName: this.daemonUser,
      password: this.daemonPassword as string,
      auths: authToTransfer
    });
  }
}

export { CybexDaemon };
