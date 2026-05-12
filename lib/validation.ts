import { EntryInput } from "@/types";

export interface ValidationError {
  field: string;
  message: string;
}

export function validateEntries(entries: EntryInput[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!entries || entries.length === 0) {
    errors.push({ field: "entries", message: "Mindst én dato er påkrævet" });
    return errors;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const seen = new Set<string>();

  entries.forEach((e, i) => {
    if (!e.date || !dateRegex.test(e.date)) {
      errors.push({ field: `entries.${i}.date`, message: `Ugyldig dato på linje ${i + 1}` });
      return;
    }

    const d = new Date(e.date);
    if (isNaN(d.getTime())) {
      errors.push({ field: `entries.${i}.date`, message: `Dato ikke gyldig på linje ${i + 1}` });
      return;
    }

    const year = d.getFullYear();
    if (year < 2020 || year > 2100) {
      errors.push({ field: `entries.${i}.date`, message: `Årstal udenfor gyldig rækkevidde på linje ${i + 1}` });
    }

    const key = `${e.date}__${e.type}`;
    if (seen.has(key)) {
      errors.push({ field: `entries.${i}.date`, message: `Dubleret dato+type: ${e.date}` });
    }
    seen.add(key);

    if (!["FULL_DAY", "HALF_DAY_AM", "HALF_DAY_PM"].includes(e.type)) {
      errors.push({ field: `entries.${i}.type`, message: `Ugyldig type på linje ${i + 1}` });
    }
  });

  return errors;
}

export function validateNote(note: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (note && note.length > 500) {
    errors.push({ field: "note", message: "Note må højst være 500 tegn" });
  }
  return errors;
}

export function validateCreateRequest(input: {
  entries: EntryInput[];
  note?: string;
}): ValidationError[] {
  return [
    ...validateEntries(input.entries),
    ...validateNote(input.note ?? ""),
  ];
}
