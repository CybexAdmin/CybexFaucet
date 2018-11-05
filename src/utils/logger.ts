import { getLogger as genLogger, configure } from "log4js";
const isProd = process.env.NODE_ENV === "production";
configure({
  appenders: {
    out: { type: "console" }
  },
  categories: {
    default: {
      appenders: ["out"],
      level: "all"
    }
  },
  pm2: true
});

export function getLogger(name: string) {
  let logger = genLogger(name);
  logger.level = isProd ? "info" : "all";
  return logger;
}

export default getLogger;
