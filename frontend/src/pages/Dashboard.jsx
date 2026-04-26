export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-blue-600 text-center">
  Tailwind Fixed 🚀
</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">Create RFQ</div>
        <div className="bg-white p-4 rounded shadow">Place Bid</div>
        <div className="bg-white p-4 rounded shadow">Ranking</div>
        <div className="bg-white p-4 rounded shadow">Logs</div>
      </div>
    </div>
  );
}
