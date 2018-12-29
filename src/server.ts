import * as helmet from "helmet";
import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";

import { getLogger } from "./utils";
import { CybexDaemon, KEY_MODE } from "./cybex/cybex-daemon";
import { Config } from "./config";

const logger = getLogger("Server");

//
import { COMMON_ERRORS } from "./lib/models/error";
import { getDbInstance } from "./lib/database";
import { EVENT_ON_NEW_HISTORY } from "./cybex/constants";
import { filterHistoryByOp } from "./cybex/utils";
import { ChainTypes } from "cybexjs";
import { registerRouter } from "./routes/register";

async function main(config: Config) {
  let server = express();
  // Setup DB
  let db = await getDbInstance(config);

  // Setup CybexService
  let { FAUCET_ACCOUNT, FAUCET_ACCOUNT_WIF, NODE_API } = config;
  let cybex = new CybexDaemon(
    NODE_API,
    FAUCET_ACCOUNT,
    FAUCET_ACCOUNT_WIF,
    KEY_MODE.WIF
  );
  await cybex.init();

  cybex.addListener(EVENT_ON_NEW_HISTORY, history => {
    logger.debug("[Listener]", history.length);
    let his = filterHistoryByOp(history, ChainTypes.operations.account_create);
    his.forEach(async entry => {
      logger.debug("[Handle History Entry]", entry.id);
      let account_id = entry.result[1];
      await db.markConfirm(account_id);
    });
  });

  logger.info("Cybex Inited");
  server.use(helmet());
  //Allow CORS
  const corsOptions = {
    origin(origin: any, callback: any) {
      callback(null, true);
    },
    credentials: true
  };
  server.use(cors(corsOptions));
  server.use(bodyParser.json());
  server.use("/register", registerRouter({ config, cybex, db }));

  server.listen(config.PORT, () =>
    logger.info("Cybex faucet is listening on the port " + config.PORT)
  );
}

main(new Config(process.env));
