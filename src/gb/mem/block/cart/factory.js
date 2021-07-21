import { Types, Cartridge } from "./index";
import { MBC1 } from "./mbc1";
import { MBC3 } from "./mbc3";

export class CartridgeFactory {
  static create(byteArr) {
    let base = new Cartridge(byteArr);
    //Will do more of these later
    switch(base.type) {
      case Types.MBC1:
        return new MBC1(byteArr);
      case Types.MBC3:
      case Types.MBC3RAM:
      case Types.MBC3RAMBATTERY:
      case Types.MBC3TIMERBATTERY:
      case Types.MBC3TIMERRAMBATTERY:
        return new MBC3(byteArr);
      default:
        return base;
    }
  }
}
