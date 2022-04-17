export function isLittleEndian() {
let uInt32 = new Uint16Array([0x1122]);
  let uInt8 = new Uint8Array(uInt32.buffer);
  return uInt8[0] === 0x22;
};
