import type { Person } from "@/types/invitation";

const TZ = "Asia/Ho_Chi_Minh";

// "2027-01-17T10:00:00+07:00" -> "10:00" (always Vietnam time, whatever the viewer's timezone).
export const hhmm = (iso: string | null | undefined): string =>
  iso
    ? new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso))
    : "";

// ["Ông Nguyễn Văn A", "Bà Trần Thị B"], skipping missing parents.
export const parentLines = (p: Person): string[] =>
  [p.father && `Ông ${p.father}`, p.mother && `Bà ${p.mother}`].filter(Boolean) as string[];