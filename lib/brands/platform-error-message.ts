import type { AppError } from "@wolf/contracts";

export function platformRulesErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "validation":
    case "conflict":
      return error.message;
    case "forbidden":
      return "You don't have permission to edit this brand.";
    case "not_found":
      return "Wolf couldn't find this brand or platform. Refresh and try again.";
  }
}
