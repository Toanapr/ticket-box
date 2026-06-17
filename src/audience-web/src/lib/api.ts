export type TicketType = {
  id: string;
  zoneCode: string;
  price: number;
  capacity: number;
  saleStartsAt: string;
  saleEndsAt: string;
  perUserLimit: number;
};

export type Concert = {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  ticketTypes: TicketType[];
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export async function getConcerts(): Promise<Concert[]> {
  const response = await fetch(`${apiBaseUrl}/concerts`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load concerts");
  }

  return response.json() as Promise<Concert[]>;
}
