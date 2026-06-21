import { BadRequestException } from "@nestjs/common";

export function normalizeNepalPhone(phoneNumber: string): string {
  const compact = phoneNumber.replace(/[\s-]/g, "");

  if (/^\+9779[78]\d{8}$/.test(compact)) {
    return compact;
  }

  if (/^9[78]\d{8}$/.test(compact)) {
    return `+977${compact}`;
  }

  throw new BadRequestException("Phone number must be a valid Nepal mobile number");
}
