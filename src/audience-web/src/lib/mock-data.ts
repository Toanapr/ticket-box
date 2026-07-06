import type { ConcertDetail } from "./types";

const saleStartsAt = "2026-06-01T00:00:00+07:00";
const saleEndsAt = "2026-12-31T23:59:59+07:00";

export const mockConcerts: ConcertDetail[] = [
  {
    id: "say-hi-2026",
    slug: "say-hi-2026",
    title: "Anh Trai Say Hi - Concert 2026",
    artists: ["HIEUTHUHAI", "RHYDER", "Quang Hung MasterD", "Negav", "ISAAC", "HURRYKNG"],
    venue: "Sân vận động Quốc gia Mỹ Đình, Hà Nội",
    startsAt: "2026-10-15T19:00:00+07:00",
    status: "selling",
    description:
      "Concert Anh Trai Say Hi 2026 quay trở lại với quy mô sân vận động, dàn nghệ sĩ trẻ và hệ thống âm thanh ánh sáng đầu tư cho đêm diễn lớn.",
    artistBio:
      "Dan nghe si tre trung voi nhieu manh ghep noi bat, mang den mot dem dien san van dong nang luong cao.",
    posterPath: "/concert-posters/say-hi-poster.png",
    seatingMapVersion: "mock-map-v1",
    ticketTypes: [
      { id: "say-hi-svip", slug: "svip-president", zone: "svip", name: "SVIP President", price: 4500000, maxPerUser: 2, availableApprox: 18, capacity: 100, saleStartsAt, saleEndsAt },
      { id: "say-hi-vip", slug: "vip-a-b", zone: "vip", name: "VIP A/B", price: 2800000, maxPerUser: 4, availableApprox: 45, capacity: 200, saleStartsAt, saleEndsAt },
      { id: "say-hi-cat1", slug: "cat-1-zone", zone: "cat1", name: "CAT 1 Zone", price: 1800000, maxPerUser: 4, availableApprox: 120, capacity: 300, saleStartsAt, saleEndsAt },
      { id: "say-hi-cat2", slug: "cat-2-upper", zone: "cat2", name: "CAT 2 Upper", price: 1200000, maxPerUser: 4, availableApprox: 9, capacity: 150, saleStartsAt, saleEndsAt },
      { id: "say-hi-ga", slug: "general-admission", zone: "ga", name: "General Admission", price: 800000, maxPerUser: 4, availableApprox: 450, capacity: 1000, saleStartsAt, saleEndsAt },
    ],
  },
  {
    id: "chong-gai-2",
    slug: "chong-gai-2",
    title: "Anh Trai Vượt Ngàn Chông Gai - Concert 2",
    artists: ["Soobin Hoàng Sơn", "Bằng Kiều", "Tự Long", "Cường Seven", "Kay Trần", "Jun Phạm"],
    venue: "Sân vận động Quân khu 7, TP. Hồ Chí Minh",
    startsAt: "2026-11-20T19:30:00+07:00",
    status: "upcoming",
    description:
      "Đại nhạc hội của các Anh Tài với bản phối mới, sân khấu năng lượng cao và cảm xúc tự hào cho khán giả.",
    artistBio:
      "Su hop tac cua nhieu giong ca va nghe si gao coi, duoc lam moi cho mot dem concert quy mo lon.",
    posterPath: "/concert-posters/chong-gai-poster.png",
    seatingMapVersion: "mock-map-v1",
    ticketTypes: [
      { id: "chong-gai-svip", slug: "svip-lounge", zone: "svip", name: "SVIP Lounge", price: 5000000, maxPerUser: 2, availableApprox: 50, capacity: 50, saleStartsAt: "2026-08-01T00:00:00+07:00", saleEndsAt },
      { id: "chong-gai-vip", slug: "vip-stage-front", zone: "vip", name: "VIP Stage Front", price: 3000000, maxPerUser: 4, availableApprox: 150, capacity: 150, saleStartsAt: "2026-08-01T00:00:00+07:00", saleEndsAt },
      { id: "chong-gai-cat1", slug: "cat-1-lower-stand", zone: "cat1", name: "CAT 1 Lower Stand", price: 2000000, maxPerUser: 4, availableApprox: 250, capacity: 250, saleStartsAt: "2026-08-01T00:00:00+07:00", saleEndsAt },
      { id: "chong-gai-cat2", slug: "cat-2-upper-stand", zone: "cat2", name: "CAT 2 Upper Stand", price: 1500000, maxPerUser: 4, availableApprox: 300, capacity: 300, saleStartsAt: "2026-08-01T00:00:00+07:00", saleEndsAt },
      { id: "chong-gai-ga", slug: "ga-standing-pit", zone: "ga", name: "GA Standing Pit", price: 900000, maxPerUser: 4, availableApprox: 800, capacity: 800, saleStartsAt: "2026-08-01T00:00:00+07:00", saleEndsAt },
    ],
  },
  {
    id: "chi-dep-2026",
    slug: "chi-dep-2026",
    title: "Chị Đẹp Đạp Gió Rẽ Sóng 2026",
    artists: ["Tóc Tiên", "Minh Hằng", "Thiều Bảo Trâm", "Ngọc Thanh Tâm", "Đồng Ánh Quỳnh"],
    venue: "Nhà thi đấu Phú Thọ, TP. Hồ Chí Minh",
    startsAt: "2026-12-05T18:30:00+07:00",
    status: "selling",
    description:
      "Đêm concert tôn vinh năng lượng của các Chị Đẹp, kết hợp vũ đạo, band live và sân khấu lấy cảm hứng từ đại dương.",
    artistBio:
      "Nhung nghe si nu voi mau sac hien dai, ket hop trinh dien, vu dao va ban live trong khong gian cam hung.",
    posterPath: "/concert-posters/chi-dep-poster.png",
    seatingMapVersion: "mock-map-v1",
    ticketTypes: [
      { id: "chi-dep-svip", slug: "lamour-svip", zone: "svip", name: "L'Amour SVIP", price: 4200000, maxPerUser: 2, availableApprox: 5, capacity: 80, saleStartsAt, saleEndsAt },
      { id: "chi-dep-vip", slug: "vip-ocean", zone: "vip", name: "VIP Ocean", price: 2600000, maxPerUser: 4, availableApprox: 28, capacity: 150, saleStartsAt, saleEndsAt },
      { id: "chi-dep-cat1", slug: "cat-1-diamond", zone: "cat1", name: "CAT 1 Diamond", price: 1600000, maxPerUser: 4, availableApprox: 88, capacity: 200, saleStartsAt, saleEndsAt },
      { id: "chi-dep-cat2", slug: "cat-2-ruby", zone: "cat2", name: "CAT 2 Ruby", price: 1100000, maxPerUser: 4, availableApprox: 110, capacity: 200, saleStartsAt, saleEndsAt },
      { id: "chi-dep-ga", slug: "ga-emerald", zone: "ga", name: "GA Emerald", price: 750000, maxPerUser: 4, availableApprox: 350, capacity: 500, saleStartsAt, saleEndsAt },
    ],
  },
  {
    id: "em-xinh-showcase",
    slug: "em-xinh-showcase",
    title: "Em Xinh Say Hi - Showcases",
    artists: ["Amee", "Mono", "tlinh", "Wren Evans", "Grey D", "hieuthuhai"],
    venue: "Trung tâm Hội chợ và Triển lãm Sài Gòn SECC",
    startsAt: "2026-08-10T20:00:00+07:00",
    status: "soldout",
    description:
      "Showcase cho thế hệ trẻ với năng lượng tươi mới, thời thượng và không gian đứng gần sân khấu.",
    artistBio:
      "Dan nghe si tre mang den showcase gan gui, thoi thuong va huong toi trai nghiem gan san khau.",
    posterPath: "/concert-posters/em-xinh-poster.png",
    seatingMapVersion: "mock-map-v1",
    ticketTypes: [
      { id: "em-xinh-svip", slug: "svip-sweet", zone: "svip", name: "SVIP Sweet", price: 3800000, maxPerUser: 2, availableApprox: 0, capacity: 50, saleStartsAt, saleEndsAt },
      { id: "em-xinh-vip", slug: "vip-pretty", zone: "vip", name: "VIP Pretty", price: 2400000, maxPerUser: 4, availableApprox: 0, capacity: 100, saleStartsAt, saleEndsAt },
      { id: "em-xinh-cat1", slug: "cat-1-cute", zone: "cat1", name: "CAT 1 Cute", price: 1500000, maxPerUser: 4, availableApprox: 0, capacity: 200, saleStartsAt, saleEndsAt },
      { id: "em-xinh-ga", slug: "ga-standing", zone: "ga", name: "GA Standing", price: 800000, maxPerUser: 4, availableApprox: 0, capacity: 400, saleStartsAt, saleEndsAt },
    ],
  },
];

export function findConcert(id: string): ConcertDetail | undefined {
  return mockConcerts.find((concert) => concert.id === id);
}
