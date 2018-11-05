import { Router } from "express";
import { RouteContext } from "./../lib/models/router-context";
import { getLogger } from "./../utils/logger";
import assert = require("assert");
import { COMMON_ERRORS } from "../lib/models/error";

const logger = getLogger("Query Records");

export const registerRouter: (context: RouteContext) => Router = ({
  db,
  cybex
}) => {
  const registerRouter = Router();

  registerRouter.post("/", async (req, res) => {
    logger.info("[Register Request]", req.body);
    if (!req.body.account) {
      logger.warn("[Register Request without Account]", req.body.account);
      return;
    }
    assert(
      /[0-9-]/.test(req.body.account.name) ||
        !/[aeiouy]/.test(req.body.account.name),
      "Only cheap name"
    );
    cybex
      .createAccount(req.body.account)
      .then(resOfReg => {
        logger.info("[Faucet Text]", resOfReg);
        res.send({
          account: resOfReg[0]
        });
        db.insertNewAccount({
          ip: req["clientAddress"],
          account_name: resOfReg[0].trx.operations[0][1].name,
          account_id: resOfReg[0].trx.operation_results[0][1],
          trx: resOfReg[0],
          is_wookong_done: 0
        });
      })
      .catch(err => {
        logger.error("[Faucet Error]", err);
        res
          .status(COMMON_ERRORS.OUT_OF_MONEY.code)
          .send(COMMON_ERRORS.OUT_OF_MONEY);
      });
  });

  registerRouter.get("/status", async (req, res) => {
    let { name, id } = req.query;
    let user = await db.isRegisterConfirmed(id, name);
    logger.debug("User to find: ", name, id, user);
    if (!user) {
      res.status(COMMON_ERRORS.NOT_EXIST.code).send(COMMON_ERRORS.NOT_EXIST);
    } else {
      res.send({
        code: 0,
        account: user.trx,
        libConfirmed: user.libConfirmed
      });
    }
  });

  return registerRouter;
};
