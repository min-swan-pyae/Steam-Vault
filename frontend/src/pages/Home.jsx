import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white px-4">
      <div className="w-full max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-center">
          Welcome to SteamVault
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8 text-center max-w-2xl mx-auto">
          Your comprehensive analytics platform for Dota 2 and CS2
        </p>
        
        {!user && (
          <div className="text-center">
            <p className="text-lg text-gray-400 mb-4">
              Login with Steam to access your personalized analytics
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 max-w-4xl mx-auto">
          <Link to={`/dota2`} className="h-full">
            <FeatureCard
              title="Dota 2 Analytics"
              description="Track your performance, analyze matches, and improve your gameplay"
              icon="🎮"
            />
          </Link>
          <Link to={`/cs2`} className="h-full">
            <FeatureCard
              title="CS2 Analytics"
              description="Monitor your stats, study your matches, and enhance your skills"
              icon="🎯"
            />
          </Link>   
          <Link to={`/marketplace`} className="h-full">
            <FeatureCard
              title="Market Tracking"
              description="Stay updated with real-time market prices and trends"
              icon="📈"
            />
          </Link>
          <Link to={`/forum`} className="h-full">
            <FeatureCard
              title="Community Forum"
              description="Connect with other players and share insights and tips with the community"
              icon="💬"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description, icon }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors duration-200">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
} 