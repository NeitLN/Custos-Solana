import { VERIFIED_PROGRAMS } from "../constants.ts";
import type { InstructionFact } from "../facts.ts";

/**
 * `total`    = TẤT CẢ instruction, kể cả inner (CPI).
 * `analyzed` = instruction có program đã xác minh VÀ decode được.
 * `unverifiedPrograms` = số program ID KHÁC NHAU ngoài danh sách xác minh.
 *
 * Đếm cả inner instruction là có chủ đích: hành vi độc hại thường nằm trong CPI.
 * Xem DAC-TA-CORE.md mục 2.4.
 */
export function computeCoverage(instructions: InstructionFact[]) {
  const unverified = new Set<string>();
  let analyzed = 0;
  for (const ix of instructions) {
    const known = VERIFIED_PROGRAMS.has(ix.programId);
    if (!known) unverified.add(ix.programId);
    if (known && ix.decoded !== null) analyzed++;
  }
  return { analyzed, total: instructions.length, unverifiedPrograms: unverified.size };
}
