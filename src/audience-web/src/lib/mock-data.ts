import type { ConcertDetail } from "./types";

const saleStartsAt = "2026-06-01T00:00:00+07:00";
const saleEndsAt = "2026-12-31T23:59:59+07:00";

export const zoneColors: Record<string, string> = {
  svip: "#7c3aed",
  vip: "#2563eb",
  cat1: "#00b159",
  cat2: "#d97706",
  ga: "#64748b",
};

export const mockConcerts: ConcertDetail[] = [
  {
    id: "say-hi-2026",
    title: "Anh Trai Say Hi - Concert 2026",
    artists: ["HIEUTHUHAI", "RHYDER", "Quang Hung MasterD", "Negav", "ISAAC", "HURRYKNG"],
    venue: "San van dong Quoc gia My Dinh, Ha Noi",
    startsAt: "2026-10-15T19:00:00+07:00",
    status: "selling",
    description:
      "Concert Anh Trai Say Hi 2026 quay tro lai voi quy mo san van dong, dan nghe si tre va he thong am thanh anh sang dau tu cho dem dien lon.",
    posterPath: "/concert-posters/say-hi-poster.png",
    seatingMapVersion: "mock-map-v1",
    ticketTypes: [
      { id: "say-hi-svip", zone: "svip", name: "SVIP President", price: 4500000, maxPerUser: 2, availableApprox: 18, capacity: 100, saleStartsAt, saleEndsAt },
      { id: "say-hi-vip", zone: "vip", name: "VIP A/B", price: 2800000, maxPerUser: 4, availableApprox: 45, capacity: 200, saleStartsAt, saleEndsAt },
      { id: "say-hi-cat1", zone: "cat1", name: "CAT 1 Zone", price: 1800000, maxPerUser: 4, availableApprox: 120, capacity: 300, saleStartsAt, saleEndsAt },
      { id: "say-hi-cat2", zone: "cat2", name: "CAT 2 Upper", price: 1200000, maxPerUser: 4, availableApprox: 9, capacity: 150, saleStartsAt, saleEndsAt },
      { id: "say-hi-ga", zone: "ga", name: "General Admission", price: 800000, maxPerUser: 4, availableApprox: 450, capacity: 1000, saleStartsAt, saleEndsAt },
    ],
  },
  {
    id: "chong-gai-2",
    title: "Anh Trai Vuot Ngan Chong Gai - Concert 2",
    artists: ["Soobin Hoang Son", "Bang Kieu", "Tu Long", "Cuong Seven", "Kay Tran", "Jun Pham"],
    venue: "San van dong Quan khu 7, TP. Ho Chi Minh",
    startsAt: "2026-11-20T19:30:00+07:00",
    status: "upcoming",
    description:
      "Dai nhac hoi cua cac Anh Tai voi ban phoi moi, san khau nang luong cao va cam xuc tu hao cho khan gia.",
    posterPath: "/concert-posters/chong-gai-poster.png",
    seatingMapVersion: "mock-map-v1",
    ticketTypes: [
      { id: "chong-gai-svip", zone: "svip", name: "SVIP Lounge", price: 5000000, maxPerUser: 2, availableApprox: 50, capacity: 50, saleStartsAt: "2026-08-01T00:00:00+07:00", saleEndsAt },
      { id: "chong-gai-vip", zone: "vip", name: "VIP Stage Front", price: 3000000, maxPerUser: 4, availableApprox: 150, capacity: 150, saleStartsAt: "2026-08-01T00:00:00+07:00", saleEndsAt },
      { id: "chong-gai-cat1", zone: "cat1", name: "CAT 1 Lower Stand", price: 2000000, maxPerUser: 4, availableApprox: 250, capacity: 250, saleStartsAt: "2026-08-01T00:00:00+07:00", saleEndsAt },
      { id: "chong-gai-cat2", zone: "cat2", name: "CAT 2 Upper Stand", price: 1500000, maxPerUser: 4, availableApprox: 300, capacity: 300, saleStartsAt: "2026-08-01T00:00:00+07:00", saleEndsAt },
      { id: "chong-gai-ga", zone: "ga", name: "GA Standing Pit", price: 900000, maxPerUser: 4, availableApprox: 800, capacity: 800, saleStartsAt: "2026-08-01T00:00:00+07:00", saleEndsAt },
    ],
  },
  {
    id: "chi-dep-2026",
    title: "Chi Dep Dap Gio Re Song 2026",
    artists: ["Toc Tien", "Minh Hang", "Thieu Bao Tram", "Ngoc Thanh Tam", "Dong Anh Quynh"],
    venue: "Nha thi dau Phu Tho, TP. Ho Chi Minh",
    startsAt: "2026-12-05T18:30:00+07:00",
    status: "selling",
    description:
      "Dem concert ton vinh nang luong cua cac Chi Dep, ket hop vu dao, band live va san khau lay cam hung tu dai duong.",
    posterPath: "/concert-posters/chi-dep-poster.png",
    seatingMapVersion: "mock-map-v1",
    ticketTypes: [
      { id: "chi-dep-svip", zone: "svip", name: "L'Amour SVIP", price: 4200000, maxPerUser: 2, availableApprox: 5, capacity: 80, saleStartsAt, saleEndsAt },
      { id: "chi-dep-vip", zone: "vip", name: "VIP Ocean", price: 2600000, maxPerUser: 4, availableApprox: 28, capacity: 150, saleStartsAt, saleEndsAt },
      { id: "chi-dep-cat1", zone: "cat1", name: "CAT 1 Diamond", price: 1600000, maxPerUser: 4, availableApprox: 88, capacity: 200, saleStartsAt, saleEndsAt },
      { id: "chi-dep-cat2", zone: "cat2", name: "CAT 2 Ruby", price: 1100000, maxPerUser: 4, availableApprox: 110, capacity: 200, saleStartsAt, saleEndsAt },
      { id: "chi-dep-ga", zone: "ga", name: "GA Emerald", price: 750000, maxPerUser: 4, availableApprox: 350, capacity: 500, saleStartsAt, saleEndsAt },
    ],
  },
  {
    id: "em-xinh-showcase",
    title: "Em Xinh Say Hi - Showcases",
    artists: ["Amee", "Mono", "tlinh", "Wren Evans", "Grey D", "hieuthuhai"],
    venue: "Trung tam Hoi cho va Trien lam Sai Gon SECC",
    startsAt: "2026-08-10T20:00:00+07:00",
    status: "soldout",
    description:
      "Showcase cho the he tre voi nang luong tuoi moi, thoi thuong va khong gian dung gan san khau.",
    posterPath: "/concert-posters/em-xinh-poster.png",
    seatingMapVersion: "mock-map-v1",
    ticketTypes: [
      { id: "em-xinh-svip", zone: "svip", name: "SVIP Sweet", price: 3800000, maxPerUser: 2, availableApprox: 0, capacity: 50, saleStartsAt, saleEndsAt },
      { id: "em-xinh-vip", zone: "vip", name: "VIP Pretty", price: 2400000, maxPerUser: 4, availableApprox: 0, capacity: 100, saleStartsAt, saleEndsAt },
      { id: "em-xinh-cat1", zone: "cat1", name: "CAT 1 Cute", price: 1500000, maxPerUser: 4, availableApprox: 0, capacity: 200, saleStartsAt, saleEndsAt },
      { id: "em-xinh-ga", zone: "ga", name: "GA Standing", price: 800000, maxPerUser: 4, availableApprox: 0, capacity: 400, saleStartsAt, saleEndsAt },
    ],
  },
];

export function findConcert(id: string): ConcertDetail | undefined {
  return mockConcerts.find((concert) => concert.id === id);
}
