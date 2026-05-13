const axios = require("axios");

const BASE =
"https://v3.football.api-sports.io";

async function footballApi(endpoint){

  const res = await axios.get(
    `${BASE}${endpoint}`,
    {
      headers:{
        "x-apisports-key":
        process.env.FOOTBALL_API_KEY
      }
    }
  );

  return res.data;
}

module.exports = footballApi;
