import { FaucetDatabase } from "./../database";
import { CybexDaemon } from "./../../cybex/cybex-daemon";
import { Config } from "./../../config/";

export class RouteContext {
  db?: FaucetDatabase;
  cybex?: CybexDaemon;
  config: Config;
}
