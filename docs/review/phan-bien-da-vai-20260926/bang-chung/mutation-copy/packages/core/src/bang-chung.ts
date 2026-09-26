import type { Facts } from "./facts.ts";

import type { BangChung, RuleHit } from "./l2/rules.ts";



/**

 * CU-04 — CHỈ MỤC DỮ KIỆN CỦA MỘT LƯỢT KIỂM.

 *

 * ## Vấn đề thẻ này giải

 *

 * `RuleHit.bangChung` khai *"luật này dựa vào tokenAccount X"*. Nhưng một ID trỏ

 * vào hư không thì tệ hơn không có ID: nó mời người đọc đi kiểm rồi để họ gặp 404.

 * Trước CU-04 không có gì kiểm điều đó — `diff.ts` chỉ hỏi *"có luật nào khai khoá

 * này không"*, chứ không hỏi *"khoá này có thật trong Facts không"*.

 *

 * Chỉ mục này dựng từ **chính `Facts` của lượt đang xét**, nên mọi câu trả lời đều

 * thuộc cùng một lượt đo. Thẻ cấm đích danh việc *"gọi lại RPC rồi ghép trace của

 * trạng thái khác vào cảnh báo cũ"*, và cách chắc chắn nhất để không làm điều đó là

 * không có đường nào gọi RPC ở đây — module này **không import `Connection`**.

 *

 * ## Bốn trạng thái, không phải hai

 *

 * Mục 4.2 đòi phân biệt `observed` / `derived` / `missing` / `unsupported`. Gộp

 * `missing` vào `unsupported` là nói với người dùng rằng Custos *không hỗ trợ* thứ

 * mà thật ra nó *không đọc được lần này* — hai câu rất khác nhau khi người ta quyết

 * định có kiểm lại hay không.

 *

 * ## Điều module này KHÔNG làm

 *

 * - Không sinh `level`, không sửa `level`. Nó chỉ trả lời "dữ kiện này có thật

 *   không" và "nó đến từ đâu".

 * - Không dựng cây CPI đầy đủ. `InstructionFact` có `parentIndex` nhưng không có

 *   stack depth, nên suy ra cây nhiều tầng là đoán. Giữ nguyên quan hệ đã đo được.

 * - Không gọi RPC. Bật chẩn đoán **không thêm một lượt RPC nào** — đó là tính chất

 *   đo được, và có bài test đếm.

 */



/** Nguồn của một dữ kiện. Bốn trạng thái, mỗi trạng thái một câu khác nhau. */

export type NguonDuKien =

  /** Đọc thẳng từ RPC trong lượt này. */

  | "observed"

  /** Suy ra từ dữ kiện đã đọc (ví dụ hiệu số trước/sau). */

  | "derived"

  /** Có khái niệm này, nhưng lượt này không đọc được. Kiểm lại có thể ra. */

  | "missing"

  /** Custos chưa hỗ trợ đọc thứ này. Kiểm lại cũng không ra. */

  | "unsupported";



/** Vị trí một lệnh trong giao dịch. Giữ đúng thứ đã đo, không suy diễn thêm. */

export type ViTriLenh = {

  /** Thứ tự trong danh sách lệnh của `Facts`. */

  index: number;

  /** Lệnh lồng (CPI) hay lệnh ngoài cùng. */

  isInner: boolean;

  /** Lệnh cha, nếu là lệnh lồng. `null` với lệnh ngoài cùng. */

  parentIndex: number | null;

};



export type MucDuKien = {

  loai: BangChung["loai"];

  khoa: string;

  nguon: NguonDuKien;

  /** Vì sao `missing`/`unsupported`. Rỗng với `observed`/`derived`. */

  lyDo?: string;

  /** Lệnh liên quan, khi truy được. Rỗng KHÔNG có nghĩa "không có lệnh nào". */

  lenh?: ViTriLenh[];

};



export type ChiMucDuKien = {

  /** Tra một dữ kiện theo `loai:khoa`. */

  tra(loai: BangChung["loai"], khoa: string): MucDuKien | null;

  /** Dữ kiện mà luật khai nhưng KHÔNG có trong Facts. Rỗng là điều kiện đúng. */

  treoLo(hits: RuleHit[]): Array<{ ruleId: number; loai: string; khoa: string }>;

  /** Số mục đang giữ — để bài test đếm được, không phải để hiển thị. */

  readonly soMuc: number;

};



/** Khoá nội bộ. Hai loại khác nhau không được đụng nhau dù trùng chuỗi. */

const khoaCua = (loai: string, khoa: string) => `${loai}\u0000${khoa}`;



/**

 * Dựng chỉ mục từ `Facts` của chính lượt đang xét.

 *

 * Không nhận `Connection`, không `await` gì — nên không có đường nào lẫn dữ liệu

 * của một lượt đo khác vào đây.

 */

