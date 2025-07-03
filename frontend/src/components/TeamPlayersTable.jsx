import { Link } from 'react-router-dom';
import { HeroImage } from './HeroImage';

export default function TeamPlayersTable({ players, teamName, teamColor }) {
  return (
    <div className="p-6">
      <h2 className={`text-xl md:text-2xl font-bold mb-4 ${teamColor}`}>
        {teamName}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-full">
          <thead>
            <tr className="bg-gray-700 text-gray-300">
              <th className="py-2 px-4 text-left sticky left-0 bg-gray-700">Player</th>
              <th className="py-2 px-4 text-center">Hero</th>
              <th className="py-2 px-4 text-center">K</th>
              <th className="py-2 px-4 text-center">D</th>
              <th className="py-2 px-4 text-center">A</th>
              <th className="py-2 px-4 text-center">GPM</th>
              <th className="py-2 px-4 text-center">XPM</th>
              <th className="py-2 px-4 text-center">DMG</th>
              <th className="py-2 px-4 text-center">LVL</th>
              <th className="py-2 px-4 text-center">Items</th>
            </tr>
          </thead>
          <tbody>
            {players.map(player => (
              <tr key={player.player_slot} className="border-b border-gray-700 hover:bg-gray-700/50">
                <td className="py-3 px-4 sticky left-0 bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                  <Link to={`/dota2/players/${player.account_id}`}
                    className="text-blue-400 hover:text-blue-300 text-sm">
                    <div className="flex items-center">
                      {player.avatar && <img src={player.avatar} alt="" className="w-8 h-8 rounded-full mr-2" />}
                      <span>{player.personaname}</span>
                    </div>
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-lg">
                      <HeroImage
                        heroId={player.hero_id}
                        alt={`Hero ${player.hero_id}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-sm mt-1">{player.hero_name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">{player.kills}</td>
                <td className="py-3 px-4 text-center">{player.deaths}</td>
                <td className="py-3 px-4 text-center">{player.assists}</td>
                <td className="py-3 px-4 text-center">{player.gold_per_min}</td>
                <td className="py-3 px-4 text-center">{player.xp_per_min}</td>
                <td className="py-3 px-4 text-center ">{player.hero_damage || '--'}</td>
                <td className="py-3 px-4 text-center ">{player.level}</td>
                <td className="py-3 px-4 text-center sm:hidden">
                
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex justify-center gap-1">
                    {player.items && player.items.map(item => (
                      <img key={item.id} src={item.image} alt={item.name} className="w-8 h-6 object-contain" title={item.name} />
                    ))}
                  </div>
                  <div className="flex justify-center gap-1 mt-1">
                    {player.backpack && player.backpack.map(item => (
                      <img key={item.id} src={item.image} alt={item.name} className="w-6 h-4 object-contain opacity-75" title={`Backpack: ${item.name}`} />
                    ))}
                  </div>
                  {player.neutral_item && (
                    <div className="flex justify-center gap-1 mt-1">
                      <img src={player.neutral_item.image} alt={player.neutral_item.name} className="w-8 h-6 object-contain" title={player.neutral_item.name} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}