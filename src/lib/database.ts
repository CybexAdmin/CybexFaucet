import { MongoClient, Db, Collection } from "mongodb";
import { EventEmitter } from "events";
import { RegisterRecord } from "CybexFaucet";
import { TrxBroadcastResult, CreateAccountOp } from "Cybex";
import { getLogger } from "./../utils";
import { Config } from "../config";
const logger = getLogger("Database");
let db: Db;
let dbInstance: FaucetDatabase;

export class FaucetDatabase extends EventEmitter {
  static COLLECTIONS = {
    REGISTER: "REGISTER"
  };

  registerRecordsCol: Collection<
    RegisterRecord<TrxBroadcastResult<CreateAccountOp>>
  > = this.dbInstance.collection(FaucetDatabase.COLLECTIONS.REGISTER);

  constructor(public dbInstance: Db) {
    super();
  }

  async insertNewAccount(
    registerRecord: RegisterRecord<TrxBroadcastResult<CreateAccountOp>>
  ) {
    await this.registerRecordsCol.insertOne({
      ...registerRecord,
      create_at: new Date()
    });
  }

  async markConfirm(account_id: string) {
    return await this.registerRecordsCol.updateOne(
      { account_id, libConfirmed: { $ne: true } },
      {
        $set: {
          libConfirmed: true
        }
      }
    );
  }

  async isRegisterConfirmed(account_id, account_name) {
    return await this.registerRecordsCol.findOne({
      account_id,
      account_name
    });
  }
}

export const getDbInstance = async ({
  DB_URL,
  DB_USER,
  DB_PASS,
  DB_NAME
}: Config) => {
  logger.debug("Connect: ", DB_URL);
  if (!db) {
    let client = await MongoClient.connect(
      DB_URL,
      DB_PASS
        ? {
            useNewUrlParser: true,
            authSource: DB_NAME,
            auth: {
              user: DB_USER,
              password: DB_PASS
            }
          }
        : null
    );
    db = client.db(DB_NAME);
  }
  if (!dbInstance) {
    dbInstance = new FaucetDatabase(db);
    try {
      if (
        !(await dbInstance.registerRecordsCol.indexExists([
          "account_name",
          "account_id"
        ]))
      ) {
        await dbInstance.registerRecordsCol.createIndex({
          account_id: 1,
          account_name: 1
        });
      }
    } catch (e) {
      logger.warn("Database has met a error: ", e);
    }
  }
  logger.debug("Database Init Done");
  return dbInstance;
};
