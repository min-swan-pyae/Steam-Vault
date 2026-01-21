import React, { useState, useEffect } from 'react';
import { useParams,useNavigate,Link} from 'react-router-dom';
import { dotaService } from '../services/dotaService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import TeamPlayersTable from '../components/TeamPlayersTable';



export default function MatchDetails() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    const fetchMatchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await dotaService.getMatchDetails(matchId);
        
        const queryParams = new URLSearchParams(location.search);
        const radiantTeamFromUrl = queryParams.get('radiant_team');
        const direTeamFromUrl = queryParams.get('dire_team');

        setMatch({
          ...response,
          team_name_radiant: response.team_name_radiant || radiantTeamFromUrl,
          team_name_dire: response.team_name_dire || direTeamFromUrl,
        });
      } catch (err) {
        console.error('Error fetching match details:', err);
        setError('Failed to load match details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [matchId, location.search]);

  if (loading) return <LoadingSpinner overlay={true} message="Loading match details..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!match) return <ErrorMessage message="Match not found" />;

  const getTeamPlayers = (team) => {
    return match.players.filter(player => 
      team === 'radiant' ? player.player_slot < 128 : player.player_slot >= 128
    );
  };

  const radiantPlayers = getTeamPlayers('radiant');
  const direPlayers = getTeamPlayers('dire');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
         
      <div className="max-w-7xl mx-auto">
      <button
        onClick={handleGoBack}
        className="text-blue-400 hover:text-blue-300 mb-4 inline-block bg-transparent"
      >
       &larr; Go Back
      </button>
        {match.is_mock_data && (
          <div className="bg-orange-900/60 border border-orange-500 text-orange-200 p-4 mb-6 rounded-lg">
            <h3 className="text-lg font-medium mb-1">Sample Data</h3>
            <p>{match.mock_notice || "This match data is simulated because the API for match details is currently unavailable."}</p>
          </div>
        )}
        
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-blue-300">
                  {match.team_name_radiant && match.team_name_dire
                    ? `${match.team_name_radiant} vs ${match.team_name_dire}`
                    : `Match ${matchId}`}
                </h1>
                <p className="text-gray-400">
                  {new Date(match.start_time * 1000).toLocaleString()} • {match.duration_formatted} • {match.game_mode_name}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-xl md:text-3xl font-bold ${match.radiant_win ? 'text-green-500' : 'text-gray-400'}`}>
                  {match.radiant_score}
                </div>
                <div className="text-xl md:text-3xl">vs</div>
                <div className={`text-xl md:text-3xl font-bold ${!match.radiant_win ? 'text-red-500' : 'text-gray-400'}`}>
                  {match.dire_score}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-center md:justify-start">
              <div className={`text-lg md:text-xl font-semibold px-4 py-2 rounded ${match.radiant_win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {match.radiant_win ? `Radiant Victory ${match.team_name_radiant && `(${match.team_name_radiant})` || ''}` : `Dire Victory ${match.team_name_dire && `(${match.team_name_dire})` || ''}`}

              </div>
            </div>
          </div>

          <TeamPlayersTable players={radiantPlayers} teamName={match.team_name_radiant || 'Radiant Team'} teamColor="text-green-300" />
          <TeamPlayersTable players={direPlayers} teamName={match.team_name_dire || 'Dire Team'} teamColor="text-red-400" />
        </div>
      </div>
    </div>
  );
}