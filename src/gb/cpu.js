export const Registers = {
  A: "regA",
  F: "regF",
  AF: "regA_regF",
  B: "regB",
  C: "regC",
  BC: "regB_regC",
  D: "regD",
  E: "regE",
  DE: "regD_regE",
  H: "regH",
  L: "regL",
  HL: "regH_regL",
  SP: "regSP",
  PC: "regPC"
};

export const Flags = {
  Z: "Z",
  N: "N",
  H: "H",
  C: "C"
};

export class CPU {
  constructor(gameBoy) {
    this.gameBoy_ = gameBoy;
    this[Registers.A] = 0x01;
    this[Registers.F] = 0x02;
    this[Registers.B] = 0x03;
    this[Registers.C] = 0x04;
    this[Registers.D] = 0x05;
    this[Registers.E] = 0x06;
    this[Registers.H] = 0x07;
    this[Registers.L] = 0x08;
    this[Registers.SP] = 0x1234;
    this[Registers.PC] = 0x1234;
  }

  get GB() {
    return this.gameBoy_;
  }

  runFrame() {
    this.runInst();
  }

  runInst() {
    switch(this.GB.M.get(this.PC)) {
      case 0x00:
        
      default:
        throw Error(`Unimplemented instruction 0x${this.GB.M.get(this.PC).toString(16).toUpperCase().padStart(2, "0")}`);
    }
  }

  get(register) {
    switch(register) {
      case Registers.A:
      case Registers.F:
      case Registers.B:
      case Registers.C:
      case Registers.D:
      case Registers.E:
      case Registers.H:
      case Registers.L:
      case Registers.SP:
      case Registers.PC:
        return this[register];
      case Registers.AF:
      case Registers.BC:
      case Registers.DE:
      case Registers.HL:
        let split = register.split("_");
        return (this[split[0]] << 8) + this[split[1]];
    }
  }

  set(register, val) {
    switch(register) {
      case Registers.A:
      case Registers.F:
      case Registers.B:
      case Registers.C:
      case Registers.D:
      case Registers.E:
      case Registers.H:
      case Registers.L:
        this[register] = val & 0xFF;
        break;
      case Registers.AF:
      case Registers.BC:
      case Registers.DE:
      case Registers.HL:
        let split = register.split("_");
        this[split[0]] = (val >> 8) & 0xFF;
        this[split[1]] = val & 0xFF;
        break;
      case Registers.SP:
      case Registers.PC:
        this[register] = val & 0xFFFF;
        break;
    }
  }

  get A() {
    return this.get(Registers.A);
  }

  set A(val) {
    this.set(Registers.A, val);
  }

  get F() {
    return this.get(Registers.F);
  }

  set F(val) {
    this.set(Registers.F, val);
  }

  get AF() {
    return this.get(Registers.AF);
  }

  set AF(val) {
    this.set(Registers.AF, val);
  }

  get B() {
    return this.get(Registers.B);
  }

  set B(val) {
    this.set(Registers.B, val);
  }

  get C() {
    return this.get(Registers.C);
  }

  set C(val) {
    this.set(Registers.C, val);
  }

  get BC() {
    return this.get(Registers.BC);
  }

  set BC(val) {
    this.set(Registers.BC, val);
  }

  get D() {
    return this.get(Registers.D);
  }

  set D(val) {
    this.set(Registers.D, val);
  }

  get E() {
    return this.get(Registers.E);
  }

  set E(val) {
    this.set(Registers.E, val);
  }

  get DE() {
    return this.get(Registers.DE);
  }

  set DE(val) {
    this.set(Registers.DE, val);
  }

  get H() {
    return this.get(Registers.H);
  }

  set H(val) {
    this.set(Registers.H, val);
  }

  get L() {
    return this.get(Registers.L);
  }

  set L(val) {
    this.set(Registers.L, val);
  }

  get HL() {
    return this.get(Registers.HL);
  }

  set HL(val) {
    this.set(Registers.HL, val);
  }

  get SP() {
    return this.get(Registers.SP);
  }

  set SP(val) {
    this.set(Registers.SP, val);
  }

  get PC() {
    return this.get(Registers.PC);
  }

  set PC(val) {
    this.set(Registers.PC, val);
  }

  get FlagZ() {
    return !!(this.F & 0x80);
  }

  set FlagZ(bool) {
    bool ? this.F |= 0x80 : this.F &= ~0x80;
  }

  get FlagN() {
    return !!(this.F & 0x40);
  }

  set FlagN(bool) {
    bool ? this.F |= 0x40 : this.F &= ~0x40;
  }

  get FlagH() {
    return !!(this.F & 0x20);
  }

  set FlagH(bool) {
    bool ? this.F |= 0x20 : this.F &= ~0x20;
  }

  get FlagC() {
    return !!(this.F & 0x10);
  }

  set FlagC(bool) {
    bool ? this.F |= 0x10 : this.F &= ~0x10;
  }
}

export function get_flags_updated(register, oldVal, newVal) {
  if(register === Registers.F || register === Registers.AF) {
    return {
      [Flags.Z]: !!((oldVal & 0x80) ^ (newVal & 0x80)),
      [Flags.N]: !!((oldVal & 0x40) ^ (newVal & 0x40)),
      [Flags.H]: !!((oldVal & 0x20) ^ (newVal & 0x20)),
      [Flags.C]: !!((oldVal & 0x10) ^ (newVal & 0x10))
    };
  } else {
    return {
      [Flags.Z]: false,
      [Flags.N]: false,
      [Flags.H]: false,
      [Flags.C]: false
    };
  }
}
