export class IPAddress {
  static IPOrigin = {
    CloudFlare: "CloudFlare",
    Other: "Other"
  };

  timeStamp: Date;

  constructor(
    public address: string,
    public type: string = IPAddress.IPOrigin.CloudFlare
  ) {
    this.timeStamp = new Date();
  }
  toString() {
    return `${this.type}:${this.address}:${this.timeStamp.toISOString()};`;
  }
}
