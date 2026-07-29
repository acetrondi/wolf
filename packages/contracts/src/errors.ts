export type AppError =
  | { kind: "forbidden"; action: string }
  | { kind: "not_found"; resource: string }
  | { kind: "validation"; message: string }
  | { kind: "conflict"; message: string };
