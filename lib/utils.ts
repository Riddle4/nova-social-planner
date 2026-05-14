import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseTags(value: FormDataEntryValue | null) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function toNullableString(value: FormDataEntryValue | null) {
  const text = value ? String(value).trim() : "";
  return text.length ? text : null;
}

export function toNullableDate(value: FormDataEntryValue | null) {
  const text = value ? String(value).trim() : "";
  return text ? new Date(text) : null;
}
