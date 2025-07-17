import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { cs2Service } from '../services/cs2Service';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const STAT_BLOCKS = [
  { label: 'K/D Ratio', key: 'kdRatio', digits: 2 },
  { label: 'Win Rate', key: 'winRate', digits: 2, suffix: '%' },
  { label: 'Headshot %', key: 'headshotPercentage', digits: 2, suffix: '%' },
  { label: 'Total Kills', key: 'totalKills' },
  { label: 'Total Deaths', key: 'totalDeaths' },
  { label: 'Total Matches', key: 'totalMatches' },
];

const StatGrid = ({ stats }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-2">
    {STAT_BLOCKS.map(({ label, key, digits, suffix }) => (
      <div key={key} className="flex flex-col items-center bg-gray-800 rounded-lg p-3 shadow-sm">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-lg font-bold text-primary-300">
          {stats && stats[key] !== undefined && stats[key] !== null
            ? (digits ? Number(stats[key]).toFixed(digits) : stats[key]) + (suffix || '')
            : '--'}
        </span>
      </div>
    ))}
  </div>
);

const TableCard = ({ title, columns, rows, emptyText }) => (
  <div className="bg-gray-800 rounded-xl p-4 mb-6 shadow-lg">
    <h3 className="font-semibold text-lg mb-3">{title}</h3>
    {rows && rows.length ? (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-2 py-2 font-medium text-left text-gray-400">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ridx) => (
              <tr key={row.id || ridx} className="hover:bg-gray-700 transition">
                {columns.map(col => (
                  <td key={col.key} className="px-2 py-2">{row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="text-gray-400 italic">{emptyText}</div>
    )}
  </div>
);

const Cs2Dashboard = () => {
  // const { steamId } = useParams();
  const steamId = 76561198111251027;
  const [playerStats, setPlayerStats] = useState(null);
  const [playerMatches, setPlayerMatches] = useState(null);
  const [playerWeapons, setPlayerWeapons] = useState(null);
  const [playerMaps, setPlayerMaps] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCs2Data = async () => {
      try {
        setLoading(true);
        const stats = await cs2Service.getPlayerStats(steamId);
        setPlayerStats(stats);
        setPlayerMatches(await cs2Service.getPlayerMatches(steamId));
        setPlayerWeapons(await cs2Service.getPlayerWeapons(steamId));
        setPlayerMaps(await cs2Service.getPlayerMaps(steamId));
      } catch (err) {
        setError('Failed to fetch CS2 data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    if (steamId) fetchCs2Data();
  }, [steamId]);

  if (loading) return <LoadingSpinner />;
  if (error)
    return <div className="flex justify-center items-center h-[50vh]"><ErrorMessage message={error} /></div>;

  if (!playerStats || Object.keys(playerStats).length === 0 || playerStats.error) {
    return <div className="flex justify-center items-center h-[50vh]"><ErrorMessage message="No CS2 data found for this player." /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white px-2 sm:px-6 py-6">
      {/* Title */}
      <div className="max-w-7xl mx-auto">
        <header className="mb-7 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{playerStats.personaName || 'Player'} <span className="text-primary-300">/ CS2</span></h1>
            <div className="text-gray-400 text-sm mt-1">Steam ID: <span className="font-mono">{steamId}</span></div>
          </div>
          {/* Avatar or Icon (optional, if you have playerStats.avatar) */}
          {playerStats.avatar && (
            <img
              src={playerStats.avatar}
              alt="Player Avatar"
              className="w-16 h-16 rounded-full border-2 border-primary-400 shadow"
            />
          )}
        </header>

        {/* Stat Blocks */}
        <section aria-label="Player Core Stats" className="mb-7">
          <StatGrid stats={playerStats} />
        </section>

        {/* Responsive dashboard grid for tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TableCard
            title="Recent Matches"
            columns={[
              { key: 'matchId', header: 'Match ID' },
              { key: 'mapName', header: 'Map' },
              { key: 'result', header: 'Result' },
              { key: 'kills', header: 'Kills' },
              { key: 'deaths', header: 'Deaths' },
              { key: 'assists', header: 'Assists' }
            ]}
            rows={
              playerMatches ? playerMatches.map(item => ({
                ...item,
                result: (
                  <span className={item.result === "Win" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                    {item.result}
                  </span>
                ),
              })) : []
            }
            emptyText="No recent matches found."
          />
          <TableCard
            title="Top Weapons"
            columns={[
              { key: 'weaponName', header: 'Weapon' },
              { key: 'kills', header: 'Kills' },
              { key: 'headshotPercentage', header: 'HS %' }
            ]}
            rows={
              playerWeapons
                ? playerWeapons.slice(0, 8).map(w => ({
                  ...w,
                  headshotPercentage: w.headshotPercentage !== undefined
                    ? `${w.headshotPercentage}%` : 'N/A'
                }))
                : []
            }
            emptyText="No weapon statistics found."
          />
        </div>

        {/* Full width for Map Stats */}
        <div className="mt-6">
          <TableCard
            title="Map Statistics"
            columns={[
              { key: 'mapName', header: 'Map' },
              { key: 'wins', header: 'Wins' },
              { key: 'losses', header: 'Losses' },
              { key: 'winRate', header: 'Win Rate' }
            ]}
            rows={
              playerMaps
                ? playerMaps.map(map => ({
                  ...map,
                  winRate: map.winRate !== undefined ? `${map.winRate}%` : 'N/A'
                }))
                : []
            }
            emptyText="No map statistics found."
          />
        </div>
      </div>
    </div>
  );
};

export default Cs2Dashboard;