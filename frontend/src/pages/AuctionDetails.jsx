import { useEffect, useState } from "react";

function AuctionDetails({ rfqId, setPage }) {
  const [rfq, setRfq] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!rfqId) return;

    fetch(`http://127.0.0.1:5000/rfq/${rfqId}`)
      .then(res => res.json())
      .then(setRfq);

    fetch(`http://127.0.0.1:5000/ranking/${rfqId}`)
      .then(res => res.json())
      .then(setRanking);

    fetch(`http://127.0.0.1:5000/logs/${rfqId}`)
      .then(res => res.json())
      .then(setLogs);
  }, [rfqId]);

  if (!rfq) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-2xl font-bold">{rfq.name}</h2>

        <p className={`mt-2 font-semibold ${
          rfq.status === "ACTIVE"
            ? "text-green-600"
            : rfq.status === "CLOSED"
            ? "text-orange-500"
            : "text-red-500"
        }`}>
          {rfq.status}
        </p>

        {rfq.status === "ACTIVE" && (
          <p className="text-gray-600 mt-2">
            Ends at: {new Date(rfq.bid_close_time).toLocaleString()}
          </p>
        )}
      </div>

      {/* RANKING */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-xl font-semibold mb-3">🏆 Ranking</h3>

        {ranking.length === 0 ? (
          <p>No bids yet</p>
        ) : (
          ranking.map((r, i) => (
            <div key={i} className="flex justify-between border-b py-2">
              <span>L{i + 1} - {r.bidder}</span>
              <span>₹{r.amount}</span>
            </div>
          ))
        )}
      </div>

      {/* CONFIG */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-xl font-semibold mb-3">⚙️ Auction Config</h3>

        <p>Trigger Window: {rfq.trigger_window} min</p>
        <p>Extension Duration: {rfq.extension_duration} min</p>
        <p>Extension Type: {rfq.extension_type}</p>
      </div>

      {/* LOGS */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-xl font-semibold mb-3">📜 Activity Log</h3>

        {logs.length === 0 ? (
          <p>No logs yet</p>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="border-b py-2 text-sm">
              <span className="font-medium">{l.event}</span> - {l.desc}
            </div>
          ))
        )}
      </div>

      {/* BACK BUTTON */}
      <button
        onClick={() => setPage("dashboard")}
        className="bg-gray-500 text-white px-4 py-2 rounded"
      >
        Back
      </button>

    </div>
  );
}

export default AuctionDetails;