export function dungChiMuc(facts: Facts): ChiMucDuKien {

  const map = new Map<string, MucDuKien>();



  /** Lệnh chạm tới một địa chỉ, theo đúng thứ `Facts` đã ghi. */

  const lenhCham = (dc: string): ViTriLenh[] =>

    facts.instructions

      .filter((ix) => ix.programId === dc)

      .map((ix) => ({ index: ix.index, isInner: ix.isInner, parentIndex: ix.parentIndex }));



  const them = (m: MucDuKien) => {

    const k = khoaCua(m.loai, m.khoa);

    // Không ghi đè: mục đầu tiên thắng. Hai nguồn cùng khai một khoá là dấu hiệu

    // dữ liệu lẫn nhau, và im lặng ghi đè sẽ giấu điều đó.

    if (!map.has(k)) map.set(k, m);

  };



  for (const t of facts.tokenAccounts) {

    /*

     * `observed` khi đọc được CẢ HAI phía; `missing` khi chỉ có một phía.

     *

     * Một tài khoản có `ownerBefore` mà không có `ownerAfter` không phải "không

     * đổi chủ" — nó là "không đo được trạng thái sau". Gộp hai câu đó là đúng lỗi

     * mà fail-safe 4 của `evaluate.ts` sinh ra để chặn.

     */

    const duHaiPhia = t.ownerBefore !== null && t.ownerAfter !== null;

    them({

      loai: "tokenAccount",

      khoa: t.address,

      nguon: duHaiPhia ? "observed" : "missing",

      ...(duHaiPhia ? {} : { lyDo: "không đọc được trạng thái sau của tài khoản này" }),

      lenh: lenhCham(t.address),

    });

  }



  for (const m of facts.mints) {

    them({ loai: "mint", khoa: m.address, nguon: "observed", lenh: lenhCham(m.address) });

  }



  for (const a of facts.accounts) {

    /*

     * `AccountFact` dùng `programOwnerBefore/After` — chương trình SỞ HỮU account,

     * khác hẳn `ownerBefore/After` của tài khoản token (ví người dùng).

     *

     * Hai khái niệm này mang tên gần giống nhau và gộp nhầm là một lỗi thật: mục

     * 4.2 nhắc đích danh *"phân biệt ví owner với program owner"*.

     */

    const duHaiPhia = a.programOwnerBefore !== null && a.programOwnerAfter !== null;

    them({

      loai: "account",

      khoa: a.address,

      nguon: duHaiPhia ? "observed" : "missing",

      ...(duHaiPhia ? {} : { lyDo: "không đọc được program owner sau của account này" }),

      lenh: lenhCham(a.address),

    });

  }



  for (const ix of facts.instructions) {

    if (!ix.programId) continue;

    them({

      loai: "program",

      khoa: ix.programId,

      // Chương trình là thứ đọc từ message, luôn quan sát được — nhưng việc ĐỌC HIỂU

      // nó thì không. `decoded === null` là `unsupported`: kiểm lại cũng không ra.

      nguon: ix.decoded === null ? "unsupported" : "observed",

      ...(ix.decoded === null ? { lyDo: "chưa có decoder cho chương trình này" } : {}),

      lenh: lenhCham(ix.programId),

    });

  }



  for (const t of facts.lookupTables) {

    them({

      loai: "lookupTable",

      khoa: t.address,

      nguon: t.resolved ? "observed" : "missing",

      ...(t.resolved ? {} : { lyDo: "không giải được bảng tra cứu — danh sách account có thể thiếu" }),

    });

  }



  /*

   * SOL của người được bảo vệ mang khoá rỗng theo đúng giao kèo `BangChung`.

   *

   * `derived` chứ không `observed`: nó là hiệu của lamports trước và sau, không

   * phải một trường RPC trả thẳng. Gọi nó `observed` là nói quá về nguồn.

   */

  them({

    loai: "solNguoiDung",

    khoa: "",

    nguon: facts.simulationOk ? "derived" : "missing",

    ...(facts.simulationOk ? {} : { lyDo: "mô phỏng không chạy được nên không có trạng thái sau" }),

  });



  return {

    tra: (loai, khoa) => map.get(khoaCua(loai, khoa)) ?? null,

    treoLo(hits) {

      const ra: Array<{ ruleId: number; loai: string; khoa: string }> = [];

      for (const h of hits) {

        for (const b of h.bangChung ?? []) {

          if (!map.has(khoaCua(b.loai, b.khoa))) {

            ra.push({ ruleId: h.ruleId, loai: b.loai, khoa: b.khoa });

          }

        }

      }

      return ra;

    },

    get soMuc() {

      return map.size;

    },

  };

}

