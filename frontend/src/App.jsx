import { useState, useEffect } from "react";

const BASE = "http://127.0.0.1:5000";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [selectedRfq, setSelectedRfq] = useState(null);

  return (
    <div className="min-h-screen flex bg-gray-100">
      <div className="w-64 bg-blue-900 shadow-lg p-5 flex-shrink-0 flex flex-col">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">BidX</h2>
          <p className="text-gray-400 text-xs mt-1">British Auction Platform</p>
        </div>
        <ul className="space-y-1">
          {[
            { key: "dashboard", label: "📊 Dashboard" },
            { key: "rfq", label: "📝 Create RFQ" },
            { key: "bid", label: "💰 Place Bid" },
            { key: "detail", label: "🔍 Auction Detail" },
            { key: "logs", label: "📋 Logs" },
          ].map(({ key, label }) => (
            <li key={key}>
              <button
                onClick={() => setPage(key)}
                className={`w-full text-left px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  page === key
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 flex justify-center p-10">
        <div className={`w-full ${page === "dashboard" ? "max-w-6xl" : "max-w-2xl"}`}>
          {page === "rfq" && <CreateRFQ />}
          {page === "bid" && <PlaceBid selectedRfq={selectedRfq} />}
          {page === "dashboard" && (
            <Dashboard setPage={setPage} setSelectedRfq={setSelectedRfq} />
          )}
          {page === "detail" && <AuctionDetail rfqId={selectedRfq} />}
          {page === "logs" && <Logs rfqId={selectedRfq} />}
        </div>
      </div>
    </div>
  );
}

function CreateRFQ() {
  const [form, setForm] = useState({
    name: "", bid_start_time: "", bid_close_time: "",
    forced_close_time: "", trigger_window: 5,
    extension_duration: 2, extension_type: "ANY_BID"
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async () => {
    try {
      const res = await fetch(`${BASE}/rfq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          trigger_window: Number(form.trigger_window),
          extension_duration: Number(form.extension_duration),
        }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Something went wrong");
      else alert("✅ RFQ Created! ID: " + data.rfq_id);
    } catch {
      alert("Server error");
    }
  };

  return (
    <div className="bg-blue-100 p-6 rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">Create RFQ</h2>
      {[
        { label: "RFQ Name", key: "name", type: "text" },
        { label: "Bid Start Time", key: "bid_start_time", type: "datetime-local" },
        { label: "Bid Close Time", key: "bid_close_time", type: "datetime-local" },
        { label: "Forced Close Time", key: "forced_close_time", type: "datetime-local" },
        { label: "Trigger Window (mins)", key: "trigger_window", type: "number" },
        { label: "Extension Duration (mins)", key: "extension_duration", type: "number" },
      ].map(({ label, key, type }) => (
        <div key={key} className="mb-3">
          <label className="text-sm text-gray-600 block mb-1">{label}</label>
          <input type={type} value={form[key]} onChange={set(key)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      ))}

      <div className="mb-3">
        <label className="text-sm text-gray-600 block mb-1">Extension Type</label>
        <select value={form.extension_type} onChange={set("extension_type")}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="ANY_BID">ANY_BID — Any bid in trigger window</option>
          <option value="L1_CHANGE">L1_CHANGE — Lowest bidder changes</option>
          <option value="RANK_CHANGE">RANK_CHANGE — Any rank change</option>
        </select>
      </div>

      <button onClick={handleSubmit}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg mt-2 font-semibold">
        Create RFQ
      </button>
    </div>
  );
}

function Dashboard({ setPage, setSelectedRfq }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = () =>
      fetch(`${BASE}/rfqs`).then((r) => r.json()).then(setData).catch(() => {});
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  const goTo = (page, id) => { setSelectedRfq(id); setPage(page); };

  const statusColor = {
    ACTIVE: "text-green-600", CLOSED: "text-orange-500",
    FORCE_CLOSED: "text-red-500", NOT_STARTED: "text-gray-400"
  };

  return (
    <div className="p-2">
      <h2 className="text-xl font-bold mb-4">All RFQs</h2>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-blue-100 text-gray-600">
            <tr>
              {["ID", "Name", "Lowest Bid", "Status", "Closes In", "Forced Time", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <DashboardRow key={r.id} r={r} goTo={goTo} statusColor={statusColor} />
            ))}
            {data.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No RFQs yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardRow({ r, goTo, statusColor }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const close = new Date(r.bid_close_time);
      const forced = new Date(r.forced_close_time);

      if (now >= forced) {
        setTimeLeft("Force Closed");
        return;
      }

      if (now >= close) {
        const diff = forced - now;
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`Forced in ${m}m ${s}s`);
        return;
      }

      if (r.status === "ACTIVE") {
        const diff = close - now;
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${m}m ${s}s`);
      } else {
        setTimeLeft(close.toLocaleString());
      }
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [r.bid_close_time, r.forced_close_time, r.status]);

  const isUrgent = () => {
    const diff = new Date(r.bid_close_time) - new Date();
    return r.status === "ACTIVE" && diff > 0 && diff < 2 * 60 * 1000;
  };

  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="px-4 py-3">{r.id}</td>
      <td className="px-4 py-3 font-medium">{r.name}</td>
      <td className="px-4 py-3">{r.lowest_bid ? `₹${r.lowest_bid}` : "—"}</td>
      <td className={`px-4 py-3 font-semibold ${statusColor[r.status] || ""}`}>{r.status}</td>
      <td className={`px-4 py-3 font-mono font-semibold ${
        isUrgent() ? "text-red-500 animate-pulse" :
        r.status === "ACTIVE" ? "text-green-600" : "text-gray-400"
      }`}>
        {timeLeft}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.forced_close_time).toLocaleString()}</td>
      <td className="px-4 py-3 flex gap-2">
        {r.status === "ACTIVE" && (
          <button onClick={() => goTo("bid", r.id)}
            className="bg-blue-500 text-white px-3 py-1 rounded text-xs">
            Bid
          </button>
        )}
        <button onClick={() => goTo("detail", r.id)}
          className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs">
          Detail
        </button>
      </td>
    </tr>
  );
}

function PlaceBid({ selectedRfq }) {
  const [rfqId, setRfqId] = useState("");
  const [form, setForm] = useState({
    bidder: "", amount: "", freight_charges: "",
    origin_charges: "", destination_charges: "",
    transit_time: "", quote_validity: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (selectedRfq) setRfqId(String(selectedRfq));
  }, [selectedRfq]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleBid = async () => {
    setError(""); setSuccess("");
    try {
      const res = await fetch(`${BASE}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfq_id: Number(rfqId),
          bidder: form.bidder,
          amount: Number(form.amount),
          freight_charges: form.freight_charges ? Number(form.freight_charges) : null,
          origin_charges: form.origin_charges ? Number(form.origin_charges) : null,
          destination_charges: form.destination_charges ? Number(form.destination_charges) : null,
          transit_time: form.transit_time || null,
          quote_validity: form.quote_validity || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else {
        setSuccess(
          data.extended
            ? `✅ Bid placed! Auction extended to ${new Date(data.new_close_time).toLocaleString()}`
            : "✅ Bid placed successfully!"
        );
      }
    } catch {
      setError("Server error");
    }
  };

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3";

  return (
    <div className="bg-blue-100 p-6 rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">Place Bid</h2>

      <label className="text-sm text-gray-600 block mb-1">RFQ ID</label>
      <input value={rfqId} onChange={(e) => setRfqId(e.target.value)} className={inputCls} placeholder="RFQ ID" />

      <label className="text-sm text-gray-600 block mb-1">Carrier / Bidder Name</label>
      <input value={form.bidder} onChange={set("bidder")} className={inputCls} placeholder="e.g. DHL" />

      <label className="text-sm text-gray-600 block mb-1">Total Bid Amount (₹)</label>
      <input type="number" value={form.amount} onChange={set("amount")} className={inputCls} placeholder="Must be lower than current L1" />

      <p className="text-xs text-gray-400 mb-3 -mt-2">Quote Breakdown (optional)</p>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Freight Charges (₹)", key: "freight_charges" },
          { label: "Origin Charges (₹)", key: "origin_charges" },
          { label: "Destination Charges (₹)", key: "destination_charges" },
        ].map(({ label, key }) => (
          <div key={key}>
            <label className="text-xs text-gray-500 block mb-1">{label}</label>
            <input type="number" value={form[key]} onChange={set(key)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
        ))}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Transit Time</label>
          <input value={form.transit_time} onChange={set("transit_time")} placeholder="e.g. 3 days"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Quote Validity</label>
          <input value={form.quote_validity} onChange={set("quote_validity")} placeholder="e.g. 30 days"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      </div>

      <button onClick={handleBid}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg mt-4 font-semibold">
        Submit Bid
      </button>

      {error && <div className="text-red-500 mt-3 text-sm bg-red-50 p-2 rounded">{error}</div>}
      {success && <div className="text-green-600 mt-3 text-sm bg-green-50 p-2 rounded">{success}</div>}
    </div>
  );
}

function AuctionDetail({ rfqId: propId }) {
  const [rfqId, setRfqId] = useState(propId ? String(propId) : "");
  const [rfq, setRfq] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [logs, setLogs] = useState([]);
  const [timeLeft, setTimeLeft] = useState("");

  const fetchAll = async (id) => {
    const [rfqRes, rankRes, logRes] = await Promise.all([
      fetch(`${BASE}/rfq/${id}`),
      fetch(`${BASE}/ranking/${id}`),
      fetch(`${BASE}/logs/${id}`),
    ]);
    setRfq(await rfqRes.json());
    setRanking(await rankRes.json());
    setLogs(await logRes.json());
  };

  useEffect(() => {
    if (propId) { setRfqId(String(propId)); fetchAll(propId); }
  }, [propId]);

  useEffect(() => {
    if (!rfq?.bid_close_time) return;
    const iv = setInterval(() => {
      const diff = new Date(rfq.bid_close_time) - new Date();
      if (diff <= 0) { setTimeLeft("Closed"); clearInterval(iv); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(iv);
  }, [rfq?.bid_close_time]);

  useEffect(() => {
    if (!rfqId || rfq?.status !== "ACTIVE") return;
    const iv = setInterval(() => fetchAll(rfqId), 5000);
    return () => clearInterval(iv);
  }, [rfqId, rfq?.status]);

  const rankLabel = (i) => {
    const labels = ["L1", "L2", "L3", "L4", "L5"];
    return labels[i] || `#${i + 1}`;
  };

  const rankColor = (i) =>
    i === 0 ? "bg-green-100 border-green-400" : i === 1 ? "bg-yellow-50 border-yellow-300" : "bg-gray-50 border-gray-200";

  return (
    <div className="space-y-5">
      <div className="bg-blue-100 p-4 rounded-xl shadow flex gap-3">
        <input value={rfqId} onChange={(e) => setRfqId(e.target.value)}
          placeholder="Enter RFQ ID"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <button onClick={() => fetchAll(rfqId)}
          className="bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">
          Load
        </button>
      </div>

      {rfq && (
        <>
          <div className="bg-white p-5 rounded-xl shadow">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">{rfq.name}</h2>
                <p className="text-sm text-gray-500 mt-1">RFQ #{rfq.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                rfq.status === "ACTIVE" ? "bg-green-100 text-green-700"
                : rfq.status === "CLOSED" ? "bg-orange-100 text-orange-700"
                : "bg-red-100 text-red-700"
              }`}>{rfq.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="text-gray-500">Bid Close Time</p>
                <p className="font-medium">{new Date(rfq.bid_close_time).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Forced Close Time</p>
                <p className="font-medium">{new Date(rfq.forced_close_time).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Time Remaining</p>
                <p className="font-bold text-blue-600 text-lg">{timeLeft || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Extension Config</p>
                <p className="font-medium">
                  Trigger: {rfq.trigger_window} min | Extend by: {rfq.extension_duration} min | Type: {rfq.extension_type}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <h3 className="font-bold text-lg mb-3">Supplier Ranking</h3>
            {ranking.length === 0 && <p className="text-gray-400 text-sm">No bids yet</p>}
            <div className="space-y-2">
              {ranking.map((b, i) => (
                <div key={i} className={`border rounded-lg p-3 ${rankColor(i)}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-sm px-2 py-0.5 rounded ${
                        i === 0 ? "bg-green-500 text-white" : "bg-gray-300 text-gray-700"
                      }`}>{rankLabel(i)}</span>
                      <span className="font-semibold">{b.bidder}</span>
                    </div>
                    <span className="font-bold text-lg">₹{b.amount}</span>
                  </div>
                  {(b.freight_charges || b.origin_charges || b.destination_charges) && (
                    <div className="mt-2 text-xs text-gray-500 flex gap-4 flex-wrap">
                      {b.freight_charges && <span>Freight: ₹{b.freight_charges}</span>}
                      {b.origin_charges && <span>Origin: ₹{b.origin_charges}</span>}
                      {b.destination_charges && <span>Destination: ₹{b.destination_charges}</span>}
                      {b.transit_time && <span>Transit: {b.transit_time}</span>}
                      {b.quote_validity && <span>Valid: {b.quote_validity}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <h3 className="font-bold text-lg mb-3">Activity Log</h3>
            {logs.length === 0 && <p className="text-gray-400 text-sm">No activity yet</p>}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 text-sm p-2 rounded ${
                  log.event === "EXTENSION" ? "bg-yellow-50" : "bg-gray-50"
                }`}>
                  <span className={`font-bold shrink-0 ${
                    log.event === "EXTENSION" ? "text-yellow-600" : "text-blue-500"
                  }`}>{log.event}</span>
                  <span className="text-gray-600">{log.desc}</span>
                  <span className="ml-auto text-gray-400 shrink-0">
                    {new Date(log.time).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Logs({ rfqId: propId }) {
  const [rfqId, setRfqId] = useState(propId ? String(propId) : "");
  const [logs, setLogs] = useState([]);

  useEffect(() => { if (propId) { setRfqId(String(propId)); fetchLogs(propId); } }, [propId]);

  const fetchLogs = async (id) => {
    const res = await fetch(`${BASE}/logs/${id || rfqId}`);
    const data = await res.json();
    setLogs(data);
  };

  return (
    <div className="bg-blue-100 p-6 rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">Logs</h2>
      <div className="flex gap-3 mb-4">
        <input value={rfqId} onChange={(e) => setRfqId(e.target.value)}
          placeholder="RFQ ID"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <button onClick={() => fetchLogs()}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm">Get Logs</button>
      </div>
      <div className="space-y-2">
        {logs.map((log, i) => (
          <div key={i} className={`p-2 rounded text-sm flex gap-3 ${
            log.event === "EXTENSION" ? "bg-yellow-50" : "bg-gray-50"
          }`}>
            <span className="font-bold text-blue-500 shrink-0">{log.event}</span>
            <span className="text-gray-600">{log.desc}</span>
            <span className="ml-auto text-gray-400 text-xs shrink-0">
              {new Date(log.time).toLocaleTimeString()}
            </span>
          </div>
        ))}
        {logs.length === 0 && <p className="text-gray-400 text-sm">No logs found</p>}
      </div>
    </div>
  );
}