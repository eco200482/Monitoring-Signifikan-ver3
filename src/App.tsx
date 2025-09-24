import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { BarChart3 } from "lucide-react";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1aE3TntGir3kpgyt-0skYItqobexzgS8mYxI2cQCcuQ4/gviz/tq?tqx=out:json";

interface Temuan {
  nomor: string;
  pic: string;
  unit: string;
  segmen: string;
  periode: string;
  masalah: string;
  rootcause: string;
  tindak: string;
  kerugian: number;
  pengembalian: number;
  status: string;
}

const statusOptions = [
  "Belum Tindak Lanjut",
  "Proses",
  "Ditindaklanjuti",
  "Selesai",
];

export default function App() {
  const [data, setData] = useState<Temuan[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Temuan;
    direction: "asc" | "desc";
  } | null>(null);
  const [filters, setFilters] = useState<any>({
    pic: "",
    unit: "",
    segmen: "",
    status: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // fetch Google Sheets
  useEffect(() => {
    fetch(SHEET_URL)
      .then((res) => res.text())
      .then((text) => {
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const rows = json.table.rows.map((r: any) => ({
          nomor: r.c[0]?.v || "",
          pic: r.c[1]?.v || "",
          unit: r.c[2]?.v || "",
          segmen: r.c[3]?.v || "",
          periode: r.c[4]?.v || "",
          masalah: r.c[5]?.v || "",
          rootcause: r.c[6]?.v || "",
          tindak: r.c[7]?.v || "",
          kerugian: Number(r.c[8]?.v || 0),
          pengembalian: Number(r.c[9]?.v || 0),
          status: r.c[10]?.v || "",
        }));
        setData(rows);
      });
  }, []);

  // --- Rekap per Tahun (Tabel 1) ---
  const rekapPerTahun = data.reduce((acc: any, row) => {
    const tahun = row.periode.match(/\d{4}/)?.[0] || "Lainnya";
    if (!acc[tahun]) {
      acc[tahun] = { kerugian: 0, pengembalian: 0 };
    }
    acc[tahun].kerugian += row.kerugian;
    acc[tahun].pengembalian += row.pengembalian;
    return acc;
  }, {});

  const grandTotal = Object.values(rekapPerTahun).reduce(
    (acc: any, val: any) => {
      acc.kerugian += (val as any).kerugian;
      acc.pengembalian += (val as any).pengembalian;
      return acc;
    },
    { kerugian: 0, pengembalian: 0 }
  );

  // --- Rekap Status (Tabel 2) ---
  const statusPerTahun = data.reduce((acc: any, row) => {
    const tahun = row.periode.match(/\d{4}/)?.[0] || "Lainnya";
    if (!acc[tahun]) {
      acc[tahun] = {
        "Belum Tindak Lanjut": 0,
        Proses: 0,
        Ditindaklanjuti: 0,
        Selesai: 0,
        Total: 0,
      };
    }
    acc[tahun][row.status] = (acc[tahun][row.status] || 0) + 1;
    acc[tahun].Total++;
    return acc;
  }, {});

  const totalAll = Object.values(statusPerTahun).reduce(
    (acc: any, val: any) => {
      statusOptions.forEach((s) => (acc[s] = (acc[s] || 0) + (val as any)[s]));
      acc.Total = (acc.Total || 0) + (val as any).Total;
      return acc;
    },
    { Total: 0 }
  );

  // Data PieChart total
  const statusCount = data.reduce((acc: any, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCount).map(([status, value]) => ({
    name: status,
    value,
  }));
  const colors = ["#e74c3c", "#f39c12", "#3498db", "#2ecc71"];

  // --- Sorting ---
  const sortedData = React.useMemo(() => {
    let sortable = [...data];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [data, sortConfig]);

  const requestSort = (key: keyof Temuan) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // --- Dropdown filter values (ambil dari data unik) ---
  const uniqueValues = (key: keyof Temuan) =>
    Array.from(new Set(data.map((row) => row[key]).filter(Boolean)));

  // --- Filtering ---
  const filteredData = sortedData.filter((row) =>
    ["pic", "unit", "segmen", "status"].every((key) => {
      if (!filters[key]) return true;
      return (row as any)[key] === filters[key];
    })
  );

  // --- Pagination ---
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // --- Download CSV ---
  const downloadCSV = () => {
    const header = Object.keys(data[0] || {}).join(",");
    const rows = data.map((row) =>
      Object.values(row)
        .map((v) => `"${v}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "temuan.csv";
    a.click();
  };

  return (
    <div className="p-6 space-y-6 text-sm">
      {/* Judul + Ikon */}
      <div className="flex justify-center items-center gap-3 mb-4">
        <BarChart3 className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-center">
          Monitoring Temuan Signifikan
        </h1>
      </div>

      {/* Tabel 1 + Tabel 2 + PieChart sejajar */}
      <div className="grid grid-cols-3 gap-4">
        {/* Tabel 1 */}
        <div className="bg-white p-3 rounded shadow">
          <h2 className="text-base font-bold text-center mb-2">
            Tabel 1 - Rekap Kerugian per Tahun
          </h2>
          <table className="min-w-full border text-center text-xs">
            <thead className="bg-red-500 text-white">
              <tr>
                <th className="border p-1">Tahun</th>
                <th className="border p-1">Kerugian</th>
                <th className="border p-1">Pengembalian</th>
                <th className="border p-1">Sisa</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(rekapPerTahun).map(([tahun, val]: any) => {
                const sisa = val.kerugian - val.pengembalian;
                return (
                  <tr key={tahun}>
                    <td className="border p-1 font-semibold">{tahun}</td>
                    <td className="border p-1 text-red-600">
                      Rp {val.kerugian.toLocaleString()}
                    </td>
                    <td className="border p-1 text-green-600">
                      Rp {val.pengembalian.toLocaleString()}
                    </td>
                    <td className="border p-1 text-red-600">
                      Rp {sisa.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-100 font-bold">
                <td className="border p-1">TOTAL</td>
                <td className="border p-1 text-red-600">
                  Rp {grandTotal.kerugian.toLocaleString()}
                </td>
                <td className="border p-1 text-green-600">
                  Rp {grandTotal.pengembalian.toLocaleString()}
                </td>
                <td className="border p-1 text-red-600">
                  Rp{" "}
                  {(
                    grandTotal.kerugian - grandTotal.pengembalian
                  ).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tabel 2 */}
        <div className="bg-white p-3 rounded shadow">
          <h2 className="text-base font-bold text-center mb-2">
            Tabel 2 - Status Temuan per Tahun
          </h2>
          <table className="min-w-full border text-center text-xs">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-1">Tahun</th>
                <th className="border p-1">Total</th>
                {statusOptions.map((s) => (
                  <th key={s} className="border p-1">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(statusPerTahun).map(([tahun, val]: any) => (
                <tr key={tahun}>
                  <td className="border p-1 font-semibold">{tahun}</td>
                  <td className="border p-1">{val.Total}</td>
                  {statusOptions.map((s) => (
                    <td key={s} className="border p-1">
                      {val[s] || 0}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="border p-1">TOTAL</td>
                <td className="border p-1">{totalAll.Total}</td>
                {statusOptions.map((s) => (
                  <td key={s} className="border p-1">
                    {totalAll[s] || 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* PieChart */}
        <div className="bg-white p-3 rounded shadow flex flex-col items-center">
          <h2 className="text-base font-bold text-center mb-2">
            Distribusi Status
          </h2>
          <PieChart width={280} height={260}>
            <Pie
              data={pieData}
              cx={140}
              cy={110}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
          </PieChart>
        </div>
      </div>

      {/* Tabel 3 */}
      <div className="bg-white p-3 rounded shadow">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-bold">Tabel 3 - Detail Temuan</h2>
          <button
            onClick={downloadCSV}
            className="bg-blue-500 text-white px-3 py-1 rounded text-xs"
          >
            Download CSV
          </button>
        </div>

        {/* Dropdown Filter */}
        <div className="flex flex-wrap gap-3 mb-3 text-xs">
          {(["pic", "unit", "segmen", "status"] as (keyof Temuan)[]).map(
            (key) => (
              <select
                key={key}
                value={filters[key]}
                onChange={(e) =>
                  setFilters({ ...filters, [key]: e.target.value })
                }
                className="border p-1 rounded text-xs"
              >
                <option value="">{`Filter ${key}`}</option>
                {uniqueValues(key).map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            )
          )}
        </div>

        <table className="min-w-full border text-xs">
          <thead className="bg-gray-100 text-center">
            <tr>
              {[
                "nomor",
                "pic",
                "unit",
                "segmen",
                "periode",
                "masalah",
                "rootcause",
                "tindak",
                "kerugian",
                "pengembalian",
                "status",
              ].map((key) => (
                <th
                  key={key}
                  className="border p-2 cursor-pointer"
                  onClick={() => requestSort(key as keyof Temuan)}
                >
                  {key.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, i) => (
              <tr key={i} className="text-center">
                <td className="border p-1">{row.nomor}</td>
                <td className="border p-1">{row.pic}</td>
                <td className="border p-1">{row.unit}</td>
                <td className="border p-1">{row.segmen}</td>
                <td className="border p-1">{row.periode}</td>
                <td className="border p-1 text-left">{row.masalah}</td>
                <td className="border p-1 text-left">{row.rootcause}</td>
                <td className="border p-1 text-left">{row.tindak}</td>
                <td className="border p-1 text-red-600 text-center">
                  Rp {row.kerugian.toLocaleString()}
                </td>
                <td className="border p-1 text-green-600 text-center">
                  Rp {row.pengembalian.toLocaleString()}
                </td>
                <td className="border p-1">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-center gap-2 mt-3 text-xs">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-2 py-1 rounded ${
                currentPage === i + 1 ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
