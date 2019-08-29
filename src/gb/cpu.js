export const Registers = {
  A: "A",
  F: "F",
  AF: "AF",
  B: "B",
  C: "C",
  BC: "BC",
  D: "D",
  E: "E",
  DE: "DE",
  H: "H",
  L: "L",
  HL: "HL",
  SP: "SP",
  PC: "PC"
};

export const Flags = {
  Z: "Z",
  N: "N",
  H: "H",
  C: "C"
};

export class CPU {
  constructor() {
    this.setHooks_ = [];

    //registers
    this.a_ = 0x01;
    this.f_ = 0x02;
    this.b_ = 0x03;
    this.c_ = 0x04;
    this.d_ = 0x05;
    this.e_ = 0x06;
    this.h_ = 0x07;
    this.l_ = 0x08;
    this.sp_ = 0x1234;
    this.pc_ = 0x1234;
  }

  addSetHook(callback) {
    this.setHooks_.push(callback);
  }

  callSetHooks(register, val, flags = get_flags_updated()) {
    for(let i = 0; i < this.setHooks_.length; i++) {
      this.setHooks_[i](register, val, flags);
    }
  }

  get A() {
    return this.a_;
  }

  set A(val) {
    this.a_ = val & 0xFF;
    this.callSetHooks(Registers.A, this.A);
  }

  get F() {
    return this.f_;
  }

  set F(val) {
    let og = this.f_;
    this.f_ = val & 0xFF
    this.callSetHooks(Registers.F, this.F, get_flags_updated(og, this.f_));
  }

  get AF() {
    return (this.A << 8) + this.F;
  }

  set AF(val) {
    this.A = val >> 8;
    let og = this.F;
    this.F = val;
    this.callSetHooks(Registers.AF, this.AF, get_flags_updated(og, this.F));
  }

  get B() {
    return this.b_;
  }

  set B(val) {
    this.b_ = val & 0xFF;
    this.callSetHooks(Registers.B, this.B);
  }

  get C() {
    return this.c_;
  }

  set C(val) {
    this.c_ = val & 0xFF;
    this.callSetHooks(Registers.C, this.C);
  }

  get BC() {
    return (this.B << 8) + this.C;
  }

  set BC(val) {
    this.B = val >> 8;
    this.C = val;
    this.callSetHooks(Registers.BC, this.BC);
  }

  get D() {
    return this.d_;
  }

  set D(val) {
    this.d_ = val & 0xFF;
    this.callSetHooks(Registers.D, this.D);
  }

  get E() {
    return this.e_;
  }

  set E(val) {
    this.e_ = val & 0xFF;
    this.callSetHooks(Registers.E, this.E);
  }

  get DE() {
    return (this.D << 8) + this.E;
  }

  set DE(val) {
    this.D = val >> 8;
    this.E = val;
    this.callSetHooks(Registers.DE, this.DE);
  }

  get H() {
    return this.h_;
  }

  set H(val) {
    this.h_ = val & 0xFF;
    this.callSetHooks(Registers.H, this.H);
  }

  get L() {
    return this.l_;
  }

  set L(val) {
    this.l_ = val & 0xFF;
    this.callSetHooks(Registers.L, this.L);
  }

  get HL() {
    return (this.H << 8) + this.L;
  }

  set HL(val) {
    this.H = val >> 8;
    this.L = val;
    this.callSetHooks(Registers.HL, this.HL);
  }

  get SP() {
    return this.sp_;
  }

  set SP(val) {
    this.sp_ = val & 0xFFFF;
    this.callSetHooks(Registers.SP, this.SP);
  }

  get PC() {
    return this.pc_;
  }

  set PC(val) {
    this.pc_ = val & 0xFFFF;
    this.callSetHooks(Registers.PC, this.PC);
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

function get_flags_updated(oldF = 0x00, newF = 0x00) {
  return {
    [Flags.Z]: !!((oldF & 0x80) ^ (newF & 0x80)),
    [Flags.N]: !!((oldF & 0x40) ^ (newF & 0x40)),
    [Flags.H]: !!((oldF & 0x20) ^ (newF & 0x20)),
    [Flags.C]: !!((oldF & 0x10) ^ (newF & 0x10))
  };
}
