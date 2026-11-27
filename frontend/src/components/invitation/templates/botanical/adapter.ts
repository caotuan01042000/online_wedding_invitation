import type { InvitationData, Person } from "@/types/invitation";
import { hhmm } from "../../format";

export function toBotanicalW(d: InvitationData) {
  const e = d.event;
  const partyTime = hhmm(e.party_at ?? e.ceremony_at);
  const side = (p: Person) => ({
    short: p.short_name,
    full: p.full_name,
    rank: p.rank,
    parents: [p.father, p.mother].filter(Boolean) as string[],
    addr: p.address,
  });
  const guest = d.schedule.find((s) => /đón khách/i.test(s.title)) ?? d.schedule[0];
  return {
    groom: side(d.couple.groom),
    bride: side(d.couple.bride),
    date: e.ceremony_at,
    lunar: e.lunar_text,
    ceremonyPlace: e.ceremony_place,
    ceremonyTime: hhmm(e.ceremony_at),
    partyTime,
    guestTime: guest?.time ?? partyTime,
    venue: e.venue_name,
    address: e.venue_address,
    mapUrl: e.map_url,
    dress: e.dress_code,
    dressColors: e.dress_colors,
    closing: e.closing_message,
    schedule: d.schedule.map((s) => ({ t: s.time, n: s.title })),
    gifts: d.gifts.map((g) => ({
      who: g.side === "groom" ? "Chú rể" : "Cô dâu",
      bank: g.bank,
      no: g.account_no,
      name: g.account_name,
      qr: g.qr_url ?? "",
    })),
  };
}