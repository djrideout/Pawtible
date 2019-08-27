export class MemoryMap {
  constructor(onSet = (addr, val) => {}) {
    let temp_ = [];
    return new Proxy(this, {
      get(target, name) {
        return temp_[name];
      },
      set(target, name, value) {
        let val = value & 0xFF;
        temp_[name] = val;
        onSet(name, val);
        return true;
      }
    });
  }
}
