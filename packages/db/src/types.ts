import type { TransactionSql } from "postgres";

export type TenantCtx = {
  orgId: string;
  userId: string;
};

/** Transaction handle — use tagged template literals: tx\`select …\` */
export type Tx = TransactionSql;
