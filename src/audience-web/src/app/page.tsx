import { getConcerts } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";

async function loadConcerts() {
  try {
    return await getConcerts();
  } catch {
    return [];
  }
}

export default async function Home() {
  const concerts = await loadConcerts();

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-950">TicketBox</h1>
          <p className="mt-2 text-slate-600">
            Published concerts and ticket types configured by organizers.
          </p>
        </header>

        <section className="grid gap-4">
          {concerts.map((concert) => (
            <article
              key={concert.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">{concert.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{concert.venue}</p>
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {formatDateTime(concert.startsAt)}
                </p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {concert.ticketTypes.map((ticketType) => (
                  <div
                    key={ticketType.id}
                    className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-950">
                        Zone {ticketType.zoneCode}
                      </h3>
                      <p className="text-sm font-semibold text-emerald-700">
                        {formatCurrency(ticketType.price)} VND
                      </p>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                      <div>
                        <dt className="font-medium text-slate-500">Capacity</dt>
                        <dd>{ticketType.capacity}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">Per user</dt>
                        <dd>{ticketType.perUserLimit}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="font-medium text-slate-500">Sale window</dt>
                        <dd>
                          {formatDateTime(ticketType.saleStartsAt)} to{" "}
                          {formatDateTime(ticketType.saleEndsAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        {concerts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
            No published concerts are available.
          </div>
        ) : null}
      </div>
    </main>
  );
}
