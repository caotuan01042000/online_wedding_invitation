import type { InvitationData } from "@/types/invitation";

// Demo data so /  and /template keep working as "try this template" pages.
export const sampleData: InvitationData = {
  id: "sample",
  slug: "sample",
  title: "Đám cưới Minh Tuấn & Ngọc Anh",
  template: { code: "rose" },
  theme: {},
  sections: {},
  couple: {
    groom: { short_name: "Minh Tuấn", full_name: "Nguyễn Minh Tuấn", rank: "Trưởng nam", father: "Nguyễn Văn A", mother: "Trần Thị B", address: "Biên Hòa, Đồng Nai" },
    bride: { short_name: "Ngọc Anh", full_name: "Lê Ngọc Anh", rank: "Út nữ", father: "Lê Văn C", mother: "Phạm Thị D", address: "Quận 1, TP. Hồ Chí Minh" },
  },
  event: {
    ceremony_at: "2027-01-17T10:00:00+07:00",
    ceremony_place: "Lễ thành hôn được cử hành tại tư gia",
    party_at: "2027-01-17T11:30:00+07:00",
    venue_name: "Nhà hàng tiệc cưới Hoa Mẫu Đơn",
    venue_address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    map_url: "",
    lunar_text: "Tức ngày 9 tháng 12 năm Bính Ngọ",
    dress_code: "Tông hồng phấn, trắng hoặc kem",
    dress_colors: [],
    closing_message: "",
  },
  schedule: [
    { time: "11:00", title: "Đón khách" },
    { time: "11:30", title: "Khai tiệc" },
    { time: "11:45", title: "Rót rượu, cắt bánh" },
    { time: "12:00", title: "Phục vụ món chính" },
    { time: "14:00", title: "Kết thúc tiệc" },
  ],
  gifts: [
    { side: "groom", bank: "Vietcombank", account_no: "0123456789", account_name: "NGUYEN MINH TUAN", qr_url: null },
    { side: "bride", bank: "Techcombank", account_no: "9876543210", account_name: "LE NGOC ANH", qr_url: null },
  ],
  media: { cover_url: null, hero_url: null, music_url: null, photos: [] },
  wishes: [],
};