import { Link } from 'react-router-dom';
import { HeroImage } from './HeroImage';
import ItemImage from './ItemImage';

export default function TeamPlayersTable({ players, teamName, teamColor }) {
  return (
    <div className="p-4">
      <h2 className={`text-xl md:text-2xl font-bold mb-4 ${teamColor}`}>
        {teamName}
      </h2>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg shadow-lg">
          <table className="w-full min-w-full bg-gray-800 text-gray-200">
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
                <tr key={player.player_slot} className="border-b border-gray-700 hover:bg-gray-700/50 transition">
                  <td className="py-3 px-4 sticky left-0 bg-gray-800 border-b border-gray-700">
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
                  <td className="py-3 px-4 text-center">{player.hero_damage || '--'}</td>
                  <td className="py-3 px-4 text-center">{player.level}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center gap-1 flex-wrap">
                      {player.items && player.items.map((item, idx) => (
                        <ItemImage key={`${player.account_id}-item-${idx}-${item.id}`} itemName={item.itemName || item.name} alt={item.name} className="w-8 h-6 object-contain" />
                      ))}
                    </div>
                    <div className="flex justify-center gap-1 mt-1 flex-wrap">
                      {player.backpack && player.backpack.map((item, idx) => (
                        <ItemImage key={`${player.account_id}-backpack-${idx}-${item.id}`} itemName={item.itemName || item.name} alt={item.name} className="w-6 h-4 object-contain opacity-75" />
                      ))}
                    </div>
                    {player.neutral_item && (
                      <div className="flex justify-center gap-1 mt-1">
                        <ItemImage itemName={player.neutral_item.itemName || player.neutral_item.name} alt={player.neutral_item.name} className="w-8 h-6 object-contain" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Mobile Cards */}
      <div className="md:hidden grid gap-4">
        {players.map(player => (
          <div key={player.player_slot} className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {player.avatar && <img src={player.avatar} alt="" className="w-10 h-10 rounded-full" />}
              <div>
                <Link to={`/dota2/players/${player.account_id}`} className="text-blue-400 hover:text-blue-300 font-semibold">
                  {player.personaname}
                </Link>
                <div className="text-xs text-gray-400">{player.hero_name}</div>
              </div>
              <div className="ml-auto w-12 h-12">
                <HeroImage
                  heroId={player.hero_id}
                  alt={`Hero ${player.hero_id}`}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-sm mt-2">
              <div>
                
                <div className="text-gray-400">K</div>
                <div className="font-bold">{player.kills}</div>
              </div>
              <div>
               
                <div className="text-gray-400">D</div>
                 <div className="font-bold">{player.deaths}</div>
              </div>
              <div>
               
                <div className="text-gray-400">A</div>
                 <div className="font-bold">{player.assists}</div>
              </div>
              <div>
                
                <div className="text-gray-400">LVL</div>
                <div className="font-bold">{player.level}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2 mb-2">
              <div>
              
                <span className="block text-gray-400 ">GPM</span>
                  <span className="font-semibold">{player.gold_per_min}</span>
              </div>
              <div>
                
                <span className="block text-gray-400">XPM</span>
                <span className="font-semibold">{player.xp_per_min}</span>
              </div>
              <div>
                
                <span className="block text-gray-400">DMG</span>
                <span className="font-semibold">{player.hero_damage || '--'}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-center mt-2">
              {player.items && player.items.map((item, idx) => (
                <ItemImage key={`${player.account_id}-item-${idx}-${item.id}`} itemName={item.itemName || item.name} alt={item.name} className="w-8 h-6 object-contain" />
              ))}
              {player.backpack && player.backpack.map((item, idx) => (
                <ItemImage key={`${player.account_id}-backpack-${idx}-${item.id}`} itemName={item.itemName || item.name} alt={item.name} className="w-6 h-4 object-contain opacity-75" />
              ))}
              {player.neutral_item && (
                <ItemImage itemName={player.neutral_item.itemName || player.neutral_item.name} alt={player.neutral_item.name} className="w-8 h-6 object-contain" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}