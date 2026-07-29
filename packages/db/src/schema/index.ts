export * from "./brand";
export * from "./content";
export * from "./identity";
export * from "./ops";

import * as brand from "./brand";
import * as content from "./content";
import * as identity from "./identity";
import * as ops from "./ops";

export const schema = {
  ...identity,
  ...brand,
  ...content,
  ...ops,
};
