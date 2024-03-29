import { Types, Cartridge } from "./index.js";
import { MBC1 } from "./mbc1.js";
import { MBC3 } from "./mbc3.js";

export class CartridgeFactory {
  static create(byteArr, gameBoy) {
    let base = new Cartridge(byteArr);
    //Will do more of these later
    switch(base.type) {
      case Types.MBC1:
      case Types.MBC1RAMBATTERY: // Not really, for test ROMs only
        return new MBC1(byteArr);
      case Types.MBC3:
      case Types.MBC3RAM:
      case Types.MBC3RAMBATTERY:
      case Types.MBC3TIMERBATTERY:
      case Types.MBC3TIMERRAMBATTERY:
        return new MBC3(byteArr, gameBoy);
      default:
        return base;
    }
  }
}
