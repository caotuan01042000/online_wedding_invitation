export interface Person {
  short_name: string;
  full_name: string;
  rank: string;
  father: string;
  mother: string;
  address: string;
}

export interface InvitationMedia {
  cover_url: string | null;
  hero_url: string | null;
  groom_url: string | null;
  bride_url: string | null;
  background_url: string | null;
  music_url: string | null;
  photos: { id: string; url: string }[];
}

export interface InvitationData {
  id: string;
  slug: string;
  title: string;
  template: { code: string };
  theme: Record<string, string>;
  sections: Record<string, boolean>;
  couple: { groom: Person; bride: Person };
  event: {
    ceremony_at: string;
    ceremony_place: string;
    party_at: string | null;
    venue_name: string;
    venue_address: string;
    map_url: string;
    lunar_text: string;
    dress_code: string;
    dress_colors: string[];
    closing_message: string;
  };
  schedule: { time: string; title: string }[];
  gifts: { side: "groom" | "bride"; bank: string; account_no: string; account_name: string; qr_url: string | null }[];
  media: InvitationMedia;
  wishes: { id: string; guest_name: string; message: string; created_at: string }[];
}

// Every template component receives exactly this.
export interface TemplateProps {
  data: InvitationData;
  preview?: boolean; // true in admin preview
}