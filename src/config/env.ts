export class Config {
  IS_PROD;
  DB_CONNECTION;
  DB_NAME;
  PORT;
  DB_URL;
  DB_USER;
  DB_PASS;
  NODE_API;
  FAUCET_ACCOUNT;
  FAUCET_ACCOUNT_WIF;

  constructor(config) {
    let { DB_USER, DB_PASS, DB_URL, DB_NAME, NODE_ENV, PORT, account, api, wif } = config;
    this.IS_PROD = NODE_ENV == "production";
    const DB_CONNECTION = `mongodb://${DB_USER ? DB_USER + ":" : ""}${
      DB_PASS ? DB_PASS + "@" : ""
    }@${DB_URL}/${DB_NAME}?readPreference=secondaryPreferred&slaveOk=true`;
    this.DB_CONNECTION = DB_CONNECTION;
    this.DB_NAME = DB_NAME;
    this.DB_URL = DB_URL,
    this.DB_USER = DB_USER,
    this.DB_PASS = DB_PASS,
    this.FAUCET_ACCOUNT = account;
    this.NODE_API = api;
    this.FAUCET_ACCOUNT_WIF = wif;
    this.PORT = PORT || 3050;
    console.log("[Env Vars]");
    console.log(this);
  }
}
