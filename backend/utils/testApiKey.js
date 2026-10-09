import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// If no API key is found, try to load it directly from the .env file
if (!process.env.STEAM_API_KEY) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Find the STEAM_API_KEY value
    const match = envContent.match(/STEAM_API_KEY=(.*)/);
    if (match && match[1]) {
      process.env.STEAM_API_KEY = match[1].trim();
    }
  } catch (err) {
    console.error('Failed to read .env file:', err.message);
  }
}

// Display API key information
console.log('STEAM_API_KEY exists:', !!process.env.STEAM_API_KEY);
console.log('STEAM_API_KEY length:', process.env.STEAM_API_KEY?.length);
console.log('API key first 4 characters:', process.env.STEAM_API_KEY?.substring(0, 4));

// Test endpoints
const endpoints = [
  {
    name: 'GetMatchDetails',
    url: 'https://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/V001/',
    params: { match_id: '7423665147' }
  },
  {
    name: 'GetLiveLeagueGames',
    url: 'https://api.steampowered.com/IDOTA2Match_570/GetLiveLeagueGames/v1/'
  },
  {
    name: 'GetHeroes',
    url: 'https://api.steampowered.com/IEconDOTA2_570/GetHeroes/v1/',
    params: { language: 'english' }
  }
];

// Test each endpoint
async function testEndpoints() {
  const apiKey = process.env.STEAM_API_KEY;
  
  if (!apiKey) {
    console.error('No STEAM_API_KEY found in environment variables.');
    return;
  }
  
  console.log('Testing Steam API endpoints...');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting ${endpoint.name}...`);
      const response = await axios.get(endpoint.url, {
        params: {
          key: apiKey,
          ...(endpoint.params || {})
        }
      });
      
      console.log(`✅ ${endpoint.name}: SUCCESS`);
      console.log(`Status: ${response.status}`);
      console.log(`Data received: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      console.error(`❌ ${endpoint.name}: FAILED`);
      console.error(`Error message: ${error.message}`);
      
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
}

testEndpoints(); 