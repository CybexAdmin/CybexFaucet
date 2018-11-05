export class ErrorRes {
  constructor(public code: number, private error: string){}
}

export const COMMON_ERRORS = {
  "OUT_OF_MONEY": new ErrorRes(507, "Faucet is not availiable for temporary"),
  "ICCORECT_VERIFY_CODE": new ErrorRes(403, "Incorrect verify code"),
  "NOT_EXIST": new ErrorRes(404, "No such user registered by faucet"),
  "NOT_VALID_ORIGIN": new ErrorRes(400, "Origin is not valid"),
  "IP_RESTRICT": new ErrorRes(429, "Only one account should be registered from a single IP, within 5 mins")
}