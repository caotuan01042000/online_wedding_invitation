import type { InvitationData, Person } from "@/types/invitation";
import { hhmm, parentLines } from "../../format";

export function toDragonW(d: InvitationData) {
  const e = d.event;
  const partyTime = hhmm(e.party_at ?? e.ceremony_at);
  const side = (p: Person) => ({
    short: p.short_name,
    full: p.full_name,
    parents: parentLines(p),
    addr: p.address,
  });
  return {
    groom: side(d.couple.groom),
    bride: side(d.couple.bride),
    date: e.ceremony_at,
    ceremonyPlace: e.ceremony_place,
    ceremonyTime: hhmm(e.ceremony_at),
    partyTime,
    guestTime: d.schedule[0]?.time ?? partyTime,
    venue: e.venue_name,
    address: e.venue_address,
    dress: e.dress_code,
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